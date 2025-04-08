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
    // 修改参数结构，与合约方法匹配
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
        
        // 尝试获取调用栈信息
        try {
          const stack = new Error().stack;
          const callerFunction = stack.split('\n')[2]?.match(/at\s+(\w+)\s+/)?.[1];
          console.log("[registerPropertyAndCreateToken] 当前调用栈函数名:", callerFunction);
          
          // 检查角色映射
          const overrideRole = BaseController._roleOverrideMap[callerFunction];
          console.log("[registerPropertyAndCreateToken] 角色重写映射:", 
            callerFunction ? `${callerFunction} -> ${overrideRole || '(无重写)'}` : '无法获取调用函数名');
        } catch (error) {
          console.log("[registerPropertyAndCreateToken] 获取调用栈失败:", error.message);
        }
        
        // 获取admin角色合约实例
        console.log("[registerPropertyAndCreateToken] 获取admin角色合约实例");
        const adminContract = this.getContract('RealEstateFacade', 'admin');
        const adminWallet = adminContract.runner;
        const adminAddress = await adminWallet.getAddress();
        console.log("[registerPropertyAndCreateToken] admin钱包地址:", adminAddress);
        
        // 获取manager角色合约实例
        console.log("[registerPropertyAndCreateToken] 获取manager角色合约实例");
        const managerContract = this.getContract('RealEstateFacade', 'manager');
        const managerWallet = managerContract.runner;
        const managerAddress = await managerWallet.getAddress();
        console.log("[registerPropertyAndCreateToken] manager钱包地址:", managerAddress);
        
        // 获取RoleManager和检查权限
        try {
          console.log("[registerPropertyAndCreateToken] 获取RoleManager合约...");
          const roleManagerAddress = await adminContract.roleManager();
          console.log("[registerPropertyAndCreateToken] RoleManager地址:", roleManagerAddress);
          
          const { ContractUtils } = require('../../../common/blockchain');
          const roleManagerContract = ContractUtils.getContractWithRole('RoleManager', roleManagerAddress, 'admin');
          
          const managerRole = await roleManagerContract.MANAGER_ROLE();
          console.log("[registerPropertyAndCreateToken] MANAGER_ROLE:", managerRole);
          
          const isAdminManager = await roleManagerContract.hasRole(managerRole, adminAddress);
          console.log("[registerPropertyAndCreateToken] admin钱包是否有MANAGER_ROLE:", isAdminManager);
          
          const isManagerRole = await roleManagerContract.hasRole(managerRole, managerAddress);
          console.log("[registerPropertyAndCreateToken] manager钱包是否有MANAGER_ROLE:", isManagerRole);
        } catch (error) {
          console.log("[registerPropertyAndCreateToken] 检查权限时出错:", error.message);
        }
        
        // 最终选择使用的合约实例
        console.log("[registerPropertyAndCreateToken] 使用admin角色合约实例调用合约方法");
        const contract = adminContract;

        // 调用合约方法 - 使用正确的参数结构
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
      // 将状态转换为合约期望的枚举值
      const propertyStatus = this._getPropertyStatus(status);
      console.log("[updatePropertyStatus] 转换后的状态值:", propertyStatus);
      
      await this.handleContractAction(
        res,
        async () => {
          console.log("[updatePropertyStatus] 获取合约实例...");
          
          // 尝试获取调用栈信息
          try {
            const stack = new Error().stack;
            const callerFunction = stack.split('\n')[2]?.match(/at\s+(\w+)\s+/)?.[1];
            console.log("[updatePropertyStatus] 当前调用栈函数名:", callerFunction);
            
            // 检查角色映射
            const overrideRole = BaseController._roleOverrideMap[callerFunction];
            console.log("[updatePropertyStatus] 角色重写映射:", 
              callerFunction ? `${callerFunction} -> ${overrideRole || '(无重写)'}` : '无法获取调用函数名');
          } catch (error) {
            console.log("[updatePropertyStatus] 获取调用栈失败:", error.message);
          }
          
          // 获取admin角色合约实例
          console.log("[updatePropertyStatus] 获取admin角色合约实例");
          const adminContract = this.getContract('RealEstateFacade', 'admin');
          const adminWallet = adminContract.runner;
          const adminAddress = await adminWallet.getAddress();
          console.log("[updatePropertyStatus] admin钱包地址:", adminAddress);
          
          // 获取manager角色合约实例
          console.log("[updatePropertyStatus] 获取manager角色合约实例");
          const managerContract = this.getContract('RealEstateFacade', 'manager');
          const managerWallet = managerContract.runner;
          const managerAddress = await managerWallet.getAddress();
          console.log("[updatePropertyStatus] manager钱包地址:", managerAddress);
          
          // 获取RoleManager和检查权限
          try {
            console.log("[updatePropertyStatus] 获取RoleManager合约...");
            const roleManagerAddress = await adminContract.roleManager();
            console.log("[updatePropertyStatus] RoleManager地址:", roleManagerAddress);
            
            const { ContractUtils } = require('../../../common/blockchain');
            const roleManagerContract = ContractUtils.getContractWithRole('RoleManager', roleManagerAddress, 'admin');
            
            const managerRole = await roleManagerContract.MANAGER_ROLE();
            console.log("[updatePropertyStatus] MANAGER_ROLE:", managerRole);
            
            const isAdminManager = await roleManagerContract.hasRole(managerRole, adminAddress);
            console.log("[updatePropertyStatus] admin钱包是否有MANAGER_ROLE:", isAdminManager);
            
            const isManagerRole = await roleManagerContract.hasRole(managerRole, managerAddress);
            console.log("[updatePropertyStatus] manager钱包是否有MANAGER_ROLE:", isManagerRole);
          } catch (error) {
            console.log("[updatePropertyStatus] 检查权限时出错:", error.message);
          }
          
          // 使用当前方法默认应该使用的角色
          const currentFunction = 'updatePropertyStatus';
          const preferredRole = BaseController._roleOverrideMap[currentFunction] || 'admin';
          console.log(`[updatePropertyStatus] 该方法在roleOverrides中配置的角色: ${preferredRole}`);
          
          // 获取合约实例 - 获取实际会使用的角色
          console.log("[updatePropertyStatus] 正在使用 this.getContract('RealEstateFacade') 获取合约实例");
          // 这里不指定角色，让BaseController根据角色重写配置决定
          const contract = this.getContract('RealEstateFacade');
          const contractWallet = contract.runner;
          const contractAddress = await contractWallet.getAddress();
          console.log(`[updatePropertyStatus] 最终使用的钱包地址: ${contractAddress}`);
  
          // 调用合约方法，确保传递正确的枚举值
          console.log("[updatePropertyStatus] 准备调用合约方法...");
          console.log("[updatePropertyStatus] 参数:", { propertyId, status: propertyStatus });
          
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
      console.log("[updatePropertyStatus] 捕获到错误:", error.message);
      console.log("[updatePropertyStatus] 错误堆栈:", error.stack);
      return ResponseUtils.sendError(res, error.message, 400);
    }
  }

  /**
   * 执行交易
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async executeTrade(req, res) {
    // 修改参数结构，与合约方法匹配
    const { orderId, value } = req.body;
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    
    // 验证参数
    if (!this.validateRequired(res, { orderId, contractAddress })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RealEstateFacade', 'admin');

        // 调用合约方法 - 修改为只传递orderId，并正确支持发送ETH值
        const tx = await contract.executeTrade(orderId, { value: value || 0 });

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          orderId
        };
      },
      '交易执行成功',
      { orderId },
      '交易执行失败'
    );
  }

  /**
   * 创建奖励分配 (原distributeRewards改名为createDistribution以匹配合约)
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createDistribution(req, res) {
    const { propertyId, amount, description, applyFees, paymentToken } = req.body;
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    
    // 验证参数
    if (!this.validateRequired(res, { propertyId, amount, description, contractAddress })) {
      return;
    }
    
    // applyFees默认为true，paymentToken默认为零地址
    const finalApplyFees = applyFees !== false;
    // 使用兼容ethers v5和v6的方式获取零地址
    const zeroAddress = ethers.constants ? ethers.constants.AddressZero : ethers.ZeroAddress;
    const finalPaymentToken = paymentToken || zeroAddress;
    
    // 验证地址
    if (paymentToken && !AddressUtils.isValid(finalPaymentToken)) {
      return ResponseUtils.sendError(res, '无效的支付代币地址', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RealEstateFacade', 'admin');

        // 调用合约方法 - 使用createDistribution替代distributeRewards
        const tx = await contract.createDistribution(
          propertyId,
          amount,
          description,
          finalApplyFees,
          finalPaymentToken
        );

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);
        
        // 尝试从事件中提取分配ID
        let distributionId;
        try {
          const event = receipt.logs.find(log => {
            try {
              return log?.topics[0] === ethers.id("DistributionCreated(uint256,bytes32,uint256,string)");
            } catch (e) {
              return false;
            }
          });
          if (event) {
            // 解析事件获取distributionId
            const iface = new ethers.Interface([
              "event DistributionCreated(uint256 indexed distributionId, bytes32 indexed propertyIdHash, uint256 amount, string description)"
            ]);
            const parsedLog = iface.parseLog(event);
            distributionId = parsedLog.args.distributionId.toString();
          }
        } catch (err) {
          Logger.warn("无法解析DistributionCreated事件", err);
        }

        return {
          transactionHash: receipt.hash,
          propertyId,
          amount,
          description,
          distributionId
        };
      },
      '奖励分配创建成功',
      { propertyId, amount },
      '奖励分配创建失败'
    );
  }

  /**
   * 分发奖励 (保留旧方法名，内部调用createDistribution以向后兼容)
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @deprecated 请使用createDistribution方法
   */
  async distributeRewards(req, res) {
    Logger.warn('distributeRewards方法已弃用，请使用createDistribution方法');
    return this.createDistribution(req, res);
  }

  /**
   * 获取版本
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getVersion(req, res) {
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RealEstateFacade', 'admin');

        // 调用合约方法
        const version = await contract.getVersion();

        return { version };
      },
      '获取版本成功',
      {},
      '获取版本失败'
    );
  }

  /**
   * 领取奖励
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async claimRewards(req, res) {
    // 修改参数结构，与合约方法匹配
    const { distributionId } = req.body;
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    
    // 验证参数
    if (!this.validateRequired(res, { distributionId, contractAddress })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RealEstateFacade', 'admin');

        // 调用合约方法 - 修改为只传递distributionId
        const tx = await contract.claimRewards(distributionId);

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          distributionId
        };
      },
      '奖励领取成功',
      { distributionId },
      '奖励领取失败'
    );
  }

  /**
   * 创建卖单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createOrder(req, res) {
    const { token, amount, price } = req.body;
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    
    // 验证参数
    if (!this.validateRequired(res, { token, amount, price, contractAddress })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(token)) {
      return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RealEstateFacade', 'admin');

        // 调用合约方法
        const tx = await contract.createOrder(token, amount, price);

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          token,
          amount,
          price
        };
      },
      '创建卖单成功',
      { token, amount, price },
      '创建卖单失败'
    );
  }

  /**
   * 取消卖单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async cancelOrder(req, res) {
    const { orderId } = req.body;
    const contractAddress = EnvUtils.getContractAddress('RealEstateFacade');
    
    // 验证参数
    if (!this.validateRequired(res, { orderId, contractAddress })) {
      return;
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = this.getContract('RealEstateFacade', 'admin');

        // 调用合约方法
        const tx = await contract.cancelOrder(orderId);

        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          orderId
        };
      },
      '取消卖单成功',
      { orderId },
      '取消卖单失败'
    );
  }
}

module.exports = RealEstateFacadeController; 