"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowUpFromLine, Vault } from "lucide-react";
import { toast } from "sonner";

export default function WithdrawPage() {
  const { getAccessToken, user } = useAuth();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await api.me.balance(token);
        setBalance(res.balance || "0");
      } catch {
        toast.error("Failed to load balance");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAccessToken]);

  // Pre-fill destination with user's wallet address
  useEffect(() => {
    if (user?.evmAddress && !destination) {
      setDestination(user.evmAddress);
    }
  }, [user?.evmAddress]);

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amount || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt > parseFloat(balance)) {
      toast.error("Amount exceeds your balance");
      return;
    }
    if (!destination.trim()) {
      toast.error("Enter a destination address");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      toast.info("Withdrawing from privacy pool... This may take a few minutes.");
      await api.me.withdraw(token, {
        amount: amount,
        recipientEvmAddress: destination.trim(),
      });
      toast.success(`$${amount} withdrawn to ${destination.slice(0, 8)}...`);
      setAmount("");
      // Refresh balance
      const res = await api.me.balance(token);
      setBalance(res.balance || "0");
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  };

  const setMax = () => setAmount(balance);

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
        <h1 className="text-2xl font-semibold tracking-tight">Withdraw</h1>
        <p className="text-muted-foreground mt-1">Transfer funds from your privacy pool to any wallet</p>
      </div>

      {/* Balance */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
              <Vault className="w-4 h-4" />
            </div>
            <span className="text-sm text-muted-foreground">Available Balance</span>
          </div>
          <div className="text-3xl font-semibold font-mono">
            ${parseFloat(balance).toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">USDC</div>
        </CardContent>
      </Card>

      {/* Withdraw form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Withdraw Funds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Amount (USDC)</Label>
              {parseFloat(balance) > 0 && (
                <button onClick={setMax} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Max: ${parseFloat(balance).toFixed(2)}
                </button>
              )}
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 rounded-xl"
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>Destination wallet</Label>
            <Input
              placeholder="0x..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-11 rounded-xl font-mono text-sm"
            />
            {user?.evmAddress && destination === user.evmAddress && (
              <p className="text-xs text-green-600">Your connected wallet</p>
            )}
          </div>
          <Button
            onClick={handleWithdraw}
            disabled={submitting || !amount || parseFloat(amount || "0") <= 0}
            className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Withdrawing...
              </>
            ) : (
              <>
                <ArrowUpFromLine className="w-4 h-4 mr-2" />
                Withdraw
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Withdrawal is processed via ZK proof — may take 1-2 minutes to confirm.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
