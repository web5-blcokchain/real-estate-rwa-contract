const { ethers } = require('ethers');
const RealEstateSystem = require('../../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
const PropertyRegistry = require('../../../artifacts/contracts/PropertyRegistry.sol/PropertyRegistry.json');
const TokenFactory = require('../../../artifacts/contracts/TokenFactory.sol/TokenFactory.json');
const Marketplace = require('../../../artifacts/contracts/Marketplace.sol/Marketplace.json');
const RedemptionManager = require('../../../artifacts/contracts/RedemptionManager.sol/RedemptionManager.json');
const RentDistributor = require('../../../artifacts/contracts/RentDistributor.sol/RentDistributor.json');
const RoleManager = require('../../../artifacts/contracts/RoleManager.sol/RoleManager.json');
const FeeManager = require('../../../artifacts/contracts/FeeManager.sol/FeeManager.json');
const RealEstateToken = require('../../../artifacts/contracts/RealEstateToken.sol/RealEstateToken.json');

// 合约地址配置
const contractAddresses = {
  RealEstateSystem: process.env.REAL_ESTATE_SYSTEM_ADDRESS,
  PropertyRegistry: process.env.PROPERTY_REGISTRY_ADDRESS,
  TokenFactory: process.env.TOKEN_FACTORY_ADDRESS,
  Marketplace: process.env.MARKETPLACE_ADDRESS,
  RedemptionManager: process.env.REDEMPTION_MANAGER_ADDRESS,
  RentDistributor: process.env.RENT_DISTRIBUTOR_ADDRESS,
  RoleManager: process.env.ROLE_MANAGER_ADDRESS,
  FeeManager: process.env.FEE_MANAGER_ADDRESS,
  TokenImplementation: process.env.TOKEN_IMPLEMENTATION_ADDRESS
};

// 初始化 Provider 和 Signer
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 系统合约实例
const systemController = new ethers.Contract(
  contractAddresses.RealEstateSystem,
  RealEstateSystem.abi,
  signer
);

// 其他合约实例
const propertyRegistry = new ethers.Contract(
  contractAddresses.PropertyRegistry,
  PropertyRegistry.abi,
  signer
);

const tokenFactory = new ethers.Contract(
  contractAddresses.TokenFactory,
  TokenFactory.abi,
  signer
);

const marketplace = new ethers.Contract(
  contractAddresses.Marketplace,
  Marketplace.abi,
  signer
);

const redemptionManager = new ethers.Contract(
  contractAddresses.RedemptionManager,
  RedemptionManager.abi,
  signer
);

const rentDistributor = new ethers.Contract(
  contractAddresses.RentDistributor,
  RentDistributor.abi,
  signer
);

const roleManager = new ethers.Contract(
  contractAddresses.RoleManager,
  RoleManager.abi,
  signer
);

const feeManager = new ethers.Contract(
  contractAddresses.FeeManager,
  FeeManager.abi,
  signer
);

// 导出合约实例
module.exports = {
  systemController,
  propertyRegistry,
  tokenFactory,
  marketplace,
  redemptionManager,
  rentDistributor,
  roleManager,
  feeManager,
  RealEstateToken,
  contractAddresses,
  // 系统状态检查函数
  isActivated: async () => {
    const isPaused = await systemController.paused();
    return !isPaused;
  }
}; 