const { expect } = require('chai');
const { ethers } = require('ethers');
const Wallet = require('../src/core/Wallet');
const { WalletError } = require('../src/utils/errors');
const Provider = require('../src/core/Provider');

describe('Wallet', () => {
  let wallet;
  let provider;

  before(async () => {
    provider = Provider.create();
  });

  beforeEach(async () => {
    wallet = await Wallet.create({ provider });
  });

  describe('create', () => {
    it('应该使用默认配置创建钱包', async () => {
      const defaultWallet = await Wallet.create();
      expect(defaultWallet).to.be.instanceOf(ethers.Wallet);
    });

    it('应该使用自定义配置创建钱包', async () => {
      const customWallet = await Wallet.create({
        provider,
        privateKey: '0x...' // 替换为实际的私钥
      });
      expect(customWallet).to.be.instanceOf(ethers.Wallet);
    });

    it('应该验证无效的私钥', async () => {
      await expect(
        Wallet.create({ privateKey: 'invalid-key' })
      ).to.be.rejectedWith(WalletError, '无效的私钥');
    });
  });

  describe('getAddress', () => {
    it('应该获取钱包地址', () => {
      const address = Wallet.getAddress(wallet);
      expect(address).to.be.a('string');
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('getBalance', () => {
    it('应该获取钱包余额', async () => {
      const balance = await Wallet.getBalance(wallet);
      expect(balance).to.be.a('string');
      expect(Number(balance)).to.be.at.least(0);
    });
  });

  describe('signMessage', () => {
    it('应该签名消息', async () => {
      const message = 'Hello, World!';
      const signature = await Wallet.signMessage(wallet, message);
      expect(signature).to.be.a('string');
      expect(signature).to.match(/^0x[a-fA-F0-9]{130}$/);
    });
  });

  describe('signTransaction', () => {
    it('应该签名交易', async () => {
      const transaction = {
        to: '0x...', // 替换为实际的地址
        value: ethers.parseEther('0.1'),
        gasLimit: 21000
      };
      const signedTx = await Wallet.signTransaction(wallet, transaction);
      expect(signedTx).to.be.a('string');
      expect(signedTx).to.match(/^0x[a-fA-F0-9]+$/);
    });

    it('应该验证无效的交易', async () => {
      const invalidTx = {
        to: 'invalid-address',
        value: 'invalid-value'
      };
      await expect(
        Wallet.signTransaction(wallet, invalidTx)
      ).to.be.rejectedWith(WalletError);
    });
  });

  describe('encrypt', () => {
    it('应该加密钱包', async () => {
      const password = 'test-password';
      const encrypted = await Wallet.encrypt(wallet, password);
      expect(encrypted).to.be.a('string');
      expect(encrypted).to.include('crypto');
    });
  });

  describe('decrypt', () => {
    it('应该解密钱包', async () => {
      const password = 'test-password';
      const encrypted = await Wallet.encrypt(wallet, password);
      const decrypted = await Wallet.decrypt(encrypted, password);
      expect(decrypted.address).to.equal(wallet.address);
    });

    it('应该验证错误的密码', async () => {
      const password = 'test-password';
      const encrypted = await Wallet.encrypt(wallet, password);
      await expect(
        Wallet.decrypt(encrypted, 'wrong-password')
      ).to.be.rejectedWith(WalletError);
    });
  });
}); 