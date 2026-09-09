"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { TrendingUp, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type OD = {
  id: string;
  accountNumber: string;
  customerId: string;
  linkedAccount: string;
  sanctionedLimit: number;
  drawnAmount: number;
  interestRate: number;
  status: string;
  sanctionedAt: string;
  customer: { fullName: string; customerNo: string };
};

export function OverdraftsView() {
  const { user } = useAuth();
  const [ods, setOds] = useState<OD[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/overdrafts?limit=100");
    const j = await r.json();
    setOds(j.overdrafts ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  const totalSanctioned = ods.reduce((s, o) => s + o.sanctionedLimit, 0);
  const totalDrawn = ods.reduce((s, o) => s + o.drawnAmount, 0);

  return (
    <div>
      <PageHeader
        title="Overdraft (OD) Facility"
        description="Sanction overdraft limits against linked accounts. Track drawn amounts and interest accrual."
        action={
          user?.role !== "TELLER" && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> Sanction OD
                </Button>
              </DialogTrigger>
              <NewOdDialog onCreated={() => { setOpenNew(false); load(); }} />
            </Dialog>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Sanctioned</div><div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSanctioned)}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Drawn</div><div className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(totalDrawn)}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Available</div><div className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalSanctioned - totalDrawn)}</div></CardContent></Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : ods.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No overdraft facilities" description="Sanction an OD against a linked account." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>OD No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Linked A/C</TableHead>
                    <TableHead className="text-right">Sanctioned</TableHead>
                    <TableHead className="text-right">Drawn</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Sanctioned On</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ods.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.accountNumber}</TableCell>
                      <TableCell><div className="font-medium text-slate-900">{o.customer.fullName}</div><div className="text-xs text-slate-500">{o.customer.customerNo}</div></TableCell>
                      <TableCell className="font-mono text-xs">{o.linkedAccount}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(o.sanctionedLimit)}</TableCell>
                      <TableCell className="text-right text-amber-700">{formatCurrency(o.drawnAmount)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatCurrency(o.sanctionedLimit - o.drawnAmount)}</TableCell>
                      <TableCell className="text-right text-xs">{o.interestRate}%</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(o.sanctionedAt)}</TableCell>
                      <TableCell><Badge variant="outline" className={o.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{o.status}</Badge></TableCell>
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

function NewOdDialog({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string }[]>([]);
  const [accounts, setAccounts] = useState<{ accountNumber: string; type: string; balance: number }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [linkedAccount, setLinkedAccount] = useState("");
  const [sanctionedLimit, setSanctionedLimit] = useState("100000");
  const [interestRate, setInterestRate] = useState("12");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? [])); }, []);
  function pickCustomer(id: string) {
    setCustomerId(id);
    setLinkedAccount("");
    fetch(`/api/accounts?customerId=${id}&limit=50`).then((r) => r.json()).then((j) => setAccounts(j.accounts ?? []));
  }

  async function submit() {
    if (!customerId || !linkedAccount || !sanctionedLimit || !interestRate) { toast.error("All fields required"); return; }
    setLoading(true);
    const r = await fetch("/api/overdrafts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, linkedAccount, sanctionedLimit: Number(sanctionedLimit), interestRate: Number(interestRate) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("OD sanctioned");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Sanction overdraft</DialogTitle>
        <DialogDescription>Sanction an OD limit against a linked savings/current account.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={pickCustomer}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Linked Account *</Label>
          <Select value={linkedAccount} onValueChange={setLinkedAccount} disabled={!customerId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.accountNumber} value={a.accountNumber}>{a.accountNumber} · {a.type}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Sanctioned Limit (₹) *</Label><Input type="number" value={sanctionedLimit} onChange={(e) => setSanctionedLimit(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Interest Rate (%) *</Label><Input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Sanctioning…" : "Sanction OD"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
