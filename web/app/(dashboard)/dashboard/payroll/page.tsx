"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Play, CheckCircle2, Banknote } from "lucide-react";
import { toast } from "sonner";

export default function PayrollPage() {
  const { getAccessToken, user } = useAuth();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runOpen, setRunOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState("all");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const [pRes, dRes, uRes] = await Promise.allSettled([
        api.payroll.list(token),
        api.departments.list(token),
        api.payroll.upcoming(token),
      ]);
      if (pRes.status === "fulfilled") setPayrolls(pRes.value.payrolls || []);
      if (dRes.status === "fulfilled") setDepartments(dRes.value.departments || []);
      if (uRes.status === "fulfilled") setUpcoming(uRes.value);
    } catch {
      toast.error("Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [getAccessToken]);

  const handleRun = async () => {
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.payroll.run(token, {
        departmentId: selectedDept === "all" ? undefined : selectedDept,
      });
      toast.success("Private payroll submitted! ZK proof is being generated — this takes ~2 minutes.");
      setRunOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Payroll run failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.payroll.approve(token, id);
      toast.success("Payroll approved");
      load();
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "default";
      case "FAILED": return "destructive";
      case "PROCESSING": return "secondary";
      case "PENDING_APPROVAL": return "outline";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground mt-1">Run and manage private payroll</p>
        </div>
        <Dialog open={runOpen} onOpenChange={setRunOpen}>
          <DialogTrigger asChild>
            <Button className="bg-foreground hover:bg-foreground/90 text-background rounded-xl">
              <Play className="w-4 h-4 mr-2" />
              Run Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Run Payroll</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {upcoming && (
                <Card className="bg-accent/50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Employees</span>
                      <span className="font-medium">{upcoming.employeeCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total amount</span>
                      <span className="font-mono font-medium">
                        ${upcoming.totalAmount ? parseFloat(upcoming.totalAmount).toFixed(2) : "0.00"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleRun}
                disabled={submitting}
                className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Execute payroll"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming preview */}
      {upcoming && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Payroll Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div>
                <div className="text-2xl font-semibold font-mono">
                  ${upcoming.totalAmount ? parseFloat(upcoming.totalAmount).toFixed(2) : "0.00"}
                </div>
                <div className="text-sm text-muted-foreground">Total USDC</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{upcoming.employeeCount || 0}</div>
                <div className="text-sm text-muted-foreground">Employees</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payroll History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payrolls.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payrolls yet. Run your first payroll above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((p: any) => (
                  <TableRow key={p._id}>
                    <TableCell className="text-sm">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{p.employeeCount}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {p.totalAmount ? parseFloat(p.totalAmount).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(p.status) as any} className="text-xs">
                        {p.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "PENDING_APPROVAL" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(p._id)}
                          className="rounded-lg"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                      )}
                    </TableCell>
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
