"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import ResumeUploader from "@/components/ResumeUploader";
import DifficultySelector from "@/components/DifficultySelector";
import AudioRecorder from "@/components/AudioRecorder";
import FeedbackPanel from "@/components/FeedbackPanel";
import ModelAnswer from "@/components/ModelAnswer";

function RolePicker({ value, onChange }) {
  const roles = [
    { id: "swe", label: "Software Engineer" },
    { id: "frontend", label: "Frontend" },
    { id: "backend", label: "Backend" },
  ];
  return (
    <div className="card">
      <h2 style={{ marginBottom: 8 }}>Target role</h2>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ResumePage() {
  const { status } = useSession();
  const [difficulty, setDifficulty] = useState("mid");
  const [roleId, setRoleId] = useState("swe");
  const [skills, setSkills] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [addingQuestion, setAddingQuestion] = useState("");
  const [addedQuestions, setAddedQuestions] = useState(() => new Set());
  const [addErr, setAddErr] = useState("");
  const [expanded, setExpanded] = useState({});
  const [sampleAnswers, setSampleAnswers] = useState({});
  const [sampleLoading, setSampleLoading] = useState({});
  const [feedbackByKey, setFeedbackByKey] = useState({});
  const [transcriptByKey, setTranscriptByKey] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState({});
  const [feedbackErrors, setFeedbackErrors] = useState({});
  const [savingByKey, setSavingByKey] = useState({});

  const canUse = status === "authenticated";
  const disableActions = status !== "authenticated";

  async function loadResumeQuestions() {
    setErr("");
    setLoading(true);
    const res = await fetch(`/api/questions/resume?roleId=${roleId}&difficulty=${difficulty}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErr(data?.error || "Failed to generate questions.");
      return;
    }
    setSkills(data.skills || []);
    setQuestions(data.questions || []);
    setSource(data.source || "");
  }

  async function addToPractice(q) {
    const key = `${q.qType || "Technical"}::${q.question}`;
    setAddErr("");
    setAddingQuestion(key);
    const res = await fetch("/api/spaced-repetition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q.question,
        qType: q.qType,
        roleId,
        score: 3,
        reviewNow: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setAddingQuestion("");
    if (!res.ok) {
      setAddErr(data?.error || "Failed to add question to practice.");
      return;
    }
    setAddedQuestions((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  async function loadSample(q) {
    const key = `${q.qType || "Technical"}::${q.question}`;
    if (sampleAnswers[key]) return;
    setSampleLoading((p) => ({ ...p, [key]: true }));
    const res = await fetch("/api/answers/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q.question,
        type: q.qType || "Technical",
        difficulty,
        skills,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSampleLoading((p) => ({ ...p, [key]: false }));
    if (!res.ok) return;
    setSampleAnswers((p) => ({
      ...p,
      [key]: { answer: data.sampleAnswer || "", keyPoints: data.keyPoints || [] },
    }));
  }

  async function getFeedback(q, answerText) {
    const key = `${q.qType || "Technical"}::${q.question}`;
    if (!answerText?.trim()) return;
    setFeedbackByKey((p) => ({ ...p, [key]: null }));
    setFeedbackErrors((p) => ({ ...p, [key]: "" }));
    console.log("[frontend] Submitting for feedback:", {
      transcript: answerText.slice(0, 100),
      transcriptLength: answerText.length,
      question: String(q.question || "").slice(0, 50),
    });
    setFeedbackLoading((p) => ({ ...p, [key]: true }));
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q.question,
        answer: answerText,
        type: q.qType || "Technical",
        difficulty,
        skills,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setFeedbackLoading((p) => ({ ...p, [key]: false }));
    if (!res.ok) {
      console.error("[frontend] Feedback API error:", data);
      setFeedbackErrors((p) => ({
        ...p,
        [key]: data?.detail || data?.error || "Failed to get AI feedback. Check terminal logs.",
      }));
      return;
    }
    if (data?.error) {
      console.error("[frontend] Feedback returned error payload:", data);
      setFeedbackErrors((p) => ({ ...p, [key]: data?.detail || data?.error || "Feedback failed." }));
      return;
    }
    setFeedbackByKey((p) => ({ ...p, [key]: data }));
  }

  async function saveResult(q) {
    const key = `${q.qType || "Technical"}::${q.question}`;
    const feedback = feedbackByKey[key];
    if (!feedback) return;
    setSavingByKey((p) => ({ ...p, [key]: true }));
    const score10 = Number(feedback.score || 0);
    const quality = Math.max(0, Math.min(5, Math.round(score10 / 2)));

    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId,
        roleLabel: roleId,
        difficulty,
        results: [
          {
            question: q.question,
            qType: q.qType || "Technical",
            answer: transcriptByKey[key] || "",
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
        question: q.question,
        qType: q.qType || "Technical",
        roleId,
        score: quality,
      }),
    }).catch(() => null);
    setSavingByKey((p) => ({ ...p, [key]: false }));
  }

  useEffect(() => {
    setQuestions([]);
    setErr("");
  }, [difficulty, roleId]);

  const skillChips = useMemo(() => skills.slice(0, 24), [skills]);

  if (status === "unauthenticated") {
    return (
      <main className="container">
        <div className="card">
          <h1>Resume → personalized questions</h1>
          <p className="muted">Please sign in to upload a resume and store progress.</p>
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
          <span className="badge">Personalized Interview Builder</span>
          <h1 style={{ marginTop: 8 }}>Resume</h1>
        </div>
        <div className="row">
          <a className="link" href="/practice">
            Practice
          </a>
          <a className="link" href="/dashboard">
            Dashboard
          </a>
        </div>
      </div>

      {status === "loading" ? (
        <p className="muted" style={{ marginTop: 8 }}>
          Checking your session…
        </p>
      ) : null}

      <div className="softGrid reveal revealDelay1">
        <ResumeUploader onUploaded={() => loadResumeQuestions()} disabled={disableActions} />
        <RolePicker value={roleId} onChange={setRoleId} />
        <DifficultySelector value={difficulty} onChange={setDifficulty} />
      </div>

      <div className="card reveal revealDelay2">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Generated questions</h2>
          <button className="btn" onClick={loadResumeQuestions} disabled={loading || disableActions}>
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>

        {err ? (
          <p className="muted" style={{ color: "tomato", marginTop: 10 }}>
            {err}
          </p>
        ) : null}
        {addErr ? (
          <p className="muted" style={{ color: "tomato", marginTop: 10 }}>
            {addErr}
          </p>
        ) : null}

        {source ? <p className="muted">Source: {source}</p> : null}

        {skillChips.length ? (
          <div className="row" style={{ marginTop: 10 }}>
            {skillChips.map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {(questions || []).map((q, idx) => (
            <div
              key={`${idx}-${q.question}`}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                {q.qType || "Technical"}
              </div>
              <div style={{ fontWeight: 650, lineHeight: 1.4 }}>{q.question}</div>
              <div className="row" style={{ marginTop: 10 }}>
                <button
                  className="btn btnSecondary"
                  onClick={() =>
                    setExpanded((p) => ({
                      ...p,
                      [`${q.qType || "Technical"}::${q.question}`]:
                        !p[`${q.qType || "Technical"}::${q.question}`],
                    }))
                  }
                >
                  {expanded[`${q.qType || "Technical"}::${q.question}`] ? "Hide workspace" : "Open workspace"}
                </button>
                {(() => {
                  const key = `${q.qType || "Technical"}::${q.question}`;
                  const added = addedQuestions.has(key);
                  const adding = addingQuestion === key;
                  return (
                    <button
                      className="btn btnSecondary"
                      onClick={() => addToPractice(q)}
                      disabled={added || adding}
                    >
                      {adding ? "Adding…" : added ? "Added to practice" : "Add to practice"}
                    </button>
                  );
                })()}
              </div>
              {expanded[`${q.qType || "Technical"}::${q.question}`] ? (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn btnSecondary"
                    onClick={() => loadSample(q)}
                    disabled={sampleLoading[`${q.qType || "Technical"}::${q.question}`]}
                  >
                    {sampleLoading[`${q.qType || "Technical"}::${q.question}`]
                      ? "Loading sample..."
                      : "View Sample Answer"}
                  </button>
                  {sampleAnswers[`${q.qType || "Technical"}::${q.question}`] ? (
                    <ModelAnswer
                      answer={sampleAnswers[`${q.qType || "Technical"}::${q.question}`].answer}
                      keyPoints={sampleAnswers[`${q.qType || "Technical"}::${q.question}`].keyPoints}
                    />
                  ) : null}

                  <AudioRecorder
                    onTranscript={(text) =>
                      setTranscriptByKey((p) => ({
                        ...p,
                        [`${q.qType || "Technical"}::${q.question}`]: text,
                      }))
                    }
                    onSubmitForFeedback={(text) => getFeedback(q, text)}
                    disabled={feedbackLoading[`${q.qType || "Technical"}::${q.question}`]}
                  />

                  {feedbackLoading[`${q.qType || "Technical"}::${q.question}`] ? (
                    <p className="muted">Generating AI feedback...</p>
                  ) : null}

                  {feedbackByKey[`${q.qType || "Technical"}::${q.question}`] ? (
                    <FeedbackPanel
                      feedback={feedbackByKey[`${q.qType || "Technical"}::${q.question}`]}
                      feedbackError={feedbackErrors[`${q.qType || "Technical"}::${q.question}`]}
                      originalAnswer={transcriptByKey[`${q.qType || "Technical"}::${q.question}`] || ""}
                      onSaveContinue={() => saveResult(q)}
                      onRetry={() =>
                        getFeedback(q, transcriptByKey[`${q.qType || "Technical"}::${q.question}`] || "")
                      }
                      saving={!!savingByKey[`${q.qType || "Technical"}::${q.question}`]}
                    />
                  ) : null}
                  {!feedbackByKey[`${q.qType || "Technical"}::${q.question}`] &&
                  feedbackErrors[`${q.qType || "Technical"}::${q.question}`] ? (
                    <FeedbackPanel
                      feedback={null}
                      feedbackError={feedbackErrors[`${q.qType || "Technical"}::${q.question}`]}
                      originalAnswer={transcriptByKey[`${q.qType || "Technical"}::${q.question}`] || ""}
                      onSaveContinue={() => saveResult(q)}
                      onRetry={() =>
                        getFeedback(q, transcriptByKey[`${q.qType || "Technical"}::${q.question}`] || "")
                      }
                      saving={!!savingByKey[`${q.qType || "Technical"}::${q.question}`]}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
          {!questions?.length ? <p className="muted">Upload a resume, then click Generate.</p> : null}
        </div>
      </div>
    </main>
  );
}

