/**
 * 区块链服务
 * 提供与区块链交互的基础功能
 */

const { ethers } = require('ethers');
const { ApiError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const config = require('../config');
// 替换为shared目录中的公共模块
const { getContractAddress, getContractAddresses, getAbi } = require('../../../shared/config/contracts');

// 缓存Provider实例
let provider = null;

// 区块链服务
const blockchainService = {
  /**
   * 初始化Provider
   * @returns {ethers.JsonRpcProvider} Provider实例
   */
  initProvider() {
    try {
      if (!provider) {
        provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
        logger.info('区块链Provider已初始化', {
          rpcUrl: config.blockchain.rpcUrl,
          chainId: config.blockchain.chainId
        });
      }
      return provider;
    } catch (error) {
      logger.error('初始化区块链Provider失败', error);
      throw new ApiError('无法连接到区块链服务', 503, 'BLOCKCHAIN_CONNECTION_ERROR');
    }
  },

  /**
   * 获取Provider实例
   * @returns {ethers.JsonRpcProvider} Provider实例
   */
  getProvider() {
    if (!provider) {
      return this.initProvider();
    }
    return provider;
  },

  /**
   * 获取签名者
   * @param {string} type 签名者类型（admin, propertyAdmin, tokenAdmin, systemAdmin）
   * @returns {ethers.Wallet} 签名者钱包
   */
  getSigner(type = 'admin') {
    try {
      const provider = this.getProvider();
      const privateKey = config.blockchain.privateKeys[type] || config.blockchain.privateKeys.admin;
      
      if (!privateKey) {
        throw new Error(`未配置${type}类型的私钥`);
      }
      
      return new ethers.Wallet(privateKey, provider);
    } catch (error) {
      logger.error(`获取签名者失败: ${type}`, error);
      throw new ApiError(`无法获取签名账户: ${error.message}`, 500, 'SIGNER_ERROR');
    }
  },

  /**
   * 获取合约实例
   * @param {string} contractName 合约名称
   * @param {boolean} withSigner 是否需要签名者
   * @param {string} signerType 签名者类型
   * @returns {ethers.Contract} 合约实例
   */
  getContract(contractName, withSigner = false, signerType = 'admin') {
    try {
      // 获取合约地址 - 使用shared目录中的公共模块
      const address = getContractAddress(contractName);
      
      if (!address || !ethers.isAddress(address)) {
        throw new Error(`无效的合约地址: ${contractName}`);
      }
      
      // 获取合约ABI - 使用shared目录中的公共模块
      const abi = getAbi(contractName);
      
      if (!abi) {
        throw new Error(`无法加载合约ABI: ${contractName}`);
      }
      
      // 创建合约实例
      const providerOrSigner = withSigner ? this.getSigner(signerType) : this.getProvider();
      return new ethers.Contract(address, abi, providerOrSigner);
    } catch (error) {
      logger.error(`获取合约实例失败: ${contractName}`, error);
      throw new ApiError(`无法获取合约: ${error.message}`, 500, 'CONTRACT_ERROR');
    }
  },

  /**
   * 获取所有合约地址
   * @returns {Object} 所有合约地址对象
   */
  getAllContractAddresses() {
    try {
      // 使用shared目录中的公共模块
      return getContractAddresses();
    } catch (error) {
      logger.error('获取所有合约地址失败', error);
      throw new ApiError(`无法获取合约地址: ${error.message}`, 500, 'CONTRACT_ERROR');
    }
  },

  /**
   * 执行合约只读方法
   * @param {string} contractName 合约名称
   * @param {string} method 方法名
   * @param {Array} args 参数数组
   * @returns {Promise<any>} 方法返回值
   */
  async callReadMethod(contractName, method, args = []) {
    try {
      const contract = this.getContract(contractName);
      
      logger.info(`调用合约只读方法: ${contractName}.${method}`, { args });
      
      const result = await contract[method](...args);
      return result;
    } catch (error) {
      logger.error(`调用合约只读方法失败: ${contractName}.${method}`, error);
      throw new ApiError(`合约调用失败: ${error.message}`, 500, 'CONTRACT_CALL_ERROR');
    }
  },

  /**
   * 执行合约写入方法
   * @param {string} contractName 合约名称
   * @param {string} method 方法名
   * @param {Array} args 参数数组
   * @param {string} signerType 签名者类型
   * @returns {Promise<Object>} 交易信息
   */
  async callWriteMethod(contractName, method, args = [], signerType = 'admin') {
    try {
      const contract = this.getContract(contractName, true, signerType);
      
      logger.info(`执行合约写入方法: ${contractName}.${method}`, { args, signerType });
      
      // 执行交易
      const tx = await contract[method](...args);
      logger.info(`交易已提交: ${tx.hash}`);
      
      // 等待交易确认
      const receipt = await tx.wait(config.blockchain.transactionConfirmations);
      
      logger.info(`交易已确认: ${tx.hash}`, { blockNumber: receipt.blockNumber });
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'confirmed' : 'failed'
      };
    } catch (error) {
      logger.error(`执行合约写入方法失败: ${contractName}.${method}`, error);
      
      // 如果交易已发送但确认失败
      if (error.transactionHash) {
        return {
          txHash: error.transactionHash,
          status: 'failed',
          error: error.message
        };
      }
      
      throw new ApiError(`合约写入失败: ${error.message}`, 500, 'CONTRACT_WRITE_ERROR');
    }
  },

  /**
   * 获取交易状态
   * @param {string} txHash 交易哈希
   * @returns {Promise<Object>} 交易状态信息
   */
  async getTransactionStatus(txHash) {
    try {
      if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
        throw new Error('无效的交易哈希');
      }
      
      const provider = this.getProvider();
      
      // 获取交易信息
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        throw new Error('交易未找到');
      }
      
      // 准备返回数据
      const result = {
        txHash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        status: 'pending'
      };
      
      // 获取交易收据
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (receipt) {
        result.blockNumber = receipt.blockNumber;
        result.gasUsed = receipt.gasUsed.toString();
        result.status = receipt.status === 1 ? 'confirmed' : 'failed';
        result.confirmations = tx.confirmations;
      }
      
      return result;
    } catch (error) {
      logger.error(`获取交易状态失败: ${txHash}`, error);
      throw new ApiError(`获取交易状态失败: ${error.message}`, 500, 'TX_STATUS_ERROR');
    }
  },

  /**
   * 检查区块链连接状态
   * @returns {Promise<Object>} 连接状态信息
   */
  async checkConnection() {
    try {
      const provider = this.getProvider();
      
      // 获取网络信息
      const network = await provider.getNetwork();
      
      // 获取最新区块
      const blockNumber = await provider.getBlockNumber();
      
      return {
        connected: true,
        chainId: network.chainId,
        network: network.name,
        blockNumber,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('区块链连接检查失败', error);
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
};

module.exports = blockchainService; 