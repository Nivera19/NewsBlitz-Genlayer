import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  address:  string;
  correct:  number;
  total:    number;
  score:    number;
  xp:       number;
}

export interface CorrectAnswer {
  index:      number;
  question:   string;
  answer:     string;
  difficulty: string;
}

interface LeaderboardScreenProps {
  topic:                string;
  entries:              LeaderboardEntry[];
  currentPlayerAddress: string;
  correctAnswers?:      CorrectAnswer[];
  onPlayAgain:          () => void;
}

const RANK_ICONS   = ["🥇", "🥈", "🥉"];
const DIFF_COLORS: Record<string, string> = {
  easy:   "text-neon-green border-neon-green/30 bg-neon-green/10",
  medium: "text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10",
  hard:   "text-neon-red border-neon-red/30 bg-neon-red/10",
};

export function LeaderboardScreen({
  topic,
  entries,
  currentPlayerAddress,
  correctAnswers,
  onPlayAgain,
}: LeaderboardScreenProps) {
  const [showAnswers, setShowAnswers] = useState(false);
  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const winner = entries[0];
  const meEntry = entries.find(
    (e) => e.address.toLowerCase() === currentPlayerAddress.toLowerCase()
  );

  return (
    <div className="min-h-screen grain px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.08_260),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="text-7xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold">Final Results</h1>
          <p className="text-muted-foreground mt-1">{topic}</p>

          {/* Winner banner */}
          {winner && (
            <div className="mt-4 glass-card px-6 py-3 inline-flex items-center gap-3 neon-glow-purple">
              <span className="text-2xl">👑</span>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Winner</p>
                <p className="font-bold text-neon-purple font-mono text-sm">
                  {truncate(winner.address)}
                  {winner.address.toLowerCase() === currentPlayerAddress.toLowerCase() && (
                    <span className="text-neon-green ml-2">(You!)</span>
                  )}
                </p>
              </div>
              <span className="text-neon-blue font-bold">{winner.score.toLocaleString()} pts</span>
            </div>
          )}

          {/* My result pill */}
          {meEntry && meEntry.address !== winner?.address && (
            <div className="mt-3 text-sm text-muted-foreground">
              Your result:{" "}
              <span className="text-neon-blue font-bold">#{entries.indexOf(meEntry) + 1}</span>
              {" · "}
              <span className="text-neon-green">{meEntry.correct}/{meEntry.total} correct</span>
              {" · "}
              <span className="text-neon-purple">+{meEntry.xp} XP</span>
            </div>
          )}
        </div>

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground mb-8">
            No scores recorded yet.
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {entries.map((entry, index) => {
              const isMe = entry.address.toLowerCase() === currentPlayerAddress.toLowerCase();
              const rankIcon = index < 3 ? RANK_ICONS[index] : null;
              const animDelay = `${index * 80}ms`;

              return (
                <div
                  key={entry.address}
                  className={`glass-card p-4 flex items-center gap-3 transition-all animate-slide-up ${
                    isMe ? "border-neon-blue/50 neon-glow" : ""
                  } ${index === 0 ? "border-neon-purple/40 neon-glow-purple" : ""}`}
                  style={{ animationDelay: animDelay, animationFillMode: "both" }}
                >
                  <div className="w-9 text-center text-xl font-bold shrink-0">
                    {rankIcon || <span className="text-muted-foreground text-sm">#{index + 1}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm truncate">
                      {truncate(entry.address)}
                      {isMe && (
                        <span className="text-neon-green font-sans font-bold ml-2">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {entry.correct}/{entry.total} correct
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-neon-blue">
                      {entry.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>

                  <div className="px-2 py-1 rounded-md text-xs font-bold bg-neon-purple/20 text-neon-purple border border-neon-purple/30 shrink-0">
                    +{entry.xp} XP
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Correct Answers toggle */}
        {correctAnswers && correctAnswers.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowAnswers((v) => !v)}
              className="w-full glass-card px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>📋 View Correct Answers</span>
              <span className="text-neon-blue">{showAnswers ? "▲ Hide" : "▼ Show"}</span>
            </button>

            {showAnswers && (
              <div className="mt-2 space-y-2 animate-fade-in">
                {correctAnswers.map((qa) => (
                  <div key={qa.index} className="glass-card px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
                        Q{qa.index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground leading-snug mb-1">
                          {qa.question}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neon-green">✓ {qa.answer}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DIFF_COLORS[qa.difficulty] || DIFF_COLORS.medium}`}>
                            {qa.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button variant="neon" size="xl" className="w-full text-lg" onClick={onPlayAgain}>
          Play Again
        </Button>
      </div>
    </div>
  );
}
