import { ethers } from 'ethers';

// 创建一个简单的环境配置模拟
class MockEnvConfig {
  constructor() {
    this.config = {
      SERVER_PORT: 3000,
      API_KEY: 'test_api_key',
      RPC_URL: 'http://localhost:8545',
      ROLE_MANAGER_ADDRESS: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      PROPERTY_MANAGER_ADDRESS: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      TRADING_MANAGER_ADDRESS: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      REWARD_MANAGER_ADDRESS: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      ADMIN_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      MANAGER_PRIVATE_KEY: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
      TRADER_PRIVATE_KEY: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
    };
  }

  get(key) {
    return this.config[key];
  }

  getServerConfig() {
    return {
      port: this.config.SERVER_PORT,
      apiKey: this.config.API_KEY
    };
  }
}

// 模拟Provider
const getProvider = () => {
  return new ethers.JsonRpcProvider('http://localhost:8545');
};

// 模拟合约实例
const getMockContract = (name) => {
  // 创建一个有基本功能的模拟合约对象
  return {
    address: '0x1234567890123456789012345678901234567890',
    name: name,
    interface: new ethers.Interface([]),
    
    // 基本函数
    ADMIN_ROLE: async () => ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE')),
    MANAGER_ROLE: async () => ethers.keccak256(ethers.toUtf8Bytes('MANAGER_ROLE')),
    TRADER_ROLE: async () => ethers.keccak256(ethers.toUtf8Bytes('TRADER_ROLE')),
    
    hasRole: async (role, address) => Math.random() > 0.5,
    isEmergency: async () => false,
    isPaused: async () => false,
    getPropertyCount: async () => 0,
    
    // 可连接函数
    connect: (signer) => {
      return {
        ...getMockContract(name),
        signer: signer,
        getAddress: async () => signer.address
      };
    }
  };
};

// 模拟钱包
const getMockWallet = (role) => {
  const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
};

// 导出mock工具函数
export default {
  getContract: async (name) => getMockContract(name),
  getContractWithSigner: async (name, role) => getMockContract(name).connect(getMockWallet(role)),
  getContractWithPrivateKey: async (name, privateKey) => getMockContract(name).connect(new ethers.Wallet(privateKey, getProvider())),
  createContractFromAddress: async (address, abi) => getMockContract('Custom'),
  getWallet: (role) => getMockWallet(role),
  EnvConfig: MockEnvConfig
}; 