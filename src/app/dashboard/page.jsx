"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ProgressChart from "@/components/ProgressChart";
import WeakSpotCard from "@/components/WeakSpotCard";
import BenchmarkBadge from "@/components/BenchmarkBadge";

function CountUp({ value, suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const duration = 700;
    const start = performance.now();
    let raf = 0;

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <>{display.toFixed(decimals).replace(/\.0+$/, "")}{suffix}</>
  );
}

export default function DashboardPage() {
  const { status } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    const res = await fetch("/api/analytics");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErr(json?.error || "Failed to load analytics.");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

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
          <h1>Dashboard</h1>
          <p className="muted">Sign in to view your progress analytics.</p>
          <div className="row">
            <a className="btn" href="/auth/signin">
              Sign in
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
          <span className="badge">Performance Analytics</span>
          <h1 style={{ marginTop: 8 }}>Dashboard</h1>
        </div>
        <div className="row">
          <a className="link" href="/resume">
            Resume
          </a>
          <a className="link" href="/practice">
            Practice
          </a>
        </div>
      </div>

      <div className="card row reveal revealDelay1" style={{ marginTop: 0 }}>
        <button className="btn btnSecondary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        {data?.totals ? (
          <span className="muted">
            Sessions (30d): {data.totals.sessionsLast30d} · Due cards: {data.totals.dueCards} · Avg:{" "}
            {data.totals.overallAvgScore}/10
          </span>
        ) : null}
      </div>

      {data?.totals ? (
        <div className="reveal revealDelay2" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div className="card">
            <div className="badge">Sessions (30d)</div>
            <h2 style={{ marginTop: 8 }}><CountUp value={data.totals.sessionsLast30d} /></h2>
          </div>
          <div className="card">
            <div className="badge">Due Cards</div>
            <h2 style={{ marginTop: 8 }}><CountUp value={data.totals.dueCards} /></h2>
          </div>
          <div className="card">
            <div className="badge">Average Score</div>
            <h2 style={{ marginTop: 8 }}><CountUp value={data.totals.overallAvgScore} decimals={2} />/10</h2>
          </div>
          <div className="card">
            <div className="badge">Benchmark</div>
            <h2 style={{ marginTop: 8 }}><CountUp value={data?.benchmarkPercentile ?? 0} suffix="%" /></h2>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="card">
          <p className="muted" style={{ color: "tomato" }}>
            {err}
          </p>
        </div>
      ) : null}

      <div className="softGrid reveal revealDelay3">
        <ProgressChart trend={data?.trend || []} />
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <WeakSpotCard weakSpots={data?.weakSpots || []} />
          <BenchmarkBadge percentile={data?.benchmarkPercentile} />
        </div>
      </div>
    </main>
  );
}

