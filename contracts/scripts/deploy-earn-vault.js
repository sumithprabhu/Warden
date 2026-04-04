import hre from "hardhat";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  const EarnVault = await hre.ethers.getContractFactory("EarnVault");
  const vault = await EarnVault.deploy(USDC_BASE_SEPOLIA);
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("EarnVault deployed to:", address);
  console.log("USDC address:", USDC_BASE_SEPOLIA);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
