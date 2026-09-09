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
import { Share2, Plus, ArrowRightLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Share = {
  id: string;
  shareNo: string;
  customerId: string;
  faceValue: number;
  quantity: number;
  paidValue: number;
  certificateNo: string | null;
  status: string;
  issuedAt: string;
  customer: { fullName: string; customerNo: string };
};

type Transfer = {
  id: string;
  shareId: string;
  fromCustomerId: string;
  toCustomerId: string;
  quantity: number;
  transferValue: number;
  status: string;
  transferDate: string;
  share: { shareNo: string };
};

export function ShareCapitalView() {
  const [tab, setTab] = useState<"shares" | "transfers">("shares");
  const [shares, setShares] = useState<Share[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [totalQty, setTotalQty] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  async function load() {
    setLoading(true);
    const [sR, tR] = await Promise.all([
      fetch("/api/shares?limit=200"),
      fetch("/api/shares/transfer?limit=100"),
    ]);
    const sJ = await sR.json();
    const tJ = await tR.json();
    setShares(sJ.shares ?? []);
    setTotalQty(sJ.totalQuantity ?? 0);
    setTotalValue(sJ.totalValue ?? 0);
    setTransfers(tJ.transfers ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  return (
    <div>
      <PageHeader
        title="Share Capital"
        description="Issue shares to members, transfer shares between members, and view shareholder reports."
        action={
          <>
            <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
              <DialogTrigger asChild>
                <Button variant="outline" className="mr-2">
                  <ArrowRightLeft className="size-4 mr-1.5" /> Transfer
                </Button>
              </DialogTrigger>
              <TransferDialog shares={shares} onDone={() => { setOpenTransfer(false); load(); }} />
            </Dialog>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> Issue Shares
                </Button>
              </DialogTrigger>
              <IssueDialog onCreated={() => { setOpenNew(false); load(); }} />
            </Dialog>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Shares Issued</div><div className="text-2xl font-bold text-slate-900 mt-1">{totalQty}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Capital Value</div><div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalValue)}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Shareholders</div><div className="text-2xl font-bold text-slate-900 mt-1">{shares.length}</div></CardContent></Card>
      </div>

      <div className="inline-flex rounded-lg bg-slate-100 p-1 mb-4">
        <button onClick={() => setTab("shares")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "shares" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Share Holders ({shares.length})</button>
        <button onClick={() => setTab("transfers")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "transfers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Transfers ({transfers.length})</button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tab === "shares" ? (
            shares.length === 0 ? (
              <EmptyState icon={Share2} title="No shares issued" />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow>
                      <TableHead>Share No</TableHead>
                      <TableHead>Holder</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Face Value</TableHead>
                      <TableHead className="text-right">Paid Value</TableHead>
                      <TableHead>Certificate</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shares.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.shareNo}</TableCell>
                        <TableCell><div className="font-medium text-slate-900">{s.customer.fullName}</div><div className="text-xs text-slate-500">{s.customer.customerNo}</div></TableCell>
                        <TableCell className="text-right font-semibold">{s.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.faceValue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.paidValue * s.quantity)}</TableCell>
                        <TableCell className="font-mono text-xs">{s.certificateNo ?? "—"}</TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(s.issuedAt)}</TableCell>
                        <TableCell><Badge variant="outline" className={s.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : transfers.length === 0 ? (
            <EmptyState icon={ArrowRightLeft} title="No share transfers yet" />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Share</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.share.shareNo}</TableCell>
                      <TableCell className="font-mono text-xs">{t.fromCustomerId.slice(-6)} → {t.toCustomerId.slice(-6)}</TableCell>
                      <TableCell className="text-right font-semibold">{t.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.transferValue)}</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(t.transferDate)}</TableCell>
                      <TableCell><Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">{t.status}</Badge></TableCell>
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

function IssueDialog({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; customerNo: string }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [faceValue, setFaceValue] = useState("10");
  const [quantity, setQuantity] = useState("1");
  const [certificateNo, setCertificateNo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? [])); }, []);

  async function submit() {
    if (!customerId || !quantity) { toast.error("Customer and quantity required"); return; }
    setLoading(true);
    const r = await fetch("/api/shares", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, faceValue: Number(faceValue), quantity: Number(quantity), certificateNo: certificateNo || undefined }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Issued ${quantity} shares`);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Issue shares</DialogTitle>
        <DialogDescription>Issue share capital to a member. Face value × quantity = total paid value.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select member…" /></SelectTrigger>
            <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName} ({c.customerNo})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Face Value (₹) *</Label><Input type="number" value={faceValue} onChange={(e) => setFaceValue(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Certificate No</Label><Input value={certificateNo} onChange={(e) => setCertificateNo(e.target.value)} placeholder="CERT-001" /></div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Issuing…" : "Issue shares"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TransferDialog({ shares, onDone }: { shares: Share[]; onDone: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string }[]>([]);
  const [shareId, setShareId] = useState("");
  const [fromCustomerId, setFromCustomerId] = useState("");
  const [toCustomerId, setToCustomerId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? []));
  }, []);

  function pickShare(id: string) {
    setShareId(id);
    const sh = shares.find((s) => s.id === id);
    if (sh) setFromCustomerId(sh.customerId);
  }

  async function submit() {
    if (!shareId || !fromCustomerId || !toCustomerId || !quantity) { toast.error("All fields required"); return; }
    if (fromCustomerId === toCustomerId) { toast.error("From and To must be different"); return; }
    setLoading(true);
    const r = await fetch("/api/shares/transfer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareId, fromCustomerId, toCustomerId, quantity: Number(quantity) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Shares transferred");
    onDone();
  }

  const activeShares = shares.filter((s) => s.status === "ACTIVE" && s.quantity > 0);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Transfer shares</DialogTitle>
        <DialogDescription>Move shares from one member to another. Original share quantity is reduced; new share created for recipient.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>From Share *</Label>
          <Select value={shareId} onValueChange={pickShare}>
            <SelectTrigger><SelectValue placeholder="Select share…" /></SelectTrigger>
            <SelectContent>{activeShares.map((s) => <SelectItem key={s.id} value={s.id}>{s.shareNo} · {s.customer.fullName} ({s.quantity} qty)</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>To Customer *</Label>
          <Select value={toCustomerId} onValueChange={setToCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select recipient…" /></SelectTrigger>
            <SelectContent>{customers.filter((c) => c.id !== fromCustomerId).map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Quantity *</Label>
          <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Transferring…" : "Transfer shares"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
