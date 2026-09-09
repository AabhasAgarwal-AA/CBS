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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { QrCode, Plus, Copy, ScanLine, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type QrRow = {
  id: string;
  merchantLabel: string;
  accountNumber: string;
  upiId: string;
  amount: number | null;
  purpose: string | null;
  scans: number;
  status: string;
  createdAt: string;
  account: { customer: { fullName: string } };
  _count: { payments: number };
};

type QrPayment = {
  id: string;
  accountNumber: string;
  payerName: string;
  payerUpiId: string;
  amount: number;
  refNo: string;
  status: string;
  direction: string;
  createdAt: string;
  qr: { merchantLabel: string; upiId: string };
};

export function QrView() {
  const [tab, setTab] = useState<"qr" | "payments">("qr");
  const [qrCodes, setQrCodes] = useState<QrRow[]>([]);
  const [payments, setPayments] = useState<QrPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [scanQr, setScanQr] = useState<QrRow | null>(null);
  const [openScan, setOpenScan] = useState(false);

  async function load() {
    setLoading(true);
    const [qrR, payR] = await Promise.all([
      fetch("/api/qr?limit=100"),
      fetch("/api/qr/payments?limit=100"),
    ]);
    const qrJ = await qrR.json();
    const payJ = await payR.json();
    setQrCodes(qrJ.qrCodes ?? []);
    setPayments(payJ.payments ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  return (
    <div>
      <PageHeader
        title="QR Banking"
        description="Generate UPI QR codes for inward collection, and simulate payer scans to receive payments."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> Generate QR
              </Button>
            </DialogTrigger>
            <NewQrDialog onCreated={() => { setOpenNew(false); load(); }} />
          </Dialog>
        }
      />

      <div className="inline-flex rounded-lg bg-slate-100 p-1 mb-4">
        <button onClick={() => setTab("qr")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "qr" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
          QR Codes ({qrCodes.length})
        </button>
        <button onClick={() => setTab("payments")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "payments" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
          QR Payments ({payments.length})
        </button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tab === "qr" ? (
            qrCodes.length === 0 ? (
              <EmptyState icon={QrCode} title="No QR codes generated" description="Generate a UPI QR for any active account to enable inward collection." />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Scans</TableHead>
                      <TableHead className="text-center">Payments</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qrCodes.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium text-slate-900">{q.merchantLabel}</TableCell>
                        <TableCell className="font-mono text-xs">{q.upiId}</TableCell>
                        <TableCell>
                          <div className="text-xs font-mono">{q.accountNumber}</div>
                          <div className="text-xs text-slate-500">{q.account.customer.fullName}</div>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {q.amount !== null ? formatCurrency(q.amount) : <span className="text-slate-500">Dynamic</span>}
                        </TableCell>
                        <TableCell className="text-center">{q.scans}</TableCell>
                        <TableCell className="text-center">{q._count.payments}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={q.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{q.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm" variant="ghost" title="Simulate a payer scan"
                            onClick={() => { setScanQr(q); setOpenScan(true); }}
                          >
                            <ScanLine className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : payments.length === 0 ? (
            <EmptyState icon={ArrowDownLeft} title="No QR payments yet" description="Generate a QR and simulate a scan to receive payments." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Direction</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>From / To</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge variant="outline" className={p.direction === "INWARD" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-blue-200 text-blue-700 bg-blue-50"}>
                          {p.direction === "INWARD" ? <ArrowDownLeft className="size-3 mr-1" /> : <ArrowUpRight className="size-3 mr-1" />}
                          {p.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.refNo}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{p.payerName}</div>
                        <div className="text-slate-500 font-mono">{p.payerUpiId}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.accountNumber}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">+{formatCurrency(p.amount)}</TableCell>
                      <TableCell><Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">{p.status}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDateTime(p.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {scanQr && (
        <ScanPayDialog
          qr={scanQr}
          open={openScan}
          onOpenChange={setOpenScan}
          onPaid={() => { setOpenScan(false); setScanQr(null); load(); }}
        />
      )}
    </div>
  );
}

function NewQrDialog({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string }[]>([]);
  const [accounts, setAccounts] = useState<{ accountNumber: string; type: string; balance: number }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [merchantLabel, setMerchantLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ upiId: string; upiLink: string } | null>(null);

  useEffect(() => { fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? [])); }, []);
  function pickCustomer(id: string) {
    setCustomerId(id);
    setAccountNumber("");
    fetch(`/api/accounts?customerId=${id}&limit=50`).then((r) => r.json()).then((j) => setAccounts(j.accounts ?? []));
  }
  async function submit() {
    if (!accountNumber || !merchantLabel) { toast.error("Account and label required"); return; }
    setLoading(true);
    const r = await fetch("/api/qr", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountNumber, merchantLabel, amount: amount || undefined, purpose: purpose || undefined }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    setGenerated({ upiId: j.qr.upiId, upiLink: j.upiLink });
  }
  function reset() { setGenerated(null); onCreated(); }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{generated ? "QR Generated" : "Generate UPI QR code"}</DialogTitle>
        <DialogDescription>
          {generated ? "Share the UPI ID or deep-link below. Payers can scan with any UPI app." : "Create a UPI ID linked to an active account. Set an amount for fixed-value QRs."}
        </DialogDescription>
      </DialogHeader>
      {generated ? (
        <div className="space-y-3 py-2">
          <div className="rounded-xl bg-slate-900 text-white p-5 text-center">
            <div className="text-xs opacity-70 mb-2">UPI ID</div>
            <div className="font-mono text-lg break-all">{generated.upiId}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500 mb-1">UPI Deep Link</div>
            <div className="font-mono text-xs break-all text-slate-700">{generated.upiLink}</div>
          </div>
          <Button onClick={reset} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Generate another</Button>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={pickCustomer}>
              <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Linked Account *</Label>
            <Select value={accountNumber} onValueChange={setAccountNumber} disabled={!customerId}>
              <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
              <SelectContent>{accounts.map((a) => <SelectItem key={a.accountNumber} value={a.accountNumber}>{a.accountNumber} · {a.type} · {formatCurrency(a.balance)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Merchant Label *</Label>
            <Input value={merchantLabel} onChange={(e) => setMerchantLabel(e.target.value)} placeholder="Ananya Store" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Leave blank for dynamic" />
            </div>
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Rent / Fees" />
            </div>
          </div>
        </div>
      )}
      {!generated && (
        <DialogFooter>
          <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? "Generating…" : "Generate QR"}
          </Button>
        </DialogFooter>
      )}
    </DialogContent>
  );
}

function ScanPayDialog({ qr, open, onOpenChange, onPaid }: { qr: QrRow; open: boolean; onOpenChange: (o: boolean) => void; onPaid: () => void }) {
  const [payerName, setPayerName] = useState("");
  const [payerUpiId, setPayerUpiId] = useState("");
  const [amount, setAmount] = useState(qr.amount?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  async function pay() {
    if (!payerName || !payerUpiId || !amount) { toast.error("Fill all fields"); return; }
    setLoading(true);
    const r = await fetch("/api/qr/pay", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upiId: qr.upiId, payerName, payerUpiId, amount: Number(amount) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`₹${amount} received from ${payerName}`);
    onPaid();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Simulate QR scan & pay</DialogTitle>
          <DialogDescription>
            Payer scans the QR for <strong>{qr.merchantLabel}</strong> ({qr.upiId}).
            Fill the payer details below to simulate the payment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Payer Name *</Label>
            <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Vikram Singh" />
          </div>
          <div className="space-y-1.5">
            <Label>Payer UPI ID *</Label>
            <Input value={payerUpiId} onChange={(e) => setPayerUpiId(e.target.value)} placeholder="vikram@okhdfcbank" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={qr.amount !== null} />
            {qr.amount !== null && <div className="text-xs text-slate-500">Fixed-amount QR — amount locked.</div>}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={pay} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? "Processing…" : "Pay now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
