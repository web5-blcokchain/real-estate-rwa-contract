require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

// 从环境变量中获取配置
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const BSC_MAINNET_RPC = process.env.BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org/";
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    bsc_mainnet: {
      url: BSC_MAINNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 56,
      gasPrice: 5000000000 // 5 Gwei
    },
    bsc_testnet: {
      url: BSC_TESTNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 97,
      gasPrice: 10000000000 // 10 Gwei
    }
  },
  etherscan: {
    apiKey: BSCSCAN_API_KEY
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};