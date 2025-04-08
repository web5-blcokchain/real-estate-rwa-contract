/**
 * 合约工具类模块
 * 提供智能合约交互相关的工具方法
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const Logger = require('../logger');
const Paths = require('../paths');
const EnvUtils = require('../env');
const AbiUtils = require('./abi');
const ProviderManager = require('./provider');
const WalletManager = require('./wallet');

/**
 * 合约工具类
 */
class ContractUtils {
  /**
   * 获取合约实例（基于控制器和角色）
   * @param {string} controllerName - 控制器名称
   * @param {string} [role='admin'] - 角色名称
   * @returns {ethers.Contract} 合约实例
   */
  static getContractForController(controllerName, role = 'admin') {
    try {
      if (!controllerName) {
        throw new Error('控制器名称不能为空');
      }
      
      // 从controllerName推断合约名称
      const contractName = controllerName.replace(/Controller$/, '');
      
      // 从环境变量获取合约地址
      const address = EnvUtils.getContractAddress(contractName);
      
      if (!address || address === '') {
        throw new Error(`未找到${contractName}的合约地址配置`);
      }
      
      // 获取ABI
      const abi = AbiUtils.getAbi(contractName);
      
      // 根据角色获取钱包
      const wallet = WalletManager.getRoleWallet(role);
      
      Logger.debug(`为控制器[${controllerName}]创建合约实例`, {
        contractName,
        contractAddress: address,
        role
      });
      
      return new ethers.Contract(address, abi, wallet);
    } catch (error) {
      Logger.error(`为控制器[${controllerName}]创建合约实例失败`, {
        role,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`为控制器[${controllerName}]创建合约实例失败: ${error.message}`);
    }
  }

  /**
   * 获取合约实例（使用默认钱包）
   * @param {string} contractName - 合约名称
   * @param {string} contractAddress - 合约地址
   * @returns {ethers.Contract} 合约实例
   */
  static getContract(contractName, contractAddress) {
    try {
      if (!contractName) {
        throw new Error('合约名称不能为空');
      }
      if (!contractAddress) {
        throw new Error('合约地址不能为空');
      }
      
      const abi = AbiUtils.getAbi(contractName);
      return new ethers.Contract(contractAddress, abi, WalletManager.getDefaultWallet());
    } catch (error) {
      Logger.error(`获取合约实例失败: ${contractName}`, { 
        address: contractAddress,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取合约实例（使用指定角色）
   * @param {string} contractName - 合约名称
   * @param {string} contractAddress - 合约地址
   * @param {string} role - 角色名称
   * @returns {ethers.Contract} 合约实例
   */
  static getContractWithRole(contractName, contractAddress, role) {
    try {
      if (!contractName) {
        throw new Error('合约名称不能为空');
      }
      if (!contractAddress) {
        throw new Error('合约地址不能为空');
      }
      if (!role) {
        throw new Error('角色名称不能为空');
      }
      
      const abi = AbiUtils.getAbi(contractName);
      const wallet = WalletManager.getRoleWallet(role);
      
      return new ethers.Contract(contractAddress, abi, wallet);
    } catch (error) {
      Logger.error(`获取合约实例失败: ${contractName}`, { 
        address: contractAddress,
        role,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取合约实例（使用指定钱包）
   * @param {string} contractName - 合约名称
   * @param {string} contractAddress - 合约地址
   * @param {string|ethers.Wallet} wallet - 钱包名称或实例
   * @returns {ethers.Contract} 合约实例
   */
  static getContractWithWallet(contractName, contractAddress, wallet) {
    try {
      if (!contractName) {
        throw new Error('合约名称不能为空');
      }
      if (!contractAddress) {
        throw new Error('合约地址不能为空');
      }
      if (!wallet) {
        throw new Error('钱包参数不能为空');
      }
      
      const abi = AbiUtils.getAbi(contractName);
      
      // 处理钱包参数
      let walletInstance;
      if (typeof wallet === 'string') {
        // 如果是字符串，视为钱包名称
        walletInstance = WalletManager.getCustomWallet(wallet);
      } else if (wallet.privateKey) {
        // 如果是钱包实例
        walletInstance = wallet;
      } else {
        throw new Error('无效的钱包参数');
      }
      
      return new ethers.Contract(contractAddress, abi, walletInstance);
    } catch (error) {
      Logger.error(`获取合约实例失败: ${contractName}`, { 
        address: contractAddress,
        wallet: typeof wallet === 'string' ? wallet : 'instance',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取只读合约实例（使用默认Provider）
   * @param {string} contractName - 合约名称
   * @param {string} contractAddress - 合约地址
   * @returns {ethers.Contract} 只读合约实例
   */
  static getReadonlyContract(contractName, contractAddress) {
    try {
      if (!contractName) {
        throw new Error('合约名称不能为空');
      }
      if (!contractAddress) {
        throw new Error('合约地址不能为空');
      }
      
      const abi = AbiUtils.getAbi(contractName);
      return new ethers.Contract(contractAddress, abi, ProviderManager.getDefaultProvider());
    } catch (error) {
      Logger.error(`获取只读合约实例失败: ${contractName}`, { 
        address: contractAddress,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取只读合约实例（使用指定Provider）
   * @param {string} contractName - 合约名称
   * @param {string} contractAddress - 合约地址
   * @param {string|ethers.Provider} provider - Provider名称或实例
   * @returns {ethers.Contract} 只读合约实例
   */
  static getReadonlyContractWithProvider(contractName, contractAddress, provider) {
    try {
      if (!contractName) {
        throw new Error('合约名称不能为空');
      }
      if (!contractAddress) {
        throw new Error('合约地址不能为空');
      }
      if (!provider) {
        throw new Error('Provider参数不能为空');
      }
      
      const abi = AbiUtils.getAbi(contractName);
      
      // 处理Provider参数
      let providerInstance;
      if (typeof provider === 'string') {
        // 如果是字符串，视为Provider名称
        providerInstance = ProviderManager.getNetworkProvider(provider);
      } else if (typeof provider.getBlockNumber === 'function') {
        // 如果是Provider实例
        providerInstance = provider;
      } else {
        throw new Error('无效的Provider参数');
      }
      
      return new ethers.Contract(contractAddress, abi, providerInstance);
    } catch (error) {
      Logger.error(`获取只读合约实例失败: ${contractName}`, { 
        address: contractAddress,
        provider: typeof provider === 'string' ? provider : 'instance',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 等待交易确认
   * @param {Object} tx - 交易对象
   * @param {number} [confirmations=2] - 确认区块数
   * @returns {Promise<Object>} 交易结果
   */
  static async waitForTransaction(tx, confirmations = 2) {
    try {
      if (!tx || !tx.hash) {
        throw new Error('无效的交易对象');
      }
      
      Logger.info('等待交易确认', { hash: tx.hash, confirmations });
      const receipt = await tx.wait(confirmations);
      
      Logger.info('交易已确认', { 
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      
      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        logs: receipt.logs,
        events: Object.keys(receipt.events || {})
      };
    } catch (error) {
      Logger.error('交易确认失败', { 
        hash: tx?.hash,
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * 解析单位
   * @param {string|number} value - 原始值
   * @param {number} [decimals=18] - 小数位数
   * @returns {bigint} 解析后的值
   */
  static parseUnits(value, decimals = 18) {
    try {
      return ethers.parseUnits(value.toString(), decimals);
    } catch (error) {
      Logger.error('数值转换失败', { 
        value, 
        decimals, 
        error: error.message 
      });
      throw new Error(`数值转换失败: ${error.message}`);
    }
  }

  /**
   * 格式化单位
   * @param {bigint|string} value - 原始值
   * @param {number} [decimals=18] - 小数位数
   * @returns {string} 格式化后的值
   */
  static formatUnits(value, decimals = 18) {
    try {
      return ethers.formatUnits(value, decimals);
    } catch (error) {
      Logger.error('数值转换失败', { 
        value,
        decimals, 
        error: error.message 
      });
      throw new Error(`数值转换失败: ${error.message}`);
    }
  }
  
  /**
   * 创建合约工厂
   * @param {string} contractName - 合约名称
   * @param {string|ethers.Wallet} [wallet] - 钱包名称或实例，不传则使用默认钱包
   * @returns {ethers.ContractFactory} 合约工厂
   */
  static createContractFactory(contractName, wallet) {
    try {
      if (!contractName) {
        throw new Error('合约名称不能为空');
      }
      
      const abi = AbiUtils.getAbi(contractName);
      
      // 尝试从artifacts获取bytecode
      let bytecode;
      try {
        const artifactsPath = path.join(Paths.ROOT, 'artifacts/contracts', 
          `${contractName}.sol/${contractName}.json`);
        if (fs.existsSync(artifactsPath)) {
          const contractJson = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
          bytecode = contractJson.bytecode;
        }
      } catch (error) {
        Logger.warn(`无法从artifacts获取bytecode: ${contractName}`, { error: error.message });
      }
      
      if (!bytecode) {
        throw new Error(`无法获取合约bytecode: ${contractName}`);
      }
      
      // 处理钱包参数
      let walletInstance;
      if (!wallet) {
        walletInstance = WalletManager.getDefaultWallet();
      } else if (typeof wallet === 'string') {
        walletInstance = WalletManager.getCustomWallet(wallet);
      } else {
        walletInstance = wallet;
      }
      
      return new ethers.ContractFactory(abi, bytecode, walletInstance);
    } catch (error) {
      Logger.error(`创建合约工厂失败: ${contractName}`, { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }
}

module.exports = ContractUtils; 