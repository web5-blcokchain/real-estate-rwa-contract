const { ethers } = require('ethers');
const { WalletError } = require('../utils/errors');
const Validation = require('../utils/validation');
const Provider = require('./provider');
const Logger = require('../utils/logger');
const { ErrorHandler } = require('../utils/errors');

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
      // 优先使用直接传入的私钥
      if (options.privateKey) {
        return this.createFromPrivateKey(options.privateKey, options.provider);
      }
      
      // 否则使用keyType从环境变量获取私钥
      if (options.keyType) {
        return this.createFromKeyType(options.keyType, options.provider);
      }
      
      // 如果都没有提供，创建一个随机钱包
      Logger.debug('没有提供私钥或密钥类型，创建随机钱包');
      const randomWallet = ethers.Wallet.createRandom();
      
      if (options.provider) {
        return randomWallet.connect(options.provider);
      }
      
      return randomWallet;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'wallet',
        context: { method: 'create' }
      });
      Logger.error(`创建钱包失败: ${handledError.message}`, { error: handledError });
      throw handledError;
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
    try {
      // 验证keyType
      Validation.validate(
        Validation.isNotEmpty(keyType),
        '密钥类型不能为空'
      );
      
      // 获取私钥
      const privateKey = this._getPrivateKeyFromEnv(keyType);
      
      if (!privateKey) {
        throw new WalletError(`找不到密钥类型 ${keyType} 对应的私钥`);
      }
      
      return this.createFromPrivateKey(privateKey, provider);
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'wallet',
        context: { method: 'createFromKeyType', keyType }
      });
      Logger.error(`通过密钥类型创建钱包失败: ${handledError.message}`, { 
        error: handledError,
        keyType
      });
      throw handledError;
    }
  }

  /**
   * 从私钥创建钱包
   * @param {string} privateKey - 私钥
   * @param {Object} [provider] - Provider 实例
   * @returns {Promise<ethers.Wallet>} 钱包实例
   * @throws {WalletError} 钱包错误
   */
  static async createFromPrivateKey(privateKey, provider) {
    try {
      const wallet = provider 
        ? new ethers.Wallet(privateKey, provider)
        : new ethers.Wallet(privateKey);

      Logger.info('钱包创建成功', { address: wallet.address });
      return wallet;
    } catch (error) {
      throw new WalletError(`创建钱包失败: ${error.message}`);
    }
  }

  /**
   * 从环境变量获取私钥
   * @private
   * @param {string} keyType - 密钥类型
   * @returns {string|null} 私钥
   */
  static _getPrivateKeyFromEnv(keyType) {
    const envKey = `PRIVATE_KEY_${keyType.toUpperCase()}`;
    return process.env[envKey] || null;
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
   * 获取所有账户私钥
   * @returns {Object} 账户私钥映射
   */
  static getAllAccounts() {
    try {
      const accounts = {};
      
      // 查找环境变量中的所有私钥
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('PRIVATE_KEY_')) {
          const keyType = key.replace('PRIVATE_KEY_', '');
          accounts[keyType] = process.env[key];
        }
      });
      
      return accounts;
    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        type: 'wallet',
        context: { method: 'getAllAccounts' }
      });
      Logger.error(`获取所有账户失败: ${handledError.message}`, { error: handledError });
      throw handledError;
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