"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
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
import { Wallet, Plus, Search, Snowflake, Lock, Unlock, Eye, ArrowLeftRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { useNav } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type Account = {
  id: string;
  accountNumber: string;
  type: string;
  balance: number;
  currency: string;
  status: string;
  interestRate: number;
  minBalance: number;
  openedAt: string;
  customer: { id: string; fullName: string; customerNo: string; phone: string };
};

export function AccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [openNew, setOpenNew] = useState(false);

  const { setActive } = useNav();

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (type !== "ALL") params.set("type", type);
    const r = await fetch(`/api/accounts?${params.toString()}`);
    const j = await r.json();
    setAccounts(j.accounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q, status, type]);

  async function freezeAccount(id: string) {
    const r = await fetch(`/api/accounts/${id}/freeze`, { method: "POST" });
    if (r.ok) {
      toast.success("Account status toggled");
      load();
    } else toast.error("Failed");
  }

  async function closeAccount(id: string) {
    if (!confirm("Close this account? This cannot be undone.")) return;
    const r = await fetch(`/api/accounts/${id}/close`, { method: "POST" });
    const j = await r.json();
    if (r.ok) {
      toast.success("Account closed");
      load();
    } else {
      toast.error(j.error ?? "Failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Account Operations"
        description="Open, search, freeze or close deposit accounts. Choose an account to operate transactions."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> Open Account
              </Button>
            </DialogTrigger>
            <NewAccountDialog
              onCreated={() => {
                setOpenNew(false);
                toast.success("Account opened");
                load();
              }}
            />
          </Dialog>
        }
      />

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search by account no, customer name or phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="SAVINGS">Savings</SelectItem>
                <SelectItem value="CURRENT">Current</SelectItem>
                <SelectItem value="FIXED_DEPOSIT">Fixed Deposit</SelectItem>
                <SelectItem value="RECURRING">Recurring</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="FROZEN">Frozen</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : accounts.length === 0 ? (
            <EmptyState icon={Wallet} title="No accounts found" description="Adjust filters or open a new account." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Account No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="hidden lg:table-cell">Interest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs">{a.accountNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{a.customer.fullName}</div>
                        <div className="text-xs text-slate-500">{a.customer.customerNo}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {formatCurrency(a.balance)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                        {a.interestRate}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            a.status === "ACTIVE"
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : a.status === "FROZEN"
                                ? "border-amber-200 text-amber-700 bg-amber-50"
                                : "border-slate-200 text-slate-600 bg-slate-50"
                          }
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              localStorage.setItem("txn_account", a.accountNumber);
                              setActive("transactions");
                            }}
                            title="Operate transactions"
                          >
                            <ArrowLeftRight className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => freezeAccount(a.id)}
                            title={a.status === "FROZEN" ? "Unfreeze" : "Freeze"}
                            disabled={a.status === "CLOSED"}
                          >
                            {a.status === "FROZEN" ? (
                              <Unlock className="size-3.5" />
                            ) : (
                              <Snowflake className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => closeAccount(a.id)}
                            title="Close account"
                            disabled={a.status === "CLOSED" || a.balance > 0}
                          >
                            <Lock className="size-3.5" />
                          </Button>
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

function NewAccountDialog({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; customerNo: string }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [type, setType] = useState("SAVINGS");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customers?limit=200")
      .then((r) => r.json())
      .then((j) => setCustomers(j.customers ?? []));
  }, []);

  async function submit() {
    if (!customerId) {
      toast.error("Pick a customer");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        type,
        initialDeposit: initialDeposit || 0,
      }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    onCreated();
    setCustomerId("");
    setInitialDeposit("");
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Open new account</DialogTitle>
        <DialogDescription>
          Select the customer and account type. Defaults will be applied for interest rate and minimum balance.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer…" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName} ({c.customerNo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Account Type *</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAVINGS">Savings (3.5% / min ₹1000)</SelectItem>
              <SelectItem value="CURRENT">Current (0% / min ₹5000)</SelectItem>
              <SelectItem value="FIXED_DEPOSIT">Fixed Deposit (6.5% / min ₹10000)</SelectItem>
              <SelectItem value="RECURRING">Recurring (5.5% / min ₹100)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Initial Deposit (₹)</Label>
          <Input
            type="number"
            placeholder="0"
            value={initialDeposit}
            onChange={(e) => setInitialDeposit(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Opening…" : "Open Account"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
