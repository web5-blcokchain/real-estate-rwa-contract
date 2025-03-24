const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("房产代币交互测试", function() {
  let roleManager;
  let propertyRegistry;
  let realEstateToken;
  let deployer;
  let propertyManager;
  let investor1;
  let investor2;
  let investor3;
  let investor4;
  
  const TOKEN_NAME = "Test Property Token";
  const TOKEN_SYMBOL = "TPT";
  const TOKEN_DECIMALS = 18;
  const TOKEN_MAX_SUPPLY = ethers.utils.parseEther("10000");
  const TOKEN_INITIAL_SUPPLY = ethers.utils.parseEther("5000");
  
  beforeEach(async function() {
    [deployer, propertyManager, investor1, investor2, investor3, investor4] = await ethers.getSigners();
    
    // 部署角色管理合约
    const RoleManager = await ethers.getContractFactory("RoleManager", deployer);
    roleManager = await upgrades.deployProxy(RoleManager, []);
    
    // 授权角色
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    const PROPERTY_MANAGER_ROLE = await roleManager.PROPERTY_MANAGER();
    
    await roleManager.grantRole(SUPER_ADMIN, deployer.address);
    await roleManager.grantRole(PROPERTY_MANAGER_ROLE, propertyManager.address);
    
    // 部署房产注册合约
    const PropertyRegistry = await ethers.getContractFactory("PropertyRegistry", deployer);
    propertyRegistry = await upgrades.deployProxy(PropertyRegistry, [roleManager.address]);
    
    // 注册房产
    await propertyRegistry.registerProperty(1, "Japan", "ipfs://test-metadata");
    await propertyRegistry.approveProperty(1);
    
    // 部署代币合约
    const RealEstateToken = await ethers.getContractFactory("RealEstateToken", deployer);
    const tokenImpl = await RealEstateToken.deploy();
    
    // 创建代理
    const data = RealEstateToken.interface.encodeFunctionData("initialize", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_DECIMALS,
      TOKEN_MAX_SUPPLY,
      roleManager.address,
      propertyRegistry.address,
      1  // 房产ID
    ]);
    
    const TransparentUpgradeableProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
    const proxy = await TransparentUpgradeableProxy.deploy(
      tokenImpl.address,
      deployer.address,
      data
    );
    
    // 获取代理的代币实例
    realEstateToken = RealEstateToken.attach(proxy.address);
    
    // 铸造代币
    await realEstateToken.mint(deployer.address, TOKEN_INITIAL_SUPPLY);
  });
  
  describe("白名单管理", function() {
    it("应允许添加和移除白名单地址", async function() {
      // 添加白名单
      await realEstateToken.addToWhitelist(investor1.address);
      await realEstateToken.addToWhitelist(investor2.address);
      
      // 验证白名单状态
      expect(await realEstateToken.isWhitelisted(investor1.address)).to.be.true;
      expect(await realEstateToken.isWhitelisted(investor2.address)).to.be.true;
      expect(await realEstateToken.isWhitelisted(investor3.address)).to.be.false;
      
      // 移除白名单
      await realEstateToken.removeFromWhitelist(investor1.address);
      
      // 验证更新后的白名单状态
      expect(await realEstateToken.isWhitelisted(investor1.address)).to.be.false;
      expect(await realEstateToken.isWhitelisted(investor2.address)).to.be.true;
    });
    
    it("应允许批量管理白名单", async function() {
      // 批量添加白名单
      await realEstateToken.batchAddToWhitelist([
        investor1.address,
        investor2.address,
        investor3.address
      ]);
      
      // 验证白名单状态
      expect(await realEstateToken.isWhitelisted(investor1.address)).to.be.true;
      expect(await realEstateToken.isWhitelisted(investor2.address)).to.be.true;
      expect(await realEstateToken.isWhitelisted(investor3.address)).to.be.true;
      expect(await realEstateToken.isWhitelisted(investor4.address)).to.be.false;
      
      // 批量移除白名单
      await realEstateToken.batchRemoveFromWhitelist([
        investor1.address,
        investor3.address
      ]);
      
      // 验证更新后的白名单状态
      expect(await realEstateToken.isWhitelisted(investor1.address)).to.be.false;
      expect(await realEstateToken.isWhitelisted(investor2.address)).to.be.true;
      expect(await realEstateToken.isWhitelisted(investor3.address)).to.be.false;
    });
    
    it("非白名单地址不应能接收代币", async function() {
      // 转账给白名单地址应成功
      await realEstateToken.addToWhitelist(investor1.address);
      await realEstateToken.transfer(investor1.address, ethers.utils.parseEther("100"));
      expect(await realEstateToken.balanceOf(investor1.address)).to.equal(ethers.utils.parseEther("100"));
      
      // 转账给非白名单地址应失败
      await expect(
        realEstateToken.transfer(investor2.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("RealEstateToken: Recipient is not whitelisted");
    });
  });
  
  describe("批量转账", function() {
    beforeEach(async function() {
      // 将所有测试投资者加入白名单
      await realEstateToken.batchAddToWhitelist([
        investor1.address,
        investor2.address,
        investor3.address,
        investor4.address
      ]);
    });
    
    it("应允许批量转账给多个地址", async function() {
      // 准备批量转账数据
      const recipients = [
        investor1.address,
        investor2.address,
        investor3.address
      ];
      
      const amounts = [
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("300")
      ];
      
      // 批量转账
      await realEstateToken.batchTransfer(recipients, amounts);
      
      // 验证余额
      expect(await realEstateToken.balanceOf(investor1.address)).to.equal(ethers.utils.parseEther("100"));
      expect(await realEstateToken.balanceOf(investor2.address)).to.equal(ethers.utils.parseEther("200"));
      expect(await realEstateToken.balanceOf(investor3.address)).to.equal(ethers.utils.parseEther("300"));
    });
    
    it("批量转账应验证参数长度匹配", async function() {
      // 准备不匹配的批量转账数据
      const recipients = [
        investor1.address,
        investor2.address
      ];
      
      const amounts = [
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("300")
      ];
      
      // 批量转账应失败
      await expect(
        realEstateToken.batchTransfer(recipients, amounts)
      ).to.be.revertedWith("RealEstateToken: Recipients and amounts length mismatch");
    });
    
    it("批量转账不应超出发送者余额", async function() {
      // 准备超出余额的批量转账数据
      const recipients = [
        investor1.address,
        investor2.address
      ];
      
      const amounts = [
        ethers.utils.parseEther("3000"),
        ethers.utils.parseEther("3000")
      ];
      
      // 批量转账应失败
      await expect(
        realEstateToken.batchTransfer(recipients, amounts)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });
  
  describe("代币冻结功能", function() {
    beforeEach(async function() {
      // 将所有测试投资者加入白名单
      await realEstateToken.batchAddToWhitelist([
        investor1.address,
        investor2.address
      ]);
      
      // 转一些代币给投资者用于测试
      await realEstateToken.transfer(investor1.address, ethers.utils.parseEther("500"));
      await realEstateToken.transfer(investor2.address, ethers.utils.parseEther("500"));
    });
    
    it("房产状态变更为冻结时应阻止代币转账", async function() {
      // 初始状态下投资者应能自由转账
      await realEstateToken.connect(investor1).transfer(investor2.address, ethers.utils.parseEther("100"));
      
      // 冻结房产
      await propertyRegistry.setPropertyStatus(1, 6); // PropertyStatus.Frozen
      
      // 调用notifyPropertyStatusChange使代币意识到状态变化
      // 注意：这个函数可能不存在，取决于你实际的合约结构
      if (realEstateToken.notifyPropertyStatusChange) {
        await realEstateToken.notifyPropertyStatusChange(6); // PropertyStatus.Frozen
      }
      
      // 房产冻结后转账应失败
      await expect(
        realEstateToken.connect(investor1).transfer(investor2.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("RealEstateToken: Token is frozen");
    });
    
    it("特权账户即使在冻结状态也应能转账", async function() {
      // 冻结房产
      await propertyRegistry.setPropertyStatus(1, 6); // PropertyStatus.Frozen
      
      // 调用notifyPropertyStatusChange使代币意识到状态变化
      if (realEstateToken.notifyPropertyStatusChange) {
        await realEstateToken.notifyPropertyStatusChange(6); // PropertyStatus.Frozen
      }
      
      // 系统管理员应能够转账
      await realEstateToken.transfer(investor2.address, ethers.utils.parseEther("100"));
      
      // 普通投资者不能转账
      await expect(
        realEstateToken.connect(investor1).transfer(investor2.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("RealEstateToken: Token is frozen");
    });
    
    it("恢复房产状态后应恢复代币转账功能", async function() {
      // 冻结房产
      await propertyRegistry.setPropertyStatus(1, 6); // PropertyStatus.Frozen
      
      // 调用notifyPropertyStatusChange使代币意识到状态变化
      if (realEstateToken.notifyPropertyStatusChange) {
        await realEstateToken.notifyPropertyStatusChange(6); // PropertyStatus.Frozen
      }
      
      // 冻结状态下转账应失败
      await expect(
        realEstateToken.connect(investor1).transfer(investor2.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("RealEstateToken: Token is frozen");
      
      // 恢复房产状态
      await propertyRegistry.setPropertyStatus(1, 2); // PropertyStatus.Approved
      
      // 调用notifyPropertyStatusChange使代币意识到状态变化
      if (realEstateToken.notifyPropertyStatusChange) {
        await realEstateToken.notifyPropertyStatusChange(2); // PropertyStatus.Approved
      }
      
      // 恢复后转账应成功
      await realEstateToken.connect(investor1).transfer(investor2.address, ethers.utils.parseEther("100"));
      
      // 验证余额
      expect(await realEstateToken.balanceOf(investor2.address)).to.equal(ethers.utils.parseEther("700"));
    });
  });
  
  describe("代币快照功能", function() {
    beforeEach(async function() {
      // 将所有测试投资者加入白名单
      await realEstateToken.batchAddToWhitelist([
        investor1.address,
        investor2.address
      ]);
      
      // 转一些代币给投资者用于测试
      await realEstateToken.transfer(investor1.address, ethers.utils.parseEther("300"));
      await realEstateToken.transfer(investor2.address, ethers.utils.parseEther("700"));
    });
    
    it("应能创建余额快照并查询历史余额", async function() {
      // 创建快照
      await realEstateToken.snapshot();
      const firstSnapshotId = await realEstateToken.getCurrentSnapshotId();
      
      // 进行一些转账操作
      await realEstateToken.connect(investor1).transfer(investor2.address, ethers.utils.parseEther("100"));
      
      // 再次创建快照
      await realEstateToken.snapshot();
      const secondSnapshotId = await realEstateToken.getCurrentSnapshotId();
      
      // 再次转账
      await realEstateToken.connect(investor1).transfer(investor2.address, ethers.utils.parseEther("50"));
      
      // 查询当前余额
      expect(await realEstateToken.balanceOf(investor1.address)).to.equal(ethers.utils.parseEther("150"));
      expect(await realEstateToken.balanceOf(investor2.address)).to.equal(ethers.utils.parseEther("850"));
      
      // 查询第一个快照的余额
      expect(await realEstateToken.balanceOfAt(investor1.address, firstSnapshotId)).to.equal(ethers.utils.parseEther("300"));
      expect(await realEstateToken.balanceOfAt(investor2.address, firstSnapshotId)).to.equal(ethers.utils.parseEther("700"));
      
      // 查询第二个快照的余额
      expect(await realEstateToken.balanceOfAt(investor1.address, secondSnapshotId)).to.equal(ethers.utils.parseEther("200"));
      expect(await realEstateToken.balanceOfAt(investor2.address, secondSnapshotId)).to.equal(ethers.utils.parseEther("800"));
    });
    
    it("只有授权角色才能创建快照", async function() {
      // 普通投资者不能创建快照
      await expect(
        realEstateToken.connect(investor1).snapshot()
      ).to.be.reverted;
      
      // 授权角色可以创建快照
      await realEstateToken.snapshot();
      expect(await realEstateToken.getCurrentSnapshotId()).to.be.gt(0);
    });
  });
}); 