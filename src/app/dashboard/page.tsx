import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ALERTS, getStats, type Alert, type AlertStatus } from "@/lib/dashboard-data";

export const metadata: Metadata = {
  title: "Dashboard — Bankify",
  description:
    "Review transfers Bankify has flagged, held, or cleared across your accounts.",
};

const STATUS_COPY: Record<
  AlertStatus,
  { label: string; badge: string; dot: string }
> = {
  held: {
    label: "Held",
    badge: "bg-rose-400/10 text-rose-300 border-rose-400/30",
    dot: "bg-rose-400",
  },
  reviewing: {
    label: "Reviewing",
    badge: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    dot: "bg-amber-400",
  },
  cleared: {
    label: "Cleared",
    badge: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    dot: "bg-emerald-400",
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const status = STATUS_COPY[alert.status];
  return (
    <li className="flex flex-col gap-3 border-b border-white/5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          <p className="truncate text-sm font-semibold text-white">
            {alert.recipient}
          </p>
        </div>
        <p className="mt-1 text-sm text-slate-400">{alert.reason}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4 sm:gap-6">
        <div className="text-right">
          <p className="text-sm font-semibold text-white">
            {formatCurrency(alert.amount)}
          </p>
          <p className="text-xs text-slate-500">{alert.date}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-300">
            {alert.score}
            <span className="text-slate-600">/100</span>
          </p>
          <p className="text-xs text-slate-500">risk score</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status.badge}`}
        >
          {status.label}
        </span>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const stats = getStats(ALERTS);

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                Dashboard
              </h1>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Account activity, screened and explained.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400">
              Sample data for demonstration
            </span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Transfers screened" value={`${stats.screened}`} />
            <StatCard label="Held for review" value={`${stats.held}`} />
            <StatCard label="In review" value={`${stats.reviewing}`} />
            <StatCard
              label="Amount protected"
              value={formatCurrency(stats.protectedAmount)}
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Recent activity
              </h2>
              <span className="text-xs text-slate-500">
                {ALERTS.length} transfers
              </span>
            </div>
            <ul className="mt-4">
              {ALERTS.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
