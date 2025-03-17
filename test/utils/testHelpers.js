const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
require("dotenv").config();

// 角色常量
const SUPER_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUPER_ADMIN_ROLE"));
const PROPERTY_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPERTY_MANAGER_ROLE"));
const KYC_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("KYC_MANAGER_ROLE"));

// 从环境变量获取配置
const PLATFORM_FEE = process.env.PLATFORM_FEE || 200;
const MAINTENANCE_FEE = process.env.MAINTENANCE_FEE || 300;
const TRADING_FEE = process.env.TRADING_FEE || 100;
const REDEMPTION_FEE = process.env.REDEMPTION_FEE || 150;
const STABLECOIN_SUPPLY = process.env.STABLECOIN_SUPPLY || 1000000;
const USER_INITIAL_BALANCE = process.env.USER_INITIAL_BALANCE || 10000;
const DEFAULT_TOKEN_SUPPLY = process.env.DEFAULT_TOKEN_SUPPLY || 1000;
const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || "Japan";

// 添加更多环境变量配置
const STABLECOIN_NAME = process.env.STABLECOIN_NAME || "Test USD";
const STABLECOIN_SYMBOL = process.env.STABLECOIN_SYMBOL || "TUSD";
const REDEMPTION_PERIOD = process.env.REDEMPTION_PERIOD || 2592000; // 默认30天
const METADATA_URI_BASE = process.env.METADATA_URI_BASE || "https://metadata.example.com/property/";
const DEFAULT_TOKEN_NAME_PREFIX = process.env.DEFAULT_TOKEN_NAME_PREFIX || "Property Token ";
const DEFAULT_TOKEN_SYMBOL_PREFIX = process.env.DEFAULT_TOKEN_SYMBOL_PREFIX || "PT";
const PROPERTY_ID_PREFIX = process.env.PROPERTY_ID_PREFIX || "PROP-";

// 部署基础系统
async function deploySystem() {
  const [owner, user1, user2, user3, propertyManager, kycManager, feeCollector] = await ethers.getSigners();
  
  // 部署RealEstateSystem
  const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
  const system = await upgrades.deployProxy(RealEstateSystem, [], { initializer: 'initialize' });
  await system.deployed();
  
  // 获取系统合约地址
  const addresses = await system.getSystemContracts();
  
  // 获取各个合约实例
  const roleManager = await ethers.getContractAt("RoleManager", addresses[0]);
  const feeManager = await ethers.getContractAt("FeeManager", addresses[1]);
  const kycManager = await ethers.getContractAt("KYCManager", addresses[2]);
  const propertyRegistry = await ethers.getContractAt("PropertyRegistry", addresses[3]);
  const tokenFactory = await ethers.getContractAt("TokenFactory", addresses[4]);
  const redemptionManager = await ethers.getContractAt("RedemptionManager", addresses[5]);
  const rentDistributor = await ethers.getContractAt("RentDistributor", addresses[6]);
  const marketplace = await ethers.getContractAt("Marketplace", addresses[7]);
  
  // 设置角色
  await roleManager.grantRole(PROPERTY_MANAGER_ROLE, propertyManager.address);
  await roleManager.grantRole(KYC_MANAGER_ROLE, kycManager.address);
  
  // 设置费用收集者
  await feeManager.setFeeCollector(feeCollector.address);
  
  // 设置费用比例 - 使用环境变量
  await feeManager.setFeeRate("PLATFORM_FEE", PLATFORM_FEE);
  await feeManager.setFeeRate("MAINTENANCE_FEE", MAINTENANCE_FEE);
  await feeManager.setFeeRate("TRADING_FEE", TRADING_FEE);
  await feeManager.setFeeRate("REDEMPTION_FEE", REDEMPTION_FEE);
  
  // 部署测试稳定币 - 使用环境变量
  const TestStablecoin = await ethers.getContractFactory("TestStablecoin");
  const stablecoin = await TestStablecoin.deploy(
    STABLECOIN_NAME, 
    STABLECOIN_SYMBOL, 
    ethers.utils.parseEther(STABLECOIN_SUPPLY.toString())
  );
  await stablecoin.deployed();
  
  // 向测试用户分发稳定币 - 使用环境变量
  const userBalance = ethers.utils.parseEther(USER_INITIAL_BALANCE.toString());
  await stablecoin.transfer(user1.address, userBalance);
  await stablecoin.transfer(user2.address, userBalance);
  await stablecoin.transfer(user3.address, userBalance);
  await stablecoin.transfer(propertyManager.address, userBalance);
  
  return {
    owner, user1, user2, user3, propertyManager, kycManager, feeCollector,
    system, roleManager, feeManager, kycManager, propertyRegistry,
    tokenFactory, redemptionManager, rentDistributor, marketplace,
    stablecoin
  };
}

// 注册并审核房产 - 使用环境变量
async function registerAndApproveProperty(propertyRegistry, propertyManager, owner) {
  const propertyId = PROPERTY_ID_PREFIX + Date.now();
  const country = DEFAULT_COUNTRY;
  const metadataURI = METADATA_URI_BASE + propertyId;
  
  // 注册房产
  await propertyRegistry.connect(propertyManager).registerProperty(
    propertyId, country, metadataURI
  );
  
  // 审核房产
  await propertyRegistry.connect(owner).approveProperty(propertyId);
  
  return propertyId;
}

// 创建房产代币 - 使用环境变量
async function createPropertyToken(tokenFactory, propertyId, owner) {
  const tokenName = DEFAULT_TOKEN_NAME_PREFIX + propertyId;
  const tokenSymbol = DEFAULT_TOKEN_SYMBOL_PREFIX + propertyId.substring(propertyId.length - 3);
  const totalSupply = ethers.utils.parseEther(DEFAULT_TOKEN_SUPPLY.toString());
  
  const tx = await tokenFactory.connect(owner).createToken(
    propertyId, tokenName, tokenSymbol, totalSupply
  );
  
  const receipt = await tx.wait();
  const event = receipt.events.find(e => e.event === 'TokenCreated');
  const tokenAddress = event.args.tokenAddress;
  
  const token = await ethers.getContractAt("RealEstateToken", tokenAddress);
  
  return { token, tokenAddress };
}

// KYC验证用户
async function verifyUsers(kycManager, kycManagerSigner, users) {
  for (const user of users) {
    await kycManager.connect(kycManagerSigner).verifyUser(user.address);
  }
}

// 将用户添加到白名单
async function addUsersToWhitelist(token, owner, users) {
  for (const user of users) {
    await token.connect(owner).addToWhitelist(user.address);
  }
}

// 分发代币给用户
async function distributeTokens(token, owner, users, amount) {
  for (const user of users) {
    await token.connect(owner).transfer(user.address, amount);
  }
}

module.exports = {
  deploySystem,
  registerAndApproveProperty,
  createPropertyToken,
  verifyUsers,
  addUsersToWhitelist,
  distributeTokens,
  SUPER_ADMIN_ROLE,
  PROPERTY_MANAGER_ROLE,
  KYC_MANAGER_ROLE
};