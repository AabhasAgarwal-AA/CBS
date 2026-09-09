"use client";

import { Building2, ChevronRight } from "lucide-react";
import { useNav, type NavKey } from "@/lib/store";
import { navItemsFor } from "@/components/banking/nav";

/**
 * Desktop sidebar. Owns its own scroll container: the brand header and the
 * branch footer stay pinned while only the nav list scrolls, independently of
 * whatever the main content column is doing.
 */
export function Sidebar({ role, branch }: { role: string; branch: string | null }) {
  const { active, setActive } = useNav();
  const items = navItemsFor(role);

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-white h-full">
      <div className="h-16 shrink-0 flex items-center gap-2 px-5 border-b">
        <div className="size-9 rounded-lg bg-emerald-600 text-white grid place-items-center">
          <Building2 className="size-5" />
        </div>
        <div>
          <div className="font-bold text-slate-900 leading-tight">CBS</div>
          <div className="text-xs text-slate-500 leading-tight">Core Banking</div>
        </div>
      </div>

      {/* min-h-0 lets this flex child shrink below its content height, which is
          what allows overflow-y-auto to actually engage. */}
      <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto overscroll-contain">
        {items.map((n) => {
          const Icon = n.icon;
          const on = active === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setActive(n.key)}
              aria-current={on ? "page" : undefined}
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

      <div className="p-3 border-t shrink-0">
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <div className="font-semibold text-slate-700">{branch ?? "—"}</div>
          <div>Branch code</div>
        </div>
      </div>
    </aside>
  );
}

/** Horizontal nav strip shown instead of the sidebar on small screens. */
export function MobileNav({ role }: { role: string }) {
  const { active, setActive } = useNav();
  const items = navItemsFor(role);

  return (
    <div className="md:hidden shrink-0 border-b bg-white px-3 py-2 flex gap-1 overflow-x-auto">
      {items.map((n) => {
        const Icon = n.icon;
        const on = active === n.key;
        return (
          <button
            key={n.key}
            onClick={() => setActive(n.key as NavKey)}
            aria-current={on ? "page" : undefined}
            className={`shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              on ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="size-3.5" />
            {n.label}
          </button>
        );
      })}
    </div>
  );
}
