const { ethers } = require('ethers');
const { WalletError } = require('../utils/errors');
const Validation = require('../utils/validation');
const Provider = require('./provider');
const Logger = require('../utils/logger');

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
      Logger.error(`创建钱包失败: ${error.message}`, { error });
      throw new WalletError(`创建钱包失败: ${error.message}`);
    }
  }

  /**
   * 创建管理员钱包
   * @param {Object} [provider] - Provider 实例
   * @returns {Promise<ethers.Wallet>} 管理员钱包实例
   * @throws {WalletError} 钱包错误
   */
  static async createAdmin(provider) {
    return this.createFromKeyType('ADMIN', provider);
  }

  /**
   * 创建操作员钱包
   * @param {Object} [provider] - Provider 实例
   * @returns {Promise<ethers.Wallet>} 操作员钱包实例
   * @throws {WalletError} 钱包错误
   */
  static async createOperator(provider) {
    return this.createFromKeyType('OPERATOR', provider);
  }

  /**
   * 创建管理者钱包
   * @param {Object} [provider] - Provider 实例
   * @returns {Promise<ethers.Wallet>} 管理者钱包实例
   * @throws {WalletError} 钱包错误
   */
  static async createManager(provider) {
    return this.createFromKeyType('MANAGER', provider);
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
      if (!keyType) {
        throw new WalletError('密钥类型不能为空');
      }
      
      // 获取私钥
      const privateKey = this._getPrivateKeyFromEnv(keyType);
      
      if (!privateKey) {
        throw new WalletError(`找不到密钥类型 ${keyType} 对应的私钥`);
      }
      
      return this.createFromPrivateKey(privateKey, provider);
    } catch (error) {
      Logger.error(`通过密钥类型创建钱包失败: ${error.message}`, { error, keyType });
      throw new WalletError(`通过密钥类型创建钱包失败: ${error.message}`);
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
    const possibleEnvVars = [
      `PRIVATE_KEY_${keyType.toUpperCase()}`,
      `${keyType.toUpperCase()}_PRIVATE_KEY`,
      keyType.toUpperCase()
    ];

    try {
      for (const envVar of possibleEnvVars) {
        if (process.env[envVar]) {
          Logger.debug(`找到密钥环境变量: ${envVar}`);
          // 格式化私钥
          let privateKey = process.env[envVar].trim();
          
          // 确保私钥以0x开头
          if (!privateKey.startsWith('0x')) {
            privateKey = `0x${privateKey}`;
          }
          
          // 验证私钥长度（应为66个字符，包括0x前缀）
          if (privateKey.length !== 66) {
            Logger.warn(`私钥格式不正确 (${envVar}): 长度 ${privateKey.length}，应为66`);
            
            // 尝试清理私钥（去除可能的引号或其他非法字符）
            privateKey = privateKey.replace(/[^0-9a-fA-F]/g, '');
            if (privateKey.length === 64) {
              privateKey = `0x${privateKey}`;
              Logger.debug(`已修复私钥格式: 长度现在为 ${privateKey.length}`);
            }
          }
          
          return privateKey;
        }
      }

      Logger.debug(`未找到${keyType}类型的私钥环境变量`);
      return null;
    } catch (error) {
      Logger.error(`获取私钥时出错: ${error.message}`);
      return null;
    }
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
      // 遍历环境变量，查找私钥
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('PRIVATE_KEY_') || key.endsWith('_PRIVATE_KEY')) {
          const name = key.startsWith('PRIVATE_KEY_')
            ? key.replace('PRIVATE_KEY_', '')
            : key.replace('_PRIVATE_KEY', '');
          
          accounts[name.toLowerCase()] = value;
        }
      }
      
      return accounts;
    } catch (error) {
      throw new WalletError(`获取所有账户失败: ${error.message}`);
    }
  }

  /**
   * 验证Provider
   * @param {Object} provider - Provider实例
   * @returns {Promise<boolean>} 是否有效
   */
  static async validateProvider(provider) {
    try {
      if (!provider) {
        throw new WalletError('Provider不能为空');
      }
      
      await provider.getNetwork();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = Wallet; 