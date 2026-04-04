"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback } from "react";
import { createWalletClient, createPublicClient, custom, http } from "viem";
import { baseSepolia } from "viem/chains";

/**
 * Returns the Privy embedded wallet for the current user.
 * For email/social login: uses the embedded wallet (no popup).
 * For external wallet login: uses that wallet.
 *
 * Filters out injected wallets (MetaMask, Phantom, etc.)
 * that are just browser extensions, not the user's login wallet.
 */
export function usePrivyWallet() {
  const { user, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  // Get the embedded wallet address from the Privy user object
  // This is the wallet Privy created for email/social login users
  const embeddedAddress = user?.wallet?.address;

  const getProvider = useCallback(async () => {
    if (!walletsReady || wallets.length === 0) {
      throw new Error("No wallet available. Please log in.");
    }

    // Strategy: find the wallet that matches the Privy user's embedded wallet
    // This avoids picking up MetaMask/Phantom/other injected wallets
    let wallet;

    if (embeddedAddress) {
      // User has an embedded wallet — find it by address match
      wallet = wallets.find(
        (w) => w.address.toLowerCase() === embeddedAddress.toLowerCase()
      );
    }

    // If no embedded wallet found (user logged in with external wallet),
    // use the linked wallet from Privy user
    if (!wallet) {
      const linkedAddresses = user?.linkedAccounts
        ?.filter((a: any) => a.type === "wallet")
        ?.map((a: any) => a.address?.toLowerCase()) || [];

      wallet = wallets.find(
        (w) => linkedAddresses.includes(w.address.toLowerCase())
      );
    }

    // Last resort fallback
    if (!wallet) {
      wallet = wallets.find((w) => w.connectorType === "embedded") || wallets[0];
    }

    if (!wallet) {
      throw new Error("No wallet available.");
    }

    await wallet.switchChain(84532); // Base Sepolia
    const provider = await wallet.getEthereumProvider();

    return {
      provider,
      address: wallet.address as `0x${string}`,
      walletClient: createWalletClient({
        account: wallet.address as `0x${string}`,
        chain: baseSepolia,
        transport: custom(provider),
      }),
      publicClient: createPublicClient({
        chain: baseSepolia,
        transport: http("https://sepolia.base.org"),
      }),
    };
  }, [wallets, walletsReady, embeddedAddress, user]);

  return {
    address: embeddedAddress || null,
    ready: ready && walletsReady,
    getProvider,
  };
}
