const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("合约升级集成测试", function () {
  let roleManager;
  let propertyManager;
  let admin;
  let manager;
  let user;
  
  beforeEach(async function () {
    [admin, manager, user] = await ethers.getSigners();
    
    // 部署 RoleManager
    const RoleManager = await ethers.getContractFactory("RoleManager");
    roleManager = await upgrades.deployProxy(RoleManager, [admin.address], {
      kind: "uups",
    });
    await roleManager.waitForDeployment();
    
    // 设置角色
    await roleManager.grantRole(await roleManager.MANAGER_ROLE(), manager.address);
    await roleManager.grantRole(await roleManager.UPGRADER_ROLE(), admin.address);
    await roleManager.grantRole(await roleManager.MANAGER_ROLE(), admin.address);
    
    // 部署 PropertyManager
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    propertyManager = await upgrades.deployProxy(PropertyManager, [await roleManager.getAddress()], {
      kind: "uups",
    });
    await propertyManager.waitForDeployment();
    
    // 注册一个测试资产
    await propertyManager.connect(admin).registerProperty(
      "TEST001",
      "Japan",
      "https://example.com/metadata/test001"
    );
  });
  
  describe("角色管理器升级", function () {
    it("应该能升级RoleManager并保留状态", async function () {
      // 获取当前状态
      const hasAdminRole = await roleManager.hasRole(await roleManager.ADMIN_ROLE(), admin.address);
      const hasManagerRole = await roleManager.hasRole(await roleManager.MANAGER_ROLE(), manager.address);
      
      // 部署一个"新版本"的RoleManager
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager", admin);
      
      // 升级合约
      const upgradedRoleManager = await upgrades.upgradeProxy(await roleManager.getAddress(), RoleManagerV2);
      await upgradedRoleManager.waitForDeployment();
      
      // 验证地址没有变化
      expect(await upgradedRoleManager.getAddress()).to.equal(await roleManager.getAddress());
      
      // 验证状态被保留
      expect(await upgradedRoleManager.hasRole(await upgradedRoleManager.ADMIN_ROLE(), admin.address)).to.equal(hasAdminRole);
      expect(await upgradedRoleManager.hasRole(await upgradedRoleManager.MANAGER_ROLE(), manager.address)).to.equal(hasManagerRole);
    });
    
    it("非升级者不应能升级合约", async function () {
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager", manager);
      
      await expect(
        upgrades.upgradeProxy(await roleManager.getAddress(), RoleManagerV2)
      ).to.be.reverted;
    });
    
    it("紧急模式下不应能升级合约", async function () {
      // 激活紧急模式
      await roleManager.connect(admin).activateEmergencyMode();
      
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager", admin);
      
      await expect(
        upgrades.upgradeProxy(await roleManager.getAddress(), RoleManagerV2)
      ).to.be.revertedWith("Emergency mode active");
    });
  });
  
  describe("资产管理器升级", function () {
    it("应该能升级PropertyManager并保留资产数据", async function () {
      // 获取资产ID
      const propertyId = "TEST001";
      const propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyId));
      
      // 获取当前状态
      const propertyDetails = await propertyManager.getPropertyDetails(propertyIdHash);
      const metadataUriBefore = propertyDetails[3]; // metadataURI 是第4个字段
      const countryBefore = propertyDetails[2]; // country 是第3个字段
      
      // 部署一个"新版本"的PropertyManager
      const PropertyManagerV2 = await ethers.getContractFactory("PropertyManager", admin);
      
      // 升级合约
      const upgradedPropertyManager = await upgrades.upgradeProxy(await propertyManager.getAddress(), PropertyManagerV2);
      await upgradedPropertyManager.waitForDeployment();
      
      // 验证地址没有变化
      expect(await upgradedPropertyManager.getAddress()).to.equal(await propertyManager.getAddress());
      
      // 验证资产数据被保留
      const propertyDetailsAfter = await upgradedPropertyManager.getPropertyDetails(propertyIdHash);
      expect(propertyDetailsAfter[3]).to.equal(metadataUriBefore); // 验证 metadataURI
      expect(propertyDetailsAfter[2]).to.equal(countryBefore); // 验证 country
    });
  });
  
  describe("多合约升级场景", function () {
    let system;
    let tradingManager;
    let rewardManager;
    let facade;
    
    beforeEach(async function () {
      // 部署其他合约
      
      // 1. 部署 TradingManager
      const TradingManager = await ethers.getContractFactory("TradingManager");
      tradingManager = await upgrades.deployProxy(TradingManager, [await roleManager.getAddress()], {
        kind: "uups",
      });
      await tradingManager.waitForDeployment();
      
      // 2. 部署 RewardManager
      const RewardManager = await ethers.getContractFactory("RewardManager");
      rewardManager = await upgrades.deployProxy(RewardManager, [
        await roleManager.getAddress(),
        500, // platformFeeRate 5%
        200, // maintenanceFeeRate 2%
        admin.address, // feeReceiver
        ethers.parseEther("0.01") // minDistributionThreshold
      ], {
        kind: "uups",
      });
      await rewardManager.waitForDeployment();
      
      // 3. 部署 RealEstateSystem
      const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
      system = await upgrades.deployProxy(RealEstateSystem, [
        await roleManager.getAddress(),
        await propertyManager.getAddress(),
        await tradingManager.getAddress(),
        await rewardManager.getAddress()
      ], {
        kind: "uups",
      });
      await system.waitForDeployment();
      
      // 4. 部署 RealEstateFacade
      const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
      facade = await upgrades.deployProxy(RealEstateFacade, [
        await system.getAddress(),
        await roleManager.getAddress(),
        await propertyManager.getAddress(),
        await tradingManager.getAddress(),
        await rewardManager.getAddress()
      ], {
        kind: "uups",
      });
      await facade.waitForDeployment();
    });
    
    it("应该能升级所有合约并保持相互引用正确", async function () {
      // 升级 RoleManager
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager", admin);
      const upgradedRoleManager = await upgrades.upgradeProxy(await roleManager.getAddress(), RoleManagerV2);
      await upgradedRoleManager.waitForDeployment();
      
      // 升级 PropertyManager
      const PropertyManagerV2 = await ethers.getContractFactory("PropertyManager", admin);
      const upgradedPropertyManager = await upgrades.upgradeProxy(await propertyManager.getAddress(), PropertyManagerV2);
      await upgradedPropertyManager.waitForDeployment();
      
      // 升级 TradingManager
      const TradingManagerV2 = await ethers.getContractFactory("TradingManager", admin);
      const upgradedTradingManager = await upgrades.upgradeProxy(await tradingManager.getAddress(), TradingManagerV2);
      await upgradedTradingManager.waitForDeployment();
      
      // 升级 RewardManager
      const RewardManagerV2 = await ethers.getContractFactory("RewardManager", admin);
      const upgradedRewardManager = await upgrades.upgradeProxy(await rewardManager.getAddress(), RewardManagerV2);
      await upgradedRewardManager.waitForDeployment();
      
      // 升级 RealEstateSystem
      const RealEstateSystemV2 = await ethers.getContractFactory("RealEstateSystem", admin);
      const upgradedSystem = await upgrades.upgradeProxy(await system.getAddress(), RealEstateSystemV2);
      await upgradedSystem.waitForDeployment();
      
      // 升级 RealEstateFacade
      const RealEstateFacadeV2 = await ethers.getContractFactory("RealEstateFacade", admin);
      const upgradedFacade = await upgrades.upgradeProxy(await facade.getAddress(), RealEstateFacadeV2);
      await upgradedFacade.waitForDeployment();
      
      // 验证引用完整性
      expect(await upgradedPropertyManager.roleManager()).to.equal(await upgradedRoleManager.getAddress());
      expect(await upgradedTradingManager.roleManager()).to.equal(await upgradedRoleManager.getAddress());
      expect(await upgradedRewardManager.roleManager()).to.equal(await upgradedRoleManager.getAddress());
      
      expect(await upgradedSystem.roleManager()).to.equal(await upgradedRoleManager.getAddress());
      expect(await upgradedSystem.propertyManager()).to.equal(await upgradedPropertyManager.getAddress());
      expect(await upgradedSystem.tradingManager()).to.equal(await upgradedTradingManager.getAddress());
      expect(await upgradedSystem.rewardManager()).to.equal(await upgradedRewardManager.getAddress());
      
      expect(await upgradedFacade.system()).to.equal(await upgradedSystem.getAddress());
      expect(await upgradedFacade.roleManager()).to.equal(await upgradedRoleManager.getAddress());
      expect(await upgradedFacade.propertyManager()).to.equal(await upgradedPropertyManager.getAddress());
      expect(await upgradedFacade.tradingManager()).to.equal(await upgradedTradingManager.getAddress());
      expect(await upgradedFacade.rewardManager()).to.equal(await upgradedRewardManager.getAddress());
      
      // 验证系统状态
      expect(await upgradedSystem.getSystemStatus()).to.equal(1); // Active
    });
  });
}); 