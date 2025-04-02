/**
 * 合约交互工具
 * 通过shared模块与区块链合约交互
 */
const { Contract, Provider, Wallet, Logger } = require('../../../shared/src');

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
    
    // 创建合约实例
    const provider = await Provider.create();
    const contract = await Contract.create({
      name: contractName,
      provider
    });
    
    // 调用合约方法
    const result = await Contract.call(contract, methodName, args);
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
    
    // 创建合约实例
    const provider = await Provider.create();
    let wallet;
    
    if (options.wallet) {
      // 使用传入的钱包
      wallet = options.wallet;
      wallet.connect(provider);
    } else if (options.privateKey) {
      // 使用私钥创建钱包
      wallet = await Wallet.create({
        privateKey: options.privateKey,
        provider
      });
    } else {
      throw new Error('未提供钱包或私钥');
    }
    
    // 创建已连接钱包的合约实例
    const contract = await Contract.create({
      name: contractName,
      provider,
      signer: wallet
    });
    
    // 发送交易
    const receipt = await Contract.send(contract, methodName, args, {
      gasLimit: options.gasLimit,
      gasPrice: options.gasPrice
    });
    
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