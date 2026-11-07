"use client";

import { useState } from "react";
import { analyzeText, type AnalysisResult } from "@/lib/scam-signals";
import { EXAMPLES } from "@/lib/demo-examples";

type Status = "idle" | "analyzing" | "done";

const ANALYZING_STEPS = [
  "Listening to language patterns...",
  "Cross-checking against normal request behavior...",
  "Scoring risk signals...",
];

const TIER_COPY = {
  low: {
    label: "Looks legitimate",
    description:
      "No significant scam signals detected. This transfer would proceed normally.",
    scoreText: "text-emerald-300",
    bar: "bg-emerald-400",
    badge: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  },
  medium: {
    label: "Review suggested",
    description:
      "Some signals consistent with scam scripts were found. Bankify would surface this for a quick second look before the transfer completes.",
    scoreText: "text-amber-300",
    bar: "bg-amber-400",
    badge: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  },
  high: {
    label: "Transfer held for review",
    description:
      "Multiple strong scam signals detected. Bankify would pause this transfer and alert the account holder before any funds move.",
    scoreText: "text-rose-300",
    bar: "bg-rose-400",
    badge: "bg-rose-400/10 text-rose-300 border-rose-400/30",
  },
} as const;

function extractAmount(text: string): string | null {
  const match = text.match(/\$[0-9][0-9,]*/);
  return match ? match[0] : null;
}

export function DemoClient() {
  const [text, setText] = useState<string>(EXAMPLES[0].text);
  const [status, setStatus] = useState<Status>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function handleAnalyze() {
    if (!text.trim() || status === "analyzing") return;
    setStatus("analyzing");
    setResult(null);
    setStep(0);

    let currentStep = 0;
    const stepTimer = window.setInterval(() => {
      currentStep += 1;
      if (currentStep < ANALYZING_STEPS.length) {
        setStep(currentStep);
      }
    }, 450);

    window.setTimeout(() => {
      window.clearInterval(stepTimer);
      setResult(analyzeText(text));
      setStatus("done");
    }, 450 * ANALYZING_STEPS.length);
  }

  const amount = result ? extractAmount(text) : null;
  const tierCopy = result ? TIER_COPY[result.tier] : null;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8">
        <label
          htmlFor="demo-input"
          className="text-sm font-semibold text-white"
        >
          Call, message, or request text
        </label>
        <p className="mt-1 text-sm text-slate-400">
          Paste in a transcript, or try one of the examples below.
        </p>
        <textarea
          id="demo-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-200 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          placeholder="Paste a call transcript or message here..."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => setText(example.text)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-emerald-400/40 hover:text-white"
            >
              {example.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={status === "analyzing" || !text.trim()}
          className="mt-6 w-full rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "analyzing" ? "Analyzing..." : "Analyze this request"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 lg:min-h-[420px]">
        {status === "idle" && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
            <p className="text-sm text-slate-500">
              Results will appear here once you run an analysis.
            </p>
          </div>
        )}

        {status === "analyzing" && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
            <p className="text-sm font-medium text-slate-300">
              {ANALYZING_STEPS[step]}
            </p>
          </div>
        )}

        {status === "done" && result && tierCopy && (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Risk score
                </p>
                <p
                  className={`font-heading mt-1 text-4xl font-semibold ${tierCopy.scoreText}`}
                >
                  {result.score}
                  <span className="text-lg text-slate-500">/100</span>
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tierCopy.badge}`}
              >
                {tierCopy.label}
              </span>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tierCopy.bar}`}
                style={{ width: `${result.score}%` }}
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              {tierCopy.description}
            </p>

            {result.tier === "high" && (
              <div className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
                Transfer{amount ? ` of ${amount}` : ""} paused pending
                confirmation from the account holder.
              </div>
            )}

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Detected signals
              </p>
              {result.matched.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  No red flags detected in this message.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {result.matched.map((signal) => (
                    <li
                      key={signal.id}
                      className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                    >
                      <p className="text-sm font-semibold text-white">
                        {signal.label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {signal.explanation}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
