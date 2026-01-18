import React, { useEffect, useMemo, useState } from "react";

function statusForProvider(p, hasKeyMap, endpointsMap) {
  const hasKey = !!hasKeyMap[p.id];
  const endpoint = (endpointsMap[p.id] || "").trim();

  const keyOk = !p.needsKey || p.alwaysEnabled || hasKey;
  const endpointOk = !p.needsEndpoint || endpoint.length > 0;

  if (keyOk && endpointOk) return { label: "Configured", tone: "ok" };
  if (!keyOk) return { label: "Missing API key", tone: "warn", missing: "key" };
  if (!endpointOk)
    return { label: "Missing endpoint", tone: "warn", missing: "endpoint" };
  return { label: "Not configured", tone: "warn" };
}

function pillClass(tone) {
  return tone === "ok"
    ? "bg-emerald-900/30 border-emerald-900/60 text-emerald-200"
    : "bg-amber-900/25 border-amber-900/60 text-amber-200";
}

function selectClass(disabled) {
  return [
    "bg-zinc-800 text-zinc-200 rounded px-2 py-1 text-sm outline-none border border-zinc-700 focus:border-zinc-500",
    disabled ? "opacity-60 cursor-not-allowed" : ""
  ].join(" ");
}

function inputClass(disabled) {
  return [
    "mt-2 bg-zinc-800 text-zinc-200 p-2 rounded outline-none border border-zinc-700 focus:border-zinc-500",
    disabled ? "opacity-60 cursor-not-allowed" : ""
  ].join(" ");
}

function buttonClass(disabled) {
  return [
    "px-3 py-2 rounded text-sm border border-zinc-700 bg-zinc-800 hover:bg-zinc-700",
    disabled ? "opacity-60 cursor-not-allowed hover:bg-zinc-800" : ""
  ].join(" ");
}

export default function Chat({
  providers = [],
  hasKeyMap = {},
  endpointsMap = {},
  onConfigureInSettings = () => {}
}) {
  const [activeProviderId, setActiveProviderId] = useState(
    providers?.[0]?.id || ""
  );
  const [draft, setDraft] = useState("");

  // Keep selection valid if providers list changes
  useEffect(() => {
    if (!providers?.length) return;
    const exists = providers.some((p) => p.id === activeProviderId);
    if (!exists) setActiveProviderId(providers[0].id);
  }, [providers, activeProviderId]);

  const activeProvider = useMemo(() => {
    return providers.find((p) => p.id === activeProviderId) || null;
  }, [providers, activeProviderId]);

  const status = useMemo(() => {
    if (!activeProvider) return { label: "No provider", tone: "warn" };
    return statusForProvider(activeProvider, hasKeyMap, endpointsMap);
  }, [activeProvider, hasKeyMap, endpointsMap]);

  const canSend =
    !!activeProvider && status.tone === "ok" && (draft || "").trim().length > 0;

  const blockedReason = useMemo(() => {
    if (!activeProvider) return "Select a provider to start chatting.";
    if (status.tone === "ok") return null;

    if (status.missing === "key") {
      return `${activeProvider.label} needs an API key before you can chat.`;
    }
    if (status.missing === "endpoint") {
      return `${activeProvider.label} needs an endpoint URL before you can chat.`;
    }
    return `${activeProvider.label} is not configured yet.`;
  }, [activeProvider, status]);

  const onClickConfigure = () => {
    if (!activeProvider) return;
    onConfigureInSettings(
      activeProvider.id,
      status.missing === "key"
        ? `${activeProvider.label}: missing API key`
        : status.missing === "endpoint"
          ? `${activeProvider.label}: missing endpoint`
          : `${activeProvider.label}: configuration needed`
    );
  };

  const onSubmit = (e) => {
    e.preventDefault();

    // UI-only in this phase: we only gate + message.
    if (!activeProvider) return;
    if (status.tone !== "ok") return;
    if (!(draft || "").trim()) return;

    // Placeholder: actual send is wired elsewhere (backend already exists).
    // Keep draft so user can still copy it if they haven't wired send here yet.
    // If you already have a send pipeline in another file, this is where it would be invoked.
    setDraft("");
  };

  return (
    <div className="h-full bg-zinc-900 text-zinc-300 p-3 text-sm flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="font-semibold">AI Chat</div>

        <div className="flex items-center gap-2 min-w-[280px] justify-end">
          <select
            className={selectClass(!providers.length)}
            value={activeProviderId}
            onChange={(e) => setActiveProviderId(e.target.value)}
            disabled={!providers.length}
          >
            {providers.length ? (
              providers.map((p) => {
                const st = statusForProvider(p, hasKeyMap, endpointsMap);
                return (
                  <option key={p.id} value={p.id}>
                    {p.label} — {st.label}
                  </option>
                );
              })
            ) : (
              <option value="">No providers</option>
            )}
          </select>

          {activeProvider ? (
            <div
              className={[
                "text-[11px] px-2 py-0.5 rounded border whitespace-nowrap",
                pillClass(status.tone)
              ].join(" ")}
              title={activeProvider.id}
            >
              {status.label}
            </div>
          ) : null}
        </div>
      </div>

      {/* Guidance / gating banner */}
      {blockedReason ? (
        <div className="mb-2 rounded border border-amber-900/60 bg-amber-900/15 p-2 flex items-start justify-between gap-3">
          <div className="text-xs text-amber-100/90">
            <div className="font-semibold text-amber-100">
              Configuration needed
            </div>
            <div className="opacity-90">{blockedReason}</div>
          </div>

          <button
            type="button"
            className={buttonClass(false)}
            onClick={onClickConfigure}
          >
            Configure in Settings
          </button>
        </div>
      ) : (
        <div className="mb-2 text-xs text-zinc-500">
          👋 Ask KForge to modify your code…
        </div>
      )}

      <div className="flex-1 overflow-auto text-zinc-400 rounded border border-zinc-800 p-2">
        <p className="text-zinc-500">
          Chat transcript UI will render here (Phase 3.4 focuses on provider
          ergonomics + settings UX).
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-2 flex gap-2">
        <input
          className={inputClass(status.tone !== "ok")}
          placeholder={
            status.tone === "ok"
              ? "Type a request..."
              : "Configure the provider to start chatting..."
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={status.tone !== "ok"}
        />
        <button
          type="submit"
          className={buttonClass(!canSend)}
          disabled={!canSend}
          title={
            !activeProvider
              ? "Select a provider"
              : status.tone !== "ok"
                ? "Configure provider first"
                : !(draft || "").trim()
                  ? "Type a message"
                  : "Send"
          }
        >
          Send
        </button>
      </form>
    </div>
  );
}
