"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText, Filter } from "lucide-react";
import { formatDateTime } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Log = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { name: string; email: string; role: string } | null;
};

const actionColor: Record<string, string> = {
  LOGIN: "border-emerald-200 text-emerald-700 bg-emerald-50",
  LOGOUT: "border-slate-200 text-slate-600 bg-slate-50",
  CREATE: "border-emerald-200 text-emerald-700 bg-emerald-50",
  UPDATE: "border-amber-200 text-amber-700 bg-amber-50",
  DELETE: "border-red-200 text-red-700 bg-red-50",
  TXN: "border-cyan-200 text-cyan-700 bg-cyan-50",
  KYC_VERIFIED: "border-emerald-200 text-emerald-700 bg-emerald-50",
  KYC_REJECTED: "border-red-200 text-red-700 bg-red-50",
  FREEZE: "border-amber-200 text-amber-700 bg-amber-50",
  UNFREEZE: "border-emerald-200 text-emerald-700 bg-emerald-50",
  CLOSE: "border-red-200 text-red-700 bg-red-50",
  LOAN_APPROVED: "border-emerald-200 text-emerald-700 bg-emerald-50",
  LOAN_REJECTED: "border-red-200 text-red-700 bg-red-50",
  LOAN_DISBURSE: "border-teal-200 text-teal-700 bg-teal-50",
  LOAN_REPAY: "border-emerald-200 text-emerald-700 bg-emerald-50",
  CARD_ISSUE: "border-emerald-200 text-emerald-700 bg-emerald-50",
  CARD_BLOCK: "border-red-200 text-red-700 bg-red-50",
  CARD_UNBLOCK: "border-emerald-200 text-emerald-700 bg-emerald-50",
  SEED: "border-purple-200 text-purple-700 bg-purple-50",
};

export function AuditView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (entity !== "ALL") params.set("entity", entity);
    (async () => {
      try {
        const r = await fetch(`/api/audit?${params.toString()}`);
        const j = await r.json();
        if (!cancelled) {
          setLogs(j.logs ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entity]);

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="Every action performed by staff is recorded here. Immutable log of trust."
      />

      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-400 ml-1" />
          <span className="text-sm text-slate-600">Entity:</span>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="CUSTOMER">Customer</SelectItem>
              <SelectItem value="ACCOUNT">Account</SelectItem>
              <SelectItem value="TXN">Transaction</SelectItem>
              <SelectItem value="LOAN">Loan</SelectItem>
              <SelectItem value="CARD">Card</SelectItem>
              <SelectItem value="BRANCH">Branch</SelectItem>
              <SelectItem value="SYSTEM">System</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : logs.length === 0 ? (
            <EmptyState icon={ScrollText} title="No audit records" />
          ) : (
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(l.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-800">
                          {l.user?.name ?? "System"}
                        </div>
                        <div className="text-slate-500">{l.user?.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={actionColor[l.action] ?? ""}>
                          {l.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{l.entity}</TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-md">
                        {l.details ?? "—"}
                      </TableCell>
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
