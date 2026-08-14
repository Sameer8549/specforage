"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, List, X, Play } from "@phosphor-icons/react";

const NAV_ITEMS = [
  { label: "Pipeline", href: "/pipeline" },
  { label: "Records", href: "/records" },
  { label: "Taxonomy", href: "/taxonomy" },
  { label: "Provenance", href: "/provenance" },
  { label: "Vocabulary", href: "/vocabulary" },
  { label: "Adjudication", href: "/adjudication" },
  { label: "Descriptions", href: "/descriptions" },
  { label: "Validate", href: "/validate" },
  { label: "Batch", href: "/batch" },
  { label: "Audit", href: "/audit" },
  { label: "Methodology", href: "/methodology" },
  { label: "Settings", href: "/settings" },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav
        className="nav-fixed"
        aria-label="Primary navigation"
        style={{
          height: 52,
          backgroundColor: "#0D0E11",
          borderBottom: "1px solid var(--border)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: "0 auto",
            padding: "0 24px",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
            gap: 24,
          }}
        >
          {/* Wordmark */}
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--fg-primary)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <span style={{ color: "var(--accent)" }}>SF</span>
            <span style={{ color: "var(--fg-primary)" }}>SpecForge</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div
            className="desktop-nav-links"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              height: "100%",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12.5,
                    color: isActive ? "var(--fg-primary)" : "var(--fg-secondary)",
                    textDecoration: "none",
                    padding: "0 10px",
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                    whiteSpace: "nowrap",
                    transition: "color 150ms ease, background-color 150ms ease",
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = "var(--fg-primary)";
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = "var(--fg-secondary)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {item.label}
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 8,
                        right: 8,
                        height: 2,
                        backgroundColor: "var(--accent)",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Action */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <Link
              href="/pipeline"
              className="btn-primary"
              style={{
                padding: "7px 14px",
                fontSize: 11,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Run Pipeline
              <ArrowRight size={12} weight="bold" />
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="mobile-toggle"
              aria-label="Toggle navigation menu"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--fg-primary)",
                padding: 6,
                cursor: "pointer",
                display: "none",
              }}
            >
              {mobileOpen ? <X size={18} /> : <List size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div
            style={{
              position: "fixed",
              top: 52,
              left: 0,
              right: 0,
              backgroundColor: "var(--bg-root)",
              borderBottom: "1px solid var(--border)",
              padding: "16px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              zIndex: 99,
              maxHeight: "calc(100dvh - 52px)",
              overflowY: "auto",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    color: isActive ? "var(--accent)" : "var(--fg-primary)",
                    textDecoration: "none",
                    padding: "10px 12px",
                    borderLeft: `2px solid ${isActive ? "var(--accent)" : "var(--border-dim)"}`,
                    backgroundColor: isActive ? "var(--bg-surface)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <style jsx global>{`
        @media (max-width: 1180px) {
          .desktop-nav-links {
            display: none !important;
          }
          .mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
