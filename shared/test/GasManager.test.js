const { expect } = require('chai');
const { ethers } = require('ethers');
const GasManager = require('../src/core/GasManager');
const { GasError } = require('../src/utils/errors');
const Provider = require('../src/core/Provider');

describe('GasManager', () => {
  let gasManager;
  let provider;

  before(async () => {
    provider = Provider.create();
  });

  beforeEach(async () => {
    gasManager = await GasManager.create({
      provider,
      maxPriorityFeePerGas: 1.5,
      maxFeePerGas: 2,
      gasLimitBuffer: 1.1
    });
  });

  describe('create', () => {
    it('应该使用默认配置创建 Gas 管理器', async () => {
      const defaultManager = await GasManager.create();
      expect(defaultManager).to.be.instanceOf(GasManager);
    });

    it('应该使用自定义配置创建 Gas 管理器', async () => {
      const customManager = await GasManager.create({
        provider,
        maxPriorityFeePerGas: 2,
        maxFeePerGas: 3,
        gasLimitBuffer: 1.2
      });
      expect(customManager).to.be.instanceOf(GasManager);
    });
  });

  describe('getGasPrice', () => {
    it('应该获取当前 Gas 价格', async () => {
      const gasPrice = await gasManager.getGasPrice();
      expect(gasPrice).to.be.an('object');
      expect(gasPrice.gasPrice).to.be.an('object');
      expect(gasPrice.maxFeePerGas).to.be.an('object');
      expect(gasPrice.maxPriorityFeePerGas).to.be.an('object');
    });
  });

  describe('getRecommendedGasPrice', () => {
    it('应该获取推荐的 Gas 价格', async () => {
      const recommended = await gasManager.getRecommendedGasPrice();
      expect(recommended).to.be.an('object');
      expect(recommended.maxFeePerGas).to.be.an('object');
      expect(recommended.maxPriorityFeePerGas).to.be.an('object');
      expect(recommended.gasPrice).to.be.an('object');
    });
  });

  describe('estimateGas', () => {
    it('应该估算交易 Gas 用量', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const gas = await gasManager.estimateGas(transaction);
      expect(gas).to.be.a('string');
      expect(Number(gas)).to.be.at.least(0);
    });

    it('应该处理无效的交易', async () => {
      const invalidTx = {
        to: 'invalid-address',
        value: 'invalid-value'
      };
      await expect(
        gasManager.estimateGas(invalidTx)
      ).to.be.rejectedWith(GasError);
    });
  });

  describe('calculateFee', () => {
    it('应该计算传统交易的费用', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const fee = await gasManager.calculateFee(transaction);
      expect(fee).to.be.an('object');
      expect(fee.fee).to.be.an('object');
      expect(fee.gasPrice).to.be.an('object');
      expect(fee.gasLimit).to.be.an('object');
    });

    it('应该计算 EIP-1559 交易的费用', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1'),
        type: 2
      };
      const fee = await gasManager.calculateFee(transaction);
      expect(fee).to.be.an('object');
      expect(fee.maxFee).to.be.an('object');
      expect(fee.maxPriorityFee).to.be.an('object');
      expect(fee.gasLimit).to.be.an('object');
    });
  });

  describe('setGasParameters', () => {
    it('应该设置传统交易的 Gas 参数', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const params = await gasManager.setGasParameters(transaction);
      expect(params).to.be.an('object');
      expect(params.gasPrice).to.be.an('object');
      expect(params.gasLimit).to.be.an('object');
    });

    it('应该设置 EIP-1559 交易的 Gas 参数', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1'),
        type: 2
      };
      const params = await gasManager.setGasParameters(transaction);
      expect(params).to.be.an('object');
      expect(params.maxFeePerGas).to.be.an('object');
      expect(params.maxPriorityFeePerGas).to.be.an('object');
      expect(params.gasLimit).to.be.an('object');
    });
  });

  describe('_calculatePriorityFee', () => {
    it('应该计算推荐的优先费用', async () => {
      const priorityFee = await gasManager._calculatePriorityFee();
      expect(priorityFee).to.be.an('object');
      expect(Number(priorityFee)).to.be.at.least(0);
    });
  });
}); 