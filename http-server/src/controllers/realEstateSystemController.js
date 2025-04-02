/**
 * RealEstateSystem合约控制器
 * 提供系统信息获取、参数管理等功能的API实现
 */
const { ethers } = require('ethers');
const { Logger } = require('../../../shared/src');
const { validateParams } = require('../utils');
const { isEthAddress, isNonEmptyString, isPrivateKey } = require('../utils/validators');
const { callContractMethod, sendContractTransaction } = require('../utils/contract');

/**
 * 获取系统信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getSystemInfo(req, res, next) {
  try {
    // 记录日志
    Logger.info('获取系统信息');
    
    // 调用合约获取系统信息
    const systemInfo = await callContractMethod(
      'RealEstateSystem',
      'getSystemInfo',
      []
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        systemInfo
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取所有合约地址
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getContractAddresses(req, res, next) {
  try {
    // 记录日志
    Logger.info('获取所有合约地址');
    
    // 调用合约获取各个合约地址
    const [
      propertyManager,
      roleManager,
      tradingManager,
      rewardManager,
      propertyToken
    ] = await Promise.all([
      callContractMethod('RealEstateSystem', 'getPropertyManagerAddress', []),
      callContractMethod('RealEstateSystem', 'getRoleManagerAddress', []),
      callContractMethod('RealEstateSystem', 'getTradingManagerAddress', []),
      callContractMethod('RealEstateSystem', 'getRewardManagerAddress', []),
      callContractMethod('RealEstateSystem', 'getPropertyTokenAddress', [])
    ]);
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyManager,
        roleManager,
        tradingManager,
        rewardManager,
        propertyToken
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取系统参数值
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getSystemParameter(req, res, next) {
  try {
    const { paramName } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { paramName },
      [
        ['paramName', isNonEmptyString]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('获取系统参数', {
      paramName
    });
    
    // 调用合约获取系统参数
    const paramValue = await callContractMethod(
      'RealEstateSystem',
      'getParameter',
      [paramName]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        paramName,
        paramValue
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 更新系统参数
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function updateSystemParameter(req, res, next) {
  try {
    const { paramName, paramValue, privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { paramName, paramValue, privateKey },
      [
        ['paramName', isNonEmptyString],
        ['paramValue', isNonEmptyString],
        ['privateKey', isPrivateKey]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    
    // 记录日志（敏感信息已隐藏）
    Logger.info('更新系统参数', {
      paramName,
      from: wallet.address
    });
    
    // 调用合约更新系统参数
    const receipt = await sendContractTransaction(
      'RealEstateSystem',
      'setParameter',
      [paramName, paramValue],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        paramName,
        paramValue,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        from: wallet.address
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 检查系统是否暂停
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function isSystemPaused(req, res, next) {
  try {
    // 记录日志
    Logger.info('检查系统是否暂停');
    
    // 调用合约检查系统是否暂停
    const isPaused = await callContractMethod(
      'RealEstateSystem',
      'paused',
      []
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        isPaused
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 暂停系统
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function pauseSystem(req, res, next) {
  try {
    const { privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { privateKey },
      [
        ['privateKey', isPrivateKey]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    
    // 记录日志（敏感信息已隐藏）
    Logger.info('暂停系统', {
      from: wallet.address
    });
    
    // 调用合约暂停系统
    const receipt = await sendContractTransaction(
      'RealEstateSystem',
      'pause',
      [],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        from: wallet.address,
        status: 'paused'
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 恢复系统
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function unpauseSystem(req, res, next) {
  try {
    const { privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { privateKey },
      [
        ['privateKey', isPrivateKey]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    
    // 记录日志（敏感信息已隐藏）
    Logger.info('恢复系统', {
      from: wallet.address
    });
    
    // 调用合约恢复系统
    const receipt = await sendContractTransaction(
      'RealEstateSystem',
      'unpause',
      [],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        from: wallet.address,
        status: 'unpaused'
      }
    });
    
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSystemInfo,
  getContractAddresses,
  getSystemParameter,
  updateSystemParameter,
  isSystemPaused,
  pauseSystem,
  unpauseSystem
}; 