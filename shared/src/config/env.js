const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

class EnvConfig {
  constructor() {
    // 获取项目根目录（shared 目录的父目录的父目录）
    this.projectRoot = path.resolve(__dirname, '../../..');
    
    // 获取当前环境
    this.env = process.env.NODE_ENV || 'development';
    
    // 加载环境配置
    this.loadEnvConfig();
    
    // 验证必需的环境变量
    this.validateRequiredEnvVars();
  }

  loadEnvConfig() {
    // 基础配置文件路径
    const baseConfigPath = path.join(this.projectRoot, 'config', 'env', '.env');
    // 环境特定配置文件路径
    const envConfigPath = path.join(this.projectRoot, 'config', 'env', `${this.env}.env`);

    // 检查配置文件是否存在
    if (!fs.existsSync(baseConfigPath)) {
      throw new Error(`Base configuration file not found at ${baseConfigPath}`);
    }

    // 加载基础配置
    const baseConfig = dotenv.parse(fs.readFileSync(baseConfigPath));
    this.config = { ...baseConfig };

    // 如果存在环境特定配置，则加载并覆盖基础配置
    if (fs.existsSync(envConfigPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envConfigPath));
      this.config = { ...this.config, ...envConfig };
    }
  }

  // 验证必需的环境变量
  validateRequiredEnvVars() {
    const requiredVars = {
      // 网络配置
      HARDHAT_CHAIN_ID: 'number',
      TESTNET_CHAIN_ID: 'number',
      MAINNET_CHAIN_ID: 'number',
      TESTNET_RPC_URL: 'string',
      MAINNET_RPC_URL: 'string',
      
      // 账户配置
      DEPLOYER_PRIVATE_KEY: 'string',
      
      // Etherscan配置
      ETHERSCAN_API_KEY: 'string',
      ETHERSCAN_API_URL: 'string',
      ETHERSCAN_BROWSER_URL: 'string',
      
      // 合约初始化参数
      ADMIN_ADDRESSES: 'array',
      MANAGER_ADDRESSES: 'array',
      OPERATOR_ADDRESSES: 'array',
      TRADING_FEE_RECEIVER: 'address',
      TRADING_FEE_RATE: 'number',
      MIN_TRADE_AMOUNT: 'number',
      REWARD_FEE_RECEIVER: 'address',
      PLATFORM_FEE_RATE: 'number',
      MAINTENANCE_FEE_RATE: 'number',
      MIN_DISTRIBUTION_THRESHOLD: 'number',
      SUPPORTED_PAYMENT_TOKENS: 'array',
      MIN_TRANSFER_AMOUNT: 'number',
      SYSTEM_START_PAUSED: 'boolean',
      TOKEN_FACTORY_NAME: 'string',
      TOKEN_FACTORY_SYMBOL: 'string',
      TOKEN_FACTORY_INITIAL_SUPPLY: 'number',
      PROPERTY_COUNTRY: 'string',
      PROPERTY_METADATA_URI: 'string'
    };

    for (const [key, type] of Object.entries(requiredVars)) {
      if (!this.config[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }

      // 类型验证
      switch (type) {
        case 'number':
          if (isNaN(Number(this.config[key]))) {
            throw new Error(`Invalid number value for ${key}`);
          }
          break;
        case 'boolean':
          if (this.config[key].toLowerCase() !== 'true' && this.config[key].toLowerCase() !== 'false') {
            throw new Error(`Invalid boolean value for ${key}`);
          }
          break;
        case 'array':
          if (!Array.isArray(this.config[key].split(','))) {
            throw new Error(`Invalid array value for ${key}`);
          }
          break;
        case 'address':
          if (!this.isValidAddress(this.config[key])) {
            throw new Error(`Invalid Ethereum address for ${key}`);
          }
          break;
      }
    }
  }

  // 验证以太坊地址
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // 基础配置获取方法
  get(key) {
    const value = this.config[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  getOptional(key, defaultValue) {
    return this.config[key] || defaultValue;
  }

  getInt(key) {
    return parseInt(this.get(key));
  }

  getBoolean(key) {
    return this.get(key).toLowerCase() === 'true';
  }

  getArray(key) {
    return this.get(key).split(',').map(item => item.trim());
  }

  getFloat(key) {
    return parseFloat(this.get(key));
  }

  // 合约配置
  getContractConfig() {
    return {
      optimizer: {
        enabled: true,
        runs: this.getInt('CONTRACT_OPTIMIZER_RUNS'),
      },
    };
  }

  // 服务器配置
  getServerConfig() {
    return {
      port: this.getInt('PORT'),
      host: this.get('HOST'),
    };
  }

  // 日志配置
  getLogConfig() {
    return {
      level: this.get('LOG_LEVEL'),
      dir: this.get('LOG_DIR'),
    };
  }

  // 监控配置
  getMonitorConfig() {
    return {
      interval: this.getInt('MONITOR_INTERVAL'),
      alertThreshold: this.getFloat('ALERT_THRESHOLD'),
    };
  }

  // 业务配置
  getBusinessConfig() {
    return {
      minInvestmentAmount: this.getFloat('MIN_INVESTMENT_AMOUNT'),
      maxInvestmentAmount: this.getFloat('MAX_INVESTMENT_AMOUNT'),
      rewardRate: this.getFloat('REWARD_RATE'),
    };
  }

  // 获取合约初始化参数
  getContractInitParams() {
    return {
      role: {
        adminAddresses: this.getArray('ADMIN_ADDRESSES'),
        managerAddresses: this.getArray('MANAGER_ADDRESSES'),
        operatorAddresses: this.getArray('OPERATOR_ADDRESSES')
      },
      trading: {
        tradingFeeReceiver: this.get('TRADING_FEE_RECEIVER'),
        tradingFeeRate: this.getInt('TRADING_FEE_RATE'),
        minTradeAmount: this.getFloat('MIN_TRADE_AMOUNT')
      },
      reward: {
        rewardFeeReceiver: this.get('REWARD_FEE_RECEIVER'),
        platformFeeRate: this.getInt('PLATFORM_FEE_RATE'),
        maintenanceFeeRate: this.getInt('MAINTENANCE_FEE_RATE'),
        minDistributionThreshold: this.getFloat('MIN_DISTRIBUTION_THRESHOLD'),
        supportedPaymentTokens: this.getArray('SUPPORTED_PAYMENT_TOKENS')
      },
      token: {
        minTransferAmount: this.getFloat('MIN_TRANSFER_AMOUNT')
      },
      system: {
        startPaused: this.getBoolean('SYSTEM_START_PAUSED')
      },
      tokenFactory: {
        name: this.get('TOKEN_FACTORY_NAME'),
        symbol: this.get('TOKEN_FACTORY_SYMBOL'),
        initialSupply: this.getInt('TOKEN_FACTORY_INITIAL_SUPPLY')
      },
      property: {
        country: this.get('PROPERTY_COUNTRY'),
        metadataURI: this.get('PROPERTY_METADATA_URI')
      }
    };
  }
}

// 创建单例实例
const envConfig = new EnvConfig();
module.exports = envConfig; 