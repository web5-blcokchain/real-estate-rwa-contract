/**
 * 合约地址配置模块
 * 提供统一的合约地址获取接口
 */
const fs = require('fs');
const path = require('path');
const EnvConfig = require('./env');
const { ENV_KEYS } = EnvConfig;
const Logger = require('../utils/logger');
const { ConfigError, ErrorCodes } = require('../utils/errors');

/**
 * 部署配置文件的默认路径
 */
const DEFAULT_DEPLOYMENT_PATH = 'config/deployment.json';

/**
 * 合约地址配置类
 */
class AddressConfig {
  /**
   * 部署配置文件路径
   * @private
   */
  static _deploymentPath = path.resolve(process.cwd(), DEFAULT_DEPLOYMENT_PATH);

  /**
   * 缓存的部署配置
   * @private
   */
  static _cachedDeployment = null;

  /**
   * 是否已初始化（设置部署文件路径）
   * @returns {boolean} 是否已初始化
   */
  static isInitialized() {
    return this._deploymentPath !== null && this._deploymentPath !== undefined;
  }

  /**
   * 设置部署配置文件路径
   * @param {string} filePath - 配置文件路径
   */
  static setDeploymentPath(filePath) {
    this._deploymentPath = filePath;
    this._cachedDeployment = null; // 清除缓存
  }

  /**
   * 加载部署配置文件
   * @returns {Object} 部署配置
   * @throws {ConfigError} 配置错误
   */
  static loadDeployment() {
    // 如果已经加载过，则使用缓存
    if (this._cachedDeployment) {
      return this._cachedDeployment;
    }

    try {
      // 检查文件是否存在
      if (!fs.existsSync(this._deploymentPath)) {
        throw new ConfigError(
          `部署配置文件不存在: ${this._deploymentPath}`,
          ErrorCodes.CONFIG_FILE_NOT_FOUND
        );
      }

      // 读取并解析配置文件
      const deploymentData = fs.readFileSync(this._deploymentPath, 'utf8');
      this._cachedDeployment = JSON.parse(deploymentData);
      
      Logger.debug('部署配置文件加载成功', { path: this._deploymentPath });
      
      return this._cachedDeployment;
    } catch (error) {
      // 处理解析错误
      if (error instanceof ConfigError) {
        throw error;
      }
      
      throw new ConfigError(
        `加载部署配置文件失败: ${error.message}`,
        ErrorCodes.CONFIG_PARSE_ERROR
      );
    }
  }

  /**
   * 获取合约地址
   * @param {string} contractKey - 合约KEY，可以是完整的合约名称或者预定义名称
   * @returns {string|null} 合约地址，如果未找到则返回null
   */
  static getContractAddress(contractKey) {
    try {
      // 标准化合约名称
      const contractName = this._normalizeContractName(contractKey);
      
      // 尝试从部署配置文件获取
      try {
        const deployment = this.loadDeployment();
        
        // 查找合约配置
        if (deployment && deployment.contracts) {
          // 检查contracts是对象还是数组
          if (Array.isArray(deployment.contracts)) {
            // 如果是数组，遍历查找
            for (const contract of deployment.contracts) {
              if (contract.name.toLowerCase() === contractName.toLowerCase()) {
                Logger.debug(`从deployment.json获取合约地址成功: ${contractName}`, { address: contract.address });
                return contract.address;
              }
            }
          } else if (typeof deployment.contracts === 'object') {
            // 如果是对象（键值对），直接查找
            const normalizedName = Object.keys(deployment.contracts).find(
              key => key.toLowerCase() === contractName.toLowerCase()
            );
            
            if (normalizedName) {
              const address = deployment.contracts[normalizedName];
              Logger.debug(`从deployment.json获取合约地址成功: ${contractName}`, { address });
              return address;
            }
          }
        }
      } catch (deploymentError) {
        Logger.warn(`从deployment.json获取合约地址失败: ${deploymentError.message}`);
      }

      // 如果从部署配置文件获取失败，尝试从环境变量获取
      const envKey = `${ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${contractName.toUpperCase()}${ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
      const envAddress = EnvConfig.getEnv(envKey);
      
      if (envAddress) {
        Logger.debug(`从环境变量获取合约地址成功: ${contractName}`, { address: envAddress });
        return envAddress;
      }
      
      Logger.warn(`未找到合约地址: ${contractName}`);
      return null;
      
    } catch (error) {
      Logger.error(`获取合约地址失败: ${error.message}`, { contractKey, stack: error.stack });
      return null;
    }
  }

  /**
   * 获取所有合约地址
   * @returns {Object} 合约地址映射 {contractName: address}
   */
  static getAllContractAddresses() {
    const addresses = {};
    
    // 尝试从部署配置文件获取所有地址
    try {
      const deployment = this.loadDeployment();
      if (deployment && deployment.contracts) {
        // 检查contracts是对象还是数组
        if (Array.isArray(deployment.contracts)) {
          // 如果是数组，遍历添加
          deployment.contracts.forEach(contract => {
            addresses[contract.name] = contract.address;
          });
        } else if (typeof deployment.contracts === 'object') {
          // 如果是对象（键值对），直接合并
          Object.entries(deployment.contracts).forEach(([name, address]) => {
            addresses[name] = address;
          });
        }
      }
    } catch (error) {
      Logger.warn(`从deployment.json获取所有合约地址失败: ${error.message}`);
    }
    
    // 合并环境变量中的合约地址
    const envAddresses = this._getAllEnvContractAddresses();
    Object.keys(envAddresses).forEach(name => {
      // 环境变量的地址优先级低于deployment.json
      if (!addresses[name]) {
        addresses[name] = envAddresses[name];
      }
    });
    
    return addresses;
  }

  /**
   * 从环境变量获取所有合约地址
   * @returns {Object} 合约地址映射 {contractName: address}
   * @private
   */
  static _getAllEnvContractAddresses() {
    const addresses = {};
    const envVars = EnvConfig.getAllEnv();
    const prefix = ENV_KEYS.CONTRACT_ADDRESS_PREFIX;
    const suffix = ENV_KEYS.CONTRACT_ADDRESS_SUFFIX;
    
    for (const key in envVars) {
      const match = key.match(new RegExp(`^${prefix}([A-Za-z0-9_]+)${suffix}$`));
      if (match) {
        const contractName = match[1].toLowerCase().replace(/(^|_)([a-z])/g, (_, p1, p2) => p2.toUpperCase());
        addresses[contractName] = envVars[key];
      }
    }
    
    return addresses;
  }

  /**
   * 设置合约地址（仅用于测试）
   * @param {string} contractKey - 合约KEY
   * @param {string} address - 合约地址
   */
  static setContractAddress(contractKey, address) {
    const contractName = this._normalizeContractName(contractKey);
    const envKey = `${ENV_KEYS.CONTRACT_ADDRESS_PREFIX}${contractName.toUpperCase()}${ENV_KEYS.CONTRACT_ADDRESS_SUFFIX}`;
    EnvConfig.setEnv(envKey, address);
  }

  /**
   * 标准化合约名称
   * @param {string} contractKey - 合约KEY
   * @returns {string} 标准化后的合约名称
   * @private
   */
  static _normalizeContractName(contractKey) {
    // 处理特殊情况
    if (contractKey === 'RealEstateFacade') {
      return 'Facade';
    }
    
    return contractKey;
  }

  /**
   * 获取部署的网络类型
   * @returns {string|null} 网络类型
   */
  static getNetworkType() {
    try {
      const deployment = this.loadDeployment();
      return deployment.network || null;
    } catch (error) {
      Logger.warn(`获取网络类型失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取实现合约地址
   * @param {string} contractName - 合约名称
   * @returns {string|null} 实现合约地址
   */
  static getImplementationAddress(contractName) {
    try {
      const deployment = this.loadDeployment();
      const implementations = deployment.implementations || {};
      
      return implementations[contractName] || null;
    } catch (error) {
      Logger.warn(`获取实现合约地址失败: ${error.message}`);
      return null;
    }
  }
}

// 导出类和常量
module.exports = AddressConfig;
module.exports.DEFAULT_DEPLOYMENT_PATH = DEFAULT_DEPLOYMENT_PATH; 