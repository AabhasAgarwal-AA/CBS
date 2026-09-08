"use client";

import { useEffect } from "react";
import { useAuth, useNav, type NavKey } from "@/lib/store";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowLeftRight,
  Landmark,
  CreditCard,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DashboardView } from "@/components/banking/views/dashboard";
import { CustomersView } from "@/components/banking/views/customers";
import { AccountsView } from "@/components/banking/views/accounts";
import { TransactionsView } from "@/components/banking/views/transactions";
import { LoansView } from "@/components/banking/views/loans";
import { CardsView } from "@/components/banking/views/cards";
import { ReportsView } from "@/components/banking/views/reports";
import { AuditView } from "@/components/banking/views/audit";
import { SettingsView } from "@/components/banking/views/settings";

const NAV: { key: NavKey; label: string; icon: React.ElementType; roles?: string[] }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "customers", label: "Customers", icon: Users },
  { key: "accounts", label: "Accounts", icon: Wallet },
  { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { key: "loans", label: "Loans", icon: Landmark },
  { key: "cards", label: "Cards", icon: CreditCard },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "audit", label: "Audit Log", icon: ScrollText },
  { key: "settings", label: "Settings", icon: Settings, roles: ["ADMIN", "MANAGER"] },
];

const TITLE: Record<NavKey, string> = {
  dashboard: "Dashboard Overview",
  customers: "Customer Management",
  accounts: "Account Operations",
  transactions: "Transactions",
  loans: "Loan Management",
  cards: "Card Management",
  reports: "Reports & Analytics",
  audit: "Audit Trail",
  settings: "System Settings",
};

export function AppShell() {
  const { user, logout, refreshUser } = useAuth();
  const { active, setActive } = useNav();

  useEffect(() => {
    if (!user) refreshUser();
  }, [user, refreshUser]);

  if (!user) return null;

  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role));
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-white">
        <div className="h-16 flex items-center gap-2 px-5 border-b">
          <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center">
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">CBS</div>
            <div className="text-xs text-slate-500 leading-tight">Core Banking</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((n) => {
            const Icon = n.icon;
            const on = active === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setActive(n.key)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  on
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`size-4 ${on ? "text-emerald-600" : "text-slate-400"}`} />
                <span className="flex-1 text-left">{n.label}</span>
                {on && <ChevronRight className="size-4" />}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <div className="font-semibold text-slate-700">{user.branch ?? "—"}</div>
            <div>Branch code</div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b bg-white px-4 md:px-6 flex items-center gap-3 sticky top-0 z-10">
          <div className="md:hidden">
            <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center">
              <Building2 className="size-5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-semibold text-slate-900 truncate">
              {TITLE[active]}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <Badge
            variant="outline"
            className="hidden sm:inline-flex border-emerald-200 text-emerald-700 bg-emerald-50"
          >
            {user.role}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full hover:bg-slate-100 p-1 pr-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">{user.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-xs text-slate-500">Signed in as</div>
                <div className="text-sm font-medium">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-700">
                <LogOut className="size-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Mobile nav */}
        <div className="md:hidden border-b bg-white px-3 py-2 flex gap-1 overflow-x-auto">
          {items.map((n) => {
            const Icon = n.icon;
            const on = active === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setActive(n.key)}
                className={`shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  on
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="size-3.5" />
                {n.label}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {active === "dashboard" && <DashboardView />}
          {active === "customers" && <CustomersView />}
          {active === "accounts" && <AccountsView />}
          {active === "transactions" && <TransactionsView />}
          {active === "loans" && <LoansView />}
          {active === "cards" && <CardsView />}
          {active === "reports" && <ReportsView />}
          {active === "audit" && <AuditView />}
          {active === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
