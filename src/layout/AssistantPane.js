export default function AssistantPane() {
  return (
    <div className="bg-panel border-l border-border flex flex-col">
      <div className="h-10 flex items-center px-3 border-b border-border text-sm">
        Assistant
      </div>

      <div className="flex-1 p-3 text-sm text-gray-400">
        Chat will live here.
      </div>

      <div className="p-3 border-t border-border">
        <input
          className="w-full bg-bg border border-border rounded px-2 py-1 text-sm outline-none focus:border-accent"
          placeholder="Ask KForge..."
        />
      </div>
    </div>
  );
}
