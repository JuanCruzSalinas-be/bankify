export type AlertStatus = "held" | "reviewing" | "cleared";

export type Alert = {
  id: string;
  recipient: string;
  amount: number;
  date: string;
  score: number;
  status: AlertStatus;
  reason: string;
};

export const TOTAL_SCREENED_THIS_MONTH = 214;

export const ALERTS: Alert[] = [
  {
    id: "txn-1042",
    recipient: "Unknown — gift card retailer",
    amount: 3000,
    date: "Nov 6",
    score: 100,
    status: "held",
    reason: "Secrecy request, untraceable payment, emotional urgency",
  },
  {
    id: "txn-1039",
    recipient: "New vendor account (unverified)",
    amount: 15000,
    date: "Nov 5",
    score: 75,
    status: "held",
    reason: "Executive impersonation, urgency, confidentiality request",
  },
  {
    id: "txn-1035",
    recipient: "\"Bank Security\" holding account",
    amount: 8400,
    date: "Nov 4",
    score: 55,
    status: "reviewing",
    reason: "Account threat language, authority impersonation",
  },
  {
    id: "txn-1031",
    recipient: "J. Alvarez — personal account",
    amount: 600,
    date: "Nov 3",
    score: 20,
    status: "cleared",
    reason: "Minor urgency language, consistent with past activity",
  },
  {
    id: "txn-1028",
    recipient: "Riverside Property Mgmt",
    amount: 1200,
    date: "Nov 1",
    score: 10,
    status: "cleared",
    reason: "Routine recurring transfer, no signals detected",
  },
  {
    id: "txn-1022",
    recipient: "M. Chen — personal account",
    amount: 250,
    date: "Oct 29",
    score: 0,
    status: "cleared",
    reason: "No signals detected",
  },
];

export function getStats(alerts: Alert[]) {
  const held = alerts.filter((a) => a.status === "held");
  const reviewing = alerts.filter((a) => a.status === "reviewing");
  const protectedAmount = held.reduce((sum, a) => sum + a.amount, 0);

  return {
    screened: TOTAL_SCREENED_THIS_MONTH,
    held: held.length,
    reviewing: reviewing.length,
    protectedAmount,
  };
}
