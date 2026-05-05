import { Button } from "@/components/ui/button";

interface Player {
  address: string;
  isHost: boolean;
}

interface WaitingRoomScreenProps {
  topic: string;
  topicIcon: string;
  roomId: string;
  players: Player[];
  questionCount: number;
  isHost: boolean;
  isStarting: boolean;
  currentPlayerAddress: string;
  onStartGame: () => void;
  onLeave: () => void;
}

export function WaitingRoomScreen({
  topic,
  topicIcon,
  roomId,
  players,
  questionCount,
  isHost,
  isStarting,
  currentPlayerAddress,
  onStartGame,
  onLeave,
}: WaitingRoomScreenProps) {
  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const initials = (addr: string) => addr.slice(2, 4).toUpperCase();

  return (
    <div className="min-h-screen grain flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.18_0.06_260),transparent_70%)]" />

      <div className="relative z-10 w-full max-w-lg animate-slide-up">
        <div className="glass-card p-8 text-center">
          {/* Topic icon */}
          <div className="text-6xl mb-4 animate-pulse-ring inline-block">{topicIcon}</div>
          <h2 className="text-2xl font-bold mb-1">{topic}</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Room: <span className="font-mono text-neon-blue">{roomId}</span> ·{" "}
            {questionCount} questions
          </p>

          {/* Counters */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-neon-blue">{players.length}</div>
              <div className="text-xs text-muted-foreground">Players</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-neon-purple">{questionCount}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
          </div>

          {/* Player list */}
          <div className="space-y-2 max-h-60 overflow-y-auto mb-8">
            {players.map((player) => (
              <div
                key={player.address}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {initials(player.address)}
                </div>
                <span className="font-mono text-sm text-muted-foreground flex-1 text-left">
                  {truncate(player.address)}
                  {player.address.toLowerCase() === currentPlayerAddress.toLowerCase() && (
                    <span className="text-neon-green ml-2 font-sans">(You)</span>
                  )}
                </span>
                {player.isHost && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30">
                    HOST
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          {isHost ? (
            <Button
              variant="neon"
              size="xl"
              className="w-full text-lg"
              onClick={onStartGame}
              disabled={isStarting}
            >
              {isStarting ? (
                <span className="animate-pulse">Starting…</span>
              ) : (
                "▶ Start Game"
              )}
            </Button>
          ) : (
            <div className="text-muted-foreground text-sm animate-pulse">
              Waiting for host to start...
            </div>
          )}

          <button
            onClick={onLeave}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
