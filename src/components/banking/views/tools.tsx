"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wrench, Database, Trash2, Download, RefreshCw, HardDrive } from "lucide-react";
import { PageHeader } from "./_shared";

type ToolInfo = { key: string; label: string; desc: string };
type Counts = { transactions: number; auditLogs: number; smsLogs: number; modificationLogs: number; vouchers: number };

export function ToolsView() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/tools");
    const j = await r.json();
    setTools(j.tools ?? []);
    setCounts(j.counts ?? null);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  async function exec(tool: string) {
    if (!confirm(`Execute "${tool}"? This action may be irreversible.`)) return;
    setExecuting(tool);
    const r = await fetch("/api/tools", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool }),
    });
    const j = await r.json();
    setExecuting(null);
    if (r.ok) { toast.success(j.result); load(); }
    else { toast.error(j.error ?? "Failed"); }
  }

  const toolIcons: Record<string, React.ElementType> = {
    clear_audit: Trash2,
    clear_sms: Trash2,
    clear_modifications: Trash2,
    reindex_db: RefreshCw,
    backup_db: Download,
  };

  return (
    <div>
      <PageHeader title="System Tools" description="Database maintenance utilities, cleanup tools, and backup operations." />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-4">
        {counts && Object.entries(counts).map(([k, v]) => (
          <Card key={k} className="border-slate-200">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 uppercase">{k}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{v.toLocaleString("en-IN")}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : (
          tools.map((t) => {
            const Icon = toolIcons[t.key] ?? Wrench;
            return (
              <Card key={t.key} className="border-slate-200">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-slate-100 text-slate-500 grid place-items-center">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">{t.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => exec(t.key)}
                      disabled={executing === t.key}
                    >
                      {executing === t.key ? "Executing…" : "Execute"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
