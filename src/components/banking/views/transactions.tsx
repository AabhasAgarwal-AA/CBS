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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  ArrowLeftRight,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Send,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Txn = {
  id: string;
  txnRef: string;
  accountNumber: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  counterparty: string | null;
  channel: string;
  status: string;
  createdAt: string;
};

export function TransactionsView() {
  const [accountNumber, setAccountNumber] = useState("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentBal, setCurrentBal] = useState<number | null>(null);
  const [acctStatus, setAcctStatus] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("txn_account");
    if (!saved) return;
    // Sync state from external system (browser localStorage) - deferred to avoid cascading renders
    const t = setTimeout(() => {
      setAccountNumber(saved);
      localStorage.removeItem("txn_account");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function loadTxns(acct: string) {
    if (!acct) return;
    setLoading(true);
    const r = await fetch(`/api/transactions?accountNumber=${encodeURIComponent(acct)}`);
    const j = await r.json();
    setTxns(j.transactions ?? []);
    // also fetch the account for balance
    const ar = await fetch(`/api/accounts/${acct}`);
    if (ar.ok) {
      const aj = await ar.json();
      setCurrentBal(aj.account?.balance ?? null);
      setAcctStatus(aj.account?.status ?? null);
    } else {
      setCurrentBal(null);
      setAcctStatus(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!accountNumber) return;
    const t = setTimeout(() => loadTxns(accountNumber), 0);
    return () => clearTimeout(t);
  }, [accountNumber]);

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Process deposits, withdrawals, and account-to-account transfers for any active account."
      />

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 w-full space-y-1.5">
              <Label>Account Number</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="pl-9 font-mono"
                />
              </div>
            </div>
            <Button onClick={() => loadTxns(accountNumber)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Search className="size-4 mr-1.5" /> Load
            </Button>
          </div>
          {currentBal !== null && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <div className="text-xs text-emerald-700 font-medium">Current Balance</div>
                <div className="text-xl font-bold text-emerald-900">{formatCurrency(currentBal)}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-600 font-medium">Account Status</div>
                <div className="text-xl font-bold text-slate-900">{acctStatus ?? "—"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {accountNumber ? (
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-1">
            <Tabs defaultValue="deposit">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deposit">
                  <ArrowDownCircle className="size-3.5 mr-1" /> Deposit
                </TabsTrigger>
                <TabsTrigger value="withdraw">
                  <ArrowUpCircle className="size-3.5 mr-1" /> Withdraw
                </TabsTrigger>
                <TabsTrigger value="transfer">
                  <Send className="size-3.5 mr-1" /> Transfer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deposit" className="mt-3">
                <TxnForm
                  accountNumber={accountNumber}
                  type="DEPOSIT"
                  onSuccess={() => loadTxns(accountNumber)}
                />
              </TabsContent>
              <TabsContent value="withdraw" className="mt-3">
                <TxnForm
                  accountNumber={accountNumber}
                  type="WITHDRAW"
                  onSuccess={() => loadTxns(accountNumber)}
                />
              </TabsContent>
              <TabsContent value="transfer" className="mt-3">
                <TxnForm
                  accountNumber={accountNumber}
                  type="TRANSFER_OUT"
                  transfer
                  onSuccess={() => loadTxns(accountNumber)}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="size-4 text-emerald-600" /> Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
                ) : txns.length === 0 ? (
                  <EmptyState icon={Wallet} title="No transactions yet" />
                ) : (
                  <div className="max-h-[55vh] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                        <TableRow>
                          <TableHead>Ref</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Balance</TableHead>
                          <TableHead className="hidden lg:table-cell">Channel</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {txns.map((t) => {
                          const credit = ["DEPOSIT", "TRANSFER_IN", "INTEREST"].includes(t.type);
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-mono text-xs text-slate-500">
                                {t.txnRef}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{t.type.replace("_", " ")}</Badge>
                              </TableCell>
                              <TableCell
                                className={`text-right font-semibold ${credit ? "text-emerald-600" : "text-red-600"
                                  }`}
                              >
                                {credit ? "+" : "−"}
                                {formatCurrency(t.amount)}
                              </TableCell>
                              <TableCell className="text-right hidden md:table-cell text-slate-600">
                                {formatCurrency(t.balanceAfter)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-xs">
                                {t.channel}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {formatDateTime(t.createdAt)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={ArrowLeftRight}
            title="Pick an account to begin"
            description="Enter an account number above to load its transaction history and process new transactions. Tip: you can also use the Accounts tab → actions menu."
          />
        </div>
      )}
    </div>
  );
}

function TxnForm({
  accountNumber,
  type,
  transfer,
  onSuccess,
}: {
  accountNumber: string;
  type: string;
  transfer?: boolean;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState("TELLER");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (transfer && !counterparty) {
      toast.error("Enter counterparty account");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountNumber,
        type,
        amount: Number(amount),
        counterpartyAccount: counterparty || undefined,
        description: description || undefined,
        channel,
      }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      toast.error(j.error ?? "Transaction failed");
      return;
    }
    toast.success(
      `${type.replace("_", " ")} of ${formatCurrency(Number(amount))} successful`
    );
    setAmount("");
    setCounterparty("");
    setDescription("");
    onSuccess();
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label>Amount (₹) *</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {transfer && (
          <div className="space-y-1.5">
            <Label>To Account *</Label>
            <Input
              placeholder="Destination account number"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className="font-mono"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Channel</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TELLER">Teller</SelectItem>
              <SelectItem value="ATM">ATM</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="MOBILE">Mobile</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            placeholder="Optional note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button
          onClick={submit}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading
            ? "Processing…"
            : type === "DEPOSIT"
              ? "Deposit"
              : type === "WITHDRAW"
                ? "Withdraw"
                : "Transfer"}
        </Button>
      </CardContent>
    </Card>
  );
}