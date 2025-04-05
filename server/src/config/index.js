/**
 * 服务器配置模块
 * 统一管理所有配置选项
 */
const path = require('path');
const fs = require('fs');
const envConfig = require('./env');

/**
 * 服务器配置
 */
const serverConfig = {
  // 环境变量配置
  env: envConfig,

  /**
   * 初始化配置
   */
  initialize() {
    // 确保环境变量已加载
    envConfig.initialize();
    
    // 验证配置
    this.validateConfig();
    
    return this;
  },

  /**
   * 验证配置
   */
  validateConfig() {
    try {
      // 验证项目路径设置
      if (!process.env.PROJECT_PATH) {
        throw new Error('PROJECT_PATH未设置');
      }
      
      // 验证区块链网络设置
      if (!process.env.BLOCKCHAIN_NETWORK) {
        throw new Error('BLOCKCHAIN_NETWORK未设置');
      }
      
      // 验证ABI目录
      const abiDirPath = path.resolve(process.env.PROJECT_PATH, 'config/abi');
      if (!fs.existsSync(abiDirPath)) {
        console.warn(`ABI目录不存在: ${abiDirPath}`);
      }
      
      // 验证部署文件
      const deploymentPath = path.resolve(process.env.PROJECT_PATH, 'config/deployment.json');
      if (!fs.existsSync(deploymentPath)) {
        console.warn(`部署文件不存在: ${deploymentPath}`);
      }
      
      return true;
    } catch (error) {
      console.error(`配置验证失败: ${error.message}`);
      throw error;
    }
  },

  /**
   * 获取服务器配置
   */
  getServerConfig() {
    return envConfig.getServerConfig();
  },

  /**
   * 获取API配置
   */
  getApiConfig() {
    return envConfig.getApiConfig();
  },

  /**
   * 获取区块链配置
   */
  getBlockchainConfig() {
    return envConfig.getBlockchainConfig();
  },

  /**
   * 获取日志配置
   */
  getLogConfig() {
    return envConfig.getLogConfig();
  },

  /**
   * 获取合约地址
   */
  getContractAddresses() {
    const addresses = {};
    
    // 尝试从deployment.json加载合约地址
    try {
      const deploymentPath = path.resolve(process.env.PROJECT_PATH, 'config/deployment.json');
      if (fs.existsSync(deploymentPath)) {
        const deployment = require(deploymentPath);
        if (deployment && deployment.contracts) {
          // 从部署文件中提取合约地址
          for (const [name, data] of Object.entries(deployment.contracts)) {
            if (data && data.address) {
              addresses[name] = data.address;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`无法从deployment.json加载合约地址: ${error.message}`);
    }
    
    // 从环境变量中提取合约地址（优先级更高，会覆盖部署文件中的设置）
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(/^CONTRACT_([A-Z0-9_]+)_ADDRESS$/);
      if (match) {
        const contractName = match[1];
        addresses[contractName] = value;
      }
    }
    
    return addresses;
  },

  /**
   * 获取合约ABI
   * @param {string} contractName 合约名称
   * @returns {Object|null} 合约ABI对象
   */
  getContractABI(contractName) {
    try {
      // 尝试从ABI目录加载合约ABI
      const abiPath = path.resolve(process.env.PROJECT_PATH, `config/abi/${contractName}.json`);
      if (fs.existsSync(abiPath)) {
        return require(abiPath);
      }
      
      console.warn(`找不到合约ABI文件: ${abiPath}`);
      return null;
    } catch (error) {
      console.error(`加载合约ABI失败: ${error.message}`);
      return null;
    }
  }
};

// 初始化配置
serverConfig.initialize();

module.exports = serverConfig; 