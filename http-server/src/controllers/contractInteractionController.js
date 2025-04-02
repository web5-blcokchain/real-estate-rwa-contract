/**
 * ContractInteraction控制器
 * 提供通用的合约交互功能
 */
const { ethers } = require('ethers');
const { Contract, Provider, Wallet, NetworkManager, Logger } = require('../../../shared/src');
const { validateParams } = require('../utils/validateParams');
const { callContractMethod, sendContractTransaction } = require('../utils/contract');

/**
 * 调用任意合约方法（只读）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function callContractReadMethod(req, res, next) {
  try {
    // 验证参数
    const { contractName, methodName, args = [] } = req.body;
    
    validateParams(
      { contractName, methodName },
      {
        contractName: { type: 'string', required: true },
        methodName: { type: 'string', required: true },
        args: { type: 'array', required: false }
      }
    );
    
    // 记录日志
    Logger.info('通用合约调用', { contractName, methodName, args });
    
    // 调用合约方法
    const result = await callContractMethod(contractName, methodName, args);
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    Logger.error('通用合约调用失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * 发送交易到任意合约方法
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function sendContractWriteTransaction(req, res, next) {
  try {
    // 验证参数
    const { contractName, methodName, args = [], privateKey } = req.body;
    
    validateParams(
      { contractName, methodName, privateKey },
      {
        contractName: { type: 'string', required: true },
        methodName: { type: 'string', required: true },
        args: { type: 'array', required: false },
        privateKey: { type: 'string', required: true }
      }
    );
    
    // 记录日志（不记录私钥）
    Logger.info('通用合约交易', { contractName, methodName, args });
    
    // 发送交易
    const result = await sendContractTransaction(contractName, methodName, args, privateKey);
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed.toString()
      }
    });
    
  } catch (error) {
    Logger.error('通用合约交易失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * 获取合约ABI
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getContractAbi(req, res, next) {
  try {
    // 验证参数
    const { contractName } = req.params;
    
    validateParams(
      { contractName },
      {
        contractName: { type: 'string', required: true }
      }
    );
    
    // 记录日志
    Logger.info('获取合约ABI', { contractName });
    
    // 获取合约ABI
    const abi = await Contract.getAbi(contractName);
    
    if (!abi) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `找不到合约 ${contractName} 的ABI`
      });
    }
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: abi
    });
    
  } catch (error) {
    Logger.error('获取合约ABI失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * 获取网络信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getNetworkInfo(req, res, next) {
  try {
    // 记录日志
    Logger.info('获取网络信息');
    
    // 获取活动网络信息
    const networkInfo = await NetworkManager.getActiveNetwork();
    
    if (!networkInfo) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: '找不到活动网络信息'
      });
    }
    
    // 获取提供者
    const provider = await Provider.getProvider(networkInfo);
    
    // 获取网络详情
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getGasPrice();
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        name: networkInfo.name,
        chainId: network.chainId,
        blockNumber,
        gasPrice: gasPrice.toString(),
        rpcUrl: networkInfo.url,
        explorer: networkInfo.explorer
      }
    });
    
  } catch (error) {
    Logger.error('获取网络信息失败', { error: error.message, stack: error.stack });
    next(error);
  }
}

module.exports = {
  callContractReadMethod,
  sendContractWriteTransaction,
  getContractAbi,
  getNetworkInfo
}; 