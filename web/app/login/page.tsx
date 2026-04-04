"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { ready, authenticated, loading, onboarded, user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authenticated) {
      if (onboarded && user) {
        router.replace(user.role === "ADMIN" ? "/dashboard" : "/portal");
      } else if (onboarded === false) {
        router.replace("/onboard");
      }
    }
  }, [loading, authenticated, onboarded, user, router]);

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
          <a href="/" className="text-2xl font-display tracking-tight">
            Warden
          </a>
        </div>
        <div className="space-y-6">
          <h1 className="text-5xl font-display leading-tight">
            Payroll that
            <br />
            nobody can see.
          </h1>
          <p className="text-background/60 text-lg max-w-md">
            Run confidential payroll powered by zero-knowledge proofs on Base.
            No one sees who gets paid what.
          </p>
        </div>
        <div className="flex items-center gap-3 text-background/40 text-sm">
          <Shield className="w-4 h-4" />
          <span>Protected by Unlink ZK infrastructure</span>
        </div>
      </div>

      {/* Right - Auth */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden mb-8">
            <a href="/" className="text-2xl font-display tracking-tight">
              Warden
            </a>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Button
            onClick={login}
            className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-base"
          >
            Sign in
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a href="/onboard" className="text-foreground underline underline-offset-4 hover:no-underline">
              Get started
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
