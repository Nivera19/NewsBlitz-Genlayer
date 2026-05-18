import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getGlobalLeaderboard, type GlobalLeaderboardEntry } from "@/lib/contract";

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

const RANK_ICONS = ["🥇", "🥈", "🥉"];

function GlobalLeaderboard() {
  const [entries, setEntries] = useState<GlobalLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const data = await getGlobalLeaderboard();
        if (!cancelled) setEntries(data.leaderboard || []);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    // Refresh every 30s
    const interval = setInterval(fetch, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          🌐 <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
            Global Leaderboard
          </span>
        </h3>
        {!loading && (
          <span className="text-xs text-muted-foreground">{entries.length} players</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <div className="text-3xl mb-2">🏆</div>
          <p>No games played yet.</p>
          <p className="text-xs mt-1">Be the first on the leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 10).map((entry, i) => (
            <div
              key={entry.address}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                i === 0
                  ? "bg-neon-purple/10 border border-neon-purple/20"
                  : i === 1
                  ? "bg-neon-blue/10 border border-neon-blue/20"
                  : "bg-secondary/40 border border-border/30"
              }`}
            >
              <span className="w-6 text-center text-base shrink-0">
                {i < 3 ? RANK_ICONS[i] : <span className="text-xs text-muted-foreground">#{i + 1}</span>}
              </span>

              <span className="font-mono text-sm text-muted-foreground flex-1 truncate">
                {truncate(entry.address)}
              </span>

              <div className="flex items-center gap-3 shrink-0 text-right">
                <div>
                  <div className="text-sm font-bold text-neon-blue">
                    {entry.total_score.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">pts</div>
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-xs text-neon-green">{entry.games}🎮</div>
                  <div className="text-xs text-muted-foreground">{entry.total_correct}✓</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    if (!createRoomId.trim()) { setCreateError("Please enter a room ID"); return; }
    setCreateError(""); setCreateStatus("Fetching news & generating questions via AI… (~30s)");
    setCreateLoading(true);
    try {
      await onCreateRoom(createRoomId.trim(), selectedTopic);
    } catch (e: unknown) {
      setCreateStatus(""); setCreateError("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally { setCreateLoading(false); }
  };

  const handleJoin = async () => {
    if (!joinRoomId.trim()) { setJoinError("Please enter a room ID"); return; }
    setJoinError(""); setJoinStatus("Joining room…");
    setJoinLoading(true);
    try {
      await onJoinRoom(joinRoomId.trim());
    } catch (e: unknown) {
      setJoinStatus(""); setJoinError("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally { setJoinLoading(false); }
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
            <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-muted-foreground hover:text-foreground">
              Disconnect
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-2">Choose Your Arena</h2>
        <p className="text-muted-foreground text-center mb-10">Create a new room or join an existing one</p>

        <div className="grid lg:grid-cols-3 gap-6">
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
                  type="text" placeholder="Enter a unique room ID"
                  value={createRoomId} onChange={(e) => setCreateRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !createLoading && handleCreate()}
                  className="w-full h-11 rounded-lg bg-input border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Topic</label>
                <div className="grid grid-cols-3 gap-2">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.value} onClick={() => setSelectedTopic(topic.value)}
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
              <Button variant="neon" size="lg" className="w-full mt-2" onClick={handleCreate} disabled={createLoading}>
                {createLoading ? <span className="animate-pulse">Creating…</span> : "Create Room"}
              </Button>
              {createStatus && !createError && <p className="text-sm text-neon-blue animate-fade-in">{createStatus}</p>}
              {createError && <p className="text-sm text-neon-red animate-fade-in">{createError}</p>}
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
                  type="text" placeholder="Enter room ID to join"
                  value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !joinLoading && handleJoin()}
                  className="w-full h-11 rounded-lg bg-input border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <Button variant="outline" size="lg" className="w-full mt-2" onClick={handleJoin} disabled={joinLoading}>
                {joinLoading ? <span className="animate-pulse">Joining…</span> : "Join Room"}
              </Button>
              {joinStatus && !joinError && <p className="text-sm text-neon-blue animate-fade-in">{joinStatus}</p>}
              {joinError && <p className="text-sm text-neon-red animate-fade-in">{joinError}</p>}
            </div>
          </div>

          {/* Global Leaderboard */}
          <GlobalLeaderboard />
        </div>
      </div>
    </div>
  );
}
