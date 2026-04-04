"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, FolderOpen, Users } from "lucide-react";
import { toast } from "sonner";

export default function DepartmentsPage() {
  const { getAccessToken } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const [deptRes, empRes] = await Promise.all([
        api.departments.list(token),
        api.employees.list(token),
      ]);
      setDepartments(deptRes.departments || []);
      setEmployees(empRes.employees || []);
    } catch {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [getAccessToken]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.departments.create(token, { name: name.trim() });
      toast.success("Department created");
      setName("");
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.departments.delete(token, id);
      toast.success("Department deleted");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
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
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="text-muted-foreground mt-1">Organize employees into groups</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-foreground hover:bg-foreground/90 text-background rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Department name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                onClick={handleCreate}
                disabled={submitting || !name.trim()}
                className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {departments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No departments yet. Create one to organize your team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept: any) => {
            const deptEmployees = employees.filter(
              (e: any) => e.department?._id === dept._id || e.department === dept._id
            );
            return (
              <Card key={dept._id} className="group">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium">{dept.name}</span>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> {deptEmployees.length} member{deptEmployees.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(dept._id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {deptEmployees.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-border">
                      {deptEmployees.map((emp: any) => (
                        <div key={emp.id || emp._id} className="flex items-center gap-2 text-sm py-1">
                          <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium">
                            {(emp.name || "?")[0].toUpperCase()}
                          </div>
                          <span>{emp.name || emp.email || "Unnamed"}</span>
                        </div>
                      ))}
                    </div>
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
