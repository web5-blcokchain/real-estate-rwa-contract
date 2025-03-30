/**
 * 部署状态管理模块 - 基础层
 * 
 * 该模块负责管理部署状态的持久化，包括合约地址、网络配置和部署时间戳等。
 * 提供缓存机制以提高性能，并支持异步操作。
 * 
 * @module deployment-state
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

/**
 * 部署状态管理类
 */
class DeploymentState {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   */
  constructor(options = {}) {
    // 配置项
    this.options = {
      statePath: options.statePath || this._getDefaultStatePath(),
      enableCache: options.enableCache !== false,
      autoSave: options.autoSave !== false,
      ...options
    };

    // 初始化缓存
    this.cache = {
      state: null,
      lastLoaded: 0,
      dirty: false
    };

    // 确保构造函数是异步安全的
    this.initialized = this._initialize();
  }

  /**
   * 初始化
   * @private
   */
  async _initialize() {
    try {
      // 确保状态文件所在目录存在
      const dir = path.dirname(this.options.statePath);
      await fs.mkdir(dir, { recursive: true });
      
      // 预加载状态到缓存
      if (this.options.enableCache) {
        await this._loadStateToCache();
      }
      
      logger.info('部署状态管理初始化完成');
      return true;
    } catch (error) {
      logger.error('部署状态管理初始化失败:', error);
      return false;
    }
  }

  /**
   * 获取默认部署状态文件路径
   * @private
   * @returns {string} 默认路径
   */
  _getDefaultStatePath() {
    return path.join(process.cwd(), 'scripts', 'deploy-state.json');
  }

  /**
   * 验证路径
   * @private
   * @param {string} filePath 文件路径
   * @returns {Promise<boolean>} 路径是否有效
   */
  async _validatePath(filePath) {
    try {
      await fs.access(path.dirname(filePath));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 加载状态到缓存
   * @private
   * @returns {Promise<Object|null>} 加载的状态
   */
  async _loadStateToCache() {
    try {
      const exists = await this._fileExists(this.options.statePath);
      if (!exists) {
        this.cache.state = {};
        this.cache.lastLoaded = Date.now();
        return this.cache.state;
      }

      const data = await fs.readFile(this.options.statePath, 'utf8');
      this.cache.state = JSON.parse(data);
      this.cache.lastLoaded = Date.now();
      this.cache.dirty = false;
      logger.debug('部署状态已加载到缓存');
      return this.cache.state;
    } catch (error) {
      logger.error('加载部署状态到缓存失败:', error);
      this.cache.state = {};
      this.cache.lastLoaded = Date.now();
      return this.cache.state;
    }
  }

  /**
   * 检查文件是否存在
   * @private
   * @param {string} filePath 文件路径
   * @returns {Promise<boolean>} 文件是否存在
   */
  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 确保已初始化
   * @private
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this._initialize();
    }
  }

  /**
   * 保存部署状态
   * @param {Object} state 要保存的状态，如果不提供，则保存当前缓存状态
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveState(state = null) {
    await this._ensureInitialized();
    
    try {
      // 如果提供了状态，更新缓存
      if (state !== null) {
        this.cache.state = state;
        this.cache.dirty = true;
      }

      // 验证路径
      const isValid = await this._validatePath(this.options.statePath);
      if (!isValid) {
        throw new Error('无效的部署状态路径');
      }

      // 保存状态
      const stateToSave = this.cache.state || {};
      await fs.writeFile(
        this.options.statePath,
        JSON.stringify(stateToSave, null, 2)
      );
      
      this.cache.dirty = false;
      logger.info('部署状态已保存');
      return true;
    } catch (error) {
      logger.error('保存部署状态失败:', error);
      throw error;
    }
  }

  /**
   * 加载部署状态
   * @param {boolean} [forceRefresh=false] 是否强制从文件刷新
   * @returns {Promise<Object>} 部署状态
   */
  async loadState(forceRefresh = false) {
    await this._ensureInitialized();
    
    try {
      // 如果启用缓存且不强制刷新，使用缓存
      if (this.options.enableCache && !forceRefresh && this.cache.state) {
        // 如果缓存时间不到1分钟，直接返回缓存
        const cacheAge = Date.now() - this.cache.lastLoaded;
        if (cacheAge < 60000) {
          logger.debug('使用缓存的部署状态');
          return this.cache.state;
        }
      }

      return await this._loadStateToCache();
    } catch (error) {
      logger.error('加载部署状态失败:', error);
      throw error;
    }
  }

  /**
   * 更新合约地址
   * @param {string} contractName 合约名称
   * @param {string} address 合约地址
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateContractAddress(contractName, address) {
    try {
      const state = await this.loadState();
      
      // 确保contracts对象存在
      state.contracts = state.contracts || {};
      
      // 更新地址
      state.contracts[contractName] = address;
      
      // 标记缓存为脏
      this.cache.dirty = true;
      
      // 如果启用自动保存，立即保存
      if (this.options.autoSave) {
        await this.saveState();
      }
      
      logger.info(`合约地址已更新: ${contractName} -> ${address}`);
      return true;
    } catch (error) {
      logger.error(`更新合约地址失败 (${contractName}):`, error);
      throw error;
    }
  }

  /**
   * 获取合约地址
   * @param {string} contractName 合约名称
   * @returns {Promise<string|null>} 合约地址，不存在则返回null
   */
  async getContractAddress(contractName) {
    try {
      const state = await this.loadState();
      
      if (!state || !state.contracts || !state.contracts[contractName]) {
        return null;
      }
      
      return state.contracts[contractName];
    } catch (error) {
      logger.error(`获取合约地址失败 (${contractName}):`, error);
      return null;
    }
  }

  /**
   * 获取所有合约地址
   * @returns {Promise<Object>} 所有合约地址的映射
   */
  async getAllContractAddresses() {
    try {
      const state = await this.loadState();
      return state.contracts || {};
    } catch (error) {
      logger.error('获取所有合约地址失败:', error);
      return {};
    }
  }

  /**
   * 更新网络配置
   * @param {Object} networkConfig 网络配置
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateNetworkConfig(networkConfig) {
    try {
      const state = await this.loadState();
      
      // 更新网络配置
      state.network = networkConfig;
      
      // 标记缓存为脏
      this.cache.dirty = true;
      
      // 如果启用自动保存，立即保存
      if (this.options.autoSave) {
        await this.saveState();
      }
      
      logger.info('网络配置已更新');
      return true;
    } catch (error) {
      logger.error('更新网络配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取网络配置
   * @returns {Promise<Object|null>} 网络配置，不存在则返回null
   */
  async getNetworkConfig() {
    try {
      const state = await this.loadState();
      
      if (!state || !state.network) {
        return null;
      }
      
      return state.network;
    } catch (error) {
      logger.error('获取网络配置失败:', error);
      return null;
    }
  }

  /**
   * 更新部署时间戳
   * @param {string} contractName 合约名称
   * @param {number} [timestamp=Date.now()] 时间戳
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateDeployTimestamp(contractName, timestamp = Date.now()) {
    try {
      const state = await this.loadState();
      
      // 确保deployTimestamps对象存在
      state.deployTimestamps = state.deployTimestamps || {};
      
      // 更新时间戳
      state.deployTimestamps[contractName] = timestamp;
      
      // 标记缓存为脏
      this.cache.dirty = true;
      
      // 如果启用自动保存，立即保存
      if (this.options.autoSave) {
        await this.saveState();
      }
      
      logger.info(`部署时间戳已更新: ${contractName}`);
      return true;
    } catch (error) {
      logger.error(`更新部署时间戳失败 (${contractName}):`, error);
      throw error;
    }
  }

  /**
   * 获取部署时间戳
   * @param {string} contractName 合约名称
   * @returns {Promise<number|null>} 部署时间戳，不存在则返回null
   */
  async getDeployTimestamp(contractName) {
    try {
      const state = await this.loadState();
      
      if (!state || !state.deployTimestamps || !state.deployTimestamps[contractName]) {
        return null;
      }
      
      return state.deployTimestamps[contractName];
    } catch (error) {
      logger.error(`获取部署时间戳失败 (${contractName}):`, error);
      return null;
    }
  }

  /**
   * 更新实现合约地址
   * @param {string} contractName 合约名称
   * @param {string} address 实现合约地址
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateImplementationAddress(contractName, address) {
    try {
      const state = await this.loadState();
      
      // 确保implementations对象存在
      state.implementations = state.implementations || {};
      
      // 更新地址
      state.implementations[contractName] = address;
      
      // 标记缓存为脏
      this.cache.dirty = true;
      
      // 如果启用自动保存，立即保存
      if (this.options.autoSave) {
        await this.saveState();
      }
      
      logger.info(`实现合约地址已更新: ${contractName} -> ${address}`);
      return true;
    } catch (error) {
      logger.error(`更新实现合约地址失败 (${contractName}):`, error);
      throw error;
    }
  }

  /**
   * 获取实现合约地址
   * @param {string} contractName 合约名称
   * @returns {Promise<string|null>} 实现合约地址，不存在则返回null
   */
  async getImplementationAddress(contractName) {
    try {
      const state = await this.loadState();
      
      if (!state || !state.implementations || !state.implementations[contractName]) {
        return null;
      }
      
      return state.implementations[contractName];
    } catch (error) {
      logger.error(`获取实现合约地址失败 (${contractName}):`, error);
      return null;
    }
  }

  /**
   * 获取所有实现合约地址
   * @returns {Promise<Object>} 所有实现合约地址的映射
   */
  async getAllImplementationAddresses() {
    try {
      const state = await this.loadState();
      return state.implementations || {};
    } catch (error) {
      logger.error('获取所有实现合约地址失败:', error);
      return {};
    }
  }

  /**
   * 清理缓存
   * @returns {Promise<void>}
   */
  async clearCache() {
    // 如果缓存脏，先保存
    if (this.cache.dirty) {
      await this.saveState();
    }
    
    // 清理缓存
    this.cache.state = null;
    this.cache.lastLoaded = 0;
    this.cache.dirty = false;
    
    logger.debug('部署状态缓存已清理');
  }
}

// 创建单例实例
const deploymentState = new DeploymentState();

// 向后兼容层 - 提供与旧API相同的函数
const compatLayer = {
  saveDeployState: async (state) => deploymentState.saveState(state),
  loadDeployState: async () => deploymentState.loadState(),
  updateContractAddress: async (contractName, address) => deploymentState.updateContractAddress(contractName, address),
  getContractAddress: async (contractName) => deploymentState.getContractAddress(contractName),
  updateNetworkConfig: async (networkConfig) => deploymentState.updateNetworkConfig(networkConfig),
  getNetworkConfig: async () => deploymentState.getNetworkConfig(),
  updateDeployTimestamp: async (contractName, timestamp) => deploymentState.updateDeployTimestamp(contractName, timestamp),
  getDeployTimestamp: async (contractName) => deploymentState.getDeployTimestamp(contractName)
};

// 导出
module.exports = {
  // 导出单例实例
  deploymentState,
  
  // 导出类，允许创建多个实例
  DeploymentState,
  
  // 导出兼容函数
  ...compatLayer
}; 