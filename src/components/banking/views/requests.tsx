"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Inbox, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type Request = {
  id: string; requestNo: string; type: string; entityId: string; entityName: string;
  amount: number | null; status: string; remarks: string | null;
  createdAt: string; decidedAt: string | null;
};

export function RequestsView() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("PENDING");

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/approval-requests?status=${status}&limit=100`);
    const j = await r.json();
    setRequests(j.requests ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [status]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const r = await fetch("/api/approval-requests", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, decision }),
    });
    if (r.ok) { toast.success(`Request ${decision.toLowerCase()}`); load(); }
    else { const j = await r.json(); toast.error(j.error ?? "Failed"); }
  }

  return (
    <div>
      <PageHeader title="Approval Requests" description="Pending approval requests across loans, payments, KYC, OD, gold loans, and vendors." />
      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-1">Status:</span>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : requests.length === 0 ? (
            <EmptyState icon={Inbox} title={`No ${status.toLowerCase()} requests`} />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Request No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    {status === "PENDING" && user?.role !== "TELLER" && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                      <TableCell><Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">{r.type.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{r.entityName}</TableCell>
                      <TableCell className="text-right">{r.amount ? formatCurrency(r.amount) : "—"}</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell><Badge variant="outline" className={
                        r.status === "APPROVED" ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                        : r.status === "REJECTED" ? "border-red-200 text-red-700 bg-red-50"
                        : "border-amber-200 text-amber-700 bg-amber-50"
                      }>{r.status}</Badge></TableCell>
                      {status === "PENDING" && user?.role !== "TELLER" && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => decide(r.id, "APPROVED")} title="Approve">
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => decide(r.id, "REJECTED")} title="Reject">
                              <XCircle className="size-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
