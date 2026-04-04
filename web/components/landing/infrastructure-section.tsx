"use client";

import { useEffect, useState, useRef } from "react";

const payrollFlow = [
  { step: "Treasury Deposit", detail: "USDC enters privacy pool", status: "complete" },
  { step: "Employee Registry", detail: "Unlink accounts generated", status: "complete" },
  { step: "Salary Mapping", detail: "Amounts set per employee", status: "complete" },
  { step: "ZK Proof Generation", detail: "Proof of valid disbursement", status: "active" },
  { step: "Multi-Recipient Transfer", detail: "Single batch transaction", status: "pending" },
  { step: "Settlement", detail: "All balances updated privately", status: "pending" },
];

export function InfrastructureSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % payrollFlow.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Content */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              [Infrastructure]
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              Private by
              <br />
              design.
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">
              Built on Unlink&apos;s zero-knowledge protocol on Base. Every payroll transaction
              is shielded — amounts, recipients, and frequencies are cryptographically hidden.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">ZK</div>
                <div className="text-sm text-muted-foreground">Proof system</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">Base</div>
                <div className="text-sm text-muted-foreground">L2 network</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">0</div>
                <div className="text-sm text-muted-foreground">Data leaked</div>
              </div>
            </div>
          </div>

          {/* Right: Payroll flow */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="border border-foreground/10">
              <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">Payroll Pipeline</span>
                <span className="flex items-center gap-2 text-xs font-mono text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Processing
                </span>
              </div>

              <div>
                {payrollFlow.map((item, index) => (
                  <div
                    key={item.step}
                    className={`px-6 py-5 border-b border-foreground/5 last:border-b-0 flex items-center justify-between transition-all duration-300 ${
                      activeStep === index ? "bg-foreground/[0.02]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          index < activeStep ? "bg-green-500" :
                          activeStep === index ? "bg-foreground animate-pulse" : "bg-foreground/20"
                        }`}
                      />
                      <div>
                        <div className="font-medium">{item.step}</div>
                        <div className="text-sm text-muted-foreground">{item.detail}</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {index < activeStep ? "done" : index === activeStep ? "running" : "queued"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
