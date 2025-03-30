const { getDeployStatePath, validatePath } = require('./paths');
const logger = require('./logger');

/**
 * 部署工具类
 */
class DeploymentUtils {
  constructor() {
    this.deployStatePath = getDeployStatePath();
    logger.info('Deployment utilities initialized');
  }

  /**
   * 保存部署状态
   * @param {Object} state 部署状态
   */
  async saveDeployState(state) {
    try {
      if (!validatePath(this.deployStatePath)) {
        throw new Error('Invalid deployment state path');
      }

      await require('fs').promises.writeFile(
        this.deployStatePath,
        JSON.stringify(state, null, 2)
      );
      logger.info('Deployment state saved');
    } catch (error) {
      logger.error('Failed to save deployment state:', error);
      throw error;
    }
  }

  /**
   * 加载部署状态
   * @returns {Object} 部署状态
   */
  async loadDeployState() {
    try {
      if (!validatePath(this.deployStatePath)) {
        return null;
      }

      const data = await require('fs').promises.readFile(this.deployStatePath, 'utf8');
      const state = JSON.parse(data);
      logger.info('Deployment state loaded');
      return state;
    } catch (error) {
      logger.error('Failed to load deployment state:', error);
      throw error;
    }
  }

  /**
   * 更新合约地址
   * @param {string} contractName 合约名称
   * @param {string} address 合约地址
   */
  async updateContractAddress(contractName, address) {
    try {
      const state = await this.loadDeployState() || {};
      state.contracts = state.contracts || {};
      state.contracts[contractName] = address;
      await this.saveDeployState(state);
      logger.info(`Contract address updated for ${contractName}: ${address}`);
    } catch (error) {
      logger.error(`Failed to update contract address for ${contractName}:`, error);
      throw error;
    }
  }

  /**
   * 获取合约地址
   * @param {string} contractName 合约名称
   * @returns {string} 合约地址
   */
  async getContractAddress(contractName) {
    try {
      const state = await this.loadDeployState();
      if (!state || !state.contracts || !state.contracts[contractName]) {
        throw new Error(`Contract address not found for ${contractName}`);
      }
      return state.contracts[contractName];
    } catch (error) {
      logger.error(`Failed to get contract address for ${contractName}:`, error);
      throw error;
    }
  }

  /**
   * 更新网络配置
   * @param {Object} networkConfig 网络配置
   */
  async updateNetworkConfig(networkConfig) {
    try {
      const state = await this.loadDeployState() || {};
      state.network = networkConfig;
      await this.saveDeployState(state);
      logger.info('Network configuration updated');
    } catch (error) {
      logger.error('Failed to update network configuration:', error);
      throw error;
    }
  }

  /**
   * 获取网络配置
   * @returns {Object} 网络配置
   */
  async getNetworkConfig() {
    try {
      const state = await this.loadDeployState();
      if (!state || !state.network) {
        throw new Error('Network configuration not found');
      }
      return state.network;
    } catch (error) {
      logger.error('Failed to get network configuration:', error);
      throw error;
    }
  }

  /**
   * 更新部署时间戳
   * @param {string} contractName 合约名称
   */
  async updateDeployTimestamp(contractName) {
    try {
      const state = await this.loadDeployState() || {};
      state.deployTimestamps = state.deployTimestamps || {};
      state.deployTimestamps[contractName] = Date.now();
      await this.saveDeployState(state);
      logger.info(`Deployment timestamp updated for ${contractName}`);
    } catch (error) {
      logger.error(`Failed to update deployment timestamp for ${contractName}:`, error);
      throw error;
    }
  }

  /**
   * 获取部署时间戳
   * @param {string} contractName 合约名称
   * @returns {number} 部署时间戳
   */
  async getDeployTimestamp(contractName) {
    try {
      const state = await this.loadDeployState();
      if (!state || !state.deployTimestamps || !state.deployTimestamps[contractName]) {
        throw new Error(`Deployment timestamp not found for ${contractName}`);
      }
      return state.deployTimestamps[contractName];
    } catch (error) {
      logger.error(`Failed to get deployment timestamp for ${contractName}:`, error);
      throw error;
    }
  }
}

const deploymentUtils = new DeploymentUtils();

module.exports = deploymentUtils; 