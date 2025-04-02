const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const Provider = require('../../../shared/src/core/provider');
const Logger = require('../../../shared/src/utils/logger');
const EnvConfig = require('../../../shared/src/config/env');
const { ProviderError } = require('../../../shared/src/utils/errors');

describe('Provider', () => {
  let provider;
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock config
    sandbox.stub(config, 'get').callsFake((key) => {
      if (key === 'network.type') return 'testnet';
      if (key === 'network.rpcUrl') return 'http://localhost:8545';
      if (key === 'network.chainId') return 31337;
      throw new Error(`Unknown key: ${key}`);
    });
    
    // Mock logger
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create a provider instance successfully', async () => {
      provider = await Provider.create();

      expect(provider).to.exist;
      expect(provider.rpcUrl).to.equal('http://localhost:8545');
      expect(provider.chainId).to.equal(31337);
      expect(logger.info.calledWith(
        'Provider instance created successfully'
      )).to.be.true;
    });

    it('should create a provider instance with custom config', async () => {
      const customRpcUrl = 'http://custom:8545';
      const customChainId = 1;
      
      provider = await Provider.create({
        rpcUrl: customRpcUrl,
        chainId: customChainId
      });

      expect(provider.rpcUrl).to.equal(customRpcUrl);
      expect(provider.chainId).to.equal(customChainId);
    });

    it('should throw error if RPC URL is invalid', async () => {
      try {
        await Provider.create({ rpcUrl: 'invalid-url' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid RPC URL');
      }
    });
  });

  describe('getBlockNumber', () => {
    beforeEach(async () => {
      provider = await Provider.create();
      provider.provider = {
        getBlockNumber: sandbox.stub().resolves(12345)
      };
    });

    it('should get current block number successfully', async () => {
      const blockNumber = await provider.getBlockNumber();
      
      expect(blockNumber).to.equal(12345);
      expect(provider.provider.getBlockNumber.called).to.be.true;
      expect(logger.info.calledWith(
        'Current block number retrieved successfully:',
        12345
      )).to.be.true;
    });

    it('should handle errors when getting block number', async () => {
      provider.provider.getBlockNumber.rejects(new Error('Block number error'));

      try {
        await provider.getBlockNumber();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get block number: Block number error');
      }
    });
  });

  describe('getBlock', () => {
    beforeEach(async () => {
      provider = await Provider.create();
      provider.provider = {
        getBlock: sandbox.stub().resolves({
          number: 12345,
          hash: '0x123...',
          timestamp: 1234567890
        })
      };
    });

    it('should get block information successfully', async () => {
      const block = await provider.getBlock(12345);
      
      expect(block.number).to.equal(12345);
      expect(block.hash).to.equal('0x123...');
      expect(block.timestamp).to.equal(1234567890);
      expect(provider.provider.getBlock.calledWith(12345)).to.be.true;
      expect(logger.info.calledWith(
        'Block information retrieved successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle non-existent block', async () => {
      provider.provider.getBlock.resolves(null);
      
      const block = await provider.getBlock(99999);
      expect(block).to.be.null;
    });

    it('should handle errors when getting block', async () => {
      provider.provider.getBlock.rejects(new Error('Block error'));

      try {
        await provider.getBlock(12345);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get block: Block error');
      }
    });
  });

  describe('getTransaction', () => {
    beforeEach(async () => {
      provider = await Provider.create();
      provider.provider = {
        getTransaction: sandbox.stub().resolves({
          hash: '0x789...',
          from: '0xabc...',
          to: '0xdef...',
          value: '1000000000000000000'
        })
      };
    });

    it('should get transaction information successfully', async () => {
      const tx = await provider.getTransaction('0x789...');
      
      expect(tx.hash).to.equal('0x789...');
      expect(tx.from).to.equal('0xabc...');
      expect(tx.to).to.equal('0xdef...');
      expect(tx.value).to.equal('1000000000000000000');
      expect(provider.provider.getTransaction.calledWith('0x789...')).to.be.true;
      expect(logger.info.calledWith(
        'Transaction information retrieved successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle non-existent transaction', async () => {
      provider.provider.getTransaction.resolves(null);
      
      const tx = await provider.getTransaction('0x999...');
      expect(tx).to.be.null;
    });

    it('should handle errors when getting transaction', async () => {
      provider.provider.getTransaction.rejects(new Error('Transaction error'));

      try {
        await provider.getTransaction('0x789...');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get transaction: Transaction error');
      }
    });
  });

  describe('getTransactionReceipt', () => {
    beforeEach(async () => {
      provider = await Provider.create();
      provider.provider = {
        getTransactionReceipt: sandbox.stub().resolves({
          transactionHash: '0x789...',
          status: 1,
          blockNumber: 12345,
          gasUsed: '21000'
        })
      };
    });

    it('should get transaction receipt successfully', async () => {
      const receipt = await provider.getTransactionReceipt('0x789...');
      
      expect(receipt.transactionHash).to.equal('0x789...');
      expect(receipt.status).to.equal(1);
      expect(receipt.blockNumber).to.equal(12345);
      expect(receipt.gasUsed).to.equal('21000');
      expect(provider.provider.getTransactionReceipt.calledWith('0x789...')).to.be.true;
      expect(logger.info.calledWith(
        'Transaction receipt retrieved successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle non-existent receipt', async () => {
      provider.provider.getTransactionReceipt.resolves(null);
      
      const receipt = await provider.getTransactionReceipt('0x999...');
      expect(receipt).to.be.null;
    });

    it('should handle errors when getting receipt', async () => {
      provider.provider.getTransactionReceipt.rejects(new Error('Receipt error'));

      try {
        await provider.getTransactionReceipt('0x789...');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get transaction receipt: Receipt error');
      }
    });
  });

  describe('getBalance', () => {
    beforeEach(async () => {
      provider = await Provider.create();
      provider.provider = {
        getBalance: sandbox.stub().resolves('1000000000000000000')
      };
    });

    it('should get account balance successfully', async () => {
      const balance = await provider.getBalance('0xabc...');
      
      expect(balance).to.equal('1000000000000000000');
      expect(provider.provider.getBalance.calledWith('0xabc...')).to.be.true;
      expect(logger.info.calledWith(
        'Account balance retrieved successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle errors when getting balance', async () => {
      provider.provider.getBalance.rejects(new Error('Balance error'));

      try {
        await provider.getBalance('0xabc...');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get balance: Balance error');
      }
    });
  });

  describe('getNetwork', () => {
    beforeEach(async () => {
      provider = await Provider.create();
      provider.provider = {
        getNetwork: sandbox.stub().resolves({
          chainId: 31337,
          name: 'localhost'
        })
      };
    });

    it('should get network information successfully', async () => {
      const network = await provider.getNetwork();
      
      expect(network.chainId).to.equal(31337);
      expect(network.name).to.equal('localhost');
      expect(provider.provider.getNetwork.called).to.be.true;
      expect(logger.info.calledWith(
        'Network information retrieved successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle errors when getting network', async () => {
      provider.provider.getNetwork.rejects(new Error('Network error'));

      try {
        await provider.getNetwork();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get network: Network error');
      }
    });
  });
}); 