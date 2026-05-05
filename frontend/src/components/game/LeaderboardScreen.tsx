import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  address:  string;
  correct:  number;
  total:    number;
  score:    number;
  xp:       number;
}

interface LeaderboardScreenProps {
  topic: string;
  entries: LeaderboardEntry[];
  currentPlayerAddress: string;
  onPlayAgain: () => void;
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export function LeaderboardScreen({
  topic,
  entries,
  currentPlayerAddress,
  onPlayAgain,
}: LeaderboardScreenProps) {
  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="min-h-screen grain flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.08_260),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-lg animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold">Final Results</h1>
          <p className="text-muted-foreground mt-1">{topic}</p>
        </div>

        {entries.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground mb-8">
            No scores recorded yet.
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {entries.map((entry, index) => {
              const isCurrentPlayer =
                entry.address.toLowerCase() === currentPlayerAddress.toLowerCase();
              const rankIcon = index < 3 ? RANK_ICONS[index] : null;

              return (
                <div
                  key={entry.address}
                  className={`glass-card p-4 flex items-center gap-4 transition-all ${
                    isCurrentPlayer ? "border-neon-blue/50 neon-glow" : ""
                  }`}
                >
                  <div className="w-10 text-center text-lg font-bold">
                    {rankIcon || (
                      <span className="text-muted-foreground">#{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm">
                      {truncate(entry.address)}
                      {isCurrentPlayer && (
                        <span className="text-neon-green font-sans font-bold ml-2">
                          (You)
                        </span>
                      )}
                    </span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {entry.correct}/{entry.total} correct
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-neon-blue">
                      {entry.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>

                  <div className="px-2 py-1 rounded-md text-xs font-bold bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
                    +{entry.xp} XP
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button
          variant="neon"
          size="xl"
          className="w-full text-lg"
          onClick={onPlayAgain}
        >
          Play Again
        </Button>
      </div>
    </div>
  );
}
