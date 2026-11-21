import React, { useState } from "react";
export default function BusinessSettings({ controller: c }) {
  const [saved, setSaved] = useState(false),
    b = c.flags.business || {};
  return (
    <div>
      <h2>Channel Systems business settings</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          if (await c.setFlags({ ...c.flags, business: f })) {
            await c.log("Updated owner business settings");
            setSaved(true);
          }
        }}
      >
        <label>
          Business name
          <input
            name="name"
            required
            defaultValue={b.name || "Channel Systems"}
          />
        </label>
        <label>
          Tagline
          <input
            name="tagline"
            required
            defaultValue={
              b.tagline || "Bespoke Business Software & Management Solutions"
            }
          />
        </label>
        <label>
          Business email
          <input name="email" type="email" defaultValue={b.email || ""} />
        </label>
        <label>
          Default onboarding package
          <select
            name="defaultPlan"
            defaultValue={b.defaultPlan || c.plans[0]?.name}
          >
            {c.plans.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
        </label>
        <label>
          Support response target (hours, planning only)
          <input
            name="responseTarget"
            type="number"
            min="1"
            max="720"
            defaultValue={b.responseTarget || 24}
          />
        </label>
        <button>Save business settings</button>
      </form>
      {saved && (
        <p role="status">Business defaults saved for this demo session.</p>
      )}
      <p>
        Default package applies to new onboarding drafts. Response targets are
        planning preferences, not measured SLAs. Existing demo flags remain
        below.
      </p>
    </div>
  );
}
