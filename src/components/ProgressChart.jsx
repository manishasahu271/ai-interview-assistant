"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function ProgressChart({ trend }) {
  const data = Array.isArray(trend) ? trend : [];
  return (
    <div className="card">
      <div className="sectionHeader">
        <h2>Progress (last 30 days)</h2>
        <span className="badge">Trends</span>
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.12)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="avgScore" stroke="#7c3aed" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ width: "100%", height: 220, marginTop: 16 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.12)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sessions" fill="rgba(34,211,238,0.45)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

