import React, { useEffect, useMemo, useState } from "react";

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

function statusForProvider(p, hasKeyMap, endpointsMap) {
  const hasKey = !!hasKeyMap[p.id];
  const endpoint = (endpointsMap[p.id] || "").trim();

  const keyOk = !p.needsKey || p.alwaysEnabled || hasKey;
  const endpointOk = !p.needsEndpoint || endpoint.length > 0;

  if (keyOk && endpointOk) return { label: "Configured", tone: "ok" };
  if (!keyOk) return { label: "Missing API key", tone: "warn" };
  if (!endpointOk) return { label: "Missing endpoint", tone: "warn" };
  return { label: "Not configured", tone: "warn" };
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

  useEffect(() => {
    if (!open) return;
    if (focusProviderId) setActiveId(focusProviderId);
  }, [open, focusProviderId]);

  useEffect(() => {
    if (!open) return;
    setKeyDrafts({});
  }, [open]);

  const activeProvider = useMemo(() => {
    return providers.find((p) => p.id === activeId) || providers[0];
  }, [providers, activeId]);

  if (!open) return null;

  const grouped = {
    "Cloud (Native)": providers.filter((p) => p.group === "cloud"),
    "OpenAI-Compatible": providers.filter((p) => p.group === "compatible"),
    "Local Runtimes": providers.filter((p) => p.group === "local")
  };

  const status = activeProvider
    ? statusForProvider(activeProvider, hasKeyMap, endpointsMap)
    : { label: "", tone: "warn" };

  const showEndpoint = !!activeProvider?.needsEndpoint;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-20">
      <div className="bg-zinc-950 w-[980px] max-w-[95vw] rounded-xl shadow-2xl border border-zinc-800 overflow-hidden">
        <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="font-semibold">Settings</div>
          <button className={buttonClass("ghost")} onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800 text-xs opacity-70">
          Providers and credentials live here. The main panel must not show API keys or endpoints.
          {message ? <span className="ml-2 opacity-90">• {message}</span> : null}
        </div>

        <div className="grid grid-cols-[320px_1fr] min-h-[520px]">
          {/* Left: provider list */}
          <div className="border-r border-zinc-800 p-3 overflow-auto">
            {Object.entries(grouped).map(([title, items]) => (
              <div key={title} className="mb-4">
                <div className="text-xs uppercase tracking-wide opacity-60 px-2 mb-2">
                  {title}
                </div>

                <div className="space-y-1">
                  {items.map((p) => {
                    const st = statusForProvider(p, hasKeyMap, endpointsMap);
                    const active = p.id === activeId;
                    const chipClass =
                      st.tone === "ok"
                        ? "bg-emerald-900/30 border-emerald-900/60 text-emerald-200"
                        : "bg-amber-900/25 border-amber-900/60 text-amber-200";

                    return (
                      <button
                        key={p.id}
                        className={[
                          "w-full text-left px-2 py-2 rounded border",
                          active
                            ? "bg-zinc-900 border-zinc-700"
                            : "bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-800"
                        ].join(" ")}
                        onClick={() => setActiveId(p.id)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold">{p.label}</div>
                          <div className={`text-[11px] px-2 py-0.5 rounded border ${chipClass}`}>
                            {st.label}
                          </div>
                        </div>
                        <div className="text-xs opacity-60 mt-0.5">{p.id}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right: active provider config */}
          <div className="p-4">
            {!activeProvider ? (
              <div className="text-sm opacity-70">No provider selected.</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold">{activeProvider.label}</div>
                  <div className="text-xs opacity-70 mt-1">
                    Status: <span className="opacity-90">{status.label}</span>
                  </div>
                </div>

                {/* API Key */}
                <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">API Key</div>
                    <div className="text-xs opacity-70">
                      {activeProvider.needsKey
                        ? hasKeyMap[activeProvider.id]
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

                {/* Endpoint (only when required) */}
                {showEndpoint ? (
                  <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Endpoint URL (required)</div>
                      <div className="text-xs opacity-70">
                        {(endpointsMap[activeProvider.id] || "").trim() ? "set" : "not set"}
                      </div>
                    </div>

                    <input
                      className={inputClass(false)}
                      value={endpointsMap[activeProvider.id] || ""}
                      onChange={(e) => onSetEndpoint(activeProvider.id, e.target.value)}
                      placeholder="https://your-openai-compatible-host (no /v1 needed)"
                    />

                    <div className="text-xs opacity-60">
                      Required for this provider. The main panel must not contain endpoints.
                    </div>
                  </div>
                ) : null}

                <div className="text-xs opacity-60">
                  Tip: disabled providers in the dropdown route you here with “Configure in Settings”.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-12 px-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs opacity-60">
            Backend Phase 3.2.4 is complete; we are now refining UI only.
          </div>
          <button className={buttonClass("primary")} onClick={onClose} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
