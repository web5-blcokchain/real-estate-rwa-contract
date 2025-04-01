const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("紧急情况端到端测试", function () {
  let system;
  let roleManager;
  let propertyManager;
  let tradingManager;
  let rewardManager;
  let facade;
  let admin;
  let manager;
  let investor1;
  let investor2;
  let propertyToken;
  
  // 测试数据
  const propertyId = "TOKYO123";
  const tokenName = "Tokyo Property";
  const tokenSymbol = "TKP";
  const initialSupply = ethers.utils.parseEther("10000");
  const initialPrice = ethers.utils.parseEther("0.1");
  const location = "Tokyo, Japan";
  const description = "Premium property in Tokyo";
  
  beforeEach(async function () {
    [admin, manager, investor1, investor2] = await ethers.getSigners();
    
    // 部署所有合约
    
    // 1. 部署 RoleManager
    const RoleManager = await ethers.getContractFactory("RoleManager");
    roleManager = await upgrades.deployProxy(RoleManager, [admin.address], {
      kind: "uups",
    });
    
    // 2. 设置角色
    await roleManager.grantRole(await roleManager.MANAGER_ROLE(), manager.address);
    await roleManager.grantRole(await roleManager.ADMIN_ROLE(), manager.address);
    await roleManager.grantRole(await roleManager.PAUSER_ROLE(), manager.address);
    
    // 3. 部署 PropertyManager
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    propertyManager = await upgrades.deployProxy(PropertyManager, [roleManager.address], {
      kind: "uups",
    });
    
    // 4. 部署 TradingManager
    const TradingManager = await ethers.getContractFactory("TradingManager");
    tradingManager = await upgrades.deployProxy(TradingManager, [roleManager.address], {
      kind: "uups",
    });
    
    // 配置交易参数
    await tradingManager.connect(admin).setFeeRate(250); // 2.5%
    await tradingManager.connect(admin).setFeeReceiver(admin.address);
    await tradingManager.connect(admin).setMaxTradeAmount(ethers.utils.parseEther("5000"));
    await tradingManager.connect(admin).setMinTradeAmount(ethers.utils.parseEther("1"));
    
    // 5. 部署 PropertyToken (仅作为工厂模板)
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    propertyToken = await upgrades.deployProxy(PropertyToken, [
      ethers.constants.HashZero,
      "Template",
      "TPL",
      0,
      admin.address,
      roleManager.address
    ], {
      kind: "uups",
    });
    
    // 6. 部署 RewardManager
    const RewardManager = await ethers.getContractFactory("RewardManager");
    rewardManager = await upgrades.deployProxy(RewardManager, [
      roleManager.address,
      500, // platformFeeRate 5%
      200, // maintenanceFeeRate 2%
      admin.address, // feeReceiver
      ethers.utils.parseEther("0.01") // minDistributionThreshold
    ], {
      kind: "uups",
    });
    
    // 7. 部署 RealEstateSystem
    const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
    system = await upgrades.deployProxy(RealEstateSystem, [
      roleManager.address,
      propertyManager.address,
      tradingManager.address,
      rewardManager.address
    ], {
      kind: "uups",
    });
    
    // 8. 部署 RealEstateFacade
    const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
    facade = await upgrades.deployProxy(RealEstateFacade, [
      system.address,
      roleManager.address,
      propertyManager.address,
      tradingManager.address,
      rewardManager.address
    ], {
      kind: "uups",
    });
    
    // 9. 设置系统合约地址
    await propertyManager.connect(admin).setSystemAddress(system.address);
    await tradingManager.connect(admin).setSystemAddress(system.address);
    await rewardManager.connect(admin).setSystemAddress(system.address);
    
    // 10. 设置Facade合约地址
    await propertyManager.connect(admin).setFacadeAddress(facade.address);
    await tradingManager.connect(admin).setFacadeAddress(facade.address);
    await rewardManager.connect(admin).setFacadeAddress(facade.address);
    
    // 11. 系统设置
    await system.connect(admin).setFacadeAddress(facade.address);
    
    // 12. 上线一个不动产
    await facade.connect(manager).listProperty(
      propertyId,
      tokenName,
      tokenSymbol,
      initialSupply,
      initialPrice,
      location,
      description
    );
    
    // 获取属性ID哈希
    const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
    
    // 获取代币地址
    const tokenAddress = await propertyManager.propertyTokens(propertyIdHash);
    propertyToken = await ethers.getContractAt("PropertyToken", tokenAddress);
    
    // 13. 管理员转移一些代币给投资者
    await propertyToken.connect(manager).transfer(investor1.address, ethers.utils.parseEther("1000"));
    await propertyToken.connect(manager).transfer(investor2.address, ethers.utils.parseEther("500"));
    
    // 14. 投资者创建代币销售订单
    const sellAmount = ethers.utils.parseEther("200");
    const sellPrice = ethers.utils.parseEther("0.15");
    
    // 投资者授权TradingManager转移代币
    await propertyToken.connect(investor1).approve(tradingManager.address, sellAmount);
    
    await facade.connect(investor1).createOrder(tokenAddress, sellAmount, sellPrice);
  });
  
  describe("系统紧急模式", function () {
    it("系统暂停应该阻止新交易", async function () {
      // 获取订单ID
      const [orderIds] = await facade.getUserOrders(investor1.address);
      const orderId = orderIds[0];
      
      // 系统管理员暂停系统
      await system.connect(admin).pause();
      
      // 验证系统状态
      expect(await system.getSystemStatus()).to.equal(2); // Paused
      
      // 尝试执行交易
      const totalCost = ethers.utils.parseEther("30"); // 200 * 0.15
      await expect(
        facade.connect(investor2).executeTrade(orderId, { value: totalCost })
      ).to.be.revertedWith("System not active");
    });
    
    it("系统恢复应该允许交易继续", async function () {
      // 获取订单ID
      const [orderIds] = await facade.getUserOrders(investor1.address);
      const orderId = orderIds[0];
      
      // 系统管理员暂停系统
      await system.connect(admin).pause();
      
      // 验证系统状态
      expect(await system.getSystemStatus()).to.equal(2); // Paused
      
      // 系统管理员恢复系统
      await system.connect(admin).unpause();
      
      // 验证系统状态
      expect(await system.getSystemStatus()).to.equal(1); // Active
      
      // 执行交易应该成功
      const totalCost = ethers.utils.parseEther("30"); // 200 * 0.15
      await expect(
        facade.connect(investor2).executeTrade(orderId, { value: totalCost })
      ).to.emit(facade, "TradeExecuted");
      
      // 验证代币已转移
      expect(await propertyToken.balanceOf(investor2.address)).to.equal(
        ethers.utils.parseEther("700") // 初始500 + 购买的200
      );
    });
  });
  
  describe("角色管理器紧急模式", function () {
    it("紧急模式应该阻止合约升级", async function () {
      // 激活紧急模式
      await roleManager.connect(admin).activateEmergencyMode();
      
      // 验证紧急模式已激活
      expect(await roleManager.emergencyMode()).to.be.true;
      expect(await roleManager.paused()).to.be.true;
      
      // 尝试升级RoleManager合约
      const RoleManagerV2 = await ethers.getContractFactory("RoleManager", admin);
      await expect(
        upgrades.upgradeProxy(roleManager.address, RoleManagerV2)
      ).to.be.revertedWith("Emergency mode active");
      
      // 尝试升级PropertyManager合约
      const PropertyManagerV2 = await ethers.getContractFactory("PropertyManager", admin);
      await expect(
        upgrades.upgradeProxy(propertyManager.address, PropertyManagerV2)
      ).to.be.revertedWith("Emergency mode active");
    });
    
    it("紧急模式还应该阻止交易和分配操作", async function () {
      // 获取订单ID
      const [orderIds] = await facade.getUserOrders(investor1.address);
      const orderId = orderIds[0];
      
      // 激活紧急模式
      await roleManager.connect(admin).activateEmergencyMode();
      
      // 尝试执行交易
      const totalCost = ethers.utils.parseEther("30"); // 200 * 0.15
      await expect(
        facade.connect(investor2).executeTrade(orderId, { value: totalCost })
      ).to.be.reverted; // 各种暂停检查都会导致失败
      
      // 获取属性ID哈希
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      
      // 尝试创建奖励分配
      const rewardAmount = ethers.utils.parseEther("100");
      await expect(
        facade.connect(manager).createDistribution(
          propertyIdHash,
          rewardAmount,
          "Monthly Dividend",
          { value: rewardAmount }
        )
      ).to.be.reverted;
    });
    
    it("应该能在解除紧急模式后恢复正常操作", async function () {
      // 获取订单ID
      const [orderIds] = await facade.getUserOrders(investor1.address);
      const orderId = orderIds[0];
      
      // 激活紧急模式
      await roleManager.connect(admin).activateEmergencyMode();
      
      // 解除紧急模式
      await roleManager.connect(admin).deactivateEmergencyMode();
      
      // 验证紧急模式已解除
      expect(await roleManager.emergencyMode()).to.be.false;
      expect(await roleManager.paused()).to.be.false;
      
      // 执行交易应该成功
      const totalCost = ethers.utils.parseEther("30"); // 200 * 0.15
      await expect(
        facade.connect(investor2).executeTrade(orderId, { value: totalCost })
      ).to.emit(facade, "TradeExecuted");
      
      // 验证代币已转移
      expect(await propertyToken.balanceOf(investor2.address)).to.equal(
        ethers.utils.parseEther("700") // 初始500 + 购买的200
      );
    });
  });
  
  describe("重大业务事件测试", function () {
    it("应该能在系统暂停时仍能退还用户资金（紧急提款）", async function () {
      // 投资者先转入一些资金到奖励管理器
      const depositAmount = ethers.utils.parseEther("5");
      await investor1.sendTransaction({
        to: rewardManager.address,
        value: depositAmount
      });
      
      // 获取初始余额
      const investor1InitialBalance = await investor1.getBalance();
      
      // 系统管理员暂停系统
      await system.connect(admin).pause();
      
      // 即使在系统暂停状态，应该能执行紧急提款
      const tx = await rewardManager.connect(admin).emergencyWithdraw(
        investor1.address,
        depositAmount
      );
      
      // 验证资金已返还
      const investor1FinalBalance = await investor1.getBalance();
      expect(investor1FinalBalance.sub(investor1InitialBalance)).to.equal(depositAmount);
    });
    
    it("场景：系统遭遇攻击后的完全恢复", async function () {
      // 1. 模拟攻击：激活紧急模式
      await roleManager.connect(admin).activateEmergencyMode();
      expect(await roleManager.emergencyMode()).to.be.true;
      
      // 2. 确认所有操作已暂停
      const [orderIds] = await facade.getUserOrders(investor1.address);
      const orderId = orderIds[0];
      
      const totalCost = ethers.utils.parseEther("30");
      await expect(
        facade.connect(investor2).executeTrade(orderId, { value: totalCost })
      ).to.be.reverted;
      
      // 3. 管理员进行紧急处理（这里可以是各种修复操作）
      
      // 4. 解除紧急模式
      await roleManager.connect(admin).deactivateEmergencyMode();
      expect(await roleManager.emergencyMode()).to.be.false;
      
      // 5. 验证系统恢复正常
      await expect(
        facade.connect(investor2).executeTrade(orderId, { value: totalCost })
      ).to.emit(facade, "TradeExecuted");
      
      // 6. 进行一些正常业务操作
      // 获取属性ID哈希
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      
      // 创建奖励分配
      const rewardAmount = ethers.utils.parseEther("100");
      await expect(
        facade.connect(manager).createDistribution(
          propertyIdHash,
          rewardAmount,
          "Recovery Bonus",
          { value: rewardAmount }
        )
      ).to.emit(facade, "DistributionCreated");
      
      // 验证分配创建成功
      const distributionInfo = await rewardManager.distributions(1);
      expect(distributionInfo.amount).to.equal(rewardAmount);
    });
  });
}); 