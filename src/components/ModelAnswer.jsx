"use client";

import { useState } from "react";

export default function ModelAnswer({ answer, keyPoints = [] }) {
  const [open, setOpen] = useState(false);
  if (!answer) return null;

  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid rgba(245, 158, 11, 0.35)",
        borderLeft: "4px solid #f59e0b",
        borderRadius: 12,
        background: "#f59e0b10",
        padding: 12,
      }}
    >
      <div className="row" style={{ marginTop: 0, justifyContent: "space-between" }}>
        <strong>💡 Model Answer</strong>
        <button className="btn btnSecondary" onClick={() => setOpen((v) => !v)} type="button">
          {open ? "Hide Model Answer" : "Show Model Answer"}
        </button>
      </div>
      {open ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ lineHeight: 1.6 }}>{answer}</p>
          {keyPoints.length ? (
            <ul style={{ marginTop: 10, paddingLeft: 18 }}>
              {keyPoints.map((k, i) => (
                <li key={`${k}-${i}`} className="muted">
                  {k}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

