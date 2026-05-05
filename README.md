# 📰⚡ NewsBlitz

> **AI-powered multiplayer trivia game built on GenLayer** — questions generated live from real news, answers judged on-chain by AI validators.

![GenLayer](https://img.shields.io/badge/GenLayer-Studionet-6366f1?style=flat-square)
![Python](https://img.shields.io/badge/Contract-Python-3776ab?style=flat-square)
![Vite](https://img.shields.io/badge/Frontend-Vite%20%2B%20JS-646cff?style=flat-square)
![MetaMask](https://img.shields.io/badge/Wallet-MetaMask-f6851b?style=flat-square)

---

## What is NewsBlitz?

NewsBlitz is a real-time multiplayer trivia game where every question is freshly generated from today's news using an on-chain AI. Players compete in rooms, answer 10 questions against the clock, and get their answers judged by GenLayer's AI validator consensus network.

**No pre-made question banks. Every game is unique.**

---

## How It Works

1. **Host creates a room** — the GenLayer Intelligent Contract fetches live news via RSS, calls an LLM to generate 10 trivia questions, and stores them on-chain
2. **Players join** — up to 8 players per room
3. **Game starts** — 10 questions, 15 seconds each, answers typed freely
4. **AI judges** — each submitted answer goes through GenLayer's consensus: multiple validator nodes independently run an LLM to decide correct/incorrect
5. **Leaderboard** — final scores, correct answers, and XP rewards shown on-chain

---

## Topics

| Topic | News Source |
|-------|------------|
| 🌍 World News | BBC World RSS |
| ⚽ Sports | Google News (sports) |
| 📈 Business | Google News (business/finance) |

---

## Tech Stack

### Intelligent Contract (`contracts/news_blitz.py`)
- **Python** on GenLayer's GenVM
- `TreeMap[str, str]` for on-chain room/player storage
- `gl.nondet.web.get()` — live RSS feed fetching
- `gl.nondet.exec_prompt()` — LLM question generation & answer judging
- `gl.vm.run_nondet_unsafe()` — custom consensus: structural validation for question generation, independent LLM re-run for answer judging

### Frontend (`frontend/`)
- Vanilla JS + **Vite**
- **genlayer-js SDK** for contract reads/writes
- **MetaMask** wallet adapter (GenLayer Studionet network auto-added)
- No frameworks — lightweight and fast

---

## Project Structure

```
├── contracts/
│   └── news_blitz.py        # GenLayer Intelligent Contract
├── frontend/
│   ├── index.html           # 5 screens: Login, Lobby, Waiting, Game, Leaderboard
│   └── src/
│       ├── main.js          # Game logic & UI
│       ├── contract.js      # Contract read/write calls
│       ├── chain.js         # MetaMask + genlayer-js client
│       ├── config.js        # Contract address & constants
│       └── style.css        # Dark gaming UI
├── deploy.cjs               # Deployment script (genlayer-js)
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- GenLayer Studionet testnet GEN tokens → [faucet](https://testnet-faucet.genlayer.foundation)

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — connect MetaMask (GenLayer Studio network added automatically).

### Deploy Contract

```bash
npm install
node deploy.cjs
```

Updates `frontend/src/config.js` with the new contract address automatically.

---

## Gameplay

```
Create Room  →  Auto-join as host  →  Share room ID
     ↓
Other players join  →  Host clicks Start
     ↓
10 questions × 15s timer  →  Submit answers
     ↓
GenLayer AI validators judge each answer on-chain
     ↓
Final leaderboard with scores + XP
```

**Scoring:**
- Base: 100 pts per correct answer
- Time bonus: up to +100 pts (faster = more points)
- Difficulty multiplier: Easy ×1 / Medium ×2 / Hard ×3

**XP Rewards:** 🥇 100 XP · 🥈 60 XP · 🥉 40 XP · and more

---

## Contract on GenLayer Studionet

```
0xC0C3A09b112DBF93dCE3f07f1041E452d7bCC51D
```

---

## Built With

- [GenLayer](https://genlayer.com) — AI-native blockchain
- [genlayer-js](https://github.com/genlayerlabs/genlayer-js) — JavaScript SDK
- [BBC News RSS](https://www.bbc.com/news/10628494) — World news feed
- [Google News RSS](https://news.google.com/rss) — Sports & Business feeds
