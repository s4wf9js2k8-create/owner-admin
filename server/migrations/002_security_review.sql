-- Append-only hardening of PR #12; do not edit the applied 001 checksum.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
-- Global defaults must be revoked: a schema-only REVOKE cannot cancel
-- PostgreSQL's global default PUBLIC EXECUTE grant.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER FUNCTION subject() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION active_account() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION platform_owner() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION tenant_role(uuid) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION tenant_read(uuid) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION tenant_write(uuid) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION tenant_admin(uuid) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION module_enabled(uuid,text) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION storage_total() SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION storage_summary() SET search_path = pg_catalog, public, pg_temp;
DROP POLICY audit_append ON audit_events;
ALTER TABLE audit_events ADD COLUMN provenance text NOT NULL DEFAULT 'legacy' CHECK(provenance IN ('legacy','database'));
ALTER TABLE audit_events ALTER COLUMN provenance SET DEFAULT 'database';

-- No client actor/action/company arguments: mutation events come from actual rows.
CREATE FUNCTION audit_mutation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE row_data jsonb; actor uuid := public.subject(); cid uuid; event text; target_id text;
BEGIN
 IF actor IS NULL OR NOT public.active_account() THEN
   IF session_user='channel_app' THEN RAISE EXCEPTION 'missing audit principal' USING ERRCODE='42501'; END IF;
   RETURN NULL; -- trusted migration/bootstrap/restore, never the runtime identity
 END IF;
 row_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 cid := CASE WHEN TG_TABLE_NAME='companies' THEN (row_data->>'id')::uuid ELSE (row_data->>'company_id')::uuid END;
 target_id := coalesce(row_data->>'id',row_data->>'account_id',row_data->>'name');
 event := CASE TG_TABLE_NAME
  WHEN 'companies' THEN CASE WHEN TG_OP='INSERT' THEN 'company.create' ELSE 'company.update' END
  WHEN 'memberships' THEN 'membership.change'
  WHEN 'records' THEN 'record.' || CASE WHEN TG_OP='INSERT' THEN 'create' ELSE lower(TG_OP) END
  WHEN 'files' THEN CASE WHEN TG_OP='INSERT' THEN 'file.upload' ELSE 'file.delete' END
  WHEN 'packages' THEN 'package.update'
  WHEN 'upgrade_requests' THEN CASE WHEN TG_OP='INSERT' THEN 'request.create' ELSE 'request.decision' END
  WHEN 'access_grants' THEN CASE WHEN TG_OP='INSERT' THEN 'customer_access.grant' ELSE 'customer_access.revoke' END
  WHEN 'accounts' THEN CASE WHEN TG_OP='INSERT' THEN 'account.create' WHEN (row_data->>'password_hash') IS DISTINCT FROM (to_jsonb(OLD)->>'password_hash') THEN 'auth.password_reset' ELSE 'account.status' END
  WHEN 'sessions' THEN CASE WHEN TG_OP='INSERT' THEN 'auth.login' ELSE 'auth.session_revoked' END
 END;
 -- Never store session hashes, passwords, record content or recovery tokens.
 IF TG_TABLE_NAME='access_grants' THEN target_id := target_id || ': ' || (row_data->>'reason'); END IF;
 INSERT INTO public.audit_events(company_id,actor_id,action,target) VALUES(cid,actor,event,target_id);
 RETURN NULL;
END $$;
CREATE TRIGGER company_audit AFTER INSERT OR UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION audit_mutation();
CREATE TRIGGER membership_audit AFTER INSERT OR UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION audit_mutation();
CREATE TRIGGER record_audit AFTER INSERT OR UPDATE OR DELETE ON records FOR EACH ROW EXECUTE FUNCTION audit_mutation();
CREATE TRIGGER file_audit AFTER INSERT OR DELETE ON files FOR EACH ROW EXECUTE FUNCTION audit_mutation();
CREATE TRIGGER package_audit AFTER UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION audit_mutation();
CREATE TRIGGER request_audit AFTER INSERT OR UPDATE ON upgrade_requests FOR EACH ROW EXECUTE FUNCTION audit_mutation();
CREATE TRIGGER grant_audit AFTER INSERT OR DELETE ON access_grants FOR EACH ROW EXECUTE FUNCTION audit_mutation();
CREATE TRIGGER account_audit AFTER INSERT OR UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION audit_mutation();
CREATE TRIGGER session_audit AFTER INSERT OR DELETE ON sessions FOR EACH ROW EXECUTE FUNCTION audit_mutation();

CREATE FUNCTION audit_read_event(cid uuid, operation text, target_id text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE allowed boolean := false;
BEGIN
 IF NOT public.tenant_read(cid) OR length(target_id)>100 THEN RAISE EXCEPTION 'audit scope denied' USING ERRCODE='42501'; END IF;
 CASE operation
 WHEN 'records.list' THEN allowed := target_id IN ('tasks','attendance','general') AND public.module_enabled(cid,target_id);
 WHEN 'record.read' THEN allowed := EXISTS(SELECT 1 FROM public.records WHERE company_id=cid AND id::text=target_id AND public.module_enabled(cid,module));
 WHEN 'files.list' THEN allowed := target_id=cid::text;
 WHEN 'file.download' THEN allowed := EXISTS(SELECT 1 FROM public.files WHERE company_id=cid AND id::text=target_id);
 ELSE allowed := false;
 END CASE;
 IF NOT allowed THEN RAISE EXCEPTION 'audit event denied' USING ERRCODE='42501'; END IF;
 INSERT INTO public.audit_events(company_id,actor_id,action,target) VALUES(cid,public.subject(),operation,target_id);
END $$;
CREATE FUNCTION audit_denied_event(operation text, outcome_code text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
 IF NOT public.active_account() OR length(operation)>150 OR operation !~ '^(GET|POST|PUT|PATCH|DELETE) /[a-zA-Z0-9/:._-]+$'
 OR outcome_code NOT IN ('INVALID_INPUT','UNAUTHENTICATED','FORBIDDEN','NOT_FOUND','CONFLICT','STORAGE_QUOTA','INVALID_FILE_TYPE','UNAVAILABLE','TOO_LARGE','RATE_LIMITED') THEN
 RAISE EXCEPTION 'audit event denied' USING ERRCODE='42501'; END IF;
 INSERT INTO public.audit_events(actor_id,action,target,outcome) VALUES(public.subject(),'request.denied',operation,outcome_code);
END $$;

CREATE FUNCTION guard_identity_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
 IF session_user<>'channel_app' THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='accounts' THEN
  IF TG_OP='INSERT' THEN
   IF NOT public.platform_owner() OR NEW.platform_admin THEN RAISE EXCEPTION 'account grant denied' USING ERRCODE='42501'; END IF;
  ELSE
   IF NEW.id<>OLD.id OR NEW.platform_admin<>OLD.platform_admin OR NEW.email<>OLD.email THEN RAISE EXCEPTION 'immutable account authority' USING ERRCODE='42501'; END IF;
   IF NEW.status<>OLD.status AND (NOT public.platform_owner() OR OLD.id=public.subject() OR OLD.platform_admin) THEN RAISE EXCEPTION 'account status denied' USING ERRCODE='42501'; END IF;
   IF NEW.password_hash<>OLD.password_hash AND (OLD.id<>public.subject() OR NOT public.active_account()) THEN RAISE EXCEPTION 'password change denied' USING ERRCODE='42501'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='memberships' THEN
  IF NEW.account_id=public.subject() OR EXISTS(SELECT 1 FROM public.accounts WHERE id=NEW.account_id AND platform_admin) THEN RAISE EXCEPTION 'self/platform grant denied' USING ERRCODE='42501'; END IF;
  IF TG_OP='INSERT' AND NOT public.platform_owner() THEN RAISE EXCEPTION 'membership provisioning denied' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND (NEW.company_id<>OLD.company_id OR NEW.account_id<>OLD.account_id) THEN RAISE EXCEPTION 'immutable membership' USING ERRCODE='42501'; END IF;
 ELSIF TG_TABLE_NAME='access_grants' THEN
  IF NEW.account_id<>public.subject() OR NEW.created_by<>public.subject() OR NEW.expires_at<=statement_timestamp() OR NEW.expires_at>statement_timestamp()+interval '60 minutes' THEN RAISE EXCEPTION 'access grant denied' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER account_authority BEFORE INSERT OR UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION guard_identity_changes();
CREATE TRIGGER membership_authority BEFORE INSERT OR UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION guard_identity_changes();
CREATE TRIGGER access_grant_authority BEFORE INSERT ON access_grants FOR EACH ROW EXECUTE FUNCTION guard_identity_changes();
-- Do not grant default PUBLIC execution on the new SECURITY DEFINER functions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
-- Runtime needs to lock only its verified session, not UPDATE access to all sessions.
CREATE FUNCTION lock_session(session_digest text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
 PERFORM 1 FROM public.sessions WHERE token_hash=session_digest AND account_id=public.subject() AND expires_at>statement_timestamp() FOR SHARE;
 RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION lock_session(text) FROM PUBLIC;
CREATE FUNCTION lock_password_reset(token_digest text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE recipient uuid;
BEGIN
 SELECT r.account_id INTO recipient FROM public.password_resets r JOIN public.accounts a ON a.id=r.account_id
 WHERE token_hash=token_digest AND expires_at>statement_timestamp() AND a.status='active' FOR UPDATE OF r;
 RETURN recipient;
END $$;
REVOKE EXECUTE ON FUNCTION lock_password_reset(text) FROM PUBLIC;

-- Expiry is evaluated for the access statement, not a long transaction's start.
CREATE OR REPLACE FUNCTION tenant_read(cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$ SELECT public.active_account() AND (public.tenant_role(cid) IS NOT NULL OR (public.platform_owner() AND EXISTS(SELECT 1 FROM public.access_grants g JOIN public.companies c ON c.id=g.company_id WHERE g.company_id=cid AND g.account_id=public.subject() AND g.expires_at>statement_timestamp() AND c.status='active'))) $$;
