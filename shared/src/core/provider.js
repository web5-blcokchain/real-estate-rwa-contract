/**
 * Provider模块
 * 提供区块链网络连接功能
 */
const { ethers } = require('ethers');
const { ConfigError } = require('../utils/errors');
const Logger = require('../utils/logger');

/**
 * Provider类
 * 用于创建和管理以太坊Provider连接
 */
class Provider {
  /**
   * 创建Provider实例
   * @param {Object} options - 创建选项
   * @param {string} [options.networkType] - 网络类型
   * @param {string} [options.rpcUrl] - RPC URL
   * @returns {Promise<ethers.JsonRpcProvider>} Provider实例
   */
  static async create(options = {}) {
    try {
      // 优先使用传入的RPC URL，其次根据网络类型确定RPC URL
      let rpcUrl = options.rpcUrl;
      const networkType = options.networkType || process.env.BLOCKCHAIN_NETWORK || 'localhost';
      
      if (!rpcUrl) {
        // 根据网络类型从环境变量获取对应的RPC URL
        switch (networkType.toLowerCase()) {
          case 'localhost':
            rpcUrl = process.env.LOCALHOST_RPC_URL || 'http://localhost:8545';
            break;
          case 'testnet':
            rpcUrl = process.env.TESTNET_RPC_URL;
            break;
          case 'mainnet':
            rpcUrl = process.env.MAINNET_RPC_URL;
            break;
          default:
            Logger.warn(`未知网络类型: ${networkType}，将使用localhost`);
            rpcUrl = process.env.LOCALHOST_RPC_URL || 'http://localhost:8545';
        }
        
        if (!rpcUrl) {
          Logger.warn(`找不到网络${networkType}的RPC URL配置，将使用默认RPC URL`);
          rpcUrl = 'http://localhost:8545';
        }
      }
      
      Logger.debug(`将使用RPC URL: ${this._maskRpcUrl(rpcUrl)}`);
      
      // 创建Provider实例
      try {
        // 创建JSON-RPC Provider
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // 测试连接
        Logger.debug('测试网络连接...');
        const network = await provider.getNetwork();
        Logger.debug(`连接成功! 网络: ${network.name}, 链ID: ${network.chainId}`);
        
        Logger.info('Provider创建成功', { 
          rpcUrl: this._maskRpcUrl(rpcUrl),
          networkType 
        });
        
        return provider;
      } catch (error) {
        Logger.error('Provider创建错误详情:', { error: error.message });
        throw new ConfigError(`创建Provider失败: ${error.message}`);
      }
    } catch (error) {
      Logger.error('创建Provider失败', { 
        error: error.message,
        stack: error.stack
      });
      
      throw new ConfigError(`创建Provider失败: ${error.message}`);
    }
  }
  
  /**
   * 获取当前区块号
   * @param {ethers.Provider} provider - Provider实例
   * @returns {Promise<number>} 区块号
   */
  static async getBlockNumber(provider) {
    try {
      if (!provider) {
        throw new ConfigError('Provider实例不能为空');
      }
      
      const blockNumber = await provider.getBlockNumber();
      Logger.debug('获取区块号成功', { blockNumber });
      
      return blockNumber;
    } catch (error) {
      throw new ConfigError(`获取区块号失败: ${error.message}`);
    }
  }
  
  /**
   * 获取网络信息
   * @param {ethers.Provider} provider - Provider实例
   * @returns {Promise<Object>} 网络信息
   */
  static async getNetwork(provider) {
    try {
      if (!provider) {
        throw new ConfigError('Provider实例不能为空');
      }
      
      const network = await provider.getNetwork();
      Logger.debug('获取网络信息成功', { 
        chainId: network.chainId.toString(),
        name: network.name 
      });
      
      return {
        chainId: network.chainId.toString(),
        name: network.name
      };
    } catch (error) {
      throw new ConfigError(`获取网络信息失败: ${error.message}`);
    }
  }
  
  /**
   * 根据交易哈希获取交易信息
   * @param {ethers.Provider} provider - Provider实例
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易信息
   */
  static async getTransaction(provider, txHash) {
    try {
      if (!provider) {
        throw new ConfigError('Provider实例不能为空');
      }
      
      if (!txHash) {
        throw new ConfigError('交易哈希不能为空');
      }
      
      const tx = await provider.getTransaction(txHash);
      Logger.debug('获取交易信息成功', { txHash, confirmations: tx?.confirmations });
      
      return tx;
    } catch (error) {
      Logger.error(`获取交易信息失败: ${error.message}`, { error, txHash });
      throw new ConfigError(`获取交易信息失败: ${error.message}`);
    }
  }
  
  /**
   * 获取当前Gas价格
   * @param {ethers.Provider} provider - Provider实例
   * @returns {Promise<bigint>} Gas价格（wei）
   */
  static async getGasPrice(provider) {
    try {
      if (!provider) {
        throw new ConfigError('Provider实例不能为空');
      }
      
      const gasPrice = await provider.getFeeData();
      Logger.debug('获取Gas价格成功', { 
        gasPrice: gasPrice.gasPrice?.toString() || 'N/A',
        maxFeePerGas: gasPrice.maxFeePerGas?.toString() || 'N/A',
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString() || 'N/A'
      });
      
      return gasPrice.gasPrice || BigInt(0);
    } catch (error) {
      throw new ConfigError(`获取Gas价格失败: ${error.message}`);
    }
  }
  
  /**
   * 隐藏RPC URL的敏感信息
   * @private
   * @param {string} rpcUrl - RPC URL
   * @returns {string} 处理后的URL
   */
  static _maskRpcUrl(rpcUrl) {
    if (!rpcUrl) return '<空URL>';
    
    try {
      const url = new URL(rpcUrl);
      
      // 隐藏API密钥等敏感信息
      if (url.username || url.password) {
        return `${url.protocol}//*****:****@${url.host}${url.pathname}`;
      }
      
      // 隐藏查询参数中的敏感信息
      if (url.search && url.search.length > 1) {
        return `${url.origin}${url.pathname}?*****`;
      }
      
      return rpcUrl;
    } catch (error) {
      // 如果URL无效，返回原始URL
      return rpcUrl;
    }
  }
}

module.exports = Provider;
