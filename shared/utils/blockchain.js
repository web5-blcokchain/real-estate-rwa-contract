const { ethers } = require('ethers');
const { configManager } = require('../config');
const logger = require('./logger');
// 加载dotenv，确保环境变量在早期就被加载
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 确保环境变量已加载
function ensureEnvLoaded() {
  try {
    // 查找项目根目录的.env文件
    const possiblePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '../../../.env')
    ];
    
    for (const envPath of possiblePaths) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        logger.info(`从 ${envPath} 加载了环境变量`);
        return true;
      }
    }
    
    logger.warn('未找到.env文件');
    return false;
  } catch (error) {
    logger.warn(`加载环境变量时出错: ${error.message}`);
    return false;
  }
}

// 初始化时确保环境变量已加载
ensureEnvLoaded();

let provider = null;
let signer = null;
let initialized = false;

/**
 * 确保区块链服务已初始化
 * @throws {Error} 如果初始化失败则抛出错误
 */
async function ensureInitialized() {
  if (!initialized) {
    await initializeBlockchain();
  }
}

/**
 * 初始化区块链连接
 */
async function initializeBlockchain() {
  if (initialized) {
    logger.info('Blockchain already initialized');
    return;
  }
  
  try {
    logger.info('Starting blockchain initialization...');
    
    // 确保配置管理器已初始化
    if (!configManager.isInitialized()) {
      logger.info('Initializing configuration manager...');
      await configManager.initialize();
    }

    // 获取网络配置
    const networkConfig = configManager.getNetworkConfig();
    const networkName = configManager.getNetworkEnv();
    
    if (!networkConfig || !networkConfig.rpcUrl) {
      throw new Error('Invalid network configuration: RPC URL is missing');
    }
    
    // 创建provider - ethers v5
    provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
    
    try {
      // 测试连接
      const network = await provider.getNetwork();
      logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
    } catch (error) {
      // 如果是Hardhat网络但节点未运行，提供更友好的错误信息
      if (networkName === 'hardhat') {
        logger.error('Hardhat网络节点未运行，请使用以下命令启动Hardhat节点：');
        logger.error('npm run hardhat:node');
        throw new Error('Hardhat网络节点未运行。请使用 npm run hardhat:node 启动Hardhat节点。');
      } else {
        throw error;
      }
    }
    
    // 创建signer - 如果有私钥
    try {
      const privateKey = configManager.getPrivateKey('operator');
      if (privateKey) {
        signer = new ethers.Wallet(privateKey, provider);
        const signerAddress = await signer.getAddress();
        logger.info(`Initialized signer with address: ${signerAddress}`);
      } else {
        logger.warn('Operator private key not found, running in read-only mode');
      }
    } catch (error) {
      logger.warn(`Failed to initialize signer: ${error.message}. Running in read-only mode.`);
    }
    
    initialized = true;
    logger.info('Blockchain connection initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize blockchain connection:', error);
    throw new Error(`Blockchain initialization failed: ${error.message}`);
  }
}

/**
 * 获取provider实例
 * @returns {ethers.providers.JsonRpcProvider} provider实例
 */
async function getProvider() {
  await ensureInitialized();
  return provider;
}

/**
 * 获取signer实例
 * @returns {ethers.Wallet|null} signer实例，如果未初始化则返回null
 */
async function getSigner() {
  await ensureInitialized();
  if (!signer) {
    logger.warn('Signer not available, running in read-only mode');
  }
  return signer;
}

/**
 * 重置区块链连接
 * 用于测试或在网络配置变更后重新初始化
 */
function resetBlockchain() {
  provider = null;
  signer = null;
  initialized = false;
  logger.info('Blockchain connection reset');
}

module.exports = {
  initializeBlockchain,
  getProvider,
  getSigner,
  ensureInitialized,
  resetBlockchain
}; 