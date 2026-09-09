"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Send, CheckCircle2, Banknote, Clock, Filter } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type Payment = {
  id: string;
  refNo: string;
  customerId: string;
  fromAccount: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryIfsc: string;
  amount: number;
  mode: string;
  status: string;
  remarks: string | null;
  processedAt: string | null;
  utrNo: string | null;
  createdAt: string;
  customer: { fullName: string; customerNo: string; phone: string };
};

export function PaymentsView() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [mode, setMode] = useState("ALL");
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (mode !== "ALL") params.set("mode", mode);
    const r = await fetch(`/api/payments?${params.toString()}`);
    const j = await r.json();
    setPayments(j.payments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [status, mode]);

  async function approve(id: string) {
    const r = await fetch(`/api/payments/${id}/approve`, { method: "POST" });
    if (r.ok) {
      toast.success("Payment approved");
      load();
    } else {
      const j = await r.json();
      toast.error(j.error ?? "Failed");
    }
  }

  async function process(id: string) {
    const r = await fetch(`/api/payments/${id}/process`, { method: "POST" });
    const j = await r.json();
    if (r.ok) {
      toast.success(`Payment processed — UTR: ${j.payment.utrNo}`);
      load();
    } else {
      toast.error(j.error ?? "Failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="NEFT / RTGS / IMPS Payments"
        description="Originate outbound transfers, approve pending orders, and process them with UTR generation."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Send className="size-4 mr-1.5" /> New Payment
              </Button>
            </DialogTrigger>
            <NewPaymentDialog onCreated={() => { setOpenNew(false); load(); }} />
          </Dialog>
        }
      />

      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <Filter className="size-4 text-slate-400 ml-1" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PROCESSED">Processed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All modes</SelectItem>
              <SelectItem value="NEFT">NEFT</SelectItem>
              <SelectItem value="RTGS">RTGS</SelectItem>
              <SelectItem value="IMPS">IMPS</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : payments.length === 0 ? (
            <EmptyState icon={Send} title="No payment orders" description="Originate a NEFT/RTGS/IMPS transfer to get started." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Ref No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">UTR</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.refNo}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{p.customer.fullName}</div>
                        <div className="text-xs text-slate-500">{p.customer.phone}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{p.mode}</Badge></TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-800">{p.beneficiaryName}</div>
                        <div className="text-slate-500 font-mono">{p.beneficiaryAccount}</div>
                        <div className="text-slate-500">{p.beneficiaryIfsc}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell>
                      <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs font-mono">{p.utrNo ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">{formatDateTime(p.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {p.status === "PENDING" && user?.role !== "TELLER" && (
                            <Button size="sm" variant="ghost" onClick={() => approve(p.id)} title="Approve">
                              <CheckCircle2 className="size-3.5 text-emerald-600" />
                            </Button>
                          )}
                          {p.status === "APPROVED" && user?.role !== "TELLER" && (
                            <Button size="sm" variant="ghost" onClick={() => process(p.id)} title="Process & debit">
                              <Banknote className="size-3.5 text-emerald-600" />
                            </Button>
                          )}
                        </div>
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

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "border-amber-200 text-amber-700 bg-amber-50",
    APPROVED: "border-cyan-200 text-cyan-700 bg-cyan-50",
    PROCESSED: "border-emerald-200 text-emerald-700 bg-emerald-50",
    REJECTED: "border-red-200 text-red-700 bg-red-50",
    RETURNED: "border-orange-200 text-orange-700 bg-orange-50",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

function NewPaymentDialog({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; customerNo: string }[]>([]);
  const [accounts, setAccounts] = useState<{ accountNumber: string; type: string; balance: number }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [mode, setMode] = useState("NEFT");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryAccount, setBeneficiaryAccount] = useState("");
  const [beneficiaryIfsc, setBeneficiaryIfsc] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? []));
  }, []);

  function pickCustomer(id: string) {
    setCustomerId(id);
    setFromAccount("");
    fetch(`/api/accounts?customerId=${id}&limit=50`).then((r) => r.json()).then((j) => setAccounts(j.accounts ?? []));
  }

  async function submit() {
    if (!customerId || !fromAccount || !beneficiaryName || !beneficiaryAccount || !beneficiaryIfsc || !amount) {
      toast.error("Fill all required fields");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId, fromAccount, mode,
        beneficiaryName, beneficiaryAccount, beneficiaryIfsc,
        amount: Number(amount), remarks: remarks || undefined,
      }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Payment order ${j.payment.refNo} created (PENDING)`);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Originate payment order</DialogTitle>
        <DialogDescription>
          NEFT (any amount), RTGS (min ₹2 lakh), IMPS (instant, max ₹5 lakh).
          All payments start in PENDING status and require Manager approval before processing.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={pickCustomer}>
            <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.fullName} ({c.customerNo})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Source Account *</Label>
            <Select value={fromAccount} onValueChange={setFromAccount} disabled={!customerId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.accountNumber} value={a.accountNumber}>
                    {a.accountNumber} · {a.type} · {formatCurrency(a.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mode *</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NEFT">NEFT (any amount)</SelectItem>
                <SelectItem value="RTGS">RTGS (min ₹2 lakh)</SelectItem>
                <SelectItem value="IMPS">IMPS (instant)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Beneficiary Name *</Label>
            <Input value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Rahul Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label>Beneficiary A/C *</Label>
            <Input value={beneficiaryAccount} onChange={(e) => setBeneficiaryAccount(e.target.value)} placeholder="1234567890123" className="font-mono" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Beneficiary IFSC *</Label>
            <Input value={beneficiaryIfsc} onChange={(e) => setBeneficiaryIfsc(e.target.value.toUpperCase())} placeholder="HDFC0001234" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Remarks</Label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional note" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Submitting…" : "Create payment order"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
