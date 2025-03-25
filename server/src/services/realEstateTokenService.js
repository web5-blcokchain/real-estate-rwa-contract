const { ethers } = require('ethers');
const { provider, getSigner } = require('../../../shared/utils/blockchain');
const logger = require('../utils/logger');
const { contractAbis } = require('../../../shared/utils/getAbis');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * 房产代币服务
 * 处理与特定RealEstateToken代币合约的交互
 */
class RealEstateTokenService {
  /**
   * 构造函数
   * @param {string} tokenAddress 代币合约地址
   */
  constructor(tokenAddress) {
    this.tokenAddress = tokenAddress;
    this.abi = contractAbis.RealEstateToken;
  }
  
  /**
   * 获取合约实例
   * @param {boolean} useSigner 是否使用签名者
   * @returns {ethers.Contract} 合约实例
   */
  getContract(useSigner = true) {
    try {
      const contractInterface = new ethers.utils.Interface(this.abi);
      return new ethers.Contract(
        this.tokenAddress,
        contractInterface,
        useSigner ? getSigner() : provider
      );
    } catch (error) {
      logger.error(`获取RealEstateToken合约实例失败: ${error.message}`);
      throw new ApiError(500, '获取合约实例失败');
    }
  }

  /**
   * 添加地址到白名单
   * @param {string} account 要添加的账户地址
   * @returns {object} 交易回执
   */
  async addToWhitelist(account) {
    try {
      logger.info(`添加账户 ${account} 到白名单`);
      const contract = this.getContract();
      const tx = await contract.addToWhitelist(account);
      
      logger.info(`白名单添加交易已提交，交易哈希: ${tx.hash}`);
      return await tx.wait();
    } catch (error) {
      logger.error(`添加白名单失败: ${error.message}`);
      throw new ApiError(500, `添加白名单失败: ${error.message}`);
    }
  }

  /**
   * 批量添加地址到白名单
   * @param {string[]} accounts 要添加的账户地址数组
   * @returns {object} 交易回执
   */
  async batchAddToWhitelist(accounts) {
    try {
      logger.info(`批量添加 ${accounts.length} 个账户到白名单`);
      const contract = this.getContract();
      const tx = await contract.batchAddToWhitelist(accounts);
      
      logger.info(`批量添加白名单交易已提交，交易哈希: ${tx.hash}`);
      return await tx.wait();
    } catch (error) {
      logger.error(`批量添加白名单失败: ${error.message}`);
      throw new ApiError(500, `批量添加白名单失败: ${error.message}`);
    }
  }

  /**
   * 从白名单移除地址
   * @param {string} account 要移除的账户地址
   * @returns {object} 交易回执
   */
  async removeFromWhitelist(account) {
    try {
      logger.info(`从白名单移除账户 ${account}`);
      const contract = this.getContract();
      const tx = await contract.removeFromWhitelist(account);
      
      logger.info(`白名单移除交易已提交，交易哈希: ${tx.hash}`);
      return await tx.wait();
    } catch (error) {
      logger.error(`移除白名单失败: ${error.message}`);
      throw new ApiError(500, `移除白名单失败: ${error.message}`);
    }
  }

  /**
   * 批量从白名单移除地址
   * @param {string[]} accounts 要移除的账户地址数组
   * @returns {object} 交易回执
   */
  async batchRemoveFromWhitelist(accounts) {
    try {
      logger.info(`批量从白名单移除 ${accounts.length} 个账户`);
      const contract = this.getContract();
      const tx = await contract.batchRemoveFromWhitelist(accounts);
      
      logger.info(`批量移除白名单交易已提交，交易哈希: ${tx.hash}`);
      return await tx.wait();
    } catch (error) {
      logger.error(`批量移除白名单失败: ${error.message}`);
      throw new ApiError(500, `批量移除白名单失败: ${error.message}`);
    }
  }

  /**
   * 检查账户是否在白名单中
   * @param {string} account 要检查的账户地址
   * @returns {boolean} 是否在白名单中
   */
  async isWhitelisted(account) {
    try {
      logger.info(`检查账户 ${account} 是否在白名单中`);
      const contract = this.getContract(false);
      return await contract.isWhitelisted(account);
    } catch (error) {
      logger.error(`检查白名单失败: ${error.message}`);
      throw new ApiError(500, `检查白名单失败: ${error.message}`);
    }
  }

  /**
   * 铸造代币
   * @param {string} to 接收者地址
   * @param {string|number} amount 铸造数量
   * @returns {object} 交易回执
   */
  async mint(to, amount) {
    try {
      logger.info(`为地址 ${to} 铸造 ${amount} 代币`);
      const contract = this.getContract();
      
      // 转换为BigNumber
      const amountBN = ethers.BigNumber.from(amount);
      
      const tx = await contract.mint(to, amountBN);
      
      logger.info(`铸造交易已提交，交易哈希: ${tx.hash}`);
      return await tx.wait();
    } catch (error) {
      logger.error(`铸造代币失败: ${error.message}`);
      throw new ApiError(500, `铸造代币失败: ${error.message}`);
    }
  }

  /**
   * 批量转账代币
   * @param {string[]} recipients 接收者地址数组
   * @param {string[]|number[]} amounts 转账数量数组
   * @returns {object} 交易回执
   */
  async batchTransfer(recipients, amounts) {
    try {
      if (recipients.length !== amounts.length) {
        throw new Error('接收者和金额数组长度不匹配');
      }
      
      logger.info(`批量转账给 ${recipients.length} 个地址`);
      const contract = this.getContract();
      
      // 转换为BigNumber数组
      const amountsBN = amounts.map(amount => ethers.BigNumber.from(amount));
      
      const tx = await contract.batchTransfer(recipients, amountsBN);
      
      logger.info(`批量转账交易已提交，交易哈希: ${tx.hash}`);
      return await tx.wait();
    } catch (error) {
      logger.error(`批量转账失败: ${error.message}`);
      throw new ApiError(500, `批量转账失败: ${error.message}`);
    }
  }

  /**
   * 拍摄代币持有情况的快照
   * @returns {object} 交易回执
   */
  async snapshot() {
    try {
      logger.info('拍摄代币持有快照');
      const contract = this.getContract();
      const tx = await contract.snapshot();
      
      logger.info(`快照交易已提交，交易哈希: ${tx.hash}`);
      return await tx.wait();
    } catch (error) {
      logger.error(`拍摄快照失败: ${error.message}`);
      throw new ApiError(500, `拍摄快照失败: ${error.message}`);
    }
  }

  /**
   * 获取代币余额
   * @param {string} account 账户地址
   * @returns {string} 代币余额
   */
  async balanceOf(account) {
    try {
      logger.info(`获取账户 ${account} 的代币余额`);
      const contract = this.getContract(false);
      const balance = await contract.balanceOf(account);
      return balance.toString();
    } catch (error) {
      logger.error(`获取代币余额失败: ${error.message}`);
      throw new ApiError(500, `获取代币余额失败: ${error.message}`);
    }
  }

  /**
   * 获取历史快照中的代币余额
   * @param {string} account 账户地址
   * @param {number} snapshotId 快照ID
   * @returns {string} 历史代币余额
   */
  async balanceOfAt(account, snapshotId) {
    try {
      logger.info(`获取账户 ${account} 在快照 ${snapshotId} 的代币余额`);
      const contract = this.getContract(false);
      const balance = await contract.balanceOfAt(account, snapshotId);
      return balance.toString();
    } catch (error) {
      logger.error(`获取历史代币余额失败: ${error.message}`);
      throw new ApiError(500, `获取历史代币余额失败: ${error.message}`);
    }
  }

  /**
   * 获取当前快照ID
   * @returns {string} 当前快照ID
   */
  async getCurrentSnapshotId() {
    try {
      logger.info('获取当前快照ID');
      const contract = this.getContract(false);
      const snapshotId = await contract.getCurrentSnapshotId();
      return snapshotId.toString();
    } catch (error) {
      logger.error(`获取当前快照ID失败: ${error.message}`);
      throw new ApiError(500, `获取当前快照ID失败: ${error.message}`);
    }
  }

  /**
   * 获取代币信息
   * @returns {object} 代币信息
   */
  async getTokenInfo() {
    try {
      logger.info('获取代币信息');
      const contract = this.getContract(false);
      
      const [name, symbol, decimals, totalSupply, maxSupply, version] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.maxSupply(),
        contract.version()
      ]);
      
      return {
        address: this.tokenAddress,
        name,
        symbol,
        decimals: decimals.toString(),
        totalSupply: totalSupply.toString(),
        maxSupply: maxSupply.toString(),
        version
      };
    } catch (error) {
      logger.error(`获取代币信息失败: ${error.message}`);
      throw new ApiError(500, `获取代币信息失败: ${error.message}`);
    }
  }
}

module.exports = RealEstateTokenService; 