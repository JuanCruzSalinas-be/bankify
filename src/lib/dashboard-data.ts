export type AlertStatus = "held" | "reviewing" | "cleared";
export type Channel = "Voice call" | "Video call";

export type Alert = {
  id: string;
  claimedIdentity: string;
  channel: Channel;
  amount: number;
  date: string;
  score: number;
  status: AlertStatus;
  flaggedAt: string | null;
  reason: string;
};

export const TOTAL_CALLS_SCREENED_THIS_MONTH = 86;

export const ALERTS: Alert[] = [
  {
    id: "call-2041",
    claimedIdentity: "Senior government office (international wire)",
    channel: "Video call",
    amount: 250000,
    date: "Nov 6",
    score: 96,
    status: "held",
    flaggedAt: "0:41 into call",
    reason:
      "Face-swap artifacts on video feed, voice print mismatch against reference sample, extreme urgency and confidentiality request",
  },
  {
    id: "call-2037",
    claimedIdentity: "Partner bank executive",
    channel: "Voice call",
    amount: 180000,
    date: "Nov 5",
    score: 88,
    status: "held",
    flaggedAt: "1:12 into call",
    reason:
      "Real-time voice-clone artifacts detected, request to settle via an unverified holding account",
  },
  {
    id: "call-2030",
    claimedIdentity: "Regional CFO, Northfield Holdings",
    channel: "Voice call",
    amount: 45000,
    date: "Nov 4",
    score: 54,
    status: "reviewing",
    flaggedAt: "2:05 into call",
    reason:
      "Minor voice pattern irregularities, request inconsistent with this caller's prior history",
  },
  {
    id: "call-2024",
    claimedIdentity: "CFO, Northfield Holdings (verified)",
    channel: "Video call",
    amount: 12000,
    date: "Nov 3",
    score: 8,
    status: "cleared",
    flaggedAt: null,
    reason: "Voice and face matched reference sample, routine quarterly settlement",
  },
  {
    id: "call-2018",
    claimedIdentity: "Operations lead, Vantage Partners (verified)",
    channel: "Voice call",
    amount: 3200,
    date: "Nov 1",
    score: 0,
    status: "cleared",
    flaggedAt: null,
    reason: "No signals detected, consistent with past activity",
  },
  {
    id: "call-2011",
    claimedIdentity: "Client relationship manager (verified)",
    channel: "Voice call",
    amount: 900,
    date: "Oct 29",
    score: 0,
    status: "cleared",
    flaggedAt: null,
    reason: "No signals detected",
  },
];

export function getStats(alerts: Alert[]) {
  const held = alerts.filter((a) => a.status === "held");
  const reviewing = alerts.filter((a) => a.status === "reviewing");
  const protectedAmount = held.reduce((sum, a) => sum + a.amount, 0);

  return {
    screened: TOTAL_CALLS_SCREENED_THIS_MONTH,
    held: held.length,
    reviewing: reviewing.length,
    protectedAmount,
  };
}
