/** Explicit opt-in, same-origin PostgreSQL API client. Never replaces demo defaults. */
export function createPostgresClient({ fetcher = fetch } = {}) {
  const call = async (method, path, body, headers = {}) => {
    let response;
    try {
      response = await fetcher("/api" + path, {
        method,
        credentials: "same-origin",
        headers: {
          ...(body instanceof Uint8Array
            ? { "Content-Type": "application/octet-stream" }
            : body
              ? { "Content-Type": "application/json" }
              : {}),
          ...(method !== "GET" ? { "X-CSRF-Protection": "1" } : {}),
          ...headers,
        },
        body:
          body instanceof Uint8Array
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
      });
    } catch {
      throw new Error(
        "Server unavailable. The public fictional demo remains independent.",
      );
    }
    if (!response.ok) {
      let result;
      try {
        result = await response.json();
      } catch {
        /* non-API hosting */
      }
      throw new Error(result?.error ?? "Server unavailable");
    }
    return response.status === 204 ? null : response.json();
  };
  return Object.freeze({
    call,
    auth: {
      login: (values) => call("POST", "/auth/login", values),
      logout: () => call("POST", "/auth/logout", {}),
      getSession: () => call("GET", "/auth/session"),
    },
    records: {
      list: (cid, module) =>
        call(
          "GET",
          `/companies/${encodeURIComponent(cid)}/records?module=${encodeURIComponent(module)}`,
        ),
      create: (cid, values) =>
        call("POST", `/companies/${encodeURIComponent(cid)}/records`, values),
      update: (cid, id, patch, version) =>
        call(
          "PATCH",
          `/companies/${encodeURIComponent(cid)}/records/${encodeURIComponent(id)}`,
          { ...patch, version },
        ),
      delete: (cid, id, version) =>
        call(
          "DELETE",
          `/companies/${encodeURIComponent(cid)}/records/${encodeURIComponent(id)}`,
          { version },
        ),
    },
  });
}
