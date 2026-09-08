"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/store";
import { LoginScreen } from "@/components/banking/login-screen";
import { AppShell } from "@/components/banking/app-shell";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loadingUser, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
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

  if (!user) return <LoginScreen />;
  return <AppShell />;
}
