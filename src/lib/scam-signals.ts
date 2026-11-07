export type Signal = {
  id: string;
  label: string;
  explanation: string;
  weight: number;
  pattern: RegExp;
};

export const SIGNALS: Signal[] = [
  {
    id: "urgency",
    label: "Manufactured urgency",
    explanation:
      "Phrases pushing the listener to act immediately, with no time to verify or think it over.",
    weight: 20,
    pattern:
      /\b(right now|immediately|urgent|urgently|don't hang up|act now|as soon as possible|hurry|time[- ]sensitive)\b/i,
  },
  {
    id: "secrecy",
    label: "Request for secrecy",
    explanation:
      "Asks the listener to keep the request hidden from family, coworkers, or the bank itself — a common tactic to prevent a reality check.",
    weight: 25,
    pattern:
      /\b(don't tell|keep this (between us|confidential)|don't (discuss|mention)|tell no one|don't tell anyone)\b/i,
  },
  {
    id: "unusual-payment",
    label: "Untraceable payment method",
    explanation:
      "Gift cards, wire transfers, and cryptocurrency are hard to reverse and are the preferred payout method for scammers.",
    weight: 25,
    pattern: /\b(gift card|wire transfer|wire the funds|bitcoin|crypto(currency)?|cash app|western union)\b/i,
  },
  {
    id: "authority",
    label: "Authority impersonation",
    explanation:
      "Claims to be a bank, government agency, or executive to borrow trust and discourage questions.",
    weight: 15,
    pattern:
      /\b(irs|fraud department|bank security|law enforcement|arrested|bail|attorney|lawyer|ceo|executive)\b/i,
  },
  {
    id: "account-threat",
    label: "Account threat / pressure",
    explanation:
      "Warns that an account will be suspended, frozen, or closed unless the listener acts, creating fear-driven pressure.",
    weight: 15,
    pattern:
      /\b(suspend(ed)?|freeze|frozen|final notice|verify your account|confirm your (identity|account))\b/i,
  },
  {
    id: "isolation",
    label: "Emotional isolation tactic",
    explanation:
      "Targets a family emergency or personal crisis to short-circuit careful thinking.",
    weight: 15,
    pattern: /\b(grandma|grandpa|it's me|i'm in trouble|accident|emergency)\b/i,
  },
  {
    id: "amount",
    label: "Specific dollar amount requested",
    explanation:
      "A concrete, named figure requested verbally — consistent with a scripted ask rather than routine account activity.",
    weight: 10,
    pattern: /\$[0-9][0-9,]*/,
  },
];

export type AnalysisResult = {
  score: number;
  tier: "low" | "medium" | "high";
  matched: Signal[];
};

export function analyzeText(input: string): AnalysisResult {
  const matched = SIGNALS.filter((signal) => signal.pattern.test(input));
  const rawScore = matched.reduce((sum, signal) => sum + signal.weight, 0);
  const score = Math.min(100, rawScore);

  let tier: AnalysisResult["tier"] = "low";
  if (score >= 60) tier = "high";
  else if (score >= 30) tier = "medium";

  return { score, tier, matched };
}
