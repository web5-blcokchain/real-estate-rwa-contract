const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

class EnvConfig {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = {};
    this.configDir = path.join(__dirname, '../../../config/env');
  }

  load() {
    // 加载基础配置
    this.loadBaseConfig();

    // 加载环境特定配置
    this.loadEnvConfig();

    // 设置环境变量
    this.setEnvVars();

    return this.config;
  }

  loadBaseConfig() {
    const basePath = path.join(this.configDir, '.env');
    if (fs.existsSync(basePath)) {
      const result = dotenv.config({ path: basePath });
      if (result.error) {
        throw new Error(`Error loading base config: ${result.error}`);
      }
      this.config = { ...process.env };
    }
  }

  loadEnvConfig() {
    const envPath = path.join(this.configDir, `${this.env}.env`);
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        throw new Error(`Error loading ${this.env} config: ${result.error}`);
      }
      this.config = { ...this.config, ...process.env };
    }
  }

  setEnvVars() {
    Object.entries(this.config).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }

  getConfig() {
    return this.config;
  }

  getEnv() {
    return this.env;
  }

  // 获取网络配置
  getNetworkConfig() {
    return {
      hardhat: {
        url: this.config.HARDHAT_RPC_URL,
        chainId: parseInt(this.config.HARDHAT_CHAIN_ID),
        accounts: [this.config.DEPLOYER_PRIVATE_KEY],
        blockGasLimit: 30000000,
        gas: "auto",
        gasPrice: "auto",
        allowUnlimitedContractSize: false,
        loggingEnabled: false
      },
      testnet: {
        url: this.config.TESTNET_RPC_URL,
        chainId: parseInt(this.config.TESTNET_CHAIN_ID),
        accounts: [this.config.DEPLOYER_PRIVATE_KEY],
        gas: "auto",
        gasPrice: "auto"
      },
      mainnet: {
        url: this.config.MAINNET_RPC_URL,
        chainId: parseInt(this.config.MAINNET_CHAIN_ID),
        accounts: [this.config.DEPLOYER_PRIVATE_KEY],
        gas: "auto",
        gasPrice: "auto"
      }
    };
  }

  // 获取 Etherscan 配置
  getEtherscanConfig() {
    return {
      apiKey: this.config.ETHERSCAN_API_KEY,
      customChains: [
        {
          network: "testnet",
          chainId: parseInt(this.config.TESTNET_CHAIN_ID),
          urls: {
            apiURL: this.config.ETHERSCAN_API_URL,
            browserURL: this.config.ETHERSCAN_BROWSER_URL,
          },
        },
      ],
    };
  }

  // 获取 Gas 报告配置
  getGasReporterConfig() {
    return {
      enabled: process.env.REPORT_GAS !== undefined,
      currency: "USD",
    };
  }

  // 获取路径配置
  getPathsConfig() {
    return {
      sources: "./contracts",
      artifacts: "./artifacts",
      cache: "./cache",
      deployments: "./deployments",
    };
  }

  // 获取 Mocha 配置
  getMochaConfig() {
    return {
      timeout: 40000,
    };
  }

  // 获取日志配置
  getLogConfig() {
    return {
      level: this.config.LOG_LEVEL || 'info',
      dir: this.config.LOG_DIR || 'logs',
    };
  }

  // 获取服务器配置
  getServerConfig() {
    return {
      port: parseInt(this.config.SERVER_PORT) || 3000,
      host: this.config.SERVER_HOST || 'localhost',
    };
  }

  // 获取监控配置
  getMonitorConfig() {
    return {
      interval: parseInt(this.config.MONITOR_INTERVAL) || 60000,
      blockConfirmations: parseInt(this.config.BLOCK_CONFIRMATIONS) || 12,
    };
  }
}

module.exports = new EnvConfig(); 