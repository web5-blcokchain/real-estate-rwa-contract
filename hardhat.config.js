require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-verify');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

// Import ethers directly for global usage
const ethers = require('ethers');
// Make ethers accessible globally
global.ethers = ethers;
// Make getAddress accessible globally for compatibility
global.getAddress = ethers.getAddress;

// 从环境变量中获取配置
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

// 获取各网络配置
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/your-api-key';
const MAINNET_CHAIN_ID = parseInt(process.env.MAINNET_CHAIN_ID || '1');
const MAINNET_GAS_PRICE = parseInt(process.env.MAINNET_GAS_PRICE || '30000000000');

const TESTNET_RPC_URL = process.env.TESTNET_RPC_URL || 'https://sepolia.infura.io/v3/your-api-key';
const TESTNET_CHAIN_ID = parseInt(process.env.TESTNET_CHAIN_ID || '11155111');
const TESTNET_GAS_PRICE = parseInt(process.env.TESTNET_GAS_PRICE || '10000000000');

const LOCAL_RPC_URL = process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545';
const LOCAL_CHAIN_ID = parseInt(process.env.LOCAL_CHAIN_ID || '31337');
const LOCAL_GAS_PRICE = parseInt(process.env.LOCAL_GAS_PRICE || '50000000000');

// 如果没有有效的私钥，输出警告
if (DEPLOYER_PRIVATE_KEY === '0000000000000000000000000000000000000000000000000000000000000000') {
  console.warn('警告: 使用默认私钥，请设置有效的私钥');
}

module.exports = {
  solidity: {
    version: '0.8.22',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      },
      viaIR: true,
      debug: {
        revertStrings: 'strip'  // 减少 revert 字符串的大小
      }
    }
  },
  networks: {
    hardhat: {
      chainId: LOCAL_CHAIN_ID,
      gasPrice: LOCAL_GAS_PRICE,
      allowUnlimitedContractSize: true,
      gas: 30000000,
      blockGasLimit: 30000000
    },
    localhost: {
      url: LOCAL_RPC_URL,
      chainId: LOCAL_CHAIN_ID,
      gasPrice: LOCAL_GAS_PRICE,
      allowUnlimitedContractSize: true,
      gas: 30000000,
      blockGasLimit: 100000000
    },
    mainnet: {
      url: MAINNET_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: MAINNET_CHAIN_ID,
      gasPrice: MAINNET_GAS_PRICE
    },
    testnet: {
      url: TESTNET_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: TESTNET_CHAIN_ID,
      gasPrice: TESTNET_GAS_PRICE
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  mocha: {
    timeout: 40000
  }
};