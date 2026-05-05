import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LobbyScreenProps {
  walletAddress: string;
  onDisconnect: () => void;
  onCreateRoom: (roomId: string, topic: string) => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
}

const TOPICS = [
  { value: "world",    label: "🌍 World News" },
  { value: "sports",   label: "⚽ Sports" },
  { value: "business", label: "📈 Business" },
];

export function LobbyScreen({
  walletAddress,
  onDisconnect,
  onCreateRoom,
  onJoinRoom,
}: LobbyScreenProps) {
  const [createRoomId, setCreateRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("world");
  const [createStatus, setCreateStatus] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinStatus, setJoinStatus] = useState("");
  const [joinError, setJoinError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  const truncatedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  const handleCreate = async () => {
    if (!createRoomId.trim()) {
      setCreateError("Please enter a room ID");
      return;
    }
    setCreateError("");
    setCreateStatus("Fetching news & generating questions via AI… (~30s)");
    setCreateLoading(true);
    try {
      await onCreateRoom(createRoomId.trim(), selectedTopic);
    } catch (e: unknown) {
      setCreateStatus("");
      setCreateError("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinRoomId.trim()) {
      setJoinError("Please enter a room ID");
      return;
    }
    setJoinError("");
    setJoinStatus("Joining room…");
    setJoinLoading(true);
    try {
      await onJoinRoom(joinRoomId.trim());
    } catch (e: unknown) {
      setJoinStatus("");
      setJoinError("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="min-h-screen grain">
      {/* Navbar */}
      <nav className="border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight">
            <span className="mr-2">📰⚡</span>
            <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              NewsBlitz
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="font-mono text-muted-foreground">{truncatedAddress}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="text-muted-foreground hover:text-foreground"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-2">Choose Your Arena</h2>
        <p className="text-muted-foreground text-center mb-12">
          Create a new room or join an existing one
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room */}
          <div className="glass-card p-8 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🎮</span>
              <h3 className="text-xl font-bold">Create Room</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Room ID</label>
                <input
                  type="text"
                  placeholder="Enter a unique room ID"
                  value={createRoomId}
                  onChange={(e) => setCreateRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !createLoading && handleCreate()}
                  className="w-full h-11 rounded-lg bg-input border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Topic</label>
                <div className="grid grid-cols-3 gap-2">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.value}
                      onClick={() => setSelectedTopic(topic.value)}
                      className={`py-3 px-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        selectedTopic === topic.value
                          ? "bg-primary/20 border-primary/50 border text-foreground neon-glow"
                          : "bg-input border border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="neon"
                size="lg"
                className="w-full mt-2"
                onClick={handleCreate}
                disabled={createLoading}
              >
                {createLoading ? (
                  <span className="animate-pulse">Creating…</span>
                ) : (
                  "Create Room"
                )}
              </Button>

              {createStatus && !createError && (
                <p className="text-sm text-neon-blue animate-fade-in">{createStatus}</p>
              )}
              {createError && (
                <p className="text-sm text-neon-red animate-fade-in">{createError}</p>
              )}
            </div>
          </div>

          {/* Join Room */}
          <div className="glass-card p-8 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🚪</span>
              <h3 className="text-xl font-bold">Join Room</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Room ID</label>
                <input
                  type="text"
                  placeholder="Enter room ID to join"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !joinLoading && handleJoin()}
                  className="w-full h-11 rounded-lg bg-input border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full mt-2"
                onClick={handleJoin}
                disabled={joinLoading}
              >
                {joinLoading ? (
                  <span className="animate-pulse">Joining…</span>
                ) : (
                  "Join Room"
                )}
              </Button>

              {joinStatus && !joinError && (
                <p className="text-sm text-neon-blue animate-fade-in">{joinStatus}</p>
              )}
              {joinError && (
                <p className="text-sm text-neon-red animate-fade-in">{joinError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
