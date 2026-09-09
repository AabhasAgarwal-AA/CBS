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
import { BookOpen, Plus, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  openingBalance: number;
  isActive: boolean;
  _count: { journalLines: number };
};

type JournalEntry = {
  id: string;
  entryNo: string;
  date: string;
  description: string | null;
  reference: string | null;
  status: string;
  lines: Array<{
    id: string;
    accountCode: string;
    debit: number;
    credit: number;
    description: string | null;
    account: { name: string; type: string };
  }>;
};

export function AccountingView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"coa" | "journal">("coa");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const [aR, jR] = await Promise.all([
      fetch("/api/chart-of-accounts"),
      fetch("/api/journal-entries?limit=100"),
    ]);
    const aJ = await aR.json();
    const jJ = await jR.json();
    setAccounts(aJ.accounts ?? []);
    setEntries(jJ.entries ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  return (
    <div>
      <PageHeader
        title="Accounting"
        description="Chart of accounts (ASSET / LIABILITY / INCOME / EXPENSE / EQUITY) and double-entry journal posting."
        action={
          user?.role !== "TELLER" && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> {tab === "coa" ? "New Account" : "New Journal Entry"}
                </Button>
              </DialogTrigger>
              {tab === "coa" && <NewAccountDialog onCreated={() => { setOpenNew(false); load(); }} />}
              {tab === "journal" && <NewJournalDialog accounts={accounts} onCreated={() => { setOpenNew(false); load(); }} />}
            </Dialog>
          )
        }
      />

      <div className="inline-flex rounded-lg bg-slate-100 p-1 mb-4">
        <button onClick={() => setTab("coa")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "coa" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Chart of Accounts ({accounts.length})</button>
        <button onClick={() => setTab("journal")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "journal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Journal Entries ({entries.length})</button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tab === "coa" ? (
            accounts.length === 0 ? (
              <EmptyState icon={BookOpen} title="No accounts in chart" />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Opening Balance</TableHead><TableHead className="text-center">Entries</TableHead><TableHead>Status</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.code}</TableCell>
                        <TableCell className="font-medium text-slate-900">{a.name}</TableCell>
                        <TableCell><Badge variant="outline" className={
                          a.type === "ASSET" ? "border-cyan-200 text-cyan-700 bg-cyan-50"
                          : a.type === "LIABILITY" ? "border-red-200 text-red-700 bg-red-50"
                          : a.type === "INCOME" ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                          : a.type === "EXPENSE" ? "border-amber-200 text-amber-700 bg-amber-50"
                          : "border-purple-200 text-purple-700 bg-purple-50"
                        }>{a.type}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(a.openingBalance)}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{a._count.journalLines}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={a.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{a.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : entries.length === 0 ? (
            <EmptyState icon={FileText} title="No journal entries" description="Post a double-entry journal entry to get started." />
          ) : (
            <div className="max-h-[60vh] overflow-auto p-4 space-y-3">
              {entries.map((e) => {
                const totalDebit = e.lines.reduce((s, l) => s + l.debit, 0);
                return (
                  <Card key={e.id} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-mono text-sm font-semibold text-slate-900">{e.entryNo}</div>
                          <div className="text-xs text-slate-500">{e.description ?? "—"}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">{e.status}</Badge>
                          <div className="text-xs text-slate-500 mt-1">{formatDate(e.date)}</div>
                        </div>
                      </div>
                      <Table>
                        <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {e.lines.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs"><span className="font-mono">{l.accountCode}</span> · {l.account.name}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">{l.account.type}</Badge></TableCell>
                              <TableCell className="text-right text-xs">{l.debit > 0 ? formatCurrency(l.debit) : "—"}</TableCell>
                              <TableCell className="text-right text-xs">{l.credit > 0 ? formatCurrency(l.credit) : "—"}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 font-semibold">
                            <TableCell colSpan={2}>Total</TableCell>
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

function NewAccountDialog({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("ASSET");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!code || !name) { toast.error("Code and name required"); return; }
    setLoading(true);
    const r = await fetch("/api/chart-of-accounts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, type, openingBalance: Number(openingBalance) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Account created");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Account</DialogTitle><DialogDescription>Create a chart of accounts entry.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="1000" /></div>
          <div className="space-y-1.5"><Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ASSET">Asset</SelectItem><SelectItem value="LIABILITY">Liability</SelectItem><SelectItem value="INCOME">Income</SelectItem><SelectItem value="EXPENSE">Expense</SelectItem><SelectItem value="EQUITY">Equity</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cash in Hand" /></div>
        <div className="space-y-1.5"><Label>Opening Balance (₹)</Label><Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} /></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Creating…" : "Create"}</Button></DialogFooter>
    </DialogContent>
  );
}

function NewJournalDialog({ accounts, onCreated }: { accounts: Account[]; onCreated: () => void }) {
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState([
    { accountCode: "", debit: "0", credit: "0" },
    { accountCode: "", debit: "0", credit: "0" },
  ]);
  const [loading, setLoading] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  function updateLine(i: number, field: "accountCode" | "debit" | "credit", val: string) {
    const next = [...lines];
    next[i] = { ...next[i], [field]: val };
    setLines(next);
  }
  function addLine() { setLines([...lines, { accountCode: "", debit: "0", credit: "0" }]); }
  function removeLine(i: number) { if (lines.length > 2) setLines(lines.filter((_, idx) => idx !== i)); }

  async function submit() {
    if (!balanced) { toast.error("Debits and credits must match"); return; }
    if (lines.some((l) => !l.accountCode)) { toast.error("All lines need an account"); return; }
    setLoading(true);
    const r = await fetch("/api/journal-entries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, reference, lines: lines.map((l) => ({ accountCode: l.accountCode, debit: Number(l.debit), credit: Number(l.credit) })) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Journal entry posted");
    onCreated();
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>New Journal Entry</DialogTitle><DialogDescription>Double-entry posting. Debits must equal credits.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <Select value={l.accountCode} onValueChange={(v) => updateLine(i, "accountCode", v)}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select account…" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.code}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
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
          <span>Total Debit: <strong>{formatCurrency(totalDebit)}</strong></span>
          <span>Total Credit: <strong>{formatCurrency(totalCredit)}</strong></span>
          <span className={balanced ? "text-emerald-700" : "text-red-700"}>{balanced ? "✓ Balanced" : "✗ Mismatch"}</span>
        </div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading || !balanced} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Posting…" : "Post entry"}</Button></DialogFooter>
    </DialogContent>
  );
}
