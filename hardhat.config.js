// 导入依赖
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");

// 加载环境配置
const envConfig = require("./shared/src/config/env").load();

// 获取账户配置
const getAccounts = () => {
  const privateKey = envConfig.DEPLOYER_PRIVATE_KEY;
  
  // 检查私钥是否存在
  if (!privateKey) {
    console.warn('警告: 未找到DEPLOYER_PRIVATE_KEY，使用默认开发私钥替代');
    // 使用hardhat默认私钥
    return ["ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"];
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
        chainId: envConfig.HARDHAT_CHAIN_ID,
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
        url: envConfig.LOCALHOST_RPC_URL,
        chainId: envConfig.LOCALHOST_CHAIN_ID,
        blockGasLimit: 30000000,
        allowUnlimitedContractSize: true,
        loggingEnabled: false,
      };
    case 'testnet':
      return {
        ...baseConfig,
        url: envConfig.TESTNET_RPC_URL,
        chainId: envConfig.TESTNET_CHAIN_ID
      };
    case 'mainnet':
      return {
        ...baseConfig,
        url: envConfig.MAINNET_RPC_URL,
        chainId: envConfig.MAINNET_CHAIN_ID
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
  const activeNetwork = envConfig.BLOCKCHAIN_NETWORK || 'hardhat';
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
  networks: getActiveNetworks(),

  // Gas 报告配置
  gasReporter: {
    enabled: envConfig.REPORT_GAS,
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