"use client";

import { useEffect } from "react";
import { useAuth, useNav } from "@/lib/store";
import { TITLE } from "@/components/banking/nav";
import { Sidebar, MobileNav } from "@/components/banking/sidebar";
import { LogOut, Building2 } from "lucide-react";
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
import { PaymentsView } from "@/components/banking/views/payments";
import { QrView } from "@/components/banking/views/qr";
import { SmsView } from "@/components/banking/views/sms";
import { AgentsView } from "@/components/banking/views/agents";
import { StandingInstructionsView } from "@/components/banking/views/standing-instructions";
import { DepositProductsView } from "@/components/banking/views/deposit-products";
import { ShareCapitalView } from "@/components/banking/views/share-capital";
import { OverdraftsView } from "@/components/banking/views/overdrafts";
import { GoldLoanView } from "@/components/banking/views/gold-loan";
import { HrView } from "@/components/banking/views/hr";
import { AccountingView } from "@/components/banking/views/accounting";
import { GroupsView } from "@/components/banking/views/groups";
import { LedgersView } from "@/components/banking/views/ledgers";
import { VouchersView } from "@/components/banking/views/vouchers";
import { VendorsView } from "@/components/banking/views/vendors";
import { MenuRightsView } from "@/components/banking/views/menu-rights";
import { RequestsView } from "@/components/banking/views/requests";
import { ModificationView } from "@/components/banking/views/modification";
import { ToolsView } from "@/components/banking/views/tools";
import { MemberEnrollmentView } from "@/components/banking/views/member-enrollment";
import { BankReconciliationView } from "@/components/banking/views/bank-reconciliation";
import { SpecializedReportsView } from "@/components/banking/views/specialized-reports";
import { MasterSettingsView } from "@/components/banking/views/master-settings";
import { ServiceCenterView } from "@/components/banking/views/service-center";
import { ReportsView } from "@/components/banking/views/reports";
import { AuditView } from "@/components/banking/views/audit";
import { SettingsView } from "@/components/banking/views/settings";

export function AppShell() {
  const { user, logout, refreshUser } = useAuth();
  const { active } = useNav();

  useEffect(() => {
    if (!user) refreshUser();
  }, [user, refreshUser]);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 flex">
      {/* Sidebar — its own scroll container */}
      <Sidebar role={user.role} branch={user.branch ?? null} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="h-16 shrink-0 border-b bg-white px-4 md:px-6 flex items-center gap-3 z-10">
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

        <MobileNav role={user.role} />

        {/* Main content */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6">
          {active === "dashboard" && <DashboardView />}
          {active === "service-center" && <ServiceCenterView />}
          {active === "customers" && <CustomersView />}
          {active === "accounts" && <AccountsView />}
          {active === "transactions" && <TransactionsView />}
          {active === "loans" && <LoansView />}
          {active === "cards" && <CardsView />}
          {active === "gold-loans" && <GoldLoanView />}
          {active === "deposit-products" && <DepositProductsView />}
          {active === "shares" && <ShareCapitalView />}
          {active === "overdrafts" && <OverdraftsView />}
          {active === "payments" && <PaymentsView />}
          {active === "qr" && <QrView />}
          {active === "agents" && <AgentsView />}
          {active === "standing-instructions" && <StandingInstructionsView />}
          {active === "member-enrollment" && <MemberEnrollmentView />}
          {active === "sms" && <SmsView />}
          {active === "hr" && <HrView />}
          {active === "accounting" && <AccountingView />}
          {active === "groups" && <GroupsView />}
          {active === "ledgers" && <LedgersView />}
          {active === "vouchers" && <VouchersView />}
          {active === "vendors" && <VendorsView />}
          {active === "menu-rights" && <MenuRightsView />}
          {active === "requests" && <RequestsView />}
          {active === "modification" && <ModificationView />}
          {active === "bank-reconciliation" && <BankReconciliationView />}
          {active === "specialized-reports" && <SpecializedReportsView />}
          {active === "tools" && <ToolsView />}
          {active === "reports" && <ReportsView />}
          {active === "audit" && <AuditView />}
          {active === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
