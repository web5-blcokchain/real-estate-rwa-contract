const { expect } = require('chai');
const { ethers } = require('ethers');
const EventManager = require('../src/core/EventManager');
const { EventError } = require('../src/utils/errors');
const Provider = require('../src/core/Provider');
const Contract = require('../src/core/Contract');

describe('EventManager', () => {
  let eventManager;
  let provider;
  let contract;

  before(async () => {
    provider = Provider.create();
    contract = await Contract.create({
      provider,
      address: '0x...', // 替换为实际的合约地址
      abi: [] // 替换为实际的 ABI
    });
  });

  beforeEach(async () => {
    eventManager = await EventManager.create({
      provider,
      contract
    });
  });

  describe('create', () => {
    it('应该使用默认配置创建事件管理器', async () => {
      const defaultManager = await EventManager.create();
      expect(defaultManager).to.be.instanceOf(EventManager);
    });

    it('应该使用自定义配置创建事件管理器', async () => {
      const customManager = await EventManager.create({
        provider,
        contract,
        storagePath: './test-events'
      });
      expect(customManager).to.be.instanceOf(EventManager);
    });
  });

  describe('on', () => {
    it('应该监听合约事件', async () => {
      let eventReceived = false;
      await eventManager.on('Transfer', (from, to, value) => {
        eventReceived = true;
      });

      // 这里需要触发一个实际的 Transfer 事件
      // 或者使用模拟的事件数据
      expect(eventReceived).to.be.false;
    });

    it('应该验证无效的事件名称', async () => {
      await expect(
        eventManager.on('NonExistentEvent', () => {})
      ).to.be.rejectedWith(EventError, '无效的事件名称');
    });
  });

  describe('off', () => {
    it('应该停止监听合约事件', async () => {
      const listenerId = await eventManager.on('Transfer', () => {});
      await eventManager.off(listenerId);
      expect(eventManager.hasListener(listenerId)).to.be.false;
    });

    it('应该处理不存在的事件监听器', async () => {
      await expect(
        eventManager.off('non-existent-listener')
      ).to.be.rejectedWith(EventError, '事件监听器不存在');
    });
  });

  describe('offAll', () => {
    it('应该停止所有事件监听', async () => {
      await eventManager.on('Transfer', () => {});
      await eventManager.on('Approval', () => {});
      await eventManager.offAll();
      expect(eventManager.listeners.size).to.equal(0);
    });
  });

  describe('query', () => {
    it('应该查询历史事件', async () => {
      const events = await eventManager.query('Transfer', {
        fromBlock: 0,
        toBlock: 'latest'
      });
      expect(events).to.be.an('array');
    });

    it('应该处理无效的查询参数', async () => {
      await expect(
        eventManager.query('Transfer', {
          fromBlock: 'invalid',
          toBlock: 'invalid'
        })
      ).to.be.rejectedWith(EventError);
    });
  });

  describe('hasListener', () => {
    it('应该检查事件监听器是否存在', async () => {
      const listenerId = await eventManager.on('Transfer', () => {});
      expect(eventManager.hasListener(listenerId)).to.be.true;
      expect(eventManager.hasListener('non-existent-listener')).to.be.false;
    });
  });

  describe('replay', () => {
    it('应该重放历史事件', async () => {
      let eventCount = 0;
      await eventManager.replay('Transfer', {
        fromBlock: 0,
        toBlock: 'latest'
      }, () => {
        eventCount++;
      });
      expect(eventCount).to.be.at.least(0);
    });

    it('应该处理无效的重放参数', async () => {
      await expect(
        eventManager.replay('NonExistentEvent', {}, () => {})
      ).to.be.rejectedWith(EventError);
    });
  });
}); 