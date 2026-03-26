"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export default function ResumeUploader({ onUploaded, disabled }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback(
    async (accepted) => {
      const file = accepted?.[0];
      if (!file) return;
      setBusy(true);
      setStatus("Uploading…");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) {
        setStatus(data?.error || "Upload failed.");
        return;
      }
      setStatus("Parsed successfully.");
      onUploaded?.(data.resume);
    },
    [onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: busy || !!disabled,
  });

  return (
    <div className="card">
      <h2 style={{ marginBottom: 8 }}>Upload resume (PDF)</h2>
      <div
        {...getRootProps()}
        style={{
          border: "1px dashed var(--border)",
          borderRadius: 14,
          padding: 18,
          cursor: busy ? "not-allowed" : "pointer",
          background: isDragActive ? "rgba(59,130,246,0.12)" : "transparent",
        }}
      >
        <input {...getInputProps()} />
        <p className="muted">
          {isDragActive ? "Drop your PDF here…" : "Drag & drop a PDF, or click to select."}
        </p>
      </div>
      {status ? <p className="muted" style={{ marginTop: 10 }}>{status}</p> : null}
    </div>
  );
}

