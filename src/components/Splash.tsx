type Props = {
  label?: string;
};

export default function Splash({ label = "Checking your session" }: Props) {
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-inner">
        <div className="splash-mark" aria-hidden="true">
          Q
        </div>
        <div className="splash-spinner" aria-hidden="true" />
        <span className="splash-label">{label}</span>
      </div>
    </div>
  );
}
