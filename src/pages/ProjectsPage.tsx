import { useMemo, useState } from "react";
import type { Route } from "../lib/router";
import {
  ArrowRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  FolderIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
} from "../components/icons";

type Status = "Draft" | "In review" | "Ready" | "Active" | "Archived";

type Project = {
  id: string;
  title: string;
  description: string;
  status: Status;
  tech: string[];
  updated: string;
  revisions: number;
  starred?: boolean;
};

const PROJECTS: Project[] = [
  {
    id: "p1",
    title: "Telemetry pipeline for fleet ops",
    description:
      "Real-time vehicle telemetry aggregation with sub-second alerting and predictive maintenance signals across 2,000+ vehicles.",
    status: "In review",
    tech: ["Node.js", "Kafka", "Postgres", "TimescaleDB"],
    updated: "2h ago",
    revisions: 3,
    starred: true,
  },
  {
    id: "p2",
    title: "Multi-tenant analytics SaaS",
    description:
      "Customer-facing analytics dashboards with row-level isolation, custom branding, and a self-serve metrics API.",
    status: "Draft",
    tech: ["Next.js", "ClickHouse", "Stripe"],
    updated: "Yesterday",
    revisions: 7,
  },
  {
    id: "p3",
    title: "Mobile habit tracker — offline sync",
    description:
      "iOS + Android with conflict-free offline sync, weekly insight reports, and a streak-based engagement loop.",
    status: "Ready",
    tech: ["React Native", "SQLite", "Supabase"],
    updated: "3 days ago",
    revisions: 12,
  },
  {
    id: "p4",
    title: "E-commerce checkout redesign",
    description:
      "One-page checkout with split shipping addresses, Apple Pay / Google Pay, and inventory holds at session start.",
    status: "Active",
    tech: ["Remix", "Shopify", "Cloudflare Workers"],
    updated: "1 week ago",
    revisions: 5,
    starred: true,
  },
  {
    id: "p5",
    title: "AI customer support assistant",
    description:
      "Triage tickets, draft responses, and route escalations across Slack, email, and Zendesk with audit trails.",
    status: "Draft",
    tech: ["LangChain", "OpenAI", "Redis"],
    updated: "4 days ago",
    revisions: 2,
  },
  {
    id: "p6",
    title: "Internal HR portal",
    description:
      "Employee directory, PTO requests, and structured onboarding flows scoped to a 200-person organization.",
    status: "Archived",
    tech: ["Django", "Postgres", "Tailwind"],
    updated: "2 weeks ago",
    revisions: 14,
  },
];

type Filter = "all" | "active" | "drafts" | "archived";

const FILTERS: { value: Filter; label: string; count: (ps: Project[]) => number }[] = [
  { value: "all", label: "All", count: (ps) => ps.length },
  {
    value: "active",
    label: "Active",
    count: (ps) =>
      ps.filter((p) => p.status === "Active" || p.status === "In review" || p.status === "Ready").length,
  },
  { value: "drafts", label: "Drafts", count: (ps) => ps.filter((p) => p.status === "Draft").length },
  { value: "archived", label: "Archived", count: (ps) => ps.filter((p) => p.status === "Archived").length },
];

function statusPillClass(status: Status): string {
  switch (status) {
    case "In review":
      return "pill review-pill";
    case "Ready":
      return "pill ready-pill";
    case "Active":
      return "pill active-pill";
    case "Archived":
      return "pill archived-pill";
    default:
      return "pill draft-pill";
  }
}

function statusKey(status: Status): string {
  switch (status) {
    case "In review":
      return "review";
    case "Ready":
      return "ready";
    case "Active":
      return "active";
    case "Archived":
      return "archived";
    default:
      return "draft";
  }
}

// Normalise a tech name into a stable data-attribute key. e.g.
// "Node.js" → "nodejs", "React Native" → "react-native". Used by CSS
// to pick up the brand color for that tech.
function techKey(t: string): string {
  return t
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Props = {
  onNavigate: (r: Route) => void;
};

export default function ProjectsPage({ onNavigate }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = PROJECTS;
    if (filter === "active") {
      list = list.filter(
        (p) => p.status === "Active" || p.status === "In review" || p.status === "Ready"
      );
    } else if (filter === "drafts") {
      list = list.filter((p) => p.status === "Draft");
    } else if (filter === "archived") {
      list = list.filter((p) => p.status === "Archived");
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tech.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [filter, query]);

  return (
    <div className="page-enter">
      <section className="hero" aria-label="Projects">
        <span className="eyebrow">Projects</span>
        <h1 className="hero-title">Your architecture workspace.</h1>
        <p className="hero-sub">
          Every project you start with Quantiliom — drafts, reviews, and the
          architectures you&rsquo;ve shipped — all in one place. Open one to
          continue, or sketch a new brief from scratch.
        </p>
      </section>

      <div className="proj-toolbar">
        <div className="proj-search">
          <SearchIcon size={16} className="proj-search-icon" />
          <input
            type="text"
            placeholder="Find a project, stack, or keyword…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />
        </div>
        <div className="proj-filters" role="tablist" aria-label="Filter projects">
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                className={"proj-filter" + (active ? " is-active" : "")}
                onClick={() => setFilter(f.value)}
              >
                <span>{f.label}</span>
                <span className="proj-filter-count">{f.count(PROJECTS)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="proj-grid">
        <NewProjectCard onClick={() => onNavigate("home")} />
        {filtered.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {filtered.length === 0 ? <EmptyResults onReset={() => { setFilter("all"); setQuery(""); }} /> : null}
      </div>
    </div>
  );
}

function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="proj-card proj-card-new" onClick={onClick}>
      <div className="proj-new-mark" aria-hidden="true">
        <PlusIcon size={20} />
      </div>
      <div className="proj-new-title">Start a new architecture</div>
      <div className="proj-new-sub">
        Describe your idea. Quantiliom proposes modules, stack, and a plan.
      </div>
      <div className="proj-new-cta">
        Begin
        <ArrowRightIcon size={12} />
      </div>
    </button>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article
      className="proj-card"
      data-status={statusKey(project.status)}
      aria-label={project.title}
    >
      <span className="proj-card-strip" aria-hidden="true" />
      <header className="proj-card-head">
        <div className="proj-card-mark" aria-hidden="true">
          <FolderIcon size={16} />
        </div>
        <div className="proj-card-head-right">
          {project.starred ? (
            <span
              className="proj-card-star"
              title="Starred"
              aria-label="Starred project"
            >
              <StarIcon size={13} />
            </span>
          ) : null}
          <span className={statusPillClass(project.status)}>
            {project.status}
          </span>
        </div>
      </header>

      <div className="proj-card-body">
        <h3 className="proj-card-title">{project.title}</h3>
        <p className="proj-card-desc">{project.description}</p>
      </div>

      <div className="proj-tech">
        {project.tech.map((t) => (
          <span key={t} className="proj-tech-chip" data-tech={techKey(t)}>
            <span className="proj-tech-dot" aria-hidden="true" />
            {t}
          </span>
        ))}
      </div>

      <footer className="proj-card-foot">
        <div className="proj-card-meta">
          <ClockIcon size={12} />
          <span>{project.updated}</span>
          <span className="proj-meta-sep" aria-hidden="true">
            ·
          </span>
          <span>
            {project.revisions} revision{project.revisions === 1 ? "" : "s"}
          </span>
        </div>
        <span className="proj-card-open" aria-hidden="true">
          Open
          <ExternalLinkIcon size={11} />
        </span>
      </footer>
    </article>
  );
}

function EmptyResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="proj-empty">
      <div className="proj-empty-mark" aria-hidden="true">
        <SearchIcon size={18} />
      </div>
      <div className="proj-empty-title">No projects match this view</div>
      <p className="proj-empty-sub">Try clearing your search and filter to see everything.</p>
      <button type="button" className="proj-empty-reset" onClick={onReset}>
        Reset filters
      </button>
    </div>
  );
}
