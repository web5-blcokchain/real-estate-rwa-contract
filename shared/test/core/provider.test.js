const chai = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const Provider = require('../../src/core/provider');
const { Validation } = require('../../src/utils');
const { ProviderError } = require('../../src/utils/errors');
const { EnvConfig } = require('../../src/config');
const Logger = require('../../src/utils/logger');

// 在运行测试之前等待加载所有插件
before(async () => {
  const chaiAsPromised = await import('chai-as-promised');
  const sinonChai = await import('sinon-chai');
  chai.use(chaiAsPromised.default);
  chai.use(sinonChai.default);
});

const { expect } = chai;

describe('Provider', () => {
  let mockProvider;
  let validationStubs;
  let envConfigStubs;

  beforeEach(() => {
    // 设置环境变量
    process.env.NETWORK_TYPE = 'testnet';
    process.env.RPC_URL = 'http://localhost:8545';
    process.env.CHAIN_ID = '11155111';
    
    // 创建模拟数据
    mockProvider = {
      getBlockNumber: sinon.stub().resolves(123456),
      getBlock: sinon.stub().resolves({ number: 123456 }),
      getTransaction: sinon.stub().resolves({ hash: '0x123' }),
      getTransactionReceipt: sinon.stub().resolves({ status: 1 }),
      getNetwork: sinon.stub().resolves({ chainId: 11155111 }),
      getBalance: sinon.stub().resolves(ethers.parseEther('1.0'))
    };

    // 模拟 Validation 方法
    validationStubs = {
      isValidUrl: sinon.stub(Validation, 'isValidUrl').returns(true),
      isValidChainId: sinon.stub(Validation, 'isValidChainId').returns(true),
      isValidProvider: sinon.stub(Validation, 'isValidProvider').returns(true),
      isValidBlockNumber: sinon.stub(Validation, 'isValidBlockNumber').returns(true),
      isValidHash: sinon.stub(Validation, 'isValidHash').returns(true),
      isValidAddress: sinon.stub(Validation, 'isValidAddress').returns(true)
    };

    // 创建模拟 EnvConfig
    envConfigStubs = {
      getNetworkConfig: sinon.stub(EnvConfig, 'getNetworkConfig').returns({
        rpcUrl: 'http://localhost:8545',
        chainId: 11155111
      })
    };

    // 设置模拟
    const JsonRpcProviderStub = function(url, chainId) {
      return mockProvider;
    };
    JsonRpcProviderStub.prototype = mockProvider;
    sinon.stub(ethers, 'JsonRpcProvider').callsFake(JsonRpcProviderStub);
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.NETWORK_TYPE;
    delete process.env.RPC_URL;
    delete process.env.CHAIN_ID;

    // 恢复所有模拟
    sinon.restore();
  });

  describe('create()', () => {
    it('should create provider instance with default parameters', async () => {
      const provider = await Provider.create();
      expect(provider).to.have.property('getBlockNumber').that.is.a('function');
      expect(provider).to.have.property('getBlock').that.is.a('function');
      expect(provider).to.have.property('getTransaction').that.is.a('function');
      expect(provider).to.have.property('getTransactionReceipt').that.is.a('function');
      expect(provider).to.have.property('getNetwork').that.is.a('function');
      expect(provider).to.have.property('getBalance').that.is.a('function');
    });

    it('should create provider instance with custom parameters', async () => {
      const customRpcUrl = 'https://custom-rpc.example.com';
      const customChainId = 1;
      const provider = await Provider.create({ rpcUrl: customRpcUrl, chainId: customChainId });
      expect(provider).to.have.property('getBlockNumber').that.is.a('function');
      expect(provider).to.have.property('getBlock').that.is.a('function');
      expect(provider).to.have.property('getTransaction').that.is.a('function');
      expect(provider).to.have.property('getTransactionReceipt').that.is.a('function');
      expect(provider).to.have.property('getNetwork').that.is.a('function');
      expect(provider).to.have.property('getBalance').that.is.a('function');
    });

    it('should throw error with invalid RPC URL', async () => {
      validationStubs.isValidUrl.returns(false);
      await expect(Provider.create({ rpcUrl: 'invalid-url' }))
        .to.be.rejectedWith(ProviderError, '无效的 RPC URL');
    });

    it('should throw error with invalid chain ID', async () => {
      validationStubs.isValidChainId.returns(false);
      await expect(Provider.create({ chainId: 'invalid' }))
        .to.be.rejectedWith(ProviderError, '无效的链 ID');
    });
  });

  describe('getBlockNumber()', () => {
    it('should get current block number successfully', async () => {
      const blockNumber = await Provider.getBlockNumber(mockProvider);
      expect(blockNumber).to.equal(123456);
      expect(mockProvider.getBlockNumber).to.have.been.called;
    });

    it('should throw error with invalid provider', async () => {
      validationStubs.isValidProvider.returns(false);
      await expect(Provider.getBlockNumber(null))
        .to.be.rejectedWith(ProviderError, '获取当前区块号失败');
    });
  });

  describe('getBlock()', () => {
    it('should get block information successfully', async () => {
      const block = await Provider.getBlock(mockProvider, 123456);
      expect(block).to.deep.equal({ number: 123456 });
      expect(mockProvider.getBlock).to.have.been.calledWith(123456);
    });

    it('should throw error with invalid provider', async () => {
      validationStubs.isValidProvider.returns(false);
      await expect(Provider.getBlock(null, 123456))
        .to.be.rejectedWith(ProviderError, '获取区块信息失败');
    });

    it('should throw error with invalid block number', async () => {
      validationStubs.isValidBlockNumber.returns(false);
      await expect(Provider.getBlock(mockProvider, 'invalid'))
        .to.be.rejectedWith(ProviderError, '获取区块信息失败');
    });
  });

  describe('getTransaction()', () => {
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should get transaction information successfully', async () => {
      const tx = await Provider.getTransaction(mockProvider, txHash);
      expect(tx).to.deep.equal({ hash: '0x123' });
      expect(mockProvider.getTransaction).to.have.been.calledWith(txHash);
    });

    it('should throw error with invalid provider', async () => {
      validationStubs.isValidProvider.returns(false);
      await expect(Provider.getTransaction(null, txHash))
        .to.be.rejectedWith(ProviderError, '获取交易信息失败');
    });

    it('should throw error with invalid transaction hash', async () => {
      validationStubs.isValidHash.returns(false);
      await expect(Provider.getTransaction(mockProvider, 'invalid'))
        .to.be.rejectedWith(ProviderError, '获取交易信息失败');
    });
  });

  describe('getTransactionReceipt()', () => {
    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should get transaction receipt successfully', async () => {
      const receipt = await Provider.getTransactionReceipt(mockProvider, txHash);
      expect(receipt).to.deep.equal({ status: 1 });
      expect(mockProvider.getTransactionReceipt).to.have.been.calledWith(txHash);
    });

    it('should throw error with invalid provider', async () => {
      validationStubs.isValidProvider.returns(false);
      await expect(Provider.getTransactionReceipt(null, txHash))
        .to.be.rejectedWith(ProviderError, '获取交易收据失败');
    });

    it('should throw error with invalid transaction hash', async () => {
      validationStubs.isValidHash.returns(false);
      await expect(Provider.getTransactionReceipt(mockProvider, 'invalid'))
        .to.be.rejectedWith(ProviderError, '获取交易收据失败');
    });
  });

  describe('getNetwork()', () => {
    it('should get network information successfully', async () => {
      const network = await Provider.getNetwork(mockProvider);
      expect(network).to.deep.equal({ chainId: 11155111 });
      expect(mockProvider.getNetwork).to.have.been.called;
    });

    it('should throw error with invalid provider', async () => {
      validationStubs.isValidProvider.returns(false);
      await expect(Provider.getNetwork(null))
        .to.be.rejectedWith(ProviderError, '获取网络信息失败');
    });
  });

  describe('getBalance()', () => {
    const address = '0x1234567890123456789012345678901234567890';

    it('should get account balance successfully', async () => {
      const balance = await Provider.getBalance(mockProvider, address);
      expect(balance).to.equal(ethers.parseEther('1.0'));
      expect(mockProvider.getBalance).to.have.been.calledWith(address);
    });

    it('should throw error with invalid provider', async () => {
      validationStubs.isValidProvider.returns(false);
      await expect(Provider.getBalance(null, address))
        .to.be.rejectedWith(ProviderError, '获取账户余额失败');
    });

    it('should throw error with invalid address', async () => {
      validationStubs.isValidAddress.returns(false);
      await expect(Provider.getBalance(mockProvider, 'invalid'))
        .to.be.rejectedWith(ProviderError, '获取账户余额失败');
    });
  });
}); 