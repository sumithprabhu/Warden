"use client";

import { ArrowRight, Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For small teams getting started",
    price: { monthly: 0, annual: 0 },
    features: [
      "Up to 5 employees",
      "Monthly payroll runs",
      "Employee self-serve portal",
      "Basic treasury management",
      "Email notifications",
    ],
    cta: "Start free",
    popular: false,
  },
  {
    name: "Team",
    description: "For growing crypto-native teams",
    price: { monthly: 0, annual: 0 },
    features: [
      "Unlimited employees",
      "Weekly / biweekly / monthly",
      "Department management",
      "Yield vault (Earn)",
      "Vesting schedules",
      "Burner wallet DeFi",
      "Audit trail",
    ],
    cta: "Start free",
    popular: true,
  },
  {
    name: "DAO",
    description: "For decentralized organizations",
    price: { monthly: 0, annual: 0 },
    features: [
      "Everything in Team",
      "Multi-sig approval flow",
      "Custom approver lists",
      "Governance integration",
      "Budget forecasting",
      "Priority support",
      "Custom token support",
      "Audit trail export",
    ],
    cta: "Start free",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-32 lg:py-40 border-t border-foreground/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mb-20">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-6">
            Pricing
          </span>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight text-foreground mb-6">
            Simple, transparent
            <br />
            <span className="text-stroke">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            Everything is free while we&apos;re on testnet. Try the full platform with no limits.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 border border-foreground/20 text-xs font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live on Base Sepolia testnet
          </div>
        </div>

        <div className="mb-16" />

        <div className="grid md:grid-cols-3 gap-px bg-foreground/10">
          {plans.map((plan, idx) => (
            <div
              key={plan.name}
              className={`relative p-8 lg:p-12 bg-background ${
                plan.popular ? "md:-my-4 md:py-12 lg:py-16 border-2 border-foreground" : ""
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-8 px-3 py-1 bg-foreground text-primary-foreground text-xs font-mono uppercase tracking-widest">
                  Most Popular
                </span>
              )}

              <div className="mb-8">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-3xl text-foreground mt-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <div className="mb-8 pb-8 border-b border-foreground/10">
                <span className="font-display text-5xl lg:text-6xl text-foreground">Free</span>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all group ${
                  plan.popular
                    ? "bg-foreground text-primary-foreground hover:bg-foreground/90"
                    : "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          All plans include ZK-proof privacy, Base L2 settlement, and employee self-serve portal. Currently live on testnet &mdash; all features are free.
        </p>
      </div>
    </section>
  );
}
