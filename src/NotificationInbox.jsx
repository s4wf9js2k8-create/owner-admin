import React, { useState } from "react";
import { Empty, Status } from "./components";
import { isTaskModule } from "./customerModules";
import {
  generateNotifications,
  notificationCategories,
} from "./notificationRules";
export default function NotificationInbox({
  org,
  records,
  onNavigate,
  prefs,
  settings,
  setSettings,
  state,
  setState,
  actorId,
  department,
  notices,
}) {
  const [filter, setFilter] = useState("Unread"),
    [category, setCategory] = useState("All"),
    [configure, setConfigure] = useState(false);
  const all = generateNotifications(records, org.id, {
    ...settings,
    reminders: prefs.reminders !== false,
    actorId,
    department,
    notices,
  });
  const enabled = all.filter(
    (n) =>
      !settings.disabledCategories?.includes(n.category) &&
      (!settings.priorityOnly || n.priority),
  );
  const read = state.read || [],
    dismissed = state.dismissed || [];
  const visible = enabled.filter(
    (n) =>
      (category === "All" || n.category === category) &&
      (filter === "Dismissed"
        ? dismissed.includes(n.id)
        : !dismissed.includes(n.id) &&
          (filter === "All" ||
            (filter === "Priority" && n.priority) ||
            (filter === "Unread" && !read.includes(n.id)) ||
            (filter === "Read" && read.includes(n.id)))),
  );
  const unread = enabled.filter(
    (n) => !read.includes(n.id) && !dismissed.includes(n.id),
  ).length;
  const change = (key, id, toggle) =>
    setState((old) => ({
      ...old,
      [key]: toggle
        ? (old[key] || []).filter((x) => x !== id)
        : [...new Set([...(old[key] || []), id])],
    }));
  const open = (n) =>
    onNavigate(isTaskModule(n.module) ? "Tasks & projects" : n.module, {
      recordId: n.recordId,
    });
  return (
    <div className="notification-inbox">
      <div className="ops-banner">
        <div>
          <span className="eyebrow">IN-APP NOTIFICATIONS</span>
          <h2>Notification inbox</h2>
          <p>
            <strong aria-label="Unread notification count">{unread}</strong>{" "}
            unread · based on current permitted records
          </p>
        </div>
        <div className="quick-actions">
          <button
            onClick={() =>
              setState((old) => ({
                ...old,
                read: [
                  ...new Set([
                    ...(old.read || []),
                    ...enabled.map((n) => n.id),
                  ]),
                ],
              }))
            }
          >
            Mark all read
          </button>
          <button onClick={() => setConfigure(!configure)}>
            Notification preferences
          </button>
        </div>
      </div>
      {configure && (
        <section className="notification-preferences">
          <h3>Your notification preferences</h3>
          <label>
            Reminder period (days)
            <input
              aria-label="Reminder period in days"
              type="number"
              min="1"
              max="90"
              value={settings.reminderDays || 14}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isInteger(value) && value >= 1 && value <= 90)
                  setSettings({ ...settings, reminderDays: value });
              }}
            />
          </label>
          <label className="task-check">
            <input
              type="checkbox"
              checked={Boolean(settings.priorityOnly)}
              onChange={(e) =>
                setSettings({ ...settings, priorityOnly: e.target.checked })
              }
            />
            Priority alerts only
          </label>
          <div className="notification-category-options">
            {notificationCategories.map((c) => (
              <label className="task-check" key={c}>
                <input
                  type="checkbox"
                  checked={!settings.disabledCategories?.includes(c)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      disabledCategories: e.target.checked
                        ? (settings.disabledCategories || []).filter(
                            (x) => x !== c,
                          )
                        : [...(settings.disabledCategories || []), c],
                    })
                  }
                />
                {c}
              </label>
            ))}
          </div>
        </section>
      )}
      <div className="inbox-layout">
        <div
          className="inbox-categories"
          role="group"
          aria-label="Notification categories"
        >
          {["All", ...notificationCategories].map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
              <span>
                {c === "All"
                  ? enabled.length
                  : enabled.filter((n) => n.category === c).length}
              </span>
            </button>
          ))}
        </div>
        <section className="inbox-feed">
          <label>
            Show
            <select
              aria-label="Filter notifications"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["Unread", "All", "Read", "Priority", "Dismissed"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          {visible.map((n) => (
            <article
              className={
                "inbox-message " + (!read.includes(n.id) ? "is-unread" : "")
              }
              key={n.id}
            >
              <header>
                <span>
                  {n.category} · Record date:{" "}
                  {n.at && !Number.isNaN(Date.parse(n.at))
                    ? new Date(n.at).toLocaleString("en-GB")
                    : "Date not recorded"}
                </span>
                {n.priority && <Status>Priority</Status>}
              </header>
              <h3>{n.title}</h3>
              <p>{n.detail}</p>
              <div className="quick-actions">
                <button onClick={() => open(n)}>Open associated record</button>
                <button
                  onClick={() => change("read", n.id, read.includes(n.id))}
                >
                  {read.includes(n.id) ? "Mark unread" : "Mark read"}
                </button>
                <button
                  onClick={() =>
                    change("dismissed", n.id, dismissed.includes(n.id))
                  }
                >
                  {dismissed.includes(n.id)
                    ? "Restore notification"
                    : "Dismiss"}
                </button>
              </div>
            </article>
          ))}
          {!visible.length && (
            <Empty>
              {filter === "Unread"
                ? "You're all caught up with this notification filter."
                : "No notifications match this view."}
            </Empty>
          )}
        </section>
      </div>
      <p className="module-disclaimer">
        Preferences, read state and dismissals are scoped to the selected
        fictional user in this company. Alerts recalculate while the demo is
        open; no email, push or background delivery occurs.
      </p>
    </div>
  );
}
