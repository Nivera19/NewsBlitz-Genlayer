// Update CONTRACT_ADDRESS after running: node deploy.cjs (from root)
export const CONTRACT_ADDRESS = "0x56dC94a54b673B6495850297c29d171E53002b64";

export const TOPICS = [
  { value: "world",    label: "🌍 World News", icon: "🌍" },
  { value: "sports",   label: "⚽ Sports",      icon: "⚽" },
  { value: "business", label: "📈 Business",    icon: "📈" },
] as const;

export const QUESTION_TIME_MS = 15000; // 15 seconds per question
export const NUM_QUESTIONS     = 10;
