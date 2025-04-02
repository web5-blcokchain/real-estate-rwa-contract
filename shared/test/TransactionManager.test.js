const { expect } = require('chai');
const { ethers } = require('ethers');
const TransactionManager = require('../src/core/TransactionManager');
const { TransactionError } = require('../src/utils/errors');
const Provider = require('../src/core/Provider');
const Wallet = require('../src/core/Wallet');

describe('TransactionManager', () => {
  let transactionManager;
  let provider;
  let wallet;

  before(async () => {
    provider = Provider.create();
    wallet = await Wallet.create({ provider });
  });

  beforeEach(async () => {
    transactionManager = await TransactionManager.create({
      signer: wallet
    });
  });

  describe('create', () => {
    it('应该使用默认配置创建交易管理器', async () => {
      const defaultManager = await TransactionManager.create();
      expect(defaultManager).to.be.instanceOf(TransactionManager);
    });

    it('应该使用自定义配置创建交易管理器', async () => {
      const customManager = await TransactionManager.create({
        signer: wallet,
        maxRetries: 5,
        retryDelay: 2000,
        timeout: 60000
      });
      expect(customManager).to.be.instanceOf(TransactionManager);
    });
  });

  describe('send', () => {
    it('应该发送交易', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const tx = await transactionManager.send(transaction);
      expect(tx).to.be.an('object');
      expect(tx.hash).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it('应该处理无效的交易', async () => {
      const invalidTx = {
        to: 'invalid-address',
        value: 'invalid-value'
      };
      await expect(
        transactionManager.send(invalidTx)
      ).to.be.rejectedWith(TransactionError);
    });

    it('应该重试失败的交易', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      // 模拟网络错误
      const originalSend = wallet.sendTransaction;
      let retryCount = 0;
      wallet.sendTransaction = async () => {
        if (retryCount < 2) {
          retryCount++;
          throw new Error('network error');
        }
        return originalSend.apply(wallet, arguments);
      };

      const tx = await transactionManager.send(transaction);
      expect(tx).to.be.an('object');
      expect(tx.hash).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(retryCount).to.equal(2);

      // 恢复原始方法
      wallet.sendTransaction = originalSend;
    });
  });

  describe('wait', () => {
    it('应该等待交易确认', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const tx = await transactionManager.send(transaction);
      const receipt = await transactionManager.wait(tx.hash);
      expect(receipt).to.be.an('object');
      expect(receipt.transactionHash).to.equal(tx.hash);
    });

    it('应该处理不存在的交易', async () => {
      await expect(
        transactionManager.wait('0x0000000000000000000000000000000000000000000000000000000000000000')
      ).to.be.rejectedWith(TransactionError);
    });
  });

  describe('getStatus', () => {
    it('应该获取交易状态', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const tx = await transactionManager.send(transaction);
      const status = await transactionManager.getStatus(tx.hash);
      expect(['pending', 'confirmed', 'failed']).to.include(status);
    });
  });

  describe('getDetails', () => {
    it('应该获取交易详情', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const tx = await transactionManager.send(transaction);
      const details = await transactionManager.getDetails(tx.hash);
      expect(details).to.be.an('object');
      expect(details.hash).to.equal(tx.hash);
    });
  });

  describe('getReceipt', () => {
    it('应该获取交易收据', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const tx = await transactionManager.send(transaction);
      const receipt = await transactionManager.getReceipt(tx.hash);
      expect(receipt).to.be.an('object');
      expect(receipt.transactionHash).to.equal(tx.hash);
    });
  });

  describe('cancel', () => {
    it('应该取消待处理的交易', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const tx = await transactionManager.send(transaction);
      const cancelTx = await transactionManager.cancel(tx.hash);
      expect(cancelTx).to.be.an('object');
      expect(cancelTx.hash).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('speedUp', () => {
    it('应该加速待处理的交易', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1')
      };
      const tx = await transactionManager.send(transaction);
      const speedUpTx = await transactionManager.speedUp(tx.hash);
      expect(speedUpTx).to.be.an('object');
      expect(speedUpTx.hash).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });
}); 