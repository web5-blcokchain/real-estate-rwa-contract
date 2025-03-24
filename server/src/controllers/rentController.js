const RentDistributorService = require('../services/rentDistributorService');
const RealEstateTokenService = require('../services/realEstateTokenService');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 租金控制器
 * 处理租金分配相关的HTTP请求
 */
class RentController {
  /**
   * 分配租金
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async distributeRent(req, res, next) {
    try {
      const { 
        tokenAddress, 
        amount, 
        snapshotId, 
        propertyId, 
        rentPeriodStart, 
        rentPeriodEnd, 
        description 
      } = req.body;
      
      // 验证参数
      if (!tokenAddress || !amount || !propertyId || !rentPeriodStart || !rentPeriodEnd) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 验证地址格式
      if (!ethers.utils.isAddress(tokenAddress)) {
        throw new ApiError(400, '无效的代币地址');
      }
      
      // 验证日期
      if (new Date(rentPeriodEnd) <= new Date(rentPeriodStart)) {
        throw new ApiError(400, '租期结束时间必须晚于开始时间');
      }
      
      const receipt = await RentDistributorService.distributeRent(
        tokenAddress,
        amount,
        snapshotId || 0, // 如果未提供快照ID，则使用0（最新状态）
        propertyId,
        Math.floor(new Date(rentPeriodStart).getTime() / 1000), // 转为 Unix 时间戳
        Math.floor(new Date(rentPeriodEnd).getTime() / 1000),
        description || ''
      );
      
      res.status(200).json({
        success: true,
        data: {
          message: '租金分配成功',
          transactionHash: receipt.transactionHash,
          tokenAddress,
          amount,
          propertyId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 清算未领取的租金
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async liquidateUnclaimedRent(req, res, next) {
    try {
      const { distributionId } = req.params;
      
      const receipt = await RentDistributorService.liquidateUnclaimedRent(distributionId);
      
      res.status(200).json({
        success: true,
        data: {
          message: '未领取租金清算成功',
          transactionHash: receipt.transactionHash,
          distributionId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取租金分配记录
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getRentDistribution(req, res, next) {
    try {
      const { distributionId } = req.params;
      
      const distribution = await RentDistributorService.getRentDistribution(distributionId);
      
      if (!distribution) {
        throw new ApiError(404, '找不到租金分配记录');
      }
      
      // 获取代币信息
      let tokenInfo = null;
      if (ethers.utils.isAddress(distribution.token)) {
        try {
          const tokenService = new RealEstateTokenService(distribution.token);
          tokenInfo = await tokenService.getTokenInfo();
        } catch (error) {
          console.warn(`获取代币信息失败: ${error.message}`);
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          ...distribution,
          tokenInfo
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取所有租金分配记录
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getAllDistributions(req, res, next) {
    try {
      const distributions = await RentDistributorService.getAllDistributions();
      
      // 获取所有代币信息（并行处理）
      const tokenAddresses = [...new Set(distributions.map(r => r.token).filter(addr => ethers.utils.isAddress(addr)))];
      
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
      
      // 将代币信息添加到分配记录中
      const enrichedDistributions = distributions.map(distribution => ({
        ...distribution,
        tokenInfo: tokenInfoMap[distribution.token] || null
      }));
      
      res.status(200).json({
        success: true,
        data: enrichedDistributions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取可领取的租金
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getClaimableRent(req, res, next) {
    try {
      const { distributionId, account } = req.params;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(account)) {
        throw new ApiError(400, '无效的账户地址');
      }
      
      const claimableAmount = await RentDistributorService.viewClaimableRent(distributionId, account);
      const hasClaimedRent = await RentDistributorService.hasClaimedRent(distributionId, account);
      
      // 获取分配记录以提供更多信息
      const distribution = await RentDistributorService.getRentDistribution(distributionId);
      
      res.status(200).json({
        success: true,
        data: {
          distributionId,
          account,
          claimableAmount,
          hasClaimedRent,
          distribution: distribution || null
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * 按属性ID获取租金分配记录
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getDistributionsByPropertyId(req, res, next) {
    try {
      const { propertyId } = req.params;
      
      // 首先获取所有分配记录
      const allDistributions = await RentDistributorService.getAllDistributions();
      
      // 过滤出指定属性ID的记录
      const propertyDistributions = allDistributions.filter(
        dist => dist.propertyId === propertyId
      );
      
      // 获取相关代币信息
      const tokenAddresses = [...new Set(propertyDistributions.map(r => r.token).filter(addr => ethers.utils.isAddress(addr)))];
      
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
      
      // 将代币信息添加到分配记录中
      const enrichedDistributions = propertyDistributions.map(distribution => ({
        ...distribution,
        tokenInfo: tokenInfoMap[distribution.token] || null
      }));
      
      res.status(200).json({
        success: true,
        data: enrichedDistributions
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * 按代币地址获取租金分配记录
   * @param {object} req 请求对象
   * @param {object} res 响应对象
   * @param {function} next 下一个中间件
   */
  static async getDistributionsByToken(req, res, next) {
    try {
      const { tokenAddress } = req.params;
      
      // 验证地址格式
      if (!ethers.utils.isAddress(tokenAddress)) {
        throw new ApiError(400, '无效的代币地址');
      }
      
      // 首先获取所有分配记录
      const allDistributions = await RentDistributorService.getAllDistributions();
      
      // 过滤出指定代币地址的记录
      const tokenDistributions = allDistributions.filter(
        dist => dist.token.toLowerCase() === tokenAddress.toLowerCase()
      );
      
      // 获取代币信息
      let tokenInfo = null;
      try {
        const tokenService = new RealEstateTokenService(tokenAddress);
        tokenInfo = await tokenService.getTokenInfo();
      } catch (error) {
        console.warn(`获取代币信息失败: ${error.message}`);
      }
      
      // 将代币信息添加到分配记录中
      const enrichedDistributions = tokenDistributions.map(distribution => ({
        ...distribution,
        tokenInfo
      }));
      
      res.status(200).json({
        success: true,
        data: enrichedDistributions
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RentController; 