import Link from "next/link";
import { ShieldIcon } from "./shield-icon";

export function Nav() {
  return (
    <header className="w-full border-b border-white/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <ShieldIcon className="h-6 w-6 text-emerald-400" />
          <span className="font-heading text-lg font-semibold tracking-tight text-white">
            Bankify
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <Link href="/about" className="hover:text-white">
            About
          </Link>
          <Link href="/#how-it-works" className="hover:text-white">
            How it works
          </Link>
          <Link href="/#features" className="hover:text-white">
            What it catches
          </Link>
          <Link href="/#trust" className="hover:text-white">
            Trust &amp; security
          </Link>
          <Link href="/demo" className="hover:text-white">
            Live demo
          </Link>
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
        </nav>
        <Link
          href="/demo"
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          Try the demo
        </Link>
      </div>
    </header>
  );
}
