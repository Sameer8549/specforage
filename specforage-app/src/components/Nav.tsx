"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";

const NAV_ITEMS = [
  { label: "PIPELINE",     href: "/pipeline"     },
  { label: "RECORDS",      href: "/records"      },
  { label: "TAXONOMY",     href: "/taxonomy"     },
  { label: "PROVENANCE",   href: "/provenance"   },
  { label: "VOCABULARY",   href: "/vocabulary"   },
  { label: "ADJUDICATION", href: "/adjudication" },
  { label: "DESCRIPTIONS", href: "/descriptions" },
  { label: "BATCH",        href: "/batch"        },
  { label: "AUDIT",        href: "/audit"        },
  { label: "SETTINGS",     href: "/settings"     },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav-fixed" aria-label="Primary navigation">
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 16px",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--fg-primary)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
            [SF]
          </span>{" "}
          SPECFORGE
        </Link>

        {/* Nav links */}
        <div className="nav-links" style={{ display: "flex", alignItems: "center" }}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--fg-primary)" : "var(--fg-secondary)",
                  textDecoration: "none",
                  padding: "0 6px",
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  borderBottom: isActive
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  transition: "color 150ms ease, border-color 150ms ease",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Primary CTA */}
        <Link
          href="/pipeline"
          className="btn-primary"
          style={{ padding: "8px 12px", fontSize: 10 }}
        >
          OPEN PIPELINE
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>
    </nav>
  );
}
