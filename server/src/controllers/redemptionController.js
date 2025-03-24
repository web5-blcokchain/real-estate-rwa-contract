const RedemptionManagerService = require('../services/redemptionManagerService');
const RealEstateTokenService = require('../services/realEstateTokenService');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 赎回控制器
 * 处理赎回相关的HTTP请求
 */
class RedemptionController {
  /**
   * 批准赎回请求
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async approveRedemption(req, res, next) {
    try {
      const { requestId } = req.params;
      const { stablecoin, amount } = req.body;
      
      // 验证参数
      if (!stablecoin || !amount) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 验证地址格式
      if (!ethers.utils.isAddress(stablecoin)) {
        throw new ApiError(400, '无效的稳定币地址');
      }
      
      // 检查稳定币是否被支持
      const isSupported = await RedemptionManagerService.isSupportedStablecoin(stablecoin);
      if (!isSupported) {
        throw new ApiError(400, '不支持的稳定币地址');
      }
      
      const receipt = await RedemptionManagerService.approveRedemption(requestId, stablecoin, amount);
      
      res.status(200).json({
        success: true,
        data: {
          message: '赎回请求已批准',
          transactionHash: receipt.transactionHash,
          requestId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 拒绝赎回请求
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async rejectRedemption(req, res, next) {
    try {
      const { requestId } = req.params;
      
      const receipt = await RedemptionManagerService.rejectRedemption(requestId);
      
      res.status(200).json({
        success: true,
        data: {
          message: '赎回请求已拒绝',
          transactionHash: receipt.transactionHash,
          requestId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 完成赎回请求
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async completeRedemption(req, res, next) {
    try {
      const { requestId } = req.params;
      
      const receipt = await RedemptionManagerService.completeRedemption(requestId);
      
      res.status(200).json({
        success: true,
        data: {
          message: '赎回请求已完成',
          transactionHash: receipt.transactionHash,
          requestId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 添加支持的稳定币
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async addSupportedStablecoin(req, res, next) {
    try {
      const { stablecoin } = req.body;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(stablecoin)) {
        throw new ApiError(400, '无效的稳定币地址');
      }
      
      const receipt = await RedemptionManagerService.addSupportedStablecoin(stablecoin);
      
      res.status(200).json({
        success: true,
        data: {
          message: '稳定币已添加到支持列表',
          transactionHash: receipt.transactionHash,
          stablecoin
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 移除支持的稳定币
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async removeSupportedStablecoin(req, res, next) {
    try {
      const { stablecoin } = req.params;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(stablecoin)) {
        throw new ApiError(400, '无效的稳定币地址');
      }
      
      const receipt = await RedemptionManagerService.removeSupportedStablecoin(stablecoin);
      
      res.status(200).json({
        success: true,
        data: {
          message: '稳定币已从支持列表移除',
          transactionHash: receipt.transactionHash,
          stablecoin
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 紧急提款
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async emergencyWithdraw(req, res, next) {
    try {
      const { token, amount, to } = req.body;
      
      // 验证参数
      if (!token || !amount || !to) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 验证地址格式
      if (!ethers.utils.isAddress(token) || !ethers.utils.isAddress(to)) {
        throw new ApiError(400, '无效的地址');
      }
      
      const receipt = await RedemptionManagerService.emergencyWithdraw(token, amount, to);
      
      res.status(200).json({
        success: true,
        data: {
          message: '紧急提款成功',
          transactionHash: receipt.transactionHash,
          token,
          amount,
          to
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取赎回请求详情
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getRedemptionRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      
      const request = await RedemptionManagerService.getRedemptionRequest(requestId);
      
      if (!request) {
        throw new ApiError(404, '找不到赎回请求');
      }
      
      // 如果有代币地址，获取代币信息
      let tokenInfo = null;
      if (ethers.utils.isAddress(request.token)) {
        try {
          const tokenService = new RealEstateTokenService(request.token);
          tokenInfo = await tokenService.getTokenInfo();
        } catch (error) {
          console.warn(`获取代币信息失败: ${error.message}`);
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          ...request,
          tokenInfo
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取所有赎回请求
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getAllRedemptionRequests(req, res, next) {
    try {
      const requests = await RedemptionManagerService.getAllRedemptionRequests();
      
      // 获取所有代币信息（并行处理）
      const tokenAddresses = [...new Set(requests.map(r => r.token).filter(addr => ethers.utils.isAddress(addr)))];
      
      const tokenInfoMap = {};
      await Promise.all(
        tokenAddresses.map(async (address) => {
          try {
            const tokenService = new RealEstateTokenService(address);
            tokenInfoMap[address] = await tokenService.getTokenInfo();
          } catch (error) {
            console.warn(`获取代币 ${address} 信息失败: ${error.message}`);
          }
        })
      );
      
      // 将代币信息添加到请求中
      const enrichedRequests = requests.map(request => ({
        ...request,
        tokenInfo: tokenInfoMap[request.token] || null
      }));
      
      res.status(200).json({
        success: true,
        data: enrichedRequests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 检查稳定币是否被支持
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async isSupportedStablecoin(req, res, next) {
    try {
      const { stablecoin } = req.params;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(stablecoin)) {
        throw new ApiError(400, '无效的稳定币地址');
      }
      
      const isSupported = await RedemptionManagerService.isSupportedStablecoin(stablecoin);
      
      res.status(200).json({
        success: true,
        data: {
          stablecoin,
          isSupported
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RedemptionController; 