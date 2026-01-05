import Sidebar from "./Sidebar";
import TabsBar from "./TabsBar";
import EditorPane from "./EditorPane";
import AssistantPane from "./AssistantPane";

export default function AppLayout() {
  return (
    <div className="h-screen grid grid-cols-[56px_1fr_320px] bg-bg text-gray-200">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Editor Area */}
      <div className="flex flex-col border-l border-r border-border">
        <TabsBar />
        <EditorPane />
      </div>

      {/* Assistant */}
      <AssistantPane />

    </div>
  );
}
