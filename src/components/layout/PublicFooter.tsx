import Link from "next/link";

export function PublicFooter() {
  // eslint-disable-next-line react-hooks/purity
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-card/30 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
              <span className="text-background font-black text-[10px]">L</span>
            </div>
            <span className="font-semibold text-foreground">ledgr</span>
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI-native accounting firm. We do your books — you get the output.
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">product</p>
          <ul className="space-y-1.5">
            {[["/services", "Services"], ["/from-bench", "From Bench"], ["/register", "Get started"]].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-muted-foreground hover:text-foreground transition-colors text-xs">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">company</p>
          <ul className="space-y-1.5">
            {[["/about", "About"], ["/contact", "Contact"]].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-muted-foreground hover:text-foreground transition-colors text-xs">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">legal</p>
          <ul className="space-y-1.5">
            {[["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"], ["/refunds", "Refund Policy"], ["/#pricing", "Pricing"]].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-muted-foreground hover:text-foreground transition-colors text-xs">{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="font-mono">© {year} ledgr — we do your accounting.</p>
          <p className="font-mono">made with care · ai + humans</p>
        </div>
      </div>
    </footer>
  );
}
