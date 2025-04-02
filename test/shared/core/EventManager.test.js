const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const EventManager = require('../../../shared/src/core/event-manager');
const Contract = require('../../../shared/src/core/contract');
const Provider = require('../../../shared/src/core/provider');
const Logger = require('../../../shared/src/utils/logger');
const EnvConfig = require('../../../shared/src/config/env');
const { EventError } = require('../../../shared/src/utils/errors');

describe('EventManager', () => {
  let eventManager;
  let sandbox;
  let mockProvider;
  let mockContract;
  const mockAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Set up environment variables
    process.env.NETWORK_TYPE = 'testnet';
    process.env.TESTNET_RPC_URL = 'http://localhost:8545';
    process.env.TESTNET_CHAIN_ID = '31337';
    process.env.ADMIN_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.MANAGER_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.OPERATOR_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.EVENT_MAX_RETRIES = '3';
    process.env.EVENT_RETRY_DELAY = '1000';
    process.env.EVENT_BATCH_SIZE = '100';
    
    // Load environment config
    EnvConfig.load();
    
    // Mock Provider
    mockProvider = {
      getBlockNumber: sandbox.stub().resolves(1000),
      getLogs: sandbox.stub().resolves([]),
      on: sandbox.stub().returns(() => {}),
      off: sandbox.stub()
    };
    
    // Mock Contract
    mockContract = {
      address: mockAddress,
      interface: {
        getEvent: sandbox.stub().returns({
          name: 'PropertyRegistered',
          inputs: [
            { name: 'propertyId', type: 'string' },
            { name: 'location', type: 'string' }
          ]
        }),
        parseLog: sandbox.stub().returns({
          eventName: 'PropertyRegistered',
          args: {
            propertyId: 'PROP001',
            location: 'Tokyo'
          }
        })
      },
      provider: mockProvider,
      queryFilter: sandbox.stub().resolves([{
        eventName: 'PropertyRegistered',
        args: {
          propertyId: 'PROP001',
          location: 'Tokyo'
        }
      }]),
      on: sandbox.stub().returns(() => {}),
      off: sandbox.stub()
    };
    
    // Mock Logger
    sandbox.stub(Logger, 'info');
    sandbox.stub(Logger, 'error');
    sandbox.stub(Logger, 'debug');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create an event manager instance successfully', async () => {
      eventManager = await EventManager.create(mockContract);

      expect(eventManager).to.exist;
      expect(eventManager.contract).to.equal(mockContract);
      expect(Logger.info.calledOnce).to.be.true;
    });

    it('should throw error if contract is invalid', async () => {
      await expect(EventManager.create(null))
        .to.be.rejectedWith('Invalid contract instance');
    });
  });

  describe('on', () => {
    beforeEach(async () => {
      eventManager = await EventManager.create(mockContract);
    });

    it('should set up event listener successfully', async () => {
      const callback = sinon.stub();
      const unsubscribe = await eventManager.on('PropertyRegistered', callback);
      
      expect(mockContract.on.calledWith(
        'PropertyRegistered',
        callback
      )).to.be.true;
      expect(Logger.info.calledOnce).to.be.true;
      expect(unsubscribe).to.exist;
    });

    it('should handle errors when setting up event listener', async () => {
      mockContract.on.throws(new Error('Listener error'));
      await expect(eventManager.on('PropertyRegistered', () => {}))
        .to.be.rejectedWith('Failed to set up event listener: Listener error');
    });
  });

  describe('off', () => {
    beforeEach(async () => {
      eventManager = await EventManager.create(mockContract);
    });

    it('should remove event listener successfully', async () => {
      await eventManager.off('PropertyRegistered');
      
      expect(mockContract.off.calledWith(
        'PropertyRegistered'
      )).to.be.true;
      expect(Logger.info.calledOnce).to.be.true;
    });

    it('should handle errors when removing event listener', async () => {
      mockContract.off.throws(new Error('Remove error'));
      await expect(eventManager.off('PropertyRegistered'))
        .to.be.rejectedWith('Failed to remove event listener: Remove error');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      eventManager = await EventManager.create(mockContract);
    });

    it('should query past events successfully', async () => {
      const events = await eventManager.query('PropertyRegistered', {
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      expect(events).to.have.lengthOf(1);
      expect(events[0].eventName).to.equal('PropertyRegistered');
      expect(events[0].args.propertyId).to.equal('PROP001');
      expect(mockContract.queryFilter.calledWith(
        'PropertyRegistered',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle errors when querying events', async () => {
      mockContract.queryFilter.rejects(new Error('Query error'));
      await expect(eventManager.query('PropertyRegistered'))
        .to.be.rejectedWith('Failed to query events: Query error');
    });
  });

  describe('replay', () => {
    beforeEach(async () => {
      eventManager = await EventManager.create(mockContract);
    });

    it('should replay past events successfully', async () => {
      const callback = sinon.stub();
      await eventManager.replay('PropertyRegistered', callback, {
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      expect(callback.calledOnce).to.be.true;
      expect(mockContract.queryFilter.calledWith(
        'PropertyRegistered',
        sinon.match.object
      )).to.be.true;
      expect(Logger.info.calledOnce).to.be.true;
    });

    it('should handle errors when replaying events', async () => {
      mockContract.queryFilter.rejects(new Error('Replay error'));
      await expect(eventManager.replay('PropertyRegistered', () => {}))
        .to.be.rejectedWith('Failed to replay events: Replay error');
    });
  });
}); 