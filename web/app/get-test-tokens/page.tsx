"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Coins, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { USDC_ADDRESS } from "@/lib/contracts";

export default function GetTestTokensPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pt-12">
        <a
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> Back to dashboard
        </a>

        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Get Test USDC</h1>
          <p className="text-muted-foreground">
            Get USDC on Base Sepolia to use with Warden&apos;s privacy pool
          </p>
        </div>

        {/* Your wallet */}
        {user?.evmAddress && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-2">Your wallet address</div>
              <div
                className="flex items-center gap-2 bg-accent/50 rounded-xl px-4 py-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => copyAddress(user.evmAddress!)}
              >
                <span className="font-mono text-sm flex-1 break-all select-all">{user.evmAddress}</span>
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <Copy className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Get USDC from faucet */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">1</div>
              Get USDC from a faucet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use the Circle USDC faucet to get free test USDC on Base Sepolia.
            </p>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full rounded-xl">
                Circle USDC Faucet <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </a>
            <p className="text-xs text-muted-foreground">
              Select &quot;Base Sepolia&quot; and paste your wallet address above.
            </p>
          </CardContent>
        </Card>

        {/* Step 2: Deposit into privacy pool */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">2</div>
              Deposit into privacy pool
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Once you have USDC, go to Treasury and deposit it into the Unlink privacy pool. This is where funds are held for private payroll.
            </p>
            <a href="/dashboard/treasury">
              <Button className="w-full bg-foreground hover:bg-foreground/90 text-background rounded-xl">
                Go to Treasury
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="text-sm font-medium">Token info</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Token: USDC (USD Coin)</div>
              <div>Network: Base Sepolia</div>
              <div className="font-mono break-all">Address: {USDC_ADDRESS}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
