CREATE TABLE accounts (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE CHECK(length(email)<=254), password_hash text NOT NULL,
 platform_admin boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), expires_at timestamptz NOT NULL);
CREATE TABLE password_resets (token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id), expires_at timestamptz NOT NULL);
CREATE TABLE packages (name text PRIMARY KEY CHECK(name IN ('Essential','Professional','Enterprise')), modules text[] NOT NULL, monthly_draft integer CHECK(monthly_draft BETWEEN 0 AND 100000), version integer NOT NULL DEFAULT 1);
INSERT INTO packages(name, modules) VALUES ('Essential',ARRAY['tasks','general']),('Professional',ARRAY['tasks','general','attendance','reporting']),('Enterprise',ARRAY['tasks','general','attendance','reporting']);
CREATE TABLE companies (
 id uuid PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100), color text NOT NULL DEFAULT '#28533a' CHECK(color ~ '^#[0-9a-fA-F]{6}$'),
 settings jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 package text NOT NULL REFERENCES packages(name), modules text[] NOT NULL, overrides text[] NOT NULL DEFAULT '{}',
 quota_bytes bigint NOT NULL DEFAULT 1073741824 CHECK(quota_bytes>=0), version integer NOT NULL DEFAULT 1
);
CREATE TABLE memberships (
 company_id uuid NOT NULL REFERENCES companies(id), account_id uuid NOT NULL REFERENCES accounts(id),
 role text NOT NULL CHECK(role IN ('viewer','staff','manager','organisation-admin')), status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')), version integer NOT NULL DEFAULT 1,
 PRIMARY KEY(company_id,account_id)
);
CREATE TABLE access_grants (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), account_id uuid NOT NULL REFERENCES accounts(id),
 reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 300), expires_at timestamptz NOT NULL, created_by uuid NOT NULL REFERENCES accounts(id)
);
CREATE TABLE records (
 id uuid NOT NULL, company_id uuid NOT NULL REFERENCES companies(id), module text NOT NULL CHECK(module IN ('tasks','attendance','general')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100), detail text NOT NULL DEFAULT '' CHECK(length(detail)<=1000),
 progress integer NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100), attendance_minutes integer CHECK(attendance_minutes BETWEEN 0 AND 1440),
 version integer NOT NULL DEFAULT 1, created_by uuid NOT NULL REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id,id)
);
CREATE TABLE upgrade_requests (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), requested_by uuid NOT NULL REFERENCES accounts(id),
 package text REFERENCES packages(name), feature text CHECK(feature IN ('tasks','general','attendance','reporting')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), version integer NOT NULL DEFAULT 1,
 CHECK((package IS NULL) <> (feature IS NULL))
);
CREATE UNIQUE INDEX one_pending_request ON upgrade_requests(company_id) WHERE status='pending';
CREATE TABLE files (
 id uuid NOT NULL, company_id uuid NOT NULL REFERENCES companies(id), original_name text NOT NULL CHECK(length(original_name) BETWEEN 1 AND 120),
 mime text NOT NULL CHECK(mime IN ('image/png','image/jpeg','application/pdf')), size_bytes bigint NOT NULL CHECK(size_bytes>0),
 sha256 text NOT NULL, created_by uuid NOT NULL REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(company_id,id)
);
CREATE TABLE audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, company_id uuid REFERENCES companies(id), actor_id uuid NOT NULL REFERENCES accounts(id),
 action text NOT NULL, target text NOT NULL, outcome text NOT NULL DEFAULT 'success', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX records_scope ON records(company_id,module,id);
CREATE INDEX files_scope ON files(company_id);
CREATE INDEX audit_scope ON audit_events(company_id,id);
CREATE INDEX memberships_account ON memberships(account_id,company_id);
-- Only a trusted API connection sets this transaction-local identity. Database credentials
-- are server secrets, never client credentials. These functions never trust body roles.
CREATE FUNCTION subject() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.account_id',true),'')::uuid $$;
CREATE FUNCTION active_account() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT EXISTS(SELECT 1 FROM accounts WHERE id=subject() AND status='active') $$;
CREATE FUNCTION platform_owner() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT EXISTS(SELECT 1 FROM accounts WHERE id=subject() AND status='active' AND platform_admin) $$;
CREATE FUNCTION tenant_role(cid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT m.role FROM memberships m JOIN companies c ON c.id=m.company_id JOIN accounts a ON a.id=m.account_id WHERE m.company_id=cid AND m.account_id=subject() AND m.status='active' AND c.status='active' AND a.status='active' $$;
CREATE FUNCTION tenant_read(cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT active_account() AND (tenant_role(cid) IS NOT NULL OR (platform_owner() AND EXISTS(SELECT 1 FROM access_grants g JOIN companies c ON c.id=g.company_id WHERE g.company_id=cid AND g.account_id=subject() AND g.expires_at>now() AND c.status='active'))) $$;
CREATE FUNCTION tenant_write(cid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce(tenant_role(cid) IN ('staff','manager','organisation-admin'),false) $$;
CREATE FUNCTION tenant_admin(cid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce(tenant_role(cid)='organisation-admin',false) $$;
CREATE FUNCTION module_enabled(cid uuid, mod text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT EXISTS(SELECT 1 FROM companies WHERE id=cid AND status='active' AND mod=ANY(modules)) $$;
-- Authorization helpers bypass RLS only to read authoritative control tables.
-- Their owner is the migration role, not the runtime role. Fixed search_path;
-- app role cannot CREATE in public or change these functions.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_read ON companies FOR SELECT USING(platform_owner() OR tenant_role(id) IS NOT NULL);
CREATE POLICY company_owner_insert ON companies FOR INSERT WITH CHECK(platform_owner());
CREATE POLICY company_owner_update ON companies FOR UPDATE USING(platform_owner()) WITH CHECK(platform_owner());
CREATE POLICY membership_read ON memberships FOR SELECT USING(platform_owner() OR tenant_admin(company_id) OR (account_id=subject() AND tenant_read(company_id)));
CREATE POLICY membership_manage ON memberships FOR ALL USING(platform_owner() OR tenant_admin(company_id)) WITH CHECK(platform_owner() OR tenant_admin(company_id));
CREATE POLICY record_read ON records FOR SELECT USING(tenant_read(company_id) AND module_enabled(company_id,module));
CREATE POLICY record_create ON records FOR INSERT WITH CHECK(tenant_write(company_id) AND module_enabled(company_id,module) AND created_by=subject());
CREATE POLICY record_update ON records FOR UPDATE USING(tenant_write(company_id) AND module_enabled(company_id,module)) WITH CHECK(tenant_write(company_id) AND module_enabled(company_id,module));
CREATE POLICY record_delete ON records FOR DELETE USING(coalesce(tenant_role(company_id) IN ('manager','organisation-admin'),false) AND module_enabled(company_id,module));
CREATE POLICY file_read ON files FOR SELECT USING(tenant_read(company_id));
CREATE POLICY file_create ON files FOR INSERT WITH CHECK(tenant_write(company_id) AND created_by=subject());
CREATE POLICY file_delete ON files FOR DELETE USING(tenant_admin(company_id));
CREATE POLICY requests_read ON upgrade_requests FOR SELECT USING(platform_owner() OR tenant_read(company_id));
CREATE POLICY requests_create ON upgrade_requests FOR INSERT WITH CHECK(tenant_admin(company_id) AND requested_by=subject() AND status='pending');
CREATE POLICY requests_update ON upgrade_requests FOR UPDATE USING(platform_owner()) WITH CHECK(platform_owner());
CREATE POLICY grants_owner ON access_grants FOR ALL USING(platform_owner()) WITH CHECK(platform_owner());
CREATE POLICY audit_read ON audit_events FOR SELECT USING(platform_owner() OR tenant_admin(company_id));
CREATE POLICY audit_append ON audit_events FOR INSERT WITH CHECK(actor_id=subject() AND active_account());
-- Accounts, sessions and resets are private API identity tables. Never exposed by
-- general database query endpoints. Application credentials are a trusted boundary.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE FUNCTION storage_total() RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT coalesce(sum(size_bytes),0)::bigint FROM files $$;
CREATE FUNCTION storage_summary() RETURNS TABLE(id uuid,name text,quota_bytes bigint,used_bytes bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT c.id,c.name,c.quota_bytes,coalesce(sum(f.size_bytes),0)::bigint FROM companies c LEFT JOIN files f ON f.company_id=c.id WHERE platform_owner() GROUP BY c.id $$;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY package_read ON packages FOR SELECT USING(active_account());
CREATE POLICY package_update ON packages FOR UPDATE USING(platform_owner()) WITH CHECK(platform_owner());
CREATE FUNCTION immutable_record_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.company_id<>OLD.company_id OR NEW.id<>OLD.id OR NEW.module<>OLD.module OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'immutable record scope' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER record_scope BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION immutable_record_scope();
ALTER TABLE records ADD CONSTRAINT positive_record_version CHECK(version>0);
ALTER TABLE companies ADD CONSTRAINT positive_company_version CHECK(version>0);
ALTER TABLE memberships ADD CONSTRAINT positive_membership_version CHECK(version>0);
ALTER TABLE files ADD CONSTRAINT valid_file_hash CHECK(sha256 ~ '^[a-f0-9]{64}$');
