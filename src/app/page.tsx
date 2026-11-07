import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ShieldIcon } from "@/components/shield-icon";

const steps = [
  {
    title: "Listen & Analyze",
    description:
      "When a call, video, or message triggers a transfer, Bankify analyzes the voice, video, and language patterns in real time for signs of AI synthesis.",
  },
  {
    title: "Cross-Check the Request",
    description:
      "The request is compared against the account holder's normal behavior — typical amounts, recipients, timing, and phrasing — to spot anything out of character.",
  },
  {
    title: "Flag & Pause",
    description:
      "If something looks synthetic or suspicious, the transfer is automatically held before funds move, instead of after the money is already gone.",
  },
  {
    title: "Alert the Right People",
    description:
      "The account holder and their bank get a clear, plain-language explanation of what was flagged and why, so they can confirm or cancel with confidence.",
  },
];

const features = [
  {
    title: "Voice clone detection",
    description:
      "Identifies the subtle artifacts AI voice generators leave behind, even when a cloned voice sounds convincing to the human ear.",
  },
  {
    title: "Video call verification",
    description:
      "Spots deepfake video calls and face-swap manipulation used to impersonate executives, relatives, or bank staff.",
  },
  {
    title: "Transaction circuit breaker",
    description:
      "Puts a short hold on a suspicious transfer automatically, giving the real account holder a chance to double-check before money moves.",
  },
  {
    title: "Plain-language alerts",
    description:
      "No jargon, no alarm fatigue. Every flag explains exactly what looked wrong, in language anyone can understand and act on.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <Hero />
      <HowItWorks />
      <Features />
      <Trust />
      <CallToAction />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-20 pb-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Built for banks, credit unions, and everyday account holders
        </div>
        <h1 className="max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl">
          Stop AI scams before the money moves.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Bankify quietly screens calls, video, and messages for deepfake
          voices and AI impersonation, then puts a suspicious transfer on
          hold before it ever leaves the account — no alarm bells, no
          disruption to legitimate transactions.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="#get-started"
            className="rounded-full bg-emerald-500 px-7 py-3 text-base font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Protect your accounts
          </a>
          <Link
            href="/demo"
            className="rounded-full border border-white/15 px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-white/5"
          >
            Try the live demo
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          Runs quietly in the background. No app switching, no extra steps
          for legitimate transfers.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-white/5 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
            How it works
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Four quiet checks, one calm outcome.
          </p>
        </div>
        <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-sm font-semibold text-emerald-300">
                {index + 1}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-t border-white/5 bg-white/[0.02] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
            What it catches
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Scams built to sound credible. Caught anyway.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-7"
            >
              <h3 className="text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section id="trust" className="border-t border-white/5 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Trust &amp; security
            </h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Designed to earn trust, not just claim it.
            </p>
            <p className="mt-5 text-slate-300">
              Bankify is designed around the same principles banks already
              hold themselves to: encrypted data in transit and at rest,
              least-privilege access to account data, and clear audit trails
              for every flagged transaction. Detection decisions are
              explainable, not a black box — every alert comes with a reason.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              "Encrypted by design",
              "Explainable alerts",
              "No data sold, ever",
              "Human review on every flag",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-5"
              >
                <ShieldIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section
      id="get-started"
      className="border-t border-white/5 bg-gradient-to-b from-emerald-500/10 to-transparent py-24"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Give every transfer a second, quiet look.
        </h2>
        <p className="mt-4 text-slate-300">
          Whether you&apos;re a bank protecting thousands of accounts or a
          family protecting one, Bankify stands between a convincing scam and
          a real loss.
        </p>
        <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-full border border-white/15 bg-slate-900/60 px-5 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none sm:w-80"
          />
          <button
            type="submit"
            className="rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Request early access
          </button>
        </form>
      </div>
    </section>
  );
}
