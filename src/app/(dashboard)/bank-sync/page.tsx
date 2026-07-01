"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link2,
  Loader2,
  RefreshCw,
  Building2,
  ExternalLink,
  Info,
  Globe,
  Upload,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { usePlaidLink } from "react-plaid-link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PlaidConn {
  id: string;
  institutionName: string;
  status: string;
  lastSyncAt: string | null;
}
interface BankAccount {
  id: string;
  name: string;
  isPlaidLinked: boolean;
  institutionName: string | null;
  plaidAccountId: string | null;
}

// ─── Region / Country Data ─────────────────────────────────────────────────────

const REGIONS = [
  {
    id: "north-america",
    label: "North America",
    flag: "🇺🇸",
    subtitle: "US, Canada",
    provider: "plaid",
    countries: [
      { code: "US", name: "United States", flag: "🇺🇸" },
      { code: "CA", name: "Canada", flag: "🇨🇦" },
    ],
  },
  {
    id: "europe",
    label: "Europe",
    flag: "🇪🇺",
    subtitle: "31 EU/EEA countries",
    provider: "nordigen",
    countries: [
      { code: "DE", name: "Germany", flag: "🇩🇪" },
      { code: "FR", name: "France", flag: "🇫🇷" },
      { code: "NL", name: "Netherlands", flag: "🇳🇱" },
      { code: "ES", name: "Spain", flag: "🇪🇸" },
      { code: "IT", name: "Italy", flag: "🇮🇹" },
      { code: "SE", name: "Sweden", flag: "🇸🇪" },
      { code: "NO", name: "Norway", flag: "🇳🇴" },
      { code: "DK", name: "Denmark", flag: "🇩🇰" },
      { code: "FI", name: "Finland", flag: "🇫🇮" },
      { code: "PL", name: "Poland", flag: "🇵🇱" },
      { code: "PT", name: "Portugal", flag: "🇵🇹" },
      { code: "BE", name: "Belgium", flag: "🇧🇪" },
      { code: "AT", name: "Austria", flag: "🇦🇹" },
      { code: "CH", name: "Switzerland", flag: "🇨🇭" },
      { code: "IE", name: "Ireland", flag: "🇮🇪" },
      { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
      { code: "HU", name: "Hungary", flag: "🇭🇺" },
      { code: "RO", name: "Romania", flag: "🇷🇴" },
    ],
  },
  {
    id: "uk",
    label: "United Kingdom",
    flag: "🇬🇧",
    subtitle: "England, Scotland, Wales, NI",
    provider: "plaid",
    countries: [{ code: "GB", name: "United Kingdom", flag: "🇬🇧" }],
  },
  {
    id: "asia-pacific",
    label: "Asia Pacific",
    flag: "🇦🇺",
    subtitle: "AUS, NZ, SG, HK, JP, IN",
    provider: "demo",
    countries: [
      { code: "AU", name: "Australia", flag: "🇦🇺" },
      { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
      { code: "SG", name: "Singapore", flag: "🇸🇬" },
      { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
      { code: "JP", name: "Japan", flag: "🇯🇵" },
      { code: "IN", name: "India", flag: "🇮🇳" },
      { code: "CN", name: "China", flag: "🇨🇳" },
    ],
  },
  {
    id: "middle-east-africa",
    label: "Middle East & Africa",
    flag: "🌍",
    subtitle: "UAE, Saudi Arabia, and more",
    provider: "demo",
    countries: [
      { code: "AE", name: "UAE", flag: "🇦🇪" },
      { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
      { code: "PK", name: "Pakistan", flag: "🇵🇰" },
      { code: "EG", name: "Egypt", flag: "🇪🇬" },
      { code: "ZA", name: "South Africa", flag: "🇿🇦" },
      { code: "NG", name: "Nigeria", flag: "🇳🇬" },
      { code: "KE", name: "Kenya", flag: "🇰🇪" },
    ],
  },
  {
    id: "latin-america",
    label: "Latin America",
    flag: "🌎",
    subtitle: "Brazil, Mexico, and more",
    provider: "demo",
    countries: [
      { code: "BR", name: "Brazil", flag: "🇧🇷" },
      { code: "MX", name: "Mexico", flag: "🇲🇽" },
      { code: "AR", name: "Argentina", flag: "🇦🇷" },
      { code: "CO", name: "Colombia", flag: "🇨🇴" },
      { code: "CL", name: "Chile", flag: "🇨🇱" },
    ],
  },
];

// ─── Bank Data per Country ─────────────────────────────────────────────────────

const BANKS_BY_COUNTRY: Record<
  string,
  { id: string; name: string; color: string; flag: string }[]
> = {
  US: [
    { id: "ins_chase", name: "Chase", color: "#117ACA", flag: "🇺🇸" },
    { id: "ins_bofa", name: "Bank of America", color: "#E31837", flag: "🇺🇸" },
    { id: "ins_wells", name: "Wells Fargo", color: "#D71E28", flag: "🇺🇸" },
    { id: "ins_citi", name: "Citibank", color: "#003B70", flag: "🇺🇸" },
    { id: "ins_td", name: "TD Bank", color: "#2C8A4A", flag: "🇺🇸" },
    { id: "ins_capone", name: "Capital One", color: "#D03027", flag: "🇺🇸" },
    { id: "ins_usbank", name: "US Bank", color: "#00529B", flag: "🇺🇸" },
    { id: "ins_pnc", name: "PNC Bank", color: "#F26722", flag: "🇺🇸" },
  ],
  CA: [
    { id: "ins_rbc", name: "RBC Royal Bank", color: "#005DAA", flag: "🇨🇦" },
    { id: "ins_td_ca", name: "TD Canada Trust", color: "#2C8A4A", flag: "🇨🇦" },
    { id: "ins_bmo", name: "BMO Bank", color: "#0079C1", flag: "🇨🇦" },
    { id: "ins_scotiabank", name: "Scotiabank", color: "#EC111A", flag: "🇨🇦" },
    { id: "ins_cibc", name: "CIBC", color: "#C41F3E", flag: "🇨🇦" },
    { id: "ins_nbc", name: "National Bank", color: "#ED1C24", flag: "🇨🇦" },
  ],
  GB: [
    { id: "ins_barclays", name: "Barclays", color: "#00AEEF", flag: "🇬🇧" },
    { id: "ins_hsbc_uk", name: "HSBC", color: "#DB0011", flag: "🇬🇧" },
    { id: "ins_lloyds", name: "Lloyds", color: "#006A4D", flag: "🇬🇧" },
    { id: "ins_natwest", name: "NatWest", color: "#42145F", flag: "🇬🇧" },
    { id: "ins_santander_uk", name: "Santander UK", color: "#EC0000", flag: "🇬🇧" },
    { id: "ins_halifax", name: "Halifax", color: "#003087", flag: "🇬🇧" },
    { id: "ins_monzo", name: "Monzo", color: "#FF3464", flag: "🇬🇧" },
    { id: "ins_starling", name: "Starling Bank", color: "#7ED321", flag: "🇬🇧" },
  ],
  DE: [
    { id: "ins_deutsche", name: "Deutsche Bank", color: "#0018A8", flag: "🇩🇪" },
    { id: "ins_commerzbank", name: "Commerzbank", color: "#FFCC00", flag: "🇩🇪" },
    { id: "ins_sparkasse", name: "Sparkasse", color: "#FF0000", flag: "🇩🇪" },
    { id: "ins_dkb", name: "DKB", color: "#006B99", flag: "🇩🇪" },
    { id: "ins_n26", name: "N26", color: "#1A1A1A", flag: "🇩🇪" },
    { id: "ins_ing_de", name: "ING Germany", color: "#FF6200", flag: "🇩🇪" },
  ],
  FR: [
    { id: "ins_bnp", name: "BNP Paribas", color: "#00965E", flag: "🇫🇷" },
    { id: "ins_ca", name: "Crédit Agricole", color: "#009A44", flag: "🇫🇷" },
    { id: "ins_sg", name: "Société Générale", color: "#E60026", flag: "🇫🇷" },
    { id: "ins_laposte", name: "La Banque Postale", color: "#FFD200", flag: "🇫🇷" },
    { id: "ins_lcl", name: "LCL", color: "#E2001A", flag: "🇫🇷" },
    { id: "ins_boursorama", name: "Boursorama", color: "#0ABDE3", flag: "🇫🇷" },
  ],
  NL: [
    { id: "ins_ing_nl", name: "ING", color: "#FF6200", flag: "🇳🇱" },
    { id: "ins_abnamro", name: "ABN AMRO", color: "#009286", flag: "🇳🇱" },
    { id: "ins_rabobank", name: "Rabobank", color: "#004C97", flag: "🇳🇱" },
    { id: "ins_bunq", name: "Bunq", color: "#000000", flag: "🇳🇱" },
    { id: "ins_asr", name: "ASN Bank", color: "#009900", flag: "🇳🇱" },
    { id: "ins_knab", name: "Knab", color: "#E84F14", flag: "🇳🇱" },
  ],
  ES: [
    { id: "ins_santander_es", name: "Santander", color: "#EC0000", flag: "🇪🇸" },
    { id: "ins_bbva", name: "BBVA", color: "#004481", flag: "🇪🇸" },
    { id: "ins_caixabank", name: "CaixaBank", color: "#006EAA", flag: "🇪🇸" },
    { id: "ins_sabadell", name: "Banco Sabadell", color: "#007A7A", flag: "🇪🇸" },
    { id: "ins_bankia", name: "Bankia", color: "#004B8D", flag: "🇪🇸" },
    { id: "ins_ing_es", name: "ING España", color: "#FF6200", flag: "🇪🇸" },
  ],
  AE: [
    { id: "ins_enbd", name: "Emirates NBD", color: "#002E6D", flag: "🇦🇪" },
    { id: "ins_fab", name: "FAB", color: "#00A79D", flag: "🇦🇪" },
    { id: "ins_adcb", name: "ADCB", color: "#E60026", flag: "🇦🇪" },
    { id: "ins_dib", name: "DIB", color: "#006A4D", flag: "🇦🇪" },
    { id: "ins_mashreq", name: "Mashreq", color: "#EE2D24", flag: "🇦🇪" },
    { id: "ins_cbd", name: "CBD", color: "#005DA0", flag: "🇦🇪" },
  ],
  SA: [
    { id: "ins_alrajhi", name: "Al Rajhi Bank", color: "#006B36", flag: "🇸🇦" },
    { id: "ins_ncb", name: "NCB (Al Ahli)", color: "#004A97", flag: "🇸🇦" },
    { id: "ins_riyad", name: "Riyad Bank", color: "#005B8E", flag: "🇸🇦" },
    { id: "ins_sabb", name: "SABB", color: "#DB0011", flag: "🇸🇦" },
    { id: "ins_bsi", name: "Bank Saudi Invest.", color: "#003087", flag: "🇸🇦" },
  ],
  PK: [
    { id: "ins_hbl", name: "HBL", color: "#006400", flag: "🇵🇰" },
    { id: "ins_ubl", name: "UBL", color: "#003087", flag: "🇵🇰" },
    { id: "ins_mcb", name: "MCB Bank", color: "#C41F3E", flag: "🇵🇰" },
    { id: "ins_allied", name: "Allied Bank", color: "#E60026", flag: "🇵🇰" },
    { id: "ins_alfalah", name: "Bank Alfalah", color: "#00529B", flag: "🇵🇰" },
    { id: "ins_meezan", name: "Meezan Bank", color: "#006B36", flag: "🇵🇰" },
  ],
  IN: [
    { id: "ins_sbi", name: "State Bank of India", color: "#1F4E79", flag: "🇮🇳" },
    { id: "ins_hdfc", name: "HDFC Bank", color: "#004C97", flag: "🇮🇳" },
    { id: "ins_icici", name: "ICICI Bank", color: "#A51C30", flag: "🇮🇳" },
    { id: "ins_axis", name: "Axis Bank", color: "#97144D", flag: "🇮🇳" },
    { id: "ins_kotak", name: "Kotak Bank", color: "#EB0029", flag: "🇮🇳" },
    { id: "ins_yes", name: "Yes Bank", color: "#0066B3", flag: "🇮🇳" },
  ],
  AU: [
    { id: "ins_cba", name: "Commonwealth Bank", color: "#F7A800", flag: "🇦🇺" },
    { id: "ins_anz", name: "ANZ", color: "#007CBF", flag: "🇦🇺" },
    { id: "ins_westpac", name: "Westpac", color: "#DA1710", flag: "🇦🇺" },
    { id: "ins_nab", name: "NAB", color: "#E01B22", flag: "🇦🇺" },
    { id: "ins_anz2", name: "Macquarie", color: "#003087", flag: "🇦🇺" },
    { id: "ins_up", name: "Up Bank", color: "#FF6600", flag: "🇦🇺" },
  ],
  SG: [
    { id: "ins_dbs", name: "DBS Bank", color: "#EE1C24", flag: "🇸🇬" },
    { id: "ins_ocbc", name: "OCBC", color: "#EE1C24", flag: "🇸🇬" },
    { id: "ins_uob", name: "UOB", color: "#004C97", flag: "🇸🇬" },
    { id: "ins_sc_sg", name: "Standard Chartered SG", color: "#1B7C3D", flag: "🇸🇬" },
    { id: "ins_maybank_sg", name: "Maybank SG", color: "#FFCC00", flag: "🇸🇬" },
  ],
  CN: [
    { id: "ins_icbc", name: "ICBC", color: "#C8151B", flag: "🇨🇳" },
    { id: "ins_ccb", name: "China Construction Bank", color: "#0066B3", flag: "🇨🇳" },
    { id: "ins_boc", name: "Bank of China", color: "#C8151B", flag: "🇨🇳" },
    { id: "ins_abc_cn", name: "Agricultural Bank", color: "#006600", flag: "🇨🇳" },
    { id: "ins_bocom", name: "Bank of Communications", color: "#003087", flag: "🇨🇳" },
  ],
};

// fallback banks for countries without specific data
const FALLBACK_BANKS = [
  { id: "ins_demo_1", name: "National Bank", color: "#003087", flag: "🏦" },
  { id: "ins_demo_2", name: "Central Bank", color: "#006400", flag: "🏦" },
  { id: "ins_demo_3", name: "Commercial Bank", color: "#8B0000", flag: "🏦" },
  { id: "ins_demo_4", name: "Digital Bank", color: "#4B0082", flag: "🏦" },
];

function getBanks(countryCode: string) {
  return BANKS_BY_COUNTRY[countryCode] ?? FALLBACK_BANKS;
}

// ─── Provider badge helpers ────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  if (provider === "plaid")
    return (
      <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
        Plaid
      </Badge>
    );
  if (provider === "nordigen")
    return (
      <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
        Nordigen
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
      Demo
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Step = "region" | "country" | "banks";

export default function BankSyncPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [connections, setConnections] = useState<PlaidConn[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Plaid Link state
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [pendingBank, setPendingBank] = useState<{ id: string; name: string } | null>(null);

  // multi-step flow state
  const [step, setStep] = useState<Step>("region");
  const [selectedRegion, setSelectedRegion] = useState<(typeof REGIONS)[0] | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // Plaid Link hook — opens the real bank login popup
  const { open: openPlaidLink, ready: plaidReady } = usePlaidLink({
    token: plaidLinkToken ?? "",
    onSuccess: async (public_token, metadata) => {
      const institutionName = metadata.institution?.name ?? pendingBank?.name ?? "Bank";
      const institutionId = metadata.institution?.institution_id ?? pendingBank?.id ?? "";
      const res = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken: public_token, institutionId, institutionName }),
      });
      if (res.ok) {
        toast.success(`Connected to ${institutionName}`);
        await loadAccounts();
        await loadConnections();
      } else {
        toast.error("Bank connection failed");
      }
      setPlaidLinkToken(null);
      setPendingBank(null);
      setConnecting(null);
    },
    onExit: () => {
      setPlaidLinkToken(null);
      setPendingBank(null);
      setConnecting(null);
    },
  });

  // Open Plaid Link as soon as the token is ready
  useEffect(() => {
    if (plaidLinkToken && plaidReady) openPlaidLink();
  }, [plaidLinkToken, plaidReady, openPlaidLink]);

  async function loadAccounts() {
    const res = await fetch("/api/bank-accounts");
    if (res.ok) setAccounts(await res.json());
  }
  async function loadConnections() {
    const res = await fetch("/api/plaid/connections");
    if (res.ok) setConnections(await res.json());
  }

  useEffect(() => {
    loadAccounts();
    loadConnections();
  }, []);

  // Determine which provider to use for a region
  function getActiveProvider(region: (typeof REGIONS)[0]): string {
    if (region.provider === "plaid") return "plaid"; // env check is server-side
    if (region.provider === "nordigen") return "nordigen";
    return "demo";
  }

  async function connect(bankId: string, bankName: string, countryCode: string) {
    setConnecting(bankId);
    const region = selectedRegion;
    const provider = region ? getActiveProvider(region) : "demo";

    try {
      // EU banks — use Nordigen/GoCardless
      if (provider === "nordigen") {
        const res = await fetch("/api/nordigen/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ institutionId: bankId, country: countryCode }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.demo && data.link) {
            window.location.href = data.link;
            return;
          }
          // demo fallback — fall through
        }
      }

      // US / CA / UK banks — use Plaid (or demo if env vars not set)
      const tokenRes = await fetch("/api/plaid/connect", { method: "POST" });
      if (!tokenRes.ok) { toast.error("Could not start bank connection"); setConnecting(null); return; }
      const { demo, linkToken } = await tokenRes.json();

      if (demo) {
        // No Plaid credentials → generate mock transactions
        const exchangeRes = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken: "demo-public-token",
            institutionId: bankId,
            institutionName: bankName,
          }),
        });
        if (exchangeRes.ok) {
          toast.success(`Connected to ${bankName} (demo mode)`);
          await loadAccounts();
          await loadConnections();
        } else {
          toast.error("Connection failed");
        }
        setConnecting(null);
      } else {
        // Real Plaid — open the bank login popup
        setPendingBank({ id: bankId, name: bankName });
        setPlaidLinkToken(linkToken); // triggers useEffect → openPlaidLink()
        // setConnecting stays true until onSuccess / onExit
      }
    } catch {
      toast.error("Connection error");
      setConnecting(null);
    }
  }

  async function sync(acct: BankAccount) {
    setSyncing(acct.id);
    try {
      const conn = connections.find(
        (c) => acct.plaidAccountId === c.id || c.institutionName === acct.institutionName
      );

      if (conn) {
        const res = await fetch(`/api/plaid/sync/${conn.id}`, { method: "POST" });
        if (res.ok) {
          const { imported } = await res.json();
          toast.success(`Synced ${imported} new transactions for ${acct.name}`);
        } else {
          toast.error("Sync failed");
        }
      } else {
        const res = await fetch("/api/plaid/sync/mock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankAccountId: acct.id }),
        });
        if (res.ok) {
          const { imported } = await res.json();
          toast.success(`Synced ${imported} transactions for ${acct.name}`);
        }
      }
      await loadAccounts();
    } finally {
      setSyncing(null);
    }
  }

  const connectedAccounts = accounts.filter((a) => a.isPlaidLinked);

  const currentBanks =
    selectedCountry ? getBanks(selectedCountry) : [];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Bank Sync</h1>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5">
              <Globe className="h-3 w-3" />
              Works in 190+ countries
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Connect your bank accounts to automatically import transactions
          </p>
        </div>
        <Link href="/transactions">
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-3.5 w-3.5" /> Manual CSV Import
          </Button>
        </Link>
      </div>

      {/* Connected Banks */}
      {connectedAccounts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Connected Banks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedAccounts.map((acct) => {
              const conn = connections.find(
                (c) =>
                  acct.plaidAccountId === c.id ||
                  c.institutionName === acct.institutionName
              );
              return (
                <Card key={acct.id} className="border-border bg-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{acct.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {acct.institutionName}
                          {conn?.lastSyncAt && (
                            <> · Synced {new Date(conn.lastSyncAt).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs border-emerald-500/30 text-emerald-400"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sync(acct)}
                        disabled={syncing === acct.id}
                        className="gap-1.5"
                      >
                        {syncing === acct.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Sync Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-step Connection Flow */}
      <div>
        {/* Step breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <button
            className={`hover:text-foreground transition-colors ${step === "region" ? "text-foreground font-medium" : ""}`}
            onClick={() => { setStep("region"); setSelectedRegion(null); setSelectedCountry(""); }}
          >
            1. Select Region
          </button>
          <span>/</span>
          <button
            className={`hover:text-foreground transition-colors ${step === "country" ? "text-foreground font-medium" : ""} ${!selectedRegion ? "opacity-40 pointer-events-none" : ""}`}
            onClick={() => selectedRegion && setStep("country")}
          >
            2. Select Country
          </button>
          <span>/</span>
          <span
            className={`${step === "banks" ? "text-foreground font-medium" : ""} ${!selectedCountry ? "opacity-40" : ""}`}
          >
            3. Choose Bank
          </span>
        </div>

        {/* Step 1: Region Grid */}
        {step === "region" && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Select Your Region
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {REGIONS.map((region) => (
                <Card
                  key={region.id}
                  className="border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer group"
                  onClick={() => {
                    setSelectedRegion(region);
                    setSelectedCountry(
                      region.countries.length === 1
                        ? region.countries[0].code
                        : ""
                    );
                    setStep("country");
                  }}
                >
                  <CardContent className="p-5">
                    <div className="text-3xl mb-3">{region.flag}</div>
                    <p className="font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {region.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{region.subtitle}</p>
                    <div className="mt-3">
                      <ProviderBadge provider={getActiveProvider(region)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Country Selection */}
        {step === "country" && selectedRegion && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setStep("region"); setSelectedRegion(null); setSelectedCountry(""); }}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {selectedRegion.flag} {selectedRegion.label} — Select Country
              </h2>
            </div>

            <div className="max-w-sm">
              <Select
                value={selectedCountry}
                onValueChange={(v) => {
                  setSelectedCountry(v ?? "");
                  setStep("banks");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a country..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedRegion.countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRegion.countries.length === 1 && (
              <Button
                onClick={() => { setSelectedCountry(selectedRegion.countries[0].code); setStep("banks"); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Continue with {selectedRegion.countries[0].flag} {selectedRegion.countries[0].name}
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Bank Selection */}
        {step === "banks" && selectedCountry && selectedRegion && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setStep("country")}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {selectedRegion.countries.find((c) => c.code === selectedCountry)?.flag}{" "}
                {selectedRegion.countries.find((c) => c.code === selectedCountry)?.name} — Select Bank
              </h2>
              <ProviderBadge provider={getActiveProvider(selectedRegion)} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {currentBanks.map((bank) => (
                <Card
                  key={bank.id}
                  className="border-border bg-card hover:border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4 flex flex-col items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: bank.color + "20" }}
                    >
                      {bank.flag !== "🏦" ? (
                        <span className="text-xl">{bank.flag}</span>
                      ) : (
                        <Building2 className="h-6 w-6" style={{ color: bank.color }} />
                      )}
                    </div>
                    <p className="text-sm font-medium text-center leading-tight">{bank.name}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 text-xs"
                      disabled={connecting === bank.id}
                      onClick={() => connect(bank.id, bank.name, selectedCountry)}
                    >
                      {connecting === bank.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                      {connecting === bank.id ? "Connecting..." : "Connect"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Provider info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-cyan-400 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Plaid — US, CA, UK
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 text-xs text-muted-foreground">
            Set <code className="font-mono bg-muted px-1 rounded">PLAID_CLIENT_ID</code> +{" "}
            <code className="font-mono bg-muted px-1 rounded">PLAID_SECRET</code> for real connections.
            <a
              href="https://dashboard.plaid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 flex items-center gap-0.5 mt-1 hover:underline"
            >
              dashboard.plaid.com <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
              <Globe className="h-4 w-4" /> GoCardless — 31 EU countries
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 text-xs text-muted-foreground">
            Set <code className="font-mono bg-muted px-1 rounded">NORDIGEN_SECRET_ID</code> +{" "}
            <code className="font-mono bg-muted px-1 rounded">NORDIGEN_SECRET_KEY</code> for free EU open banking.
            <a
              href="https://bankaccountdata.gocardless.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 flex items-center gap-0.5 mt-1 hover:underline"
            >
              gocardless.com <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
              <Info className="h-4 w-4" /> Demo / Manual — 190+ countries
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 text-xs text-muted-foreground">
            No credentials needed. Demo connections generate realistic mock transactions.{" "}
            <Link href="/transactions" className="text-yellow-400 hover:underline">
              Or import via CSV
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
