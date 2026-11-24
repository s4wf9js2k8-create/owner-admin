import React from "react";
export default function PlatformNotices({ notices = [] }) {
  if (!notices.length) return null;
  return (
    <section
      className="completion-workspace platform-notices"
      aria-label="Channel Systems announcements"
    >
      <h3>Channel Systems updates</h3>
      {notices.map((a) => (
        <article
          className="completion-entry"
          id={"announcement-" + a.id}
          key={a.id}
        >
          <h4>{a.title}</h4>
          <p>{a.body}</p>
          <small>
            Published in demo ·{" "}
            {a.publishedAt
              ? new Date(a.publishedAt).toLocaleDateString("en-GB")
              : a.date}
          </small>
        </article>
      ))}
    </section>
  );
}
