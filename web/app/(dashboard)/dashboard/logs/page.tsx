"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const actionColors: Record<string, string> = {
  "Organization created": "default",
  "Token added": "secondary",
  "Token removed": "destructive",
  "Admin added": "default",
  "Employee invited": "secondary",
  "Employee deactivated": "destructive",
  "Payroll executed": "default",
  "Payroll approved": "default",
  "Department created": "secondary",
  "Department deleted": "destructive",
  "Vesting created": "secondary",
  "Settings updated": "secondary",
};

export default function LogsPage() {
  const { getAccessToken } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p: number) => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await api.audit.list(token, p);
      setLogs(res.logs || []);
      setTotalPages(res.pages || 1);
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [getAccessToken, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">Track all admin actions in your organization</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No activity logged yet.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log._id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.userName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(actionColors[log.action] || "secondary") as any}
                          className="text-xs"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
