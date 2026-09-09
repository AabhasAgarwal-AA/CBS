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
import { FileText, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Ledger = { id: string; name: string; group: { name: string; type: string } };
type Vendor = { id: string; vendorCode: string; name: string };
type Voucher = {
  id: string;
  voucherNo: string;
  type: string;
  date: string;
  amount: number;
  description: string | null;
  status: string;
  vendor: { name: string; vendorCode: string } | null;
  lines: Array<{ id: string; ledgerId: string; debit: number; credit: number; ledger: { name: string } }>;
};

export function VouchersView() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [filterType, setFilterType] = useState("ALL");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType !== "ALL") params.set("type", filterType);
    const r = await fetch(`/api/vouchers?${params.toString()}`);
    const j = await r.json();
    setVouchers(j.vouchers ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [filterType]);

  return (
    <div>
      <PageHeader
        title="Vouchers"
        description="Create accounting vouchers (Receipt, Payment, Contra, Journal, Sales, Purchase) with double-entry posting."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> New Voucher
              </Button>
            </DialogTrigger>
            <NewVoucherDialog onCreated={() => { setOpenNew(false); load(); }} />
          </Dialog>
        }
      />

      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-1">Type:</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="RECEIPT">Receipt</SelectItem>
              <SelectItem value="PAYMENT">Payment</SelectItem>
              <SelectItem value="CONTRA">Contra</SelectItem>
              <SelectItem value="JOURNAL">Journal</SelectItem>
              <SelectItem value="SALES">Sales</SelectItem>
              <SelectItem value="PURCHASE">Purchase</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : vouchers.length === 0 ? (
            <EmptyState icon={FileText} title="No vouchers" description="Create a voucher to post a transaction." />
          ) : (
            <div className="max-h-[60vh] overflow-auto p-4 space-y-3">
              {vouchers.map((v) => {
                const totalDebit = v.lines.reduce((s, l) => s + l.debit, 0);
                return (
                  <Card key={v.id} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-mono text-sm font-semibold text-slate-900">{v.voucherNo}</div>
                          <div className="text-xs text-slate-500">{v.description ?? "—"}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">{v.type}</Badge>
                          <div className="text-xs text-slate-500 mt-1">{formatDate(v.date)}</div>
                        </div>
                      </div>
                      <Table>
                        <TableHeader><TableRow><TableHead>Ledger</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {v.lines.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs">{l.ledger.name}</TableCell>
                              <TableCell className="text-right text-xs">{l.debit > 0 ? formatCurrency(l.debit) : "—"}</TableCell>
                              <TableCell className="text-right text-xs">{l.credit > 0 ? formatCurrency(l.credit) : "—"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 font-semibold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewVoucherDialog({ onCreated }: { onCreated: () => void }) {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [type, setType] = useState("RECEIPT");
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState([
    { ledgerId: "", debit: "0", credit: "0" },
    { ledgerId: "", debit: "0", credit: "0" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/ledgers?limit=200").then((r) => r.json()).then((j) => setLedgers(j.ledgers ?? []));
    fetch("/api/vendors?limit=200").then((r) => r.json()).then((j) => setVendors(j.vendors ?? []));
  }, []);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const amount = totalDebit;

  function updateLine(i: number, field: "ledgerId" | "debit" | "credit", val: string) {
    const next = [...lines];
    next[i] = { ...next[i], [field]: val };
    setLines(next);
  }
  function addLine() { setLines([...lines, { ledgerId: "", debit: "0", credit: "0" }]); }
  function removeLine(i: number) { if (lines.length > 2) setLines(lines.filter((_, idx) => idx !== i)); }

  async function submit() {
    if (!balanced) { toast.error("Debits and credits must match"); return; }
    if (lines.some((l) => !l.ledgerId)) { toast.error("All lines need a ledger"); return; }
    setLoading(true);
    const r = await fetch("/api/vouchers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, vendorId: vendorId || undefined, date, amount, description, lines: lines.map((l) => ({ ledgerId: l.ledgerId, debit: Number(l.debit), credit: Number(l.credit) })) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Voucher posted");
    onCreated();
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New Voucher</DialogTitle><DialogDescription>Double-entry posting. Debits must equal credits.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="RECEIPT">Receipt</SelectItem><SelectItem value="PAYMENT">Payment</SelectItem><SelectItem value="CONTRA">Contra</SelectItem><SelectItem value="JOURNAL">Journal</SelectItem><SelectItem value="SALES">Sales</SelectItem><SelectItem value="PURCHASE">Purchase</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        {vendors.length > 0 && (
          <div className="space-y-1.5"><Label>Vendor (optional)</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor…" /></SelectTrigger>
              <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.vendorCode} — {v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Lines</Label>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <Select value={l.ledgerId} onValueChange={(v) => updateLine(i, "ledgerId", v)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select ledger…" /></SelectTrigger>
                  <SelectContent>{ledgers.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input type="number" placeholder="Debit" value={l.debit} onChange={(e) => updateLine(i, "debit", e.target.value)} className="col-span-2 h-8" />
              <Input type="number" placeholder="Credit" value={l.credit} onChange={(e) => updateLine(i, "credit", e.target.value)} className="col-span-2 h-8" />
              <Button size="sm" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length <= 2} className="col-span-2 h-8">×</Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addLine}><Plus className="size-3 mr-1" /> Add line</Button>
        <div className={`rounded-lg p-3 text-sm flex justify-between ${balanced ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
          <span>Debit: <strong>{formatCurrency(totalDebit)}</strong></span>
          <span>Credit: <strong>{formatCurrency(totalCredit)}</strong></span>
          <span className={balanced ? "text-emerald-700" : "text-red-700"}>{balanced ? "✓ Balanced" : "✗ Mismatch"}</span>
        </div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading || !balanced} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Posting…" : "Post voucher"}</Button></DialogFooter>
    </DialogContent>
  );
}
