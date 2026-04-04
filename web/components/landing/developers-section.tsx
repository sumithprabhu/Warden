"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";

const codeExamples = [
  {
    label: "Deposit",
    code: `import { createUnlink } from '@unlink-xyz/sdk'

const unlink = createUnlink({
  engineUrl: 'https://staging-api.unlink.xyz',
  apiKey: process.env.UNLINK_API_KEY,
  account: unlinkAccount.fromMnemonic({
    mnemonic: userMnemonic
  })
})

await unlink.deposit({
  token: USDC_ADDRESS,
  amount: '50000000000'
})`,
  },
  {
    label: "Payroll",
    code: `// Pay entire team in one transaction
const result = await unlink.transfer({
  token: USDC_ADDRESS,
  transfers: [
    { recipientAddress: 'unlink1alice...', amount: '5000' },
    { recipientAddress: 'unlink1bob...', amount: '6000' },
    { recipientAddress: 'unlink1carol...', amount: '5500' },
  ]
})

// On-chain: nothing visible
await unlink.pollTransactionStatus(result.txId)`,
  },
  {
    label: "Withdraw",
    code: `// Employee cashes out to any wallet
await unlink.withdraw({
  recipientEvmAddress: '0xAlice...',
  token: USDC_ADDRESS,
  amount: '5000000000'
})

// Or withdraw to an ENS name
await unlink.withdraw({
  recipientEvmAddress: 'alice.eth',
  token: USDC_ADDRESS,
  amount: '5000000000'
})`,
  },
];

const features = [
  {
    title: "TypeScript SDK",
    description: "Full type safety with Unlink + viem."
  },
  {
    title: "Multi-recipient",
    description: "Batch payments in a single ZK proof."
  },
  {
    title: "ENS support",
    description: "Pay alice.eth, not 0x1234..."
  },
  {
    title: "Base Sepolia",
    description: "Live testnet with faucet tokens."
  },
];

const codeAnimationStyles = `
  .dev-code-line {
    opacity: 0;
    transform: translateX(-8px);
    animation: devLineReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes devLineReveal {
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .dev-code-char {
    opacity: 0;
    filter: blur(8px);
    animation: devCharReveal 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes devCharReveal {
    to {
      opacity: 1;
      filter: blur(0);
    }
  }
`;

export function DevelopersSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <section id="developers" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: codeAnimationStyles }} />
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              [Under the hood]
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              Powered by Unlink.
              <br />
              <span className="text-muted-foreground">Built on Base.</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              Warden uses Unlink&apos;s zero-knowledge privacy pool to shield every payment.
              The SDK handles ZK proof generation, multi-recipient transfers, and settlement.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 50 + 200}ms` }}
                >
                  <h3 className="font-medium mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`lg:sticky lg:top-32 transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="border border-foreground/10">
              <div className="flex items-center border-b border-foreground/10">
                {codeExamples.map((example, idx) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-6 py-4 text-sm font-mono transition-colors relative ${
                      activeTab === idx
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {example.label}
                    {activeTab === idx && (
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
                    )}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-4 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="p-8 font-mono text-sm bg-foreground/[0.01] min-h-[280px]">
                <pre className="text-foreground/80">
                  {codeExamples[activeTab].code.split('\n').map((line, lineIndex) => (
                    <div
                      key={`${activeTab}-${lineIndex}`}
                      className="leading-loose dev-code-line"
                      style={{ animationDelay: `${lineIndex * 80}ms` }}
                    >
                      <span className="inline-flex">
                        {line.split('').map((char, charIndex) => (
                          <span
                            key={`${activeTab}-${lineIndex}-${charIndex}`}
                            className="dev-code-char"
                            style={{
                              animationDelay: `${lineIndex * 80 + charIndex * 15}ms`,
                            }}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-6 text-sm">
              <a href="https://docs.unlink.xyz" className="text-foreground hover:underline underline-offset-4">
                Unlink docs
              </a>
              <span className="text-foreground/20">|</span>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
