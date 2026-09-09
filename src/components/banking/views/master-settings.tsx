"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Settings, Plus } from "lucide-react";
import { formatDate } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type Setting = { id: string; key: string; value: string; category: string; description: string | null; updatedAt: string };

export function MasterSettingsView() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [category, setCategory] = useState("ALL");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/master-settings");
    const j = await r.json();
    setSettings(j.settings ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  const filtered = category === "ALL" ? settings : settings.filter((s) => s.category === category);

  return (
    <div>
      <PageHeader
        title="Master Settings"
        description="System-wide configuration key-value pairs (charges, rates, limits, SMS gateway config, etc.)."
        action={
          user?.role === "ADMIN" && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> New Setting
                </Button>
              </DialogTrigger>
              <NewSettingDialog onCreated={() => { setOpenNew(false); load(); }} />
            </Dialog>
          )
        }
      />

      <Card className="border-slate-200 mb-4">
        <CardContent className="p-3 flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-1">Category:</span>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="BANKING">Banking</SelectItem>
              <SelectItem value="LOAN">Loan</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
              <SelectItem value="CHARGES">Charges</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Settings} title="No settings" description="Add a configuration key-value pair." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow><TableHead>Key</TableHead><TableHead>Value</TableHead><TableHead>Category</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead className="hidden md:table-cell">Updated</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">{s.key}</TableCell>
                      <TableCell className="text-sm">{s.value}</TableCell>
                      <TableCell><Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">{s.category}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">{s.description ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">{formatDate(s.updatedAt)}</TableCell>
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

function NewSettingDialog({ onCreated }: { onCreated: () => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!key || value === undefined) { toast.error("key and value required"); return; }
    setLoading(true);
    const r = await fetch("/api/master-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value, category, description }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Setting saved");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Setting</DialogTitle><DialogDescription>Add a configuration key-value pair.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Key *</Label><Input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="MIN_BALANCE_SAVINGS" /></div>
          <div className="space-y-1.5"><Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="GENERAL">General</SelectItem><SelectItem value="BANKING">Banking</SelectItem><SelectItem value="LOAN">Loan</SelectItem><SelectItem value="SMS">SMS</SelectItem><SelectItem value="CHARGES">Charges</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Value *</Label><Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="1000" /></div>
        <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Saving…" : "Save"}</Button></DialogFooter>
    </DialogContent>
  );
}
