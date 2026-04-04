"use client";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Wallet, User } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { getAccessToken, user, refresh } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Form
  const [name, setName] = useState("");
  const [evmAddress, setEvmAddress] = useState("");
  const [ensName, setEnsName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const p = await api.me.profile(token);
        setProfile(p);
        setName(p.name || "");
        setEvmAddress(p.evmAddress || "");
        setEnsName(p.ensName || "");
        setDateOfBirth(p.dateOfBirth || "");
        setPhone(p.phone || "");
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getAccessToken]);

  const handleSave = async () => {
    if (!evmAddress.trim()) {
      toast.error("Wallet address is required to receive payments");
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await api.me.updateProfile(token, {
        name: name.trim(),
        evmAddress: evmAddress.trim(),
        ensName: ensName.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        phone: phone.trim() || undefined,
      });
      toast.success("Profile saved!");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const isFirstTime = profile && !profile.profileCompleted;

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
        <h1 className="text-2xl font-semibold tracking-tight">
          {isFirstTime ? "Complete Your Profile" : "Profile"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isFirstTime
            ? "Set up your wallet address to receive payments"
            : "Manage your personal information"
          }
        </p>
      </div>

      {isFirstTime && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <div className="font-medium text-amber-900">Wallet address required</div>
                <p className="text-sm text-amber-700 mt-1">
                  You need to add a wallet address to receive salary payments. This is the address where your funds will be sent.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="h-10 rounded-xl"
            />
          </div>

          {profile?.email && (
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/50 text-sm">
                <span>{profile.email}</span>
                <Badge variant="secondary" className="text-xs">Verified</Badge>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Phone (optional)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Date of Birth (optional)</Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Wallet Details
            {!evmAddress && <Badge variant="destructive" className="text-xs">Required</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Wallet Address *</Label>
            <Input
              value={evmAddress}
              onChange={(e) => setEvmAddress(e.target.value)}
              placeholder="0x..."
              className="h-10 rounded-xl font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This is where your salary payments will be sent. Use any EVM wallet address.
            </p>
          </div>

          <div className="space-y-2">
            <Label>ENS Name (optional)</Label>
            <Input
              value={ensName}
              onChange={(e) => setEnsName(e.target.value)}
              placeholder="yourname.eth"
              className="h-10 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !evmAddress.trim()}
          className="bg-foreground hover:bg-foreground/90 text-background rounded-xl"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {isFirstTime ? "Complete Setup" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
