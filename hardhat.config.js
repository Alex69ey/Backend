require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { INFURA_PROJECT_ID, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

console.log("INFURA_PROJECT_ID:", INFURA_PROJECT_ID);
console.log("PRIVATE_KEY:", PRIVATE_KEY ? "Loaded" : "Missing");
console.log("ETHERSCAN_API_KEY:", ETHERSCAN_API_KEY ? "Loaded" : "Missing");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY.replace(/^0x/, "")}`] : [],
      chainId: 11155111,
      timeout: 60000,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};