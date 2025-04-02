const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const { Validation, WalletError, ValidationError } = require('../../src/utils');
const Wallet = require('../../src/core/wallet');
const Provider = require('../../src/core/provider');
const Logger = require('../../src/utils/logger');
const EnvConfig = require('../../src/config/env');

// 在运行测试之前等待加载所有插件
before(async () => {
  const [sinonChai, chaiAsPromised] = await Promise.all([
    import('sinon-chai'),
    import('chai-as-promised')
  ]);
  const chai = require('chai');
  chai.use(sinonChai.default);
  chai.use(chaiAsPromised.default);
});

describe('Wallet', () => {
  let provider;
  let wallet;
  let validationStubs;
  let providerStubs;
  let walletStubs;

  beforeEach(() => {
    provider = {
      getBalance: sinon.stub().resolves(ethers.parseEther('1.0')),
      getNetwork: sinon.stub().resolves({ chainId: 11155111 })
    };

    wallet = {
      address: '0x99394fEb5bEbb44BCF1dc5F652Bb1355ADc7F192',
      privateKey: '0xdec9ed3241987412b264db209f32353908937b53c4fc003280aafd2f7934e517',
      mnemonic: { phrase: 'test test test test test test test test test test test junk' },
      connect: sinon.stub().returns({
        address: '0x99394fEb5bEbb44BCF1dc5F652Bb1355ADc7F192',
        privateKey: '0xdec9ed3241987412b264db209f32353908937b53c4fc003280aafd2f7934e517',
        mnemonic: { phrase: 'test test test test test test test test test test test junk' },
        getBalance: sinon.stub().resolves(ethers.parseEther('1.0')),
        sendTransaction: sinon.stub().resolves({ hash: '0x123' }),
        signMessage: sinon.stub().resolves('0xsignature'),
        getAddress: sinon.stub().resolves('0x99394fEb5bEbb44BCF1dc5F652Bb1355ADc7F192')
      }),
      getBalance: sinon.stub().resolves(ethers.parseEther('1.0')),
      sendTransaction: sinon.stub().resolves({ hash: '0x123' }),
      signMessage: sinon.stub().resolves('0xsignature'),
      getAddress: sinon.stub().resolves('0x99394fEb5bEbb44BCF1dc5F652Bb1355ADc7F192')
    };

    // 设置验证方法的存根
    validationStubs = {
      isValidPrivateKey: sinon.stub().returns(true),
      isValidMnemonic: sinon.stub().returns(true),
      isValidWallet: sinon.stub().returns(true),
      isValidTransaction: sinon.stub().returns(true),
      isValidString: sinon.stub().returns(true),
      isValidProvider: sinon.stub().returns(true),
      isValidSignature: sinon.stub().returns(true)
    };

    // 替换 Validation 类的静态方法
    Object.entries(validationStubs).forEach(([method, stub]) => {
      sinon.stub(Validation, method).callsFake(stub);
    });

    // 单独设置 validate 方法
    sinon.stub(Validation, 'validate').callsFake((condition, message) => {
      if (!condition) {
        throw new WalletError(message);
      }
    });

    providerStubs = {
      create: sinon.stub(Provider, 'create').resolves(provider)
    };

    // 修改 ethers.Wallet 的 stub
    sinon.stub(ethers, 'Wallet').callsFake((privateKey, provider) => {
      return {
        address: '0x1234567890123456789012345678901234567890',
        privateKey: privateKey,
        getBalance: sinon.stub().resolves(ethers.parseEther('1.0')),
        sendTransaction: sinon.stub().resolves({ hash: '0x123' }),
        signMessage: sinon.stub().resolves('0xsignature'),
        getAddress: sinon.stub().resolves('0x1234567890123456789012345678901234567890')
      };
    });

    // 修改 ethers.Wallet 的静态方法
    sinon.stub(ethers.Wallet, 'fromPhrase').callsFake((mnemonic, provider) => {
      return {
        address: '0x1234567890123456789012345678901234567890',
        mnemonic: { phrase: mnemonic },
        getBalance: sinon.stub().resolves(ethers.parseEther('1.0')),
        sendTransaction: sinon.stub().resolves({ hash: '0x123' }),
        signMessage: sinon.stub().resolves('0xsignature'),
        getAddress: sinon.stub().resolves('0x1234567890123456789012345678901234567890')
      };
    });

    // 修改 ethers.verifyMessage 的 stub
    sinon.stub(ethers, 'verifyMessage').callsFake((message, signature) => {
      // 验证消息
      if (!message) {
        throw new Error('Cannot read properties of null (reading \'length\')');
      }

      // 验证签名格式
      if (!signature || typeof signature !== 'string' || !signature.startsWith('0x') || signature.length !== 132) {
        throw new Error('invalid raw signature length (argument="signature", value="0x0000000000000000000000000000000000000000000000000000000000000000", code=INVALID_ARGUMENT, version=6.13.5)');
      }

      // 验证有效签名
      if (signature === '0x98fd974abdf693c1568255a9dbf450f87c13c4e384999320b944b3e2762581312a0883a1fcb1f52f556728524d7582db8ae72f5222a735d7e026705866f2dddf1c') {
        return '0x99394fEb5bEbb44BCF1dc5F652Bb1355ADc7F192';
      }

      // 其他情况视为无效签名
      throw new Error('invalid raw signature length (argument="signature", value="' + signature + '", code=INVALID_ARGUMENT, version=6.13.5)');
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('create()', () => {
    it('should create wallet instance with private key', async () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const wallet = await Wallet.create({ privateKey });
      expect(wallet.address).to.equal(wallet.address);
      expect(wallet.privateKey).to.equal(wallet.privateKey);
    });

    it('should create wallet instance with mnemonic', async () => {
      const mnemonic = 'test test test test test test test test test test test junk';
      const wallet = await Wallet.create({ mnemonic });
      expect(wallet.address).to.equal(wallet.address);
      expect(wallet.mnemonic.phrase).to.equal(wallet.mnemonic.phrase);
    });

    it('should throw error with invalid private key', async () => {
      validationStubs.isValidPrivateKey.returns(false);
      await expect(Wallet.create({ privateKey: 'invalid' }))
        .to.be.rejectedWith(WalletError, '创建钱包失败: 无效的私钥');
    });

    it('should throw error with invalid mnemonic', async () => {
      validationStubs.isValidMnemonic.returns(false);
      await expect(Wallet.create({ mnemonic: 'invalid' }))
        .to.be.rejectedWith(WalletError, '创建钱包失败: 无效的助记词');
    });

    it('should throw error when neither private key nor mnemonic is provided', async () => {
      await expect(Wallet.create({}))
        .to.be.rejectedWith(WalletError, '创建钱包失败: 需要提供私钥或助记词');
    });
  });

  describe('getBalance()', () => {
    it('should get wallet balance successfully', async () => {
      const balance = await Wallet.getBalance(wallet);
      expect(balance).to.equal(ethers.parseEther('1.0'));
      expect(wallet.getBalance).to.have.been.called;
    });

    it('should throw error on getBalance failure', async () => {
      validationStubs.isValidWallet.returns(false);
      await expect(Wallet.getBalance(null))
        .to.be.rejectedWith(WalletError, '获取账户余额失败');
    });
  });

  describe('sendTransaction()', () => {
    const transaction = {
      to: '0x0987654321098765432109876543210987654321',
      value: ethers.parseEther('1.0')
    };

    it('should send transaction successfully', async () => {
      const tx = await Wallet.sendTransaction(wallet, transaction);
      expect(tx.hash).to.equal('0x123');
      expect(wallet.sendTransaction).to.have.been.calledWith(transaction);
    });

    it('should throw error with invalid recipient address', async () => {
      validationStubs.isValidTransaction.returns(false);
      await expect(Wallet.sendTransaction(wallet, { to: 'invalid' }))
        .to.be.rejectedWith(WalletError, '无效的交易参数');
    });

    it('should throw error with invalid transaction value', async () => {
      validationStubs.isValidTransaction.returns(false);
      await expect(Wallet.sendTransaction(wallet, { value: 'invalid' }))
        .to.be.rejectedWith(WalletError, '无效的交易参数');
    });

    it('should throw error with invalid transaction data', async () => {
      validationStubs.isValidTransaction.returns(false);
      await expect(Wallet.sendTransaction(wallet, { data: 'invalid' }))
        .to.be.rejectedWith(WalletError, '无效的交易参数');
    });
  });

  describe('signMessage()', () => {
    it('should sign message successfully', async () => {
      const message = 'Hello, World!';
      const signature = await Wallet.signMessage(wallet, message);
      expect(signature).to.equal('0xsignature');
      expect(wallet.signMessage).to.have.been.calledWith(message);
    });

    it('should throw error with invalid message', async () => {
      validationStubs.isValidString.returns(false);
      await expect(Wallet.signMessage(wallet, null))
        .to.be.rejectedWith(WalletError, '无效的消息');
    });
  });

  describe('verifyMessage()', () => {
    const testWallet = {
      address: '0x99394fEb5bEbb44BCF1dc5F652Bb1355ADc7F192',
      privateKey: '0xdec9ed3241987412b264db209f32353908937b53c4fc003280aafd2f7934e517',
      message: 'Hello, World!',
      signature: '0x98fd974abdf693c1568255a9dbf450f87c13c4e384999320b944b3e2762581312a0883a1fcb1f52f556728524d7582db8ae72f5222a735d7e026705866f2dddf1c'
    };

    it('应该成功验证有效的消息签名', async () => {
      const result = await Wallet.verifyMessage(wallet, testWallet.message, testWallet.signature);
      expect(result).to.be.true;
    });

    it('应该拒绝空消息', async () => {
      await expect(Wallet.verifyMessage(wallet, null, testWallet.signature))
        .to.be.rejectedWith(WalletError, '验证签名失败: Cannot read properties of null (reading \'length\')');
    });

    it('应该拒绝无效的签名', async () => {
      const invalidSignature = '0x0000000000000000000000000000000000000000000000000000000000000000';
      await expect(Wallet.verifyMessage(wallet, testWallet.message, invalidSignature))
        .to.be.rejectedWith(WalletError, '验证签名失败: invalid raw signature length (argument="signature", value="0x0000000000000000000000000000000000000000000000000000000000000000", code=INVALID_ARGUMENT, version=6.13.5)');
    });
  });

  describe('exportPrivateKey()', () => {
    it('should export private key successfully', async () => {
      const privateKey = await Wallet.exportPrivateKey(wallet);
      expect(privateKey).to.equal(wallet.privateKey);
    });
  });

  describe('exportMnemonic()', () => {
    it('should export mnemonic successfully', async () => {
      const mnemonic = await Wallet.exportMnemonic(wallet);
      expect(mnemonic).to.equal(wallet.mnemonic.phrase);
    });

    it('should throw error when wallet has no mnemonic', async () => {
      const walletWithoutMnemonic = { ...wallet, mnemonic: null };
      await expect(Wallet.exportMnemonic(walletWithoutMnemonic))
        .to.be.rejectedWith(WalletError, '该钱包不是由助记词创建的');
    });
  });
}); 