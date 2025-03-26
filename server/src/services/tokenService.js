const BaseContractService = require('./baseContractService');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');
const { ethers } = require('ethers');

/**
 * 代币服务
 * 负责与Token合约交互
 */
class TokenService extends BaseContractService {
  constructor() {
    super('Token', 'token');
  }
  
  /**
   * 获取代币信息
   * @param {string} tokenId 代币ID
   * @returns {Promise<object>} 代币信息
   */
  async getToken(tokenId) {
    try {
      if (!tokenId) {
        throw new ApiError(400, '代币ID不能为空');
      }
      
      const tokenData = await this.executeRead('tokens', [tokenId]);
      const { exists, propertyId, owner, amount, status, createdAt, updatedAt } = tokenData;
      
      // 如果代币不存在，返回null
      if (!exists) {
        return null;
      }
      
      return {
        tokenId,
        propertyId,
        owner,
        amount: ethers.utils.formatEther(amount),
        status,
        createdAt: new Date(Number(createdAt) * 1000),
        updatedAt: new Date(Number(updatedAt) * 1000),
        exists
      };
    } catch (error) {
      logger.error(`获取代币信息失败 - tokenId: ${tokenId}, error: ${error.message}`);
      throw new ApiError(500, '获取代币信息失败', error.message);
    }
  }
  
  /**
   * 创建代币
   * @param {string} propertyId 房产ID
   * @param {string} amount 代币数量
   * @returns {Promise<object>} 交易收据
   */
  async createToken(propertyId, amount) {
    try {
      if (!propertyId || !amount) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 检查金额是否有效
      const amountWei = ethers.utils.parseEther(amount);
      if (amountWei.lte(0)) {
        throw new ApiError(400, '代币数量必须大于0');
      }
      
      const receipt = await this.executeWrite(
        'createToken',
        [propertyId, amountWei],
        { operationName: 'createToken' }
      );
      
      logger.info(`代币创建成功 - propertyId: ${propertyId}, amount: ${amount}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`代币创建失败 - propertyId: ${propertyId}, amount: ${amount}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '代币创建失败', error.message);
    }
  }
  
  /**
   * 转移代币
   * @param {string} tokenId 代币ID
   * @param {string} to 接收地址
   * @param {string} amount 转移数量
   * @returns {Promise<object>} 交易收据
   */
  async transferToken(tokenId, to, amount) {
    try {
      if (!tokenId || !to || !amount) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 检查接收地址是否有效
      if (!ethers.utils.isAddress(to)) {
        throw new ApiError(400, '无效的接收地址');
      }
      
      // 检查金额是否有效
      const amountWei = ethers.utils.parseEther(amount);
      if (amountWei.lte(0)) {
        throw new ApiError(400, '转移数量必须大于0');
      }
      
      // 检查代币是否存在
      const token = await this.getToken(tokenId);
      if (!token) {
        throw new ApiError(404, '代币不存在');
      }
      
      // 检查余额是否足够
      const balance = ethers.utils.parseEther(token.amount);
      if (amountWei.gt(balance)) {
        throw new ApiError(400, '余额不足');
      }
      
      const receipt = await this.executeWrite(
        'transfer',
        [tokenId, to, amountWei],
        { operationName: 'transferToken' }
      );
      
      logger.info(`代币转移成功 - tokenId: ${tokenId}, to: ${to}, amount: ${amount}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`代币转移失败 - tokenId: ${tokenId}, to: ${to}, amount: ${amount}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '代币转移失败', error.message);
    }
  }
  
  /**
   * 获取代币余额
   * @param {string} tokenId 代币ID
   * @param {string} address 地址
   * @returns {Promise<string>} 代币余额
   */
  async getBalance(tokenId, address) {
    try {
      if (!tokenId || !address) {
        throw new ApiError(400, '缺少必要参数');
      }
      
      // 检查地址是否有效
      if (!ethers.utils.isAddress(address)) {
        throw new ApiError(400, '无效的地址');
      }
      
      // 检查代币是否存在
      const token = await this.getToken(tokenId);
      if (!token) {
        throw new ApiError(404, '代币不存在');
      }
      
      const balance = await this.executeRead('balanceOf', [tokenId, address]);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      logger.error(`获取代币余额失败 - tokenId: ${tokenId}, address: ${address}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '获取代币余额失败', error.message);
    }
  }
  
  /**
   * 获取代币状态
   * @param {string} tokenId 代币ID
   * @returns {Promise<number>} 状态码 (0=Active, 1=Frozen, 2=Burned)
   */
  async getTokenStatus(tokenId) {
    try {
      if (!tokenId) {
        throw new ApiError(400, '代币ID不能为空');
      }
      
      const token = await this.executeRead('tokens', [tokenId]);
      
      if (!token.exists) {
        throw new ApiError(404, '代币不存在');
      }
      
      return Number(token.status);
    } catch (error) {
      logger.error(`获取代币状态失败 - tokenId: ${tokenId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '获取代币状态失败', error.message);
    }
  }
  
  /**
   * 冻结代币
   * @param {string} tokenId 代币ID
   * @returns {Promise<object>} 交易收据
   */
  async freezeToken(tokenId) {
    try {
      if (!tokenId) {
        throw new ApiError(400, '代币ID不能为空');
      }
      
      // 检查代币是否存在
      const token = await this.getToken(tokenId);
      if (!token) {
        throw new ApiError(404, '代币不存在');
      }
      
      // 检查代币状态
      if (token.status === 1) {
        throw new ApiError(400, '代币已冻结');
      }
      
      const receipt = await this.executeWrite(
        'setTokenStatus',
        [tokenId, 1], // status 1 = Frozen
        { operationName: 'freezeToken' }
      );
      
      logger.info(`代币冻结成功 - tokenId: ${tokenId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`代币冻结失败 - tokenId: ${tokenId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '代币冻结失败', error.message);
    }
  }
  
  /**
   * 解冻代币
   * @param {string} tokenId 代币ID
   * @returns {Promise<object>} 交易收据
   */
  async unfreezeToken(tokenId) {
    try {
      if (!tokenId) {
        throw new ApiError(400, '代币ID不能为空');
      }
      
      // 检查代币是否存在
      const token = await this.getToken(tokenId);
      if (!token) {
        throw new ApiError(404, '代币不存在');
      }
      
      // 检查代币状态
      if (token.status === 0) {
        throw new ApiError(400, '代币未冻结');
      }
      
      const receipt = await this.executeWrite(
        'setTokenStatus',
        [tokenId, 0], // status 0 = Active
        { operationName: 'unfreezeToken' }
      );
      
      logger.info(`代币解冻成功 - tokenId: ${tokenId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`代币解冻失败 - tokenId: ${tokenId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '代币解冻失败', error.message);
    }
  }
  
  /**
   * 销毁代币
   * @param {string} tokenId 代币ID
   * @returns {Promise<object>} 交易收据
   */
  async burnToken(tokenId) {
    try {
      if (!tokenId) {
        throw new ApiError(400, '代币ID不能为空');
      }
      
      // 检查代币是否存在
      const token = await this.getToken(tokenId);
      if (!token) {
        throw new ApiError(404, '代币不存在');
      }
      
      // 检查代币状态
      if (token.status === 2) {
        throw new ApiError(400, '代币已销毁');
      }
      
      const receipt = await this.executeWrite(
        'setTokenStatus',
        [tokenId, 2], // status 2 = Burned
        { operationName: 'burnToken' }
      );
      
      logger.info(`代币销毁成功 - tokenId: ${tokenId}, txHash: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error(`代币销毁失败 - tokenId: ${tokenId}, error: ${error.message}`);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, '代币销毁失败', error.message);
    }
  }
}

module.exports = new TokenService(); 