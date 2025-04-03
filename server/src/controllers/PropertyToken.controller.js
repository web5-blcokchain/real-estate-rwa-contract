/**
 * PropertyToken合约控制器
 * 直接代理PropertyToken.json ABI文件中的所有方法
 */
const { Contract, Wallet, Provider, Logger, ErrorHandler, Validation } = require('../../../shared/src');
const { validateParams } = require('../utils');
const { success, error } = require('../utils/apiResponse');
const { HTTP_STATUS, ERROR_CODES } = require('../constants');
const { blockchainService } = require('../services');
const contractService = require('../services/contract.service');

// 合约名称
const CONTRACT_NAME = 'PropertyToken';

// 合约实例
let contractInstance = null;

/**
 * 初始化合约实例
 */
async function initContract() {
  try {
    if (!contractInstance) {
      // 使用合约服务获取合约实例
      contractInstance = await contractService.getContractInstance(CONTRACT_NAME);
      Logger.info(`${CONTRACT_NAME}合约初始化成功`, { 
        address: await Contract.getAddress(contractInstance) 
      });
    }
    return contractInstance;
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'contract',
      context: { method: 'initContract', contractName: CONTRACT_NAME }
    });
    Logger.error(`${CONTRACT_NAME}合约初始化失败: ${handledError.message}`, { error: handledError });
    throw handledError;
  }
}

/**
 * 处理合约返回结果
 * @param {any} result - 合约调用结果
 * @returns {any} - 处理后的结果
 */
function processContractResult(result) {
  // 如果是数组
  if (Array.isArray(result)) {
    return result.map(item => processContractResult(item));
  }
  
  // 如果是对象
  if (result && typeof result === 'object') {
    // 检查是否是BigNumber
    if (result._isBigNumber || result._hex !== undefined) {
      return result.toString();
    }
    
    // 普通对象
    const processed = {};
    for (const key of Object.keys(result)) {
      // 忽略数字索引，处理命名属性
      if (isNaN(parseInt(key))) {
        processed[key] = processContractResult(result[key]);
      }
    }
    return processed;
  }
  
  // 原始类型直接返回
  return result;
}

/**
 * 获取合约地址
 */
async function getContractAddress(req, res) {
  try {
    // 使用合约服务获取地址
    const address = await contractService.getAddressByName(CONTRACT_NAME);
    
    if (!address) {
      const notFoundError = new Error(`未找到${CONTRACT_NAME}合约地址`);
      notFoundError.code = ERROR_CODES.CONTRACT_NOT_FOUND;
      notFoundError.statusCode = HTTP_STATUS.NOT_FOUND;
      return error(res, notFoundError, HTTP_STATUS.NOT_FOUND);
    }
    
    return success(res, { address });
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'contract',
      context: { method: 'getContractAddress', contractName: CONTRACT_NAME }
    });
    Logger.error(`获取${CONTRACT_NAME}合约地址失败: ${handledError.message}`, { error: handledError });
    return error(res, handledError, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * name - 获取代币名称
 */
async function name(req, res) {
  try {
    const contract = await initContract();
    const result = await Contract.call(contract, 'name');
    return success(res, result);
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'contract',
      context: { method: 'name', contractName: CONTRACT_NAME }
    });
    Logger.error(`调用${CONTRACT_NAME}.name失败: ${handledError.message}`, { error: handledError });
    return error(res, handledError, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * symbol - 获取代币符号
 */
async function symbol(req, res) {
  try {
    const contract = await initContract();
    const result = await Contract.call(contract, 'symbol');
    return success(res, result);
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'contract',
      context: { method: 'symbol', contractName: CONTRACT_NAME }
    });
    Logger.error(`调用${CONTRACT_NAME}.symbol失败: ${handledError.message}`, { error: handledError });
    return error(res, handledError, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * balanceOf - 查询余额
 */
async function balanceOf(req, res) {
  try {
    const { account } = req.query;
    
    // 验证参数
    validateParams(
      { account },
      {
        account: { type: 'string', required: true, format: 'address' }
      }
    );
    
    const contract = await initContract();
    const result = await Contract.call(contract, 'balanceOf', [account]);
    return success(res, processContractResult(result));
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'contract',
      context: { method: 'balanceOf', contractName: CONTRACT_NAME, account: req.query.account }
    });
    Logger.error(`调用${CONTRACT_NAME}.balanceOf失败: ${handledError.message}`, { error: handledError });
    return error(res, handledError, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * totalSupply - 获取总供应量
 */
async function totalSupply(req, res) {
  try {
    const contract = await initContract();
    const result = await Contract.call(contract, 'totalSupply');
    return success(res, processContractResult(result));
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'contract',
      context: { method: 'totalSupply', contractName: CONTRACT_NAME }
    });
    Logger.error(`调用${CONTRACT_NAME}.totalSupply失败: ${handledError.message}`, { error: handledError });
    return error(res, handledError, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * transfer - 转账
 */
async function transfer(req, res) {
  try {
    const { to, amount } = req.body;
    
    // 验证参数
    validateParams(
      { to, amount },
      {
        to: { type: 'string', required: true, format: 'address' },
        amount: { type: 'string', required: true }
      }
    );
    
    // 获取私钥
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    
    // 验证私钥
    Validation.validate(
      Validation.isNotEmpty(privateKey),
      '未配置区块链私钥，无法发送交易'
    );
    
    // 获取合约实例
    const contract = await contractService.getContractInstance(CONTRACT_NAME);
    
    // 创建钱包
    const provider = await blockchainService.provider;
    const wallet = await Wallet.create({
      privateKey,
      provider
    });
    
    // 发送交易
    const tx = await Contract.send(contract, 'transfer', [to, amount], { signer: wallet });
    
    // 等待交易确认
    Logger.info(`交易已提交: ${tx.hash}`, { method: 'transfer' });
    const receipt = await Provider.waitForTransaction(provider, tx.hash);
    
    return success(res, {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });
  } catch (err) {
    const handledError = ErrorHandler.handle(err, {
      type: 'contract',
      context: { 
        method: 'transfer', 
        contractName: CONTRACT_NAME,
        to: req.body.to
      }
    });
    Logger.error(`调用${CONTRACT_NAME}.transfer失败: ${handledError.message}`, { error: handledError });
    return error(res, handledError, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * 其他PropertyToken合约特有方法...
 */

// 导出所有方法
module.exports = {
  getContractAddress,
  name,
  symbol,
  balanceOf,
  totalSupply,
  transfer,
  // 其他方法...
}; 