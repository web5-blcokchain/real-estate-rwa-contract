/**
 * 区块链服务类
 * 提供与区块链交互的相关功能
 */
const { ethers } = require('ethers');
const { Logger } = require('../../../shared/src/utils');
const serverConfig = require('../config');

/**
 * 区块链服务类
 */
class BlockchainService {
  /**
   * 构造函数
   */
  constructor() {
    this.provider = null;
    this.networkType = null;
    this.initialized = false;
  }

  /**
   * 初始化区块链服务
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (this.initialized) {
        return;
      }

      // 获取区块链配置
      const blockchainConfig = serverConfig.getBlockchainConfig();
      this.networkType = blockchainConfig.networkType;

      // 根据网络类型获取RPC URL
      let rpcUrl;
      
      switch (this.networkType) {
        case 'localhost':
          rpcUrl = process.env.LOCAL_RPC_URL || 'http://localhost:8545';
          break;
        case 'testnet':
          rpcUrl = process.env.TESTNET_RPC_URL;
          break;
        case 'mainnet':
          rpcUrl = process.env.MAINNET_RPC_URL;
          break;
        default:
          throw new Error(`不支持的网络类型: ${this.networkType}`);
      }

      if (!rpcUrl) {
        throw new Error(`未配置${this.networkType}的RPC URL`);
      }

      // 创建Provider
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      // 验证连接
      const network = await this.provider.getNetwork();
      Logger.info(`已连接到区块链网络: ${this.networkType}`, {
        chainId: network.chainId,
        name: network.name
      });

      this.initialized = true;
    } catch (error) {
      Logger.error(`区块链服务初始化失败: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * 获取网络类型
   * @returns {string} 网络类型
   */
  getNetworkType() {
    return this.networkType;
  }

  /**
   * 检查连接状态
   * @returns {Promise<boolean>} 是否已连接
   */
  async isConnected() {
    try {
      if (!this.initialized) {
        return false;
      }
      
      const network = await this.provider.getNetwork();
      return !!network.chainId;
    } catch (error) {
      Logger.error(`检查连接状态失败: ${error.message}`, { error });
      return false;
    }
  }

  /**
   * 获取网络ID
   * @returns {Promise<number>} 网络ID
   */
  async getNetworkId() {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      const network = await this.provider.getNetwork();
      return network.chainId;
    } catch (error) {
      Logger.error(`获取网络ID失败: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * 获取当前区块高度
   * @returns {Promise<number>} 区块高度
   */
  async getBlockNumber() {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      return await this.provider.getBlockNumber();
    } catch (error) {
      Logger.error(`获取区块高度失败: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * 根据交易哈希获取交易信息
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易信息
   */
  async getTransaction(txHash) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      return await this.provider.getTransaction(txHash);
    } catch (error) {
      Logger.error(`获取交易信息失败: ${error.message}`, { error, txHash });
      throw error;
    }
  }

  /**
   * 获取交易收据
   * @param {string} txHash - 交易哈希
   * @returns {Promise<Object>} 交易收据
   */
  async getTransactionReceipt(txHash) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      Logger.error(`获取交易收据失败: ${error.message}`, { error, txHash });
      throw error;
    }
  }

  /**
   * 获取当前Gas价格
   * @returns {Promise<BigNumber>} Gas价格
   */
  async getGasPrice() {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      return await this.provider.getGasPrice();
    } catch (error) {
      Logger.error(`获取Gas价格失败: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * 创建合约实例
   * @param {Array} abi - 合约ABI
   * @param {string} address - 合约地址
   * @returns {Contract} 合约实例
   */
  getContractInstance(abi, address) {
    try {
      if (!this.initialized) {
        throw new Error('区块链服务尚未初始化');
      }
      
      return new ethers.Contract(address, abi, this.provider);
    } catch (error) {
      Logger.error(`创建合约实例失败: ${error.message}`, { error, address });
      throw error;
    }
  }
}

// 创建单例实例
const blockchainService = new BlockchainService();

module.exports = blockchainService; 