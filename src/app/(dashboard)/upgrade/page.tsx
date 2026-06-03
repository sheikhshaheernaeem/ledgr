import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, BarChart2, Receipt, Users, FileText, Calculator, GitMerge, Shield } from "lucide-react";

const features = [
  { icon: BarChart2, text: "AI-powered transaction categorization" },
  { icon: Receipt, text: "Unlimited invoices with PDF export" },
  { icon: Users, text: "Client directory & management" },
  { icon: FileText, text: "Monthly P&L reports with AI summaries" },
  { icon: Calculator, text: "Tax summary & deduction tracking" },
  { icon: GitMerge, text: "Bank reconciliation" },
  { icon: Shield, text: "Audit log & data security" },
  { icon: Zap, text: "Cash flow forecasting" },
];

export default function UpgradePage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-400">
          <Zap className="h-3.5 w-3.5" /> Ledgr Pro
        </div>
        <h1 className="text-3xl font-bold text-white">AI-native bookkeeping for freelancers &amp; small businesses</h1>
        <p className="text-muted-foreground max-w-md mx-auto">Stop wasting hours on spreadsheets. Ledgr handles your books so you can focus on your work.</p>
      </div>

      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-4xl font-bold text-white">
            Pay what you want
          </CardTitle>
          <CardDescription className="text-base mt-2">Support the development of Ledgr via Buy Me a Coffee</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.text} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-foreground">{f.text}</span>
              </div>
            ))}
          </div>

          <a href="https://buymeacoffee.com/alsmartech" target="_blank" rel="noreferrer" className="block">
            <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base h-12 gap-2">
              <Zap className="h-5 w-5" />
              Subscribe on Buy Me a Coffee
            </Button>
          </a>

          <p className="text-center text-xs text-muted-foreground">
            One-time or recurring — you choose the amount. Every contribution helps keep Ledgr running and ad-free.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { stat: "AI-powered", label: "Transaction categorization" },
          { stat: "Instant", label: "PDF invoice generation" },
          { stat: "Zero setup", label: "Start in under 2 minutes" },
        ].map(s => (
          <div key={s.label} className="space-y-1">
            <p className="text-lg font-bold text-emerald-400">{s.stat}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
