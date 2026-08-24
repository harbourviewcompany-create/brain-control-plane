"use client";

import Link from "next/link";

const primary = [
  { href: "/perception", code: "IN", label: "Perception" },
  { href: "/beliefs", code: "BL", label: "Beliefs" },
  { href: "/predictions", code: "PX", label: "Predictions" },
  { href: "/organism", code: "OR", label: "Organism" },
];

const more = [
  { href: "/curiosity", label: "Curiosity" },
  { href: "/contradictions", label: "Contradictions" },
  { href: "/approvals", label: "Approvals" },
  { href: "/sources", label: "Sources" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/health", label: "Runtime health" },
];

export function ObservatoryDock() {
  return (
    <>
      <nav className="observatory-dock observatory-dock--desktop" aria-label="Operator surfaces">
        <div className="observatory-dock__mark">BO</div>
        {primary.map((item) => (
          <Link key={item.href} href={item.href} title={item.label}>
            <span>{item.code}</span>
            <em>{item.label}</em>
          </Link>
        ))}
        <details>
          <summary>•••</summary>
          <div className="observatory-dock__menu">
            {more.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </div>
        </details>
      </nav>

      <nav className="observatory-dock observatory-dock--mobile" aria-label="Operator surfaces">
        {primary.map((item) => (
          <Link key={item.href} href={item.href}>
            <span>{item.code}</span>
            <em>{item.label}</em>
          </Link>
        ))}
        <details>
          <summary><span>•••</span><em>More</em></summary>
          <div className="observatory-dock__menu">
            {more.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </div>
        </details>
      </nav>
    </>
  );
}
