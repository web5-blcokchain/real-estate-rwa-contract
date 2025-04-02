const chai = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const Contract = require('../../src/core/contract');
const { ContractError } = require('../../src/utils/errors');
const Logger = require('../../src/utils/logger');
const EnvConfig = require('../../src/config/env');
const Provider = require('../../src/core/provider');
const Wallet = require('../../src/core/wallet');
const Validation = require('../../src/utils/validation');

// 在运行测试之前等待加载所有插件
before(async () => {
  const chaiAsPromised = await import('chai-as-promised');
  const sinonChai = await import('sinon-chai');
  chai.use(chaiAsPromised.default);
  chai.use(sinonChai.default);
});

const { expect } = chai;

describe('Contract', () => {
  let mockContract;
  let mockProvider;
  let mockWallet;
  let mockEnvConfig;

  beforeEach(() => {
    // 设置环境变量
    process.env.DEFAULT_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.DEFAULT_CONTRACT_ABI = JSON.stringify(['function test() view returns (uint256)']);
    process.env.NETWORK_TYPE = 'testnet';
    process.env.TESTNET_RPC_URL = 'http://localhost:8545';
    process.env.TESTNET_CHAIN_ID = '11155111';
    process.env.ADMIN_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.MANAGER_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.OPERATOR_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.BLOCKCHAIN_NETWORK = 'testnet';

    // 创建模拟合约
    mockContract = {
      address: '0x1234567890123456789012345678901234567890',
      abi: ['function test() view returns (uint256)'],
      test: sinon.stub().resolves(42),
      on: sinon.stub().returns({ removeAllListeners: sinon.stub() }),
      queryFilter: sinon.stub().resolves([]),
      provider: {
        getCode: sinon.stub().resolves('0x1234')
      },
      interface: {
        format: sinon.stub().returns('function test()')
      }
    };

    // 创建模拟 Provider
    mockProvider = {
      getNetwork: sinon.stub().resolves({ chainId: 1 }),
      getBlockNumber: sinon.stub().resolves(1000)
    };

    // 创建模拟 Wallet
    mockWallet = {
      address: '0x9876543210987654321098765432109876543210',
      signMessage: sinon.stub().resolves('0xsignature'),
      sendTransaction: sinon.stub().resolves({ hash: '0xtxhash' })
    };

    // 创建模拟 EnvConfig
    mockEnvConfig = {
      getNetworkConfig: sinon.stub().returns({
        network: 'testnet',
        rpcUrl: 'http://localhost:8545'
      }),
      getContractConfig: sinon.stub().returns({
        address: '0x1234567890123456789012345678901234567890',
        abi: ['function test() view returns (uint256)']
      })
    };

    // 设置模拟
    sinon.stub(ethers, 'Contract').returns(mockContract);
    sinon.stub(Provider, 'create').resolves(mockProvider);
    sinon.stub(Wallet, 'create').resolves(mockWallet);
    sinon.stub(EnvConfig, 'getNetworkConfig').returns(mockEnvConfig.getNetworkConfig());
    sinon.stub(EnvConfig, 'getContractConfig').returns(mockEnvConfig.getContractConfig());
    sinon.stub(Validation, 'isValidAddress').returns(true);
    sinon.stub(Validation, 'isValidAbi').returns(true);
    sinon.stub(Validation, 'isValidContract').returns(true);
    sinon.stub(Validation, 'isValidString').returns(true);
    sinon.stub(Validation, 'isValidObject').returns(true);
    sinon.stub(Validation, 'isValidFunction').returns(true);
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.DEFAULT_CONTRACT_ADDRESS;
    delete process.env.DEFAULT_CONTRACT_ABI;
    delete process.env.NETWORK_TYPE;
    delete process.env.TESTNET_RPC_URL;
    delete process.env.TESTNET_CHAIN_ID;
    delete process.env.ADMIN_PRIVATE_KEY;
    delete process.env.MANAGER_PRIVATE_KEY;
    delete process.env.OPERATOR_PRIVATE_KEY;
    delete process.env.BLOCKCHAIN_NETWORK;

    // 恢复所有模拟
    sinon.restore();
  });

  describe('create()', () => {
    it('should create contract instance with valid parameters', async () => {
      const contract = await Contract.create({
        address: '0x1234567890123456789012345678901234567890',
        abi: ['function test() view returns (uint256)']
      });
      expect(contract).to.exist;
    });

    it('should create contract instance with custom parameters', async () => {
      const customAddress = '0x1111111111111111111111111111111111111111';
      const customAbi = ['function custom()'];
      const contract = await Contract.create({
        address: customAddress,
        abi: customAbi,
        provider: mockProvider,
        signer: mockWallet
      });
      expect(contract).to.exist;
    });

    it('should throw error with invalid address', async () => {
      Validation.isValidAddress.returns(false);
      await expect(Contract.create({
        address: 'invalid'
      })).to.be.rejectedWith(ContractError, '创建合约实例失败');
    });

    it('should throw error with invalid ABI', async () => {
      Validation.isValidAbi.returns(false);
      await expect(Contract.create({
        abi: 'invalid'
      })).to.be.rejectedWith(ContractError, '创建合约实例失败');
    });
  });

  describe('call()', () => {
    it('should call contract method successfully', async () => {
      const result = await Contract.call(mockContract, 'test', []);
      expect(result).to.equal(42);
      expect(mockContract.test).to.have.been.calledWith();
    });

    it('should throw error with invalid contract', async () => {
      await expect(Contract.call(null, 'test', []))
        .to.be.rejectedWith(ContractError, '调用合约方法失败');
    });

    it('should throw error with invalid method', async () => {
      await expect(Contract.call(mockContract, null, []))
        .to.be.rejectedWith(ContractError, '调用合约方法失败');
    });
  });

  describe('send()', () => {
    it('should send transaction successfully', async () => {
      mockContract.test.resolves({ hash: '0xtxhash' });
      const tx = await Contract.send(mockContract, 'test', [], { gasLimit: 100000 });
      expect(tx).to.deep.equal({ hash: '0xtxhash' });
      expect(mockContract.test).to.have.been.called;
    });

    it('should throw error with invalid contract', async () => {
      Validation.isValidContract.returns(false);
      await expect(Contract.send(null, 'test', [], {}))
        .to.be.rejectedWith(ContractError, '发送合约交易失败');
    });

    it('should throw error with invalid method', async () => {
      Validation.isValidString.returns(false);
      await expect(Contract.send(mockContract, null, [], {}))
        .to.be.rejectedWith(ContractError, '发送合约交易失败');
    });
  });

  describe('on()', () => {
    beforeEach(() => {
      Validation.isValidContract.returns(true);
      Validation.isValidString.returns(true);
      Validation.isValidObject.returns(true);
      Validation.isValidFunction.returns(true);
    });

    it('should set up event listener successfully', async () => {
      const callback = sinon.stub();
      const listener = await Contract.on(mockContract, 'TestEvent', {}, callback);
      expect(listener).to.have.property('removeAllListeners');
      expect(mockContract.on).to.have.been.called;
    });

    it('should throw error with invalid contract', async () => {
      Validation.isValidContract.returns(false);
      await expect(Contract.on(null, 'TestEvent', {}, () => {}))
        .to.be.rejectedWith(ContractError, '监听合约事件失败');
    });

    it('should throw error with invalid event', async () => {
      Validation.isValidString.returns(false);
      await expect(Contract.on(mockContract, null, {}, () => {}))
        .to.be.rejectedWith(ContractError, '监听合约事件失败');
    });

    it('should throw error with invalid callback', async () => {
      Validation.isValidFunction.returns(false);
      await expect(Contract.on(mockContract, 'TestEvent', {}, null))
        .to.be.rejectedWith(ContractError, '监听合约事件失败');
    });
  });

  describe('queryFilter()', () => {
    beforeEach(() => {
      Validation.isValidContract.returns(true);
      Validation.isValidString.returns(true);
      Validation.isValidObject.returns(true);
    });

    it('should query events successfully', async () => {
      const logs = await Contract.queryFilter(mockContract, 'TestEvent', {}, {});
      expect(logs).to.deep.equal([]);
      expect(mockContract.queryFilter).to.have.been.called;
    });

    it('should throw error with invalid contract', async () => {
      Validation.isValidContract.returns(false);
      await expect(Contract.queryFilter(null, 'TestEvent', {}, {}))
        .to.be.rejectedWith(ContractError, '查询合约事件失败');
    });

    it('should throw error with invalid event', async () => {
      Validation.isValidString.returns(false);
      await expect(Contract.queryFilter(mockContract, null, {}, {}))
        .to.be.rejectedWith(ContractError, '查询合约事件失败');
    });
  });

  describe('getBytecode()', () => {
    beforeEach(() => {
      Validation.isValidContract.returns(true);
    });

    it('should get contract bytecode successfully', async () => {
      const bytecode = await Contract.getBytecode(mockContract);
      expect(bytecode).to.equal('0x1234');
      expect(mockContract.provider.getCode).to.have.been.called;
    });

    it('should throw error with invalid contract', async () => {
      Validation.isValidContract.returns(false);
      await expect(Contract.getBytecode(null))
        .to.be.rejectedWith(ContractError, '获取合约字节码失败');
    });
  });

  describe('getInterface()', () => {
    it('should get contract interface successfully', async () => {
      const contractInterface = await Contract.getInterface(mockContract);
      expect(contractInterface).to.equal('function test()');
      expect(mockContract.interface.format).to.have.been.called;
    });

    it('should throw error with invalid contract', async () => {
      await expect(Contract.getInterface(null))
        .to.be.rejectedWith(ContractError, '获取合约接口失败');
    });
  });
}); 