/**
 * 环境变量配置模块
 * 集中管理和验证所有环境变量
 */
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// 加载环境变量
const loadEnvFile = () => {
  // 尝试从不同位置加载.env文件
  const envPaths = [
    process.env.ENV_FILE,
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env')
  ].filter(Boolean);

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`加载环境变量文件: ${envPath}`);
      dotenv.config({ path: envPath });
      return true;
    }
  }

  console.warn('找不到.env文件，将使用系统环境变量');
  return false;
};

/**
 * 环境变量分组配置
 */
const envConfig = {
  // 初始化配置，加载环境变量
  initialize() {
    // 设置项目根目录路径
    if (!process.env.PROJECT_PATH) {
      process.env.PROJECT_PATH = path.resolve(__dirname, '../../..');
      if (!process.env.PROJECT_PATH.endsWith('/')) {
        process.env.PROJECT_PATH += '/';
      }
    }
    
    // 加载环境变量
    loadEnvFile();
    
    // 验证关键环境变量
    this.validate();
    
    return this;
  },
  
  // 验证关键环境变量
  validate() {
    const warnings = [];
    const errors = [];
    
    // 必需的环境变量
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
      warnings.push('NODE_ENV未设置，使用默认值: development');
    }
    
    if (!process.env.PORT) {
      process.env.PORT = '3000';
      warnings.push('PORT未设置，使用默认值: 3000');
    }
    
    if (!process.env.BLOCKCHAIN_NETWORK) {
      process.env.BLOCKCHAIN_NETWORK = 'localhost';
      warnings.push('BLOCKCHAIN_NETWORK未设置，使用默认值: localhost');
    }
    
    if (!process.env.API_KEY) {
      warnings.push('API_KEY未设置，API接口将不受保护');
    }
    
    // 记录警告和错误
    if (warnings.length > 0) {
      console.warn('环境变量警告:');
      warnings.forEach(warning => console.warn(`- ${warning}`));
    }
    
    if (errors.length > 0) {
      console.error('环境变量错误:');
      errors.forEach(error => console.error(`- ${error}`));
      throw new Error('环境变量配置错误，请检查日志');
    }
    
    return true;
  },
  
  // 获取服务器配置
  getServerConfig() {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || 'localhost',
      projectPath: process.env.PROJECT_PATH
    };
  },
  
  // 获取API配置
  getApiConfig() {
    return {
      basePath: process.env.API_BASE_PATH || '/api/v1',
      swaggerPath: process.env.SWAGGER_PATH || '/api-docs',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      apiKey: process.env.API_KEY,
      requiresAuth: process.env.REQUIRES_AUTH !== 'false'
    };
  },
  
  // 获取区块链配置
  getBlockchainConfig() {
    return {
      networkType: process.env.BLOCKCHAIN_NETWORK || 'localhost',
      rpcUrl: process.env.BLOCKCHAIN_RPC_URL || process.env.RPC_URL,
      gasLimit: process.env.GAS_LIMIT,
      gasPrice: process.env.GAS_PRICE,
      confirmations: process.env.CONFIRMATIONS ? parseInt(process.env.CONFIRMATIONS, 10) : 1,
      privateKey: process.env.PRIVATE_KEY,
      mockMode: process.env.MOCK_BLOCKCHAIN === 'true'
    };
  },
  
  // 获取日志配置
  getLogConfig() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      directory: process.env.LOG_DIR || 'logs',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      console: process.env.LOG_CONSOLE !== 'false',
      httpLog: process.env.HTTP_LOG !== 'false'
    };
  }
};

// 初始化环境配置
envConfig.initialize();

module.exports = envConfig; 