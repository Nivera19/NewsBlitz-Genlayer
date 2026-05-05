// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TransactionStatus } from "genlayer-js/types";
import { getReadClient, getWriteClient } from "./chain";
import { CONTRACT_ADDRESS } from "./config";

const ADDR = CONTRACT_ADDRESS;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoomInfo {
  room_id:        string;
  topic:          string;
  topic_title:    string;
  host:           string;
  status:         "waiting" | "playing" | "finished";
  player_count:   number;
  question_count: number;
  players:        string[];
}

export interface Question {
  index:          number;
  total:          number;
  text:           string;
  difficulty:     "easy" | "medium" | "hard";
  correct_answer?: string;
}

export interface PlayerAnswer {
  found:    boolean;
  q_index?: number;
  answer?:  string;
  correct?: boolean;
  points?:  number;
  time_ms?: number;
}

export interface LeaderboardEntry {
  rank:      number;
  address:   string;
  score:     number;
  correct:   number;
  answered:  number;
  xp_earned: number;
}

export interface Leaderboard {
  room_id:     string;
  topic_title: string;
  status:      string;
  leaderboard: LeaderboardEntry[];
}

// ── Reads (no wallet needed) ──────────────────────────────────────────────────

export async function getRoomInfo(roomId: string): Promise<RoomInfo> {
  const raw = await getReadClient().readContract({
    address: ADDR,
    functionName: "get_room_info",
    args: [roomId],
  });
  return JSON.parse(raw as string) as RoomInfo;
}

export async function getQuestion(roomId: string, qIndex: number): Promise<Question> {
  const raw = await getReadClient().readContract({
    address: ADDR,
    functionName: "get_question",
    args: [roomId, qIndex],
  });
  return JSON.parse(raw as string) as Question;
}

export async function getPlayerAnswer(
  roomId: string,
  player: string,
  qIndex: number
): Promise<PlayerAnswer> {
  const raw = await getReadClient().readContract({
    address: ADDR,
    functionName: "get_player_answer",
    args: [roomId, player, qIndex],
  });
  return JSON.parse(raw as string) as PlayerAnswer;
}

export async function getLeaderboard(roomId: string): Promise<Leaderboard> {
  const raw = await getReadClient().readContract({
    address: ADDR,
    functionName: "get_leaderboard",
    args: [roomId],
  });
  return JSON.parse(raw as string) as Leaderboard;
}

// ── Writes (wallet required) ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendTx(functionName: string, args: unknown[]): Promise<any> {
  const client = getWriteClient();
  const hash = await client.writeContract({
    address: ADDR as `0x${string}`,
    functionName,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: args as any[],
    value: BigInt(0),
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
  });

  const ok =
    receipt.status === 5 ||
    receipt.status === 6 ||
    receipt.statusName === "ACCEPTED" ||
    receipt.statusName === "FINALIZED";
  if (!ok) throw new Error(`Transaction failed: ${receipt.statusName}`);

  // Check if contract execution itself succeeded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = receipt as any;
  const leaderReceipt = r.consensus_data?.leader_receipt;
  const leaders = Array.isArray(leaderReceipt)
    ? leaderReceipt
    : leaderReceipt
    ? [leaderReceipt]
    : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const lr of leaders as any[]) {
    if (
      lr.execution_result === "ERROR" ||
      lr.result?.status === "contract_error"
    ) {
      const payload = lr.result?.payload || "Contract execution failed";
      throw new Error(payload);
    }
  }

  return receipt;
}

export const createRoom   = (roomId: string, topic: string)                           => sendTx("create_room",   [roomId, topic]);
export const joinRoom     = (roomId: string)                                           => sendTx("join_room",     [roomId]);
export const startGame    = (roomId: string)                                           => sendTx("start_game",    [roomId]);
export const submitAnswer = (roomId: string, qIndex: number, answer: string, timeMs: number) => sendTx("submit_answer", [roomId, qIndex, answer, timeMs]);
export const finishGame   = (roomId: string)                                           => sendTx("finish_game",   [roomId]);
