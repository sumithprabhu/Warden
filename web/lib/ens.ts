import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ENS_RPC_URL || "https://eth.llamarpc.com"),
});

export async function resolveENS(name: string): Promise<string | null> {
  try {
    const address = await ensClient.getEnsAddress({ name: normalize(name) });
    return address;
  } catch {
    return null;
  }
}

export function isENSName(value: string): boolean {
  return value.endsWith(".eth");
}
