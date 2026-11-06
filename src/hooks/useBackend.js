import { useEffect, useState, useSyncExternalStore } from "react";
import { assertBackend } from "../backend/contracts";

export function useBackend(backend) {
  assertBackend(backend);
  const data = useSyncExternalStore(backend.subscribe, backend.getSnapshot);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setStatus("loading");
    setError("");
    backend
      .load()
      .then(() => {
        if (current) setStatus("ready");
      })
      .catch(() => {
        if (current) {
          setStatus("error");
          setError("Could not load fictional demo data.");
        }
      });
    return () => {
      current = false;
    };
  }, [backend, attempt]);
  const run = async (operation) => {
    setError("");
    try {
      await operation();
      return true;
    } catch {
      setError("Demo change failed. Please retry; no real data was saved.");
      return false;
    }
  };
  return { data, status, error, run, retry: () => setAttempt((n) => n + 1) };
}
