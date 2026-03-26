"use client";

import { useState } from "react";

function colorByScore(score) {
  if (score <= 4) return "#ef4444";
  if (score <= 7) return "#f59e0b";
  return "#22c55e";
}

export default function FeedbackPanel({
  feedback,
  feedbackError,
  originalAnswer,
  onSaveContinue,
  onRetry,
  saving,
}) {
  const [openImproved, setOpenImproved] = useState(false);
  const [compare, setCompare] = useState(false);
  if (feedbackError) {
    return (
      <div
        className="card"
        style={{
          marginTop: 12,
          background: "#7f1d1d20",
          border: "1px solid #991b1b",
          color: "#fca5a5",
        }}
      >
        <strong>Feedback failed:</strong> {feedbackError}
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          Check the browser console and dev server terminal for <code>[api/feedback]</code> logs. Ensure{" "}
          <code>OPENAI_API_KEY</code> is set in <code>.env.local</code> and restart <code>npm run dev</code> after
          changes.
        </div>
        {onRetry ? (
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btnSecondary" type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        ) : null}
      </div>
    );
  }
  if (!feedback) return null;
  const score = Number(feedback.score || 0);

  const criteria = feedback.criteriaScores || {};
  const rows = [
    ["Completeness", criteria.completeness],
    ["Depth", criteria.depth],
    ["Structure", criteria.structure],
    ["Communication", criteria.communication],
    ["Technical Accuracy", criteria.technicalAccuracy],
  ];

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 0 }}>
        <strong>AI Feedback</strong>
        <span
          className="badge"
          style={{
            background: `${colorByScore(score)}20`,
            color: colorByScore(score),
            borderColor: `${colorByScore(score)}66`,
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {score}/10
        </span>
      </div>

      <p style={{ marginTop: 10 }}>{feedback.summary}</p>

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {rows.map(([label, raw]) => {
          const val = Math.max(0, Math.min(10, Number(raw || 0)));
          return (
            <div key={label}>
              <div className="row" style={{ justifyContent: "space-between", marginTop: 0 }}>
                <span className="muted">{label}</span>
                <span>{val}/10</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--soft)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${val * 10}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <strong style={{ color: "#16a34a" }}>Strengths</strong>
        <ul style={{ paddingLeft: 18, marginTop: 6 }}>
          {(feedback.strengths || []).map((s, i) => (
            <li key={`${s}-${i}`}>✅ {s}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 8 }}>
        <strong style={{ color: "#d97706" }}>Weaknesses</strong>
        <ul style={{ paddingLeft: 18, marginTop: 6 }}>
          {(feedback.weaknesses || []).map((w, i) => (
            <li key={`${w}-${i}`}>⚠️ {w}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 10 }}>
        <button className="btn btnSecondary" type="button" onClick={() => setOpenImproved((v) => !v)}>
          {openImproved ? "Hide Improved Answer" : "Show Improved Answer"}
        </button>
        {openImproved ? (
          <div style={{ marginTop: 10 }}>
            <button className="btn btnSecondary" type="button" onClick={() => setCompare((v) => !v)}>
              {compare ? "Single view" : "Compare with yours"}
            </button>
            {!compare ? (
              <div className="card" style={{ marginTop: 8 }}>
                {feedback.improvedAnswer}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
                <div className="card">
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Your answer
                  </div>
                  <div>{originalAnswer}</div>
                </div>
                <div className="card">
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Improved answer
                  </div>
                  <div>{feedback.improvedAnswer}</div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" type="button" onClick={onSaveContinue} disabled={saving}>
          {saving ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}

