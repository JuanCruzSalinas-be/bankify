import { ShieldIcon } from "./shield-icon";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-4 w-4 text-emerald-400" />
          <span className="font-heading font-medium">Bankify</span>
        </div>
        <p>&copy; 2026 Bankify. All rights reserved.</p>
      </div>
    </footer>
  );
}
