"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
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
  Users,
  Wallet,
  Landmark,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/banking";
import { useNav } from "@/lib/store";
import { LoadingGrid, PageHeader } from "./_shared";

type DashData = {
  customers: number;
  accounts: number;
  loans: number;
  cards: number;
  staffCount: number;
  totalDeposits: number;
  totalLoansOutstanding: number;
  trend: { date: string; credit: number; debit: number }[];
  acctByType: { type: string; _count: number; _sum: { balance: number } }[];
  loanByType: { type: string; _count: number; _sum: { outstanding: number } }[];
  recentActivity: {
    id: string;
    txnRef: string;
    accountNumber: string;
    type: string;
    amount: number;
    createdAt: string;
  }[];
  pendingLoans: {
    id: string;
    loanNumber: string;
    principal: number;
    type: string;
    customer: { fullName: string };
  }[];
};

const COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444"];

export function DashboardView() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const { setActive } = useNav();

  useEffect(() => {
    let alive = true;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((j) => alive && (setData(j), setLoading(false)))
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Loading bank overview…" />
        <LoadingGrid />
      </div>
    );
  }

  const trendData = data.trend.map((t) => ({
    date: t.date.slice(5),
    credit: t.credit,
    debit: t.debit,
  }));

  const acctPie = data.acctByType.map((a) => ({
    name: a.type,
    value: a._count,
    balance: a._sum.balance,
  }));

  const loanPie = data.loanByType.map((a) => ({
    name: a.type,
    value: a._count,
    outstanding: a._sum.outstanding,
  }));

  const cards = [
    {
      label: "Total Customers",
      value: formatNumber(data.customers),
      delta: "+12.4% MoM",
      up: true,
      icon: Users,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Active Accounts",
      value: formatNumber(data.accounts),
      delta: "+5.1% MoM",
      up: true,
      icon: Wallet,
      color: "bg-teal-50 text-teal-600",
    },
    {
      label: "Total Deposits",
      value: formatCurrency(data.totalDeposits),
      delta: "+8.7% MoM",
      up: true,
      icon: TrendingUp,
      color: "bg-cyan-50 text-cyan-600",
    },
    {
      label: "Loans Outstanding",
      value: formatCurrency(data.totalLoansOutstanding),
      delta: "+3.2% MoM",
      up: true,
      icon: Landmark,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Cards Issued",
      value: formatNumber(data.cards),
      delta: "+2.0% MoM",
      up: true,
      icon: CreditCard,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Bank Staff",
      value: formatNumber(data.staffCount),
      delta: "Active",
      up: true,
      icon: Users,
      color: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banking Operations Overview"
        description="Real-time snapshot of customers, deposits, credit and operations."
        action={
          <Button variant="outline" size="sm" onClick={() => setActive("reports")}>
            View reports
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {c.label}
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1.5">{c.value}</div>
                  </div>
                  <div className={`size-10 rounded-lg grid place-items-center ${c.color}`}>
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs">
                  {c.up ? (
                    <TrendingUp className="size-3.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="size-3.5 text-red-600" />
                  )}
                  <span className={c.up ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                    {c.delta}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Credit vs Debit — last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="cCredit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cDebit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="credit"
                    stroke="#10b981"
                    fill="url(#cCredit)"
                    name="Credit"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="debit"
                    stroke="#ef4444"
                    fill="url(#cDebit)"
                    name="Debit"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accounts by type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={acctPie}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {acctPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(_v: number, _n: string, p: { payload?: { balance?: number } }) =>
                      `Balance: ${formatCurrency(p?.payload?.balance ?? 0)}`
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

      {/* Recent activity + pending loans */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-emerald-600" /> Recent transactions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActive("transactions")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentActivity.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">No transactions yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentActivity.map((t) => {
                  const credit = ["DEPOSIT", "TRANSFER_IN", "INTEREST"].includes(t.type);
                  return (
                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {t.type.replace("_", " ")} · {t.accountNumber}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="size-3" /> {formatDateTime(t.createdAt)}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          credit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {credit ? "+" : "−"}
                        {formatCurrency(t.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-600" /> Pending loan approvals
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActive("loans")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {data.pendingLoans.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">
                No loans awaiting approval.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.pendingLoans.map((l) => (
                  <div
                    key={l.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {l.customer.fullName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {l.loanNumber} · {l.type}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(l.principal)}
                      </div>
                      <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 mt-1">
                        PENDING
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
