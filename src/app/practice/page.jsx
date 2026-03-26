"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AudioRecorder from "@/components/AudioRecorder";
import FeedbackPanel from "@/components/FeedbackPanel";
import ModelAnswer from "@/components/ModelAnswer";
import { scoreToQuality } from "@/lib/sm2";

const isDev = process.env.NODE_ENV === "development";

export default function PracticePage() {
  const { status } = useSession();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState("record");
  const [feedback, setFeedback] = useState(null);
  const [feedbackError, setFeedbackError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [fetchingFeedback, setFetchingFeedback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sampleCache, setSampleCache] = useState({});
  const [sampleLoading, setSampleLoading] = useState(false);
  const [devFeedbackDebugOpen, setDevFeedbackDebugOpen] = useState(false);
  const [lastFeedbackDebug, setLastFeedbackDebug] = useState(null);

  const current = useMemo(() => cards[idx] || null, [cards, idx]);
  const currentKey = current ? `${current.qType || "Technical"}::${current.question}` : "";
  const sample = currentKey ? sampleCache[currentKey] : null;

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    const res = await fetch("/api/spaced-repetition?limit=20");
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErr(data?.error || "Failed to load due cards.");
      return;
    }
    setCards(data.cards || []);
    setIdx(0);
    resetCardState();
  }, []);

  function resetCardState() {
    setRevealed(false);
    setMode("record");
    setFeedback(null);
    setFeedbackError("");
    setTranscript("");
  }

  async function revealAndMaybeFetchSample() {
    if (!current) return;
    setRevealed(true);
    const key = `${current.qType || "Technical"}::${current.question}`;
    if (sampleCache[key]) return;
    setSampleLoading(true);
    const res = await fetch("/api/answers/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: current.question,
        type: current.qType || "Technical",
        difficulty: "mid",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSampleLoading(false);
    if (res.ok) {
      setSampleCache((prev) => ({
        ...prev,
        [key]: {
          answer: data.sampleAnswer || "",
          keyPoints: data.keyPoints || [],
        },
      }));
    }
  }

  async function grade(score) {
    if (!current) return;
    await fetch("/api/spaced-repetition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: current.question,
        qType: current.qType,
        roleId: current.roleId,
        score,
      }),
    });
    const nextIdx = idx + 1;
    if (nextIdx >= cards.length) load();
    else {
      setIdx(nextIdx);
      resetCardState();
    }
  }

  async function requestFeedback(answerText) {
    if (!current || !answerText?.trim()) return;
    setErr("");
    setFeedback(null);
    setFeedbackError("");
    console.log("[frontend] Submitting for feedback:", {
      transcript: answerText.slice(0, 100),
      transcriptLength: answerText.length,
      question: String(current.question || "").slice(0, 50),
    });
    const t0 = Date.now();
    if (isDev) {
      setLastFeedbackDebug({
        requestAt: new Date().toISOString(),
        request: {
          questionLength: String(current.question || "").length,
          answerLength: answerText.length,
          questionPreview: String(current.question || "").slice(0, 160),
          answerPreview: answerText.slice(0, 240),
          type: current.qType || "Technical",
          difficulty: "mid",
        },
        response: null,
      });
    }
    setFetchingFeedback(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: current.question,
        answer: answerText,
        type: current.qType || "Technical",
        difficulty: "mid",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setFetchingFeedback(false);
    if (isDev) {
      setLastFeedbackDebug((prev) => ({
        ...(prev || {}),
        response: {
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - t0,
          httpStatus: res.status,
          ok: res.ok,
          score: data?.score,
          error: data?.error,
          detail: data?.detail,
          bodyPreview: JSON.stringify(data, null, 2).slice(0, 1800),
        },
      }));
    }
    if (!res.ok) {
      console.error("[frontend] Feedback API error:", data);
      const msg = data?.detail || data?.error || "Failed to get AI feedback. Check terminal logs.";
      setFeedbackError(msg);
      return;
    }
    if (data?.error) {
      console.error("[frontend] Feedback returned error payload:", data);
      setFeedbackError(data?.detail || data?.error);
      return;
    }
    setFeedback(data);
    setRevealed(true);
    await revealAndMaybeFetchSample();
  }

  async function saveAndContinue() {
    if (!current || !feedback) return;
    setSaving(true);
    const score10 = Number(feedback.score || 0);
    const quality = scoreToQuality(score10);

    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId: current.roleId || "swe",
        roleLabel: current.roleId || "Role",
        difficulty: "mid",
        results: [
          {
            question: current.question,
            qType: current.qType || "Technical",
            answer: transcript || "",
            score: score10,
            grade: score10 >= 8 ? "A" : score10 >= 6 ? "B" : "C",
            summary: `${feedback.summary || ""}\n\nImproved: ${feedback.improvedAnswer || ""}`,
          },
        ],
      }),
    }).catch(() => null);

    await fetch("/api/spaced-repetition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: current.question,
        qType: current.qType,
        roleId: current.roleId,
        score: quality,
      }),
    });

    setSaving(false);
    const nextIdx = idx + 1;
    if (nextIdx >= cards.length) load();
    else {
      setIdx(nextIdx);
      resetCardState();
    }
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  if (status === "loading") {
    return (
      <main className="container">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="container">
        <div className="card">
          <h1>Practice (SM-2)</h1>
          <p className="muted">Sign in to review your due cards.</p>
          <div className="row">
            <a className="btn" href="/auth/signin">
              Sign in
            </a>
            <a className="btn btnSecondary" href="/auth/signup">
              Create account
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container softGrid">
      <div className="sectionHeader reveal">
        <div>
          <span className="badge">SM-2 Review Loop</span>
          <h1 style={{ marginTop: 8 }}>Practice</h1>
        </div>
        <div className="row">
          <a className="link" href="/resume">
            Resume
          </a>
          <a className="link" href="/dashboard">
            Dashboard
          </a>
        </div>
      </div>

      <div className="card reveal revealDelay1">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="muted" style={{ fontSize: 13 }}>
              Due cards: {cards.length} {cards.length ? `(card ${idx + 1}/${cards.length})` : ""}
            </div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>Review queue</div>
          </div>
          <button className="btn btnSecondary" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {err ? (
          <p className="muted" style={{ color: "tomato", marginTop: 10 }}>
            {err}
          </p>
        ) : null}

        {!current ? (
          <p className="muted" style={{ marginTop: 12 }}>
            Nothing due right now. Add questions from the Resume page, or come back later.
          </p>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              {current.qType} · Next review: {new Date(current.nextReview).toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1.5,
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "14px 16px",
                background: "color-mix(in srgb, var(--card) 78%, transparent)",
              }}
            >
              {current.question}
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className={mode === "record" ? "btn" : "btn btnSecondary"} onClick={() => setMode("record")}>
                Record Answer
              </button>
              <button className={mode === "self" ? "btn" : "btn btnSecondary"} onClick={() => setMode("self")}>
                Self Assess
              </button>
              <button className="btn btnSecondary" onClick={revealAndMaybeFetchSample}>
                Reveal & Score
              </button>
            </div>

            {mode === "record" ? (
              <AudioRecorder
                onTranscript={setTranscript}
                onSubmitForFeedback={requestFeedback}
                disabled={fetchingFeedback || saving}
              />
            ) : null}

            {fetchingFeedback ? <p className="muted">Generating AI feedback...</p> : null}
            {feedback ? (
              <FeedbackPanel
                feedback={feedback}
                feedbackError={feedbackError}
                originalAnswer={transcript}
                onSaveContinue={saveAndContinue}
                onRetry={() => requestFeedback(transcript)}
                saving={saving}
              />
            ) : null}
            {!feedback && feedbackError ? (
              <FeedbackPanel
                feedback={null}
                feedbackError={feedbackError}
                originalAnswer={transcript}
                onSaveContinue={saveAndContinue}
                onRetry={() => requestFeedback(transcript)}
                saving={saving}
              />
            ) : null}

            {revealed ? (
              <>
                {sampleLoading ? <p className="muted" style={{ marginTop: 10 }}>Loading model answer...</p> : null}
                {!sampleLoading && sample ? (
                  <ModelAnswer answer={sample.answer} keyPoints={sample.keyPoints} />
                ) : null}

                <div className="row" style={{ marginTop: 14 }}>
                  {[0, 1, 2, 3, 4, 5].map((s) => (
                    <button key={s} className="btn btnSecondary" onClick={() => grade(s)}>
                      {s}
                    </button>
                  ))}
                  <span className="muted" style={{ marginLeft: 8 }}>
                    0–2 resets, 3–4 slows, 5 accelerates
                  </span>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {isDev ? (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 50,
            maxWidth: "min(420px, calc(100vw - 32px))",
            fontSize: 12,
          }}
        >
          <div className="row" style={{ marginTop: 0, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btnSecondary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setDevFeedbackDebugOpen((v) => !v)}
            >
              {devFeedbackDebugOpen ? "Hide" : "Dev"} feedback debug
            </button>
            {lastFeedbackDebug ? (
              <button
                type="button"
                className="btn btnSecondary"
                style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => setLastFeedbackDebug(null)}
              >
                Clear
              </button>
            ) : null}
          </div>
          {devFeedbackDebugOpen ? (
            <div
              className="card"
              style={{
                marginTop: 8,
                maxHeight: "min(50vh, 360px)",
                overflow: "auto",
                boxShadow: "0 12px 40px rgba(15, 23, 42, 0.18)",
              }}
            >
              <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                Last <code>/api/feedback</code> call (development only)
              </div>
              {!lastFeedbackDebug ? (
                <p className="muted" style={{ margin: 0 }}>
                  Submit for feedback once to capture request/response metadata here.
                </p>
              ) : (
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: 11,
                    lineHeight: 1.45,
                  }}
                >
                  {JSON.stringify(lastFeedbackDebug, null, 2)}
                </pre>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

