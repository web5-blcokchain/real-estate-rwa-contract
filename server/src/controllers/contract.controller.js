/**
 * 合约相关控制器
 */
const { Logger, ErrorHandler } = require('../../../shared/src');
const { validateParams } = require('../utils');
const contractService = require('../services/contract.service');

/**
 * 获取所有合约的ABI
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getAllABI(req, res, next) {
  try {
    const abis = await contractService.getAllABI();
    res.json({
      success: true,
      data: abis
    });
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'api',
      context: {
        method: 'getAllABI'
      }
    });
    Logger.error('获取所有合约ABI失败', { error: handledError });
    next(handledError);
  }
}

/**
 * 根据合约名称获取ABI
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getABIByName(req, res, next) {
  try {
    const { contractName } = req.params;
    
    // 验证参数
    validateParams(
      { contractName },
      {
        contractName: { type: 'string', required: true }
      }
    );
    
    const abi = await contractService.getABIByName(contractName);
    
    if (!abi) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: `合约 ${contractName} 不存在或未配置`
        }
      });
    }
    
    res.json({
      success: true,
      data: abi
    });
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'api',
      context: {
        method: 'getABIByName',
        contractName: req.params.contractName
      }
    });
    Logger.error(`获取合约 ${req.params.contractName} 的ABI失败`, { error: handledError });
    next(handledError);
  }
}

/**
 * 获取所有合约地址
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getAllAddresses(req, res, next) {
  try {
    const addresses = await contractService.getAllAddresses();
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'api',
      context: {
        method: 'getAllAddresses'
      }
    });
    Logger.error('获取所有合约地址失败', { error: handledError });
    next(handledError);
  }
}

/**
 * 根据合约名称获取地址
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getAddressByName(req, res, next) {
  try {
    const { contractName } = req.params;
    
    // 验证参数
    validateParams(
      { contractName },
      {
        contractName: { type: 'string', required: true }
      }
    );
    
    const address = await contractService.getAddressByName(contractName);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: `合约 ${contractName} 不存在或未配置`
        }
      });
    }
    
    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    const handledError = ErrorHandler.handle(error, {
      type: 'api',
      context: {
        method: 'getAddressByName',
        contractName: req.params.contractName
      }
    });
    Logger.error(`获取合约 ${req.params.contractName} 的地址失败`, { error: handledError });
    next(handledError);
  }
}

module.exports = {
  getAllABI,
  getABIByName,
  getAllAddresses,
  getAddressByName
}; 