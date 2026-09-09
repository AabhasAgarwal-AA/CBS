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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Truck, Plus } from "lucide-react";
import { formatDate } from "@/lib/banking";
import { PageHeader, EmptyState } from "./_shared";

type Vendor = {
  id: string; vendorCode: string; name: string; phone: string; email: string | null;
  city: string | null; state: string | null; pan: string | null; gstin: string | null;
  status: string; createdAt: string;
  _count: { vouchers: number };
};

export function VendorsView() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/vendors?limit=200");
    const j = await r.json();
    setVendors(j.vendors ?? []);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, []);

  return (
    <div>
      <PageHeader
        title="Manage Vendors"
        description="Create and manage vendors/suppliers for purchase vouchers and payment processing."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-4 mr-1.5" /> New Vendor
              </Button>
            </DialogTrigger>
            <NewVendorDialog onCreated={() => { setOpenNew(false); load(); }} />
          </Dialog>
        }
      />

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : vendors.length === 0 ? (
            <EmptyState icon={Truck} title="No vendors" description="Add a vendor to start processing purchase vouchers." />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e2e8f0]">
                  <TableRow>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">City</TableHead>
                    <TableHead className="hidden lg:table-cell">PAN</TableHead>
                    <TableHead className="hidden lg:table-cell">GSTIN</TableHead>
                    <TableHead className="text-center">Vouchers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">{v.vendorCode}</TableCell>
                      <TableCell className="font-medium text-slate-900">{v.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{v.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{v.city ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">{v.pan ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">{v.gstin ?? "—"}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{v._count.vouchers}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={v.status === "ACTIVE" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}>{v.status}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">{formatDate(v.createdAt)}</TableCell>
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

function NewVendorDialog({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name || !phone) { toast.error("Name and phone required"); return; }
    setLoading(true);
    const r = await fetch("/api/vendors", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || undefined, phone, address, city, state, pincode, pan, gstin }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { toast.error(j.error ?? "Failed"); return; }
    toast.success(`Vendor ${j.vendor.vendorCode} created`);
    onCreated();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New Vendor</DialogTitle><DialogDescription>Add a vendor/supplier.</DialogDescription></DialogHeader>
      <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Pincode</Label><Input value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>PAN</Label><Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} className="font-mono" /></div>
          <div className="space-y-1.5"><Label>GSTIN</Label><Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className="font-mono" /></div>
        </div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">{loading ? "Creating…" : "Create vendor"}</Button></DialogFooter>
    </DialogContent>
  );
}
