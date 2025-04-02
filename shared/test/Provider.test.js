const { expect } = require('chai');
const { ethers } = require('ethers');
const Provider = require('../src/core/Provider');
const { NetworkError } = require('../src/utils/errors');
const EnvConfig = require('../src/config/env');

describe('Provider', () => {
  let provider;
  const config = EnvConfig.getNetworkConfig();

  beforeEach(() => {
    // 在每个测试前创建新的 Provider 实例
    provider = Provider.create({
      networkType: config.NETWORK_TYPE,
      rpcUrl: config.NETWORK_URL,
      chainId: config.NETWORK_CHAIN_ID
    });
  });

  describe('create', () => {
    it('应该使用默认配置创建 Provider', () => {
      const defaultProvider = Provider.create();
      expect(defaultProvider).to.be.instanceOf(ethers.JsonRpcProvider);
    });

    it('应该使用自定义配置创建 Provider', () => {
      const customProvider = Provider.create({
        networkType: 'testnet',
        rpcUrl: 'http://localhost:8545',
        chainId: 1337
      });
      expect(customProvider).to.be.instanceOf(ethers.JsonRpcProvider);
    });

    it('应该验证无效的网络类型', () => {
      expect(() => {
        Provider.create({ networkType: 'invalid' });
      }).to.throw(NetworkError, '无效的网络类型');
    });

    it('应该验证无效的 RPC URL', () => {
      expect(() => {
        Provider.create({ rpcUrl: 'invalid-url' });
      }).to.throw(NetworkError, '无效的 RPC URL');
    });

    it('应该验证无效的链 ID', () => {
      expect(() => {
        Provider.create({ chainId: 'invalid' });
      }).to.throw(NetworkError, '无效的链 ID');
    });
  });

  describe('getBlockNumber', () => {
    it('应该获取当前区块号', async () => {
      const blockNumber = await Provider.getBlockNumber(provider);
      expect(blockNumber).to.be.a('number');
      expect(blockNumber).to.be.at.least(0);
    });
  });

  describe('getBlock', () => {
    it('应该获取指定区块的信息', async () => {
      const blockNumber = await Provider.getBlockNumber(provider);
      const block = await Provider.getBlock(provider, blockNumber);
      expect(block).to.be.an('object');
      expect(block.number).to.equal(blockNumber);
    });

    it('应该处理不存在的区块', async () => {
      await expect(Provider.getBlock(provider, 999999999)).to.be.rejectedWith(
        NetworkError,
        '区块 999999999 不存在'
      );
    });
  });

  describe('getTransaction', () => {
    it('应该获取指定交易的信息', async () => {
      // 这里需要一个已知的交易哈希
      const txHash = '0x...'; // 替换为实际的交易哈希
      const tx = await Provider.getTransaction(provider, txHash);
      expect(tx).to.be.an('object');
      expect(tx.hash).to.equal(txHash);
    });

    it('应该处理不存在的交易', async () => {
      await expect(
        Provider.getTransaction(provider, '0x0000000000000000000000000000000000000000000000000000000000000000')
      ).to.be.rejectedWith(NetworkError, '交易不存在');
    });
  });

  describe('getTransactionReceipt', () => {
    it('应该获取指定交易的收据', async () => {
      // 这里需要一个已知的交易哈希
      const txHash = '0x...'; // 替换为实际的交易哈希
      const receipt = await Provider.getTransactionReceipt(provider, txHash);
      expect(receipt).to.be.an('object');
      expect(receipt.transactionHash).to.equal(txHash);
    });

    it('应该处理不存在的交易收据', async () => {
      await expect(
        Provider.getTransactionReceipt(provider, '0x0000000000000000000000000000000000000000000000000000000000000000')
      ).to.be.rejectedWith(NetworkError, '交易收据不存在');
    });
  });

  describe('getBalance', () => {
    it('应该获取指定地址的余额', async () => {
      // 这里需要一个已知的地址
      const address = '0x...'; // 替换为实际的地址
      const balance = await Provider.getBalance(provider, address);
      expect(balance).to.be.a('string');
      expect(Number(balance)).to.be.at.least(0);
    });

    it('应该处理无效的地址', async () => {
      await expect(Provider.getBalance(provider, 'invalid-address')).to.be.rejectedWith(
        NetworkError,
        '无效的账户地址'
      );
    });
  });

  describe('getNetwork', () => {
    it('应该获取网络信息', async () => {
      const network = await Provider.getNetwork(provider);
      expect(network).to.be.an('object');
      expect(network.chainId).to.equal(config.NETWORK_CHAIN_ID);
    });
  });
}); 