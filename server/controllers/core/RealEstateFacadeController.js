const { ContractUtils, Logger, AddressUtils, EnvUtils } = require('../../../common');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');
const { ethers } = require('ethers');

/**
 * 房地产外观控制器
 */
class RealEstateFacadeController extends BaseController {
  /**
   * 获取PropertyStatus枚举值
   * @param {number|string} status - 状态值
   * @returns {number} - 枚举值
   * @private
   */
  _getPropertyStatus(status) {
    // 确保status是一个有效的枚举值
    const statusMap = {
      0: 0, // Inactive
      1: 1, // Active
      2: 2, // ForSale
      3: 3, // Sold
      4: 4, // Rented
      5: 5  // Maintenance
    };
    
    // 将字符串转换为数字
    const statusNum = parseInt(status);
    
    // 检查状态值是否有效
    if (isNaN(statusNum) || statusMap[statusNum] === undefined) {
      throw new Error(`无效的房产状态值: ${status}`);
    }
    
    return statusMap[statusNum];
  }

  /**
   * 注册房产并创建代币
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async registerPropertyAndCreateToken(req, res) {
    const { 
      propertyId, 
      propertyData, 
      tokenData,
      propertyTokenImplementation
    } = req.body;
    
    console.log("\n[registerPropertyAndCreateToken] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[registerPropertyAndCreateToken] 合约地址:", contractAddress);
    
    // 验证主要参数
    if (!this.validateRequired(res, { 
      propertyId, propertyData, tokenData, propertyTokenImplementation, contractAddress 
    })) {
      return;
    }
    
    // 验证propertyData内的必要字段
    if (!this.validateRequired(res, { 
      country: propertyData.country, 
      metadataURI: propertyData.metadataURI 
    })) {
      return;
    }
    
    // 验证tokenData内的必要字段
    if (!this.validateRequired(res, { 
      tokenName: tokenData.name, 
      tokenSymbol: tokenData.symbol, 
      initialSupply: tokenData.initialSupply
    })) {
      return;
    }
    
    // 验证代币实现地址
    if (!AddressUtils.isValid(propertyTokenImplementation)) {
      return ResponseUtils.sendError(res, '无效的代币实现合约地址', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        console.log("[registerPropertyAndCreateToken] 获取合约实例...");
        
        // 获取admin角色合约实例
        const contract = this.getContract('RealEstateFacade', 'admin');
        
        // 调用合约方法
        console.log("[registerPropertyAndCreateToken] 准备调用合约方法...");
        console.log("[registerPropertyAndCreateToken] 参数:", {
          propertyId,
          country: propertyData.country,
          metadataURI: propertyData.metadataURI,
          tokenName: tokenData.name,
          tokenSymbol: tokenData.symbol,
          initialSupply: tokenData.initialSupply,
          implementation: propertyTokenImplementation
        });
        
        const tx = await contract.registerPropertyAndCreateToken(
          propertyId,
          propertyData.country,
          propertyData.metadataURI,
          tokenData.name,
          tokenData.symbol,
          tokenData.initialSupply,
          propertyTokenImplementation
        );
        console.log("[registerPropertyAndCreateToken] 交易已发送:", tx.hash);

        // 等待交易确认
        console.log("[registerPropertyAndCreateToken] 等待交易确认...");
        const receipt = await this.waitForTransaction(tx);
        console.log("[registerPropertyAndCreateToken] 交易已确认:", receipt.hash);

        return {
          transactionHash: receipt.hash,
          propertyId
        };
      },
      '房产注册成功',
      { propertyId },
      '房产注册失败'
    );
  }

  /**
   * 更新房产状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePropertyStatus(req, res) {
    const { propertyId, status } = req.body;
    
    console.log("\n[updatePropertyStatus] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[updatePropertyStatus] 合约地址:", contractAddress);
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, status, contractAddress })) {
      return;
    }
    
    // 验证状态值
    try {
      const propertyStatus = this._getPropertyStatus(status);
      console.log("[updatePropertyStatus] 转换后的状态值:", propertyStatus);
      
      await this.handleContractAction(
        res,
        async () => {
          console.log("[updatePropertyStatus] 获取合约实例...");
          
          // 获取admin角色合约实例
          const contract = this.getContract('RealEstateFacade', 'admin');
          
          // 调用合约方法
          console.log("[updatePropertyStatus] 准备调用合约方法...");
          console.log("[updatePropertyStatus] 参数:", {
            propertyId,
            status: propertyStatus
          });
          
          const tx = await contract.updatePropertyStatus(propertyId, propertyStatus);
          console.log("[updatePropertyStatus] 交易已发送:", tx.hash);
          
          // 等待交易确认
          console.log("[updatePropertyStatus] 等待交易确认...");
          const receipt = await this.waitForTransaction(tx);
          console.log("[updatePropertyStatus] 交易已确认:", receipt.hash);
          
          return {
            transactionHash: receipt.hash,
            propertyId,
            status: propertyStatus
          };
        },
        '房产状态更新成功',
        { propertyId, status: propertyStatus },
        '房产状态更新失败'
      );
    } catch (error) {
      return ResponseUtils.sendError(res, `无效的房产状态值: ${status}`, 400);
    }
  }

  /**
   * 执行交易
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async executeTrade(req, res) {
    const { propertyId, orderId } = req.body;
    
    console.log("\n[executeTrade] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[executeTrade] 合约地址:", contractAddress);
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, orderId, contractAddress })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        console.log("[executeTrade] 获取合约实例...");
        
        // 获取operator角色合约实例
        const contract = this.getContract('RealEstateFacade', 'operator');
        
        // 调用合约方法
        console.log("[executeTrade] 准备调用合约方法...");
        console.log("[executeTrade] 参数:", {
          propertyId,
          orderId
        });
        
        const tx = await contract.executeTrade(propertyId, orderId);
        console.log("[executeTrade] 交易已发送:", tx.hash);
        
        // 等待交易确认
        console.log("[executeTrade] 等待交易确认...");
        const receipt = await this.waitForTransaction(tx);
        console.log("[executeTrade] 交易已确认:", receipt.hash);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          orderId
        };
      },
      '交易执行成功',
      { propertyId, orderId },
      '交易执行失败'
    );
  }

  /**
   * 创建收益分配
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createDistribution(req, res) {
    const { propertyId, amount, tokenAddress } = req.body;
    
    console.log("\n[createDistribution] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[createDistribution] 合约地址:", contractAddress);
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, amount, tokenAddress, contractAddress })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        console.log("[createDistribution] 获取合约实例...");
        
        // 获取manager角色合约实例
        const contract = this.getContract('RealEstateFacade', 'manager');
        
        // 调用合约方法
        console.log("[createDistribution] 准备调用合约方法...");
        console.log("[createDistribution] 参数:", {
          propertyId,
          amount,
          tokenAddress
        });
        
        const tx = await contract.createDistribution(propertyId, amount, tokenAddress);
        console.log("[createDistribution] 交易已发送:", tx.hash);
        
        // 等待交易确认
        console.log("[createDistribution] 等待交易确认...");
        const receipt = await this.waitForTransaction(tx);
        console.log("[createDistribution] 交易已确认:", receipt.hash);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          amount,
          tokenAddress
        };
      },
      '收益分配创建成功',
      { propertyId, amount, tokenAddress },
      '收益分配创建失败'
    );
  }

  /**
   * 分配收益
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async distributeRewards(req, res) {
    const { propertyId } = req.body;
    
    console.log("\n[distributeRewards] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[distributeRewards] 合约地址:", contractAddress);
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, contractAddress })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        console.log("[distributeRewards] 获取合约实例...");
        
        // 获取operator角色合约实例
        const contract = this.getContract('RealEstateFacade', 'operator');
        
        // 调用合约方法
        console.log("[distributeRewards] 准备调用合约方法...");
        console.log("[distributeRewards] 参数:", {
          propertyId
        });
        
        const tx = await contract.distributeRewards(propertyId);
        console.log("[distributeRewards] 交易已发送:", tx.hash);
        
        // 等待交易确认
        console.log("[distributeRewards] 等待交易确认...");
        const receipt = await this.waitForTransaction(tx);
        console.log("[distributeRewards] 交易已确认:", receipt.hash);
        
        return {
          transactionHash: receipt.hash,
          propertyId
        };
      },
      '收益分配成功',
      { propertyId },
      '收益分配失败'
    );
  }

  /**
   * 获取版本号
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getVersion(req, res) {
    console.log("\n[getVersion] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[getVersion] 合约地址:", contractAddress);
    
    await this.handleContractAction(
      res,
      async () => {
        console.log("[getVersion] 获取合约实例...");
        
        // 获取admin角色合约实例
        const contract = this.getContract('RealEstateFacade', 'admin');
        
        // 调用合约方法
        console.log("[getVersion] 准备调用合约方法...");
        const version = await contract.version();
        console.log("[getVersion] 获取到的版本号:", version);
        
        return {
          version
        };
      },
      '获取版本号成功',
      null,
      '获取版本号失败'
    );
  }

  /**
   * 领取收益
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async claimRewards(req, res) {
    const { propertyId } = req.body;
    
    console.log("\n[claimRewards] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[claimRewards] 合约地址:", contractAddress);
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, contractAddress })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        console.log("[claimRewards] 获取合约实例...");
        
        // 获取operator角色合约实例
        const contract = this.getContract('RealEstateFacade', 'operator');
        
        // 调用合约方法
        console.log("[claimRewards] 准备调用合约方法...");
        console.log("[claimRewards] 参数:", {
          propertyId
        });
        
        const tx = await contract.claimRewards(propertyId);
        console.log("[claimRewards] 交易已发送:", tx.hash);
        
        // 等待交易确认
        console.log("[claimRewards] 等待交易确认...");
        const receipt = await this.waitForTransaction(tx);
        console.log("[claimRewards] 交易已确认:", receipt.hash);
        
        return {
          transactionHash: receipt.hash,
          propertyId
        };
      },
      '收益领取成功',
      { propertyId },
      '收益领取失败'
    );
  }

  /**
   * 创建订单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createOrder(req, res) {
    const { propertyId, price, amount, isBuyOrder } = req.body;
    
    console.log("\n[createOrder] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[createOrder] 合约地址:", contractAddress);
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, price, amount, isBuyOrder, contractAddress })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        console.log("[createOrder] 获取合约实例...");
        
        // 获取operator角色合约实例
        const contract = this.getContract('RealEstateFacade', 'operator');
        
        // 调用合约方法
        console.log("[createOrder] 准备调用合约方法...");
        console.log("[createOrder] 参数:", {
          propertyId,
          price,
          amount,
          isBuyOrder
        });
        
        const tx = await contract.createOrder(propertyId, price, amount, isBuyOrder);
        console.log("[createOrder] 交易已发送:", tx.hash);
        
        // 等待交易确认
        console.log("[createOrder] 等待交易确认...");
        const receipt = await this.waitForTransaction(tx);
        console.log("[createOrder] 交易已确认:", receipt.hash);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          price,
          amount,
          isBuyOrder
        };
      },
      '订单创建成功',
      { propertyId, price, amount, isBuyOrder },
      '订单创建失败'
    );
  }

  /**
   * 取消订单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async cancelOrder(req, res) {
    const { propertyId, orderId } = req.body;
    
    console.log("\n[cancelOrder] 开始执行");
    
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    console.log("[cancelOrder] 合约地址:", contractAddress);
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, orderId, contractAddress })) {
      return;
    }
    
    await this.handleContractAction(
      res,
      async () => {
        console.log("[cancelOrder] 获取合约实例...");
        
        // 获取operator角色合约实例
        const contract = this.getContract('RealEstateFacade', 'operator');
        
        // 调用合约方法
        console.log("[cancelOrder] 准备调用合约方法...");
        console.log("[cancelOrder] 参数:", {
          propertyId,
          orderId
        });
        
        const tx = await contract.cancelOrder(propertyId, orderId);
        console.log("[cancelOrder] 交易已发送:", tx.hash);
        
        // 等待交易确认
        console.log("[cancelOrder] 等待交易确认...");
        const receipt = await this.waitForTransaction(tx);
        console.log("[cancelOrder] 交易已确认:", receipt.hash);
        
        return {
          transactionHash: receipt.hash,
          propertyId,
          orderId
        };
      },
      '订单取消成功',
      { propertyId, orderId },
      '订单取消失败'
    );
  }
}

module.exports = RealEstateFacadeController; 