const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const { Wallet, Provider, Logger, Config, WalletError } = require('../../../shared/src');

describe('Wallet', () => {
  let wallet;
  let sandbox;
  let mockProvider;
  const mockAddress = '0x123...';
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock Provider
    mockProvider = {
      provider: {
        getBalance: sandbox.stub(),
        getTransactionCount: sandbox.stub()
      }
    };
    
    // Mock config
    sandbox.stub(Config, 'get').callsFake((key) => {
      if (key === 'wallet.privateKey') return mockPrivateKey;
      if (key === 'wallet.password') return 'testpassword';
      throw new Error(`Unknown key: ${key}`);
    });
    
    // Mock logger
    sandbox.stub(Logger, 'info');
    sandbox.stub(Logger, 'error');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create a wallet instance successfully', async () => {
      expect(wallet).to.exist;
      expect(wallet.address).to.exist;
      expect(Logger.info.calledWith(
        'Wallet instance created successfully'
      )).to.be.true;
    });

    it('should create a wallet instance with custom private key', async () => {
      const customPrivateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      wallet = await Wallet.create({
        privateKey: customPrivateKey
      });

      expect(wallet.address).to.exist;
    });

    it('should throw error if private key is invalid', async () => {
      try {
        await Wallet.create({ privateKey: 'invalid-key' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid private key');
      }
    });
  });

  describe('getAddress', () => {
    it('should return wallet address', async () => {
      const address = await wallet.getAddress();
      
      expect(address).to.exist;
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
      expect(Logger.info.calledWith(
        'Wallet address retrieved successfully:',
        address
      )).to.be.true;
    });
  });

  describe('getBalance', () => {
    it('should get wallet balance successfully', async () => {
      const balance = await wallet.getBalance();
      
      expect(balance).to.equal('1000000000000000000');
      expect(wallet.signer.provider.getBalance.called).to.be.true;
      expect(Logger.info.calledWith(
        'Wallet balance retrieved successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle errors when getting balance', async () => {
      wallet.signer.provider.getBalance.rejects(new Error('Balance error'));

      try {
        await wallet.getBalance();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to get wallet balance: Balance error');
      }
    });
  });

  describe('signMessage', () => {
    it('should sign message successfully', async () => {
      const message = 'Hello, World!';
      const signature = await wallet.signMessage(message);
      
      expect(signature).to.equal('0x789...');
      expect(wallet.signer.signMessage.calledWith(message)).to.be.true;
      expect(Logger.info.calledWith(
        'Message signed successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle errors when signing message', async () => {
      wallet.signer.signMessage.rejects(new Error('Signing error'));

      try {
        await wallet.signMessage('Hello, World!');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to sign message: Signing error');
      }
    });
  });

  describe('signTransaction', () => {
    beforeEach(async () => {
      wallet = await Wallet.create();
      wallet.signer = {
        signTransaction: sandbox.stub().resolves('0x789...')
      };
    });

    it('should sign transaction successfully', async () => {
      const tx = {
        to: '0xdef...',
        value: '1000000000000000000',
        gasLimit: '21000'
      };
      
      const signedTx = await wallet.signTransaction(tx);
      
      expect(signedTx).to.equal('0x789...');
      expect(wallet.signer.signTransaction.calledWith(tx)).to.be.true;
      expect(Logger.info.calledWith(
        'Transaction signed successfully:',
        sinon.match.object
      )).to.be.true;
    });

    it('should handle errors when signing transaction', async () => {
      wallet.signer.signTransaction.rejects(new Error('Signing error'));

      try {
        await wallet.signTransaction({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to sign transaction: Signing error');
      }
    });
  });

  describe('encrypt', () => {
    beforeEach(async () => {
      wallet = await Wallet.create();
      wallet.signer = {
        encrypt: sandbox.stub().resolves('encrypted-wallet')
      };
    });

    it('should encrypt wallet successfully', async () => {
      const password = 'password123';
      const encrypted = await wallet.encrypt(password);
      
      expect(encrypted).to.equal('encrypted-wallet');
      expect(wallet.signer.encrypt.calledWith(password)).to.be.true;
      expect(Logger.info.calledWith(
        'Wallet encrypted successfully'
      )).to.be.true;
    });

    it('should handle errors when encrypting wallet', async () => {
      wallet.signer.encrypt.rejects(new Error('Encryption error'));

      try {
        await wallet.encrypt('password123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to encrypt wallet: Encryption error');
      }
    });
  });

  describe('decrypt', () => {
    beforeEach(async () => {
      wallet = await Wallet.create();
      wallet.signer = {
        decrypt: sandbox.stub().resolves(wallet.signer)
      };
    });

    it('should decrypt wallet successfully', async () => {
      const password = 'password123';
      const encrypted = 'encrypted-wallet';
      
      const decrypted = await wallet.decrypt(encrypted, password);
      
      expect(decrypted).to.exist;
      expect(wallet.signer.decrypt.calledWith(encrypted, password)).to.be.true;
      expect(Logger.info.calledWith(
        'Wallet decrypted successfully'
      )).to.be.true;
    });

    it('should handle errors when decrypting wallet', async () => {
      wallet.signer.decrypt.rejects(new Error('Decryption error'));

      try {
        await wallet.decrypt('encrypted-wallet', 'password123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to decrypt wallet: Decryption error');
      }
    });
  });
}); 