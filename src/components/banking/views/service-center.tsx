"use client";

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Headphones, FileText, Receipt, HelpCircle, Mail, Phone, MapPin, Clock,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { useNav } from "@/lib/store";
import { PageHeader } from "./_shared";

export function ServiceCenterView() {
  const { setActive } = useNav();

  const services = [
    { label: "Customer Management", icon: Headphones, desc: "Onboard, KYC verify, profile", nav: "customers" as const },
    { label: "Open New Account", icon: Receipt, desc: "Savings / Current / FD / RD / Pigmy", nav: "accounts" as const },
    { label: "Process Transaction", icon: Receipt, desc: "Deposit / Withdraw / Transfer", nav: "transactions" as const },
    { label: "NEFT / RTGS / IMPS", icon: FileText, desc: "Originate payment orders", nav: "payments" as const },
    { label: "Generate QR Code", icon: Receipt, desc: "UPI QR for inward collection", nav: "qr" as const },
    { label: "Issue Shares", icon: FileText, desc: "Share capital management", nav: "shares" as const },
    { label: "Sanction Overdraft", icon: FileText, desc: "OD facility setup", nav: "overdrafts" as const },
    { label: "Enroll Member", icon: FileText, desc: "Individual / Group enrollment", nav: "member-enrollment" as const },
    { label: "Specialized Reports", icon: FileText, desc: "NDH-3, Fund Position, Maturity", nav: "specialized-reports" as const },
    { label: "Bank Reconciliation", icon: FileText, desc: "NEFT/IMPS matching from bank stmt", nav: "bank-reconciliation" as const },
  ];

  return (
    <div>
      <PageHeader
        title="Service Center"
        description="Single window for all customer service operations. Quick links to every operational module."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => setActive(s.nav)}
              className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:shadow-md transition group"
            >
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-500 grid place-items-center transition">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 text-sm">{s.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Branch Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <Phone className="size-4 text-emerald-600 mt-0.5" />
            <div><div className="font-medium text-slate-900">Customer Care</div><div className="text-slate-600">1800-XXX-XXXX (Toll Free)</div><div className="text-xs text-slate-500">Mon–Sat, 9 AM – 6 PM</div></div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="size-4 text-emerald-600 mt-0.5" />
            <div><div className="font-medium text-slate-900">Email Support</div><div className="text-slate-600">care@cbsbank.io</div><div className="text-xs text-slate-500">Response within 24 hours</div></div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-emerald-600 mt-0.5" />
            <div><div className="font-medium text-slate-900">Head Office</div><div className="text-slate-600">CBS Bank House, Fort, Mumbai 400001</div></div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="size-4 text-emerald-600 mt-0.5" />
            <div><div className="font-medium text-slate-900">Branch Timings</div><div className="text-slate-600">Mon–Fri: 10 AM – 4 PM</div><div className="text-xs text-slate-500">Sat: 10 AM – 1 PM · Sun: Closed</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
