/**
 * Provider模块
 * 提供区块链网络连接功能
 */
const { ethers } = require('ethers');
const { ConfigError } = require('../utils/errors');
const Logger = require('../utils/logger');
const EnvConfig = require('../config/env');
const NetworkConfig = require('../config/network');

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
      // 优先使用传入的RPC URL，其次使用环境变量中的配置
      let rpcUrl = options.rpcUrl;
      const networkType = options.networkType || EnvConfig.getNetworkType();
      
      if (!rpcUrl) {
        // 从环境配置获取RPC URL
        const envNetworkConfig = EnvConfig.getNetworkConfig();
        Logger.debug('环境网络配置:', { networkConfig: envNetworkConfig });
        rpcUrl = envNetworkConfig?.rpcUrl;
        
        if (!rpcUrl) {
          Logger.warn('环境配置中没有找到RPC URL');
          
          try {
            // 尝试从网络特定配置获取RPC URL的备用值
            let networkSpecificConfig;
            try {
              networkSpecificConfig = NetworkConfig._getNetworkSpecificConfig(networkType);
              Logger.debug('网络特定配置:', { networkConfig: networkSpecificConfig });
            } catch (configError) {
              Logger.warn(`获取网络特定配置失败: ${configError.message}，将使用默认RPC URL`);
              // 如果无法获取网络特定配置，使用硬编码的本地RPC URL
              networkSpecificConfig = { 
                rpcUrl: 'http://localhost:8545' 
              };
            }
            
            rpcUrl = networkSpecificConfig?.rpcUrl;
            
            if (!rpcUrl) {
              // 最后的后备方案：使用硬编码的默认RPC URL
              Logger.warn(`找不到网络${networkType}的RPC URL配置，将使用默认RPC URL`);
              rpcUrl = 'http://localhost:8545';
            }
          } catch (configError) {
            Logger.error('获取网络特定配置失败:', { error: configError.message });
            // 最后的后备方案：使用硬编码的默认RPC URL
            Logger.warn('将使用默认RPC URL: http://localhost:8545');
            rpcUrl = 'http://localhost:8545';
          }
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
   * 获取交易收据
   * @param {ethers.Provider} provider - Provider实例
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易收据
   */
  static async getTransactionReceipt(provider, txHash) {
    try {
      if (!provider) {
        throw new ConfigError('Provider实例不能为空');
      }
      
      if (!txHash) {
        throw new ConfigError('交易哈希不能为空');
      }
      
      const receipt = await provider.getTransactionReceipt(txHash);
      Logger.debug('获取交易收据成功', { 
        txHash, 
        blockNumber: receipt?.blockNumber,
        status: receipt?.status
      });
      
      return receipt;
    } catch (error) {
      Logger.error(`获取交易收据失败: ${error.message}`, { error, txHash });
      throw new ConfigError(`获取交易收据失败: ${error.message}`);
    }
  }
  
  /**
   * 获取当前的Gas价格
   * @param {ethers.Provider} provider - Provider实例
   * @returns {Promise<ethers.BigNumber>} Gas价格
   */
  static async getGasPrice(provider) {
    try {
      if (!provider) {
        throw new ConfigError('Provider不能为空');
      }
      
      const feeData = await provider.getFeeData();
      Logger.debug('获取Gas价格成功', { gasPrice: feeData.gasPrice.toString() });
      
      return feeData.gasPrice;
    } catch (error) {
      Logger.error(`获取Gas价格失败: ${error.message}`, { error });
      throw new ConfigError(`获取Gas价格失败: ${error.message}`);
    }
  }
  
  /**
   * 获取特定地址的ETH余额
   * @param {ethers.Provider} provider - Provider实例
   * @param {string} address - 钱包地址
   * @returns {Promise<ethers.BigNumber>} 余额（以wei为单位）
   */
  static async getBalance(provider, address) {
    try {
      if (!provider) {
        throw new ConfigError('Provider不能为空');
      }
      
      if (!address) {
        throw new ConfigError('钱包地址不能为空');
      }
      
      const balance = await provider.getBalance(address);
      Logger.debug('获取余额成功', { address, balance: balance.toString() });
      
      return balance;
    } catch (error) {
      Logger.error(`获取余额失败: ${error.message}`, { error, address });
      throw new ConfigError(`获取余额失败: ${error.message}`);
    }
  }
  
  /**
   * 获取特定区块信息
   * @param {ethers.Provider} provider - Provider实例
   * @param {number|string} blockHashOrBlockNumber - 区块哈希或区块高度
   * @returns {Promise<Object>} 区块信息
   */
  static async getBlock(provider, blockHashOrBlockNumber) {
    try {
      if (!provider) {
        throw new ConfigError('Provider不能为空');
      }
      
      if (blockHashOrBlockNumber === undefined || blockHashOrBlockNumber === null) {
        throw new ConfigError('区块哈希或区块高度不能为空');
      }
      
      const block = await provider.getBlock(blockHashOrBlockNumber);
      Logger.debug('获取区块信息成功', { 
        blockNumber: block?.number,
        timestamp: block?.timestamp
      });
      
      return block;
    } catch (error) {
      Logger.error(`获取区块信息失败: ${error.message}`, { error, blockHashOrBlockNumber });
      throw new ConfigError(`获取区块信息失败: ${error.message}`);
    }
  }
  
  /**
   * 估算交易所需的Gas
   * @param {ethers.Provider} provider - Provider实例
   * @param {Object} transaction - 交易对象
   * @returns {Promise<ethers.BigNumber>} Gas估算值
   */
  static async estimateGas(provider, transaction) {
    try {
      if (!provider) {
        throw new ConfigError('Provider不能为空');
      }
      
      if (!transaction) {
        throw new ConfigError('交易对象不能为空');
      }
      
      const gasEstimate = await provider.estimateGas(transaction);
      Logger.debug('估算Gas成功', { gasEstimate: gasEstimate.toString() });
      
      return gasEstimate;
    } catch (error) {
      Logger.error(`估算Gas失败: ${error.message}`, { error, transaction });
      throw new ConfigError(`估算Gas失败: ${error.message}`);
    }
  }
  
  /**
   * 获取链ID
   * @param {ethers.Provider} provider - Provider实例
   * @returns {Promise<number>} 链ID
   */
  static async getChainId(provider) {
    try {
      if (!provider) {
        throw new ConfigError('Provider不能为空');
      }
      
      const network = await provider.getNetwork();
      const chainId = network.chainId;
      Logger.debug('获取链ID成功', { chainId: chainId.toString() });
      
      return chainId;
    } catch (error) {
      Logger.error(`获取链ID失败: ${error.message}`, { error });
      throw new ConfigError(`获取链ID失败: ${error.message}`);
    }
  }

  /**
   * 隐藏RPC URL中的敏感信息
   * @param {string} rpcUrl - RPC URL
   * @returns {string} 处理后的RPC URL
   * @private
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