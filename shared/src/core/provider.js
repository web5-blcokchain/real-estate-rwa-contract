const { ethers } = require('ethers');
const { ConfigError } = require('../utils/errors');
const Logger = require('../utils/logger');
const EnvConfig = require('../config/env');
const NetworkConfig = require('../config/network');

/**
 * Provider管理器类
 * 提供区块链网络连接相关功能
 */
class Provider {
  /**
   * 创建Provider实例
   * @param {Object} [options={}] - 选项
   * @param {string} [options.rpcUrl] - RPC URL
   * @param {string} [options.networkType] - 网络类型
   * @returns {Promise<ethers.Provider>} Provider实例
   */
  static async create(options = {}) {
    try {
      // 优先使用传入的RPC URL，其次使用环境变量中的配置
      let rpcUrl = options.rpcUrl;
      const networkType = options.networkType || EnvConfig.getNetworkType();
      
      if (!rpcUrl) {
        // 获取网络配置
        const networkConfig = NetworkConfig.getNetworkSpecificConfig(networkType);
        rpcUrl = networkConfig.rpcUrl;
      }
      
      if (!rpcUrl) {
        throw new ConfigError(`无法创建Provider: 未找到网络${networkType}的RPC URL配置`);
      }
      
      // 创建Provider实例
      let provider;
      try {
        provider = new ethers.JsonRpcProvider(rpcUrl);
        await provider.getNetwork(); // 测试连接
        
        Logger.info('Provider创建成功', { 
          rpcUrl: this._maskRpcUrl(rpcUrl),
          networkType 
        });
        
        return provider;
      } catch (error) {
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
   * 隐藏RPC URL中的敏感信息
   * @param {string} rpcUrl - RPC URL
   * @returns {string} 处理后的RPC URL
   */
  static _maskRpcUrl(rpcUrl) {
    if (!rpcUrl) return '';
    
    try {
      // 隐藏API密钥
      const url = new URL(rpcUrl);
      
      // 检查URL中是否包含API密钥等敏感信息
      if (url.username || url.password) {
        return `${url.protocol}//*****:*****@${url.host}${url.pathname}`;
      }
      
      // 检查查询参数中是否有常见的API密钥
      if (url.searchParams.has('apiKey') || url.searchParams.has('api_key')) {
        return `${url.protocol}//${url.host}${url.pathname}?apiKey=*****`;
      }
      
      return rpcUrl;
    } catch (error) {
      return rpcUrl; // 如果解析失败，返回原始URL
    }
  }
}

module.exports = Provider; 