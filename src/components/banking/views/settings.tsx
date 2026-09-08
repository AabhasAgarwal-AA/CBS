"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, Plus, UserPlus, Mail, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  branch: string | null;
  active: boolean;
  createdAt: string;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  city: string;
  ifsc: string;
  address: string | null;
};

export function SettingsView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"users" | "branches">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openUser, setOpenUser] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);

  async function load() {
    setLoading(true);
    const [u, b] = await Promise.all([fetch("/api/users"), fetch("/api/branches")]);
    const uj = await u.json();
    const bj = await b.json();
    setUsers(uj.users ?? []);
    setBranches(bj.branches ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 50);
    return () => clearTimeout(t);
  }, []);

  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Manage bank staff, branches and IFSC codes."
        action={
          tab === "users" ? (
            isAdmin ? (
              <Dialog open={openUser} onOpenChange={setOpenUser}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <UserPlus className="size-4 mr-1.5" /> New User
                  </Button>
                </DialogTrigger>
                <NewUserDialog onCreated={() => { setOpenUser(false); load(); }} />
              </Dialog>
            ) : null
          ) : (
            <Dialog open={openBranch} onOpenChange={setOpenBranch}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> New Branch
                </Button>
              </DialogTrigger>
              <NewBranchDialog onCreated={() => { setOpenBranch(false); load(); }} />
            </Dialog>
          )
        }
      />

      <div className="inline-flex rounded-lg bg-slate-100 p-1 mb-4">
        <button
          onClick={() => setTab("users")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
            tab === "users" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Staff ({users.length})
        </button>
        <button
          onClick={() => setTab("branches")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
            tab === "branches" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Branches ({branches.length})
        </button>
      </div>

      {!isAdmin && tab === "users" && (
        <Card className="border-amber-200 bg-amber-50 mb-4">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-amber-800">
            <ShieldAlert className="size-4" /> Only admins can create new staff accounts.
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tab === "users" ? (
            users.length === 0 ? (
              <EmptyState icon={UserPlus} title="No staff yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                      <TableCell className="text-xs flex items-center gap-1 text-slate-600">
                        <Mail className="size-3" /> {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            u.role === "ADMIN"
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : u.role === "MANAGER"
                              ? "border-cyan-200 text-cyan-700 bg-cyan-50"
                              : "border-slate-200 text-slate-600 bg-slate-50"
                          }
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{u.branch ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={u.active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-500"}>
                          {u.active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(u.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : branches.length === 0 ? (
            <EmptyState icon={Building2} title="No branches" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>IFSC</TableHead>
                  <TableHead className="hidden md:table-cell">Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.code}</TableCell>
                    <TableCell className="font-medium text-slate-900">{b.name}</TableCell>
                    <TableCell>{b.city}</TableCell>
                    <TableCell className="font-mono text-xs">{b.ifsc}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-500">{b.address ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewUserDialog({ onCreated }: { onCreated: () => void }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TELLER");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/branches").then((r) => r.json()).then((j) => setBranches(j.branches ?? []));
  }, []);

  async function submit() {
    if (!name || !email || !password) {
      toast.error("Name, email and password required");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, branch: branch || undefined }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    toast.success("User created");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create new staff user</DialogTitle>
        <DialogDescription>
          Role controls module access. Passwords are hashed with SHA-256 (demo only).
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Password *</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="TELLER">Teller</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.code}>{b.code} — {b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Creating…" : "Create user"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function NewBranchDialog({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name || !code || !city) {
      toast.error("Name, code, city required");
      return;
    }
    setLoading(true);
    const r = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, city, address }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    toast.success("Branch created");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create new branch</DialogTitle>
        <DialogDescription>
          The IFSC code is generated automatically as CBSB0{`<code>`}.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>Branch Code *</Label>
          <Input placeholder="MUM02" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1.5">
          <Label>Branch Name *</Label>
          <Input placeholder="Mumbai Bandra West" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>City *</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? "Creating…" : "Create branch"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
