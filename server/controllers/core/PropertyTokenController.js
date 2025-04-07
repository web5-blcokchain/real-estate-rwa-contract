const { ContractUtils, AddressUtils } = require('../../../common');
const Logger = require('../../../common/logger');
const Utils = require('../../../common/utils');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');

/**
 * 房产代币控制器
 */
class PropertyTokenController extends BaseController {
  /**
   * 创建代币
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createToken(req, res) {
    const { contractAddress, name, symbol, initialSupply, owner } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, name, symbol, initialSupply, owner })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(owner)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('PropertyToken', contractAddress);
        
        // 调用合约方法
        const tx = await contract.createToken(name, symbol, initialSupply, owner);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          name,
          symbol,
          initialSupply,
          owner
        };
      },
      '代币创建成功',
      { name, symbol, initialSupply, owner },
      '代币创建失败'
    );
  }

  /**
   * 获取代币信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTokenInfo(req, res) {
    const { contractAddress } = req.query;
    const { tokenAddress } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, tokenAddress })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(tokenAddress)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('PropertyToken', contractAddress);
        
        // 调用合约方法
        const tokenInfo = await contract.getTokenInfo(tokenAddress);

        return {
          tokenAddress,
          tokenInfo
        };
      },
      '获取代币信息成功',
      { tokenAddress },
      '获取代币信息失败'
    );
  }

  /**
   * 转移代币
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async transferToken(req, res) {
    const { contractAddress, tokenAddress, from, to, amount } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, tokenAddress, from, to, amount })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(tokenAddress) || !AddressUtils.isValid(from) || !AddressUtils.isValid(to)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('PropertyToken', contractAddress);
        
        // 调用合约方法
        const tx = await contract.transferToken(tokenAddress, from, to, amount);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          tokenAddress,
          from,
          to,
          amount
        };
      },
      '代币转移成功',
      { tokenAddress, from, to, amount },
      '代币转移失败'
    );
  }

  /**
   * 获取代币余额
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTokenBalance(req, res) {
    const { contractAddress } = req.query;
    const { tokenAddress, account } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, tokenAddress, account })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(tokenAddress) || !AddressUtils.isValid(account)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('PropertyToken', contractAddress);
        
        // 调用合约方法
        const balance = await contract.getTokenBalance(tokenAddress, account);

        return {
          tokenAddress,
          account,
          balance: balance.toString()
        };
      },
      '获取代币余额成功',
      { tokenAddress, account },
      '获取代币余额失败'
    );
  }

  /**
   * 获取代币总供应量
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTokenTotalSupply(req, res) {
    const { contractAddress } = req.query;
    const { tokenAddress } = req.params;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, tokenAddress })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(tokenAddress)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('PropertyToken', contractAddress);
        
        // 调用合约方法
        const totalSupply = await contract.getTokenTotalSupply(tokenAddress);

        return {
          tokenAddress,
          totalSupply: totalSupply.toString()
        };
      },
      '获取代币总供应量成功',
      { tokenAddress },
      '获取代币总供应量失败'
    );
  }

  /**
   * 铸造代币
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async mintToken(req, res) {
    const { contractAddress, tokenAddress, to, amount } = req.body;
    
    // 验证参数
    if (!this.validateRequired(res, { contractAddress, tokenAddress, to, amount })) {
      return;
    }

    // 验证地址格式
    if (!AddressUtils.isValid(tokenAddress) || !AddressUtils.isValid(to)) {
      return ResponseUtils.sendError(res, '无效的地址格式', 400);
    }

    await this.handleContractAction(
      res,
      async () => {
        // 获取合约实例
        const contract = ContractUtils.getContract('PropertyToken', contractAddress);
        
        // 调用合约方法
        const tx = await contract.mintToken(tokenAddress, to, amount);
        
        // 等待交易确认
        const receipt = await this.waitForTransaction(tx);

        return {
          transactionHash: receipt.hash,
          tokenAddress,
          to,
          amount
        };
      },
      '代币铸造成功',
      { tokenAddress, to, amount },
      '代币铸造失败'
    );
  }
}

module.exports = PropertyTokenController; 