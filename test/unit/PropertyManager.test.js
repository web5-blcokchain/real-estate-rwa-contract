const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("PropertyManager", function () {
  let roleManager;
  let propertyManager;
  let admin;
  let manager;
  let operator;
  let user;
  
  // 角色常量
  let ADMIN_ROLE;
  let MANAGER_ROLE;
  let OPERATOR_ROLE;
  
  beforeEach(async function () {
    [admin, manager, operator, user] = await ethers.getSigners();
    
    // 部署 RoleManager
    const RoleManager = await ethers.getContractFactory("RoleManager");
    roleManager = await upgrades.deployProxy(RoleManager, [admin.address], {
      kind: "uups",
    });
    await roleManager.waitForDeployment();
    
    // 获取角色常量
    ADMIN_ROLE = await roleManager.ADMIN_ROLE();
    MANAGER_ROLE = await roleManager.MANAGER_ROLE();
    OPERATOR_ROLE = await roleManager.OPERATOR_ROLE();
    
    // 设置角色 - 确保admin同时具有MANAGER_ROLE
    await roleManager.grantRole(MANAGER_ROLE, admin.address);
    await roleManager.grantRole(MANAGER_ROLE, manager.address);
    await roleManager.grantRole(OPERATOR_ROLE, operator.address);
    
    // 部署 PropertyManager
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    propertyManager = await upgrades.deployProxy(PropertyManager, [await roleManager.getAddress()], {
      kind: "uups",
    });
    await propertyManager.waitForDeployment();
  });
  
  describe("初始化", function () {
    it("应正确设置角色管理器", async function () {
      expect(await propertyManager.roleManager()).to.equal(await roleManager.getAddress());
    });
    
    it("应正确设置初始版本", async function () {
      expect(await propertyManager.version()).to.equal(1);
    });
  });
  
  describe("资产注册", function () {
    it("管理员应该能注册新资产", async function () {
      const propertyId = "PROP001";
      const propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyId));
      const country = "Japan";
      const metadataURI = "https://example.com/metadata/prop001";
      const valuation = ethers.parseEther("1000");
      
      await expect(
        propertyManager.connect(admin).registerProperty(
          propertyId,
          country,
          metadataURI
        )
      ).to.emit(propertyManager, "PropertyRegistered")
        .withArgs(propertyIdHash, propertyId, country, metadataURI);
      
      const propertyDetails = await propertyManager.getPropertyDetails(propertyIdHash);
      expect(propertyDetails[0]).to.equal(1); // 1: Pending
      expect(propertyDetails[2]).to.equal(country);
      expect(propertyDetails[3]).to.equal(metadataURI);
    });
    
    it("管理员应该能注册新资产", async function () {
      const propertyId = "PROP001";
      const propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyId));
      const country = "Japan";
      const metadataURI = "https://example.com/metadata/prop001";
      
      await expect(
        propertyManager.connect(manager).registerProperty(
          propertyId,
          country,
          metadataURI
        )
      ).to.emit(propertyManager, "PropertyRegistered")
        .withArgs(propertyIdHash, propertyId, country, metadataURI);
    });
    
    it("普通用户不应能注册资产", async function () {
      const propertyId = "PROP001";
      const country = "Japan";
      const metadataURI = "https://example.com/metadata/prop001";
      
      await expect(
        propertyManager.connect(user).registerProperty(
          propertyId,
          country,
          metadataURI
        )
      ).to.be.reverted;
    });
    
    it("不应能重复注册相同ID的资产", async function () {
      const propertyId = "PROP001";
      const country = "Japan";
      const metadataURI = "https://example.com/metadata/prop001";
      
      await propertyManager.connect(admin).registerProperty(
        propertyId,
        country,
        metadataURI
      );
      
      await expect(
        propertyManager.connect(admin).registerProperty(
          propertyId,
          country,
          metadataURI
        )
      ).to.be.revertedWith("Already registered");
    });
  });
  
  describe("资产更新", function () {
    let propertyId;
    let propertyIdHash;
    
    beforeEach(async function () {
      propertyId = "PROP001";
      propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyId));
      const country = "Japan";
      const metadataURI = "https://example.com/metadata/prop001";
      
      await propertyManager.connect(admin).registerProperty(
        propertyId,
        country,
        metadataURI
      );
    });
    
    it("管理员应该能更新资产状态", async function () {
      const newStatus = 2; // Approved
      
      await expect(
        propertyManager.connect(admin).updatePropertyStatus(
          propertyIdHash,
          newStatus
        )
      ).to.emit(propertyManager, "PropertyStatusUpdated")
        .withArgs(propertyIdHash, 1, newStatus); // 从Pending(1)到Approved(2)
      
      const status = await propertyManager.getPropertyStatus(propertyIdHash);
      expect(status).to.equal(newStatus);
    });
  });
  
  describe("资产查询", function () {
    let propertyId;
    let propertyIdHash;
    let country;
    let metadataURI;
    
    beforeEach(async function () {
      propertyId = "PROP001";
      propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyId));
      country = "Japan";
      metadataURI = "https://example.com/metadata/prop001";
      
      await propertyManager.connect(admin).registerProperty(
        propertyId,
        country,
        metadataURI
      );
    });
    
    it("应该能通过ID哈希查询资产", async function () {
      const propertyDetails = await propertyManager.getPropertyDetails(propertyIdHash);
      expect(propertyDetails[0]).to.equal(1); // Pending
      expect(propertyDetails[2]).to.equal(country);
      expect(propertyDetails[3]).to.equal(metadataURI);
    });
    
    it("应该能检查资产是否存在", async function () {
      const exists = await propertyManager.propertyExists(propertyIdHash);
      expect(exists).to.be.true;
      
      const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("NONEXISTENT"));
      const nonExists = await propertyManager.propertyExists(nonExistentHash);
      expect(nonExists).to.be.false;
    });
  });
  
  describe("资产代币关联", function () {
    let propertyId;
    let propertyIdHash;
    
    beforeEach(async function () {
      propertyId = "PROP001";
      propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyId));
      const country = "Japan";
      const metadataURI = "https://example.com/metadata/prop001";
      
      await propertyManager.connect(admin).registerProperty(
        propertyId,
        country,
        metadataURI
      );
    });
    
    it("管理员应该能设置资产代币", async function () {
      const tokenAddress = "0x1234567890123456789012345678901234567890";
      
      await expect(
        propertyManager.connect(admin).registerTokenForProperty(
          propertyIdHash,
          tokenAddress
        )
      ).to.emit(propertyManager, "TokenRegistered")
        .withArgs(propertyIdHash, tokenAddress);
      
      const propertyDetails = await propertyManager.getPropertyDetails(propertyIdHash);
      expect(propertyDetails[4]).to.equal(tokenAddress);
    });
    
    it("普通用户不应能设置资产代币", async function () {
      const tokenAddress = "0x1234567890123456789012345678901234567890";
      
      await expect(
        propertyManager.connect(user).registerTokenForProperty(
          propertyIdHash,
          tokenAddress
        )
      ).to.be.reverted;
    });
    
    it("不应能为不存在的资产设置代币", async function () {
      const tokenAddress = "0x1234567890123456789012345678901234567890";
      const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("NONEXISTENT"));
      
      await expect(
        propertyManager.connect(admin).registerTokenForProperty(
          nonExistentHash,
          tokenAddress
        )
      ).to.be.revertedWith("Property not exist");
    });
  });
}); 