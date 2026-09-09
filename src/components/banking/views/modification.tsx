"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";
import { formatDateTime } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Log = {
  id: string; entity: string; entityId: string; fieldName: string;
  oldValue: string | null; newValue: string | null; modifiedBy: string | null;
  reason: string | null; createdAt: string;
};

export function ModificationView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("ALL");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (entity !== "ALL") params.set("entity", entity);
    const r = await fetch(`/api/modification-logs?${params.toString()}`);
    const j = await r.json();
    setLogs(j.logs ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [entity]);

  return (
    <div>
      <PageHeader title="Modification Log" description="Audit trail of all field-level edits across entities. Tracks old → new values, who changed them, and why." />
      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-1">Entity:</span>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-48 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All entities</SelectItem>
              <SelectItem value="CUSTOMER">Customer</SelectItem>
              <SelectItem value="ACCOUNT">Account</SelectItem>
              <SelectItem value="LOAN">Loan</SelectItem>
              <SelectItem value="VENDOR">Vendor</SelectItem>
              <SelectItem value="VOUCHER">Voucher</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : logs.length === 0 ? (
            <EmptyState icon={History} title="No modification logs" description="Field-level edits will appear here." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Old Value</TableHead>
                    <TableHead>New Value</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(l.createdAt)}</TableCell>
                      <TableCell><Badge variant="outline" className="border-slate-200 text-slate-600">{l.entity}</Badge></TableCell>
                      <TableCell className="font-medium text-slate-900">{l.fieldName}</TableCell>
                      <TableCell className="text-xs text-red-600 line-through">{l.oldValue ?? "—"}</TableCell>
                      <TableCell className="text-xs text-emerald-700">{l.newValue ?? "—"}</TableCell>
                      <TableCell className="text-xs text-slate-500">{l.reason ?? "—"}</TableCell>
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
