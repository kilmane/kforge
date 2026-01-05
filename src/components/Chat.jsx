export default function Chat() {
  return (
    <div className="h-full bg-zinc-900 text-zinc-300 p-3 text-sm flex flex-col">
      <div className="font-semibold mb-2">AI Chat</div>

      <div className="flex-1 overflow-auto text-zinc-400">
        <p>👋 Ask KForge to modify your code…</p>
      </div>

      <input
        className="mt-2 bg-zinc-800 text-zinc-200 p-2 rounded outline-none"
        placeholder="Type a request..."
      />
    </div>
  );
}
