require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: "0.8.24",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [
        "cf61b33f6fc6a965d302f8d50fc81dea5bc20c466a338ae29f8b27c56d3f45b6",
      ],
    },
  },
};
