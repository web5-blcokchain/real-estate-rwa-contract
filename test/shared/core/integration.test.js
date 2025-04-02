const { expect } = require('chai');
const sinon = require('sinon');
const { Provider } = require('../../../shared/src/core/Provider');
const { Wallet } = require('../../../shared/src/core/Wallet');
const { Contract } = require('../../../shared/src/core/Contract');
const { EventManager } = require('../../../shared/src/core/EventManager');
const { TransactionManager } = require('../../../shared/src/core/TransactionManager');
const { GasManager } = require('../../../shared/src/core/GasManager');
const { config } = require('../../../shared/src/config');
const { logger } = require('../../../shared/src/utils/logger');

describe('Core Module Integration', () => {
  let sandbox;
  let provider;
  let wallet;
  let contract;
  let eventManager;
  let transactionManager;
  let gasManager;
  
  const mockRpcUrl = 'http://localhost:8545';
  const mockChainId = 1337;
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockAddress = '0x123...';
  const mockContractAddress = '0xdef...';
  const mockAbi = [
    {
      name: 'transfer',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'nonpayable'
    },
    {
      name: 'Transfer',
      type: 'event',
      inputs: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    }
  ];

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    
    // Mock config
    sandbox.stub(config.network, 'get').callsFake((key) => {
      if (key === 'rpcUrl') return mockRpcUrl;
      if (key === 'chainId') return mockChainId;
      throw new Error(`Unknown key: ${key}`);
    });
    
    sandbox.stub(config.wallet, 'get').callsFake((key) => {
      if (key === 'privateKey') return mockPrivateKey;
      throw new Error(`Unknown key: ${key}`);
    });
    
    sandbox.stub(config.contracts, 'get').callsFake((key) => {
      if (key === 'address') return mockContractAddress;
      if (key === 'abi') return mockAbi;
      throw new Error(`Unknown key: ${key}`);
    });
    
    // Mock logger
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');
    
    // Create instances
    provider = await Provider.create();
    wallet = await Wallet.create();
    contract = await Contract.create(wallet);
    eventManager = await EventManager.create(contract);
    transactionManager = await TransactionManager.create(wallet);
    gasManager = await GasManager.create(provider);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('End-to-end transaction flow', () => {
    it('should execute a complete transaction flow', async () => {
      // 1. Get recommended gas price
      const mockGasPrice = {
        maxFeePerGas: '20000000000',
        maxPriorityFeePerGas: '1000000000',
        gasPrice: '15000000000'
      };
      
      sandbox.stub(gasManager, 'getRecommendedGasPrice').resolves(mockGasPrice);
      
      const gasPrice = await gasManager.getRecommendedGasPrice();
      expect(gasPrice).to.deep.equal(mockGasPrice);
      
      // 2. Estimate gas
      const tx = {
        to: mockContractAddress,
        data: '0x...',
        value: '0'
      };
      
      sandbox.stub(gasManager, 'estimateGas').resolves('50000');
      
      const gasLimit = await gasManager.estimateGas(tx);
      expect(gasLimit).to.equal('50000');
      
      // 3. Create and sign transaction
      const transaction = {
        ...tx,
        gasLimit,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
      };
      
      sandbox.stub(wallet.signer, 'signTransaction').resolves('0x789...');
      
      const signedTx = await wallet.signTransaction(transaction);
      expect(signedTx).to.equal('0x789...');
      
      // 4. Send transaction
      sandbox.stub(transactionManager, 'send').resolves({
        hash: '0x789...',
        from: mockAddress,
        to: mockContractAddress
      });
      
      const sentTx = await transactionManager.send(transaction);
      expect(sentTx.hash).to.equal('0x789...');
      
      // 5. Wait for confirmation
      sandbox.stub(transactionManager, 'wait').resolves({
        status: 1,
        blockNumber: 12345,
        gasUsed: '45000'
      });
      
      const receipt = await transactionManager.wait(sentTx.hash);
      expect(receipt.status).to.equal(1);
      
      // 6. Listen for events
      const mockEvent = {
        eventName: 'Transfer',
        args: {
          from: mockAddress,
          to: '0xabc...',
          amount: '1000000000000000000'
        }
      };
      
      sandbox.stub(eventManager, 'on').callsFake((eventName, callback) => {
        callback(mockEvent);
        return () => {};
      });
      
      let eventReceived;
      await eventManager.on('Transfer', (event) => {
        eventReceived = event;
      });
      
      expect(eventReceived).to.deep.equal(mockEvent);
    });
  });

  describe('Error handling and recovery', () => {
    it('should handle and recover from transaction failures', async () => {
      // 1. Simulate network error
      sandbox.stub(provider.provider, 'getBlockNumber')
        .onFirstCall().rejects(new Error('Network error'))
        .onSecondCall().resolves(12345);
      
      try {
        await provider.getBlockNumber();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get block number: Network error');
      }
      
      const blockNumber = await provider.getBlockNumber();
      expect(blockNumber).to.equal(12345);
      
      // 2. Simulate transaction failure with retry
      const tx = {
        to: mockContractAddress,
        value: '1000000000000000000'
      };
      
      sandbox.stub(transactionManager, 'send')
        .onFirstCall().rejects(new Error('nonce too low'))
        .onSecondCall().resolves({
          hash: '0x789...',
          from: mockAddress,
          to: mockContractAddress
        });
      
      const sentTx = await transactionManager.send(tx);
      expect(sentTx.hash).to.equal('0x789...');
      
      // 3. Simulate event listener recovery
      sandbox.stub(eventManager, 'on')
        .onFirstCall().rejects(new Error('Subscription error'))
        .onSecondCall().resolves(() => {});
      
      try {
        await eventManager.on('Transfer', () => {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to set up event listener: Subscription error');
      }
      
      const unsubscribe = await eventManager.on('Transfer', () => {});
      expect(unsubscribe).to.be.a('function');
    });
  });
}); 