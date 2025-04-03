const { ethers } = require('ethers');
const { WalletError } = require('../utils');
const Validation = require('../utils/validation');
const Provider = require('./provider');
const Logger = require('../utils/logger');
const EnvConfig = require('../config/env');

/**
 * Wallet 管理器类
 */
class Wallet {
  /**
   * 创建钱包实例
   * @param {Object} [options={}] - 选项
   * @param {string} [options.privateKey] - 私钥
   * @param {string} [options.mnemonic] - 助记词
   * @param {string} [options.keyType] - 私钥类型，例如：'ADMIN', 'MANAGER', 'OPERATOR'等
   * @param {Object} [options.provider] - Provider实例
   * @returns {Promise<ethers.Wallet>} 钱包实例
   */
  static async create(options = {}) {
    try {
      let privateKey = options.privateKey;
      const mnemonic = options.mnemonic;
      const keyType = options.keyType;
      
      // 如果没有提供privateKey，但提供了keyType，则从环境变量获取
      if (!privateKey && keyType) {
        try {
          privateKey = EnvConfig.getPrivateKey(keyType);
        } catch (error) {
          throw new WalletError(`从环境变量获取${keyType}私钥失败: ${error.message}`);
        }
      }
      
      // 验证参数
      if (!privateKey && !mnemonic) {
        throw new WalletError('创建钱包失败: 需要提供私钥、助记词或有效的私钥类型');
      }

      // 验证私钥格式
      if (privateKey) {
        Validation.validate(Validation.isValidPrivateKey(privateKey), '创建钱包失败: 无效的私钥');
      }

      // 验证助记词格式
      if (mnemonic) {
        Validation.validate(Validation.isValidMnemonic(mnemonic), '创建钱包失败: 无效的助记词');
      }

      // 获取Provider
      let provider = options.provider;
      if (!provider) {
        provider = await Provider.create();
      } else {
        // 验证提供的Provider
        const isValid = await this.validateProvider(provider);
        if (!isValid) {
          Logger.warn('提供的Provider无效，将创建新的Provider实例');
          provider = await Provider.create();
        }
      }
      
      // 创建钱包实例
      let wallet;
      if (privateKey) {
        wallet = new ethers.Wallet(privateKey, provider);
      } else if (mnemonic) {
        wallet = ethers.Wallet.fromPhrase(mnemonic, provider);
      }

      Logger.info('钱包创建成功', { address: await wallet.getAddress() });
      return wallet;
    } catch (error) {
      Logger.error('创建钱包失败', { error: error.message, stack: error.stack });
      if (error instanceof WalletError) {
        throw error;
      }
      throw new WalletError(`创建钱包失败: ${error.message}`);
    }
  }

  /**
   * 获取账户余额
   * @param {ethers.Wallet} wallet - 钱包实例
   * @returns {Promise<string>} 账户余额（以 wei 为单位）
   */
  static async getBalance(wallet) {
    try {
      if (!Validation.isValidWallet(wallet)) {
        throw new WalletError('获取账户余额失败: 无效的钱包实例');
      }
      const balance = await wallet.getBalance();
      Logger.info('获取余额成功', { balance: balance.toString() });
      return balance;
    } catch (error) {
      throw new WalletError(`获取账户余额失败: ${error.message}`);
    }
  }

  /**
   * 发送交易
   * @param {ethers.Wallet} wallet - 钱包实例
   * @param {Object} transaction - 交易参数
   * @param {string} transaction.to - 接收地址
   * @param {string} transaction.value - 发送金额（以 wei 为单位）
   * @param {string} [transaction.data] - 交易数据
   * @param {Object} [transaction.gas] - Gas 参数
   * @returns {Promise<Object>} 交易结果
   */
  static async sendTransaction(wallet, transaction) {
    try {
      if (!Validation.isValidWallet(wallet)) {
        throw new WalletError('发送交易失败: 无效的钱包实例');
      }
      if (!Validation.isValidTransaction(transaction)) {
        throw new WalletError('发送交易失败: 无效的交易参数');
      }
      const tx = await wallet.sendTransaction(transaction);
      Logger.info('交易发送成功', { hash: tx.hash });
      return tx;
    } catch (error) {
      throw new WalletError(`发送交易失败: ${error.message}`);
    }
  }

  /**
   * 签名消息
   * @param {ethers.Wallet} wallet - 钱包实例
   * @param {string} message - 要签名的消息
   * @returns {Promise<string>} 签名结果
   */
  static async signMessage(wallet, message) {
    try {
      if (!Validation.isValidWallet(wallet)) {
        throw new WalletError('签名消息失败: 无效的钱包实例');
      }
      if (!Validation.isValidString(message)) {
        throw new WalletError('签名消息失败: 无效的消息');
      }
      const signature = await wallet.signMessage(message);
      Logger.info('消息签名成功', { signature });
      return signature;
    } catch (error) {
      throw new WalletError(`签名消息失败: ${error.message}`);
    }
  }

  /**
   * 验证签名
   * @param {ethers.Wallet} wallet - 钱包实例
   * @param {string} message - 消息
   * @param {string} signature - 签名
   * @returns {Promise<boolean>} 验证结果
   */
  static async verifyMessage(wallet, message, signature) {
    try {
      // 验证钱包实例
      if (!Validation.isValidWallet(wallet)) {
        throw new WalletError('验证签名失败: 无效的钱包实例');
      }

      // 验证消息
      if (!message) {
        throw new WalletError('验证签名失败: 无效的消息');
      }

      // 验证签名格式
      if (!signature || typeof signature !== 'string' || !signature.startsWith('0x') || signature.length !== 132) {
        throw new WalletError('验证签名失败: 无效的签名格式');
      }

      // 获取钱包地址
      const address = await wallet.getAddress();

      // 验证签名
      const recoveredAddress = await ethers.verifyMessage(message, signature);
      const isValid = address.toLowerCase() === recoveredAddress.toLowerCase();
      
      if (isValid) {
        Logger.info('签名验证成功', { address });
      }
      return isValid;
    } catch (error) {
      // 如果是我们的自定义错误，直接抛出
      if (error instanceof WalletError) {
        throw error;
      }
      // 其他错误统一处理
      throw new WalletError(`验证签名失败: ${error.message}`);
    }
  }

  /**
   * 导出私钥
   * @param {ethers.Wallet} wallet - 钱包实例
   * @returns {Promise<string>} 私钥
   */
  static async exportPrivateKey(wallet) {
    try {
      if (!Validation.isValidWallet(wallet)) {
        throw new WalletError('导出私钥失败: 无效的钱包实例');
      }
      const privateKey = wallet.privateKey;
      Logger.info('导出私钥成功');
      return privateKey;
    } catch (error) {
      throw new WalletError(`导出私钥失败: ${error.message}`);
    }
  }

  /**
   * 导出助记词
   * @param {ethers.Wallet} wallet - 钱包实例
   * @returns {Promise<string>} 助记词
   */
  static async exportMnemonic(wallet) {
    try {
      if (!Validation.isValidWallet(wallet)) {
        throw new WalletError('导出助记词失败: 无效的钱包实例');
      }
      if (!wallet.mnemonic) {
        throw new WalletError('导出助记词失败: 该钱包不是由助记词创建的');
      }
      const mnemonic = wallet.mnemonic.phrase;
      Logger.info('导出助记词成功');
      return mnemonic;
    } catch (error) {
      throw new WalletError(`导出助记词失败: ${error.message}`);
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