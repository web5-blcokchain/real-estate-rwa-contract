/**
 * PropertyManager控制器
 * 提供资产管理相关API
 */
const { ethers } = require('ethers');
const { Logger } = require('../../../shared/src');
const validateParams = require('../utils/validateParams');
const { isEthAddress, isNonEmptyString, isPrivateKey } = require('../utils/validators');
const { callContractMethod, sendContractTransaction } = require('../utils/contract');

/**
 * 注册新资产
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function registerProperty(req, res, next) {
  try {
    const { 
      propertyId, 
      ownerAddress, 
      propertyData, 
      initialSupply, 
      privateKey 
    } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { propertyId, ownerAddress, propertyData, initialSupply, privateKey },
      [
        ['propertyId', isNonEmptyString],
        ['ownerAddress', isEthAddress],
        ['propertyData', isNonEmptyString],
        ['initialSupply', (val) => !isNaN(val) && parseInt(val) > 0],
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
    Logger.info('注册新资产', {
      propertyId,
      ownerAddress,
      initialSupply,
      from: wallet.address
    });
    
    // 调用合约注册资产
    const receipt = await sendContractTransaction(
      'PropertyManager',
      'registerProperty',
      [propertyId, ownerAddress, propertyData, initialSupply],
      { wallet }
    );
    
    // 返回结果
    return res.status(201).json({
      success: true,
      data: {
        propertyId,
        ownerAddress,
        initialSupply,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取资产信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getPropertyInfo(req, res, next) {
  try {
    const { propertyId } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { propertyId },
      [
        ['propertyId', isNonEmptyString]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('获取资产信息', { propertyId });
    
    // 调用合约获取资产信息
    const propertyInfo = await callContractMethod(
      'PropertyManager',
      'getPropertyInfo',
      [propertyId]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        propertyInfo
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 更新资产信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function updatePropertyInfo(req, res, next) {
  try {
    const { propertyId, propertyData, privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { propertyId, propertyData, privateKey },
      [
        ['propertyId', isNonEmptyString],
        ['propertyData', isNonEmptyString],
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
    Logger.info('更新资产信息', {
      propertyId,
      from: wallet.address
    });
    
    // 调用合约更新资产信息
    const receipt = await sendContractTransaction(
      'PropertyManager',
      'updatePropertyInfo',
      [propertyId, propertyData],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取所有资产ID
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getAllPropertyIds(req, res, next) {
  try {
    // 记录日志
    Logger.info('获取所有资产ID');
    
    // 调用合约获取所有资产ID
    const propertyIds = await callContractMethod(
      'PropertyManager',
      'getAllPropertyIds',
      []
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyIds
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 验证资产状态
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function verifyPropertyStatus(req, res, next) {
  try {
    const { propertyId } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { propertyId },
      [
        ['propertyId', isNonEmptyString]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('验证资产状态', { propertyId });
    
    // 调用合约验证资产状态
    const isActive = await callContractMethod(
      'PropertyManager',
      'isPropertyActive',
      [propertyId]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        isActive
      }
    });
    
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerProperty,
  getPropertyInfo,
  updatePropertyInfo,
  getAllPropertyIds,
  verifyPropertyStatus
}; 