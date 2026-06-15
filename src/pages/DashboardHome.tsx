import { useMemo, type ComponentType, type SVGProps } from "react";
import AiInputPanel from "../components/AiInputPanel";
import {
  ArrowRightIcon,
  GaugeIcon,
  PhoneIcon,
  ServerIcon,
  SparkIcon,
  StoreIcon,
} from "../components/icons";

type Props = {
  firstName: string;
};

export default function DashboardHome({ firstName }: Props) {
  const greeting = useMemo(() => greetingFor(new Date()), []);

  return (
    <>
      <Hero firstName={firstName} greeting={greeting} />

      <section className="home-block">
        <AiInputPanel />
      </section>

      <RecentActivity />
      <Templates />

      <p className="home-foot-note">
        Workspace preview — recent activity and projects shown here are sample
        state until project persistence ships. Your real briefs will appear in
        their place once the backend lands.
      </p>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Hero — quiet, confident, no glow, no date
 * ════════════════════════════════════════════════════════════════════════ */
function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Hero({ firstName, greeting }: { firstName: string; greeting: string }) {
  return (
    <section className="home-hero">
      <h1 className="home-hero-title">
        {greeting}, {firstName}.
      </h1>
      <p className="home-hero-sub">
        Your architecture workspace is ready. 7 projects active, 2 awaiting
        review. Open the brief below to continue.
      </p>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Meta rule — the website's signature section divider
 *   ──────────────────────  LABEL                          [RIGHT ITEM]
 * ════════════════════════════════════════════════════════════════════════ */
function MetaRule({
  label,
  rightLabel,
  rightHref,
}: {
  label: string;
  rightLabel?: string;
  rightHref?: string;
}) {
  return (
    <div className="meta-rule">
      <span className="meta-rule-line" aria-hidden="true" />
      <span className="meta-rule-text">{label}</span>
      {rightLabel ? (
        <a className="meta-rule-link" href={rightHref ?? "#"}>
          {rightLabel}
          <ArrowRightIcon size={11} />
        </a>
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Recent activity — flat list with hairline dividers, no colored chrome
 * ════════════════════════════════════════════════════════════════════════ */
type ActivityRow = {
  title: string;
  subject: string;
  time: string;
};

const ACTIVITY: ActivityRow[] = [
  {
    title: "Created architecture brief",
    subject: "Telemetry pipeline for fleet ops",
    time: "2h ago",
  },
  {
    title: "Updated architecture",
    subject: "Multi-tenant analytics SaaS",
    time: "Yesterday",
  },
  {
    title: "Exported PDF documentation",
    subject: "Mobile habit tracker — offline sync",
    time: "3 days ago",
  },
  {
    title: "Added a teammate",
    subject: "kemal@quantiliom.ai",
    time: "1 week ago",
  },
];

function RecentActivity() {
  return (
    <section className="home-block">
      <MetaRule label="Recent activity" rightLabel="View all" rightHref="#projects" />
      <ul className="recent-list">
        {ACTIVITY.map((a, i) => (
          <li key={i} className="recent-row">
            <span className="recent-index">{String(i + 1).padStart(2, "0")}</span>
            <div className="recent-body">
              <span className="recent-title">{a.title}</span>
              <span className="recent-subject">{a.subject}</span>
            </div>
            <span className="recent-time">{a.time}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Templates — clean white cards, subtle border, hover darkens border
 * ════════════════════════════════════════════════════════════════════════ */
type ThemeKey = "web" | "mobile" | "ai" | "commerce" | "internal";

type Template = {
  key: string;
  theme: ThemeKey;
  category: string;
  name: string;
  summary: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
};

const TEMPLATES: Template[] = [
  {
    key: "saas",
    theme: "web",
    category: "Web",
    name: "SaaS MVP",
    summary:
      "Multi-tenant web app with auth, billing, and analytics. Production-ready in two weeks.",
    icon: ServerIcon,
  },
  {
    key: "mobile",
    theme: "mobile",
    category: "Mobile",
    name: "Mobile app",
    summary:
      "iOS + Android with offline-first sync, weekly insight reports, and push notifications.",
    icon: PhoneIcon,
  },
  {
    key: "ai",
    theme: "ai",
    category: "AI",
    name: "AI tool",
    summary:
      "LLM orchestration, retrieval-augmented generation, and a workspace for prompt evaluation.",
    icon: SparkIcon,
  },
  {
    key: "marketplace",
    theme: "commerce",
    category: "Commerce",
    name: "Marketplace",
    summary:
      "Two-sided market with escrow, ratings, dispute resolution, and split shipping.",
    icon: StoreIcon,
  },
  {
    key: "dashboard",
    theme: "internal",
    category: "Internal",
    name: "Internal dashboard",
    summary:
      "Ops dashboard with real-time data, role-based access, and exportable reports.",
    icon: GaugeIcon,
  },
];

function Templates() {
  return (
    <section className="home-block">
      <MetaRule label="Templates" rightLabel="Browse all" rightHref="#templates" />
      <div className="tmpl-grid">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.key} template={t} />
        ))}
      </div>
    </section>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const Icon = template.icon;
  return (
    <button type="button" className={`tmpl-card tmpl-${template.theme}`}>
      <span className="tmpl-glow" aria-hidden="true" />
      <span className="tmpl-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="tmpl-category">{template.category}</span>
      <span className="tmpl-name">{template.name}</span>
      <span className="tmpl-summary">{template.summary}</span>
      <span className="tmpl-link">
        Use template
        <ArrowRightIcon size={11} />
      </span>
    </button>
  );
}
