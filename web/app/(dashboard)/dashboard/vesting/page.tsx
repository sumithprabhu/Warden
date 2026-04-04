"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Loader2, Plus, CalendarClock, Unlock } from "lucide-react";
import { toast } from "sonner";

export default function VestingPage() {
  const { getAccessToken } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [cliffMonths, setCliffMonths] = useState("12");
  const [vestingMonths, setVestingMonths] = useState("48");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const load = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const [vRes, eRes] = await Promise.allSettled([
        api.vesting.list(token),
        api.employees.list(token),
      ]);
      if (vRes.status === "fulfilled") setSchedules(vRes.value.schedules || []);
      if (eRes.status === "fulfilled") setEmployees(eRes.value.employees || []);
    } catch {
      toast.error("Failed to load vesting data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [getAccessToken]);

  const handleCreate = async () => {
    if (!selectedEmployee || !totalAmount.trim()) {
      toast.error("Employee and amount are required");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.vesting.create(token, {
        employeeUserId: selectedEmployee,
        totalAmount: totalAmount.trim(),
        cliffMonths: parseInt(cliffMonths),
        vestingMonths: parseInt(vestingMonths),
        startDate,
      });
      toast.success("Vesting schedule created");
      setOpen(false);
      setSelectedEmployee("");
      setTotalAmount("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.vesting.release(token, id);
      toast.success("Vested tokens released");
      load();
    } catch (err: any) {
      toast.error(err.message || "Release failed");
    }
  };

  const getVestingProgress = (schedule: any) => {
    const start = new Date(schedule.startDate).getTime();
    const now = Date.now();
    const totalMs = schedule.vestingMonths * 30 * 24 * 60 * 60 * 1000;
    const cliffMs = schedule.cliffMonths * 30 * 24 * 60 * 60 * 1000;
    const elapsed = now - start;

    if (elapsed < cliffMs) return 0;
    return Math.min(100, Math.round(((elapsed - cliffMs) / (totalMs - cliffMs)) * 100));
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
          <h1 className="text-2xl font-semibold tracking-tight">Vesting</h1>
          <p className="text-muted-foreground mt-1">Manage token vesting schedules</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-foreground hover:bg-foreground/90 text-background rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Vesting Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => (
                      <SelectItem key={e.userId?._id || e._id} value={e.userId?._id || e._id}>
                        {e.userId?.name || e.userId?.email || "Employee"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total amount (tokens)</Label>
                <Input
                  placeholder="10000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cliff (months)</Label>
                  <Input
                    type="number"
                    value={cliffMonths}
                    onChange={(e) => setCliffMonths(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total vesting (months)</Label>
                  <Input
                    type="number"
                    value={vestingMonths}
                    onChange={(e) => setVestingMonths(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={submitting || !selectedEmployee || !totalAmount.trim()}
                className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No vesting schedules yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((s: any) => {
            const progress = getVestingProgress(s);
            return (
              <Card key={s._id}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {s.employeeUserId?.name || "Employee"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.employeeUserId?.email || s.employeeUserId?.ensName || ""}
                      </div>
                    </div>
                    <Badge
                      variant={s.status === "ACTIVE" ? "default" : s.status === "COMPLETED" ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {s.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total</div>
                      <div className="font-mono font-medium">{s.totalAmount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Released</div>
                      <div className="font-mono font-medium">{s.releasedAmount || "0"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cliff</div>
                      <div>{s.cliffMonths} months</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Duration</div>
                      <div>{s.vestingMonths} months</div>
                    </div>
                  </div>

                  {s.status === "ACTIVE" && progress > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRelease(s._id)}
                      className="w-full rounded-lg"
                    >
                      <Unlock className="w-3 h-3 mr-2" />
                      Release vested tokens
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
