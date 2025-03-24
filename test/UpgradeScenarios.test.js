const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("合约升级场景测试", function() {
  let roleManager;
  let feeManager;
  let propertyRegistry;
  let owner;
  let user;
  
  beforeEach(async function() {
    [owner, user] = await ethers.getSigners();
    
    // 部署RoleManager
    const RoleManager = await ethers.getContractFactory("RoleManager");
    roleManager = await upgrades.deployProxy(RoleManager, []);
    
    // 授予超级管理员角色
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    await roleManager.grantRole(SUPER_ADMIN, owner.address);
    
    // 部署FeeManager
    const FeeManager = await ethers.getContractFactory("FeeManager");
    feeManager = await upgrades.deployProxy(FeeManager, [roleManager.address]);
    
    // 部署PropertyRegistry
    const PropertyRegistry = await ethers.getContractFactory("PropertyRegistry");
    propertyRegistry = await upgrades.deployProxy(PropertyRegistry, [roleManager.address]);
  });
  
  describe("RoleManager 升级", function() {
    it("升级后应保持原有角色分配", async function() {
      // 设置初始角色
      const PROPERTY_MANAGER_ROLE = await roleManager.PROPERTY_MANAGER();
      await roleManager.grantRole(PROPERTY_MANAGER_ROLE, user.address);
      
      // 确认初始角色已设置
      expect(await roleManager.hasRole(PROPERTY_MANAGER_ROLE, user.address)).to.be.true;
      
      // 部署新版本的RoleManager
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager");
      await upgrades.upgradeProxy(roleManager.address, RoleManagerV2);
      
      // 检查升级后版本号增加
      expect(await roleManager.version()).to.equal(2);
      
      // 验证原有角色权限仍然存在
      expect(await roleManager.hasRole(PROPERTY_MANAGER_ROLE, user.address)).to.be.true;
    });
  });
  
  describe("FeeManager 升级", function() {
    it("升级后应保持原有费率设置", async function() {
      // 记录初始费率
      const initialTradingFee = await feeManager.tradingFee();
      
      // 修改费率
      await feeManager.updateFee(1, 50); // 更新交易费率为0.5%
      
      // 确认费率已更新
      expect(await feeManager.tradingFee()).to.equal(50);
      
      // 部署新版FeeManager
      const FeeManagerV2 = await ethers.getContractFactory("FeeManager");
      await upgrades.upgradeProxy(feeManager.address, FeeManagerV2);
      
      // 检查升级后版本号增加
      expect(await feeManager.version()).to.equal(2);
      
      // 验证费率设置保持不变
      expect(await feeManager.tradingFee()).to.equal(50);
      expect(await feeManager.redemptionFee()).to.equal(10); // 默认值
    });
    
    it("应能处理新增函数和状态变量", async function() {
      // 这里模拟在未来的升级中可能新增的功能，实际测试中可能无法实现，
      // 但作为示例说明升级机制应该能处理新增函数和状态变量
      console.log("注意: 此测试需要实际实现合约V2版本才能进行完整验证");
    });
  });
  
  describe("PropertyRegistry 升级与chainId", function() {
    it("升级后应保持原有房产数据和chainId", async function() {
      // 注册房产
      await propertyRegistry.connect(owner).registerProperty(
        1, "Japan", "ipfs://property1-metadata"
      );
      
      // 批准房产
      await propertyRegistry.connect(owner).approveProperty(1);
      
      // 获取当前chainId
      const currentChainId = await propertyRegistry.chainId();
      
      // 部署新版PropertyRegistry
      const PropertyRegistryV2 = await ethers.getContractFactory("PropertyRegistry");
      await upgrades.upgradeProxy(propertyRegistry.address, PropertyRegistryV2);
      
      // 检查升级后版本号增加
      expect(await propertyRegistry.version()).to.equal(2);
      
      // 验证房产数据保持不变
      const property = await propertyRegistry.properties(1);
      expect(property.country).to.equal("Japan");
      expect(property.status).to.equal(2); // Approved
      
      // 验证chainId保持不变
      expect(await propertyRegistry.chainId()).to.equal(currentChainId);
    });
  });
  
  describe("多合约协同升级", function() {
    it("应能同时升级多个相关合约并保持引用关系", async function() {
      // 部署新版本的多个合约
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager");
      const FeeManagerV2 = await ethers.getContractFactory("FeeManager");
      const PropertyRegistryV2 = await ethers.getContractFactory("PropertyRegistry");
      
      // 记录初始引用关系
      const initialRoleManagerAddress = roleManager.address;
      
      // 依次升级合约
      await upgrades.upgradeProxy(roleManager.address, RoleManagerV2);
      await upgrades.upgradeProxy(feeManager.address, FeeManagerV2);
      await upgrades.upgradeProxy(propertyRegistry.address, PropertyRegistryV2);
      
      // 验证版本号都已更新
      expect(await roleManager.version()).to.equal(2);
      expect(await feeManager.version()).to.equal(2);
      expect(await propertyRegistry.version()).to.equal(2);
      
      // 验证引用关系保持不变
      expect(await feeManager.roleManager()).to.equal(initialRoleManagerAddress);
      expect(await propertyRegistry.roleManager()).to.equal(initialRoleManagerAddress);
    });
  });
  
  describe("重新初始化和引用修复", function() {
    it("升级后应允许重新初始化以修复引用", async function() {
      // 部署新的RoleManager (模拟需要替换的情况)
      const RoleManager = await ethers.getContractFactory("RoleManager");
      const newRoleManager = await upgrades.deployProxy(RoleManager, []);
      
      // 记录原始引用
      const oldRoleManagerAddress = await propertyRegistry.roleManager();
      
      // 升级PropertyRegistry
      const PropertyRegistryV2 = await ethers.getContractFactory("PropertyRegistry");
      await upgrades.upgradeProxy(propertyRegistry.address, PropertyRegistryV2);
      
      // 重新初始化以更新RoleManager引用
      await propertyRegistry.initialize(newRoleManager.address);
      
      // 验证引用已更新
      expect(await propertyRegistry.roleManager()).to.equal(newRoleManager.address);
      expect(await propertyRegistry.roleManager()).to.not.equal(oldRoleManagerAddress);
      
      // 验证版本号已增加
      expect(await propertyRegistry.version()).to.equal(2);
    });
  });
}); 