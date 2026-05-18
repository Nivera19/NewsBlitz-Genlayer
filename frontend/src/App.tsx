import { useState, useEffect, useRef, useCallback } from "react";
import { LoginScreen } from "@/components/game/LoginScreen";
import { LobbyScreen } from "@/components/game/LobbyScreen";
import { WaitingRoomScreen } from "@/components/game/WaitingRoomScreen";
import { GameScreen, type LiveScore } from "@/components/game/GameScreen";
import { LeaderboardScreen, type CorrectAnswer } from "@/components/game/LeaderboardScreen";
import { connectMetaMask, disconnect, getConnectedAddress } from "@/lib/chain";
import {
  createRoom, joinRoom, startGame, submitAnswer, finishGame,
  getRoomInfo, getQuestion, getLeaderboard, getPlayerAnswer,
  type Question,
} from "@/lib/contract";
import { QUESTION_TIME_MS, NUM_QUESTIONS } from "@/lib/config";

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = "login" | "lobby" | "waiting" | "game" | "leaderboard";

type Feedback = {
  type: "correct" | "wrong" | "timeout" | "ai-judged";
  message: string;
  points: number;
} | null;

interface WaitingPlayer { address: string; isHost: boolean; }

interface LeaderboardRow {
  address: string; correct: number; total: number; score: number; xp: number;
}

const TOPIC_MAP: Record<string, { label: string; icon: string }> = {
  world:    { label: "🌍 World News", icon: "🌍" },
  sports:   { label: "⚽ Sports",     icon: "⚽" },
  business: { label: "📈 Business",   icon: "📈" },
};

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // ─ Navigation ─
  const [screen, setScreen] = useState<Screen>("login");

  // ─ Wallet ─
  const [walletAddress, setWalletAddress] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // ─ Room ─
  const [roomId, setRoomId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [topic, setTopic] = useState("world");
  const [topicTitle, setTopicTitle] = useState("");

  // ─ Waiting room ─
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayer[]>([]);
  const [questionCount, setQuestionCount] = useState(NUM_QUESTIONS);
  const [isStarting, setIsStarting] = useState(false);
  const waitingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─ Game ─
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_MS / 1000);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answered, setAnswered] = useState(false);
  const answerStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─ Live scores (polled during game) ─
  const [liveScores, setLiveScores] = useState<LiveScore[]>([]);
  const liveScoresPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─ Leaderboard ─
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [lbTopic, setLbTopic] = useState("");
  const [correctAnswers, setCorrectAnswers] = useState<CorrectAnswer[]>([]);

  // ── Wallet events ────────────────────────────────────────────────────────────

  useEffect(() => {
    const onDisconnect = () => { disconnect(); setWalletAddress(""); setScreen("login"); };
    const onChange = (e: Event) => setWalletAddress((e as CustomEvent<string>).detail);
    window.addEventListener("wallet:disconnected", onDisconnect);
    window.addEventListener("wallet:changed", onChange);
    return () => {
      window.removeEventListener("wallet:disconnected", onDisconnect);
      window.removeEventListener("wallet:changed", onChange);
    };
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    setLoginError(""); setIsConnecting(true);
    try {
      const address = await connectMetaMask();
      setWalletAddress(address); setScreen("lobby");
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : String(e));
    } finally { setIsConnecting(false); }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect(); setWalletAddress(""); setScreen("login");
  }, []);

  // ── Lobby ─────────────────────────────────────────────────────────────────────

  const handleCreateRoom = useCallback(async (id: string, topicVal: string) => {
    await createRoom(id, topicVal);
    await joinRoom(id);
    setRoomId(id); setTopic(topicVal); setIsHost(true); setIsStarting(false);
    await enterWaiting(id, topicVal, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoinRoom = useCallback(async (id: string) => {
    await joinRoom(id);
    setRoomId(id); setIsHost(false); setIsStarting(false);
    await enterWaiting(id, "", false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Waiting room ──────────────────────────────────────────────────────────────

  const enterWaiting = useCallback(async (id: string, topicHint: string, _host: boolean) => {
    setScreen("waiting");
    await refreshWaiting(id, topicHint);
    const poll = setInterval(async () => {
      const info = await refreshWaiting(id, "");
      if (info?.status === "playing") {
        clearInterval(poll); waitingPollRef.current = null;
        startClientGame(id);
      }
    }, 4000);
    waitingPollRef.current = poll;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshWaiting = useCallback(async (id: string, topicHint: string) => {
    try {
      const info = await getRoomInfo(id);
      const topicInfo = TOPIC_MAP[info.topic] || TOPIC_MAP.world;
      setTopicTitle(info.topic_title || topicInfo.label);
      setTopic(info.topic || topicHint);
      setQuestionCount(info.question_count || NUM_QUESTIONS);
      setWaitingPlayers(
        info.players.map((addr: string) => ({
          address: addr,
          isHost: addr.toLowerCase() === info.host.toLowerCase(),
        }))
      );
      return info;
    } catch { return null; }
  }, []);

  const handleStartGame = useCallback(async () => {
    setIsStarting(true);
    try {
      await startGame(roomId);
      if (waitingPollRef.current) { clearInterval(waitingPollRef.current); waitingPollRef.current = null; }
      startClientGame(roomId);
    } catch (e: unknown) {
      setIsStarting(false);
      alert("Error starting: " + (e instanceof Error ? e.message : String(e)));
    }
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Game ──────────────────────────────────────────────────────────────────────

  const fetchLiveScores = useCallback(async (id: string) => {
    try {
      const lb = await getLeaderboard(id);
      setLiveScores(
        lb.leaderboard.map((p) => ({
          address: p.address,
          score:   p.score,
          rank:    p.rank,
          correct: p.correct,
        }))
      );
    } catch { /* silent */ }
  }, []);

  const startClientGame = useCallback((id: string) => {
    setCurrentQIndex(0); setScore(0); setFeedback(null);
    setAnswered(false); setLiveScores([]);
    setScreen("game");
    loadQuestion(id, 0);
    // Start live score polling every 6s
    const poll = setInterval(() => fetchLiveScores(id), 6000);
    liveScoresPollRef.current = poll;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuestion = useCallback(async (id: string, idx: number) => {
    setAnswered(false); setFeedback(null); setSubmitting(false); setCurrentQ(null);
    try {
      const q = await getQuestion(id, idx);
      setCurrentQ(q);
      setTimeLeft(QUESTION_TIME_MS / 1000);
      answerStartRef.current = Date.now();
    } catch (e: unknown) {
      alert("Error loading question: " + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (screen !== "game" || !currentQ || answered || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!); timerRef.current = null;
          handleTimeout(); return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [screen, currentQ, answered, feedback]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeout = useCallback(() => {
    setAnswered(true);
    setFeedback({ type: "timeout", message: "Time's up!", points: 0 });
  }, []);

  const handleSubmitAnswer = useCallback(async (answer: string) => {
    if (answered || !currentQ || submitting) return;
    setAnswered(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const timeMs = Date.now() - answerStartRef.current;
    setSubmitting(true);
    try {
      await submitAnswer(roomId, currentQIndex, answer, timeMs);
      const me = getConnectedAddress() || "";
      try {
        const res = await getPlayerAnswer(roomId, me, currentQIndex);
        if (res.found) {
          const pts = res.points || 0;
          setScore((s) => s + pts);
          setFeedback({ type: res.correct ? "correct" : "wrong", message: res.correct ? "Correct!" : "Wrong answer!", points: pts });
        } else {
          setFeedback({ type: "ai-judged", message: "Judged on-chain", points: 0 });
        }
      } catch {
        setFeedback({ type: "ai-judged", message: "Judged on-chain", points: 0 });
      }
    } catch (e: unknown) {
      setFeedback({ type: "wrong", message: "TX failed — " + (e instanceof Error ? e.message.slice(0, 40) : "error"), points: 0 });
    } finally { setSubmitting(false); }
  }, [answered, currentQ, submitting, roomId, currentQIndex]);

  const handleDismissFeedback = useCallback(() => {
    setFeedback(null);
    const next = currentQIndex + 1;
    if (next < NUM_QUESTIONS) { setCurrentQIndex(next); loadQuestion(roomId, next); }
    else { endGame(); }
  }, [currentQIndex, roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Leaderboard ───────────────────────────────────────────────────────────────

  const endGame = useCallback(async () => {
    // Stop live score polling
    if (liveScoresPollRef.current) { clearInterval(liveScoresPollRef.current); liveScoresPollRef.current = null; }

    setScreen("leaderboard");
    setLeaderboard([]); setCorrectAnswers([]);
    setLbTopic("Loading results…");

    try { if (isHost) await finishGame(roomId); } catch { /* ok */ }

    try {
      const lb = await getLeaderboard(roomId);
      setLbTopic(lb.topic_title || "Final Results");
      setLeaderboard(lb.leaderboard.map((p) => ({
        address: p.address, correct: p.correct, total: p.answered, score: p.score, xp: p.xp_earned,
      })));
    } catch (e) { setLbTopic("Error loading leaderboard"); console.error(e); }

    // Fetch correct answers for all questions
    try {
      const answers: CorrectAnswer[] = [];
      for (let i = 0; i < NUM_QUESTIONS; i++) {
        const q = await getQuestion(roomId, i);
        if (q.correct_answer) {
          answers.push({ index: i, question: q.text, answer: q.correct_answer, difficulty: q.difficulty });
        }
      }
      setCorrectAnswers(answers);
    } catch { /* answers not critical */ }
  }, [isHost, roomId]);

  const handlePlayAgain = useCallback(() => {
    if (waitingPollRef.current) { clearInterval(waitingPollRef.current); waitingPollRef.current = null; }
    if (liveScoresPollRef.current) { clearInterval(liveScoresPollRef.current); liveScoresPollRef.current = null; }
    setRoomId(""); setIsHost(false); setScreen("lobby");
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  const topicInfo = TOPIC_MAP[topic] || TOPIC_MAP.world;

  switch (screen) {
    case "login":
      return <LoginScreen onConnect={handleConnect} error={loginError} isConnecting={isConnecting} />;

    case "lobby":
      return <LobbyScreen walletAddress={walletAddress} onDisconnect={handleDisconnect} onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />;

    case "waiting":
      return (
        <WaitingRoomScreen
          topic={topicTitle || topicInfo.label} topicIcon={topicInfo.icon}
          roomId={roomId} players={waitingPlayers} questionCount={questionCount}
          isHost={isHost} isStarting={isStarting} currentPlayerAddress={walletAddress}
          onStartGame={handleStartGame}
          onLeave={() => { if (waitingPollRef.current) clearInterval(waitingPollRef.current); setScreen("lobby"); }}
        />
      );

    case "game":
      return (
        <GameScreen
          currentQuestion={currentQIndex + 1} totalQuestions={NUM_QUESTIONS}
          question={currentQ?.text || "Loading question…"}
          difficulty={(currentQ?.difficulty as "easy" | "medium" | "hard") || "medium"}
          timeLeft={timeLeft} totalTime={QUESTION_TIME_MS / 1000}
          score={score} submitting={submitting}
          liveScores={liveScores.length > 0 ? liveScores : undefined}
          currentPlayerAddress={walletAddress}
          onSubmitAnswer={handleSubmitAnswer}
          feedback={feedback} onDismissFeedback={handleDismissFeedback}
        />
      );

    case "leaderboard":
      return (
        <LeaderboardScreen
          topic={lbTopic} entries={leaderboard}
          currentPlayerAddress={walletAddress}
          correctAnswers={correctAnswers.length > 0 ? correctAnswers : undefined}
          onPlayAgain={handlePlayAgain}
        />
      );
  }
}
