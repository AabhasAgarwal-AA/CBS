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
import { Repeat, Plus, Play } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Instruction = {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  frequency: string;
  dayOfMonth: number | null;
  nextRunAt: string;
  lastRunAt: string | null;
  totalRuns: number;
  status: string;
  createdAt: string;
  customer: { fullName: string; customerNo: string };
};

export function StandingInstructionsView() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/standing-instructions?limit=100");
    const j = await r.json();
    setInstructions(j.instructions ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  async function runNow(id: string) {
    const r = await fetch(`/api/standing-instructions/${id}/run`, { method: "POST" });
    const j = await r.json();
    if (r.ok) {
      toast.success("Standing instruction executed — transfer completed");
      load();
    } else {
      toast.error(j.error ?? "Failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Standing Instructions"
        description="Recurring auto-transfers between accounts (DAILY / WEEKLY / MONTHLY). Useful for SIP, rent, EMI auto-debit."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> New Instruction
              </Button>
            </DialogTrigger>
            <NewSiDialog onCreated={() => { setOpenNew(false); load(); }} />
          </Dialog>
        }
      />

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : instructions.length === 0 ? (
            <EmptyState icon={Repeat} title="No standing instructions" description="Set up a recurring transfer between accounts." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="hidden md:table-cell">Next Run</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Run</TableHead>
                    <TableHead className="text-center">Runs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructions.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-800">{i.customer.fullName}</div>
                        <div className="text-slate-500">{i.customer.customerNo}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div>{i.fromAccount}</div>
                        <div className="text-slate-400">↓ to</div>
                        <div>{i.toAccount}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(i.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">{i.frequency}</Badge>
                        {i.dayOfMonth && <div className="text-xs text-slate-500 mt-0.5">Day {i.dayOfMonth}</div>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">{formatDateTime(i.nextRunAt)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-500">{i.lastRunAt ? formatDateTime(i.lastRunAt) : "—"}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{i.totalRuns}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={i.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{i.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {i.status === "ACTIVE" && (
                          <Button size="sm" variant="ghost" onClick={() => runNow(i.id)} title="Run now">
                            <Play className="size-3.5 text-emerald-600" />
                          </Button>
                        )}
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

function NewSiDialog({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string }[]>([]);
  const [accounts, setAccounts] = useState<{ accountNumber: string; type: string; balance: number }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? [])); }, []);
  function pickCustomer(id: string) {
    setCustomerId(id);
    setFromAccount("");
    setToAccount("");
    fetch(`/api/accounts?customerId=${id}&limit=50`).then((r) => r.json()).then((j) => setAccounts(j.accounts ?? []));
  }

  async function submit() {
    if (!customerId || !fromAccount || !toAccount || !amount || !frequency) {
      toast.error("All fields required");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/standing-instructions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId, fromAccount, toAccount,
        amount: Number(amount), frequency,
        dayOfMonth: frequency === "MONTHLY" ? Number(dayOfMonth) : undefined,
      }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Standing instruction created");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create standing instruction</DialogTitle>
        <DialogDescription>Auto-transfer a fixed amount on a schedule. For MONTHLY, set day 1-28.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={pickCustomer}>
            <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
            <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>From Account *</Label>
            <Select value={fromAccount} onValueChange={setFromAccount} disabled={!customerId}>
              <SelectTrigger><SelectValue placeholder="Source…" /></SelectTrigger>
              <SelectContent>{accounts.map((a) => <SelectItem key={a.accountNumber} value={a.accountNumber}>{a.accountNumber}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>To Account *</Label>
            <Select value={toAccount} onValueChange={setToAccount} disabled={!customerId}>
              <SelectTrigger><SelectValue placeholder="Destination…" /></SelectTrigger>
              <SelectContent>{accounts.map((a) => <SelectItem key={a.accountNumber} value={a.accountNumber}>{a.accountNumber}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Frequency *</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Day (1-28)</Label>
            <Input type="number" min="1" max="28" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} disabled={frequency !== "MONTHLY"} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Creating…" : "Create instruction"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
