const TokenFactoryService = require('../services/tokenFactoryService');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 代币控制器
 * 处理与代币相关的HTTP请求
 */
class TokenController {
  /**
   * 创建房产代币
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @param {Function} next Express下一个中间件函数
   */
  static async createToken(req, res, next) {
    try {
      const {
        propertyId,
        name,
        symbol,
        decimals,
        maxSupply,
        initialSupply,
        initialHolder
      } = req.body;

      // 验证必要参数
      if (!propertyId || !name || !symbol || !maxSupply || !initialSupply || !initialHolder) {
        throw ApiError.badRequest('Missing required parameters');
      }

      // 验证地址格式
      if (!ethers.isAddress(initialHolder)) {
        throw ApiError.badRequest('Invalid initial holder address');
      }

      const result = await TokenFactoryService.createToken(
        propertyId,
        name,
        symbol,
        decimals || 18,
        maxSupply,
        initialSupply,
        initialHolder
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取房产对应的代币地址
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @param {Function} next Express下一个中间件函数
   */
  static async getPropertyToken(req, res, next) {
    try {
      const { propertyId } = req.params;

      if (!propertyId) {
        throw ApiError.badRequest('Property ID is required');
      }

      const tokenAddress = await TokenFactoryService.getRealEstateToken(propertyId);

      res.json({
        success: true,
        data: {
          propertyId,
          tokenAddress
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取所有已创建的代币
   * @param {Object} req Express请求对象
   * @param {Object} res Express响应对象
   * @param {Function} next Express下一个中间件函数
   */
  static async getAllTokens(req, res, next) {
    try {
      const tokens = await TokenFactoryService.getAllTokens();

      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新代币实现合约地址
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async updateTokenImplementation(req, res, next) {
    try {
      const { newImplementation } = req.body;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(newImplementation)) {
        throw new ApiError(400, '无效的实现合约地址');
      }
      
      const receipt = await TokenFactoryService.updateTokenImplementation(newImplementation);
      
      res.status(200).json({
        success: true,
        data: {
          message: '代币实现合约更新成功',
          transactionHash: receipt.transactionHash,
          newImplementation
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取代币实现合约地址
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getTokenImplementation(req, res, next) {
    try {
      const implementation = await TokenFactoryService.getTokenImplementation();
      
      res.status(200).json({
        success: true,
        data: {
          implementation
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 添加地址到白名单
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async addToWhitelist(req, res, next) {
    try {
      const { tokenAddress } = req.params;
      const { account } = req.body;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(account)) {
        throw new ApiError(400, '无效的账户地址');
      }
      
      const service = new RealEstateTokenService(tokenAddress);
      const receipt = await service.addToWhitelist(account);
      
      res.status(200).json({
        success: true,
        data: {
          message: '账户已添加到白名单',
          transactionHash: receipt.transactionHash,
          tokenAddress,
          account
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量添加地址到白名单
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async batchAddToWhitelist(req, res, next) {
    try {
      const { tokenAddress } = req.params;
      const { accounts } = req.body;
      
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new ApiError(400, '无效的账户地址列表');
      }
      
      // 验证地址列表
      for (const account of accounts) {
        if (!ethers.utils.isAddress(account)) {
          throw new ApiError(400, `无效的账户地址: ${account}`);
        }
      }
      
      const service = new RealEstateTokenService(tokenAddress);
      const receipt = await service.batchAddToWhitelist(accounts);
      
      res.status(200).json({
        success: true,
        data: {
          message: '批量添加白名单成功',
          transactionHash: receipt.transactionHash,
          tokenAddress,
          accountCount: accounts.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 从白名单移除地址
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async removeFromWhitelist(req, res, next) {
    try {
      const { tokenAddress } = req.params;
      const { account } = req.body;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(account)) {
        throw new ApiError(400, '无效的账户地址');
      }
      
      const service = new RealEstateTokenService(tokenAddress);
      const receipt = await service.removeFromWhitelist(account);
      
      res.status(200).json({
        success: true,
        data: {
          message: '账户已从白名单移除',
          transactionHash: receipt.transactionHash,
          tokenAddress,
          account
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量从白名单移除地址
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async batchRemoveFromWhitelist(req, res, next) {
    try {
      const { tokenAddress } = req.params;
      const { accounts } = req.body;
      
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new ApiError(400, '无效的账户地址列表');
      }
      
      // 验证地址列表
      for (const account of accounts) {
        if (!ethers.utils.isAddress(account)) {
          throw new ApiError(400, `无效的账户地址: ${account}`);
        }
      }
      
      const service = new RealEstateTokenService(tokenAddress);
      const receipt = await service.batchRemoveFromWhitelist(accounts);
      
      res.status(200).json({
        success: true,
        data: {
          message: '批量移除白名单成功',
          transactionHash: receipt.transactionHash,
          tokenAddress,
          accountCount: accounts.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 检查账户是否在白名单中
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async isWhitelisted(req, res, next) {
    try {
      const { tokenAddress, account } = req.params;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(account)) {
        throw new ApiError(400, '无效的账户地址');
      }
      
      const service = new RealEstateTokenService(tokenAddress);
      const isWhitelisted = await service.isWhitelisted(account);
      
      res.status(200).json({
        success: true,
        data: {
          tokenAddress,
          account,
          isWhitelisted
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TokenController; 