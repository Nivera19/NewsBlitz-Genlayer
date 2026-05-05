import { connectMetaMask, disconnect, getConnectedAddress, isConnected } from "./chain.js";
import {
  createRoom, joinRoom, startGame, submitAnswer, finishGame,
  getRoomInfo, getQuestion, getLeaderboard, getPlayerAnswer,
} from "./contract.js";
import { QUESTION_TIME_MS, NUM_QUESTIONS } from "./config.js";

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  roomId:        null,
  isHost:        false,
  currentQ:      0,
  myScore:       0,
  answerStart:   0,
  timerInterval: null,
  pollInterval:  null,
  answered:      false,
};

// ── DOM ────────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showScreen(name) {
  ["login","lobby","waiting","game","leaderboard"].forEach((s) => {
    $(`screen-${s}`)?.classList.toggle("active", s === name);
  });
}

function showSpinner(msg = "Processing on GenLayer...") {
  $("spinner-msg").textContent = msg;
  $("spinner").classList.remove("hidden");
}
function hideSpinner() { $("spinner").classList.add("hidden"); }

function setStatus(id, msg, type = "") {
  const el = $(id);
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function showLoginError(msg) {
  const el = $("login-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}
function hideLoginError() { $("login-error").classList.add("hidden"); }

// ── WALLET CONNECT ─────────────────────────────────────────────────────────────
$("btn-metamask").addEventListener("click", async () => {
  hideLoginError();
  const btn = $("btn-metamask");
  btn.classList.add("loading");
  btn.querySelector(".wallet-name").textContent = "Connecting…";

  try {
    const address = await connectMetaMask();
    $("nav-address").textContent = shortAddr(address);
    showScreen("lobby");
  } catch (e) {
    showLoginError(e.message);
    btn.classList.remove("loading");
    btn.querySelector(".wallet-name").textContent = "MetaMask";
  }
});

// Handle wallet changes / disconnects
window.addEventListener("wallet:disconnected", () => {
  showScreen("login");
  $("btn-metamask").classList.remove("loading");
  $("btn-metamask").querySelector(".wallet-name").textContent = "MetaMask";
});

window.addEventListener("wallet:changed", (e) => {
  $("nav-address").textContent = shortAddr(e.detail);
});

// ── LOGOUT ─────────────────────────────────────────────────────────────────────
$("btn-logout").addEventListener("click", () => {
  disconnect();
  showScreen("login");
});

// ── LOBBY: Create Room ─────────────────────────────────────────────────────────
$("btn-create").addEventListener("click", async () => {
  const roomId = $("input-room-id-create").value.trim();
  const topic  = $("input-topic").value;
  if (!roomId) { setStatus("create-status", "Enter a room ID", "error"); return; }

  $("btn-create").disabled = true;
  setStatus("create-status", "Fetching live news + generating questions via AI…", "loading");
  showSpinner("Fetching live news & generating questions…\nThis takes ~30s on GenLayer.");

  try {
    await createRoom(roomId, topic);
    showSpinner("Joining room as host…");
    await joinRoom(roomId);
    hideSpinner();
    setStatus("create-status", "Room created!", "success");
    state.roomId = roomId;
    state.isHost = true;
    await enterWaitingRoom();
  } catch (e) {
    hideSpinner();
    setStatus("create-status", "Error: " + e.message, "error");
    $("btn-create").disabled = false;
  }
});

// ── LOBBY: Join Room ───────────────────────────────────────────────────────────
$("btn-join").addEventListener("click", async () => {
  const roomId = $("input-room-id-join").value.trim();
  if (!roomId) { setStatus("join-status", "Enter a room ID", "error"); return; }

  $("btn-join").disabled = true;
  setStatus("join-status", "Joining room…", "loading");
  showSpinner("Joining room…");

  try {
    await joinRoom(roomId);
    hideSpinner();
    state.roomId = roomId;
    state.isHost = false;
    await enterWaitingRoom();
  } catch (e) {
    hideSpinner();
    setStatus("join-status", "Error: " + e.message, "error");
    $("btn-join").disabled = false;
  }
});

// ── WAITING ROOM ───────────────────────────────────────────────────────────────
async function enterWaitingRoom() {
  showScreen("waiting");
  $("waiting-room-label").textContent = `Room: ${state.roomId}`;
  $("host-controls").classList.toggle("hidden", !state.isHost);
  $("player-waiting-msg").classList.toggle("hidden", state.isHost);

  await refreshWaiting();
  state.pollInterval = setInterval(async () => {
    const info = await refreshWaiting();
    if (info?.status === "playing") {
      clearInterval(state.pollInterval);
      await startClientGame();
    }
  }, 4000);
}

async function refreshWaiting() {
  try {
    const info = await getRoomInfo(state.roomId);
    const icons = { world:"🌍", technology:"💻", science:"🔬", sports:"⚽", business:"📈" };
    $("waiting-topic-icon").textContent = icons[info.topic] || "📰";
    $("waiting-topic-title").textContent = info.topic_title;
    $("waiting-topic-sub").textContent = `${info.player_count}/8 players · ${info.question_count} questions`;

    const list = $("players-list");
    list.innerHTML = "";
    for (const addr of info.players) {
      const row = document.createElement("div");
      row.className = "player-row";
      const isHost = addr === info.host;
      row.innerHTML = `
        <div class="avatar">${addr.slice(2,4).toUpperCase()}</div>
        <span class="addr">${shortAddr(addr)}</span>
        ${isHost ? '<span class="host-badge">HOST</span>' : ""}
      `;
      list.appendChild(row);
    }
    return info;
  } catch { return null; }
}

$("btn-start").addEventListener("click", async () => {
  $("btn-start").disabled = true;
  showSpinner("Starting game…");
  try {
    await startGame(state.roomId);
    hideSpinner();
    clearInterval(state.pollInterval);
    await startClientGame();
  } catch (e) {
    hideSpinner();
    $("btn-start").disabled = false;
    alert("Error: " + e.message);
  }
});

// ── GAME ───────────────────────────────────────────────────────────────────────
async function startClientGame() {
  state.currentQ = 0;
  state.myScore  = 0;
  state.answered = false;
  showScreen("game");
  await loadQuestion(0);
}

async function loadQuestion(qIndex) {
  state.answered = false;
  $("input-answer").value = "";
  $("input-answer").disabled = false;
  $("btn-submit-answer").disabled = false;
  $("feedback-overlay").classList.add("hidden");
  $("input-answer").focus();

  $("progress-bar").style.width = `${(qIndex / NUM_QUESTIONS) * 100}%`;
  $("score-display").textContent = `${state.myScore} pts`;

  try {
    const q = await getQuestion(state.roomId, qIndex);
    $("q-number").textContent    = `Q${qIndex + 1} / ${q.total}`;
    $("q-text").textContent      = q.text;
    const badge = $("q-difficulty");
    badge.textContent = q.difficulty;
    badge.className   = `difficulty-badge ${q.difficulty}`;

    state.answerStart = Date.now();
    startTimer(QUESTION_TIME_MS);
  } catch (e) {
    alert("Error loading question: " + e.message);
  }
}

function startTimer(ms) {
  clearInterval(state.timerInterval);
  const circ  = 276.5;
  const circle  = $("timer-circle");
  const display = $("timer-text");
  const start   = Date.now();
  circle.classList.remove("warn", "danger");

  state.timerInterval = setInterval(() => {
    const rem   = Math.max(0, ms - (Date.now() - start));
    const ratio = rem / ms;
    display.textContent = Math.ceil(rem / 1000);
    circle.style.strokeDashoffset = circ * (1 - ratio);
    if (ratio < 0.33) { circle.classList.add("danger"); circle.classList.remove("warn"); }
    else if (ratio < 0.6) { circle.classList.add("warn"); circle.classList.remove("danger"); }
    if (rem <= 0) { clearInterval(state.timerInterval); if (!state.answered) doSubmit(""); }
  }, 100);
}

async function doSubmit(answer) {
  if (state.answered) return;
  state.answered = true;
  clearInterval(state.timerInterval);
  const timeMs = Date.now() - state.answerStart;
  $("input-answer").disabled      = true;
  $("btn-submit-answer").disabled = true;

  const isTimeout = answer === "";

  const overlay = $("feedback-overlay");
  overlay.classList.remove("hidden");

  if (isTimeout) {
    $("feedback-icon").textContent   = "⏰";
    $("feedback-msg").textContent    = "Time's up!";
    $("feedback-points").textContent = "+0 pts";
    setTimeout(() => advanceQuestion(), 1800);
  } else {
    $("feedback-icon").textContent   = "⏳";
    $("feedback-msg").textContent    = "AI validators judging on GenLayer…";
    $("feedback-points").textContent = "";

    showSpinner("Validating answer on GenLayer…");
    try {
      await submitAnswer(state.roomId, state.currentQ, answer, timeMs);
      hideSpinner();
      // Read the on-chain result to show feedback
      try {
        const playerAddr = getConnectedAddress();
        const res = await getPlayerAnswer(state.roomId, playerAddr, state.currentQ);
        if (res.found) {
          $("feedback-icon").textContent   = res.correct ? "✅" : "❌";
          $("feedback-msg").textContent    = res.correct ? "Correct!" : "Wrong answer";
          $("feedback-points").textContent = res.correct ? `+${res.points} pts` : "+0 pts";
          state.myScore += res.points || 0;
          $("score-display").textContent = `${state.myScore} pts`;
        } else {
          $("feedback-icon").textContent   = "🤖";
          $("feedback-msg").textContent    = "Judged on-chain";
          $("feedback-points").textContent = "";
        }
      } catch {
        $("feedback-icon").textContent   = "🤖";
        $("feedback-msg").textContent    = "Judged on-chain";
        $("feedback-points").textContent = "";
      }
    } catch (e) {
      hideSpinner();
      $("feedback-icon").textContent   = "⚠️";
      $("feedback-msg").textContent    = "TX failed — skipping";
      $("feedback-points").textContent = "";
    }
    setTimeout(() => advanceQuestion(), 2500);
  }

  async function advanceQuestion() {
    overlay.classList.add("hidden");
    const next = state.currentQ + 1;
    if (next < NUM_QUESTIONS) {
      state.currentQ = next;
      await loadQuestion(next);
    } else {
      await endGame();
    }
  }
}

$("btn-submit-answer").addEventListener("click", () => {
  const ans = $("input-answer").value.trim();
  if (!ans) return;
  doSubmit(ans);
});
$("input-answer").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btn-submit-answer").click();
});

// ── LEADERBOARD ────────────────────────────────────────────────────────────────
async function endGame() {
  showScreen("leaderboard");
  $("leaderboard-table").innerHTML = "";
  $("lb-topic").textContent = "Loading results…";

  showSpinner("Finishing game…");
  try { if (state.isHost) await finishGame(state.roomId); } catch { /* ok */ }
  hideSpinner();

  try {
    const lb = await getLeaderboard(state.roomId);
    $("lb-topic").textContent = `Topic: ${lb.topic_title}`;
    const table = $("leaderboard-table");
    const emoji = ["🥇","🥈","🥉"];
    const me    = getConnectedAddress()?.toLowerCase();

    if (!lb.leaderboard || lb.leaderboard.length === 0) {
      table.innerHTML = `<div class="lb-row"><span style="color:#aaa">No scores recorded.</span></div>`;
      return;
    }

    for (const p of lb.leaderboard) {
      const row = document.createElement("div");
      row.className = `lb-row rank-${p.rank}`;
      const isMe = p.address.toLowerCase() === me;
      row.innerHTML = `
        <span class="lb-rank">${emoji[p.rank-1] || `#${p.rank}`}</span>
        <div class="lb-info">
          <div>${shortAddr(p.address)}${isMe ? " <strong>(You)</strong>" : ""}</div>
          <div class="lb-stats">${p.correct}/${NUM_QUESTIONS} correct · ${p.answered} answered</div>
        </div>
        <span class="lb-score">${p.score.toLocaleString()} pts</span>
        <span class="lb-xp">+${p.xp_earned} XP</span>
      `;
      table.appendChild(row);
    }
  } catch (e) {
    $("lb-topic").textContent = "Error: " + e.message;
  }
}

$("btn-play-again").addEventListener("click", () => {
  state.roomId = null;
  state.isHost = false;
  showScreen("lobby");
});

// ── BOOT ───────────────────────────────────────────────────────────────────────
showScreen("login");
