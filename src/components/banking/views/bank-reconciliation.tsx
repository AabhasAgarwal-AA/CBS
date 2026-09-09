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
import { ArrowLeftRight, Plus, CheckCircle2, Upload, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type ReconRecord = {
  id: string;
  bankRefNo: string;
  amount: number;
  mode: string;
  direction: string;
  senderName: string | null;
  senderAccount: string | null;
  senderIfsc: string | null;
  matchedTxnRef: string | null;
  matchedPaymentId: string | null;
  status: string;
  statementDate: string;
  matchedAt: string | null;
};

export function BankReconciliationView() {
  const [tab, setTab] = useState<"recon" | "ecollection" | "smscharges">("recon");
  const [records, setRecords] = useState<ReconRecord[]>([]);
  const [payments, setPayments] = useState<{ id: string; refNo: string; amount: number; mode: string; beneficiaryName: string }[]>([]);
  const [eCollections, setECollections] = useState<any[]>([]);
  const [smsCharges, setSmsCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openImport, setOpenImport] = useState(false);
  const [openEcollection, setOpenEcollection] = useState(false);
  const [openSmsCharge, setOpenSmsCharge] = useState(false);
  const [matchedCount, setMatchedCount] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [totalInward, setTotalInward] = useState(0);

  async function load() {
    setLoading(true);
    const [rR, pR, eR, sR] = await Promise.all([
      fetch("/api/bank-reconciliation?limit=100"),
      fetch("/api/payments?limit=200"),
      fetch("/api/e-collections?limit=100"),
      fetch("/api/sms-charges?limit=100"),
    ]);
    const rJ = await rR.json();
    const pJ = await pR.json();
    const eJ = await eR.json();
    const sJ = await sR.json();
    setRecords(rJ.records ?? []);
    setMatchedCount(rJ.matched ?? 0);
    setUnmatchedCount(rJ.unmatched ?? 0);
    setTotalInward(rJ.totalInward ?? 0);
    setPayments(pJ.payments ?? []);
    setECollections(eJ.collections ?? []);
    setSmsCharges(sJ.charges ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  async function matchRecord(recordId: string, paymentId: string) {
    const r = await fetch(`/api/bank-reconciliation/${recordId}/match`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchedPaymentId: paymentId }),
    });
    if (r.ok) { toast.success("Matched"); load(); }
    else { const j = await r.json(); toast.error(j.error ?? "Failed"); }
  }

  return (
    <div>
      <PageHeader
        title="Bank Reconciliation & E-Collection"
        description="Import bank statements, match NEFT/IMPS entries to payment orders, track E-Collection receipts, and deduct SMS charges."
        action={
          tab === "recon" ? (
            <Dialog open={openImport} onOpenChange={setOpenImport}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Upload className="size-4 mr-1.5" /> Import Bank Entry
                </Button>
              </DialogTrigger>
              <ImportDialog onCreated={() => { setOpenImport(false); load(); }} />
            </Dialog>
          ) : tab === "ecollection" ? (
            <Dialog open={openEcollection} onOpenChange={setOpenEcollection}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> Simulate Inward
                </Button>
              </DialogTrigger>
              <ECollectionDialog onCreated={() => { setOpenEcollection(false); load(); }} />
            </Dialog>
          ) : (
            <Dialog open={openSmsCharge} onOpenChange={setOpenSmsCharge}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> Deduct SMS Charge
                </Button>
              </DialogTrigger>
              <SmsChargeDialog onCreated={() => { setOpenSmsCharge(false); load(); }} />
            </Dialog>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Matched</div><div className="text-2xl font-bold text-emerald-700 mt-1">{matchedCount}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Unmatched</div><div className="text-2xl font-bold text-amber-700 mt-1">{unmatchedCount}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Inward</div><div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalInward)}</div></CardContent></Card>
      </div>

      <div className="inline-flex rounded-lg bg-slate-100 p-1 mb-4">
        <button onClick={() => setTab("recon")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "recon" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Bank Recon ({records.length})</button>
        <button onClick={() => setTab("ecollection")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "ecollection" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>E-Collection ({eCollections.length})</button>
        <button onClick={() => setTab("smscharges")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "smscharges" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>SMS Charges ({smsCharges.length})</button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tab === "recon" ? (
            records.length === 0 ? (
              <EmptyState icon={ArrowLeftRight} title="No bank statement entries" description="Import a bank statement entry to start reconciliation." />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow>
                      <TableHead>Bank Ref No</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Statement Date</TableHead>
                      <TableHead>Matched To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.bankRefNo}</TableCell>
                        <TableCell><Badge variant="outline">{r.mode}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={r.direction === "INWARD" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-blue-200 text-blue-700 bg-blue-50"}>{r.direction}</Badge></TableCell>
                        <TableCell className="text-xs">
                          <div>{r.senderName ?? "—"}</div>
                          <div className="font-mono text-slate-500">{r.senderAccount ?? "—"}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(r.amount)}</TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(r.statementDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.matchedTxnRef ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={r.status === "MATCHED" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}>{r.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {r.status === "UNMATCHED" && (
                            <Select onValueChange={(val) => matchRecord(r.id, val)}>
                              <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Match to…" /></SelectTrigger>
                              <SelectContent>
                                {payments.filter((p) => p.amount === r.amount).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.refNo} · ₹{p.amount}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : tab === "ecollection" ? (
            eCollections.length === 0 ? (
              <EmptyState icon={Receipt} title="No E-Collection receipts" />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow>
                      <TableHead>Ref No</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>UPI ID</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Virtual Account</TableHead>
                      <TableHead>Received At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eCollections.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.refNo}</TableCell>
                        <TableCell className="text-xs">{c.payerName}</TableCell>
                        <TableCell className="font-mono text-xs">{c.payerUpiId ?? "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(c.amount)}</TableCell>
                        <TableCell className="font-mono text-xs">{c.virtualAccount?.virtualAccNo ?? "—"}</TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(c.receivedAt)}</TableCell>
                        <TableCell><Badge variant="outline" className={c.matched ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}>{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : smsCharges.length === 0 ? (
            <EmptyState icon={Receipt} title="No SMS charges deducted" />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">SMS Count</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Charge Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smsCharges.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.accountNumber}</TableCell>
                      <TableCell className="text-right">{c.smsCount}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(c.amount)}</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(c.chargeDate)}</TableCell>
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

function ImportDialog({ onCreated }: { onCreated: () => void }) {
  const [bankRefNo, setBankRefNo] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("NEFT");
  const [direction, setDirection] = useState("INWARD");
  const [senderName, setSenderName] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [senderIfsc, setSenderIfsc] = useState("");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!bankRefNo || !amount || !statementDate) { toast.error("Bank ref, amount, date required"); return; }
    setLoading(true);
    const r = await fetch("/api/bank-reconciliation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankRefNo, amount: Number(amount), mode, direction, senderName, senderAccount, senderIfsc, statementDate }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Bank entry imported");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Import bank statement entry</DialogTitle>
        <DialogDescription>Simulate importing a NEFT/IMPS/RTGS entry from the bank statement. Match it to a payment order afterwards.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Bank Ref No *</Label><Input value={bankRefNo} onChange={(e) => setBankRefNo(e.target.value)} placeholder="N260908123456" className="font-mono" /></div>
          <div className="space-y-1.5"><Label>Amount (₹) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Mode *</Label>
            <Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NEFT">NEFT</SelectItem><SelectItem value="IMPS">IMPS</SelectItem><SelectItem value="RTGS">RTGS</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Direction</Label>
            <Select value={direction} onValueChange={setDirection}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INWARD">Inward</SelectItem><SelectItem value="OUTWARD">Outward</SelectItem></SelectContent></Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Sender Name</Label><Input value={senderName} onChange={(e) => setSenderName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Sender A/C</Label><Input value={senderAccount} onChange={(e) => setSenderAccount(e.target.value)} className="font-mono" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Sender IFSC</Label><Input value={senderIfsc} onChange={(e) => setSenderIfsc(e.target.value.toUpperCase())} className="font-mono" /></div>
          <div className="space-y-1.5"><Label>Statement Date *</Label><Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Importing…" : "Import entry"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ECollectionDialog({ onCreated }: { onCreated: () => void }) {
  const [vas, setVas] = useState<{ id: string; virtualAccNo: string; upiId: string }[]>([]);
  const [virtualAccountId, setVirtualAccountId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerUpiId, setPayerUpiId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/virtual-accounts?limit=200").then((r) => r.json()).then((j) => setVas(j.virtualAccounts ?? [])); }, []);

  async function submit() {
    if (!virtualAccountId || !payerName || !amount) { toast.error("All fields required"); return; }
    setLoading(true);
    const r = await fetch("/api/e-collections", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ virtualAccountId, payerName, payerUpiId: payerUpiId || undefined, amount: Number(amount) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("E-Collection received");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Simulate E-Collection inward</DialogTitle>
        <DialogDescription>Simulate a payment received via a virtual account.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Virtual Account *</Label>
          <Select value={virtualAccountId} onValueChange={setVirtualAccountId}>
            <SelectTrigger><SelectValue placeholder="Select VA…" /></SelectTrigger>
            <SelectContent>{vas.map((v) => <SelectItem key={v.id} value={v.id}>{v.virtualAccNo} · {v.upiId}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Payer Name *</Label><Input value={payerName} onChange={(e) => setPayerName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Payer UPI</Label><Input value={payerUpiId} onChange={(e) => setPayerUpiId(e.target.value)} className="font-mono" /></div>
        </div>
        <div className="space-y-1.5"><Label>Amount (₹) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Processing…" : "Receive payment"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SmsChargeDialog({ onCreated }: { onCreated: () => void }) {
  const [accounts, setAccounts] = useState<{ accountNumber: string; customer: { fullName: string } }[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [smsCount, setSmsCount] = useState("1");
  const [amount, setAmount] = useState("5");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/accounts?limit=200").then((r) => r.json()).then((j) => setAccounts(j.accounts ?? [])); }, []);

  async function submit() {
    if (!accountNumber || !amount) { toast.error("Account and amount required"); return; }
    setLoading(true);
    const r = await fetch("/api/sms-charges", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountNumber, smsCount: Number(smsCount), amount: Number(amount) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("SMS charge deducted");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Deduct SMS charge</DialogTitle>
        <DialogDescription>Charge a customer account for SMS alerts sent.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Account *</Label>
          <Select value={accountNumber} onValueChange={setAccountNumber}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.accountNumber} value={a.accountNumber}>{a.accountNumber} · {a.customer.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>SMS Count</Label><Input type="number" value={smsCount} onChange={(e) => setSmsCount(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Deducting…" : "Deduct charge"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
