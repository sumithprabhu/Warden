const hre = require("hardhat");

async function main() {
  const Factory = await hre.ethers.getContractFactory("TreasuryFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("TreasuryFactory deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
