import type { ReactNode } from "react";

type Props = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function DashboardCard({ title, eyebrow, action, children }: Props) {
  return (
    <section className="dash-card" aria-label={title}>
      <header className="dash-card-head">
        <div>
          <div className="dash-card-title">{title}</div>
          {eyebrow ? <span className="dash-card-sub">{eyebrow}</span> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
