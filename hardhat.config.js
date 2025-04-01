// 导入依赖
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");

// 加载环境配置
const envConfig = require("./shared/src/config/env");

// 获取账户配置
const getAccounts = () => {
  const privateKey = envConfig.get('DEPLOYER_PRIVATE_KEY');
  const formattedKey = privateKey.replace(/^0x/, '');
  if (formattedKey.length !== 64) {
    throw new Error(`Invalid private key length: ${formattedKey.length}, expected 64 characters`);
  }
  return [formattedKey];
};

// 获取基础网络配置
const getBaseConfig = () => ({
  accounts: getAccounts(),
  gas: "auto",
  gasPrice: "auto"
});

// 获取特定网络配置
const getNetworkConfig = (network) => {
  const baseConfig = getBaseConfig();

  switch (network) {
    case 'hardhat':
      return {
        chainId: envConfig.getInt('HARDHAT_CHAIN_ID', 31337),
        blockGasLimit: 30000000,
        allowUnlimitedContractSize: true,
        loggingEnabled: false,
        // 为 hardhat 网络使用默认账户
        accounts: {
          mnemonic: "test test test test test test test test test test test junk",
          path: "m/44'/60'/0'/0",
          initialIndex: 0,
          count: 20,
          accountsBalance: "10000000000000000000000"
        }
      };
    case 'localhost':
      return {
        ...baseConfig,
        url: "http://127.0.0.1:8545",
        chainId: envConfig.getInt('HARDHAT_CHAIN_ID', 31337),
        blockGasLimit: 30000000,
        allowUnlimitedContractSize: true,
        loggingEnabled: false,
      };
    case 'testnet':
      return {
        ...baseConfig,
        url: envConfig.get('TESTNET_RPC_URL'),
        chainId: envConfig.getInt('TESTNET_CHAIN_ID')
      };
    case 'mainnet':
      return {
        ...baseConfig,
        url: envConfig.get('MAINNET_RPC_URL'),
        chainId: envConfig.getInt('MAINNET_CHAIN_ID')
      };
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};

// Hardhat 配置
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // Solidity 编译器配置
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 50,
      },
      viaIR: true,
      evmVersion: "paris",
      metadata: {
        bytecodeHash: "none"
      },
    },
  },

  // 网络配置
  networks: {
    hardhat: getNetworkConfig('hardhat'),
    localhost: getNetworkConfig('localhost'),
    testnet: getNetworkConfig('testnet'),
    mainnet: getNetworkConfig('mainnet')
  },

  // Gas 报告配置
  gasReporter: {
    enabled: envConfig.getBoolean('REPORT_GAS'),
    currency: "USD",
  },

  // 路径配置
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
    deployments: "./deployments",
  },

  // Mocha 测试配置
  mocha: {
    timeout: 40000,
  },
};