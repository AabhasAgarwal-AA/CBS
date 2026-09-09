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
import { Coins, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type GoldLoan = {
  id: string;
  loanNumber: string;
  ornamentType: string;
  grossWeight: number;
  netWeight: number;
  purity: number;
  estimatedValue: number;
  sanctionedAmount: number;
  interestRate: number;
  tenureMonths: number;
  outstanding: number;
  status: string;
  appraiserName: string | null;
  createdAt: string;
  customer: { fullName: string; customerNo: string; phone: string };
};

export function GoldLoanView() {
  const [loans, setLoans] = useState<GoldLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [goldRate, setGoldRate] = useState(65000);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalSanctioned, setTotalSanctioned] = useState(0);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/gold-loans?limit=100");
    const j = await r.json();
    setLoans(j.loans ?? []);
    setGoldRate(j.goldRate ?? 65000);
    setTotalOutstanding(j.totalOutstanding ?? 0);
    setTotalSanctioned(j.totalSanctioned ?? 0);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  return (
    <div>
      <PageHeader
        title="Gold Loan Management"
        description="Appraise gold ornaments, sanction loans against gold (typically 80% of estimated value), track outstanding and releases."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> New Gold Loan
              </Button>
            </DialogTrigger>
            <NewGoldLoanDialog goldRate={goldRate} onCreated={() => { setOpenNew(false); load(); }} />
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Today's Gold Rate (22K/10g)</div><div className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(goldRate)}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Sanctioned</div><div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSanctioned)}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Outstanding</div><div className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(totalOutstanding)}</div></CardContent></Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : loans.length === 0 ? (
            <EmptyState icon={Coins} title="No gold loans" description="Create a gold loan by appraising an ornament." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Loan No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Ornament</TableHead>
                    <TableHead className="text-right">Net Wt</TableHead>
                    <TableHead className="text-center">Purity</TableHead>
                    <TableHead className="text-right">Est. Value</TableHead>
                    <TableHead className="text-right">Sanctioned</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.loanNumber}</TableCell>
                      <TableCell><div className="font-medium text-slate-900">{l.customer.fullName}</div><div className="text-xs text-slate-500">{l.customer.phone}</div></TableCell>
                      <TableCell><Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">{l.ornamentType.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-right">{l.netWeight}g</TableCell>
                      <TableCell className="text-center">{l.purity}K</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(l.estimatedValue)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(l.sanctionedAmount)}</TableCell>
                      <TableCell className="text-right text-amber-700">{formatCurrency(l.outstanding)}</TableCell>
                      <TableCell><Badge variant="outline" className={
                        l.status === "DISBURSED" ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                        : l.status === "CLOSED" ? "border-slate-200 text-slate-600 bg-slate-50"
                        : l.status === "PENDING" ? "border-amber-200 text-amber-700 bg-amber-50"
                        : ""
                      }>{l.status}</Badge></TableCell>
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

function NewGoldLoanDialog({ goldRate, onCreated }: { goldRate: number; onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; customerNo: string }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [ornamentType, setOrnamentType] = useState("NECKLACE");
  const [grossWeight, setGrossWeight] = useState("50");
  const [netWeight, setNetWeight] = useState("48");
  const [purity, setPurity] = useState("22");
  const [interestRate, setInterestRate] = useState("12");
  const [tenureMonths, setTenureMonths] = useState("12");
  const [appraiserName, setAppraiserName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? [])); }, []);

  // Live estimate
  const estimatedValue = (Number(netWeight || 0) / 10) * (Number(purity || 0) / 24) * goldRate;
  const sanctionedAmount = Math.round(estimatedValue * 0.8);

  async function submit() {
    if (!customerId || !ornamentType || !grossWeight || !netWeight || !purity) { toast.error("Fill required fields"); return; }
    setLoading(true);
    const r = await fetch("/api/gold-loans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, ornamentType, grossWeight: Number(grossWeight), netWeight: Number(netWeight), purity: Number(purity), interestRate: Number(interestRate), tenureMonths: Number(tenureMonths), appraiserName: appraiserName || undefined }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Gold loan ${j.loan.loanNumber} created — sanctioned ₹${sanctionedAmount}`);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New Gold Loan</DialogTitle>
        <DialogDescription>Appraise gold ornament and sanction a loan. Sanctioned amount = 80% of estimated value.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName} ({c.customerNo})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Ornament Type *</Label>
            <Select value={ornamentType} onValueChange={setOrnamentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GOLD_COIN">Gold Coin</SelectItem>
                <SelectItem value="NECKLACE">Necklace</SelectItem>
                <SelectItem value="BANGLE">Bangle</SelectItem>
                <SelectItem value="RING">Ring</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Purity (K) *</Label>
            <Select value={purity} onValueChange={setPurity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="24">24K (999)</SelectItem><SelectItem value="22">22K (916)</SelectItem><SelectItem value="18">18K (750)</SelectItem><SelectItem value="14">14K (585)</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Gross Weight (g) *</Label><Input type="number" step="0.001" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Net Weight (g) *</Label><Input type="number" step="0.001" value={netWeight} onChange={(e) => setNetWeight(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Interest Rate (%)</Label><Input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Tenure (months)</Label><Input type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Appraiser Name</Label><Input value={appraiserName} onChange={(e) => setAppraiserName(e.target.value)} /></div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1 text-sm">
          <div className="text-slate-600">Live estimate (rate ₹{goldRate.toLocaleString("en-IN")}/10g):</div>
          <div className="flex justify-between"><span>Estimated Value:</span><span className="font-semibold">{formatCurrency(estimatedValue)}</span></div>
          <div className="flex justify-between"><span>Sanctioned (80%):</span><span className="font-bold text-amber-700">{formatCurrency(sanctionedAmount)}</span></div>
        </div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Creating…" : "Create gold loan"}</Button></DialogFooter>
    </DialogContent>
  );
}
