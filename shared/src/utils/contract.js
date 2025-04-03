/**
 * 合约交互工具
 * 通过shared模块与区块链合约交互
 */
const { ethers } = require('ethers');
const { Logger } = require('./logger');
const { Config } = require('../config');
const { Provider, Wallet } = require('../core');

/**
 * 调用合约只读方法
 * @param {string} contractName - 合约名称
 * @param {string} methodName - 方法名称
 * @param {Array} args - 参数数组
 * @returns {Promise<any>} - 返回合约调用结果
 */
async function callContractMethod(contractName, methodName, args = []) {
  try {
    Logger.info('调用合约方法', { 
      contractName, 
      methodName, 
      args: JSON.stringify(args) 
    });
    
    // 创建Provider
    const provider = await Provider.create();
    
    // 获取合约地址和ABI
    const contractConfig = Config.getContractConfig(contractName);
    if (!contractConfig || !contractConfig.address || !contractConfig.abi) {
      throw new Error(`找不到合约配置: ${contractName}`);
    }
    
    // 创建合约实例
    const contract = new ethers.Contract(
      contractConfig.address,
      contractConfig.abi,
      provider
    );
    
    // 调用合约方法
    const result = await contract[methodName](...args);
    return result;
  } catch (error) {
    Logger.error('调用合约方法失败', {
      contractName,
      methodName,
      args: JSON.stringify(args),
      error: error.message
    });
    throw error;
  }
}

/**
 * 发送合约交易
 * @param {string} contractName - 合约名称
 * @param {string} methodName - 方法名称
 * @param {Array} args - 参数数组
 * @param {Object} options - 选项
 * @param {Object} options.wallet - 钱包实例
 * @returns {Promise<any>} - 返回交易回执
 */
async function sendContractTransaction(contractName, methodName, args = [], options = {}) {
  try {
    Logger.info('发送合约交易', { 
      contractName, 
      methodName, 
      args: JSON.stringify(args) 
    });
    
    // 创建Provider
    const provider = await Provider.create();
    
    // 获取合约地址和ABI
    const contractConfig = Config.getContractConfig(contractName);
    if (!contractConfig || !contractConfig.address || !contractConfig.abi) {
      throw new Error(`找不到合约配置: ${contractName}`);
    }
    
    // 获取钱包
    let wallet;
    if (options.wallet) {
      // 使用传入的钱包
      wallet = options.wallet;
      wallet = wallet.connect(provider);
    } else if (options.privateKey) {
      // 使用私钥创建钱包
      wallet = new ethers.Wallet(options.privateKey, provider);
    } else {
      throw new Error('未提供钱包或私钥');
    }
    
    // 创建合约实例
    const contract = new ethers.Contract(
      contractConfig.address,
      contractConfig.abi,
      wallet
    );
    
    // 构建交易选项
    const txOptions = {};
    if (options.gasLimit) txOptions.gasLimit = options.gasLimit;
    if (options.gasPrice) txOptions.gasPrice = options.gasPrice;
    
    // 发送交易
    const tx = await contract[methodName](...args, txOptions);
    const receipt = await tx.wait();
    
    return receipt;
  } catch (error) {
    Logger.error('发送合约交易失败', {
      contractName,
      methodName,
      args: JSON.stringify(args),
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  callContractMethod,
  sendContractTransaction
}; 