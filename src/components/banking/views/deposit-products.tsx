"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
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
import { Layers, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type Plan = {
  id: string;
  code: string;
  name: string;
  type: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  tenureMonths: number;
  penaltyRate: number;
  isActive: boolean;
  createdAt: string;
  _count: { accounts: number };
};

export function DepositProductsView() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/deposit-plans");
    const j = await r.json();
    setPlans(j.plans ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  return (
    <div>
      <PageHeader
        title="Deposit Products (Pigmy / MIS / FD / RD)"
        description="Define deposit plans with interest rates, tenure, and penalty rules. Plans are used when opening Pigmy, MIS, FD, or RD accounts."
        action={
          user?.role !== "TELLER" && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> New Plan
                </Button>
              </DialogTrigger>
              <NewPlanDialog onCreated={() => { setOpenNew(false); load(); }} />
            </Dialog>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        {(["PIGMY", "MIS", "FD", "RD"] as const).map((t) => {
          const count = plans.filter((p) => p.type === t).length;
          return (
            <Card key={t} className="border-slate-200">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 uppercase">{t} Plans</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : plans.length === 0 ? (
            <EmptyState icon={Layers} title="No deposit plans" description="Create Pigmy / MIS / FD / RD plans to get started." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Tenure</TableHead>
                    <TableHead className="text-right">Min / Max</TableHead>
                    <TableHead className="text-right">Penalty</TableHead>
                    <TableHead className="text-center">Accounts</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                      <TableCell><Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">{p.type}</Badge></TableCell>
                      <TableCell className="text-right">{p.interestRate}%</TableCell>
                      <TableCell className="text-right text-xs">{p.tenureMonths}m</TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(p.minAmount)} / {p.maxAmount > 0 ? formatCurrency(p.maxAmount) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">{p.penaltyRate}%</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{p._count.accounts}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={p.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{p.isActive ? "Active" : "Inactive"}</Badge></TableCell>
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

function NewPlanDialog({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("PIGMY");
  const [minAmount, setMinAmount] = useState("100");
  const [maxAmount, setMaxAmount] = useState("0");
  const [interestRate, setInterestRate] = useState("4.5");
  const [tenureMonths, setTenureMonths] = useState("12");
  const [penaltyRate, setPenaltyRate] = useState("1");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!code || !name || !interestRate || !tenureMonths) { toast.error("Fill required fields"); return; }
    setLoading(true);
    const r = await fetch("/api/deposit-plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, type, minAmount: Number(minAmount), maxAmount: Number(maxAmount), interestRate: Number(interestRate), tenureMonths: Number(tenureMonths), penaltyRate: Number(penaltyRate) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Plan created");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create deposit plan</DialogTitle>
        <DialogDescription>Define interest rate, tenure, and penalty for Pigmy / MIS / FD / RD products.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Plan Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PIGMY-DAILY" />
          </div>
          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PIGMY">Pigmy</SelectItem>
                <SelectItem value="MIS">MIS</SelectItem>
                <SelectItem value="FD">Fixed Deposit</SelectItem>
                <SelectItem value="RD">Recurring Deposit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Plan Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Daily Pigmy Deposit" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5"><Label>Interest % *</Label><Input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Tenure (mo) *</Label><Input type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Penalty %</Label><Input type="number" step="0.1" value={penaltyRate} onChange={(e) => setPenaltyRate(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Min Amount (₹)</Label><Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Max Amount (₹) (0 = no limit)</Label><Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Creating…" : "Create plan"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
