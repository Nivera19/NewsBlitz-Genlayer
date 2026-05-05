// Update CONTRACT_ADDRESS after running: node deploy.cjs (from root)
export const CONTRACT_ADDRESS = "0xC0C3A09b112DBF93dCE3f07f1041E452d7bCC51D";

export const TOPICS = [
  { value: "world",    label: "🌍 World News", icon: "🌍" },
  { value: "sports",   label: "⚽ Sports",      icon: "⚽" },
  { value: "business", label: "📈 Business",    icon: "📈" },
] as const;

export const QUESTION_TIME_MS = 15000; // 15 seconds per question
export const NUM_QUESTIONS     = 10;
