"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/* ── scroll reveal ── */
export function Reveal({
  children, delay = 0, y = 22, className = "",
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── aurora mesh background ── */
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div className="absolute -top-48 left-1/2 h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-emerald-500/25 blur-[130px] animate-aurora" />
      <div className="absolute top-24 -left-40 h-[440px] w-[440px] rounded-full bg-cyan-500/20 blur-[130px] animate-aurora-slow" />
      <div className="absolute -bottom-52 right-0 h-[500px] w-[500px] rounded-full bg-teal-400/20 blur-[130px] animate-aurora" />
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />
    </div>
  );
}

export function Pill({
  children, accent = "emerald",
}: { children: React.ReactNode; accent?: "emerald" | "cyan" }) {
  const tone = accent === "cyan"
    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  const dot = accent === "cyan" ? "bg-cyan-500" : "bg-emerald-500";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-medium backdrop-blur ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${dot}`} />
      {children}
    </span>
  );
}
