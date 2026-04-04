"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export default function PortalVestingPage() {
  const { getAccessToken } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await api.me.vesting(token);
        setSchedules(res.schedules || []);
      } catch {
        toast.error("Failed to load vesting data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAccessToken]);

  const getVestingProgress = (schedule: any) => {
    const start = new Date(schedule.startDate).getTime();
    const now = Date.now();
    const totalMs = schedule.vestingMonths * 30 * 24 * 60 * 60 * 1000;
    const cliffMs = schedule.cliffMonths * 30 * 24 * 60 * 60 * 1000;
    const elapsed = now - start;
    if (elapsed < cliffMs) return 0;
    return Math.min(100, Math.round(((elapsed - cliffMs) / (totalMs - cliffMs)) * 100));
  };

  const getCliffDate = (schedule: any) => {
    const start = new Date(schedule.startDate);
    start.setMonth(start.getMonth() + schedule.cliffMonths);
    return start;
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vesting</h1>
        <p className="text-muted-foreground mt-1">Track your token vesting schedules</p>
      </div>

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarClock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No vesting schedules assigned to you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((s: any) => {
            const progress = getVestingProgress(s);
            const cliffDate = getCliffDate(s);
            const isCliffReached = Date.now() >= cliffDate.getTime();
            const total = parseFloat(s.totalAmount) || 0;
            const released = parseFloat(s.releasedAmount) || 0;
            const vested = total * (progress / 100);
            const locked = total - vested;

            return (
              <Card key={s._id}>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold font-mono">
                      {total.toLocaleString()} tokens
                    </div>
                    <Badge
                      variant={s.status === "ACTIVE" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {s.status}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vesting progress</span>
                      <span className="font-mono font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-accent/50 rounded-xl p-4 text-center">
                      <div className="text-sm text-muted-foreground mb-1">Vested</div>
                      <div className="font-mono font-semibold text-lg">{vested.toFixed(0)}</div>
                    </div>
                    <div className="bg-accent/50 rounded-xl p-4 text-center">
                      <div className="text-sm text-muted-foreground mb-1">Released</div>
                      <div className="font-mono font-semibold text-lg">{released.toFixed(0)}</div>
                    </div>
                    <div className="bg-accent/50 rounded-xl p-4 text-center">
                      <div className="text-sm text-muted-foreground mb-1">Locked</div>
                      <div className="font-mono font-semibold text-lg">{locked.toFixed(0)}</div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Start date</span>
                      <div className="font-medium">{new Date(s.startDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cliff date</span>
                      <div className="font-medium">
                        {cliffDate.toLocaleDateString()}
                        {!isCliffReached && (
                          <span className="text-xs text-muted-foreground ml-1">(pending)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cliff</span>
                      <div className="font-medium">{s.cliffMonths} months</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total duration</span>
                      <div className="font-medium">{s.vestingMonths} months</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
