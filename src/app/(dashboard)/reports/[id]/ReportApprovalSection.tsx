"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Send, Copy, Clock, Mail } from "lucide-react";
import { toast } from "sonner";

interface Props {
  reportId: string;
  initialClientEmail: string;
  initialApprovalToken: string | null;
  initialApprovalUrl: string | null;
  initialApprovedAt: string | null;
  initialStatus: string;
}

export default function ReportApprovalSection({
  reportId,
  initialClientEmail,
  initialApprovalToken,
  initialApprovalUrl,
  initialApprovedAt,
  initialStatus,
}: Props) {
  const [clientEmail, setClientEmail] = useState(initialClientEmail);
  const [token, setToken] = useState(initialApprovalToken);
  const [approvalUrl, setApprovalUrl] = useState(initialApprovalUrl);
  const [approvedAt, setApprovedAt] = useState(initialApprovedAt);
  const [sending, setSending] = useState(false);

  async function sendForApproval() {
    if (!clientEmail.trim()) { toast.error("Enter the client's email address"); return; }
    setSending(true);
    const res = await fetch(`/api/reports/${reportId}/send-for-approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientEmail: clientEmail.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
      setApprovalUrl(data.approvalUrl);
      toast.success("Approval link sent to client");
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to send");
    }
    setSending(false);
  }

  function copyLink() {
    if (!approvalUrl) return;
    navigator.clipboard.writeText(approvalUrl);
    toast.success("Link copied to clipboard");
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Client Approval
          </CardTitle>
          {approvedAt ? (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Approved
            </Badge>
          ) : token ? (
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 gap-1">
              <Clock className="h-3 w-3" /> Awaiting approval
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {approvedAt ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Client approved on {new Date(approvedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-sm">Client Email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="client@company.com"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={sendForApproval}
                  disabled={sending}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  {token ? "Resend" : "Send for Approval"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The client will receive an email with a secure link to review and approve this report.
              </p>
            </div>

            {token && approvalUrl && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Approval Link</Label>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border">
                  <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{approvalUrl}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyLink}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Share this link with your client if they didn&apos;t receive the email.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
