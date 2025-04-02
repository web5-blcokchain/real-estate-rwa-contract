const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const Contract = require('../../../shared/src/core/contract');
const Provider = require('../../../shared/src/core/provider');
const Wallet = require('../../../shared/src/core/wallet');
const Logger = require('../../../shared/src/utils/logger');
const EnvConfig = require('../../../shared/src/config/env');
const { ContractError } = require('../../../shared/src/utils/errors');

describe('Contract', () => {
  let sandbox;
  let mockProvider;
  let mockSigner;
  let mockContract;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock Logger
    sandbox.stub(Logger, 'info');
    sandbox.stub(Logger, 'debug');
    sandbox.stub(Logger, 'error');

    // Set up environment variables
    process.env.NETWORK_TYPE = 'testnet';
    process.env.TESTNET_RPC_URL = 'http://localhost:8545';
    process.env.TESTNET_CHAIN_ID = '31337';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.CONTRACT_ABI = JSON.stringify([{
      "inputs": [],
      "name": "getValue",
      "outputs": [{"type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }]);
    process.env.ADMIN_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.MANAGER_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.OPERATOR_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

    // Load environment config
    EnvConfig.load();

    // Mock Provider and Wallet
    mockProvider = {
      getCode: sandbox.stub().resolves('0x123456'),
      getNetwork: sandbox.stub().resolves({ chainId: 31337, name: 'localhost' })
    };
    mockSigner = {
      provider: mockProvider,
      getAddress: sandbox.stub().resolves('0x1234567890123456789012345678901234567890')
    };

    // Mock ethers.Contract
    mockContract = {
      runner: { provider: mockProvider },
      target: '0x1234567890123456789012345678901234567890',
      interface: {
        format: () => {}
      },
      getValue: sandbox.stub(),
      setValue: sandbox.stub(),
      on: sandbox.stub(),
      queryFilter: sandbox.stub()
    };

    // Mock Provider.create and Wallet.create
    sandbox.stub(Provider, 'create').returns(mockProvider);
    sandbox.stub(Wallet, 'create').resolves(mockSigner);

    // Mock ethers.Contract constructor
    sandbox.stub(ethers, 'Contract').returns(mockContract);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create a contract instance successfully', async () => {
      const result = await Contract.create();
      expect(result).to.equal(mockContract);
      expect(Logger.info.calledOnce).to.be.true;
    });

    it('should throw error if contract address is invalid', async () => {
      process.env.CONTRACT_ADDRESS = 'invalid';
      await expect(Contract.create())
        .to.be.rejectedWith('无效的合约地址');
    });

    it('should throw error if contract ABI is invalid', async () => {
      process.env.CONTRACT_ABI = 'invalid';
      await expect(Contract.create())
        .to.be.rejectedWith('无效的合约 ABI');
    });
  });

  describe('callMethod', () => {
    it('should call contract method successfully', async () => {
      mockContract.getValue.resolves(42);
      const result = await Contract.call(mockContract, 'getValue');
      expect(result).to.equal(42);
      expect(Logger.debug.calledOnce).to.be.true;
    });

    it('should handle errors when calling contract method', async () => {
      mockContract.getValue.rejects(new Error('Method call failed'));
      await expect(Contract.call(mockContract, 'getValue'))
        .to.be.rejectedWith('调用合约方法失败: Method call failed');
    });
  });

  describe('sendTransaction', () => {
    it('should send transaction successfully', async () => {
      const tx = { hash: '0x123' };
      mockContract.setValue.resolves(tx);
      const result = await Contract.send(mockContract, 'setValue', [42]);
      expect(result).to.equal(tx);
      expect(Logger.info.calledOnce).to.be.true;
    });

    it('should handle errors when sending transaction', async () => {
      mockContract.setValue.rejects(new Error('Transaction failed'));
      await expect(Contract.send(mockContract, 'setValue', [42]))
        .to.be.rejectedWith('发送合约交易失败: Transaction failed');
    });
  });

  describe('listenToEvent', () => {
    it('should set up event listener successfully', async () => {
      mockContract.on.returns({});
      const callback = () => {};
      const result = await Contract.on(mockContract, 'Transfer', {}, callback);
      expect(result).to.exist;
      expect(Logger.info.calledOnce).to.be.true;
    });

    it('should handle errors when setting up event listener', async () => {
      mockContract.on.throws(new Error('Event setup failed'));
      const callback = () => {};
      await expect(Contract.on(mockContract, 'Transfer', {}, callback))
        .to.be.rejectedWith('监听合约事件失败: Event setup failed');
    });
  });

  describe('getPastEvents', () => {
    it('should get past events successfully', async () => {
      const events = [{ event: 'Transfer' }];
      mockContract.queryFilter.resolves(events);
      const result = await Contract.queryFilter(mockContract, 'Transfer');
      expect(result).to.equal(events);
      expect(Logger.debug.calledOnce).to.be.true;
    });

    it('should handle errors when getting past events', async () => {
      mockContract.queryFilter.rejects(new Error('Query failed'));
      await expect(Contract.queryFilter(mockContract, 'Transfer'))
        .to.be.rejectedWith('查询合约事件失败: Query failed');
    });
  });
}); 