import React, { useCallback, useMemo, useState } from "react";
import Chat from "../components/Chat.jsx";
import SettingsModal from "../components/settings/SettingsModal.jsx";

export default function AssistantPane({
  // Data/ops are owned by the parent (App / state layer). This file is UI-only plumbing.
  providers = [],
  hasKeyMap = {},
  endpointsMap = {},
  onSetEndpoint = () => {},
  onSaveKey = () => {},
  onClearKey = () => {}
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusProviderId, setFocusProviderId] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState("");

  const openSettings = useCallback((providerId, message = "") => {
    setFocusProviderId(providerId || null);
    setSettingsMessage(message || "");
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setFocusProviderId(null);
    setSettingsMessage("");
  }, []);

  const headerRight = useMemo(() => {
    return (
      <button
        type="button"
        onClick={() => openSettings(null, "")}
        className="px-2 py-1 rounded border border-border bg-bg hover:bg-panel text-xs"
      >
        Settings
      </button>
    );
  }, [openSettings]);

  return (
    <div className="bg-panel border-l border-border flex flex-col h-full">
      <div className="h-10 flex items-center justify-between px-3 border-b border-border text-sm">
        <div className="font-semibold">Assistant</div>
        {headerRight}
      </div>

      <div className="flex-1 min-h-0">
        <Chat
          providers={providers}
          hasKeyMap={hasKeyMap}
          endpointsMap={endpointsMap}
          onConfigureInSettings={openSettings}
        />
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={closeSettings}
        providers={providers}
        hasKeyMap={hasKeyMap}
        endpointsMap={endpointsMap}
        onSetEndpoint={onSetEndpoint}
        onSaveKey={onSaveKey}
        onClearKey={onClearKey}
        focusProviderId={focusProviderId}
        message={settingsMessage}
      />
    </div>
  );
}
