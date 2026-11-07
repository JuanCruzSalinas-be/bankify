import type { Metadata } from "next";
import { Manrope, DM_Sans, Work_Sans } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bankify — Stop AI Scams Before the Money Moves",
  description:
    "Bankify detects deepfake voices, cloned video calls, and AI-generated impersonation scams in real time, flagging suspicious transfers before they happen.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmSans.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
