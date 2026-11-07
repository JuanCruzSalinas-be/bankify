import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { DemoClient } from "./demo-client";

export const metadata: Metadata = {
  title: "Live demo — Bankify",
  description:
    "Try an interactive simulation of how Bankify screens a call or message for scam signals before a transfer goes through.",
};

export default function DemoPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-8 text-center">
          <h1 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
            Live demo
          </h1>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            See what Bankify would catch.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Paste in a call transcript or message, or try one of the example
            scams below, to see how a request would be scored.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-10">
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200">
            <strong className="font-semibold">This is a simulation.</strong>{" "}
            It scores plain text against a transparent list of common
            scam-script patterns (urgency, secrecy, untraceable payment
            methods, and so on) so you can see the product experience. It
            does not perform real voice or video deepfake analysis.
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <DemoClient />
        </section>
      </main>
      <Footer />
    </div>
  );
}
