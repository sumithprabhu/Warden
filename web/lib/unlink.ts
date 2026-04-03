import { createUnlink, unlinkAccount, unlinkEvm } from "@unlink-xyz/sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const ENGINE_URL = "https://staging-api.unlink.xyz";

export function createUnlinkClient(mnemonic: string) {
  const evmAccount = privateKeyToAccount(
    process.env.EVM_PRIVATE_KEY as `0x${string}`,
  );

  const walletClient = createWalletClient({
    account: evmAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  return createUnlink({
    engineUrl: ENGINE_URL,
    apiKey: process.env.UNLINK_API_KEY!,
    account: unlinkAccount.fromMnemonic({ mnemonic }),
    evm: unlinkEvm.fromViem({ walletClient, publicClient }),
  });
}

export { createPublicClient, http } from "viem";
export { baseSepolia } from "viem/chains";
