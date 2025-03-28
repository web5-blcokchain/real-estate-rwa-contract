/**
 * 配置文件
 * 用于整合环境变量和应用配置
 */
const path = require('path');
const fs = require('fs');

// 使用shared目录的环境变量加载功能
const { initializeEnvironment, getEnvVar } = require('../.././../shared/config/environment');

// 初始化环境变量
initializeEnvironment();

// 服务配置
const config = {
  // 服务器配置
  server: {
    port: getEnvVar('HTTP_SERVER_PORT', 3030),
    host: getEnvVar('HTTP_SERVER_HOST', 'localhost'),
    apiKey: getEnvVar('API_KEY', 'default-api-key'),
    nodeEnv: getEnvVar('NODE_ENV', 'development')
  },

  // 区块链配置 - 使用已有环境变量
  blockchain: {
    network: getEnvVar('DEPLOY_NETWORK', 'hardhat'),
    rpcUrl: getEnvVar('HARDHAT_RPC_URL', 'http://127.0.0.1:8545'),
    chainId: parseInt(getEnvVar('HARDHAT_CHAIN_ID', '31337'), 10),
    privateKey: getEnvVar('ADMIN_PRIVATE_KEY', '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
  },

  // 日志配置
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    directory: path.resolve(__dirname, '../../../logs')
  },

  // 合约配置
  contracts: {
    deployStateFile: path.resolve(__dirname, '../../../scripts/deploy-state.json')
  }
};

// 确保日志目录存在
if (!fs.existsSync(config.logging.directory)) {
  fs.mkdirSync(config.logging.directory, { recursive: true });
}

module.exports = config; 