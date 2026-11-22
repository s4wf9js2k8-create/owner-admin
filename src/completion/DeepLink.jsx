import { useEffect, useRef } from "react";
export default function useDeepLink(controller, setFocus) {
  const handled = useRef("");
  useEffect(() => {
    const open = () => {
      const hash = location.hash;
      if (hash === handled.current) return;
      const p = new URLSearchParams(hash.slice(1)),
        orgId = p.get("workspace"),
        id = p.get("record");
      if (!orgId || !id) return;
      const org = controller.orgs.find((o) => o.id === orgId);
      if (!org) return;
      handled.current = hash;
      const r = controller.records.find(
        (r) => r.id === id && r.orgId === orgId,
      );
      if (
        !r ||
        !org.modules.includes(r.module) ||
        ["Archived", "Suspended"].includes(org.status)
      ) {
        setFocus({
          error:
            "This session-only record is unavailable. Refresh restores sample records; newly created demo assets do not persist.",
        });
        return;
      }
      controller.setSelected(orgId);
      controller.setCustomer(true);
      controller.setCustomerPage(r.archivedAt ? "Business archives" : r.module);
      setFocus({
        orgId,
        page: r.archivedAt ? "Business archives" : r.module,
        id: r.id,
        nonce: Date.now(),
      });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [controller.orgs, controller.records]);
}
