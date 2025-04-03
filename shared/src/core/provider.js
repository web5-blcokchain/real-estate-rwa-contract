const { ethers } = require('ethers');
const { ProviderError } = require('../utils/errors');
const Logger = require('../utils/logger');
const Validation = require('../utils/validation');
const NetworkConfig = require('../config/network');
const EnvConfig = require('../config/env');

/**
 * Provider 管理器类
 * 提供网络连接、区块查询、交易广播等功能
 */
class Provider {
  /**
   * 创建 Provider 实例
   * @param {Object} [options] - 配置选项
   * @param {string} [options.rpcUrl] - RPC URL
   * @param {number} [options.chainId] - 链 ID
   * @returns {Promise<ethers.Provider>} Provider 实例
   */
  static async create(options = {}) {
    try {
      // 获取配置
      const networkConfig = EnvConfig.getNetworkConfig();

      // 设置默认值
      const rpcUrl = options.rpcUrl || networkConfig.rpcUrl;
      const chainId = options.chainId || networkConfig.chainId;
      
      // 验证参数
      if (!Validation.isValidUrl(rpcUrl)) {
        throw new ProviderError('无效的 RPC URL');
      }
      
      if (!Validation.isValidChainId(chainId)) {
        throw new ProviderError('无效的链 ID');
      }
      
      // 创建 Provider 实例
      const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
      
      // 记录日志
      Logger.info(`Provider 实例创建成功: ${rpcUrl}，链ID: ${chainId}`, { 
        module: 'provider',
        network: NetworkConfig.getNetworkType()
      });
      
      return provider;
    } catch (error) {
      throw new ProviderError(`创建 Provider 实例失败: ${error.message}`);
    }
  }

  /**
   * 获取当前区块号
   * @param {ethers.Provider} provider - Provider 实例
   * @returns {Promise<number>} 当前区块号
   */
  static async getBlockNumber(provider) {
    try {
      // 验证参数
      if (!Validation.isValidProvider(provider)) {
        throw new ProviderError('无效的 Provider 实例');
      }

      // 获取区块号
      const blockNumber = await provider.getBlockNumber();
      
      // 记录日志
      Logger.debug(`获取当前区块号成功: ${blockNumber}`);
      
      return blockNumber;
    } catch (error) {
      throw new ProviderError(`获取当前区块号失败: ${error.message}`);
    }
  }

  /**
   * 获取区块信息
   * @param {ethers.Provider} provider - Provider 实例
   * @param {number|string} blockNumber - 区块号
   * @returns {Promise<Object>} 区块信息
   */
  static async getBlock(provider, blockNumber) {
    try {
      // 验证参数
      if (!Validation.isValidProvider(provider)) {
        throw new ProviderError('无效的 Provider 实例');
      }
      if (!Validation.isValidBlockNumber(blockNumber)) {
        throw new ProviderError('无效的区块号');
      }

      // 获取区块信息
      const block = await provider.getBlock(blockNumber);
      
      // 记录日志
      Logger.debug(`获取区块信息成功: ${blockNumber}`);
      
      return block;
    } catch (error) {
      throw new ProviderError(`获取区块信息失败: ${error.message}`);
    }
  }

  /**
   * 获取交易信息
   * @param {ethers.Provider} provider - Provider 实例
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易信息
   */
  static async getTransaction(provider, txHash) {
    try {
      // 验证参数
      if (!Validation.isValidProvider(provider)) {
        throw new ProviderError('无效的 Provider 实例');
      }
      if (!Validation.isValidHash(txHash)) {
        throw new ProviderError('无效的交易哈希');
      }

      // 获取交易信息
      const tx = await provider.getTransaction(txHash);
      
      // 记录日志
      Logger.debug(`获取交易信息成功: ${txHash}`);
      
      return tx;
    } catch (error) {
      throw new ProviderError(`获取交易信息失败: ${error.message}`);
    }
  }

  /**
   * 获取交易收据
   * @param {ethers.Provider} provider - Provider 实例
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易收据
   */
  static async getTransactionReceipt(provider, txHash) {
    try {
      // 验证参数
      if (!Validation.isValidProvider(provider)) {
        throw new ProviderError('无效的 Provider 实例');
      }
      if (!Validation.isValidHash(txHash)) {
        throw new ProviderError('无效的交易哈希');
      }

      // 获取交易收据
      const receipt = await provider.getTransactionReceipt(txHash);
      
      // 记录日志
      Logger.debug(`获取交易收据成功: ${txHash}`);
      
      return receipt;
    } catch (error) {
      throw new ProviderError(`获取交易收据失败: ${error.message}`);
    }
  }

  /**
   * 获取网络信息
   * @param {ethers.Provider} provider - Provider 实例
   * @returns {Promise<Object>} 网络信息
   */
  static async getNetwork(provider) {
    try {
      // 验证参数
      if (!Validation.isValidProvider(provider)) {
        throw new ProviderError('无效的 Provider 实例');
      }

      // 获取网络信息
      const network = await provider.getNetwork();
      
      // 记录日志
      Logger.debug(`获取网络信息成功`);
      
      return network;
    } catch (error) {
      throw new ProviderError(`获取网络信息失败: ${error.message}`);
    }
  }

  /**
   * 获取账户余额
   * @param {ethers.Provider} provider - Provider 实例
   * @param {string} address - 账户地址
   * @returns {Promise<bigint>} 账户余额
   */
  static async getBalance(provider, address) {
    try {
      // 验证参数
      if (!Validation.isValidProvider(provider)) {
        throw new ProviderError('无效的 Provider 实例');
      }
      if (!Validation.isValidAddress(address)) {
        throw new ProviderError('无效的账户地址');
      }

      // 获取账户余额
      const balance = await provider.getBalance(address);
      
      // 记录日志
      Logger.debug(`获取账户余额成功: ${address} = ${balance.toString()}`);
      
      return balance;
    } catch (error) {
      throw new ProviderError(`获取账户余额失败: ${error.message}`);
    }
  }
}

// 导出 Provider 类
module.exports = Provider; 