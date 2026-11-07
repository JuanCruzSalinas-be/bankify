import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "About — Bankify",
  description:
    "The real-time AI impersonation threat Bankify exists to catch, and how in-call detection works.",
};

const DETECTION_STEPS = [
  {
    title: "Live audio & video analysis",
    description:
      "Bankify analyzes the call's voice and video stream as it happens — not a recording reviewed after the money is already gone.",
  },
  {
    title: "Synthetic media detection",
    description:
      "Looks for the artifacts real-time voice-cloning and face-swap tools leave behind, even when the result sounds and looks convincing to a person.",
  },
  {
    title: "In-call alert",
    description:
      "If the call shows signs of synthetic impersonation, the account holder and their bank are alerted immediately, while the call is still in progress.",
  },
  {
    title: "Transfer hold",
    description:
      "The requested transfer is automatically placed on hold until the call can be verified or the account holder confirms it themselves.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-10 text-center">
          <h1 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
            About Bankify
          </h1>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The call sounds exactly like someone you trust. That&apos;s the
            problem.
          </p>
          <p className="mt-5 text-slate-300">
            Bankify exists because of one specific, fast-growing threat:
            real-time AI impersonation used to talk someone into authorizing
            a transfer, over a call that feels completely legitimate while
            it&apos;s happening.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              An illustrative scenario
            </p>
            <p className="mt-4 text-slate-200 leading-7">
              A bank&apos;s CEO joins a video call with someone presenting as
              a senior foreign government official, to finalize a
              time-sensitive wire transfer tied to a diplomatic initiative.
              The voice sounds right. The face on the video moves and speaks
              exactly like the real person. Everything about the call feels
              legitimate.
            </p>
            <p className="mt-4 text-slate-200 leading-7">
              Except none of it is real. The official on the other end is a
              real-time AI-generated voice and face, cloned from public
              footage and operated live by a scammer. The real official never
              joined the call. By the time anyone realizes, the transfer has
              already gone through.
            </p>
            <p className="mt-4 font-medium text-emerald-300">
              This is the threat Bankify is built to catch — not after the
              money moves, but while the call is still happening.
            </p>
          </div>
        </section>

        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                How we catch it
              </h2>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Detection runs during the call, not after it.
              </p>
            </div>
            <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {DETECTION_STEPS.map((step, index) => (
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

        <section className="border-t border-white/5 py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Why it matters
            </h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Trust shouldn&apos;t be the vulnerability.
            </p>
            <p className="mt-5 text-slate-300">
              These scams don&apos;t target people for being careless — they
              target the fact that executives, officials, and families trust
              the voices and faces of people they know. Real-time AI
              impersonation turns that trust into the attack surface. Bankify
              is built on the idea that no amount of trust should be enough,
              on its own, to move money without a chance to verify.
            </p>
          </div>
        </section>

        <section className="border-t border-white/5 bg-gradient-to-b from-emerald-500/10 to-transparent py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              See the detection flow for yourself.
            </h2>
            <p className="mt-4 text-slate-300">
              Try the live demo to see how a request would be scored, or look
              at a sample dashboard of calls Bankify has already screened.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/demo"
                className="rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                Try the live demo
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
              >
                View sample dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
