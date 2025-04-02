const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const TransactionManager = require('../../../shared/src/core/transaction-manager');
const Provider = require('../../../shared/src/core/provider');
const Wallet = require('../../../shared/src/core/wallet');
const Logger = require('../../../shared/src/utils/logger');
const EnvConfig = require('../../../shared/src/config/env');
const { TransactionError } = require('../../../shared/src/utils/errors');

describe('TransactionManager', () => {
  let transactionManager;
  let sandbox;
  let mockProvider;
  let mockWallet;
  const mockAddress = '0x123...';
  const mockPrivateKey = '0xabc...';
  let provider;
  let wallet;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock Wallet
    mockWallet = {
      address: mockAddress,
      signer: {
        sendTransaction: sandbox.stub(),
        getTransactionCount: sandbox.stub(),
        provider: {
          getTransaction: sandbox.stub(),
          getTransactionReceipt: sandbox.stub(),
          waitForTransaction: sandbox.stub()
        }
      }
    };
    
    // Mock Wallet.create
    sandbox.stub(Wallet, 'create').resolves(mockWallet);
    
    // Mock config
    sandbox.stub(EnvConfig.transactions, 'get').callsFake((key) => {
      if (key === 'maxRetries') return 3;
      if (key === 'retryDelay') return 1000;
      if (key === 'timeout') return 30000;
      throw new Error(`Unknown key: ${key}`);
    });
    
    // Mock logger
    sandbox.stub(Logger, 'info');
    sandbox.stub(Logger, 'error');

    // 创建 provider 和 wallet
    provider = ethers.provider;
    wallet = ethers.Wallet.createRandom().connect(provider);
    
    // 创建 TransactionManager 实例
    transactionManager = TransactionManager.create(provider, wallet);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create a transaction manager instance successfully', async () => {
      expect(transactionManager).to.exist;
      expect(transactionManager.wallet).to.equal(mockWallet);
      expect(Logger.info.calledWith(
        'Transaction manager instance created successfully'
      )).to.be.true;
    });

    it('should throw error if wallet is invalid', async () => {
      try {
        await TransactionManager.create(null);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid wallet instance');
      }
    });
  });

  describe('send', () => {
    beforeEach(async () => {
      transactionManager = await TransactionManager.create(mockWallet);
      mockWallet.signer.sendTransaction.resolves({
        hash: '0x789...',
        from: mockAddress,
        to: '0xdef...'
      });
    });

    it('should send transaction successfully', async () => {
      const tx = {
        to: '0xdef...',
        value: '1000000000000000000',
        gasLimit: '21000'
      };
      
      const result = await transactionManager.send(tx);
      
      expect(result.hash).to.equal('0x789...');
      expect(mockWallet.signer.sendTransaction.calledWith(tx)).to.be.true;
      expect(Logger.info.calledWith(
        'Transaction sent successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should retry on retryable errors', async () => {
      const tx = {
        to: '0xdef...',
        value: '1000000000000000000'
      };
      
      mockWallet.signer.sendTransaction
        .onFirstCall().rejects(new Error('nonce too low'))
        .onSecondCall().resolves({
          hash: '0x789...',
          from: mockAddress,
          to: '0xdef...'
        });
      
      const result = await transactionManager.send(tx);
      
      expect(result.hash).to.equal('0x789...');
      expect(mockWallet.signer.sendTransaction.callCount).to.equal(2);
      expect(Logger.info.calledWith(
        'Retrying transaction due to retryable error: nonce too low'
      )).to.be.true;
    });

    it('should fail after max retries', async () => {
      const tx = {
        to: '0xdef...',
        value: '1000000000000000000'
      };
      
      mockWallet.signer.sendTransaction.rejects(new Error('nonce too low'));
      
      try {
        await transactionManager.send(tx);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to send transaction after 3 retries');
        expect(mockWallet.signer.sendTransaction.callCount).to.equal(3);
      }
    });
  });

  describe('wait', () => {
    beforeEach(async () => {
      transactionManager = await TransactionManager.create(mockWallet);
      mockWallet.signer.provider.waitForTransaction.resolves({
        status: 1,
        blockNumber: 12345
      });
    });

    it('should wait for transaction successfully', async () => {
      const receipt = await transactionManager.wait('0x789...');
      
      expect(receipt.status).to.equal(1);
      expect(receipt.blockNumber).to.equal(12345);
      expect(mockWallet.signer.provider.waitForTransaction.calledWith(
        '0x789...',
        sinon.match.object
      )).to.be.true;
      expect(Logger.info.calledWith(
        'Transaction confirmed successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should retry on timeout', async () => {
      mockWallet.signer.provider.waitForTransaction
        .onFirstCall().rejects(new Error('timeout'))
        .onSecondCall().resolves({
          status: 1,
          blockNumber: 12345
        });
      
      const receipt = await transactionManager.wait('0x789...');
      
      expect(receipt.status).to.equal(1);
      expect(mockWallet.signer.provider.waitForTransaction.callCount).to.equal(2);
      expect(Logger.info.calledWith(
        'Retrying transaction wait due to timeout'
      )).to.be.true;
    });

    it('should fail after max retries', async () => {
      mockWallet.signer.provider.waitForTransaction.rejects(new Error('timeout'));
      
      try {
        await transactionManager.wait('0x789...');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to wait for transaction after 3 retries');
        expect(mockWallet.signer.provider.waitForTransaction.callCount).to.equal(3);
      }
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      transactionManager = await TransactionManager.create(mockWallet);
      mockWallet.signer.provider.getTransaction.resolves({
        hash: '0x789...',
        blockNumber: 12345
      });
    });

    it('should get transaction status successfully', async () => {
      const status = await transactionManager.getStatus('0x789...');
      
      expect(status).to.exist;
      expect(status.blockNumber).to.equal(12345);
      expect(mockWallet.signer.provider.getTransaction.calledWith(
        '0x789...'
      )).to.be.true;
    });

    it('should handle non-existent transaction', async () => {
      mockWallet.signer.provider.getTransaction.resolves(null);
      
      const status = await transactionManager.getStatus('0x789...');
      expect(status).to.be.null;
    });
  });

  describe('getReceipt', () => {
    beforeEach(async () => {
      transactionManager = await TransactionManager.create(mockWallet);
      mockWallet.signer.provider.getTransactionReceipt.resolves({
        status: 1,
        blockNumber: 12345,
        gasUsed: '21000'
      });
    });

    it('should get transaction receipt successfully', async () => {
      const receipt = await transactionManager.getReceipt('0x789...');
      
      expect(receipt.status).to.equal(1);
      expect(receipt.blockNumber).to.equal(12345);
      expect(receipt.gasUsed).to.equal('21000');
      expect(mockWallet.signer.provider.getTransactionReceipt.calledWith(
        '0x789...'
      )).to.be.true;
    });

    it('should handle non-existent receipt', async () => {
      mockWallet.signer.provider.getTransactionReceipt.resolves(null);
      
      const receipt = await transactionManager.getReceipt('0x789...');
      expect(receipt).to.be.null;
    });
  });
}); 