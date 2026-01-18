import React, { useEffect, useMemo, useRef, useState } from "react";

function inputClass(disabled = false) {
  return [
    "w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
    disabled ? "opacity-60 cursor-not-allowed" : ""
  ].join(" ");
}

function buttonClass(variant = "primary", disabled = false) {
  const base =
    variant === "ghost"
      ? "px-3 py-1.5 rounded bg-transparent border border-zinc-800 hover:bg-zinc-900 text-sm"
      : variant === "danger"
        ? "px-3 py-1.5 rounded bg-red-900/40 border border-red-900/70 hover:bg-red-900/55 text-sm"
        : "px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm";

  return [base, disabled ? "opacity-60 cursor-not-allowed" : ""].join(" ");
}

const OPTIONAL_ENDPOINT_PROVIDER_IDS = new Set(["ollama", "lmstudio"]);

function endpointFieldSpec(providerId) {
  if (providerId === "ollama") {
    return {
      title: "Endpoint URL (optional)",
      placeholder: "http://localhost:11434",
      help:
        "Optional for Ollama. Leave blank to use the default local endpoint. Use this to point at a remote Ollama host."
    };
  }
  if (providerId === "lmstudio") {
    return {
      title: "Endpoint URL (optional)",
      placeholder: "http://localhost:1234",
      help:
        "Optional for LM Studio. Leave blank to use the default local endpoint, or set it to your LM Studio server URL."
    };
  }
  return {
    title: "Endpoint URL (required)",
    placeholder: "https://your-openai-compatible-host (no /v1 needed)",
    help: "Required for this provider. The main panel must not contain endpoints."
  };
}

function statusForProvider(p, hasKeyMap, endpointsMap) {
  const hasKey = !!hasKeyMap[p.id];
  const endpoint = (endpointsMap[p.id] || "").trim();

  const keyOk = !p.needsKey || p.alwaysEnabled || hasKey;
  const endpointOk = !p.needsEndpoint || endpoint.length > 0;

  if (keyOk && endpointOk) return { label: "Configured", tone: "ok" };
  if (!keyOk) return { label: "Missing API key", tone: "warn", missing: "key" };
  if (!endpointOk) return { label: "Missing endpoint", tone: "warn", missing: "endpoint" };
  return { label: "Not configured", tone: "warn" };
}

function settingsGuidanceForStatus(p, hasKeyMap, endpointsMap) {
  const st = statusForProvider(p, hasKeyMap, endpointsMap);

  if (st.tone === "ok") {
    return "This provider is ready.";
  }

  if (st.missing === "key") {
    return "Paste an API key to enable this provider.";
  }

  if (st.missing === "endpoint") {
    if (OPTIONAL_ENDPOINT_PROVIDER_IDS.has(p.id)) {
      return "You can optionally set an endpoint URL for this runtime.";
    }
    return "Set an endpoint URL to enable this provider.";
  }

  return "Complete the required fields to enable this provider.";
}

function ProviderButton({ p, active, onClick, hasKeyMap, endpointsMap, registerRef }) {
  const st = statusForProvider(p, hasKeyMap, endpointsMap);
  const chipClass =
    st.tone === "ok"
      ? "bg-emerald-900/30 border-emerald-900/60 text-emerald-200"
      : "bg-amber-900/25 border-amber-900/60 text-amber-200";

  return (
    <button
      ref={(node) => {
        if (node) registerRef(p.id, node);
      }}
      className={[
        "w-full text-left px-2 py-2 rounded border outline-none",
        active
          ? "bg-zinc-900 border-zinc-700"
          : "bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-800"
      ].join(" ")}
      onClick={onClick}
      type="button"
      data-provider-id={p.id}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{p.label}</div>
        <div className={`text-[11px] px-2 py-0.5 rounded border ${chipClass}`}>{st.label}</div>
      </div>
      <div className="text-xs opacity-60 mt-0.5">{p.id}</div>
    </button>
  );
}

export default function SettingsModal({
  open,
  onClose,
  providers,
  hasKeyMap,
  endpointsMap,
  onSetEndpoint,
  onSaveKey,
  onClearKey,
  focusProviderId,
  message
}) {
  const [activeId, setActiveId] = useState(providers?.[0]?.id || "openai");
  const [keyDrafts, setKeyDrafts] = useState({}); // providerId -> string

  const providerButtonRefs = useRef({}); // providerId -> element
  const leftListRef = useRef(null);

  const cloudItems = useMemo(() => (providers || []).filter((p) => p.group === "cloud"), [providers]);
  const compatItems = useMemo(
    () => (providers || []).filter((p) => p.group === "compatible"),
    [providers]
  );
  const localItems = useMemo(() => (providers || []).filter((p) => p.group === "local"), [providers]);

  const activeProvider = useMemo(() => {
    const list = providers || [];
    return list.find((p) => p.id === activeId) || list[0] || null;
  }, [providers, activeId]);

  const status = useMemo(() => {
    return activeProvider
      ? statusForProvider(activeProvider, hasKeyMap || {}, endpointsMap || {})
      : { label: "", tone: "warn" };
  }, [activeProvider, hasKeyMap, endpointsMap]);

  const settingsGuidance = useMemo(() => {
    if (!activeProvider) return "";
    return settingsGuidanceForStatus(activeProvider, hasKeyMap || {}, endpointsMap || {});
  }, [activeProvider, hasKeyMap, endpointsMap]);

  const showEndpoint = useMemo(() => {
    const id = activeProvider?.id;
    return !!activeProvider?.needsEndpoint || OPTIONAL_ENDPOINT_PROVIDER_IDS.has(id);
  }, [activeProvider]);

  const endpointSpec = useMemo(() => endpointFieldSpec(activeProvider?.id), [activeProvider]);

  useEffect(() => {
    if (!open) return;
    if (focusProviderId) setActiveId(focusProviderId);
  }, [open, focusProviderId]);

  useEffect(() => {
    if (!open) return;
    setKeyDrafts({});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!focusProviderId) return;

    const el = providerButtonRefs.current[focusProviderId];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
      try {
        el.focus();
      } catch {
        // ignore
      }
    } else if (leftListRef.current) {
      try {
        leftListRef.current.scrollTop = 0;
      } catch {
        // ignore
      }
    }
  }, [open, focusProviderId]);

  const registerRef = useMemo(() => {
    return (id, node) => {
      providerButtonRefs.current[id] = node;
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-16">
      {/* Constrain height so left can scroll */}
      <div className="bg-zinc-950 w-[980px] max-w-[95vw] h-[85vh] rounded-xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="font-semibold">Settings</div>
          <button className={buttonClass("ghost")} onClick={onClose} type="button">
            Close
          </button>
        </div>

        {/* Subheader */}
        <div className="p-4 border-b border-zinc-800 text-xs opacity-70 shrink-0">
          Configure providers here. The main panel must not show API keys or endpoints.
          {message ? <span className="ml-2 opacity-90">• {message}</span> : null}
          <div className="mt-1 text-[11px] opacity-60">
            Providers loaded: {providers?.length ?? 0} • Cloud: {cloudItems.length} • Compatible:{" "}
            {compatItems.length} • Local: {localItems.length}
          </div>
        </div>

        {/* Body (must be overflow-hidden so inner columns can scroll) */}
        <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr] overflow-hidden">
          {/* Left list (scrollable) */}
          <div className="border-r border-zinc-800 min-h-0 overflow-hidden">
            <div ref={leftListRef} className="h-full overflow-auto p-3">
              <div className="text-[11px] opacity-60 px-2 mb-3 leading-snug">
                Tip: select a provider on the left to configure its API key (and endpoint where required).
              </div>

              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide opacity-60 px-2 mb-2">
                  Cloud (Native)
                </div>
                <div className="space-y-1">
                  {cloudItems.map((p) => (
                    <ProviderButton
                      key={p.id}
                      p={p}
                      active={p.id === activeId}
                      onClick={() => setActiveId(p.id)}
                      hasKeyMap={hasKeyMap || {}}
                      endpointsMap={endpointsMap || {}}
                      registerRef={registerRef}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide opacity-60 px-2 mb-2">
                  OpenAI-Compatible
                </div>
                <div className="space-y-1">
                  {compatItems.map((p) => (
                    <ProviderButton
                      key={p.id}
                      p={p}
                      active={p.id === activeId}
                      onClick={() => setActiveId(p.id)}
                      hasKeyMap={hasKeyMap || {}}
                      endpointsMap={endpointsMap || {}}
                      registerRef={registerRef}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-2">
                <div className="text-xs uppercase tracking-wide opacity-60 px-2 mb-2">
                  Local Runtimes
                </div>
                <div className="space-y-1">
                  {localItems.map((p) => (
                    <ProviderButton
                      key={p.id}
                      p={p}
                      active={p.id === activeId}
                      onClick={() => setActiveId(p.id)}
                      hasKeyMap={hasKeyMap || {}}
                      endpointsMap={endpointsMap || {}}
                      registerRef={registerRef}
                    />
                  ))}
                  {localItems.length === 0 ? (
                    <div className="text-xs opacity-60 px-2 leading-snug">
                      No local runtime providers found. (This means Settings did not receive providers
                      with <span className="opacity-90">group: "local"</span>.)
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel (scrollable) */}
          <div className="min-h-0 overflow-auto p-4">
            {!activeProvider ? (
              <div className="text-sm opacity-70">No provider selected.</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">{activeProvider.label}</div>
                  <div className="text-xs opacity-70 mt-1">
                    Status: <span className="opacity-90">{status.label}</span>
                  </div>

                  <div className="mt-2 text-xs opacity-70 border border-zinc-800 rounded p-2 bg-zinc-900/40">
                    {settingsGuidance}
                  </div>
                </div>

                {/* API Key */}
                <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">API Key</div>
                    <div className="text-xs opacity-70">
                      {activeProvider.needsKey
                        ? (hasKeyMap || {})[activeProvider.id]
                          ? "key set"
                          : "no key"
                        : "not required"}
                    </div>
                  </div>

                  {activeProvider.needsKey ? (
                    <>
                      <input
                        className={inputClass(false)}
                        value={keyDrafts[activeProvider.id] || ""}
                        onChange={(e) =>
                          setKeyDrafts((prev) => ({
                            ...prev,
                            [activeProvider.id]: e.target.value
                          }))
                        }
                        placeholder={`Paste ${activeProvider.label} API key...`}
                      />

                      <div className="flex items-center gap-2">
                        <button
                          className={buttonClass(
                            "primary",
                            !(keyDrafts[activeProvider.id] || "").trim()
                          )}
                          onClick={() =>
                            onSaveKey(activeProvider.id, keyDrafts[activeProvider.id] || "")
                          }
                          disabled={!(keyDrafts[activeProvider.id] || "").trim()}
                          type="button"
                        >
                          Save
                        </button>

                        <button
                          className={buttonClass("danger")}
                          onClick={() => onClearKey(activeProvider.id)}
                          type="button"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="text-xs opacity-60">
                        Keys are stored securely in the OS keychain via Tauri.
                      </div>
                    </>
                  ) : (
                    <div className="text-xs opacity-60">
                      This provider does not require an API key.
                    </div>
                  )}
                </div>

                {/* Endpoint */}
                {showEndpoint ? (
                  <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{endpointSpec.title}</div>
                      <div className="text-xs opacity-70">
                        {((endpointsMap || {})[activeProvider.id] || "").trim() ? "set" : "not set"}
                      </div>
                    </div>

                    <input
                      className={inputClass(false)}
                      value={(endpointsMap || {})[activeProvider.id] || ""}
                      onChange={(e) => onSetEndpoint(activeProvider.id, e.target.value)}
                      placeholder={endpointSpec.placeholder}
                    />

                    <div className="text-xs opacity-60">{endpointSpec.help}</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-4 border-t border-zinc-800 flex items-center justify-between shrink-0">
          <div className="text-xs opacity-60">Phase 3.4: provider ergonomics + Settings UX (UI-only).</div>
          <button className={buttonClass("primary")} onClick={onClose} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
