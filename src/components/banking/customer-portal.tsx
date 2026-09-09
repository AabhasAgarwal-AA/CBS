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
  Smartphone, Lock, LogOut, Wallet, Landmark, CreditCard, ArrowDownLeft, ArrowUpRight, RefreshCw, ArrowLeftRight,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/banking";
import { toast } from "sonner";

type Customer = { id: string; customerNo: string; name: string; phone: string };
type Account = {
  accountNumber: string;
  type: string;
  balance: number;
  currency: string;
  interestRate: number;
  updatedAt: string;
};
type Loan = { loanNumber: string; type: string; outstanding: number; emi: number };
type CardRow = { cardNumber: string; type: string; network: string; expiryMonth: number; expiryYear: number };
type Txn = {
  id: string;
  txnRef: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
};

export function CustomerPortal() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phone, setPhone] = useState("");
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [tab, setTab] = useState<"accounts" | "transactions" | "cards">("accounts");
  const [refreshing, setRefreshing] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/customer-portal/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mpin }),
      });
      const j = await r.json();
      if (!r.ok) { toast.error(j.error ?? "Login failed"); setLoading(false); return; }
      setCustomer(j.customer);
      await loadData();
      toast.success(`Welcome, ${j.customer.name}`);
    } catch {
      toast.error("Network error");
      setLoading(false);
    }
  }

  async function loadData() {
    setRefreshing(true);
    const [bR, mR] = await Promise.all([
      fetch("/api/customer-portal/balance"),
      fetch("/api/customer-portal/mini-statement"),
    ]);
    if (bR.ok) {
      const j = await bR.json();
      setAccounts(j.accounts ?? []);
      setLoans(j.loans ?? []);
      setCards(j.cards ?? []);
    }
    if (mR.ok) {
      const j = await mR.json();
      setTxns(j.transactions ?? []);
    }
    setRefreshing(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Clear customer token cookie
    document.cookie = "cbs_customer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setCustomer(null);
    setAccounts([]); setLoans([]); setCards([]); setTxns([]);
  }

  useEffect(() => {
    if (customer) loadData();
  }, [customer]);

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 grid place-items-center p-4">
        <Card className="w-full max-w-md shadow-xl border-emerald-100">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto size-16 rounded-2xl bg-emerald-600 text-white grid place-items-center shadow-lg shadow-emerald-200">
              <Smartphone className="size-8" />
            </div>
            <div>
              <CardTitle className="text-xl">CBS Mobile Banking</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Customer self-service portal</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Registered Phone</Label>
                <Input
                  id="phone" type="tel" required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210" className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mpin">MPIN (4-digit)</Label>
                <Input
                  id="mpin" type="password" required maxLength={4} inputMode="numeric"
                  value={mpin}
                  onChange={(e) => setMpin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••" className="font-mono tracking-widest text-center text-lg"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? "Signing in…" : <><Lock className="size-4 mr-2" /> Sign In</>}
              </Button>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700">Demo Access</div>
                <div>Use any seeded customer's phone (e.g. <code className="text-emerald-700">9876543210</code>)</div>
                <div>MPIN: <code className="text-emerald-700">1234</code> (for all seeded customers)</div>
                <div className="text-slate-400 mt-1">Staff portal: <a href="/" className="text-emerald-700 underline">click here</a></div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-emerald-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-white/20 grid place-items-center">
              <Smartphone className="size-5" />
            </div>
            <div>
              <div className="font-semibold leading-tight">CBS Mobile</div>
              <div className="text-xs opacity-80 leading-tight">{customer.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={loadData} disabled={refreshing}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
        {/* Balance card */}
        <Card className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="text-xs opacity-80 uppercase tracking-wide">Total Available Balance</div>
            <div className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</div>
            <div className="flex items-center justify-between mt-3 text-xs opacity-80">
              <span>{customer.customerNo}</span>
              <span>{accounts.length} accounts</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {([
            ["accounts", "Accounts", Wallet],
            ["transactions", "Transactions", ArrowLeftRight],
            ["cards", "Cards & Loans", CreditCard],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg text-xs font-medium transition ${
                tab === k ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "accounts" && (
          <div className="space-y-2">
            {accounts.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-slate-500">No accounts found.</CardContent></Card>
            ) : (
              accounts.map((a) => (
                <Card key={a.accountNumber}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-mono">{a.accountNumber}</div>
                      <div className="font-semibold text-slate-900">{a.type.replace("_", " ")}</div>
                      <div className="text-xs text-slate-500">{a.interestRate}% p.a.</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatCurrency(a.balance)}</div>
                      <Badge variant="outline" className="mt-1 border-emerald-200 text-emerald-700 bg-emerald-50">ACTIVE</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "transactions" && (
          <div className="space-y-2">
            {txns.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-slate-500">No recent transactions.</CardContent></Card>
            ) : (
              txns.map((t) => {
                const credit = ["DEPOSIT", "TRANSFER_IN", "INTEREST", "NEFT_IN", "RTGS_IN", "IMPS_IN", "QR_IN", "PIGMY_COLLECT"].includes(t.type);
                return (
                  <Card key={t.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`size-9 rounded-full grid place-items-center ${credit ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {credit ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{t.type.replace(/_/g, " ")}</div>
                        <div className="text-xs text-slate-500 truncate">{t.description ?? "—"}</div>
                        <div className="text-xs text-slate-400">{formatDateTime(t.createdAt)}</div>
                      </div>
                      <div className={`text-sm font-semibold ${credit ? "text-emerald-700" : "text-red-700"}`}>
                        {credit ? "+" : "−"}{formatCurrency(t.amount)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {tab === "cards" && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase mb-2">Cards</div>
              {cards.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-slate-500">No active cards.</CardContent></Card>
              ) : (
                cards.map((c) => (
                  <Card key={c.cardNumber} className="overflow-hidden">
                    <CardContent className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                      <div className="flex items-center justify-between">
                        <div className="text-xs opacity-70">{c.network}</div>
                        <div className="text-xs opacity-70">{c.type}</div>
                      </div>
                      <div className="font-mono text-lg mt-4 tracking-wider">{c.cardNumber}</div>
                      <div className="flex justify-between mt-3 text-xs opacity-80">
                        <span>EXP: {String(c.expiryMonth).padStart(2, "0")}/{String(c.expiryYear).slice(-2)}</span>
                        <Landmark className="size-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase mb-2">Active Loans</div>
              {loans.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-slate-500">No active loans.</CardContent></Card>
              ) : (
                loans.map((l) => (
                  <Card key={l.loanNumber}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-slate-900">{l.type}</div>
                          <div className="text-xs text-slate-500 font-mono">{l.loanNumber}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Outstanding</div>
                          <div className="font-semibold text-slate-900">{formatCurrency(l.outstanding)}</div>
                          <div className="text-xs text-slate-500 mt-1">EMI {formatCurrency(l.emi)}/mo</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
