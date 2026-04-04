"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Vault, Banknote, CalendarClock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PortalOverview() {
  const { getAccessToken, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const [balance, payments, vesting] = await Promise.allSettled([
          api.me.balance(token),
          api.me.payments(token),
          api.me.vesting(token),
        ]);
        setData({
          balance: balance.status === "fulfilled" ? balance.value : null,
          payments: payments.status === "fulfilled" ? payments.value : null,
          vesting: vesting.status === "fulfilled" ? vesting.value : null,
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

  const balanceStr = data?.balance?.balance || "0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.name ? `, ${user.name}` : " back"}
        </h1>
        <p className="text-muted-foreground mt-1">Your private payroll dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/portal/withdraw">
          <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                  <Vault className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold font-mono">
                ${parseFloat(balanceStr).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Balance (USDC)</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/payments">
          <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">
                {data?.payments?.payments?.length ?? 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Total Payments</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/vesting">
          <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">
                {data?.vesting?.schedules?.filter((s: any) => s.status === "ACTIVE")?.length ?? 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Active Vesting</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent payments */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Recent Payments</h3>
            <Link href="/portal/payments" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="w-3 h-3 inline ml-1" />
            </Link>
          </div>
          {!data?.payments?.payments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payments received yet.</p>
          ) : (
            <div className="space-y-3">
              {data.payments.payments.slice(0, 5).map((p: any) => (
                <div key={p._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="text-sm text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="font-mono text-sm font-medium">
                    +${p.amount ? parseFloat(p.amount).toFixed(2) : "0.00"}
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
