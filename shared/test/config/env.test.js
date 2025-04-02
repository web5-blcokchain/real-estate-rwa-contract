const chai = require('chai');
const sinon = require('sinon');
const dotenv = require('dotenv');
const EnvConfig = require('../../src/config/env');
const { ConfigError } = require('../../src/utils/errors');

// 在运行测试之前等待加载所有插件
before(async () => {
  const chaiAsPromised = await import('chai-as-promised');
  const sinonChai = await import('sinon-chai');
  chai.use(chaiAsPromised.default);
  chai.use(sinonChai.default);
});

const { expect } = chai;

describe('EnvConfig', () => {
  let originalEnv;

  beforeEach(() => {
    // 备份原始环境变量
    originalEnv = { ...process.env };
    
    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.BLOCKCHAIN_NETWORK = 'testnet';
    process.env.NETWORK_TYPE = 'testnet';
    process.env.TESTNET_RPC_URL = 'https://sepolia.infura.io/v3/your-api-key';
    process.env.TESTNET_CHAIN_ID = '11155111';
    process.env.ADMIN_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
    process.env.MANAGER_PRIVATE_KEY = '0x2345678901234567890123456789012345678901234567890123456789012345';
    process.env.OPERATOR_PRIVATE_KEY = '0x3456789012345678901234567890123456789012345678901234567890123456';
    process.env.PROPERTY_MANAGER_PRIVATE_KEY = '0x4567890123456789012345678901234567890123456789012345678901234567';
    process.env.CONTRACT_MANAGER_PRIVATE_KEY = '0x5678901234567890123456789012345678901234567890123456789012345678';
    process.env.DEFAULT_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.DEFAULT_CONTRACT_ABI = JSON.stringify([{ "type": "function", "name": "test", "inputs": [], "outputs": [{"type": "uint256"}] }]);
    process.env.TEST_CONTRACT_ADDRESS = '0x0987654321098765432109876543210987654321';
    process.env.TEST_CONTRACT_ABI = JSON.stringify([{ "type": "function", "name": "test", "inputs": [], "outputs": [{"type": "uint256"}] }]);
    
    // 模拟 dotenv.config
    sinon.stub(dotenv, 'config').returns({});
  });
  
  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
    
    // 恢复所有模拟
    sinon.restore();
  });
  
  describe('load()', () => {
    it('should load environment variables with default values', () => {
      const config = EnvConfig.load();
      expect(config).to.be.an('object');
      expect(config.NODE_ENV).to.equal('test');
      expect(config.BLOCKCHAIN_NETWORK).to.equal('testnet');
      expect(config.TESTNET_CHAIN_ID).to.equal(11155111);
    });
    
    it('should throw error when required environment variables are missing', () => {
      delete process.env.BLOCKCHAIN_NETWORK;
      delete process.env.ADMIN_PRIVATE_KEY;
      delete process.env.MANAGER_PRIVATE_KEY;
      delete process.env.OPERATOR_PRIVATE_KEY;
      expect(() => EnvConfig.load()).to.throw(ConfigError);
    });
    
    it('should validate network type', () => {
      process.env.BLOCKCHAIN_NETWORK = 'invalid';
      expect(() => EnvConfig.load()).to.throw(ConfigError, '加载环境变量失败');
    });
    
    it('should validate private key format', () => {
      process.env.ADMIN_PRIVATE_KEY = 'invalid';
      expect(() => EnvConfig.load()).to.throw(ConfigError, '加载环境变量失败');
    });
  });
  
  describe('getNetworkType()', () => {
    it('should get network type successfully', () => {
      const networkType = EnvConfig.getNetworkType();
      expect(networkType).to.equal('testnet');
    });
    
    it('should throw error with invalid network type', () => {
      process.env.NETWORK_TYPE = 'invalid';
      expect(() => EnvConfig.getNetworkType()).to.throw(ConfigError, '无效的网络类型配置');
    });
  });
  
  describe('getNetworkConfig()', () => {
    it('should get testnet network config successfully', () => {
      const config = EnvConfig.getNetworkConfig();
      expect(config).to.deep.equal({
        rpcUrl: 'https://sepolia.infura.io/v3/your-api-key',
        chainId: 11155111,
        name: 'Test Network'
      });
    });
    
    it('should throw error with incomplete network config', () => {
      delete process.env.TESTNET_RPC_URL;
      expect(() => EnvConfig.getNetworkConfig()).to.throw(ConfigError, 'testnet网络配置不完整');
    });
  });
  
  describe('getAdminPrivateKey()', () => {
    it('should get admin private key successfully', () => {
      const privateKey = EnvConfig.getAdminPrivateKey();
      expect(privateKey).to.equal('0x1234567890123456789012345678901234567890123456789012345678901234');
    });
    
    it('should throw error when admin private key is not configured', () => {
      delete process.env.ADMIN_PRIVATE_KEY;
      expect(() => EnvConfig.getAdminPrivateKey()).to.throw(ConfigError, '管理员私钥未配置');
    });
  });
  
  describe('getContractManagerPrivateKey()', () => {
    it('should get contract manager private key successfully', () => {
      const privateKey = EnvConfig.getContractManagerPrivateKey();
      expect(privateKey).to.equal('0x5678901234567890123456789012345678901234567890123456789012345678');
    });
    
    it('should throw error when contract manager private key is not configured', () => {
      delete process.env.CONTRACT_MANAGER_PRIVATE_KEY;
      expect(() => EnvConfig.getContractManagerPrivateKey()).to.throw(ConfigError, '合约管理员私钥未配置');
    });
  });
  
  describe('getPropertyManagerPrivateKey()', () => {
    it('should get property manager private key successfully', () => {
      const privateKey = EnvConfig.getPropertyManagerPrivateKey();
      expect(privateKey).to.equal('0x4567890123456789012345678901234567890123456789012345678901234567');
    });
    
    it('should throw error when property manager private key is not configured', () => {
      delete process.env.PROPERTY_MANAGER_PRIVATE_KEY;
      expect(() => EnvConfig.getPropertyManagerPrivateKey()).to.throw(ConfigError, '物业管理员私钥未配置');
    });
  });
  
  describe('getContractConfig()', () => {
    it('should get default contract config when no contract name is provided', () => {
      const config = EnvConfig.getContractConfig();
      expect(config).to.deep.equal({
        address: '0x1234567890123456789012345678901234567890',
        abi: [{ "type": "function", "name": "test", "inputs": [], "outputs": [{"type": "uint256"}] }]
      });
    });
    
    it('should get contract config for specific contract', () => {
      const config = EnvConfig.getContractConfig('test');
      expect(config).to.deep.equal({
        address: '0x0987654321098765432109876543210987654321',
        abi: [{ "type": "function", "name": "test", "inputs": [], "outputs": [{"type": "uint256"}] }]
      });
    });
    
    it('should throw error when contract config is incomplete', () => {
      delete process.env.TEST_CONTRACT_ADDRESS;
      expect(() => EnvConfig.getContractConfig('test')).to.throw(ConfigError, '获取合约配置失败');
    });
    
    it('should throw error when ABI is invalid JSON', () => {
      process.env.TEST_CONTRACT_ABI = 'invalid-json';
      expect(() => EnvConfig.getContractConfig('test')).to.throw(ConfigError, '获取合约配置失败');
    });
  });
  
  describe('updateConfig()', () => {
    it('should update environment variables', () => {
      const newConfig = {
        NETWORK_TYPE: 'mainnet',
        MAINNET_RPC_URL: 'https://mainnet.infura.io/v3/your-api-key',
        MAINNET_CHAIN_ID: '1'
      };
      
      EnvConfig.updateConfig(newConfig);
      
      expect(process.env.NETWORK_TYPE).to.equal('mainnet');
      expect(process.env.MAINNET_RPC_URL).to.equal('https://mainnet.infura.io/v3/your-api-key');
      expect(process.env.MAINNET_CHAIN_ID).to.equal('1');
    });
  });
  
  describe('getDefaultConfig()', () => {
    it('should get default configuration', () => {
      const defaultConfig = EnvConfig.getDefaultConfig();
      expect(defaultConfig).to.be.an('object');
      expect(defaultConfig).to.have.property('NODE_ENV');
      expect(defaultConfig).to.have.property('BLOCKCHAIN_NETWORK');
      expect(defaultConfig).to.have.property('LOG_LEVEL');
    });
  });
}); 