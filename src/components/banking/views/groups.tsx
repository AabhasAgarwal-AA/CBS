"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Folder, Plus } from "lucide-react";
import { PageHeader, EmptyState } from "./_shared";

type Group = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { ledgers: number };
};

export function GroupsView() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState("INCOME");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/account-groups");
    const j = await r.json();
    setGroups(j.groups ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  async function submit() {
    if (!name) { toast.error("Group name required"); return; }
    setCreating(true);
    const r = await fetch("/api/account-groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, description }),
    });
    const j = await r.json();
    setCreating(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Group "${name}" created (${type})`);
    setName(""); setDescription("");
    load();
  }

  const typeColors: Record<string, string> = {
    INCOME: "border-emerald-200 text-emerald-700 bg-emerald-50",
    EXPENDITURE: "border-amber-200 text-amber-700 bg-amber-50",
    LIABILITY: "border-red-200 text-red-700 bg-red-50",
    ASSET: "border-cyan-200 text-cyan-700 bg-cyan-50",
  };

  return (
    <div>
      <PageHeader
        title="Account Groups"
        description="Create chart-of-accounts groups (Income / Expenditure / Liability / Asset). Ledgers are created under groups."
      />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Create form */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="size-4 text-emerald-600" /> Create Group
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Create Group: *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Direct Income, Indirect Expenses"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type:</Label>
              <RadioGroup value={type} onValueChange={setType} className="grid grid-cols-2 gap-2">
                {["INCOME", "EXPENDITURE", "LIABILITY", "ASSET"].map((t) => (
                  <div key={t} className="flex items-center space-x-2">
                    <RadioGroupItem value={t} id={t} />
                    <Label htmlFor={t} className="cursor-pointer capitalize text-sm font-normal">
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <Button
              onClick={submit}
              disabled={creating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? "Creating…" : "CREATE GROUP"}
            </Button>
          </CardContent>
        </Card>

        {/* Groups list */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Folder className="size-4 text-emerald-600" /> Existing Groups ({groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
            ) : groups.length === 0 ? (
              <EmptyState icon={Folder} title="No groups yet" />
            ) : (
              <div className="max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Ledgers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium text-slate-900">{g.name}</TableCell>
                        <TableCell><Badge variant="outline" className={typeColors[g.type]}>{g.type}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{g._count.ledgers}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
