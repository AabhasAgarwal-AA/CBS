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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarChart3, FileText, TrendingUp, Wallet, Calendar, Percent, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

const REPORT_TYPES = [
  { value: "FUND_POSITION", label: "Fund Position", icon: Wallet, desc: "Total deposits vs loans vs cash in hand" },
  { value: "NDH3", label: "NDH-3 Report", icon: FileText, desc: "Deposit balances by account type" },
  { value: "MATURITY_TD", label: "TD Maturity Expiry", icon: Calendar, desc: "FD accounts maturing in next 30 days" },
  { value: "MATURITY_CLOSED", label: "Closed Maturity", icon: Calendar, desc: "Accounts closed in date range" },
  { value: "INTEREST_PAID", label: "Interest Paid", icon: Percent, desc: "Total interest paid in date range" },
  { value: "NEFT_REQUEST", label: "NEFT Request Report", icon: FileText, desc: "All NEFT payment orders" },
  { value: "DEPOSIT_BALANCE", label: "Deposit Balance Report", icon: Wallet, desc: "All accounts with balances" },
  { value: "COLLECTION_SUMMARY", label: "Collection Summary", icon: TrendingUp, desc: "Daily/branch collection totals" },
  { value: "SHARE_HOLDER", label: "Share Holder Report", icon: FileText, desc: "All active shareholders" },
  { value: "LATE_FEES", label: "Late Fees Report", icon: AlertCircle, desc: "FEE-type transactions" },
  { value: "PENDING_INSTALLMENTS", label: "Pending Installments", icon: AlertCircle, desc: "Disbursed loans with outstanding" },
] as const;

export function SpecializedReportsView() {
  const [type, setType] = useState<string>("FUND_POSITION");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accountNumber, setAccountNumber] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (type === "CORPORATE_STATEMENT" && accountNumber) params.set("accountNumber", accountNumber);
    const r = await fetch(`/api/specialized-reports?${params.toString()}`);
    const j = await r.json();
    setData(j);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [type, accountNumber]);

  return (
    <div>
      <PageHeader
        title="Specialized Reports"
        description="NDH-3, Fund Position, Maturity, Interest Paid, NEFT Requests, Deposit Balance, Collection Summary, Share Holder, Late Fees, Pending Installments."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const on = type === rt.value;
          return (
            <button
              key={rt.value}
              onClick={() => setType(rt.value)}
              className={`text-left rounded-xl border p-4 transition ${on ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`size-9 rounded-lg grid place-items-center ${on ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{rt.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{rt.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-600" />
            {REPORT_TYPES.find((r) => r.value === type)?.label ?? type}
          </CardTitle>
          {data?.generatedAt && <div className="text-xs text-slate-500">Generated: {formatDate(data.generatedAt)}</div>}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading report…</div>
          ) : !data || data.error ? (
            <EmptyState icon={BarChart3} title="No data" description={data?.error ?? "Select a report type above."} />
          ) : type === "FUND_POSITION" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ["Total Deposits", formatCurrency(data.data.totalDeposits), "text-emerald-700"],
                ["Loans Outstanding", formatCurrency(data.data.totalLoansOutstanding), "text-amber-700"],
                ["Cash in Hand", formatCurrency(data.data.cashInHand), "text-cyan-700"],
                ["Active Accounts", formatNumber(data.data.totalActiveAccounts), "text-slate-900"],
              ].map(([l, v, c]) => (
                <Card key={l} className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">{l}</div><div className={`text-2xl font-bold mt-1 ${c}`}>{v}</div></CardContent></Card>
              ))}
            </div>
          ) : type === "NDH3" ? (
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white"><TableRow><TableHead>Account Type</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Total Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(data.data).map(([t, v]: [string, any]) => (
                    <TableRow key={t}><TableCell><Badge variant="outline">{t}</Badge></TableCell><TableCell className="text-right">{v.count}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(v.balance)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : type === "INTEREST_PAID" || type === "LATE_FEES" ? (
            <div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total</div><div className="text-2xl font-bold mt-1">{formatCurrency(data.data.total)}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Count</div><div className="text-2xl font-bold mt-1">{data.data.count}</div></CardContent></Card>
              </div>
              <div className="max-h-[40vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white"><TableRow><TableHead>Ref</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.data.transactions.map((t: any) => (
                      <TableRow key={t.id}><TableCell className="font-mono text-xs">{t.txnRef}</TableCell><TableCell className="font-mono text-xs">{t.accountNumber}</TableCell><TableCell className="text-right">{formatCurrency(t.amount)}</TableCell><TableCell className="text-xs">{formatDate(t.createdAt)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : type === "MATURITY_TD" ? (
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white"><TableRow><TableHead>Account</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Maturity Date</TableHead><TableHead className="text-right">Days</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.data.map((a: any) => (
                    <TableRow key={a.id}><TableCell className="font-mono text-xs">{a.accountNumber}</TableCell><TableCell className="text-xs">{a.customer.fullName}</TableCell><TableCell className="text-right">{formatCurrency(a.balance)}</TableCell><TableCell className="text-xs">{formatDate(a.maturityDate)}</TableCell><TableCell className={`text-right font-semibold ${a.daysToMaturity < 0 ? "text-red-600" : "text-amber-600"}`}>{a.daysToMaturity > 0 ? `${a.daysToMaturity}d` : `${Math.abs(a.daysToMaturity)}d ago`}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : type === "COLLECTION_SUMMARY" ? (
            <div>
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Grand Total</div><div className="text-2xl font-bold mt-1">{formatCurrency(data.data.grandTotal)}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Collections</div><div className="text-2xl font-bold mt-1">{data.data.totalCollections}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Branches</div><div className="text-2xl font-bold mt-1">{Object.keys(data.data.byBranch).length}</div></CardContent></Card>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Branch</TableHead><TableHead className="text-right">Collections</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(data.data.byBranch).map(([b, v]: [string, any]) => (
                    <TableRow key={b}><TableCell>{b}</TableCell><TableCell className="text-right">{v.count}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(v.total)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : type === "SHARE_HOLDER" ? (
            <div>
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Holders</div><div className="text-2xl font-bold mt-1">{data.data.holderCount}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Shares</div><div className="text-2xl font-bold mt-1">{data.data.totalQty}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Capital Value</div><div className="text-2xl font-bold mt-1">{formatCurrency(data.data.totalValue)}</div></CardContent></Card>
              </div>
              <div className="max-h-[40vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white"><TableRow><TableHead>Share No</TableHead><TableHead>Holder</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.data.shares.map((s: any) => (
                      <TableRow key={s.id}><TableCell className="font-mono text-xs">{s.shareNo}</TableCell><TableCell className="text-xs">{s.customer.fullName}</TableCell><TableCell className="text-right">{s.quantity}</TableCell><TableCell className="text-right">{formatCurrency(s.paidValue * s.quantity)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : type === "PENDING_INSTALLMENTS" ? (
            <div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Total Outstanding</div><div className="text-2xl font-bold mt-1 text-amber-700">{formatCurrency(data.data.totalOutstanding)}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500 uppercase">Active Loans</div><div className="text-2xl font-bold mt-1">{data.data.count}</div></CardContent></Card>
              </div>
              <div className="max-h-[40vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white"><TableRow><TableHead>Loan No</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">EMI</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.data.loans.map((l: any) => (
                      <TableRow key={l.id}><TableCell className="font-mono text-xs">{l.loanNumber}</TableCell><TableCell className="text-xs">{l.customer.fullName}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(l.outstanding)}</TableCell><TableCell className="text-right">{formatCurrency(l.emi)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : type === "DEPOSIT_BALANCE" || type === "MATURITY_CLOSED" ? (
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white"><TableRow><TableHead>Account</TableHead><TableHead>Customer</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.data.map((a: any) => (
                    <TableRow key={a.id}><TableCell className="font-mono text-xs">{a.accountNumber}</TableCell><TableCell className="text-xs">{a.customer?.fullName ?? "—"}</TableCell><TableCell><Badge variant="outline">{a.type}</Badge></TableCell><TableCell className="text-right font-semibold">{formatCurrency(a.balance)}</TableCell><TableCell><Badge variant="outline" className={a.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{a.status}</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : type === "NEFT_REQUEST" ? (
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white"><TableRow><TableHead>Ref</TableHead><TableHead>Customer</TableHead><TableHead>Beneficiary</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.data.map((p: any) => (
                    <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.refNo}</TableCell><TableCell className="text-xs">{p.customer?.fullName ?? "—"}</TableCell><TableCell className="text-xs">{p.beneficiaryName}</TableCell><TableCell className="text-right">{formatCurrency(p.amount)}</TableCell><TableCell><Badge variant="outline">{p.status}</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500">Report data available in JSON: <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
