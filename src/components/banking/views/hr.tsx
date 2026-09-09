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
import { Users, Plus, Briefcase, Calendar, IndianRupee, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/banking";
import { useAuth } from "@/lib/store";
import { PageHeader, EmptyState } from "./_shared";

type Designation = { id: string; code: string; name: string; level: number; _count: { employees: number } };
type Employee = {
  id: string; empCode: string; fullName: string; phone: string; email: string | null;
  basicSalary: number; hraAllowance: number; otherAllowance: number; status: string; dateOfJoin: string;
  designation: { code: string; name: string; level: number };
};
type Attendance = { id: string; date: string; status: string; checkIn: string | null; checkOut: string | null; employee: { empCode: string; fullName: string; designation: { name: string } } };
type Salary = { id: string; month: number; year: number; basicSalary: number; totalEarnings: number; deductions: number; netPay: number; status: string; paidAt: string | null; employee: { empCode: string; fullName: string; designation: { name: string } } };

export function HrView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"designations" | "employees" | "attendance" | "salary">("designations");
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const [dR, eR, aR, sR] = await Promise.all([
      fetch("/api/designations"),
      fetch("/api/employees?limit=200"),
      fetch("/api/attendance?date=" + new Date().toISOString().slice(0, 10)),
      fetch("/api/salary?month=" + (new Date().getMonth() + 1) + "&year=" + new Date().getFullYear()),
    ]);
    const dJ = await dR.json();
    const eJ = await eR.json();
    const aJ = await aR.json();
    const sJ = await sR.json();
    setDesignations(dJ.designations ?? []);
    setEmployees(eJ.employees ?? []);
    setAttendance(aJ.records ?? []);
    setSalaries(sJ.salaries ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  const newDialogTitle = tab === "designations" ? "New Designation" : tab === "employees" ? "Create Employee" : tab === "attendance" ? "Mark Attendance" : "Create Salary";

  return (
    <div>
      <PageHeader
        title="HR Module"
        description="Designations, employees, attendance, and salary processing with payroll workflow."
        action={
          user?.role !== "TELLER" && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="size-4 mr-1.5" /> {newDialogTitle}
                </Button>
              </DialogTrigger>
              {tab === "designations" && <NewDesignationDialog onCreated={() => { setOpenNew(false); load(); }} />}
              {tab === "employees" && <NewEmployeeDialog designations={designations} onCreated={() => { setOpenNew(false); load(); }} />}
              {tab === "attendance" && <AttendanceDialog employees={employees} onCreated={() => { setOpenNew(false); load(); }} />}
              {tab === "salary" && <SalaryDialog employees={employees} onCreated={() => { setOpenNew(false); load(); }} />}
            </Dialog>
          )
        }
      />

      <div className="inline-flex rounded-lg bg-slate-100 p-1 mb-4 overflow-x-auto">
        <button onClick={() => setTab("designations")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "designations" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}><Briefcase className="size-3.5 inline mr-1" />Designations ({designations.length})</button>
        <button onClick={() => setTab("employees")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "employees" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}><Users className="size-3.5 inline mr-1" />Employees ({employees.length})</button>
        <button onClick={() => setTab("attendance")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "attendance" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}><Calendar className="size-3.5 inline mr-1" />Attendance ({attendance.length})</button>
        <button onClick={() => setTab("salary")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${tab === "salary" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}><IndianRupee className="size-3.5 inline mr-1" />Salary ({salaries.length})</button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tab === "designations" ? (
            designations.length === 0 ? (
              <EmptyState icon={Briefcase} title="No designations" />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="text-center">Level</TableHead><TableHead className="text-center">Employees</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {designations.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.code}</TableCell>
                        <TableCell className="font-medium text-slate-900">{d.name}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline">L{d.level}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{d._count.employees}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : tab === "employees" ? (
            employees.length === 0 ? (
              <EmptyState icon={Users} title="No employees" />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow><TableHead>Emp Code</TableHead><TableHead>Name</TableHead><TableHead>Designation</TableHead><TableHead className="hidden md:table-cell">Phone</TableHead><TableHead className="text-right">Salary</TableHead><TableHead>Status</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.empCode}</TableCell>
                        <TableCell><div className="font-medium text-slate-900">{e.fullName}</div><div className="text-xs text-slate-500">{e.email ?? e.phone}</div></TableCell>
                        <TableCell><Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50">{e.designation.name}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{e.phone}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(e.basicSalary + e.hraAllowance + e.otherAllowance)}</TableCell>
                        <TableCell><Badge variant="outline" className={e.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{e.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : tab === "attendance" ? (
            attendance.length === 0 ? (
              <EmptyState icon={Calendar} title="No attendance records for today" />
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                    <TableRow><TableHead>Employee</TableHead><TableHead>Designation</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Check In</TableHead><TableHead className="hidden md:table-cell">Check Out</TableHead><TableHead>Date</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell><div className="font-medium text-slate-900">{a.employee.fullName}</div><div className="text-xs text-slate-500">{a.employee.empCode}</div></TableCell>
                        <TableCell className="text-xs">{a.employee.designation.name}</TableCell>
                        <TableCell><Badge variant="outline" className={
                          a.status === "PRESENT" ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                          : a.status === "ABSENT" ? "border-red-200 text-red-700 bg-red-50"
                          : a.status === "HALF_DAY" ? "border-amber-200 text-amber-700 bg-amber-50"
                          : "border-blue-200 text-blue-700 bg-blue-50"
                        }>{a.status}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString("en-IN") : "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString("en-IN") : "—"}</TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(a.date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : salaries.length === 0 ? (
            <EmptyState icon={IndianRupee} title="No salary records for this month" />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Earnings</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net Pay</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><div className="font-medium text-slate-900">{s.employee.fullName}</div><div className="text-xs text-slate-500">{s.employee.empCode}</div></TableCell>
                      <TableCell className="text-xs">{s.month}/{s.year}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.totalEarnings)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(s.deductions)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(s.netPay)}</TableCell>
                      <TableCell><Badge variant="outline" className={s.status === "PAID" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}>{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {s.status === "CREATED" && user?.role !== "TELLER" && (
                          <Button size="sm" variant="ghost" onClick={async () => {
                            const r = await fetch("/api/salary", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salaryId: s.id }) });
                            if (r.ok) { toast.success("Salary paid"); load(); } else toast.error("Failed");
                          }}><CheckCircle2 className="size-3.5 text-emerald-600" /></Button>
                        )}
                      </TableCell>
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

function NewDesignationDialog({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("3");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!code || !name) { toast.error("Code and name required"); return; }
    setLoading(true);
    const r = await fetch("/api/designations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, level: Number(level), description }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Designation created");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Designation</DialogTitle><DialogDescription>Create a job role/designation with hierarchy level.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MGR" /></div>
          <div className="space-y-1.5"><Label>Level (1-5)</Label><Input type="number" min="1" max="5" value={level} onChange={(e) => setLevel(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Manager" /></div>
        <div className="space-y-1.5"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Creating…" : "Create"}</Button></DialogFooter>
    </DialogContent>
  );
}

function NewEmployeeDialog({ designations, onCreated }: { designations: Designation[]; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [basicSalary, setBasicSalary] = useState("30000");
  const [hraAllowance, setHraAllowance] = useState("10000");
  const [otherAllowance, setOtherAllowance] = useState("5000");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!fullName || !phone || !designationId) { toast.error("All required fields"); return; }
    setLoading(true);
    const r = await fetch("/api/employees", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email: email || undefined, phone, designationId, basicSalary: Number(basicSalary), hraAllowance: Number(hraAllowance), otherAllowance: Number(otherAllowance) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Employee ${j.employee.empCode} created`);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Create Employee</DialogTitle><DialogDescription>Onboard a new employee with designation and salary structure.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Full Name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Designation *</Label>
            <Select value={designationId} onValueChange={setDesignationId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5"><Label>Basic (₹)</Label><Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>HRA (₹)</Label><Input type="number" value={hraAllowance} onChange={(e) => setHraAllowance(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Other (₹)</Label><Input type="number" value={otherAllowance} onChange={(e) => setOtherAllowance(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Creating…" : "Create employee"}</Button></DialogFooter>
    </DialogContent>
  );
}

function AttendanceDialog({ employees, onCreated }: { employees: Employee[]; onCreated: () => void }) {
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState("PRESENT");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!employeeId) { toast.error("Select employee"); return; }
    setLoading(true);
    const r = await fetch("/api/attendance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, date, status }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success("Attendance marked");
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Mark Attendance</DialogTitle><DialogDescription>Mark today's attendance for an employee.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5"><Label>Employee *</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="PRESENT">Present</SelectItem><SelectItem value="ABSENT">Absent</SelectItem><SelectItem value="HALF_DAY">Half Day</SelectItem><SelectItem value="LEAVE">On Leave</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Marking…" : "Mark attendance"}</Button></DialogFooter>
    </DialogContent>
  );
}

function SalaryDialog({ employees, onCreated }: { employees: Employee[]; onCreated: () => void }) {
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [deductions, setDeductions] = useState("0");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!employeeId) { toast.error("Select employee"); return; }
    setLoading(true);
    const r = await fetch("/api/salary", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, month: Number(month), year: Number(year), deductions: Number(deductions) }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Salary created — net ₹${j.salary.netPay}`);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Create Salary</DialogTitle><DialogDescription>Generate monthly salary for an employee. Earnings = basic + HRA + other; net = earnings − deductions.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5"><Label>Employee *</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5"><Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{new Date(2000, i, 1).toLocaleString("en", { month: "short" })}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Deductions (₹)</Label><Input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Creating…" : "Create salary"}</Button></DialogFooter>
    </DialogContent>
  );
}
