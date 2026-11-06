/** Identity guards intentionally target this dedicated, non-inherited login role. */
export async function assertRuntimeRole(pool) {
  const {
    rows: [role],
  } =
    await pool.query(`SELECT current_user AS role_name,session_user AS login_name,
 r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolinherit,
 EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) AS memberships,
 EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relowner=r.oid)
 OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proowner=r.oid) AS owns
 FROM pg_roles r WHERE rolname=current_user`);
  if (
    !role ||
    role.role_name !== "channel_app" ||
    role.login_name !== "channel_app" ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolinherit ||
    role.memberships ||
    role.owns
  )
    throw new Error(
      "API requires the dedicated channel_app login without ownership, elevated flags or role memberships",
    );
}
