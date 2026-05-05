import { useState } from "react";
import { Button } from "@/components/ui/button";

interface GameScreenProps {
  currentQuestion: number;
  totalQuestions: number;
  question: string;
  difficulty: "easy" | "medium" | "hard";
  timeLeft: number;
  totalTime: number;
  score: number;
  submitting: boolean;
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
  correct: "✅",
  wrong: "❌",
  timeout: "⏰",
  "ai-judged": "🤖",
};

function CountdownTimer({ timeLeft, totalTime }: { timeLeft: number; totalTime: number }) {
  const progress = timeLeft / totalTime;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const color =
    progress > 0.5
      ? "oklch(0.75 0.2 145)"
      : progress > 0.25
      ? "oklch(0.85 0.18 90)"
      : "oklch(0.65 0.25 25)";

  return (
    <div className="relative w-32 h-32 mx-auto mb-8">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="oklch(0.3 0.03 260)"
          strokeWidth="6"
        />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-3xl font-bold animate-countdown-pulse"
          style={{ color }}
        >
          {timeLeft}
        </span>
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
  onSubmitAnswer,
  feedback,
  onDismissFeedback,
}: GameScreenProps) {
  const [answer, setAnswer] = useState("");
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

          {/* Progress bar */}
          <div className="flex-1 mx-6 max-w-md">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-500 progress-bar-glow"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="glass-card px-4 py-1.5 text-sm font-bold">
            <span className="text-neon-blue">{score}</span>
            <span className="text-muted-foreground"> pts</span>
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl animate-slide-up">
          <CountdownTimer timeLeft={timeLeft} totalTime={totalTime} />

          {/* Question card */}
          <div className="glass-card p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground font-mono">
                Q{currentQuestion} / {totalQuestions}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}
              >
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
              {submitting ? (
                <span className="animate-pulse">Judging…</span>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </div>

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
