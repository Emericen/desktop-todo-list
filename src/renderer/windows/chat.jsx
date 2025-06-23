import ChatArea from "@/components/ChatArea";
import QueryBar from "@/components/QueryBar";
import useStore from "@/store/useStore";

export default function ChatWindow() {
  const settings = useStore((s) => s.settings);
  const shortcut = settings?.globalShortcuts?.toggleWindow;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header always visible */}
      <div className="fixed top-0 left-0 right-0 h-6 flex items-center pl-2 select-none text-xs text-muted-foreground z-50 bg-background border-b border-border" style={{ WebkitAppRegion: "drag" }}>
        {`Press ${shortcut} to toggle`}
      </div>

      {/* Offset main content to avoid overlapping header */}
      <div className="flex-1 mt-6">
        <ChatArea />
      </div>
      <QueryBar />
      <div className="h-24" />
    </div>
  );
}
