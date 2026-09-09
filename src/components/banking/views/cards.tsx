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
import { CreditCard, Plus, Ban, RotateCcw, ShieldCheck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type CardRow = {
  id: string;
  cardNumber: string;
  cardNumberMasked: string;
  type: string;
  network: string;
  expiryMonth: number;
  expiryYear: number;
  status: string;
  creditLimit: number;
  dailyLimit: number;
  customer: { id: string; fullName: string; customerNo: string };
  account: { accountNumber: string };
  createdAt: string;
};

export function CardsView() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    const r = await fetch(`/api/cards?${params.toString()}`);
    const j = await r.json();
    setCards(j.cards ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [status]);

  async function block(id: string) {
    const r = await fetch(`/api/cards/${id}/block`, { method: "POST" });
    if (r.ok) {
      toast.success("Card blocked");
      load();
    } else toast.error("Failed");
  }

  async function unblock(id: string) {
    const r = await fetch(`/api/cards/${id}/unblock`, { method: "POST" });
    if (r.ok) {
      toast.success("Card unblocked");
      load();
    } else toast.error("Failed");
  }

  return (
    <div>
      <PageHeader
        title="Card Management"
        description="Issue debit and credit cards, set limits, block or unblock."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> Issue Card
              </Button>
            </DialogTrigger>
            <NewCardDialog
              onCreated={() => {
                setOpenNew(false);
                load();
              }}
            />
          </Dialog>
        }
      />

      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-1">Status:</span>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : cards.length === 0 ? (
            <EmptyState icon={CreditCard} title="No cards issued" description="Issue a debit or credit card to get started." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Card No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Limit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs">{c.cardNumberMasked}</TableCell>
                      <TableCell className="font-medium text-slate-900">{c.customer.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.type === "CREDIT" ? "border-purple-200 text-purple-700 bg-purple-50" : ""}>
                          {c.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.network}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">
                        {String(c.expiryMonth).padStart(2, "0")}/{String(c.expiryYear).slice(-2)}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell text-xs">
                        {c.type === "CREDIT" ? formatCurrency(c.creditLimit) : formatCurrency(c.dailyLimit) + "/d"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          c.status === "ACTIVE"
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                            : c.status === "BLOCKED"
                            ? "border-red-200 text-red-700 bg-red-50"
                            : "border-slate-200 text-slate-600 bg-slate-50"
                        }>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.status === "ACTIVE" ? (
                            <Button size="sm" variant="ghost" onClick={() => block(c.id)} title="Block card">
                              <Ban className="size-3.5" />
                            </Button>
                          ) : c.status === "BLOCKED" ? (
                            <Button size="sm" variant="ghost" onClick={() => unblock(c.id)} title="Unblock card">
                              <RotateCcw className="size-3.5" />
                            </Button>
                          ) : null}
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

function NewCardDialog({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string }[]>([]);
  const [accounts, setAccounts] = useState<{ accountNumber: string; type: string; balance: number }[]>([]);
  const [customerId, setCustomerIdState] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [type, setType] = useState("DEBIT");
  const [network, setNetwork] = useState("VISA");
  const [creditLimit, setCreditLimit] = useState("100000");
  const [dailyLimit, setDailyLimit] = useState("50000");
  const [loading, setLoading] = useState(false);
  const [issuedCvv, setIssuedCvv] = useState<string | null>(null);
  const [issuedCard, setIssuedCard] = useState<CardRow | null>(null);

  function setCustomerId(v: string) {
    setCustomerIdState(v);
    setAccountNumber("");
    setAccounts([]);
  }

  useEffect(() => {
    fetch("/api/customers?limit=200")
      .then((r) => r.json())
      .then((j) => setCustomers(j.customers ?? []));
  }, []);

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/accounts?customerId=${customerId}&limit=50`)
      .then((r) => r.json())
      .then((j) => setAccounts(j.accounts ?? []));
  }, [customerId]);

  async function submit() {
    if (!customerId || !accountNumber) {
      toast.error("Pick a customer and an account");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        accountNumber,
        type,
        network,
        creditLimit: type === "CREDIT" ? Number(creditLimit) : 0,
        dailyLimit: Number(dailyLimit),
      }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    toast.success("Card issued");
    setIssuedCard(j.card);
    setIssuedCvv(j.cvv);
  }

  function reset() {
    setCustomerId("");
    setAccountNumber("");
    setType("DEBIT");
    setNetwork("VISA");
    setCreditLimit("100000");
    setDailyLimit("50000");
    setIssuedCard(null);
    setIssuedCvv(null);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Issue new card</DialogTitle>
        <DialogDescription>
          {issuedCard
            ? "Card issued successfully. Note the CVV (shown once)."
            : "Select a customer and an active account to issue a card."}
        </DialogDescription>
      </DialogHeader>

      {issuedCard ? (
        <div className="py-4 space-y-3">
          <div className="rounded-xl bg-gradient-to-br from-slate-900 to-emerald-900 text-white p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs opacity-70">{issuedCard.network} {issuedCard.type}</div>
                <div className="font-mono mt-4 tracking-wider">{issuedCard.cardNumberMasked}</div>
                <div className="mt-3 text-xs opacity-70">
                  EXP: {String(issuedCard.expiryMonth).padStart(2, "0")}/{String(issuedCard.expiryYear).slice(-2)}
                </div>
              </div>
              <ShieldCheck className="size-8 opacity-50" />
            </div>
            <div className="mt-4 text-sm">
              CVV: <span className="font-mono font-bold">{issuedCvv}</span>
            </div>
          </div>
          <Button onClick={reset} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            Issue another
          </Button>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Account *</Label>
            <Select value={accountNumber} onValueChange={setAccountNumber} disabled={!customerId}>
              <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.accountNumber} value={a.accountNumber}>
                    {a.accountNumber} · {a.type} · {formatCurrency(a.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Card Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Network</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISA">Visa</SelectItem>
                  <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                  <SelectItem value="RUPAY">RuPay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {type === "CREDIT" && (
            <div className="space-y-1.5">
              <Label>Credit Limit (₹)</Label>
              <Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Daily Limit (₹)</Label>
            <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
          </div>
        </div>
      )}

      {!issuedCard && (
        <DialogFooter>
          <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? "Issuing…" : "Issue Card"}
          </Button>
        </DialogFooter>
      )}
    </DialogContent>
  );
}
