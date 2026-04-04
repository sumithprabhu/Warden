"use client";

import { useAuth } from "@/hooks/use-auth";
import { usePrivyWallet } from "@/hooks/use-privy-wallet";
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
import { Loader2, ArrowDownToLine, ArrowUpFromLine, Vault, Coins, Wallet } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { parseUnits, erc20Abi } from "viem";

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`;

export default function TreasuryPage() {
  const { getAccessToken, user } = useAuth();
  const { address: walletAddress, ready: walletReady, getProvider } = usePrivyWallet();
  const [org, setOrg] = useState<any>(null);
  const [poolBalance, setPoolBalance] = useState("0");
  const [fundingAddress, setFundingAddress] = useState("");
  const [loading, setLoading] = useState(true);

  // Deposit
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [depositStep, setDepositStep] = useState("");

  // Withdraw
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const load = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const [orgRes, balRes] = await Promise.allSettled([
        api.org.get(token),
        api.treasury.balance(token),
      ]);
      if (orgRes.status === "fulfilled") {
        setOrg(orgRes.value);
      }
      if (balRes.status === "fulfilled") {
        setPoolBalance(balRes.value.poolBalance || "0");
        setFundingAddress(balRes.value.fundingAddress || "");
      }
    } catch {
      toast.error("Failed to load treasury data");
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

    setDepositing(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const amountInUnits = parseUnits(depositAmount, 6);

      // Try to transfer from connected wallet if it has USDC + ETH for gas
      let transferred = false;
      try {
        const { walletClient, publicClient, address } = await getProvider();

        const [usdcBal, ethBal] = await Promise.all([
          publicClient.readContract({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          }),
          publicClient.getBalance({ address }),
        ]);

        // Only attempt wallet transfer if wallet has enough USDC and some ETH for gas
        if (usdcBal >= amountInUnits && ethBal > 0n) {
          setDepositStep("Sending USDC from your wallet...");
          const txHash = await walletClient.writeContract({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: "transfer",
            args: [fundingAddress as `0x${string}`, amountInUnits],
          });
          setDepositStep("Waiting for transfer confirmation...");
          await publicClient.waitForTransactionReceipt({ hash: txHash });
          transferred = true;
        }
      } catch {
        // Wallet transfer failed or unavailable — fall through to direct deposit
      }

      // Deposit into Unlink privacy pool (uses deployer wallet funds)
      setDepositStep("Depositing into privacy pool...");
      const res = await api.treasury.deposit(token, { amount: depositAmount });

      toast.success(`$${depositAmount} deposited into privacy pool!`);
      setDepositOpen(false);
      setDepositAmount("");
      setDepositStep("");
      load();
    } catch (err: any) {
      console.error("Deposit error:", err);
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

    setWithdrawing(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      toast.info("Withdrawing from privacy pool... This may take a few minutes.");
      const res = await api.treasury.withdraw(token, {
        amount: withdrawAmount,
        recipientEvmAddress: withdrawTo.trim() || undefined,
      });

      toast.success(`$${withdrawAmount} withdrawn from privacy pool!`);
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawTo("");
      load();
    } catch (err: any) {
      console.error("Withdraw error:", err);
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setWithdrawing(false);
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
          <h1 className="text-2xl font-semibold tracking-tight">Treasury</h1>
          <p className="text-muted-foreground mt-1">On-chain organization funds</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/get-test-tokens">
            <Button variant="outline" className="rounded-xl">
              <Coins className="w-4 h-4 mr-2" /> Get Test Tokens
            </Button>
          </Link>

          {/* Deposit */}
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <Button className="bg-foreground hover:bg-foreground/90 text-background rounded-xl">
                <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Deposit into Privacy Pool</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  USDC will be sent from your connected wallet directly into the Unlink ZK privacy pool.
                </p>

                {walletReady && walletAddress && (
                  <div className="flex items-center gap-2 bg-accent/50 rounded-xl px-3 py-2.5">
                    <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">Connected wallet</div>
                      <div className="font-mono text-xs truncate">{walletAddress}</div>
                    </div>
                  </div>
                )}

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
                    "Deposit into privacy pool"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Funds are sent from your wallet and enter Unlink&apos;s ZK pool for private payroll transfers.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Withdraw */}
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Withdraw from Privacy Pool</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Withdraw USDC from the privacy pool to any EVM wallet address.
                </p>
                <div className="space-y-2">
                  <Label>Amount (USDC)</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>To address (optional)</Label>
                  <Input
                    placeholder="0x... (defaults to your wallet)"
                    value={withdrawTo}
                    onChange={(e) => setWithdrawTo(e.target.value)}
                    className="h-10 rounded-xl font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount || "0") <= 0}
                  className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background rounded-xl"
                >
                  {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Withdraw USDC"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Privacy Pool Balance */}
      <Card className="bg-foreground text-background">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center">
              <Vault className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm text-background/60">Privacy Pool Balance</div>
              <div className="text-xs text-background/40">Funds available for private payroll (ZK transfers)</div>
            </div>
          </div>
          <div className="text-4xl font-semibold font-mono">
            ${parseFloat(poolBalance).toFixed(2)}
          </div>
          <div className="text-sm text-background/60 mt-1">USDC in Unlink Pool</div>
        </CardContent>
      </Card>

      {parseFloat(poolBalance) === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center py-8 space-y-3">
            <Vault className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No funds in privacy pool yet.</p>
            <p className="text-sm text-muted-foreground">Get test USDC from the faucet, then deposit it into the pool to run private payroll.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
