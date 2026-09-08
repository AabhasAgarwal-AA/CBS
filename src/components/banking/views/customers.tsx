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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  UserCog,
  Wallet,
  CreditCard,
  Landmark,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Customer = {
  id: string;
  customerNo: string;
  fullName: string;
  email: string | null;
  phone: string;
  city: string | null;
  occupation: string | null;
  kycStatus: string;
  status: string;
  createdAt: string;
  _count: { accounts: number; loans: number; cards: number };
};

type CustomerDetail = Customer & {
  dob: string | null;
  gender: string | null;
  address: string | null;
  state: string | null;
  pincode: string | null;
  pan: string | null;
  aadhaar: string | null;
  annualIncome: number | null;
  kycDate: string | null;
  branch?: { name: string; city: string; code: string } | null;
  accounts: Array<{
    id: string;
    accountNumber: string;
    type: string;
    balance: number;
    status: string;
    createdAt: string;
  }>;
  loans: Array<{
    id: string;
    loanNumber: string;
    type: string;
    principal: number;
    outstanding: number;
    status: string;
  }>;
  cards: Array<{
    id: string;
    cardNumber: string;
    type: string;
    status: string;
  }>;
};

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [openNew, setOpenNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    const r = await fetch(`/api/customers?${params.toString()}`);
    const j = await r.json();
    setCustomers(j.customers ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q, status]);

  async function openDetail(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    const r = await fetch(`/api/customers/${id}`);
    const j = await r.json();
    setDetail(j.customer ?? null);
    setLoadingDetail(false);
  }

  async function kycAction(status: "VERIFIED" | "REJECTED") {
    if (!selectedId) return;
    const r = await fetch(`/api/customers/${selectedId}/kyc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      toast.success(`KYC ${status.toLowerCase()}`);
      openDetail(selectedId);
    } else {
      toast.error("Action failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Customer Management"
        description="Onboard customers, verify KYC, and manage their banking relationships."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> New Customer
              </Button>
            </DialogTrigger>
            <NewCustomerDialog
              onCreated={(c) => {
                setOpenNew(false);
                toast.success(`Created ${c.fullName}`);
                load();
                openDetail(c.id);
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
                placeholder="Search by name, phone, email, customer no, PAN…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers found"
              description="Adjust your filters or onboard a new customer to get started."
            />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Customer No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">City</TableHead>
                    <TableHead className="hidden lg:table-cell">Accounts</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow
                      key={c.id}
                      onClick={() => openDetail(c.id)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <TableCell className="font-mono text-xs">{c.customerNo}</TableCell>
                      <TableCell className="font-medium text-slate-900">{c.fullName}</TableCell>
                      <TableCell className="hidden md:table-cell">{c.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell">{c.city ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline">{c._count.accounts}</Badge>
                      </TableCell>
                      <TableCell>
                        {c.kycStatus === "VERIFIED" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <ShieldCheck className="size-3 mr-1" /> Verified
                          </Badge>
                        ) : c.kycStatus === "REJECTED" ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            <ShieldX className="size-3 mr-1" /> Rejected
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            c.status === "ACTIVE"
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : "border-slate-200 text-slate-600 bg-slate-50"
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(c.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail sheet */}
      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserCog className="size-5 text-emerald-600" />
              {detail?.fullName ?? "Customer"}
            </SheetTitle>
            <SheetDescription>
              {detail?.customerNo} · {detail?.email ?? "No email"}
            </SheetDescription>
          </SheetHeader>

          {loadingDetail || !detail ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="px-4 pb-8 space-y-5">
              {/* KYC banner */}
              <Card className="border-slate-200">
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-slate-500">KYC Status</div>
                    <div className="font-semibold text-slate-900">
                      {detail.kycStatus}{" "}
                      {detail.kycDate && (
                        <span className="text-xs text-slate-500">
                          on {formatDate(detail.kycDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => kycAction("VERIFIED")}
                      disabled={detail.kycStatus === "VERIFIED"}
                    >
                      <ShieldCheck className="size-3.5 mr-1" /> Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => kycAction("REJECTED")}
                      disabled={detail.kycStatus === "REJECTED"}
                    >
                      <ShieldX className="size-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="overview">
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="accounts">Accounts</TabsTrigger>
                  <TabsTrigger value="loans">Loans</TabsTrigger>
                  <TabsTrigger value="cards">Cards</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Phone", detail.phone],
                      ["DOB", detail.dob ? formatDate(detail.dob) : "—"],
                      ["Gender", detail.gender ?? "—"],
                      ["Occupation", detail.occupation ?? "—"],
                      ["Annual Income", detail.annualIncome ? formatCurrency(detail.annualIncome) : "—"],
                      ["PAN", detail.pan ?? "—"],
                      ["Aadhaar", detail.aadhaar ?? "—"],
                      ["City", detail.city ?? "—"],
                      ["State", detail.state ?? "—"],
                      ["Pincode", detail.pincode ?? "—"],
                      ["Branch", detail.branch?.name ?? "—"],
                      ["Status", detail.status],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-50 rounded-lg p-2.5">
                        <div className="text-xs text-slate-500">{k}</div>
                        <div className="font-medium text-slate-800 text-xs truncate">{v}</div>
                      </div>
                    ))}
                  </div>
                  {detail.address && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Address</div>
                      <div className="text-sm text-slate-800">{detail.address}</div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="accounts" className="mt-3 space-y-2">
                  {detail.accounts.length === 0 ? (
                    <EmptyState icon={Wallet} title="No accounts" />
                  ) : (
                    detail.accounts.map((a) => (
                      <Card key={a.id} className="border-slate-200">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-mono text-xs text-slate-500">{a.accountNumber}</div>
                            <div className="font-semibold text-slate-900 mt-0.5">
                              {a.type} · {formatCurrency(a.balance)}
                            </div>
                          </div>
                          <Badge variant="outline">{a.status}</Badge>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="loans" className="mt-3 space-y-2">
                  {detail.loans.length === 0 ? (
                    <EmptyState icon={Landmark} title="No loans" />
                  ) : (
                    detail.loans.map((l) => (
                      <Card key={l.id} className="border-slate-200">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-mono text-xs text-slate-500">{l.loanNumber}</div>
                            <div className="font-semibold text-slate-900 mt-0.5">
                              {l.type} · {formatCurrency(l.principal)}
                            </div>
                          </div>
                          <Badge variant="outline">{l.status}</Badge>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="cards" className="mt-3 space-y-2">
                  {detail.cards.length === 0 ? (
                    <EmptyState icon={CreditCard} title="No cards" />
                  ) : (
                    detail.cards.map((c) => (
                      <Card key={c.id} className="border-slate-200">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <div className="font-mono text-xs text-slate-500">
                              {c.cardNumber.slice(0, 4)} **** **** {c.cardNumber.slice(-4)}
                            </div>
                            <div className="font-semibold text-slate-900 mt-0.5">{c.type}</div>
                          </div>
                          <Badge variant="outline">{c.status}</Badge>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NewCustomerDialog({ onCreated }: { onCreated: (c: Customer) => void }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "MALE",
    address: "",
    city: "",
    state: "",
    pincode: "",
    pan: "",
    aadhaar: "",
    occupation: "",
    annualIncome: "",
  });
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!form.fullName || !form.phone) {
      toast.error("Full name and phone are required");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    onCreated(j.customer);
    setForm({
      fullName: "",
      email: "",
      phone: "",
      dob: "",
      gender: "MALE",
      address: "",
      city: "",
      state: "",
      pincode: "",
      pan: "",
      aadhaar: "",
      occupation: "",
      annualIncome: "",
    });
  }

  const fields: { key: keyof typeof form; label: string; placeholder?: string; full?: boolean }[] = [
    { key: "fullName", label: "Full Name *", placeholder: "Ananya Iyer" },
    { key: "phone", label: "Phone *", placeholder: "9876543210" },
    { key: "email", label: "Email", placeholder: "ananya@example.com" },
    { key: "dob", label: "Date of Birth" },
    { key: "gender", label: "Gender" },
    { key: "occupation", label: "Occupation", placeholder: "Software Engineer" },
    { key: "pan", label: "PAN", placeholder: "ABCDE1234F" },
    { key: "aadhaar", label: "Aadhaar", placeholder: "123456789012" },
    { key: "city", label: "City", placeholder: "Mumbai" },
    { key: "state", label: "State", placeholder: "Maharashtra" },
    { key: "pincode", label: "Pincode", placeholder: "400001" },
    { key: "annualIncome", label: "Annual Income (₹)", placeholder: "1200000" },
    { key: "address", label: "Address", full: true },
  ];

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Onboard new customer</DialogTitle>
        <DialogDescription>
          Capture the customer profile. KYC verification happens after onboarding.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3 py-2">
        {fields.map((f) => {
          if (f.key === "gender") {
            return (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          }
          return (
            <div key={f.key} className={`space-y-1.5 ${f.full ? "col-span-2" : ""}`}>
              <Label>{f.label}</Label>
              <Input
                type={f.key === "dob" ? "date" : f.key === "annualIncome" ? "number" : "text"}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          );
        })}
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Saving…" : "Save customer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
