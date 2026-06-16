import { useEffect, useMemo, useState, type ReactNode } from "react";
import { WEBSITE_URL } from "../lib/config";

function ArrowLeftSvg() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

type Props = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  effectiveDate: string;
  intro: ReactNode;
  sections: LegalSection[];
  /** Hash of the sibling legal page, e.g. "#privacy" on the Terms page. */
  siblingHref: string;
  siblingLabel: string;
  /** Where the back link goes. Defaults to the marketing site. */
  backHref?: string;
  backLabel?: string;
};

export default function LegalLayout({
  eyebrow,
  title,
  lastUpdated,
  effectiveDate,
  intro,
  sections,
  siblingHref,
  siblingLabel,
  backHref,
  backLabel,
}: Props) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  // Scroll-spy: highlight the TOC entry for the section currently in view.
  useEffect(() => {
    if (!sections.length) return;
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 1] }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  const resolvedBackHref = backHref ?? WEBSITE_URL;
  const resolvedBackLabel = backLabel ?? "Back to home";

  const tocItems = useMemo(
    () => sections.map((s, idx) => ({ ...s, index: idx + 1 })),
    [sections]
  );

  // We deliberately do NOT touch the URL hash here — the dashboard uses
  // hash-based routing (#terms, #privacy, ...) so changing the hash to a
  // section ID would kick the app back to the "home" route. Just scroll.
  function handleTocClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }

  return (
    <div className="legal-page" role="main">
      <header className="legal-topbar">
        <a
          className="legal-back-link"
          href={resolvedBackHref}
          aria-label={resolvedBackLabel}
        >
          <ArrowLeftSvg />
          <span>{resolvedBackLabel}</span>
        </a>
        <div className="legal-brand">
          <span className="legal-brand-mark" aria-hidden="true">
            Q
          </span>
          <span className="legal-brand-text">Quantiliom AI</span>
        </div>
      </header>

      <div className="legal-shell">
        <article className="legal-article">
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1 className="legal-title">{title}</h1>
          <p className="legal-meta">
            <span>Effective: {effectiveDate}</span>
            <span aria-hidden="true">·</span>
            <span>Last updated: {lastUpdated}</span>
          </p>

          <div className="legal-intro">{intro}</div>

          {sections.map((s, idx) => (
            <section key={s.id} id={s.id} className="legal-section">
              <h2 className="legal-section-title">
                <span className="legal-section-index">{idx + 1}.</span>
                {s.title}
              </h2>
              <div className="legal-section-body">{s.body}</div>
            </section>
          ))}

          <footer className="legal-footer">
            <p>
              Questions about this document? Email{" "}
              <a href="mailto:legal@quantiliom.ai">legal@quantiliom.ai</a>. For
              privacy-specific requests use{" "}
              <a href="mailto:privacy@quantiliom.ai">privacy@quantiliom.ai</a>.
            </p>
            <p className="legal-footer-cross">
              See also: <a href={siblingHref}>{siblingLabel}</a>.
            </p>
          </footer>
        </article>

        <aside className="legal-toc" aria-label="On this page">
          <p className="legal-toc-label">On this page</p>
          <ol className="legal-toc-list">
            {tocItems.map((s) => (
              <li key={s.id} className={activeId === s.id ? "is-active" : ""}>
                <a href={`#${s.id}`} onClick={(e) => handleTocClick(e, s.id)}>
                  <span className="legal-toc-index">{String(s.index).padStart(2, "0")}</span>
                  <span className="legal-toc-text">{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
