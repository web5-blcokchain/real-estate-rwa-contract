/**
 * PropertyToken合约控制器
 * 提供代币余额查询、转移等功能的API实现
 */
const { ethers } = require('ethers');
const { Logger, WalletError } = require('../../../shared/src');
const { validateParams } = require('../utils');
const { isEthAddress, isNonEmptyString, isPositiveInteger, isPrivateKey } = require('../utils/validators');
const { callContractMethod, sendContractTransaction } = require('../utils/contract');

/**
 * 获取代币余额
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getTokenBalance(req, res, next) {
  try {
    const { propertyId, address } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { propertyId, address },
      [
        ['propertyId', isNonEmptyString],
        ['address', isEthAddress]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('获取代币余额', {
      propertyId,
      address
    });
    
    // 调用合约获取余额
    const balance = await callContractMethod(
      'PropertyToken',
      'balanceOf',
      [address, propertyId]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        address,
        balance: balance.toString()
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取代币总供应量
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getTotalSupply(req, res, next) {
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
    Logger.info('获取代币总供应量', {
      propertyId
    });
    
    // 调用合约获取总供应量
    const totalSupply = await callContractMethod(
      'PropertyToken',
      'totalSupply',
      [propertyId]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        totalSupply: totalSupply.toString()
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 转移代币
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function transferToken(req, res, next) {
  try {
    const { propertyId, to, amount, privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { propertyId, to, amount, privateKey },
      [
        ['propertyId', isNonEmptyString],
        ['to', isEthAddress],
        ['amount', isPositiveInteger],
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
    Logger.info('转移代币', {
      propertyId,
      to,
      amount,
      from: wallet.address
    });
    
    // 调用合约转移代币
    const receipt = await sendContractTransaction(
      'PropertyToken',
      'transfer',
      [to, propertyId, amount],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        from: wallet.address,
        to,
        amount,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 授权代币
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function approveToken(req, res, next) {
  try {
    const { propertyId, spender, amount, privateKey } = req.body;
    
    // 验证参数
    const validation = validateParams(
      { propertyId, spender, amount, privateKey },
      [
        ['propertyId', isNonEmptyString],
        ['spender', isEthAddress],
        ['amount', isPositiveInteger],
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
    Logger.info('授权代币', {
      propertyId,
      spender,
      amount,
      owner: wallet.address
    });
    
    // 调用合约授权代币
    const receipt = await sendContractTransaction(
      'PropertyToken',
      'approve',
      [spender, propertyId, amount],
      { wallet }
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        owner: wallet.address,
        spender,
        amount,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取授权额度
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getAllowance(req, res, next) {
  try {
    const { propertyId, owner, spender } = req.params;
    
    // 验证参数
    const validation = validateParams(
      { propertyId, owner, spender },
      [
        ['propertyId', isNonEmptyString],
        ['owner', isEthAddress],
        ['spender', isEthAddress]
      ]
    );
    
    if (!validation.isValid) {
      const error = new Error(Object.values(validation.errors).join(', '));
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }
    
    // 记录日志
    Logger.info('获取授权额度', {
      propertyId,
      owner,
      spender
    });
    
    // 调用合约获取授权额度
    const allowance = await callContractMethod(
      'PropertyToken',
      'allowance',
      [owner, spender, propertyId]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        owner,
        spender,
        allowance: allowance.toString()
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * 获取代币元数据
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function getTokenMetadata(req, res, next) {
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
    Logger.info('获取代币元数据', {
      propertyId
    });
    
    // 调用合约获取代币元数据
    const metadata = await callContractMethod(
      'PropertyToken',
      'getTokenMetadata',
      [propertyId]
    );
    
    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        propertyId,
        metadata
      }
    });
    
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTokenBalance,
  getTotalSupply,
  transferToken,
  approveToken,
  getAllowance,
  getTokenMetadata
}; 