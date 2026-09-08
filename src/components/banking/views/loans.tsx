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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Landmark,
  Plus,
  CheckCircle2,
  XCircle,
  Banknote,
  HandCoins,
} from "lucide-react";
import { calculateEMI, formatCurrency, formatDate, formatDateTime } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Loan = {
  id: string;
  loanNumber: string;
  type: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emi: number;
  outstanding: number;
  status: string;
  disbursedAt: string | null;
  createdAt: string;
  customer: { id: string; fullName: string; customerNo: string };
};

type LoanDetail = Loan & {
  account: { accountNumber: string; balance: number } | null;
  repayments: Array<{
    id: string;
    amount: number;
    principalPart: number;
    interestPart: number;
    balanceAfter: number;
    paidAt: string;
  }>;
};

export function LoansView() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [openNew, setOpenNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LoanDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    const r = await fetch(`/api/loans?${params.toString()}`);
    const j = await r.json();
    setLoans(j.loans ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [status]);

  async function openDetail(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    const r = await fetch(`/api/loans/${id}`);
    const j = await r.json();
    setDetail(j.loan ?? null);
    setLoadingDetail(false);
  }

  async function approve(id: string, decision: "APPROVED" | "REJECTED") {
    const r = await fetch(`/api/loans/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (r.ok) {
      toast.success(`Loan ${decision.toLowerCase()}`);
      load();
      openDetail(id);
    } else toast.error("Failed");
  }

  async function disburse(id: string) {
    const r = await fetch(`/api/loans/${id}/disburse`, { method: "POST" });
    const j = await r.json();
    if (r.ok) {
      toast.success("Loan disbursed");
      load();
      openDetail(id);
    } else toast.error(j.error ?? "Failed");
  }

  async function repay(id: string) {
    if (!repayAmount || Number(repayAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const r = await fetch(`/api/loans/${id}/repay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(repayAmount) }),
    });
    const j = await r.json();
    if (r.ok) {
      toast.success("Repayment recorded");
      setRepayAmount("");
      openDetail(id);
      load();
    } else toast.error(j.error ?? "Failed");
  }

  return (
    <div>
      <PageHeader
        title="Loan Management"
        description="Originate, approve, disburse and service loans. EMI is auto-calculated."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> Apply for Loan
              </Button>
            </DialogTrigger>
            <NewLoanDialog
              onCreated={(l) => {
                setOpenNew(false);
                toast.success(`Loan ${l.loanNumber} created`);
                load();
                openDetail(l.id);
              }}
            />
          </Dialog>
        }
      />

      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-1">Status:</span>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="DISBURSED">Disbursed</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : loans.length === 0 ? (
            <EmptyState icon={Landmark} title="No loans" description="Apply for a new loan to get started." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Loan No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="hidden md:table-cell">EMI</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((l) => (
                    <TableRow key={l.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(l.id)}>
                      <TableCell className="font-mono text-xs">{l.loanNumber}</TableCell>
                      <TableCell className="font-medium text-slate-900">{l.customer.fullName}</TableCell>
                      <TableCell><Badge variant="outline">{l.type}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(l.principal)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-600">
                        {formatCurrency(l.emi)}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell font-medium">
                        {formatCurrency(l.outstanding)}
                      </TableCell>
                      <TableCell>
                        <LoanStatusBadge status={l.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                        {formatDate(l.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail */}
      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Landmark className="size-5 text-emerald-600" />
              {detail?.loanNumber ?? "Loan"}
            </SheetTitle>
            <SheetDescription>
              {detail?.customer?.fullName} · {detail?.type}
            </SheetDescription>
          </SheetHeader>

          {loadingDetail || !detail ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="px-4 pb-8 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat label="Principal" value={formatCurrency(detail.principal)} />
                <Stat label="Interest Rate" value={`${detail.interestRate.toFixed(2)} %`} />
                <Stat label="Tenure" value={`${detail.tenureMonths} months`} />
                <Stat label="EMI" value={formatCurrency(detail.emi)} />
                <Stat label="Outstanding" value={formatCurrency(detail.outstanding)} />
                <Stat label="Status" value={<LoanStatusBadge status={detail.status} />} />
                <Stat label="Linked Account" value={detail.account?.accountNumber ?? "—"} />
                <Stat label="Disbursed On" value={detail.disbursedAt ? formatDate(detail.disbursedAt) : "—"} />
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2">
                {detail.status === "PENDING" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => approve(detail.id, "APPROVED")}
                    >
                      <CheckCircle2 className="size-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => approve(detail.id, "REJECTED")}>
                      <XCircle className="size-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {detail.status === "APPROVED" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => disburse(detail.id)}
                  >
                    <Banknote className="size-4 mr-1" /> Disburse
                  </Button>
                )}
                {detail.status === "DISBURSED" && (
                  <div className="flex gap-2 w-full">
                    <Input
                      type="number"
                      placeholder={`EMI ${formatCurrency(detail.emi)}`}
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => repay(detail.id)}>
                      <HandCoins className="size-4 mr-1" /> Repay
                    </Button>
                  </div>
                )}
              </div>

              {/* Repayment history */}
              <div>
                <CardTitle className="text-sm mb-2 text-slate-700">Repayment History</CardTitle>
                {detail.repayments.length === 0 ? (
                  <div className="text-xs text-slate-500">No repayments yet.</div>
                ) : (
                  <div className="max-h-64 overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Principal</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Interest</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.repayments.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs text-slate-500">
                              {formatDateTime(r.paidAt)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(r.amount)}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell text-xs text-slate-600">
                              {formatCurrency(r.principalPart)}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell text-xs text-slate-600">
                              {formatCurrency(r.interestPart)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatCurrency(r.balanceAfter)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold text-slate-800 text-sm mt-0.5">{value}</div>
    </div>
  );
}

function LoanStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "border-amber-200 text-amber-700 bg-amber-50",
    APPROVED: "border-emerald-200 text-emerald-700 bg-emerald-50",
    REJECTED: "border-red-200 text-red-700 bg-red-50",
    DISBURSED: "border-teal-200 text-teal-700 bg-teal-50",
    CLOSED: "border-slate-200 text-slate-600 bg-slate-50",
    DEFAULTED: "border-red-200 text-red-700 bg-red-50",
  };
  return (
    <Badge variant="outline" className={map[status] ?? "border-slate-200"}>
      {status}
    </Badge>
  );
}

function NewLoanDialog({ onCreated }: { onCreated: (l: Loan) => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; customerNo: string }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [type, setType] = useState("PERSONAL");
  const [principal, setPrincipal] = useState("500000");
  const [interestRate, setInterestRate] = useState("11.5");
  const [tenureMonths, setTenureMonths] = useState("60");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customers?limit=200")
      .then((r) => r.json())
      .then((j) => setCustomers(j.customers ?? []));
  }, []);

  const emi = calculateEMI(Number(principal) || 0, Number(interestRate) || 0, Number(tenureMonths) || 1);

  async function submit() {
    if (!customerId) {
      toast.error("Pick a customer");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        type,
        principal: Number(principal),
        interestRate: Number(interestRate),
        tenureMonths: Number(tenureMonths),
      }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    onCreated(j.loan);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New loan application</DialogTitle>
        <DialogDescription>
          EMI is auto-calculated using the reducing-balance formula.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
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
          <Label>Loan Type *</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="HOME">Home Loan</SelectItem>
              <SelectItem value="AUTO">Auto Loan</SelectItem>
              <SelectItem value="PERSONAL">Personal Loan</SelectItem>
              <SelectItem value="EDUCATION">Education Loan</SelectItem>
              <SelectItem value="GOLD">Gold Loan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label>Principal (₹)</Label>
            <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rate (%)</Label>
            <Input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tenure (mo)</Label>
            <Input type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} />
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm">
          <span className="text-slate-600">Computed EMI: </span>
          <span className="font-bold text-emerald-700">{formatCurrency(emi)}</span>
          <span className="text-xs text-slate-500"> per month</span>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Submitting…" : "Submit application"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}