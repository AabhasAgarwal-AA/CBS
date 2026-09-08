"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, TrendingUp, TrendingDown, Banknote, Users, CreditCard, Wallet } from "lucide-react";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/banking";
import { PageHeader, LoadingGrid } from "./_shared";

type Report = {
  period: { from: string | null; to: string | null };
  transactionCount: number;
  totalCredit: number;
  totalDebit: number;
  totalDeposits: number;
  totalLoansOutstanding: number;
  activeAccounts: number;
  totalCustomers: number;
  totalCards: number;
  byType: { type: string; count: number; sum: number }[];
  byChannel: { channel: string; count: number; sum: number }[];
  transactions: Array<{
    id: string;
    txnRef: string;
    accountNumber: string;
    type: string;
    amount: number;
    balanceAfter: number;
    channel: string;
    createdAt: string;
  }>;
};

const COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

export function ReportsView() {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((j) => (setData(j), setLoading(false)))
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Reports & Analytics" description="Loading…" />
        <LoadingGrid />
      </div>
    );
  }

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Txn Ref", "Account", "Type", "Amount", "Balance After", "Channel", "Date"],
      ...data.transactions.map((t) => [
        t.txnRef,
        t.accountNumber,
        t.type,
        t.amount,
        t.balanceAfter,
        t.channel,
        new Date(t.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cbs-transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: "Transactions", value: formatNumber(data.transactionCount), icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Credit", value: formatCurrency(data.totalCredit), icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Debit", value: formatCurrency(data.totalDebit), icon: TrendingDown, color: "bg-red-50 text-red-600" },
    { label: "Total Deposits", value: formatCurrency(data.totalDeposits), icon: Wallet, color: "bg-teal-50 text-teal-600" },
    { label: "Loans Outstanding", value: formatCurrency(data.totalLoansOutstanding), icon: Banknote, color: "bg-amber-50 text-amber-600" },
    { label: "Active Accounts", value: formatNumber(data.activeAccounts), icon: Wallet, color: "bg-cyan-50 text-cyan-600" },
    { label: "Customers", value: formatNumber(data.totalCustomers), icon: Users, color: "bg-purple-50 text-purple-600" },
    { label: "Cards Issued", value: formatNumber(data.totalCards), icon: CreditCard, color: "bg-slate-100 text-slate-600" },
  ];

  const channelBar = data.byChannel.map((c) => ({
    channel: c.channel,
    count: c.count,
    volume: c.sum,
  }));

  const typePie = data.byType.map((t) => ({
    name: t.type,
    value: t.count,
    sum: t.sum,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Analytics"
        description="Aggregate view of transactions, deposits, and credit exposure."
        action={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">{k.label}</div>
                    <div className="text-lg font-bold text-slate-900 mt-1">{k.value}</div>
                  </div>
                  <div className={`size-8 rounded-lg grid place-items-center ${k.color}`}>
                    <Icon className="size-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaction count & volume by channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="channel" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(v: number, n: string) =>
                      n === "volume" ? formatCurrency(v) : formatNumber(v)
                    }
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="volume" name="Volume" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaction distribution by type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typePie}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {typePie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(_v: number, _n: string, p: { payload?: { sum?: number } }) =>
                      `Volume: ${formatCurrency(p?.payload?.sum ?? 0)}`
                    }
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent transactions (latest 500)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[50vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Balance</TableHead>
                  <TableHead className="hidden md:table-cell">Channel</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.slice(0, 100).map((t) => {
                  const credit = ["DEPOSIT", "TRANSFER_IN", "INTEREST"].includes(t.type);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs text-slate-500">{t.txnRef}</TableCell>
                      <TableCell className="font-mono text-xs">{t.accountNumber}</TableCell>
                      <TableCell className="text-xs">{t.type}</TableCell>
                      <TableCell className={`text-right font-medium ${credit ? "text-emerald-600" : "text-red-600"}`}>
                        {credit ? "+" : "−"}
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell text-xs text-slate-600">
                        {formatCurrency(t.balanceAfter)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{t.channel}</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDateTime(t.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
