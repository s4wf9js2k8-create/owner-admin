import React from "react";
import { Empty } from "../components";
export function BackendState({ status, error, retry, empty }) {
  return (
    <>
      {status === "loading" && (
        <p role="status">Loading fictional demo data…</p>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          {status === "error" && (
            <button onClick={retry}>Retry demo load</button>
          )}
        </div>
      )}
      {status === "ready" && empty && (
        <Empty>
          No example organisations. Reset the fictional demo to restore
          fixtures.
        </Empty>
      )}
    </>
  );
}
