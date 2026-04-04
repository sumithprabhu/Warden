"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  LayoutDashboard,
  Users,
  FolderOpen,
  Banknote,
  Vault,
  CalendarClock,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
  Coins,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const adminNav = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Employees", href: "/dashboard/employees", icon: Users },
  { name: "Departments", href: "/dashboard/departments", icon: FolderOpen },
  { name: "Payroll", href: "/dashboard/payroll", icon: Banknote },
  { name: "Treasury", href: "/dashboard/treasury", icon: Vault },
  { name: "Earn", href: "/dashboard/earn", icon: TrendingUp },
  { name: "Vesting", href: "/dashboard/vesting", icon: CalendarClock },
  { name: "Logs", href: "/dashboard/logs", icon: ScrollText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, authenticated, onboarded, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!authenticated) {
        router.replace("/login");
      } else if (!onboarded) {
        router.replace("/onboard");
      } else if (user?.role !== "ADMIN") {
        router.replace("/portal");
      }
    }
  }, [loading, authenticated, onboarded, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-xl border-b border-border z-40 flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display text-lg">Warden</span>
        <div className="w-9" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-background border-r border-border p-4 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <span className="font-display text-xl">Warden</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent pathname={pathname} onNavigate={() => setSidebarOpen(false)} onLogout={logout} orgName={user.organization?.name} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 border-r border-border bg-background flex-col p-4">
        <div className="mb-8">
          <span className="font-display text-xl">Warden</span>
          {user.organization?.name && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{user.organization.name}</p>
          )}
        </div>
        <SidebarContent pathname={pathname} onLogout={logout} orgName={user.organization?.name} />
      </aside>

      {/* Main content */}
      <main className="lg:pl-60 pt-14 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  orgName?: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-1">
        {adminNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="pt-4 border-t border-border space-y-1">
        <Link
          href="/get-test-tokens"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Coins className="w-4 h-4" />
          Get Test Tokens
        </Link>
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </>
  );
}
