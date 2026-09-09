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
import { BookOpen, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Group = { id: string; name: string; type: string };
type Ledger = {
  id: string;
  name: string;
  openingBalance: number;
  currentBalance: number;
  description: string | null;
  group: { name: string; type: string };
};

export function LedgersView() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [filterGroup, setFilterGroup] = useState("ALL");

  async function load() {
    setLoading(true);
    const [lR, gR] = await Promise.all([
      fetch("/api/ledgers?limit=200"),
      fetch("/api/account-groups"),
    ]);
    const lJ = await lR.json();
    const gJ = await gR.json();
    setLedgers(lJ.ledgers ?? []);
    setGroups(gJ.groups ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  const filtered = filterGroup === "ALL" ? ledgers : ledgers.filter((l) => l.group.name === filterGroup);

  return (
    <div>
      <PageHeader
        title="Ledgers"
        description="Create and manage ledgers under account groups. Each ledger tracks opening and current balance."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> New Ledger
              </Button>
            </DialogTrigger>
            <NewLedgerDialog groups={groups} onCreated={() => { setOpenNew(false); load(); }} />
          </Dialog>
        }
      />

      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-1">Filter by Group:</span>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-56 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Groups</SelectItem>
              {groups.map((g) => <SelectItem key={g.id} value={g.name}>{g.name} ({g.type})</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title="No ledgers" description="Create a ledger under a group." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Ledger Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-slate-900">{l.name}</TableCell>
                      <TableCell className="text-xs">{l.group.name}</TableCell>
                      <TableCell><Badge variant="outline" className={
                        l.group.type === "ASSET" ? "border-cyan-200 text-cyan-700 bg-cyan-50"
                        : l.group.type === "LIABILITY" ? "border-red-200 text-red-700 bg-red-50"
                        : l.group.type === "INCOME" ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                        : "border-amber-200 text-amber-700 bg-amber-50"
                      }>{l.group.type}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(l.openingBalance)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(l.currentBalance)}</TableCell>
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

function NewLedgerDialog({ groups, onCreated }: { groups: Group[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name || !groupId) { toast.error("Name and group required"); return; }
    setLoading(true);
    const r = await fetch("/api/ledgers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, groupId, openingBalance: Number(openingBalance), description }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Ledger created");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Ledger</DialogTitle><DialogDescription>Create a ledger under an account group.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5"><Label>Ledger Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cash in Hand" /></div>
        <div className="space-y-1.5"><Label>Group *</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger><SelectValue placeholder="Select group…" /></SelectTrigger>
            <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name} ({g.type})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Opening Balance (₹)</Label><Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Creating…" : "Create ledger"}</Button></DialogFooter>
    </DialogContent>
  );
}
