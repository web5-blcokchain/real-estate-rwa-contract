const { ethers } = require('ethers');
const { WalletError } = require('../utils/errors');
const Logger = require('../utils/logger');
const { Validation } = require('../utils/validation');
const EnvConfig = require('../config/env');
const Provider = require('./provider');

/**
 * Wallet 管理器类
 */
class Wallet {
  /**
   * 创建钱包实例
   * @param {Object} options - 配置选项
   * @param {string} [options.privateKey] - 私钥
   * @param {string} [options.mnemonic] - 助记词
   * @param {string} [options.path] - 派生路径
   * @param {Object} [options.provider] - Provider 实例
   * @returns {Promise<ethers.Wallet>} 钱包实例
   */
  static async create(options = {}) {
    try {
      const config = EnvConfig.getWalletConfig();
      const privateKey = options.privateKey || config.WALLET_PRIVATE_KEY;
      const mnemonic = options.mnemonic || config.WALLET_MNEMONIC;
      const path = options.path || config.WALLET_PATH;
      const provider = options.provider || Provider.create();

      let wallet;
      if (privateKey) {
        Validation.validate(
          Validation.isValidPrivateKey(privateKey),
          '无效的私钥'
        );
        wallet = new ethers.Wallet(privateKey, provider);
      } else if (mnemonic) {
        Validation.validate(
          Validation.isValidMnemonic(mnemonic),
          '无效的助记词'
        );
        wallet = ethers.Wallet.fromPhrase(mnemonic, path, provider);
      } else {
        throw new WalletError('必须提供私钥或助记词');
      }

      Logger.info(`钱包创建成功: ${wallet.address}`);
      return wallet;
    } catch (error) {
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
      const balance = await wallet.getBalance();
      Logger.debug(`账户余额: ${wallet.address} = ${balance.toString()} wei`);
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
      Validation.validate(
        Validation.isValidAddress(transaction.to),
        '无效的接收地址'
      );

      Validation.validate(
        Validation.isValidAmount(transaction.value),
        '无效的发送金额'
      );

      if (transaction.data) {
        Validation.validate(
          Validation.isValidHexString(transaction.data),
          '无效的交易数据'
        );
      }

      const tx = await wallet.sendTransaction(transaction);
      Logger.info(`交易已发送: ${tx.hash}`);
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
      Validation.validate(
        Validation.isValidString(message),
        '无效的消息内容'
      );

      const signature = await wallet.signMessage(message);
      Logger.debug(`消息签名成功: ${signature}`);
      return signature;
    } catch (error) {
      throw new WalletError(`签名消息失败: ${error.message}`);
    }
  }

  /**
   * 验证签名
   * @param {string} message - 原始消息
   * @param {string} signature - 签名
   * @returns {Promise<string>} 签名者地址
   */
  static async verifyMessage(message, signature) {
    try {
      Validation.validate(
        Validation.isValidString(message),
        '无效的消息内容'
      );

      Validation.validate(
        Validation.isValidSignature(signature),
        '无效的签名'
      );

      const address = ethers.verifyMessage(message, signature);
      Logger.debug(`签名验证成功: ${address}`);
      return address;
    } catch (error) {
      throw new WalletError(`验证签名失败: ${error.message}`);
    }
  }

  /**
   * 导出私钥
   * @param {ethers.Wallet} wallet - 钱包实例
   * @returns {string} 私钥
   */
  static exportPrivateKey(wallet) {
    try {
      const privateKey = wallet.privateKey;
      Logger.debug(`私钥导出成功: ${privateKey}`);
      return privateKey;
    } catch (error) {
      throw new WalletError(`导出私钥失败: ${error.message}`);
    }
  }

  /**
   * 导出助记词
   * @param {ethers.Wallet} wallet - 钱包实例
   * @returns {string} 助记词
   */
  static exportMnemonic(wallet) {
    try {
      const mnemonic = wallet.mnemonic;
      if (!mnemonic) {
        throw new WalletError('该钱包不是由助记词创建的');
      }
      Logger.debug(`助记词导出成功: ${mnemonic.phrase}`);
      return mnemonic.phrase;
    } catch (error) {
      throw new WalletError(`导出助记词失败: ${error.message}`);
    }
  }
}

module.exports = Wallet; 