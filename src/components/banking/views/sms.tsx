"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { MessageSquare, Plus, Send, Filter, KeyRound } from "lucide-react";
import { formatDateTime } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type SmsLog = {
  id: string;
  phone: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
  customer: { fullName: string; customerNo: string } | null;
};

export function SmsView() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("ALL");
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== "ALL") params.set("type", type);
    const r = await fetch(`/api/sms?${params.toString()}`);
    const j = await r.json();
    setLogs(j.sms ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [type]);

  async function generateOtp() {
    const phone = prompt("Enter customer phone number to send OTP:");
    if (!phone) return;
    const r = await fetch("/api/sms/otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const j = await r.json();
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`OTP ${j.otp} sent to ${j.phone} (demo: visible to staff only)`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="SMS Banking"
        description="Send transaction alerts, OTPs, balance enquiries, and marketing messages. All SMS are logged for audit."
        action={
          <>
            <Button variant="outline" className="mr-2" onClick={generateOtp}>
              <KeyRound className="size-4 mr-1.5" /> Send OTP
            </Button>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> Send SMS
                </Button>
              </DialogTrigger>
              <NewSmsDialog onCreated={() => { setOpenNew(false); load(); }} />
            </Dialog>
          </>
        }
      />

      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <Filter className="size-4 text-slate-400 ml-1" />
          <span className="text-sm text-slate-600">Type:</span>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-48 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="OTP">OTP</SelectItem>
              <SelectItem value="TXN_ALERT">Transaction Alert</SelectItem>
              <SelectItem value="BALANCE_ENQUIRY">Balance Enquiry</SelectItem>
              <SelectItem value="MINI_STATEMENT">Mini Statement</SelectItem>
              <SelectItem value="KYC_UPDATE">KYC Update</SelectItem>
              <SelectItem value="MARKETING">Marketing</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : logs.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No SMS sent yet" description="Send an OTP, transaction alert, or marketing message." />
          ) : (
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(l.createdAt)}</TableCell>
                      <TableCell className="text-xs">
                        {l.customer ? (
                          <>
                            <div className="font-medium text-slate-800">{l.customer.fullName}</div>
                            <div className="text-slate-500">{l.customer.customerNo}</div>
                          </>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.phone}</TableCell>
                      <TableCell><Badge variant="outline" className={typeColor(l.type)}>{l.type}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-md">{l.message}</TableCell>
                      <TableCell><Badge variant="outline" className={l.status === "SENT" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700 bg-red-50"}>{l.status}</Badge></TableCell>
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

function typeColor(t: string): string {
  const map: Record<string, string> = {
    OTP: "border-purple-200 text-purple-700 bg-purple-50",
    TXN_ALERT: "border-cyan-200 text-cyan-700 bg-cyan-50",
    BALANCE_ENQUIRY: "border-blue-200 text-blue-700 bg-blue-50",
    MINI_STATEMENT: "border-blue-200 text-blue-700 bg-blue-50",
    KYC_UPDATE: "border-amber-200 text-amber-700 bg-amber-50",
    MARKETING: "border-slate-200 text-slate-600 bg-slate-50",
  };
  return map[t] ?? "";
}

function NewSmsDialog({ onCreated }: { onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; phone: string; customerNo: string }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("MARKETING");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? [])); }, []);

  function pickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((c) => c.id === id);
    if (c) setPhone(c.phone);
  }

  async function submit() {
    if (!phone || !message) { toast.error("Phone and message required"); return; }
    setLoading(true);
    const r = await fetch("/api/sms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message, type, customerId: customerId || undefined }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("SMS sent");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Send SMS</DialogTitle>
        <DialogDescription>Pick a customer (optional) or type a phone number directly. Max 480 chars.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Customer</Label>
          <Select value={customerId} onValueChange={pickCustomer}>
            <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
            <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName} ({c.customerNo})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="KYC_UPDATE">KYC Update</SelectItem>
                <SelectItem value="TXN_ALERT">Transaction Alert</SelectItem>
                <SelectItem value="BALANCE_ENQUIRY">Balance Enquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Message *</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Dear customer, …" rows={4} maxLength={480} />
          <div className="text-xs text-slate-500 text-right">{message.length}/480</div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Sending…" : "Send SMS"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
