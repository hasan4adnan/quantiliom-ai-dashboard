import {
  useCallback,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import type { Route } from "../lib/router";
import {
  BellIcon,
  CheckIcon,
  GaugeIcon,
  ShieldCheckIcon,
  SparkIcon,
} from "../components/icons";
import {
  DEFAULTS,
  useSettings,
  type ArchStyle,
  type CodeStyle,
  type DateFormat,
  type Density,
  type DetailLevel,
  type Language,
  type ResponseLength,
  type Settings,
  type TimezoneMode,
  type WeekStart,
} from "../lib/settings";

type Props = { onNavigate: (r: Route) => void };

type SectionId =
  | "appearance"
  | "language"
  | "ai"
  | "notifications"
  | "privacy"
  | "workspace";

const SECTIONS: Array<{
  id: SectionId;
  label: string;
  icon: (p: SVGProps<SVGSVGElement> & { size?: number }) => React.ReactElement;
  sub: string;
}> = [
  { id: "appearance", label: "Appearance", icon: PaintIcon, sub: "Layout density" },
  { id: "language", label: "Language & region", icon: GlobeIcon, sub: "UI language, dates, time zone" },
  { id: "ai", label: "AI assistant", icon: SparkIcon, sub: "How replies are written" },
  { id: "notifications", label: "Notifications", icon: BellIcon, sub: "What hits your inbox" },
  { id: "privacy", label: "Privacy & data", icon: ShieldCheckIcon, sub: "Telemetry, retention" },
  { id: "workspace", label: "Workspace", icon: GaugeIcon, sub: "Sidebar, autosave, defaults" },
];

export default function SettingsPage({ onNavigate }: Props) {
  const { settings, update, reset } = useSettings();
  const [section, setSection] = useState<SectionId>("appearance");
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const setIn = useCallback(
    <K extends keyof Settings>(group: K, partial: Partial<Settings[K]>) => {
      // Auto-save: persist immediately on every change.
      update({
        ...settings,
        [group]: { ...settings[group], ...partial },
      });
    },
    [settings, update]
  );

  function handleResetAll() {
    const ok = window.confirm(
      "Reset every setting to its default? Your account info is not touched."
    );
    if (!ok) return;
    reset();
    flashToast("Settings reset to defaults");
  }

  function handleResetSection() {
    const key: keyof Settings = section;
    update({ ...settings, [key]: DEFAULTS[key] });
    flashToast("Section reset to defaults");
  }

  return (
    <div className="page-enter settings-page">
      <section className="hero" aria-label="Settings">
        <span className="eyebrow">Settings</span>
        <h1 className="hero-title">Make Quantiliom yours.</h1>
        <p className="hero-sub">
          Tune how the dashboard looks, how the AI replies, and what we send to
          your inbox. Changes are saved locally on this device &mdash; your
          identity, plan, and onboarding answers live in{" "}
          <button
            type="button"
            className="link-inline"
            onClick={() => onNavigate("account")}
          >
            Account
          </button>
          .
        </p>
      </section>

      <div className="settings-shell">
        <aside className="settings-rail" aria-label="Settings sections">
          <div className="settings-rail-label">Preferences</div>
          <div className="settings-rail-list" role="tablist">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = s.id === section;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={"settings-rail-btn" + (active ? " is-active" : "")}
                  onClick={() => setSection(s.id)}
                >
                  <Icon className="rail-icon" size={15} />
                  <span className="rail-text">
                    <span className="rail-label">{s.label}</span>
                    <span className="rail-sub">{s.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="settings-rail-foot">
            <button
              type="button"
              className="settings-rail-link"
              onClick={handleResetAll}
            >
              Reset everything to defaults
            </button>
          </div>
        </aside>

        <div className="settings-content" role="tabpanel">
          {section === "appearance" && (
            <AppearancePanel
              value={settings.appearance}
              onChange={(p) => setIn("appearance", p)}
              onReset={handleResetSection}
            />
          )}
          {section === "language" && (
            <LanguagePanel
              value={settings.language}
              onChange={(p) => setIn("language", p)}
              onReset={handleResetSection}
            />
          )}
          {section === "ai" && (
            <AiPanel
              value={settings.ai}
              onChange={(p) => setIn("ai", p)}
              onReset={handleResetSection}
            />
          )}
          {section === "notifications" && (
            <NotificationsPanel
              value={settings.notifications}
              onChange={(p) => setIn("notifications", p)}
              onReset={handleResetSection}
            />
          )}
          {section === "privacy" && (
            <PrivacyPanel
              value={settings.privacy}
              onChange={(p) => setIn("privacy", p)}
              onReset={handleResetSection}
              onOpenPolicy={() => onNavigate("privacy")}
            />
          )}
          {section === "workspace" && (
            <WorkspacePanel
              value={settings.workspace}
              onChange={(p) => setIn("workspace", p)}
              onReset={handleResetSection}
            />
          )}
        </div>
      </div>

      {toast ? (
        <div className="settings-toast" role="status" aria-live="polite">
          <CheckIcon size={14} />
          <span>{toast}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Section frame
 * ──────────────────────────────────────────────────────────────────── */
function SectionCard({
  title,
  description,
  onReset,
  badge,
  children,
}: {
  title: string;
  description: string;
  onReset?: () => void;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="settings-section">
      <header className="settings-section-head">
        <div>
          <h2>
            {title}
            {badge ? <span className="settings-head-badge">{badge}</span> : null}
          </h2>
          <p>{description}</p>
        </div>
        {onReset ? (
          <button
            type="button"
            className="settings-section-reset"
            onClick={onReset}
          >
            Reset section
          </button>
        ) : null}
      </header>
      <div className="settings-rows">{children}</div>
    </section>
  );
}

function Row({
  label,
  description,
  control,
  badge,
  stacked,
}: {
  label: string;
  description?: ReactNode;
  control: ReactNode;
  badge?: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div className={"settings-row" + (stacked ? " is-stacked" : "")}>
      <div className="settings-row-info">
        <div className="settings-row-label">
          {label}
          {badge ? <span className="settings-pill">{badge}</span> : null}
        </div>
        {description ? (
          <div className="settings-row-desc">{description}</div>
        ) : null}
      </div>
      <div className="settings-row-control">{control}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Appearance
 * ──────────────────────────────────────────────────────────────────── */
function AppearancePanel({
  value,
  onChange,
  onReset,
}: {
  value: Settings["appearance"];
  onChange: (p: Partial<Settings["appearance"]>) => void;
  onReset: () => void;
}) {
  return (
    <SectionCard
      title="Appearance"
      description="Control how dense the dashboard layout feels."
      onReset={onReset}
    >
      <Row
        label="Density"
        description="More breathing room, or pack more on screen."
        badge={<span className="settings-pill is-preview">Preview</span>}
        control={
          <Segmented<Density>
            value={value.density}
            options={[
              { id: "cozy", label: "Cozy" },
              { id: "compact", label: "Compact" },
            ]}
            onChange={(density) => onChange({ density })}
          />
        }
      />
    </SectionCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Language & region
 * ──────────────────────────────────────────────────────────────────── */
function LanguagePanel({
  value,
  onChange,
  onReset,
}: {
  value: Settings["language"];
  onChange: (p: Partial<Settings["language"]>) => void;
  onReset: () => void;
}) {
  const detectedTz =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return (
    <SectionCard
      title="Language & region"
      description="How dates, times, and the interface read for you."
      onReset={onReset}
    >
      <Row
        label="Interface language"
        description="What the menus, buttons, and labels are written in."
        badge={<span className="settings-pill is-preview">Preview</span>}
        control={
          <Select<Language>
            value={value.uiLanguage}
            options={[
              { id: "en", label: "English" },
              { id: "tr", label: "Türkçe" },
            ]}
            onChange={(uiLanguage) => onChange({ uiLanguage })}
          />
        }
      />

      <Row
        label="Date format"
        description="Used when dates appear next to projects, invoices, and activity."
        control={
          <Select<DateFormat>
            value={value.dateFormat}
            options={[
              { id: "auto", label: "Auto (matches region)" },
              { id: "ymd", label: "2026-06-17" },
              { id: "mdy", label: "06/17/2026" },
              { id: "dmy", label: "17/06/2026" },
            ]}
            onChange={(dateFormat) => onChange({ dateFormat })}
          />
        }
      />

      <Row
        label="Week starts on"
        description="Affects calendars and date pickers."
        control={
          <Select<WeekStart>
            value={value.weekStart}
            options={[
              { id: "auto", label: "Auto" },
              { id: "sun", label: "Sunday" },
              { id: "mon", label: "Monday" },
            ]}
            onChange={(weekStart) => onChange({ weekStart })}
          />
        }
      />

      <Row
        label="Time zone"
        description={
          value.timezone === "auto"
            ? `Auto-detected: ${detectedTz}`
            : "Coordinated Universal Time (UTC) is used everywhere."
        }
        control={
          <Select<TimezoneMode>
            value={value.timezone}
            options={[
              { id: "auto", label: "Auto-detect" },
              { id: "utc", label: "Always UTC" },
            ]}
            onChange={(timezone) => onChange({ timezone })}
          />
        }
      />
    </SectionCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * AI assistant
 * ──────────────────────────────────────────────────────────────────── */
function AiPanel({
  value,
  onChange,
  onReset,
}: {
  value: Settings["ai"];
  onChange: (p: Partial<Settings["ai"]>) => void;
  onReset: () => void;
}) {
  return (
    <SectionCard
      title="AI assistant"
      description="Defaults for new conversations and architectures. You can override any of these per-project."
      onReset={onReset}
    >
      <Row
        label="Default detail level"
        description="Quantiliom tailors questions and explanations to this depth."
        control={
          <Segmented<DetailLevel>
            value={value.detailLevel}
            options={[
              { id: "simple", label: "Simple" },
              { id: "balanced", label: "Balanced" },
              { id: "technical", label: "Technical" },
            ]}
            onChange={(detailLevel) => onChange({ detailLevel })}
          />
        }
      />

      <Row
        label="Response length"
        description="How much the assistant writes by default."
        control={
          <Segmented<ResponseLength>
            value={value.responseLength}
            options={[
              { id: "concise", label: "Concise" },
              { id: "balanced", label: "Balanced" },
              { id: "detailed", label: "Detailed" },
            ]}
            onChange={(responseLength) => onChange({ responseLength })}
          />
        }
      />

      <Row
        label="Code comments"
        description="How heavily generated code is commented."
        control={
          <Segmented<CodeStyle>
            value={value.codeStyle}
            options={[
              { id: "minimal", label: "Minimal" },
              { id: "standard", label: "Standard" },
              { id: "explanatory", label: "Explanatory" },
            ]}
            onChange={(codeStyle) => onChange({ codeStyle })}
          />
        }
      />

      <Row
        label="Default architecture style"
        description="The pattern Quantiliom proposes first when starting a new brief."
        control={
          <Select<ArchStyle>
            value={value.defaultArchStyle}
            options={[
              { id: "modular_monolith", label: "Modular monolith" },
              { id: "microservices", label: "Microservices" },
              { id: "serverless", label: "Serverless" },
              { id: "ai_first", label: "AI-first / agentic" },
            ]}
            onChange={(defaultArchStyle) => onChange({ defaultArchStyle })}
          />
        }
      />

      <Row
        label="Ask before generating code"
        description="Pause for confirmation before producing implementation code blocks."
        control={
          <Toggle
            checked={value.askBeforeGeneratingCode}
            onChange={(askBeforeGeneratingCode) =>
              onChange({ askBeforeGeneratingCode })
            }
          />
        }
      />

      <Row
        label="Stream responses"
        description="Show text as it's generated instead of waiting for the full reply."
        control={
          <Toggle
            checked={value.streamResponses}
            onChange={(streamResponses) => onChange({ streamResponses })}
          />
        }
      />
    </SectionCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Notifications
 * ──────────────────────────────────────────────────────────────────── */
function NotificationsPanel({
  value,
  onChange,
  onReset,
}: {
  value: Settings["notifications"];
  onChange: (p: Partial<Settings["notifications"]>) => void;
  onReset: () => void;
}) {
  return (
    <SectionCard
      title="Notifications"
      description="Pick what we actually send you. Security alerts are always on."
      onReset={onReset}
    >
      <div className="settings-row-group-label">Email</div>

      <Row
        label="Security alerts"
        description="Sign-ins from new devices, password resets, account changes."
        control={<Toggle checked disabled onChange={() => undefined} />}
      />
      <Row
        label="Product updates"
        description="New features and meaningful improvements — a couple of emails a month."
        control={
          <Toggle
            checked={value.productUpdates}
            onChange={(productUpdates) => onChange({ productUpdates })}
          />
        }
      />
      <Row
        label="Billing"
        description="Receipts, upcoming renewals, failed payments."
        control={
          <Toggle
            checked={value.billing}
            onChange={(billing) => onChange({ billing })}
          />
        }
      />
      <Row
        label="Weekly project summary"
        description="A Monday digest of what changed in your projects last week."
        control={
          <Toggle
            checked={value.weeklySummary}
            onChange={(weeklySummary) => onChange({ weeklySummary })}
          />
        }
      />
      <Row
        label="Marketing"
        description="Customer stories, webinars, the occasional launch announcement."
        control={
          <Toggle
            checked={value.marketing}
            onChange={(marketing) => onChange({ marketing })}
          />
        }
      />

      <div className="settings-row-group-label">In-app</div>

      <Row
        label="In-app notifications"
        description="Show the bell badge when something needs attention."
        control={
          <Toggle
            checked={value.inApp}
            onChange={(inApp) => onChange({ inApp })}
          />
        }
      />
      <Row
        label="Sounds"
        description="Play a subtle chime when a long-running task finishes."
        control={
          <Toggle
            checked={value.inAppSounds}
            onChange={(inAppSounds) => onChange({ inAppSounds })}
          />
        }
      />
    </SectionCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Privacy & data
 * ──────────────────────────────────────────────────────────────────── */
function PrivacyPanel({
  value,
  onChange,
  onReset,
  onOpenPolicy,
}: {
  value: Settings["privacy"];
  onChange: (p: Partial<Settings["privacy"]>) => void;
  onReset: () => void;
  onOpenPolicy: () => void;
}) {
  return (
    <SectionCard
      title="Privacy & data"
      description="Mirror the controls we promise in our Privacy Policy. Defaults reflect our public commitments."
      onReset={onReset}
    >
      <Row
        label="Use my prompts to improve Quantiliom"
        description={
          <>
            Off by default. When off, your prompts and generated architectures
            are never used to train or fine-tune the underlying models. See our{" "}
            <button
              type="button"
              className="link-inline"
              onClick={onOpenPolicy}
            >
              Privacy Policy
            </button>
            .
          </>
        }
        control={
          <Toggle
            checked={value.improveModelsFromMyPrompts}
            onChange={(improveModelsFromMyPrompts) =>
              onChange({ improveModelsFromMyPrompts })
            }
          />
        }
      />
      <Row
        label="Product telemetry"
        description="Anonymous interaction events that help us spot bugs and dead-ends. Never includes prompt content."
        control={
          <Toggle
            checked={value.productTelemetry}
            onChange={(productTelemetry) => onChange({ productTelemetry })}
          />
        }
      />
      <Row
        label="Share diagnostics when I open a support ticket"
        description="Automatically attach session diagnostics (recent errors, browser info) when you submit a support request."
        control={
          <Toggle
            checked={value.shareDiagnosticsWithSupport}
            onChange={(shareDiagnosticsWithSupport) =>
              onChange({ shareDiagnosticsWithSupport })
            }
          />
        }
      />
      <Row
        label="Keep my search history"
        description="When off, your in-app search queries are forgotten the moment you close the tab."
        control={
          <Toggle
            checked={value.retainSearchHistory}
            onChange={(retainSearchHistory) =>
              onChange({ retainSearchHistory })
            }
          />
        }
      />
    </SectionCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Workspace
 * ──────────────────────────────────────────────────────────────────── */
function WorkspacePanel({
  value,
  onChange,
  onReset,
}: {
  value: Settings["workspace"];
  onChange: (p: Partial<Settings["workspace"]>) => void;
  onReset: () => void;
}) {
  return (
    <SectionCard
      title="Workspace"
      description="Behavior of the sidebar, project defaults, and autosave."
      onReset={onReset}
    >
      <Row
        label="Sidebar on load"
        description="What the navigation looks like when you first sign in."
        control={
          <Segmented<"expanded" | "collapsed">
            value={value.sidebarDefault}
            options={[
              { id: "expanded", label: "Expanded" },
              { id: "collapsed", label: "Collapsed" },
            ]}
            onChange={(sidebarDefault) => onChange({ sidebarDefault })}
          />
        }
      />
      <Row
        label="New project visibility"
        description="The default visibility when you create a new project."
        control={
          <Segmented<"private" | "team">
            value={value.defaultProjectVisibility}
            options={[
              { id: "private", label: "Private" },
              { id: "team", label: "Team" },
            ]}
            onChange={(defaultProjectVisibility) =>
              onChange({ defaultProjectVisibility })
            }
          />
        }
      />
      <Row
        label={`Autosave every ${value.autosaveDelaySec}s`}
        description="How often unsaved changes in the architecture editor are written to local storage."
        stacked
        control={
          <input
            type="range"
            className="slider"
            min={5}
            max={60}
            step={5}
            value={value.autosaveDelaySec}
            onChange={(e) =>
              onChange({ autosaveDelaySec: Number(e.target.value) })
            }
            aria-label="Autosave delay seconds"
          />
        }
      />
      <Row
        label="Show welcome on Home"
        description="Display the hero greeting card when opening the dashboard."
        control={
          <Toggle
            checked={value.showWelcomeOnHome}
            onChange={(showWelcomeOnHome) => onChange({ showWelcomeOnHome })}
          />
        }
      />
      <Row
        label="Confirm before deleting projects"
        description="Ask for one more confirmation before any irreversible delete."
        control={
          <Toggle
            checked={value.confirmBeforeDeletingProjects}
            onChange={(confirmBeforeDeletingProjects) =>
              onChange({ confirmBeforeDeletingProjects })
            }
          />
        }
      />
    </SectionCard>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Primitives
 * ──────────────────────────────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={"toggle" + (disabled ? " is-disabled" : "")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-slider" />
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={"segmented-btn" + (o.id === value ? " is-active" : "")}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <select
      className="select"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Local icons (kept in-file — rail-only)
 * ──────────────────────────────────────────────────────────────────── */
function PaintIcon({ size = 16, ...p }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      {...p}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 7l-8 8-2 6 6-2 8-8a2.828 2.828 0 1 0-4-4z" />
      <path d="M14.5 5.5l4 4" />
    </svg>
  );
}

function GlobeIcon({ size = 16, ...p }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      {...p}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

