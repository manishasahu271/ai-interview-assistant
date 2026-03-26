"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function AudioRecorder({ onTranscript, onSubmitForFeedback, disabled }) {
  const [state, setState] = useState("idle"); // idle|recording|transcribing|done
  const [err, setErr] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");

  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const rafRef = useRef(0);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ctxRef.current) ctxRef.current.close().catch(() => null);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setErr("");
    if (!navigator?.mediaDevices?.getUserMedia) {
      setErr("Microphone recording is unavailable. Use localhost with HTTPS-compatible browser permissions.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRef.current = recorder;
      chunksRef.current = [];
      setSeconds(0);
      setState("recording");

      const audioCtx = new AudioContext();
      ctxRef.current = audioCtx;
      const src = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;
      drawWave();

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= 300) stop(true); // 5 minutes max
          return next;
        });
      }, 1000);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (ctxRef.current) await ctxRef.current.close().catch(() => null);
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        await transcribe();
      };
      recorder.start();
    } catch {
      setErr("Microphone access denied. Please allow mic permissions in browser settings.");
    }
  }

  function stop(force = false) {
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.stop();
      if (force) setErr("Recording auto-stopped at 5:00 max duration.");
    }
  }

  async function transcribe() {
    setState("transcribing");
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const fd = new FormData();
      fd.append("audio", blob, "answer.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Transcription failed");
      setTranscript(data.transcript || "");
      onTranscript?.(data.transcript || "");
      setState("done");
    } catch (e) {
      setErr(e.message || "Transcription failed");
      setState("idle");
    }
  }

  function drawWave() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const c = canvas.getContext("2d");
    const data = new Uint8Array(analyser.frequencyBinCount);
    const w = canvas.width;
    const h = canvas.height;
    const bars = 32;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      c.clearRect(0, 0, w, h);
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[i] / 255;
        const bh = Math.max(4, v * h);
        c.fillStyle = "rgba(79,70,229,0.7)";
        c.fillRect(i * bw + 2, h - bh, bw - 4, bh);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function reset() {
    setState("idle");
    setTranscript("");
    setSeconds(0);
    setErr("");
  }

  const time = useMemo(() => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [seconds]);

  return (
    <div className="card" style={{ marginTop: 10 }}>
      {state === "idle" ? (
        <button className="btn" type="button" onClick={start} disabled={disabled}>
          🎙️ Record your answer
        </button>
      ) : null}

      {state === "recording" ? (
        <div>
          <div className="row" style={{ marginTop: 0 }}>
            <span style={{ color: "#ef4444", fontWeight: 700 }}>● Recording</span>
            <span className="badge">{time}</span>
            {seconds >= 270 ? <span className="muted">Auto-stop in {300 - seconds}s</span> : null}
          </div>
          <canvas ref={canvasRef} width={520} height={72} style={{ width: "100%", marginTop: 8 }} />
          <div className="row">
            <button className="btn btnSecondary" type="button" onClick={() => stop(false)}>
              Stop
            </button>
          </div>
        </div>
      ) : null}

      {state === "transcribing" ? <p className="muted">Transcribing with Whisper...</p> : null}

      {state === "done" ? (
        <div>
          <label className="label">Transcript (editable)</label>
          <textarea
            className="input"
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              onTranscript?.(e.target.value);
            }}
            rows={6}
          />
          <div className="row">
            <button className="btn btnSecondary" type="button" onClick={reset}>
              Re-record
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => onSubmitForFeedback?.(transcript)}
              disabled={!transcript.trim() || disabled}
            >
              Submit for Feedback
            </button>
          </div>
        </div>
      ) : null}

      {err ? (
        <p className="muted" style={{ color: "tomato", marginTop: 8 }}>
          {err}
        </p>
      ) : null}
    </div>
  );
}

