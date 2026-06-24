/**
 * Static, non-functional Architecture Copilot placeholder. Sits inside
 * the workspace and previews the chat UX without making any API call
 * or showing fake message history. The textarea and send button are
 * disabled so the user can read what's coming without expecting a
 * working response.
 *
 * When the chat backend lands, this component is the place to wire it
 * up — until then, keep it inert.
 */

const SUGGESTIONS: string[] = [
  "Explain this architecture",
  "Suggest a cheaper stack",
  "Find scaling risks",
];

export default function WorkspaceChatPanel() {
  return (
    <aside
      className="workspace-chat-panel"
      aria-label="Architecture Copilot (coming next)"
    >
      <header className="workspace-chat-head">
        <div className="discovery-flow-eyebrow">
          <span className="discovery-flow-eyebrow-dot" aria-hidden="true" />
          Copilot
        </div>
        <h3 className="workspace-chat-title">Architecture Copilot</h3>
        <p className="workspace-chat-sub">
          Coming next. Ask questions about your architecture, request
          alternatives, or refine decisions.
        </p>
      </header>

      <div className="workspace-chat-suggestions" aria-label="Suggested prompts">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="workspace-chat-chip"
            disabled
            aria-disabled="true"
            title="Copilot will be enabled in a later step."
          >
            {s}
          </button>
        ))}
      </div>

      <div className="workspace-chat-input">
        <textarea
          className="workspace-chat-textarea"
          placeholder="Ask the Copilot anything about your architecture…"
          rows={3}
          disabled
          aria-disabled="true"
        />
        <div className="workspace-chat-input-foot">
          <span className="workspace-chat-input-note">
            Copilot is not active yet — your messages won&rsquo;t be sent.
          </span>
          <button
            type="button"
            className="wiz-btn wiz-btn-dark"
            disabled
            aria-disabled="true"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
