"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { PageHeader, EmptyState } from "./_shared";

type Designation = { id: string; code: string; name: string; level: number };
type Rights = {
  id?: string; designationId: string; menuKey: string;
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean;
};

const MENU_KEYS = [
  "dashboard", "customers", "accounts", "transactions", "loans", "cards",
  "gold-loans", "deposit-products", "shares", "overdrafts", "payments",
  "qr", "agents", "standing-instructions", "member-enrollment", "sms",
  "hr", "accounting", "bank-reconciliation", "vouchers", "vendors",
  "specialized-reports", "master-settings", "reports", "audit", "settings",
];

const ACTIONS = ["canView", "canCreate", "canEdit", "canDelete"] as const;

export function MenuRightsView() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState("");
  const [rights, setRights] = useState<Rights[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/designations").then((r) => r.json()).then((j) => {
      setDesignations(j.designations ?? []);
      if (j.designations?.length > 0) setSelectedDesignation(j.designations[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedDesignation) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/menu-rights`);
        const j = await r.json();
        if (cancelled) return;
        const filtered = (j.rights ?? []).filter((rt: Rights) => rt.designationId === selectedDesignation);
        const matrix: Rights[] = MENU_KEYS.map((key) => {
          const existing = filtered.find((f: Rights) => f.menuKey === key);
          return existing ?? { designationId: selectedDesignation, menuKey: key, canView: false, canCreate: false, canEdit: false, canDelete: false };
        });
        setRights(matrix);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDesignation]);

  async function updateRight(menuKey: string, action: keyof Rights, value: boolean) {
    const right = rights.find((r) => r.menuKey === menuKey);
    if (!right) return;
    const updated = { ...right, [action]: value };
    setRights((prev) => prev.map((r) => (r.menuKey === menuKey ? updated : r)));
    const r = await fetch("/api/menu-rights", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, designationId: selectedDesignation, menuKey }),
    });
    if (r.ok) toast.success(`${menuKey}: ${action} ${value ? "granted" : "revoked"}`);
    else toast.error("Failed to update");
  }

  return (
    <div>
      <PageHeader title="Designation Menu Rights" description="Role-based access control — configure which menus each designation can view, create, edit, or delete." />
      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-1">Designation:</span>
          <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
            <SelectTrigger className="w-64 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.name} (L{d.level})</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <tr>
                    <th className="text-left p-2 font-medium text-slate-600">Menu</th>
                    {ACTIONS.map((a) => <th key={a} className="text-center p-2 font-medium text-slate-600">{a.replace("can", "")}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rights.map((r) => (
                    <tr key={r.menuKey} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 font-medium text-slate-800 capitalize">{r.menuKey.replace(/-/g, " ")}</td>
                      {ACTIONS.map((a) => (
                        <td key={a} className="text-center p-2">
                          <Checkbox
                            checked={r[a] as boolean}
                            onCheckedChange={(v) => updateRight(r.menuKey, a, Boolean(v))}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
