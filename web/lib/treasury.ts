import { createPublicClient, createWalletClient, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { TREASURY_FACTORY_ADDRESS, TREASURY_FACTORY_ABI } from "./contracts";

const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

/// Deploy a new treasury contract for an org via the factory
/// Uses the deployer private key from env to call createTreasury
export async function deployTreasury(orgId: string, adminAddresses: string[]) {
  const deployerKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY) as `0x${string}`;
  const account = privateKeyToAccount(deployerKey);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // Deterministic salt from orgId
  const salt = keccak256(toBytes(orgId));

  // Include deployer as admin so backend can execute payroll withdrawals
  const allAdmins = [...new Set([...adminAddresses, account.address])];
  console.log("Deploying treasury with salt:", salt, "admins:", allAdmins);

  // Deploy via factory
  const hash = await walletClient.writeContract({
    address: TREASURY_FACTORY_ADDRESS as `0x${string}`,
    abi: TREASURY_FACTORY_ABI,
    functionName: "createTreasury",
    args: [salt, allAdmins as `0x${string}`[]],
  });

  console.log("Treasury deploy tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Treasury deploy receipt status:", receipt.status);

  if (receipt.status === "reverted") {
    throw new Error("Treasury deployment transaction reverted");
  }

  // Parse the TreasuryCreated event from logs to get the address directly
  let treasuryAddress: string | null = null;

  for (const log of receipt.logs) {
    // TreasuryCreated event: topic[2] is the indexed treasury address
    if (log.address.toLowerCase() === TREASURY_FACTORY_ADDRESS.toLowerCase() && log.topics.length >= 3) {
      treasuryAddress = "0x" + log.topics[2]!.slice(26); // extract address from 32-byte topic
      break;
    }
  }

  // Fallback: read from mapping
  if (!treasuryAddress || treasuryAddress === "0x0000000000000000000000000000000000000000") {
    const freshClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
    const fromMapping = await freshClient.readContract({
      address: TREASURY_FACTORY_ADDRESS as `0x${string}`,
      abi: TREASURY_FACTORY_ABI,
      functionName: "treasuries",
      args: [salt],
    });
    treasuryAddress = fromMapping as string;
  }

  console.log("Treasury deployed at:", treasuryAddress);

  if (!treasuryAddress || treasuryAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Treasury deployment failed — got zero address");
  }

  return {
    treasuryAddress: treasuryAddress as string,
    salt,
    txHash: hash,
  };
}

/// Compute treasury address before deployment
export async function computeTreasuryAddress(orgId: string) {
  const salt = keccak256(toBytes(orgId));

  const address = await publicClient.readContract({
    address: TREASURY_FACTORY_ADDRESS as `0x${string}`,
    abi: TREASURY_FACTORY_ABI,
    functionName: "computeTreasuryAddress",
    args: [salt],
  });

  return address as string;
}

/// Read token balance from a treasury contract
export async function getTreasuryBalance(treasuryAddress: string, tokenAddress: string) {
  const balance = await publicClient.readContract({
    address: treasuryAddress as `0x${string}`,
    abi: [
      {
        inputs: [{ internalType: "address", name: "_token", type: "address" }],
        name: "tokenBalance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "tokenBalance",
    args: [tokenAddress as `0x${string}`],
  });

  return balance;
}
