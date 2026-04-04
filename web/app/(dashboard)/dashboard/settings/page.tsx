"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Plus, X, Search, Coins, Copy, CheckCircle2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { usePrivyWallet } from "@/hooks/use-privy-wallet";

export default function SettingsPage() {
  const { getAccessToken, user } = useAuth();
  const { address: walletAddress, ready: walletReady } = usePrivyWallet();
  const [copied, setCopied] = useState(false);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [newApprover, setNewApprover] = useState("");
  const [approvers, setApprovers] = useState<Array<{ evmAddress?: string; ensName?: string }>>([]);

  // Token management
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const load = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await api.org.get(token);
      setOrg(res);
      setName(res.name || "");
      setLogo(res.logo || "");
      setApprovers(res.approvers || []);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [getAccessToken]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.org.update(token, {
        name: name.trim(),
        logo: logo.trim() || undefined,
        approvers,
      });
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddToken = async () => {
    if (!newTokenAddress.trim() || !newTokenAddress.startsWith("0x")) {
      toast.error("Enter a valid token address");
      return;
    }

    setLookingUp(true);
    try {
      const tokenInfo = await api.token.lookup(newTokenAddress.trim());
      const authToken = await getAccessToken();
      if (!authToken) return;

      await api.org.update(authToken, { addToken: tokenInfo });
      toast.success(`${tokenInfo.symbol} added!`);
      setNewTokenAddress("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to add token");
    } finally {
      setLookingUp(false);
    }
  };

  const handleRemoveToken = async (address: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.org.update(token, { removeTokenAddress: address });
      toast.success("Token removed");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove token");
    }
  };

  const addApprover = () => {
    if (!newApprover.trim()) return;
    const isEns = newApprover.includes(".");
    setApprovers([
      ...approvers,
      isEns ? { ensName: newApprover.trim() } : { evmAddress: newApprover.trim() },
    ]);
    setNewApprover("");
  };

  const removeApprover = (index: number) => {
    setApprovers(approvers.filter((_, i) => i !== index));
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
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization</p>
      </div>

      {/* Connected Wallet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Connected Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          {walletReady && walletAddress ? (
            <div
              className="flex items-center gap-2 bg-accent/50 rounded-xl px-3 py-3 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(walletAddress);
                setCopied(true);
                toast.success("Address copied!");
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <span className="font-mono text-sm flex-1 break-all select-all">{walletAddress}</span>
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet connected</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-xl max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://..."
              className="h-10 rounded-xl max-w-md"
            />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="text-sm text-muted-foreground">
              Type: <Badge variant="secondary">{org?.orgType || "TEAM"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tokens your organization uses for payroll.
          </p>

          {org?.tokens?.length > 0 && (
            <div className="space-y-2">
              {org.tokens.map((t: any) => (
                <div key={t.address} className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2.5">
                  <Coins className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs">{t.symbol}</Badge>
                  <span className="text-sm flex-1">{t.name}</span>
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-40">
                    {t.address}
                  </span>
                  {org.tokens.length > 1 && (
                    <button
                      onClick={() => handleRemoveToken(t.address)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newTokenAddress}
              onChange={(e) => setNewTokenAddress(e.target.value)}
              placeholder="0x... token contract address"
              className="h-10 rounded-xl font-mono text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAddToken()}
            />
            <Button
              onClick={handleAddToken}
              disabled={lookingUp || !newTokenAddress.trim()}
              className="rounded-xl h-10"
            >
              {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Users with admin access to this organization.
          </p>
          {org?.admins?.length > 0 && (
            <div className="space-y-2">
              {org.admins.map((admin: any) => (
                <div key={admin._id || admin} className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-medium">
                    {admin.name || admin.email || admin.evmAddress || admin}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            To add more admins, invite users and promote them from the employees page.
          </p>
        </CardContent>
      </Card>

      {org?.orgType === "DAO" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DAO Approvers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Wallet addresses or ENS names that can approve payroll runs.
            </p>

            {approvers.length > 0 && (
              <div className="space-y-2">
                {approvers.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2">
                    <span className="text-sm font-mono flex-1 truncate">
                      {a.ensName || a.evmAddress}
                    </span>
                    <button onClick={() => removeApprover(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newApprover}
                onChange={(e) => setNewApprover(e.target.value)}
                placeholder="0x... or name.eth"
                className="h-10 rounded-xl font-mono text-sm"
                onKeyDown={(e) => e.key === "Enter" && addApprover()}
              />
              <Button
                variant="outline"
                onClick={addApprover}
                className="rounded-xl"
                disabled={!newApprover.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-foreground hover:bg-foreground/90 text-background rounded-xl"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
