const { ethers } = require('ethers');
const { WalletError } = require('../utils/errors');
const Validation = require('../utils/validation');
const Provider = require('./provider');
const Logger = require('../utils/logger');
const { EnvConfig } = require('../config');

/**
 * 钱包模块
 * 提供区块链钱包相关功能
 */
class Wallet {
  /**
   * 创建钱包实例
   * @param {Object} options - 创建选项
   * @param {string} [options.privateKey] - 私钥
   * @param {string} [options.keyType] - 私钥类型，如 'ADMIN', 'DEPLOYER', 'SERVICE', 'DEFAULT'
   * @param {Object} [options.provider] - Provider 实例
   * @returns {Promise<ethers.Wallet>} 钱包实例
   * @throws {WalletError} 钱包错误
   */
  static async create(options = {}) {
    try {
      let wallet;
      let privateKey = options.privateKey;
      
      // 如果没有提供私钥，但提供了 keyType，从环境变量获取
      if (!privateKey && options.keyType) {
        try {
          privateKey = EnvConfig.getPrivateKey(options.keyType);
        } catch (error) {
          throw new WalletError(`获取${options.keyType}私钥失败: ${error.message}`);
        }
      }
      
      // 根据私钥创建钱包
      if (privateKey) {
        const provider = options.provider;
        wallet = provider 
          ? new ethers.Wallet(privateKey, provider)
          : new ethers.Wallet(privateKey);
      } else {
        // 如果没有提供私钥和密钥类型，创建随机钱包
        wallet = ethers.Wallet.createRandom();
      }

      Logger.info('钱包创建成功', { address: wallet.address });
      return wallet;
    } catch (error) {
      // 处理可能的错误
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(`创建钱包失败: ${error.message}`);
    }
  }

  /**
   * 根据私钥类型创建钱包
   * @param {string} keyType - 私钥类型
   * @param {Object} [provider] - Provider 实例
   * @returns {Promise<ethers.Wallet>} 钱包实例
   * @throws {WalletError} 钱包错误
   */
  static async createFromKeyType(keyType, provider) {
    return this.create({ keyType, provider });
  }

  /**
   * 从私钥创建钱包
   * @param {string} privateKey - 私钥
   * @param {Object} [provider] - Provider 实例
   * @returns {Promise<ethers.Wallet>} 钱包实例
   * @throws {WalletError} 钱包错误
   */
  static async createFromPrivateKey(privateKey, provider) {
    return this.create({ privateKey, provider });
  }

  /**
   * 获取钱包地址
   * @param {ethers.Wallet} wallet - 钱包实例
   * @returns {Promise<string>} 地址
   * @throws {WalletError} 钱包错误
   */
  static async getAddress(wallet) {
    try {
      return await wallet.getAddress();
    } catch (error) {
      throw new WalletError(`获取钱包地址失败: ${error.message}`);
    }
  }

  /**
   * 获取钱包余额
   * @param {ethers.Wallet} wallet - 钱包实例
   * @returns {Promise<BigNumber>} 余额
   * @throws {WalletError} 钱包错误
   */
  static async getBalance(wallet) {
    try {
      return await wallet.getBalance();
    } catch (error) {
      throw new WalletError(`获取钱包余额失败: ${error.message}`);
    }
  }

  /**
   * 转账
   * @param {ethers.Wallet} wallet - 钱包实例
   * @param {string} to - 接收地址
   * @param {string|BigNumber} amount - 转账金额
   * @param {Object} [options] - 交易选项
   * @returns {Promise<Object>} 交易凭证
   * @throws {WalletError} 钱包错误
   */
  static async sendTransaction(wallet, to, amount, options = {}) {
    try {
      const tx = await wallet.sendTransaction({
        to,
        value: amount,
        ...options
      });

      Logger.info('交易已发送', {
        from: wallet.address,
        to,
        value: amount.toString(),
        hash: tx.hash
      });

      return await tx.wait();
    } catch (error) {
      throw new WalletError(`发送交易失败: ${error.message}`);
    }
  }

  /**
   * 签名消息
   * @param {ethers.Wallet} wallet - 钱包实例
   * @param {string} message - 消息
   * @returns {Promise<string>} 签名
   * @throws {WalletError} 钱包错误
   */
  static async signMessage(wallet, message) {
    try {
      return await wallet.signMessage(message);
    } catch (error) {
      throw new WalletError(`签名消息失败: ${error.message}`);
    }
  }

  /**
   * 获取所有可用的账户私钥
   * @returns {Object} 账户私钥映射
   */
  static getAllAccounts() {
    try {
      return EnvConfig.getAllPrivateKeys();
    } catch (error) {
      Logger.warn('获取账户私钥失败', { error: error.message });
      return {};
    }
  }

  /**
   * 验证Provider实例
   * @param {Object} provider - Provider实例
   * @returns {Promise<boolean>} 是否有效
   */
  static async validateProvider(provider) {
    try {
      if (!provider) return false;
      
      // 简单的连接测试
      await provider.getNetwork();
      return true;
    } catch (error) {
      Logger.error('Provider验证失败', { error: error.message });
      return false;
    }
  }
}

module.exports = Wallet; 