const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { deploySystem } = require("./utils/testHelpers");

describe("房产通证化系统测试", function () {
  let system, owner, user1;
  let roleManager, feeManager, kycManager, propertyRegistry, tokenFactory, redemptionManager, rentDistributor, marketplace;

  beforeEach(async function () {
    const deployed = await deploySystem();
    system = deployed.system;
    owner = deployed.owner;
    user1 = deployed.user1;
    roleManager = deployed.roleManager;
    feeManager = deployed.feeManager;
    kycManager = deployed.kycManager;
    propertyRegistry = deployed.propertyRegistry;
    tokenFactory = deployed.tokenFactory;
    redemptionManager = deployed.redemptionManager;
    rentDistributor = deployed.rentDistributor;
    marketplace = deployed.marketplace;
  });

  it("应该正确部署所有系统合约", async function () {
    const addresses = await system.getSystemContracts();
    
    expect(addresses[0]).to.equal(roleManager.address);
    expect(addresses[1]).to.equal(feeManager.address);
    expect(addresses[2]).to.equal(kycManager.address);
    expect(addresses[3]).to.equal(propertyRegistry.address);
    expect(addresses[4]).to.equal(tokenFactory.address);
    expect(addresses[5]).to.equal(redemptionManager.address);
    expect(addresses[6]).to.equal(rentDistributor.address);
    expect(addresses[7]).to.equal(marketplace.address);
  });

  it("应该能够设置系统状态", async function () {
    expect(await system.systemActive()).to.be.true;
    
    await system.connect(owner).setSystemStatus(false);
    expect(await system.systemActive()).to.be.false;
    
    await system.connect(owner).setSystemStatus(true);
    expect(await system.systemActive()).to.be.true;
  });

  it("非超级管理员不应该能够设置系统状态", async function () {
    await expect(
      system.connect(user1).setSystemStatus(false)
    ).to.be.revertedWith("Caller is not a super admin");
  });

  it("超级管理员应该能够升级系统合约", async function () {
    // 部署新的RoleManager实现
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const newImplementation = await RoleManager.deploy();
    await newImplementation.deployed();
    
    await system.connect(owner).upgradeContract("RoleManager", newImplementation.address);
    
    // 验证合约已升级（这里我们只能验证功能是否正常，无法直接验证实现地址）
    // 尝试使用一个基本功能来验证
    const SUPER_ADMIN_ROLE = await roleManager.SUPER_ADMIN();
    expect(await roleManager.hasRole(SUPER_ADMIN_ROLE, owner.address)).to.be.true;
  });

  it("非超级管理员不应该能够升级系统合约", async function () {
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const newImplementation = await RoleManager.deploy();
    await newImplementation.deployed();
    
    await expect(
      system.connect(user1).upgradeContract("RoleManager", newImplementation.address)
    ).to.be.revertedWith("Caller is not a super admin");
  });

  it("不应该能够升级到无效的实现地址", async function () {
    await expect(
      system.connect(owner).upgradeContract("RoleManager", ethers.constants.AddressZero)
    ).to.be.revertedWith("Invalid implementation address");
  });

  it("不应该能够升级未知的合约名称", async function () {
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const newImplementation = await RoleManager.deploy();
    await newImplementation.deployed();
    
    await expect(
      system.connect(owner).upgradeContract("UnknownContract", newImplementation.address)
    ).to.be.revertedWith("Unknown contract name");
  });

  it("系统应该能够作为一个整体正常工作", async function () {
    // 这个测试验证系统的各个组件是否能够协同工作
    
    // 1. 注册房产
    const propertyId = "PROP-" + Date.now();
    const country = "Japan";
    const metadataURI = "https://metadata.example.com/property/" + propertyId;
    
    await propertyRegistry.connect(deployed.propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    // 2. 审核房产
    await propertyRegistry.connect(owner).approveProperty(propertyId);
    
    // 3. 创建房产代币
    const tokenName = "Property Token";
    const tokenSymbol = "PT";
    const totalSupply = ethers.utils.parseEther("1000");
    
    const tx = await tokenFactory.connect(owner).createToken(
      propertyId, tokenName, tokenSymbol, totalSupply
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'TokenCreated');
    const tokenAddress = event.args.tokenAddress;
    
    // 4. 验证房产状态已更新
    const property = await propertyRegistry.properties(propertyId);
    expect(property.status).to.equal(3); // Tokenized
    expect(property.tokenAddress).to.equal(tokenAddress);
    
    // 5. 获取代币合约实例
    const token = await ethers.getContractAt("RealEstateToken", tokenAddress);
    
    // 6. 验证代币信息
    expect(await token.name()).to.equal(tokenName);
    expect(await token.symbol()).to.equal(tokenSymbol);
    expect(await token.totalSupply()).to.equal(totalSupply);
    
    // 7. 验证系统各组件之间的关联
    const propertyInfo = await token.propertyInfo();
    expect(propertyInfo.propertyId).to.equal(propertyId);
    expect(propertyInfo.country).to.equal(country);
    expect(propertyInfo.metadataURI).to.equal(metadataURI);
  });
});