"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ReportData {
  id: string;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  aiSummary: string | null;
  status: string;
  clientApprovedAt: string | null;
  clientEmail: string | null;
  user: { name: string | null; email: string; companyName: string | null };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function PublicReportApprovalPage() {
  const params = useParams();
  const token = params.token as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    fetch(`/api/report-approval/${token}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (data) {
          setReport(data);
          if (data.clientApprovedAt) setApproved(true);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  async function handleApprove() {
    setApproving(true);
    const res = await fetch(`/api/report-approval/${token}`, { method: "POST" });
    if (res.ok) setApproved(true);
    setApproving(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ color: "#666" }}>Loading report…</div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "48px", textAlign: "center", maxWidth: "400px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>Report Not Found</h1>
          <p style={{ color: "#666", fontSize: "15px" }}>This link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const monthName = new Date(report.year, report.month - 1).toLocaleString("default", { month: "long", year: "numeric" });
  const senderName = report.user.companyName ?? report.user.name ?? report.user.email;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "40px 16px", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ background: "white", maxWidth: "680px", margin: "0 auto", borderRadius: "12px", padding: "48px", boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}>

        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", fontSize: "14px", color: "#166534", marginBottom: "32px", fontWeight: 600 }}>
          P&L Report from {senderName}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "#059669", letterSpacing: "-0.5px" }}>Ledgr</div>
            {report.user.name && <p style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>{report.user.name}</p>}
            {report.user.email && <p style={{ fontSize: "13px", color: "#999" }}>{report.user.email}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", fontWeight: 600, marginBottom: "4px" }}>Period</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#111" }}>{monthName}</div>
            <div style={{ marginTop: "6px" }}>
              {approved ? (
                <span style={{ display: "inline-block", padding: "4px 12px", background: "#d1fae5", color: "#065f46", borderRadius: "100px", fontSize: "12px", fontWeight: 700 }}>APPROVED</span>
              ) : (
                <span style={{ display: "inline-block", padding: "4px 12px", background: "#dbeafe", color: "#1e40af", borderRadius: "100px", fontSize: "12px", fontWeight: 600 }}>AWAITING APPROVAL</span>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "32px" }}>
          {[
            { label: "Total Revenue", value: report.totalIncome, color: "#059669" },
            { label: "Total Expenses", value: report.totalExpenses, color: "#dc2626" },
            { label: "Net Profit", value: report.netProfit, color: report.netProfit >= 0 ? "#059669" : "#dc2626" },
          ].map(s => (
            <div key={s.label} style={{ padding: "16px", borderRadius: "8px", background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", fontWeight: 600, marginBottom: "6px" }}>{s.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: s.color }}>{s.value >= 0 ? "" : "-"}{fmt(Math.abs(s.value))}</div>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        {report.aiSummary && (
          <div style={{ padding: "16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", marginBottom: "32px" }}>
            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#059669", fontWeight: 600, marginBottom: "8px" }}>Bookkeeper's Summary</div>
            <p style={{ fontSize: "14px", color: "#166534", lineHeight: 1.6, margin: 0 }}>{report.aiSummary}</p>
          </div>
        )}

        {/* Approval section */}
        {approved ? (
          <div style={{ padding: "24px", background: "#d1fae5", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", marginBottom: "8px" }}>✓</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#065f46" }}>Report Approved</div>
            {report.clientApprovedAt && (
              <div style={{ fontSize: "13px", color: "#047857", marginTop: "4px" }}>
                Approved on {new Date(report.clientApprovedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "24px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#374151", marginBottom: "16px", margin: "0 0 16px" }}>
              Please review the figures above and click <strong>Approve Report</strong> to confirm you have reviewed this month's financials.
            </p>
            <button
              onClick={handleApprove}
              disabled={approving}
              style={{
                background: approving ? "#a7f3d0" : "#059669",
                color: "white",
                border: "none",
                padding: "12px 32px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: approving ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {approving ? "Approving…" : "Approve Report"}
            </button>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "12px", margin: "12px 0 0" }}>
              By approving, you confirm you have reviewed the {monthName} P&L statement.
            </p>
          </div>
        )}

        <div style={{ marginTop: "40px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: "12px", color: "#aaa" }}>
          <p>Powered by <strong style={{ color: "#059669" }}>Ledgr</strong> · AI-native bookkeeping</p>
        </div>
      </div>
    </div>
  );
}
