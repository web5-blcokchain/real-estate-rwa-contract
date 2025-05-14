// 导入依赖
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");

// 加载环境配置
require('dotenv').config();

// 获取账户配置
const getAccounts = () => {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  
  // 检查私钥是否存在
  if (!privateKey) {
    console.warn('警告: 未找到DEPLOYER_PRIVATE_KEY，使用默认开发私钥替代');
    return [""];
  }
  
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
        chainId: 31337,
        blockGasLimit: 30000000,
        allowUnlimitedContractSize: true,
        loggingEnabled: true,
        verbose: true,
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
        url: process.env.LOCALHOST_RPC_URL || 'http://127.0.0.1:8545',
        chainId: 31337,
        blockGasLimit: 30000000,
        allowUnlimitedContractSize: true,
        loggingEnabled: true,
        verbose: true,
        // 使用与 hardhat 相同的账户配置
        accounts: {
          mnemonic: "test test test test test test test test test test test junk",
          path: "m/44'/60'/0'/0",
          initialIndex: 0,
          count: 20,
          accountsBalance: "10000000000000000000000"
        }
      };
    case 'testnet':
      // 当未定义testnet URL时，返回localhost配置以避免配置错误
      if (!process.env.TESTNET_RPC_URL) {
        console.warn('警告: 未设置TESTNET_RPC_URL，testnet网络配置不完整');
        return getNetworkConfig('localhost');
      }
      return {
        ...baseConfig,
        allowUnlimitedContractSize: true,
        url: process.env.TESTNET_RPC_URL,
        chainId: parseInt(process.env.TESTNET_CHAIN_ID || '11155111'),
        loggingEnabled: true,
        verbose: true
      };
    case 'mainnet':
      // 当未定义mainnet URL时，返回localhost配置以避免配置错误
      if (!process.env.MAINNET_RPC_URL) {
        console.warn('警告: 未设置MAINNET_RPC_URL，mainnet网络配置不完整');
        return getNetworkConfig('localhost');
      }
      return {
        ...baseConfig,
        url: process.env.MAINNET_RPC_URL,
        chainId: parseInt(process.env.MAINNET_CHAIN_ID || '1'),
        loggingEnabled: true,
        verbose: true
      };
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};

// 根据当前网络类型获取激活的网络配置
const getActiveNetworks = () => {
  const networks = {
    hardhat: getNetworkConfig('hardhat'),
    localhost: getNetworkConfig('localhost'),
    testnet: getNetworkConfig('testnet'),
    mainnet: getNetworkConfig('mainnet')
  };

  // 根据 BLOCKCHAIN_NETWORK 激活对应网络
  const activeNetwork = process.env.BLOCKCHAIN_NETWORK || 'hardhat';
  if (!networks[activeNetwork]) {
    console.warn(`警告: 无效的网络类型 ${activeNetwork}，默认使用hardhat网络`);
    return networks;
  }

  return networks;
};

// Hardhat 配置
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // Solidity 编译器配置
  solidity: {
    compilers: [
      {
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
          debug: {
            revertStrings: "debug"
          }
        },
      },
      {
        version: "0.8.29",
        settings: {
          optimizer: {
            enabled: true,
            runs: 50,
          },
          evmVersion: "paris",
          metadata: {
            bytecodeHash: "none"
          },
          debug: {
            revertStrings: "debug"
          }
        },
      }
    ],
  },

  // 网络配置
  networks: getActiveNetworks(),

  // Gas 报告配置
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
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

  // 添加详细的错误报告配置
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

  // 添加详细的错误报告配置
  tenderly: {
    project: process.env.TENDERLY_PROJECT,
    username: process.env.TENDERLY_USERNAME,
  },
};