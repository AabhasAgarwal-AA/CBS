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
import { UsersRound, Plus, HandCoins, MapPin } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type Agent = {
  id: string;
  agentCode: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  totalCollections: number;
  todayCollections: number;
  branch?: { name: string; code: string; city: string } | null;
  _count: { fieldCollections: number };
};

type Collection = {
  id: string;
  agentId: string;
  customerId: string;
  accountNumber: string;
  amount: number;
  receiptNo: string;
  location: string | null;
  status: string;
  collectedAt: string;
  agent: { agentCode: string; name: string };
  customer: { fullName: string; customerNo: string; phone: string };
  account: { accountNumber: string; type: string };
};

export function AgentsView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"agents" | "collections">("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [openCollect, setOpenCollect] = useState(false);

  async function load() {
    setLoading(true);
    const [aR, cR] = await Promise.all([
      fetch("/api/agents?limit=100"),
      fetch("/api/field-collections?limit=100"),
    ]);
    const aJ = await aR.json();
    const cJ = await cR.json();
    setAgents(aJ.agents ?? []);
    setCollections(cJ.collections ?? []);
    setTotal(cJ.total ?? 0);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  return (
    <div>
      <PageHeader
        title="Field Agents & Collections"
        description="Manage door-to-door collection agents (Pigmy / MIS agents) and record field cash collections."
        action={
          <>
            <Dialog open={openCollect} onOpenChange={setOpenCollect}>
              <DialogTrigger asChild>
                <Button variant="outline" className="mr-2">
                  <HandCoins className="size-4 mr-1.5" /> Record Collection
                </Button>
              </DialogTrigger>
              <NewCollectionDialog onCreated={() => { setOpenCollect(false); load(); }} />
            </Dialog>
            {user?.role !== "TELLER" && (
              <Dialog open={openNew} onOpenChange={setOpenNew}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="size-4 mr-1.5" /> New Agent
                  </Button>
                </DialogTrigger>
                <NewAgentDialog onCreated={() => { setOpenNew(false); load(); }} />
              </Dialog>
            )}
          </>
        }
      />

      <div className="inline-flex rounded-lg bg-slate-100 p-1 mb-4">
        <button onClick={() => setTab("agents")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "agents" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
          Agents ({agents.length})
        </button>
        <button onClick={() => setTab("collections")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "collections" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
          Today's Collections ({collections.length} · {formatCurrency(total)})
        </button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tab === "agents" ? (
            agents.length === 0 ? (
              <EmptyState icon={UsersRound} title="No agents yet" description="Create a field agent to start door-to-door collections." />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Branch</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Today</TableHead>
                      <TableHead className="text-center">Collections</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.agentCode}</TableCell>
                        <TableCell className="font-medium text-slate-900">{a.name}</TableCell>
                        <TableCell className="text-xs">{a.phone}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{a.branch?.name ?? "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(a.totalCollections)}</TableCell>
                        <TableCell className="text-right text-emerald-700 font-medium">{formatCurrency(a.todayCollections)}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{a._count.fieldCollections}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={a.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{a.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : collections.length === 0 ? (
            <EmptyState icon={HandCoins} title="No collections yet" description="Record a field collection from an agent's rounds." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Collected At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.receiptNo}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-800">{c.agent.name}</div>
                        <div className="text-slate-500">{c.agent.agentCode}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{c.customer.fullName}</div>
                        <div className="text-slate-500">{c.customer.phone}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.accountNumber}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">+{formatCurrency(c.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">{c.location ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">{c.status}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDateTime(c.collectedAt)}</TableCell>
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

function NewAgentDialog({ onCreated }: { onCreated: () => void }) {
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/branches").then((r) => r.json()).then((j) => setBranches(j.branches ?? [])); }, []);

  async function submit() {
    if (!name || !phone || !password) { toast.error("name, phone, password required"); return; }
    setLoading(true);
    const r = await fetch("/api/agents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email: email || undefined, password, branchId: branchId || undefined }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Agent ${j.agent.agentCode} created`);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create field agent</DialogTitle>
        <DialogDescription>Field agents collect daily deposits (Pigmy style) from customers' doorsteps.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Password *</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Creating…" : "Create agent"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function NewCollectionDialog({ onCreated }: { onCreated: () => void }) {
  const [agents, setAgents] = useState<{ id: string; agentCode: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ accountNumber: string; customer: { fullName: string } }[]>([]);
  const [agentId, setAgentId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/agents?limit=200").then((r) => r.json()).then((j) => setAgents(j.agents ?? [])); }, []);
  useEffect(() => { fetch("/api/accounts?limit=200").then((r) => r.json()).then((j) => setAccounts(j.accounts ?? [])); }, []);

  async function submit() {
    if (!agentId || !accountNumber || !amount) { toast.error("All fields required"); return; }
    setLoading(true);
    const r = await fetch("/api/field-collections", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, accountNumber, amount: Number(amount), location: location || undefined }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Collection recorded — Receipt ${j.collection.receiptNo}`);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Record field collection</DialogTitle>
        <DialogDescription>Agent collects cash from a customer's account. Receipt issued and SMS sent.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Agent *</Label>
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger><SelectValue placeholder="Select agent…" /></SelectTrigger>
            <SelectContent>{agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.agentCode} — {a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Customer Account *</Label>
          <Select value={accountNumber} onValueChange={setAccountNumber}>
            <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.accountNumber} value={a.accountNumber}>{a.accountNumber} · {a.customer.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Amount (₹) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Doorstep / Branch" /></div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Recording…" : "Record collection"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
