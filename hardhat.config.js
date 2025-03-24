require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();
const { getPrivateKey } = require("./scripts/utils/secure-key");

// 从环境变量中获取配置
const PRIVATE_KEY = getPrivateKey() || "0000000000000000000000000000000000000000000000000000000000000000";
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/";
const TESTNET_RPC_URL = process.env.TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

// 如果没有有效的私钥，输出警告
if (PRIVATE_KEY === "0000000000000000000000000000000000000000000000000000000000000000") {
  console.warn("警告: 使用默认私钥，请设置有效的私钥");
}

module.exports = {
  solidity: {
    version: "0.8.19",
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
      url: MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 56,
      gasPrice: 5000000000 // 5 Gwei
    },
    bsc_testnet: {
      url: TESTNET_RPC_URL,
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