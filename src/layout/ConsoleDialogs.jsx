import React from "react";
import { sectors } from "../model";
import { OrganisationForm, Modal } from "../components";
export default function ConsoleDialogs({ controller }) {
  const {
    form,
    setForm,
    update,
    backend,
    run,
    setSelected,
    log,
    navigate,
    confirm,
    setConfirm,
    orgs,
  } = controller;
  return (
    <>
      {form && (
        <OrganisationForm
          org={form.org}
          sectors={sectors}
          onClose={() => setForm(null)}
          onSave={async (values) => {
            if (form.type === "edit") {
              if (
                !(await update(
                  form.org.id,
                  { name: values.name.trim(), sector: values.sector },
                  "Updated sample organisation profile",
                ))
              )
                return;
            } else {
              let o;
              if (
                !(await run(async () => {
                  o = await backend.organisations.create(values);
                }))
              )
                return;
              setSelected(o.id);
              await log("Created example organisation " + o.name, o.id);
              navigate("Company Profile");
            }
            setForm(null);
          }}
        />
      )}
      {confirm && (
        <Modal
          title="Confirm demonstration change"
          onClose={() => setConfirm(null)}
        >
          <p>
            {orgs.find((o) => o.id === confirm.id)?.name}:{" "}
            {confirm.plan
              ? "change package to " + confirm.plan
              : "change status to " + confirm.status}
            ?
          </p>
          <p>
            No billing or account access changes occur. Archiving preserves
            sample records and hides the organisation from the preview selector.
          </p>
          <button
            className="primary"
            onClick={async () => {
              const { id, ...patch } = confirm;
              if (
                !(await update(
                  id,
                  patch,
                  confirm.plan
                    ? "Changed sample package to " + confirm.plan
                    : "Changed sample status to " + confirm.status,
                ))
              )
                return;
              setConfirm(null);
            }}
          >
            Confirm sample change
          </button>
          <button onClick={() => setConfirm(null)}>Cancel</button>
        </Modal>
      )}
    </>
  );
}
