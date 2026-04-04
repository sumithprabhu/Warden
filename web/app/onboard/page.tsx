"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { USDC_ADDRESS } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, User, ArrowRight, ArrowLeft, Shield, Plus, X, Search } from "lucide-react";
import { toast } from "sonner";

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

const DEFAULT_TOKEN: TokenInfo = {
  address: USDC_ADDRESS,
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
};

export default function OnboardPage() {
  const { ready, authenticated, loading, onboarded, user, login, getAccessToken, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [step, setStep] = useState<"choose" | "admin-form" | "employee-form">(
    inviteToken ? "employee-form" : "choose"
  );
  const [submitting, setSubmitting] = useState(false);

  // Admin form
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"TEAM" | "DAO">("TEAM");
  const [tokens, setTokens] = useState<TokenInfo[]>([DEFAULT_TOKEN]);
  const [showAddToken, setShowAddToken] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  // Employee form
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    if (!loading && authenticated && onboarded && user) {
      router.replace(user.role === "ADMIN" ? "/dashboard" : "/portal");
    }
  }, [loading, authenticated, onboarded, user, router]);

  const loginTriggered = useRef(false);
  useEffect(() => {
    if (!loading && !authenticated && !loginTriggered.current) {
      loginTriggered.current = true;
      login();
    }
  }, [loading, authenticated, login]);

  const handleLookupToken = async () => {
    if (!customTokenAddress.trim() || !customTokenAddress.startsWith("0x")) {
      toast.error("Enter a valid token address starting with 0x");
      return;
    }
    if (tokens.some((t) => t.address.toLowerCase() === customTokenAddress.toLowerCase())) {
      toast.error("Token already added");
      return;
    }

    setLookingUp(true);
    try {
      const info = await api.token.lookup(customTokenAddress.trim());
      setTokens([...tokens, info]);
      setCustomTokenAddress("");
      setShowAddToken(false);
      toast.success(`${info.symbol} added!`);
    } catch (err: any) {
      toast.error(err.message || "Could not fetch token details");
    } finally {
      setLookingUp(false);
    }
  };

  const removeToken = (address: string) => {
    if (tokens.length <= 1) {
      toast.error("At least one token is required");
      return;
    }
    setTokens(tokens.filter((t) => t.address !== address));
  };

  const handleAdminOnboard = async () => {
    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      await api.auth.onboard(token, {
        type: "admin",
        name: name.trim(),
        orgName: orgName.trim(),
        orgType,
        tokens,
      });

      toast.success("Organization created successfully!");
      await refresh();
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Onboarding failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeOnboard = async () => {
    if (!inviteToken) {
      toast.error("No invite token found");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      await api.auth.onboard(token, {
        type: "employee",
        inviteToken,
        name: employeeName.trim(),
      });

      toast.success("Account created successfully!");
      await refresh();
      router.push("/portal");
    } catch (err: any) {
      toast.error(err.message || "Onboarding failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background flex-col justify-between p-12">
        <div>
          <a href="/" className="text-2xl font-display tracking-tight">Warden</a>
        </div>
        <div className="space-y-6">
          <h1 className="text-5xl font-display leading-tight">
            Get started in
            <br />
            under a minute.
          </h1>
          <p className="text-background/60 text-lg max-w-md">
            Set up your organization, add your team, and run your first private payroll — all in a few clicks.
          </p>
        </div>
        <div className="flex items-center gap-3 text-background/40 text-sm">
          <Shield className="w-4 h-4" />
          <span>Your data is encrypted end-to-end</span>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden mb-8">
            <a href="/" className="text-2xl font-display tracking-tight">Warden</a>
          </div>

          {/* Choose type */}
          {step === "choose" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">How will you use Warden?</h2>
                <p className="text-muted-foreground">Choose your role to get started</p>
              </div>

              <div className="grid gap-4">
                <button
                  onClick={() => setStep("admin-form")}
                  className="flex items-center gap-4 p-5 rounded-xl border border-border hover:border-foreground/30 hover:bg-accent/50 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">I&apos;m an employer</div>
                    <div className="text-sm text-muted-foreground">Set up your org and run payroll</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <button
                  onClick={() => {
                    if (!inviteToken) {
                      toast.error("You need an invite link from your employer to join as an employee");
                      return;
                    }
                    setStep("employee-form");
                  }}
                  className="flex items-center gap-4 p-5 rounded-xl border border-border hover:border-foreground/30 hover:bg-accent/50 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">I&apos;m an employee</div>
                    <div className="text-sm text-muted-foreground">Accept your invite and get paid</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="/login" className="text-foreground underline underline-offset-4 hover:no-underline">
                  Sign in
                </a>
              </p>
            </div>
          )}

          {/* Admin form */}
          {step === "admin-form" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <button
                  onClick={() => setStep("choose")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <h2 className="text-2xl font-semibold tracking-tight">Set up your organization</h2>
                <p className="text-muted-foreground">Tell us about your team or DAO</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input
                    id="orgName"
                    placeholder="Acme Corp"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Organization type</Label>
                  <Select value={orgType} onValueChange={(v) => setOrgType(v as "TEAM" | "DAO")}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEAM">Team / Startup</SelectItem>
                      <SelectItem value="DAO">DAO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tokens */}
                <div className="space-y-3">
                  <Label>Payment tokens</Label>
                  <div className="space-y-2">
                    {tokens.map((t) => (
                      <div
                        key={t.address}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/50 text-sm"
                      >
                        <Badge variant="secondary" className="text-xs">{t.symbol}</Badge>
                        <span className="flex-1 truncate text-muted-foreground font-mono text-xs">
                          {t.address}
                        </span>
                        {tokens.length > 1 && (
                          <button
                            onClick={() => removeToken(t.address)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {showAddToken ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="0x... token address"
                        value={customTokenAddress}
                        onChange={(e) => setCustomTokenAddress(e.target.value)}
                        className="h-10 rounded-xl font-mono text-sm flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleLookupToken()}
                      />
                      <Button
                        size="sm"
                        onClick={handleLookupToken}
                        disabled={lookingUp}
                        className="rounded-xl h-10 px-3"
                      >
                        {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setShowAddToken(false); setCustomTokenAddress(""); }}
                        className="rounded-xl h-10 px-3"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddToken(true)}
                      className="rounded-xl text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add token
                    </Button>
                  )}
                </div>
              </div>

              <Button
                onClick={handleAdminOnboard}
                disabled={submitting || !orgName.trim()}
                className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-base"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create organization"
                )}
              </Button>
            </div>
          )}

          {/* Employee form */}
          {step === "employee-form" && (
            <div className="space-y-6">
              <div className="space-y-2">
                {!inviteToken && (
                  <button
                    onClick={() => setStep("choose")}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                )}
                <h2 className="text-2xl font-semibold tracking-tight">Accept your invite</h2>
                <p className="text-muted-foreground">Complete your profile to get started</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Your name</Label>
                  <Input
                    id="employeeName"
                    placeholder="Jane Doe"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <Button
                onClick={handleEmployeeOnboard}
                disabled={submitting}
                className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-base"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Join organization"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
