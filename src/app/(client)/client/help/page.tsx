import Link from "next/link";
import {
  HelpCircle, Upload, FileText, MessageSquare, Sparkles, Receipt,
  Wallet, Calendar, AlertTriangle, FileCheck, Car, Repeat,
} from "lucide-react";

interface FAQ {
  q: string;
  a: string;
}

interface Section {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  faqs: FAQ[];
}

const SECTIONS: Section[] = [
  {
    title: "Getting started",
    icon: Upload,
    faqs: [
      {
        q: "How do I send you my financial data?",
        a: "Go to Dashboard → 'Upload a bank statement' and drag-drop a CSV from your bank. We accept Chase, BofA, Wells Fargo, HSBC, Monzo, Revolut and 25+ more formats. AI categorizes everything within minutes.",
      },
      {
        q: "What files do you accept?",
        a: "Bank CSVs (any format), credit-card statements as CSV, OFX/QFX downloads, and any PDF receipts uploaded to Documents. For large statements (>1000 rows), email us — we'll batch process.",
      },
      {
        q: "When do I get my first monthly report?",
        a: "By the 5th of the following month, every month. April books → delivered by May 5th. Your accountant reviews before it ships, so you always see clean numbers.",
      },
    ],
  },
  {
    title: "Your books & reports",
    icon: FileText,
    faqs: [
      {
        q: "Where do I see my P&L?",
        a: "Two places: 'My Books' shows live numbers updated every time we categorize, and 'Reports' shows the monthly closed P&L that your accountant signed off on.",
      },
      {
        q: "How do I approve a monthly report?",
        a: "When your accountant sends a report, you'll see it in Requests (and an email arrives). Click 'Review', then 'Approve' — that's it. Approval locks the period so numbers don't drift.",
      },
      {
        q: "What if I disagree with a categorization?",
        a: "Open Messages and tell your accountant. They'll re-categorize and explain. If it happens often, add a rule in 'Recurring rules' so future similar transactions auto-fix.",
      },
    ],
  },
  {
    title: "Tax",
    icon: Receipt,
    faqs: [
      {
        q: "Does your firm file my taxes?",
        a: "On the Growth and CFO plans, yes — we prepare and file. On Starter, we provide tax-ready financials and you file or hand off to your existing tax preparer.",
      },
      {
        q: "How do quarterly estimated payments work?",
        a: "Your Tax dashboard shows the projected quarterly amount based on YTD profit. We'll remind you 1 week before each due date (Apr 15, Jun 15, Sep 15, Jan 15).",
      },
      {
        q: "What about mileage and receipts?",
        a: "Log business miles in 'Mileage' — IRS rate auto-applied. Upload receipts in Documents — your accountant matches them to transactions during close.",
      },
    ],
  },
  {
    title: "Your accountant",
    icon: MessageSquare,
    faqs: [
      {
        q: "How fast does my accountant respond?",
        a: "Within 24 hours on Starter, same day on Growth, within 4 hours on CFO. Use Messages for normal questions. For urgent work, mark a Service Request as 'High urgency'.",
      },
      {
        q: "Can I request a custom report or project?",
        a: "Yes — go to Requests → 'Request work'. Common asks: investor package, loan documents, audit support, year-end planning. Your accountant will scope it and reply.",
      },
      {
        q: "Will the same accountant work on my books every month?",
        a: "Yes. You're paired with one lead accountant. They have a small team backing them up so coverage is always there.",
      },
    ],
  },
  {
    title: "AI assistant",
    icon: Sparkles,
    faqs: [
      {
        q: "What can the AI chat do?",
        a: "It has live access to your books. Ask anything: 'what's my runway', 'biggest expense category last month', 'what's tax-deductible'. It runs on Llama 3.3 70B and won't hallucinate numbers — only facts pulled from your actual data.",
      },
      {
        q: "Is the AI replacing my accountant?",
        a: "No — augmenting. AI does the heavy categorization and answers your day-to-day questions. Your accountant reviews everything before reports go out, and handles judgment calls (tax positions, accruals, strategy).",
      },
    ],
  },
  {
    title: "Plan & billing",
    icon: Wallet,
    faqs: [
      {
        q: "How do I change my plan?",
        a: "Settings → 'Manage billing' opens your Stripe portal where you can upgrade, downgrade, or cancel. Plan changes apply to next month's books.",
      },
      {
        q: "Is the first month really free?",
        a: "Yes — full service, no card required up front. Trial includes one full close cycle so you see the actual deliverable before paying.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <HelpCircle className="h-3 w-3" /> help
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">How can we help?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Common questions about your service. Still stuck? Message your accountant — they reply within a day.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <section key={sec.title} className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/60 bg-card/60 flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-emerald-400" />
                <p className="font-mono text-[11px] uppercase tracking-wider text-foreground">{sec.title.toLowerCase().replace(/ /g, "_")}</p>
              </div>
              <div className="divide-y divide-border/40">
                {sec.faqs.map((f, i) => (
                  <details key={i} className="group">
                    <summary className="cursor-pointer px-4 py-3 text-sm text-foreground hover:bg-card/60 list-none flex items-start gap-2">
                      <span className="font-mono text-emerald-400 mt-0.5 shrink-0">+</span>
                      <span className="flex-1">{f.q}</span>
                    </summary>
                    <div className="px-4 pb-3 pl-9 text-sm text-muted-foreground leading-relaxed">
                      {f.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="rounded-lg border border-border/60 bg-card/30 p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">quick_links</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { href: "/bookkeeping/client/upload", label: "Upload", icon: Upload },
            { href: "/bookkeeping/client/financials", label: "My Books", icon: Wallet },
            { href: "/client/requests", label: "Requests", icon: FileCheck },
            { href: "/client/messages", label: "Message accountant", icon: MessageSquare },
            { href: "/client/mileage", label: "Mileage", icon: Car },
            { href: "/client/rules", label: "Rules", icon: Repeat },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:border-emerald-500/30 hover:text-emerald-400 transition-colors text-xs font-mono text-muted-foreground"
            >
              <Icon className="h-3 w-3" />
              {label.toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-center">
        <p className="text-sm font-medium text-foreground">Didn&apos;t find your answer?</p>
        <p className="text-xs text-muted-foreground mt-1.5">
          Your accountant is one message away. They answer everything from &ldquo;what is this charge?&rdquo; to &ldquo;help me plan year-end&rdquo;.
        </p>
        <Link
          href="/client/messages"
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-emerald-500 hover:text-emerald-400"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Message your accountant →
        </Link>
      </div>
    </div>
  );
}
