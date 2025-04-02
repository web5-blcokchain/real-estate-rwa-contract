const { expect } = require('chai');
const { ethers } = require('ethers');
const Contract = require('../src/core/Contract');
const { ContractError } = require('../src/utils/errors');
const Provider = require('../src/core/Provider');
const Wallet = require('../src/core/Wallet');

describe('Contract', () => {
  let contract;
  let provider;
  let wallet;

  before(async () => {
    provider = Provider.create();
    wallet = await Wallet.create({ provider });
  });

  beforeEach(async () => {
    contract = await Contract.create({
      provider,
      wallet,
      address: '0x...', // 替换为实际的合约地址
      abi: [] // 替换为实际的 ABI
    });
  });

  describe('create', () => {
    it('应该使用默认配置创建合约实例', async () => {
      const defaultContract = await Contract.create();
      expect(defaultContract).to.be.instanceOf(ethers.Contract);
    });

    it('应该使用自定义配置创建合约实例', async () => {
      const customContract = await Contract.create({
        provider,
        wallet,
        address: '0x...', // 替换为实际的合约地址
        abi: [] // 替换为实际的 ABI
      });
      expect(customContract).to.be.instanceOf(ethers.Contract);
    });

    it('应该验证无效的合约地址', async () => {
      await expect(
        Contract.create({ address: 'invalid-address' })
      ).to.be.rejectedWith(ContractError, '无效的合约地址');
    });

    it('应该验证无效的 ABI', async () => {
      await expect(
        Contract.create({ abi: 'invalid-abi' })
      ).to.be.rejectedWith(ContractError, '无效的合约 ABI');
    });
  });

  describe('getAddress', () => {
    it('应该获取合约地址', () => {
      const address = Contract.getAddress(contract);
      expect(address).to.be.a('string');
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('call', () => {
    it('应该调用合约只读方法', async () => {
      const result = await Contract.call(contract, 'balanceOf', [
        '0x...' // 替换为实际的地址
      ]);
      expect(result).to.be.a('string');
    });

    it('应该处理不存在的方法', async () => {
      await expect(
        Contract.call(contract, 'nonExistentMethod', [])
      ).to.be.rejectedWith(ContractError);
    });
  });

  describe('send', () => {
    it('应该发送交易调用合约方法', async () => {
      const tx = await Contract.send(contract, 'transfer', [
        '0x...', // 替换为实际的地址
        ethers.parseEther('0.1')
      ]);
      expect(tx).to.be.an('object');
      expect(tx.hash).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it('应该处理无效的交易参数', async () => {
      await expect(
        Contract.send(contract, 'transfer', [
          'invalid-address',
          'invalid-amount'
        ])
      ).to.be.rejectedWith(ContractError);
    });
  });

  describe('estimateGas', () => {
    it('应该估算合约方法调用的 gas 用量', async () => {
      const gas = await Contract.estimateGas(contract, 'transfer', [
        '0x...', // 替换为实际的地址
        ethers.parseEther('0.1')
      ]);
      expect(gas).to.be.a('string');
      expect(Number(gas)).to.be.at.least(0);
    });

    it('应该处理不存在的方法', async () => {
      await expect(
        Contract.estimateGas(contract, 'nonExistentMethod', [])
      ).to.be.rejectedWith(ContractError);
    });
  });

  describe('getEvents', () => {
    it('应该获取合约事件', async () => {
      const events = await Contract.getEvents(contract, 'Transfer', {
        fromBlock: 0,
        toBlock: 'latest'
      });
      expect(events).to.be.an('array');
    });

    it('应该处理不存在的事件', async () => {
      await expect(
        Contract.getEvents(contract, 'NonExistentEvent', {
          fromBlock: 0,
          toBlock: 'latest'
        })
      ).to.be.rejectedWith(ContractError);
    });
  });
}); 