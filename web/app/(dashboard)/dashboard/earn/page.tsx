"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Vault, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";

export default function EarnPage() {
  const { getAccessToken } = useAuth();
  const [lpBalance, setLpBalance] = useState("0");
  const [totalDeposits, setTotalDeposits] = useState("0");
  const [poolBalance, setPoolBalance] = useState("0");
  const [loading, setLoading] = useState(true);

  // Deposit
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [depositStep, setDepositStep] = useState("");

  // Withdraw
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState("");

  const load = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const [earnRes, balRes] = await Promise.allSettled([
        api.earn.balance(token),
        api.treasury.balance(token),
      ]);
      if (earnRes.status === "fulfilled") {
        setLpBalance(earnRes.value.lpBalance || "0");
        setTotalDeposits(earnRes.value.totalDeposits || "0");
      }
      if (balRes.status === "fulfilled") {
        setPoolBalance(balRes.value.poolBalance || "0");
      }
    } catch {
      toast.error("Failed to load earn data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [getAccessToken]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (parseFloat(depositAmount) > parseFloat(poolBalance)) {
      toast.error("Insufficient pool balance");
      return;
    }

    setDepositing(true);
    setDepositStep("Withdrawing from pool & depositing into vault...");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const res = await api.earn.deposit(token, { amount: depositAmount });
      toast.success(`$${depositAmount} deposited into yield vault!`);
      setDepositOpen(false);
      setDepositAmount("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Deposit failed");
    } finally {
      setDepositing(false);
      setDepositStep("");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (parseFloat(withdrawAmount) > parseFloat(lpBalance)) {
      toast.error("Insufficient vault balance");
      return;
    }

    setWithdrawing(true);
    setWithdrawStep("Withdrawing from vault & depositing to pool...");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const res = await api.earn.withdraw(token, { amount: withdrawAmount });
      toast.success(`$${withdrawAmount} withdrawn from vault back to pool!`);
      setWithdrawOpen(false);
      setWithdrawAmount("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Withdraw failed");
    } finally {
      setWithdrawing(false);
      setWithdrawStep("");
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Earn</h1>
          <p className="text-muted-foreground mt-1">Put idle treasury funds to work in DeFi</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <Button className="bg-foreground hover:bg-foreground/90 text-background rounded-xl">
                <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit to Vault
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Deposit into Yield Vault</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Funds are moved from your privacy pool into the yield vault. You receive lpUSD as proof of deposit.
                </p>
                <div className="flex items-center gap-2 bg-accent/50 rounded-xl px-3 py-2.5">
                  <Vault className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">Available in pool</div>
                    <div className="font-mono text-sm">${parseFloat(poolBalance).toFixed(2)} USDC</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount (USDC)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleDeposit}
                  disabled={depositing || !depositAmount || parseFloat(depositAmount || "0") <= 0}
                  className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
                >
                  {depositing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {depositStep || "Depositing..."}
                    </>
                  ) : (
                    "Deposit to Vault"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Pool → Vault. You receive lpUSD tokens as proof of deposit.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Withdraw from Yield Vault</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Burns your lpUSD and returns USDC back to the privacy pool.
                </p>
                <div className="flex items-center gap-2 bg-accent/50 rounded-xl px-3 py-2.5">
                  <BadgeDollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">Your vault balance</div>
                    <div className="font-mono text-sm">${parseFloat(lpBalance).toFixed(2)} lpUSD</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount (lpUSD)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount || "0") <= 0}
                  className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
                >
                  {withdrawing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {withdrawStep || "Withdrawing..."}
                    </>
                  ) : (
                    "Withdraw to Pool"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vault Balance Card */}
      <Card className="bg-foreground text-background">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm text-background/60">Yield Vault Balance</div>
              <div className="text-xs text-background/40">USDC deposited into DeFi vault</div>
            </div>
          </div>
          <div className="text-4xl font-semibold font-mono">
            ${parseFloat(lpBalance).toFixed(2)}
          </div>
          <div className="text-sm text-background/60 mt-1">lpUSD (proof of deposit)</div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Privacy Pool Available</div>
            <div className="text-2xl font-semibold font-mono mt-1">${parseFloat(poolBalance).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">USDC available to deposit into vault</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Vault TVL</div>
            <div className="text-2xl font-semibold font-mono mt-1">${parseFloat(totalDeposits).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">Total USDC locked in vault</div>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">1</div>
              <p className="text-sm font-medium">Deposit</p>
              <p className="text-xs text-muted-foreground">USDC moves from your privacy pool into the yield vault via a private withdrawal</p>
            </div>
            <div className="space-y-1">
              <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">2</div>
              <p className="text-sm font-medium">Earn</p>
              <p className="text-xs text-muted-foreground">You receive lpUSD tokens as proof. Funds earn yield in the DeFi vault.</p>
            </div>
            <div className="space-y-1">
              <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">3</div>
              <p className="text-sm font-medium">Withdraw</p>
              <p className="text-xs text-muted-foreground">Burn lpUSD to get USDC back, deposited privately back into the pool</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {parseFloat(lpBalance) === 0 && parseFloat(poolBalance) === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center py-8 space-y-3">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No funds available yet.</p>
            <p className="text-sm text-muted-foreground">Deposit USDC into the treasury privacy pool first, then move funds into the yield vault.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
