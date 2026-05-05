import { TransactionStatus } from "genlayer-js/types";
import { getReadClient, getWriteClient } from "./chain.js";
import { CONTRACT_ADDRESS } from "./config.js";

const ADDR = CONTRACT_ADDRESS;

// ── Reads (no wallet needed) ──────────────────────────────────────────────────

export async function getRoomInfo(roomId) {
  const raw = await getReadClient().readContract({
    address: ADDR,
    functionName: "get_room_info",
    args: [roomId],
  });
  return JSON.parse(raw);
}

export async function getQuestion(roomId, qIndex) {
  const raw = await getReadClient().readContract({
    address: ADDR,
    functionName: "get_question",
    args: [roomId, qIndex],
  });
  return JSON.parse(raw);
}

export async function getPlayerAnswer(roomId, player, qIndex) {
  const raw = await getReadClient().readContract({
    address: ADDR,
    functionName: "get_player_answer",
    args: [roomId, player, qIndex],
  });
  return JSON.parse(raw);
}

export async function getLeaderboard(roomId) {
  const raw = await getReadClient().readContract({
    address: ADDR,
    functionName: "get_leaderboard",
    args: [roomId],
  });
  return JSON.parse(raw);
}

// ── Writes (wallet required) ──────────────────────────────────────────────────

async function sendTx(functionName, args) {
  const client = getWriteClient();
  const hash = await client.writeContract({
    address: ADDR,
    functionName,
    args,
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

  // Check if contract execution itself succeeded (TX can be ACCEPTED but contract errored)
  const leaderReceipt = receipt.consensus_data?.leader_receipt;
  const leaders = Array.isArray(leaderReceipt) ? leaderReceipt : leaderReceipt ? [leaderReceipt] : [];
  for (const lr of leaders) {
    if (lr.execution_result === "ERROR" || lr.result?.status === "contract_error") {
      const payload = lr.result?.payload || "Contract execution failed";
      throw new Error(payload);
    }
  }

  return receipt;
}

export const createRoom    = (roomId, topic)                      => sendTx("create_room",    [roomId, topic]);
export const joinRoom      = (roomId)                             => sendTx("join_room",      [roomId]);
export const startGame     = (roomId)                             => sendTx("start_game",     [roomId]);
export const submitAnswer  = (roomId, qIndex, answer, timeMs)    => sendTx("submit_answer",  [roomId, qIndex, answer, timeMs]);
export const finishGame    = (roomId)                             => sendTx("finish_game",    [roomId]);
