const hre = require("hardhat");

async function main() {
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();

  const address = await usdc.getAddress();
  console.log("MockUSDC deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
