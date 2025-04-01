const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("RealEstateFacade", function () {
  let system;
  let roleManager;
  let propertyManager;
  let propertyToken;
  let tradingManager;
  let rewardManager;
  let facade;
  let owner;
  let manager;
  let user1;
  let user2;
  
  beforeEach(async function () {
    [owner, manager, user1, user2] = await ethers.getSigners();
    
    // 部署 RoleManager
    const RoleManager = await ethers.getContractFactory("RoleManager");
    roleManager = await upgrades.deployProxy(RoleManager, [], {
      kind: "uups",
    });
    
    // 部署 PropertyManager
    const PropertyManager = await ethers.getContractFactory("PropertyManager");
    propertyManager = await upgrades.deployProxy(PropertyManager, [], {
      kind: "uups",
    });
    
    // 部署 PropertyToken
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    propertyToken = await upgrades.deployProxy(PropertyToken, [], {
      kind: "uups",
    });
    
    // 部署 TradingManager
    const TradingManager = await ethers.getContractFactory("TradingManager");
    tradingManager = await upgrades.deployProxy(TradingManager, [], {
      kind: "uups",
    });
    
    // 部署 RewardManager
    const RewardManager = await ethers.getContractFactory("RewardManager");
    rewardManager = await upgrades.deployProxy(RewardManager, [], {
      kind: "uups",
    });
    
    // 部署 RealEstateSystem
    const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
    system = await upgrades.deployProxy(
      RealEstateSystem,
      [
        roleManager.address,
        propertyManager.address,
        propertyToken.address,
        tradingManager.address,
        rewardManager.address,
      ],
      {
        kind: "uups",
      }
    );
    
    // 部署 RealEstateFacade
    const RealEstateFacade = await ethers.getContractFactory("RealEstateFacade");
    facade = await upgrades.deployProxy(
      RealEstateFacade,
      [
        system.address,
        roleManager.address,
        propertyManager.address,
        propertyToken.address,
        tradingManager.address,
        rewardManager.address,
      ],
      {
        kind: "uups",
      }
    );
    
    // 设置权限
    await roleManager.grantRole(await roleManager.ADMIN_ROLE(), owner.address);
    await roleManager.grantRole(await roleManager.MANAGER_ROLE(), manager.address);
    
    // 设置系统合约地址
    await system.setSystemAddress(system.address);
    await system.setFacadeAddress(facade.address);
    
    // 设置各个组件的系统合约地址
    await propertyManager.setSystemAddress(system.address);
    await tradingManager.setSystemAddress(system.address);
    await rewardManager.setSystemAddress(system.address);
    
    // 设置各个组件的门面合约地址
    await propertyManager.setFacadeAddress(facade.address);
    await tradingManager.setFacadeAddress(facade.address);
    await rewardManager.setFacadeAddress(facade.address);
  });
  
  describe("房产上架流程", function () {
    it("应该成功上架房产并创建代币", async function () {
      const propertyId = "PROP001";
      const name = "Test Property";
      const symbol = "TEST";
      const initialSupply = ethers.utils.parseEther("1000");
      const initialPrice = ethers.utils.parseEther("1");
      const location = "Tokyo";
      const description = "Test property description";
      
      await expect(
        facade.connect(manager).listProperty(
          propertyId,
          name,
          symbol,
          initialSupply,
          initialPrice,
          location,
          description
        )
      ).to.emit(facade, "PropertyListed");
      
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      const tokenAddress = await propertyManager.propertyTokens(propertyIdHash);
      
      expect(tokenAddress).to.not.equal(ethers.constants.AddressZero);
      
      const token = await ethers.getContractAt("PropertyToken", tokenAddress);
      expect(await token.name()).to.equal(name);
      expect(await token.symbol()).to.equal(symbol);
      expect(await token.totalSupply()).to.equal(initialSupply);
    });
  });
  
  describe("交易流程", function () {
    let propertyId;
    let tokenAddress;
    
    beforeEach(async function () {
      propertyId = "PROP001";
      const name = "Test Property";
      const symbol = "TEST";
      const initialSupply = ethers.utils.parseEther("1000");
      const initialPrice = ethers.utils.parseEther("1");
      const location = "Tokyo";
      const description = "Test property description";
      
      await facade.connect(manager).listProperty(
        propertyId,
        name,
        symbol,
        initialSupply,
        initialPrice,
        location,
        description
      );
      
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      tokenAddress = await propertyManager.propertyTokens(propertyIdHash);
      
      // 转移一些代币给用户
      const token = await ethers.getContractAt("PropertyToken", tokenAddress);
      await token.transfer(user1.address, ethers.utils.parseEther("100"));
    });
    
    it("应该成功创建卖单", async function () {
      const amount = ethers.utils.parseEther("10");
      const price = ethers.utils.parseEther("1");
      
      await expect(
        facade.connect(user1).createOrder(tokenAddress, amount, price)
      ).to.emit(facade, "OrderCreated");
      
      const [orderIds] = await facade.getUserOrders(user1.address);
      expect(orderIds.length).to.equal(1);
    });
    
    it("应该成功取消卖单", async function () {
      const amount = ethers.utils.parseEther("10");
      const price = ethers.utils.parseEther("1");
      
      await facade.connect(user1).createOrder(tokenAddress, amount, price);
      const [orderIds] = await facade.getUserOrders(user1.address);
      
      await expect(
        facade.connect(user1).cancelOrder(orderIds[0])
      ).to.emit(facade, "OrderCancelled");
      
      const [updatedOrderIds] = await facade.getUserOrders(user1.address);
      expect(updatedOrderIds.length).to.equal(0);
    });
    
    it("应该成功执行交易", async function () {
      const amount = ethers.utils.parseEther("10");
      const price = ethers.utils.parseEther("1");
      
      await facade.connect(user1).createOrder(tokenAddress, amount, price);
      const [orderIds] = await facade.getUserOrders(user1.address);
      
      await expect(
        facade.connect(user2).executeTrade(orderIds[0], { value: price.mul(amount) })
      ).to.emit(facade, "TradeExecuted");
      
      const token = await ethers.getContractAt("PropertyToken", tokenAddress);
      expect(await token.balanceOf(user2.address)).to.equal(amount);
    });
  });
  
  describe("奖励流程", function () {
    let propertyId;
    let tokenAddress;
    
    beforeEach(async function () {
      propertyId = "PROP001";
      const name = "Test Property";
      const symbol = "TEST";
      const initialSupply = ethers.utils.parseEther("1000");
      const initialPrice = ethers.utils.parseEther("1");
      const location = "Tokyo";
      const description = "Test property description";
      
      await facade.connect(manager).listProperty(
        propertyId,
        name,
        symbol,
        initialSupply,
        initialPrice,
        location,
        description
      );
      
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      tokenAddress = await propertyManager.propertyTokens(propertyIdHash);
      
      // 转移一些代币给用户
      const token = await ethers.getContractAt("PropertyToken", tokenAddress);
      await token.transfer(user1.address, ethers.utils.parseEther("100"));
    });
    
    it("应该成功创建奖励分配", async function () {
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      const amount = ethers.utils.parseEther("100");
      const description = "Test distribution";
      
      await expect(
        facade.connect(manager).createDistribution(
          propertyIdHash,
          amount,
          description,
          true,
          ethers.constants.AddressZero
        )
      ).to.emit(facade, "DistributionCreated");
    });
    
    it("应该成功领取奖励", async function () {
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      const amount = ethers.utils.parseEther("100");
      const description = "Test distribution";
      
      await facade.connect(manager).createDistribution(
        propertyIdHash,
        amount,
        description,
        true,
        ethers.constants.AddressZero
      );
      
      const [distributionIds] = await facade.getUserRewards(user1.address);
      
      await expect(
        facade.connect(user1).claimRewards(distributionIds[0])
      ).to.emit(facade, "RewardsClaimed");
    });
  });
  
  describe("房产管理", function () {
    let propertyId;
    let propertyIdHash;
    
    beforeEach(async function () {
      propertyId = "PROP001";
      const name = "Test Property";
      const symbol = "TEST";
      const initialSupply = ethers.utils.parseEther("1000");
      const initialPrice = ethers.utils.parseEther("1");
      const location = "Tokyo";
      const description = "Test property description";
      
      await facade.connect(manager).listProperty(
        propertyId,
        name,
        symbol,
        initialSupply,
        initialPrice,
        location,
        description
      );
      
      propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
    });
    
    it("应该成功更新房产状态", async function () {
      await expect(
        facade.connect(manager).updatePropertyStatus(
          propertyIdHash,
          1 // PropertyStatus.Suspended
        )
      ).to.emit(facade, "PropertyStatusUpdated");
    });
    
    it("应该成功更新房产估值", async function () {
      const newValue = ethers.utils.parseEther("2");
      
      await expect(
        facade.connect(manager).updatePropertyValuation(
          propertyIdHash,
          newValue,
          "Price update"
        )
      ).to.emit(facade, "PropertyValuationUpdated");
    });
  });
  
  describe("用户资产管理", function () {
    let propertyId;
    let tokenAddress;
    
    beforeEach(async function () {
      propertyId = "PROP001";
      const name = "Test Property";
      const symbol = "TEST";
      const initialSupply = ethers.utils.parseEther("1000");
      const initialPrice = ethers.utils.parseEther("1");
      const location = "Tokyo";
      const description = "Test property description";
      
      await facade.connect(manager).listProperty(
        propertyId,
        name,
        symbol,
        initialSupply,
        initialPrice,
        location,
        description
      );
      
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      tokenAddress = await propertyManager.propertyTokens(propertyIdHash);
      
      // 转移一些代币给用户
      const token = await ethers.getContractAt("PropertyToken", tokenAddress);
      await token.transfer(user1.address, ethers.utils.parseEther("100"));
    });
    
    it("应该正确返回用户资产概览", async function () {
      const overview = await facade.getUserAssetOverview(user1.address);
      
      expect(overview.totalProperties).to.equal(1);
      expect(overview.totalTokens).to.equal(1);
      expect(overview.totalValue).to.be.gt(0);
      expect(overview.pendingRewards).to.equal(0);
    });
  });
  
  describe("错误情况测试", function () {
    let propertyId;
    let tokenAddress;
    
    beforeEach(async function () {
      propertyId = "PROP001";
      const name = "Test Property";
      const symbol = "TEST";
      const initialSupply = ethers.utils.parseEther("1000");
      const initialPrice = ethers.utils.parseEther("1");
      const location = "Tokyo";
      const description = "Test property description";
      
      await facade.connect(manager).listProperty(
        propertyId,
        name,
        symbol,
        initialSupply,
        initialPrice,
        location,
        description
      );
      
      const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
      tokenAddress = await propertyManager.propertyTokens(propertyIdHash);
      
      // 转移一些代币给用户
      const token = await ethers.getContractAt("PropertyToken", tokenAddress);
      await token.transfer(user1.address, ethers.utils.parseEther("100"));
    });
    
    describe("权限错误", function () {
      it("非管理员不能上架房产", async function () {
        const propertyId = "PROP002";
        const name = "Test Property 2";
        const symbol = "TEST2";
        const initialSupply = ethers.utils.parseEther("1000");
        const initialPrice = ethers.utils.parseEther("1");
        const location = "Tokyo";
        const description = "Test property description";
        
        await expect(
          facade.connect(user1).listProperty(
            propertyId,
            name,
            symbol,
            initialSupply,
            initialPrice,
            location,
            description
          )
        ).to.be.revertedWith("AccessControl: account");
      });
      
      it("非管理员不能创建奖励分配", async function () {
        const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
        const amount = ethers.utils.parseEther("100");
        const description = "Test distribution";
        
        await expect(
          facade.connect(user1).createDistribution(
            propertyIdHash,
            amount,
            description,
            true,
            ethers.constants.AddressZero
          )
        ).to.be.revertedWith("AccessControl: account");
      });
      
      it("非管理员不能更新房产状态", async function () {
        const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
        
        await expect(
          facade.connect(user1).updatePropertyStatus(
            propertyIdHash,
            1 // PropertyStatus.Suspended
          )
        ).to.be.revertedWith("AccessControl: account");
      });
    });
    
    describe("业务逻辑错误", function () {
      it("不能创建余额不足的卖单", async function () {
        const amount = ethers.utils.parseEther("1000"); // 超过用户余额
        const price = ethers.utils.parseEther("1");
        
        await expect(
          facade.connect(user1).createOrder(tokenAddress, amount, price)
        ).to.be.revertedWith("Insufficient balance");
      });
      
      it("不能取消不存在的订单", async function () {
        await expect(
          facade.connect(user1).cancelOrder(999)
        ).to.be.revertedWith("Order not found");
      });
      
      it("不能取消他人的订单", async function () {
        const amount = ethers.utils.parseEther("10");
        const price = ethers.utils.parseEther("1");
        
        await facade.connect(user1).createOrder(tokenAddress, amount, price);
        const [orderIds] = await facade.getUserOrders(user1.address);
        
        await expect(
          facade.connect(user2).cancelOrder(orderIds[0])
        ).to.be.revertedWith("Not order owner");
      });
      
      it("不能执行已取消的订单", async function () {
        const amount = ethers.utils.parseEther("10");
        const price = ethers.utils.parseEther("1");
        
        await facade.connect(user1).createOrder(tokenAddress, amount, price);
        const [orderIds] = await facade.getUserOrders(user1.address);
        
        await facade.connect(user1).cancelOrder(orderIds[0]);
        
        await expect(
          facade.connect(user2).executeTrade(orderIds[0], { value: price.mul(amount) })
        ).to.be.revertedWith("Order not active");
      });
      
      it("不能领取不存在的奖励", async function () {
        await expect(
          facade.connect(user1).claimRewards(999)
        ).to.be.revertedWith("Distribution not found");
      });
      
      it("不能重复领取奖励", async function () {
        const propertyIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propertyId));
        const amount = ethers.utils.parseEther("100");
        const description = "Test distribution";
        
        await facade.connect(manager).createDistribution(
          propertyIdHash,
          amount,
          description,
          true,
          ethers.constants.AddressZero
        );
        
        const [distributionIds] = await facade.getUserRewards(user1.address);
        
        await facade.connect(user1).claimRewards(distributionIds[0]);
        
        await expect(
          facade.connect(user1).claimRewards(distributionIds[0])
        ).to.be.revertedWith("Already claimed");
      });
    });
    
    describe("系统状态错误", function () {
      it("系统暂停时不能执行操作", async function () {
        await system.pause();
        
        const amount = ethers.utils.parseEther("10");
        const price = ethers.utils.parseEther("1");
        
        await expect(
          facade.connect(user1).createOrder(tokenAddress, amount, price)
        ).to.be.revertedWith("Pausable: paused");
      });
      
      it("系统不活跃时不能执行操作", async function () {
        await system.setSystemStatus(0); // SystemStatus.Inactive
        
        const amount = ethers.utils.parseEther("10");
        const price = ethers.utils.parseEther("1");
        
        await expect(
          facade.connect(user1).createOrder(tokenAddress, amount, price)
        ).to.be.revertedWith("System not active");
      });
    });
  });
}); 