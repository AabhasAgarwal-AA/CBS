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
import { UserPlus, Users, Plus } from "lucide-react";
import { formatDate } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Enrollment = {
  id: string;
  enrollmentNo: string;
  customerId: string;
  membershipType: string;
  status: string;
  enrollmentDate: string;
  customer: { fullName: string; customerNo: string; phone: string };
  group: { groupCode: string; groupName: string } | null;
};

type Group = {
  id: string;
  groupCode: string;
  groupName: string;
  leaderName: string;
  memberCount: number;
  totalDeposit: number;
  status: string;
  createdAt: string;
  _count?: { members: number };
};

export function MemberEnrollmentView() {
  const [tab, setTab] = useState<"members" | "groups">("members");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [openGroup, setOpenGroup] = useState(false);

  async function load() {
    setLoading(true);
    const [eR, gR] = await Promise.all([
      fetch("/api/member-enrollment?limit=200"),
      fetch("/api/group-enrollment?limit=100"),
    ]);
    const eJ = await eR.json();
    const gJ = await gR.json();
    setEnrollments(eJ.enrollments ?? []);
    setGroups(gJ.groups ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  return (
    <div>
      <PageHeader
        title="Member Enrollment"
        description="Enroll customers as members (individual or group) — CSC / Digital Seva style onboarding."
        action={
          <>
            <Dialog open={openGroup} onOpenChange={setOpenGroup}>
              <DialogTrigger asChild>
                <Button variant="outline" className="mr-2">
                  <Users className="size-4 mr-1.5" /> New Group
                </Button>
              </DialogTrigger>
              <NewGroupDialog onCreated={() => { setOpenGroup(false); load(); }} />
            </Dialog>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> Enroll Member
                </Button>
              </DialogTrigger>
              <NewEnrollmentDialog groups={groups} onCreated={() => { setOpenNew(false); load(); }} />
            </Dialog>
          </>
        }
      />

      <div className="inline-flex rounded-lg bg-slate-100 p-1 mb-4">
        <button onClick={() => setTab("members")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "members" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Members ({enrollments.length})</button>
        <button onClick={() => setTab("groups")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "groups" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>Groups ({groups.length})</button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tab === "members" ? (
            enrollments.length === 0 ? (
              <EmptyState icon={UserPlus} title="No members enrolled" />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow>
                      <TableHead>Enrollment No</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.enrollmentNo}</TableCell>
                        <TableCell><div className="font-medium text-slate-900">{e.customer.fullName}</div><div className="text-xs text-slate-500">{e.customer.customerNo}</div></TableCell>
                        <TableCell className="text-xs">{e.customer.phone}</TableCell>
                        <TableCell><Badge variant="outline" className={e.membershipType === "GROUP" ? "border-purple-200 text-purple-700 bg-purple-50" : "border-cyan-200 text-cyan-700 bg-cyan-50"}>{e.membershipType}</Badge></TableCell>
                        <TableCell className="text-xs">{e.group ? `${e.group.groupCode} · ${e.group.groupName}` : "—"}</TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(e.enrollmentDate)}</TableCell>
                        <TableCell><Badge variant="outline" className={e.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{e.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : groups.length === 0 ? (
            <EmptyState icon={Users} title="No groups created" />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Group Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-right">Total Deposit</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-xs">{g.groupCode}</TableCell>
                      <TableCell className="font-medium text-slate-900">{g.groupName}</TableCell>
                      <TableCell className="text-xs">{g.leaderName}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{g._count?.members ?? g.memberCount}</Badge></TableCell>
                      <TableCell className="text-right text-xs">₹{g.totalDeposit.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(g.createdAt)}</TableCell>
                      <TableCell><Badge variant="outline" className={g.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{g.status}</Badge></TableCell>
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

function NewEnrollmentDialog({ groups, onCreated }: { groups: Group[]; onCreated: () => void }) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; customerNo: string }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [membershipType, setMembershipType] = useState("INDIVIDUAL");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/customers?limit=200").then((r) => r.json()).then((j) => setCustomers(j.customers ?? [])); }, []);

  async function submit() {
    if (!customerId) { toast.error("Customer required"); return; }
    setLoading(true);
    const r = await fetch("/api/member-enrollment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, groupId: groupId || undefined, membershipType }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Member enrolled");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Enroll member</DialogTitle>
        <DialogDescription>Onboard a customer as a member (individual or group).</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName} ({c.customerNo})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Membership Type</Label>
            <Select value={membershipType} onValueChange={(v) => { setMembershipType(v); if (v === "INDIVIDUAL") setGroupId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="INDIVIDUAL">Individual</SelectItem><SelectItem value="GROUP">Group</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Group</Label>
            <Select value={groupId} onValueChange={setGroupId} disabled={membershipType !== "GROUP"}>
              <SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
              <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.groupCode} — {g.groupName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Enrolling…" : "Enroll member"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function NewGroupDialog({ onCreated }: { onCreated: () => void }) {
  const [groupName, setGroupName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!groupName || !leaderName) { toast.error("All fields required"); return; }
    setLoading(true);
    const r = await fetch("/api/group-enrollment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupName, leaderName }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Group created");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create group</DialogTitle>
        <DialogDescription>Create a group for group enrollment.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5"><Label>Group Name *</Label><Input value={groupName} onChange={(e) => setGroupName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Leader Name *</Label><Input value={leaderName} onChange={(e) => setLeaderName(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Creating…" : "Create group"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
