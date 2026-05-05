import { Button } from "@/components/ui/button";

interface LoginScreenProps {
  onConnect: () => void;
  error?: string;
  isConnecting?: boolean;
}

function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute text-muted-foreground/20 text-sm font-mono select-none"
      style={style}
    >
      {["📰", "⚡", "🌍", "📈", "⚽", "💹", "🗞️"][Math.floor(Math.random() * 7)]}
    </div>
  );
}

export function LoginScreen({ onConnect, error, isConnecting }: LoginScreenProps) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    key: i,
    left: `${(i * 47 + 13) % 100}%`,
    top: `${(i * 31 + 7) % 100}%`,
    animationDelay: `${(i * 0.4) % 6}s`,
    animationDuration: `${6 + (i % 4)}s`,
    fontSize: `${1 + (i % 3) * 0.5}rem`,
  }));

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden grain">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.08_260),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.18_0.1_300),transparent_50%)]" />

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.key}
          className="animate-float-slow"
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration,
          }}
        >
          <Particle style={{ fontSize: p.fontSize }} />
        </div>
      ))}

      {/* Main content */}
      <div className="relative z-10 text-center animate-slide-up">
        <div className="mb-2 text-6xl md:text-8xl">📰⚡</div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
          <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-neon-blue bg-clip-text text-transparent">
            NewsBlitz
          </span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mb-12 tracking-wide">
          AI Trivia from Real News · Powered by{" "}
          <span className="text-neon-purple font-semibold">GenLayer</span>
        </p>

        <Button
          variant="neon"
          size="xl"
          onClick={onConnect}
          disabled={isConnecting}
          className="min-w-[280px] text-lg gap-3"
        >
          {isConnecting ? (
            <span className="animate-pulse">Connecting...</span>
          ) : (
            <>
              <span className="text-2xl">🦊</span>
              Connect MetaMask
            </>
          )}
        </Button>

        {error && (
          <div className="mt-6 text-neon-red text-sm font-medium animate-fade-in">
            {error}
          </div>
        )}

        <div className="mt-16 text-muted-foreground text-sm">
          Don't have tokens?{" "}
          <a
            href="https://testnet-faucet.genlayer.foundation"
            target="_blank"
            rel="noreferrer"
            className="text-neon-blue hover:text-neon-purple transition-colors underline underline-offset-4"
          >
            Get testnet GEN →
          </a>
        </div>
      </div>
    </div>
  );
}
