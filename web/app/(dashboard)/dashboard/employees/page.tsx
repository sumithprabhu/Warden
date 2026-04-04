"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, UserMinus, Copy, X, Mail, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function EmployeesPage() {
  const { getAccessToken } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [inviteSalary, setInviteSalary] = useState("");
  const [inviteFrequency, setInviteFrequency] = useState("MONTHLY");
  const [inviteType, setInviteType] = useState("FULL_TIME");
  const [inviteDept, setInviteDept] = useState("");

  const load = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const [empRes, deptRes, invRes, orgRes] = await Promise.all([
        api.employees.list(token),
        api.departments.list(token),
        api.employees.listInvites(token),
        api.org.get(token),
      ]);
      setEmployees(empRes.employees || []);
      setDepartments(deptRes.departments || []);
      setInvites(invRes.invites || []);
      setOrg(orgRes);
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [getAccessToken]);

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteToken("");
    setInviteSalary("");
    setInviteFrequency("MONTHLY");
    setInviteType("FULL_TIME");
    setInviteDept("");
    setInviteLink("");
  };

  const handleInvite = async () => {
    if (!inviteSalary.trim()) {
      toast.error("Salary is required");
      return;
    }
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await api.employees.invite(token, {
        email: inviteEmail.trim(),
        salary: inviteSalary.trim(),
        token: inviteToken || undefined,
        payFrequency: inviteFrequency,
        employeeType: inviteType,
        departmentId: inviteDept || undefined,
      });

      const link = res.invite?.inviteUrl || `${window.location.origin}/invite/${res.invite?.token || res.token}`;
      await navigator.clipboard.writeText(link);
      setInviteLink(link);
      toast.success("Invite link copied to clipboard!");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create invite");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.employees.delete(token, id);
      toast.success("Employee deactivated");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate");
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.employees.revokeInvite(token, id);
      toast.success("Invite revoked");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke invite");
    }
  };

  const copyInviteLink = async (inviteToken: string) => {
    const link = `${window.location.origin}/invite/${inviteToken}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const getInviteStatus = (invite: any) => {
    if (invite.used) return { label: "Accepted", variant: "default" as const };
    if (new Date(invite.expiresAt) < new Date()) return { label: "Expired", variant: "secondary" as const };
    return { label: "Pending", variant: "outline" as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => !i.used && new Date(i.expiresAt) >= new Date());
  const pastInvites = invites.filter((i) => i.used || new Date(i.expiresAt) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-muted-foreground mt-1">Manage your team members</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) resetInviteForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-foreground hover:bg-foreground/90 text-background rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Employee</DialogTitle>
            </DialogHeader>
            {inviteLink ? (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Invite created! Share this link with the employee.
                </p>
                <div
                  className="flex items-center gap-2 bg-accent/50 rounded-xl px-3 py-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copied!");
                  }}
                >
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs flex-1 break-all select-all">{inviteLink}</span>
                  <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground text-center">Link copied to clipboard</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    placeholder="employee@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={inviteType} onValueChange={setInviteType}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full-time</SelectItem>
                        <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={inviteFrequency} onValueChange={setInviteFrequency}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {org?.tokens?.length > 0 && (
                  <div className="space-y-2">
                    <Label>Token</Label>
                    <Select value={inviteToken} onValueChange={setInviteToken}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent>
                        {org.tokens.map((t: any) => (
                          <SelectItem key={t.address} value={t.address}>{t.symbol} — {t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Salary (token amount)</Label>
                  <Input
                    type="number"
                    placeholder="5000"
                    value={inviteSalary}
                    onChange={(e) => setInviteSalary(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                {departments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={inviteDept} onValueChange={setInviteDept}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  onClick={handleInvite}
                  disabled={submitting || !inviteEmail.trim() || !inviteSalary.trim()}
                  className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create invite link"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Employees table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="text-center py-12 px-6">
              <p className="text-muted-foreground">No employees yet. Invite your first team member.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp: any) => (
                  <TableRow key={emp._id}>
                    <TableCell className="pl-6">
                      <div>
                        <div className="font-medium">{emp.name || "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.ensName || emp.email || emp.evmAddress?.slice(0, 10) + "..."}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {emp.employeeType === "FULL_TIME" ? "Full-time" : "Contractor"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{emp.salary}</TableCell>
                    <TableCell className="text-sm">{emp.payFrequency}</TableCell>
                    <TableCell>
                      <Badge variant={emp.isActive ? "default" : "secondary"} className="text-xs">
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {emp.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(emp.id || emp._id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <UserMinus className="w-4 h-4" />
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

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Recipient</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite: any) => (
                  <TableRow key={invite._id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{invite.email || invite.ensName || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{invite.salary}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.token)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite._id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Past invites */}
      {pastInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Invites</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Recipient</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastInvites.map((invite: any) => {
                  const status = getInviteStatus(invite);
                  return (
                    <TableRow key={invite._id}>
                      <TableCell className="pl-6">
                        <span className="text-sm">{invite.email || invite.ensName || "—"}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{invite.salary}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
