"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Warning, ArrowClockwise, House } from "@phosphor-icons/react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Pipeline runtime exception:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-root)",
        fontFamily: "var(--font-mono)",
        padding: 24,
      }}
    >
      <div
        style={{
          border: "1px solid var(--accent)",
          padding: "32px 40px",
          backgroundColor: "var(--bg-surface)",
          maxWidth: 540,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-mono-label" style={{ color: "var(--accent)", fontSize: 11 }}>
            [ SYSTEM EXCEPTION / WORKER FAULT ]
          </span>
          <span className="badge" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
            ERROR
          </span>
        </div>

        <div>
          <h2 className="text-display" style={{ fontSize: "1.6rem", color: "var(--fg-primary)", marginBottom: 8 }}>
            PIPELINE EXECUTION INTERRUPTED.
          </h2>
          <p className="text-mono-label" style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
            {error.message || "An unexpected telemetry serialization fault occurred during catalog parsing."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button onClick={() => reset()} className="btn-primary" style={{ padding: "8px 16px", fontSize: 11 }}>
            <ArrowClockwise size={14} weight="bold" />
            RETRY WORKER EXECUTION
          </button>
          <Link href="/" className="btn-ghost" style={{ padding: "8px 16px", fontSize: 11 }}>
            <House size={14} />
            RETURN TO ROOT
          </Link>
        </div>
      </div>
    </div>
  );
}
