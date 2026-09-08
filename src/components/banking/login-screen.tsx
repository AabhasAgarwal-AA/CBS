"use client";

import { useState } from "react";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function LoginScreen() {
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("admin@cbs.io");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "Login failed");
        setLoading(false);
        return;
      }
      toast.success(`Welcome back, ${j.user.name}`);
      await refreshUser();
    } catch {
      toast.error("Network error");
      setLoading(false);
    }
  }

  async function seedAndLogin() {
    setLoading(true);
    try {
      const r = await fetch("/api/seed", { method: "POST" });
      const j = await r.json();
      if (r.ok) {
        toast.success("Demo data seeded. Logging in as Admin…");
      }
      await submit(new Event("submit") as unknown as React.FormEvent);
    } catch {
      toast.error("Failed to seed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left brand panel */}
        <div className="hidden lg:flex flex-col gap-6 p-8">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-2xl bg-emerald-600 text-white grid place-items-center shadow-lg shadow-emerald-200">
              <Building2 className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">CBS Core Banking</h1>
              <p className="text-sm text-slate-500">Enterprise banking operations platform</p>
            </div>
          </div>
          <p className="text-slate-600 leading-relaxed">
            A complete core banking platform — manage customers, open and operate savings, current
            and deposit accounts, process deposits/withdrawals/transfers, originate and service
            loans, issue debit & credit cards, and audit every action.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Customers & KYC", "Onboard, verify, manage"],
              ["Accounts", "Savings · Current · FD · RD"],
              ["Transactions", "Deposit · Withdraw · Transfer"],
              ["Loans", "Apply · Approve · Disburse · Repay"],
              ["Cards", "Debit · Credit · Block / Unblock"],
              ["Reports & Audit", "Statements · Trail of trust"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-emerald-100 bg-white/70 backdrop-blur p-4">
                <div className="font-semibold text-slate-800 text-sm">{t}</div>
                <div className="text-xs text-slate-500 mt-0.5">{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right login card */}
        <Card className="shadow-xl border-emerald-100/50">
          <CardHeader className="space-y-2">
            <div className="size-12 rounded-xl bg-emerald-600 text-white grid place-items-center shadow">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Use your staff credentials to access the banking console.
            </CardDescription>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cbs.io"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700">Demo accounts</div>
                <div>Admin · <code className="text-emerald-700">admin@cbs.io / admin123</code></div>
                <div>Manager · <code className="text-emerald-700">manager@cbs.io / manager123</code></div>
                <div>Teller · <code className="text-emerald-700">teller@cbs.io / teller123</code></div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Lock className="size-4 mr-2" />}
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={seedAndLogin}
                disabled={loading}
                className="w-full"
              >
                Seed demo data & sign in as Admin
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
