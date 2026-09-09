"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/store";
import { LoginScreen } from "@/components/banking/login-screen";
import { AppShell } from "@/components/banking/app-shell";
import { CustomerPortal } from "@/components/banking/customer-portal";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loadingUser, refreshUser } = useAuth();
  const [isCustomerPortal, setIsCustomerPortal] = useState(false);

  useEffect(() => {
    // The customer mobile app is exposed at /?portal=customer
    // Read once on mount; defer setState to next tick to avoid cascading renders.
    const params = new URLSearchParams(window.location.search);
    const isPortal = params.get("portal") === "customer";
    const t = setTimeout(() => {
      setIsCustomerPortal(isPortal);
      refreshUser();
    }, 0);
    return () => clearTimeout(t);
  }, [refreshUser]);

  if (loadingUser) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="size-6 animate-spin text-emerald-600" />
          <div className="text-sm">Loading CBS…</div>
        </div>
      </div>
    );
  }

  // Customer mobile app portal — separate auth (phone + MPIN)
  if (isCustomerPortal) return <CustomerPortal />;

  if (!user) return <LoginScreen />;
  return <AppShell />;
}
