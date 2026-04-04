"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Vault,
  Users,
  Banknote,
  CalendarClock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function DashboardOverview() {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const [balance, employees, payrolls, upcoming] = await Promise.allSettled([
          api.treasury.balance(token),
          api.employees.list(token),
          api.payroll.list(token, 1),
          api.payroll.upcoming(token),
        ]);

        setData({
          balance: balance.status === "fulfilled" ? balance.value : null,
          employees: employees.status === "fulfilled" ? employees.value : null,
          payrolls: payrolls.status === "fulfilled" ? payrolls.value : null,
          upcoming: upcoming.status === "fulfilled" ? upcoming.value : null,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAccessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const poolBalance = data?.balance?.poolBalance ? parseFloat(data.balance.poolBalance) : 0;
  const activeEmployees = data?.employees?.employees?.filter((e: any) => e.isActive)?.length ?? 0;
  const totalPayrolls = data?.payrolls?.total ?? 0;
  const nextPayroll = data?.upcoming?.totalAmount ? parseFloat(data.upcoming.totalAmount) : 0;

  const stats = [
    {
      label: "Privacy Pool",
      value: `$${poolBalance.toFixed(2)}`,
      icon: Vault,
      href: "/dashboard/treasury",
    },
    {
      label: "Active Employees",
      value: activeEmployees,
      icon: Users,
      href: "/dashboard/employees",
    },
    {
      label: "Total Payrolls",
      value: totalPayrolls,
      icon: Banknote,
      href: "/dashboard/payroll",
    },
    {
      label: "Next Payroll",
      value: nextPayroll > 0 ? `$${nextPayroll.toFixed(2)}` : "—",
      sub: nextPayroll > 0 ? `${data?.upcoming?.employeeCount || 0} employees` : "None scheduled",
      icon: CalendarClock,
      href: "/dashboard/payroll",
    },
  ];

  const recentPayrolls = data?.payrolls?.payrolls?.slice(0, 5) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your private payroll operations</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="text-2xl font-semibold">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                {stat.sub && <div className="text-xs text-muted-foreground">{stat.sub}</div>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/payroll">
          <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <div className="font-medium">Run Payroll</div>
                <div className="text-sm text-muted-foreground">Execute private batch payment</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/employees">
          <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <div className="font-medium">Invite Employee</div>
                <div className="text-sm text-muted-foreground">Add a new team member</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/treasury">
          <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <div className="font-medium">Fund Pool</div>
                <div className="text-sm text-muted-foreground">Deposit into privacy pool</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent payrolls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Payrolls</CardTitle>
          <Link href="/dashboard/payroll">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentPayrolls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payrolls yet. Run your first payroll to get started.</p>
          ) : (
            <div className="space-y-3">
              {recentPayrolls.map((p: any) => (
                <div key={p._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium">
                      {p.employeeCount} employee{p.employeeCount !== 1 ? "s" : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono">
                      ${p.totalAmount ? parseFloat(p.totalAmount).toFixed(2) : "0.00"}
                    </span>
                    <Badge
                      variant={
                        p.status === "COMPLETED" ? "default" :
                        p.status === "FAILED" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {p.status === "PROCESSING" ? "Processing" : p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
