import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface LiveScore {
  address: string;
  score:   number;
  rank:    number;
  correct: number;
}

interface GameScreenProps {
  currentQuestion: number;
  totalQuestions:  number;
  question:        string;
  difficulty:      "easy" | "medium" | "hard";
  timeLeft:        number;
  totalTime:       number;
  score:           number;
  submitting:      boolean;
  liveScores?:     LiveScore[];
  currentPlayerAddress: string;
  onSubmitAnswer: (answer: string) => void;
  feedback?: {
    type: "correct" | "wrong" | "timeout" | "ai-judged";
    message: string;
    points: number;
  } | null;
  onDismissFeedback?: () => void;
}

const DIFFICULTY_STYLES = {
  easy:   { bg: "bg-neon-green/20",  text: "text-neon-green",  border: "border-neon-green/30",  label: "Easy" },
  medium: { bg: "bg-neon-yellow/20", text: "text-neon-yellow", border: "border-neon-yellow/30", label: "Medium" },
  hard:   { bg: "bg-neon-red/20",    text: "text-neon-red",    border: "border-neon-red/30",    label: "Hard" },
};

const FEEDBACK_ICONS: Record<string, string> = {
  correct:     "✅",
  wrong:       "❌",
  timeout:     "⏰",
  "ai-judged": "🤖",
};

const RANK_ICONS = ["🥇", "🥈", "🥉"];

function CountdownTimer({ timeLeft, totalTime }: { timeLeft: number; totalTime: number }) {
  const progress = timeLeft / totalTime;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const color =
    progress > 0.5 ? "oklch(0.75 0.2 145)"
    : progress > 0.25 ? "oklch(0.85 0.18 90)"
    : "oklch(0.65 0.25 25)";

  return (
    <div className="relative w-32 h-32 mx-auto mb-8">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="oklch(0.3 0.03 260)" strokeWidth="6" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold animate-countdown-pulse" style={{ color }}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}

function LiveScoreboard({
  scores,
  currentPlayerAddress,
}: {
  scores: LiveScore[];
  currentPlayerAddress: string;
}) {
  const truncate = (a: string) => `${a.slice(0, 4)}…${a.slice(-3)}`;

  return (
    <div className="glass-card p-3 min-w-[160px]">
      <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">
        🏆 Live Scores
      </p>
      <div className="space-y-1.5">
        {scores.slice(0, 5).map((s, i) => {
          const isMe = s.address.toLowerCase() === currentPlayerAddress.toLowerCase();
          return (
            <div
              key={s.address}
              className={`flex items-center gap-2 text-xs rounded-md px-2 py-1 transition-all ${
                isMe ? "bg-primary/20 border border-primary/30" : "bg-secondary/40"
              }`}
            >
              <span className="text-sm w-5 text-center">
                {i < 3 ? RANK_ICONS[i] : <span className="text-muted-foreground">#{i + 1}</span>}
              </span>
              <span className={`font-mono flex-1 ${isMe ? "text-neon-green font-bold" : "text-muted-foreground"}`}>
                {truncate(s.address)}
              </span>
              <span className="font-bold text-neon-blue">{s.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GameScreen({
  currentQuestion,
  totalQuestions,
  question,
  difficulty,
  timeLeft,
  totalTime,
  score,
  submitting,
  liveScores,
  currentPlayerAddress,
  onSubmitAnswer,
  feedback,
  onDismissFeedback,
}: GameScreenProps) {
  const [answer, setAnswer] = useState("");
  const [showScores, setShowScores] = useState(false);
  const diffStyle = DIFFICULTY_STYLES[difficulty] || DIFFICULTY_STYLES.medium;
  const progress = (currentQuestion / totalQuestions) * 100;

  const handleSubmit = () => {
    if (answer.trim() && !submitting) {
      onSubmitAnswer(answer.trim());
      setAnswer("");
    }
  };

  return (
    <div className="min-h-screen grain flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold tracking-tight text-sm">
            <span className="mr-1">📰⚡</span>
            <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              NewsBlitz
            </span>
          </span>

          <div className="flex-1 mx-6 max-w-md">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-500 progress-bar-glow"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {liveScores && liveScores.length > 1 && (
              <button
                onClick={() => setShowScores((s) => !s)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  showScores
                    ? "bg-primary/20 border-primary/50 text-foreground"
                    : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                🏆 Scores
              </button>
            )}
            <div className="glass-card px-4 py-1.5 text-sm font-bold">
              <span className="text-neon-blue">{score}</span>
              <span className="text-muted-foreground"> pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 gap-4">
        <div className="w-full max-w-2xl animate-slide-up">
          <CountdownTimer timeLeft={timeLeft} totalTime={totalTime} />

          {/* Question card */}
          <div className="glass-card p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground font-mono">
                Q{currentQuestion} / {totalQuestions}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}>
                {diffStyle.label}
              </span>
            </div>
            <p className="text-xl md:text-2xl font-semibold leading-relaxed">{question}</p>
          </div>

          {/* Answer input */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={submitting || !!feedback}
              className="flex-1 h-12 rounded-xl bg-input border border-border px-5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50"
            />
            <Button
              variant="neon"
              size="lg"
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting || !!feedback}
            >
              {submitting ? <span className="animate-pulse">Judging…</span> : "Submit"}
            </Button>
          </div>
        </div>

        {/* Live scoreboard — desktop sidebar */}
        {liveScores && liveScores.length > 1 && showScores && (
          <div className="hidden lg:block mt-4 animate-fade-in">
            <LiveScoreboard scores={liveScores} currentPlayerAddress={currentPlayerAddress} />
          </div>
        )}
      </div>

      {/* Live scoreboard — mobile overlay */}
      {liveScores && liveScores.length > 1 && showScores && (
        <div className="lg:hidden fixed bottom-20 right-4 z-40 animate-fade-in">
          <LiveScoreboard scores={liveScores} currentPlayerAddress={currentPlayerAddress} />
        </div>
      )}

      {/* Feedback overlay */}
      {feedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onDismissFeedback}
        >
          <div
            className="animate-slide-up text-center p-10 glass-card max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4">{FEEDBACK_ICONS[feedback.type] || "🤖"}</div>
            <p className="text-xl font-bold mb-2">{feedback.message}</p>
            {feedback.points > 0 && (
              <p className="text-3xl font-bold text-neon-blue">
                +{feedback.points}{" "}
                <span className="text-sm text-muted-foreground">pts</span>
              </p>
            )}
            <button
              onClick={onDismissFeedback}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Continue →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
