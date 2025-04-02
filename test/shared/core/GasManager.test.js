const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const GasManager = require('../../../shared/src/core/gas-manager');
const Provider = require('../../../shared/src/core/provider');
const Logger = require('../../../shared/src/utils/logger');
const EnvConfig = require('../../../shared/src/config/env');
const { GasError } = require('../../../shared/src/utils/errors');
const { config } = require('../../../shared/src/config');
const { logger } = require('../../../shared/src/utils/logger');

describe('GasManager', () => {
  let gasManager;
  let sandbox;
  let mockProvider;
  const mockAddress = '0x123...';

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock Provider
    mockProvider = {
      provider: {
        getFeeData: sandbox.stub(),
        getBlock: sandbox.stub(),
        estimateGas: sandbox.stub()
      }
    };
    
    // Mock Provider.create
    sandbox.stub(Provider, 'create').resolves(mockProvider);
    
    // Mock config
    sandbox.stub(config, 'get').callsFake((key) => {
      if (key === 'gas.maxPriorityFeePerGas') return '1000000000';
      if (key === 'gas.maxFeePerGas') return '20000000000';
      if (key === 'gas.gasLimitBuffer') return 1.1;
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
    it('should create a gas manager instance successfully', async () => {
      gasManager = await GasManager.create(mockProvider);

      expect(gasManager).to.exist;
      expect(gasManager.provider).to.equal(mockProvider);
      expect(logger.info.calledWith(
        'Gas manager instance created successfully'
      )).to.be.true;
    });

    it('should throw error if provider is invalid', async () => {
      try {
        await GasManager.create(null);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid provider instance');
      }
    });
  });

  describe('getRecommendedGasPrice', () => {
    beforeEach(async () => {
      gasManager = await GasManager.create(mockProvider);
      mockProvider.provider.getFeeData.resolves({
        maxFeePerGas: '20000000000',
        maxPriorityFeePerGas: '1000000000',
        gasPrice: '15000000000'
      });
    });

    it('should get recommended gas price successfully', async () => {
      const gasPrice = await gasManager.getRecommendedGasPrice();
      
      expect(gasPrice.maxFeePerGas).to.equal('20000000000');
      expect(gasPrice.maxPriorityFeePerGas).to.equal('1000000000');
      expect(gasPrice.gasPrice).to.equal('15000000000');
      expect(mockProvider.provider.getFeeData.called).to.be.true;
      expect(logger.info.calledWith(
        'Recommended gas price retrieved successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle errors when getting gas price', async () => {
      mockProvider.provider.getFeeData.rejects(new Error('Gas price error'));

      try {
        await gasManager.getRecommendedGasPrice();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get recommended gas price: Gas price error');
      }
    });
  });

  describe('estimateGas', () => {
    beforeEach(async () => {
      gasManager = await GasManager.create(mockProvider);
      mockProvider.provider.estimateGas.resolves('21000');
    });

    it('should estimate gas successfully', async () => {
      const tx = {
        to: '0xdef...',
        value: '1000000000000000000'
      };
      
      const gasLimit = await gasManager.estimateGas(tx);
      
      expect(gasLimit).to.equal('23100'); // 21000 * 1.1
      expect(mockProvider.provider.estimateGas.calledWith(tx)).to.be.true;
      expect(logger.info.calledWith(
        'Gas estimation completed successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle errors when estimating gas', async () => {
      mockProvider.provider.estimateGas.rejects(new Error('Estimation error'));

      try {
        await gasManager.estimateGas({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to estimate gas: Estimation error');
      }
    });
  });

  describe('calculateFee', () => {
    beforeEach(async () => {
      gasManager = await GasManager.create(mockProvider);
      mockProvider.provider.getFeeData.resolves({
        maxFeePerGas: '20000000000',
        maxPriorityFeePerGas: '1000000000',
        gasPrice: '15000000000'
      });
    });

    it('should calculate fee for EIP-1559 transaction', async () => {
      const tx = {
        to: '0xdef...',
        value: '1000000000000000000',
        maxFeePerGas: '20000000000',
        maxPriorityFeePerGas: '1000000000',
        gasLimit: '21000'
      };
      
      const fee = await gasManager.calculateFee(tx);
      
      expect(fee).to.equal('420000000000000'); // 20000000000 * 21000
      expect(logger.info.calledWith(
        'Transaction fee calculated successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should calculate fee for legacy transaction', async () => {
      const tx = {
        to: '0xdef...',
        value: '1000000000000000000',
        gasPrice: '15000000000',
        gasLimit: '21000'
      };
      
      const fee = await gasManager.calculateFee(tx);
      
      expect(fee).to.equal('315000000000000'); // 15000000000 * 21000
    });

    it('should handle errors when calculating fee', async () => {
      mockProvider.provider.getFeeData.rejects(new Error('Fee calculation error'));

      try {
        await gasManager.calculateFee({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to calculate fee: Fee calculation error');
      }
    });
  });

  describe('_calculatePriorityFee', () => {
    beforeEach(async () => {
      gasManager = await GasManager.create(mockProvider);
      mockProvider.provider.getBlock.resolves({
        transactions: [
          { maxPriorityFeePerGas: '1000000000' },
          { maxPriorityFeePerGas: '2000000000' },
          { maxPriorityFeePerGas: '3000000000' }
        ]
      });
    });

    it('should calculate average priority fee successfully', async () => {
      const priorityFee = await gasManager._calculatePriorityFee();
      
      expect(priorityFee).to.equal('2000000000'); // (1000000000 + 2000000000 + 3000000000) / 3
      expect(mockProvider.provider.getBlock.calledWith('latest')).to.be.true;
    });

    it('should handle empty block', async () => {
      mockProvider.provider.getBlock.resolves({
        transactions: []
      });
      
      const priorityFee = await gasManager._calculatePriorityFee();
      expect(priorityFee).to.equal('1000000000'); // Default value
    });

    it('should handle errors when calculating priority fee', async () => {
      mockProvider.provider.getBlock.rejects(new Error('Block error'));

      try {
        await gasManager._calculatePriorityFee();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to calculate priority fee: Block error');
      }
    });
  });
}); 