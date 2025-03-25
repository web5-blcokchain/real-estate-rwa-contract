const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("房产资产端到端流程测试", function() {
  // 测试参与者
  let deployer;         // 系统部署者/超级管理员
  let propertyManager;  // 房产管理员
  let feeCollector;     // 费用收集者
  let investor1;        // 投资者1
  let investor2;        // 投资者2
  let propertyOwner;    // 房产所有者

  // 系统合约
  let roleManager;
  let feeManager;
  let propertyRegistry;
  let tokenFactory;
  let realEstateToken;
  let redemptionManager;
  let rentDistributor;
  let marketplace;
  let tokenHolderQuery;
  let realEstateSystem;
  
  // 测试用房产ID
  const PROPERTY_ID = "1";
  
  // 测试用代币参数
  const TOKEN_NAME = "Japan Property Token";
  const TOKEN_SYMBOL = "JPT";
  const TOKEN_DECIMALS = 18;
  const TOKEN_MAX_SUPPLY = ethers.utils.parseEther("1000");
  const TOKEN_INITIAL_SUPPLY = ethers.utils.parseEther("1000");
  
  // 测试用稳定币（模拟）
  let stablecoin;
  
  // 用于租金发放的时间
  const RENT_AMOUNT = ethers.utils.parseEther("50");
  
  // 用于赎回的参数
  const REDEMPTION_AMOUNT = ethers.utils.parseEther("500");
  const REDEMPTION_STABLECOIN_AMOUNT = ethers.utils.parseEther("550");
  
  before(async function() {
    // 获取测试账户
    [deployer, propertyManager, feeCollector, investor1, investor2, propertyOwner] = await ethers.getSigners();
    
    // 部署模拟稳定币
    const StableCoin = await ethers.getContractFactory("MockERC20", deployer);
    stablecoin = await StableCoin.deploy("Test USD", "USDT", 18);
    
    // 为投资者和房产所有者铸造稳定币
    await stablecoin.mint(investor1.address, ethers.utils.parseEther("10000"));
    await stablecoin.mint(investor2.address, ethers.utils.parseEther("10000"));
    await stablecoin.mint(propertyManager.address, ethers.utils.parseEther("10000"));
  });
  
  describe("1. 系统部署", function() {
    it("部署所有系统合约", async function() {
      // 部署角色管理合约
      const RoleManager = await ethers.getContractFactory("RoleManager", deployer);
      roleManager = await upgrades.deployProxy(RoleManager, []);
      
      // 部署费用管理合约
      const FeeManager = await ethers.getContractFactory("FeeManager", deployer);
      feeManager = await upgrades.deployProxy(FeeManager, [roleManager.address]);
      
      // 部署房产注册合约
      const PropertyRegistry = await ethers.getContractFactory("PropertyRegistry", deployer);
      propertyRegistry = await upgrades.deployProxy(PropertyRegistry, [roleManager.address]);
      
      // 部署租金分发合约
      const RentDistributor = await ethers.getContractFactory("RentDistributor", deployer);
      rentDistributor = await upgrades.deployProxy(RentDistributor, [roleManager.address, feeManager.address]);
      
      // 部署代币实现合约
      const RealEstateToken = await ethers.getContractFactory("RealEstateToken", deployer);
      const tokenImplementation = await RealEstateToken.deploy();
      
      // 部署代币工厂合约
      const TokenFactory = await ethers.getContractFactory("TokenFactory", deployer);
      tokenFactory = await upgrades.deployProxy(TokenFactory, [
        roleManager.address,
        propertyRegistry.address,
        tokenImplementation.address,
        rentDistributor.address
      ]);
      
      // 部署赎回管理合约
      const RedemptionManager = await ethers.getContractFactory("RedemptionManager", deployer);
      redemptionManager = await upgrades.deployProxy(RedemptionManager, [
        roleManager.address,
        feeManager.address,
        propertyRegistry.address
      ]);
      
      // 部署市场合约
      const Marketplace = await ethers.getContractFactory("Marketplace", deployer);
      marketplace = await upgrades.deployProxy(Marketplace, [
        roleManager.address,
        feeManager.address
      ]);
      
      // 部署代币持有者查询合约
      const TokenHolderQuery = await ethers.getContractFactory("TokenHolderQuery", deployer);
      tokenHolderQuery = await upgrades.deployProxy(TokenHolderQuery, [roleManager.address]);
      
      // 部署房产系统合约
      const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem", deployer);
      realEstateSystem = await upgrades.deployProxy(RealEstateSystem, [
        roleManager.address,
        feeManager.address,
        propertyRegistry.address,
        tokenFactory.address,
        redemptionManager.address,
        rentDistributor.address,
        marketplace.address,
        tokenHolderQuery.address
      ]);
      
      // 验证系统合约部署成功
      expect(await realEstateSystem.getSystemContracts()).to.deep.equal([
        roleManager.address,
        feeManager.address,
        propertyRegistry.address,
        tokenFactory.address,
        redemptionManager.address,
        rentDistributor.address,
        marketplace.address,
        tokenHolderQuery.address
      ]);
    });
    
    it("设置角色权限", async function() {
      // 获取角色常量
      const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
      const PROPERTY_MANAGER_ROLE = await roleManager.PROPERTY_MANAGER();
      const FEE_COLLECTOR_ROLE = await roleManager.FEE_COLLECTOR();
      
      // 授予角色
      await roleManager.grantRole(SUPER_ADMIN, deployer.address);
      await roleManager.grantRole(PROPERTY_MANAGER_ROLE, propertyManager.address);
      await roleManager.grantRole(FEE_COLLECTOR_ROLE, feeCollector.address);
      
      // 设置费用收集者
      await feeManager.updateFeeCollector(feeCollector.address);
      
      // 添加稳定币支持
      await redemptionManager.connect(deployer).addSupportedStablecoin(stablecoin.address);
      
      // 验证角色设置成功
      expect(await roleManager.hasRole(SUPER_ADMIN, deployer.address)).to.be.true;
      expect(await roleManager.hasRole(PROPERTY_MANAGER_ROLE, propertyManager.address)).to.be.true;
      expect(await roleManager.hasRole(FEE_COLLECTOR_ROLE, feeCollector.address)).to.be.true;
      expect(await feeManager.feeCollector()).to.equal(feeCollector.address);
      expect(await redemptionManager.supportedStablecoins(stablecoin.address)).to.be.true;
    });
  });
  
  describe("2. 房产注册和代币发行", function() {
    it("注册房产", async function() {
      // 准备房产数据
      const metadataURI = "ipfs://QmPropertyMetadata123456789";
      const country = "Japan";
      
      // 注册房产
      await propertyRegistry.connect(propertyManager).registerProperty(
        PROPERTY_ID,
        country,
        metadataURI
      );
      
      // 验证房产状态为待批准
      const status = await propertyRegistry.getPropertyStatus(PROPERTY_ID);
      expect(status).to.equal(1); // Pending
    });
    
    it("批准房产", async function() {
      // 批准房产
      await propertyRegistry.connect(propertyManager).approveProperty(PROPERTY_ID);
      
      // 验证房产状态为已批准
      const status = await propertyRegistry.getPropertyStatus(PROPERTY_ID);
      expect(status).to.equal(2); // Approved
    });
    
    it("创建房产代币", async function() {
      // 创建代币
      const tx = await tokenFactory.connect(propertyManager).createToken(
        PROPERTY_ID,
        TOKEN_NAME,
        TOKEN_SYMBOL,
        TOKEN_DECIMALS,
        TOKEN_MAX_SUPPLY,
        TOKEN_INITIAL_SUPPLY,
        propertyOwner.address
      );
      
      // 从事件中获取代币地址
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TokenCreated');
      const tokenAddress = event.args.tokenAddress;
      
      // 获取代币实例
      realEstateToken = await ethers.getContractAt("RealEstateToken", tokenAddress);
      
      // 验证代币创建成功
      expect(await realEstateToken.name()).to.equal(TOKEN_NAME);
      expect(await realEstateToken.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await realEstateToken.decimals()).to.equal(TOKEN_DECIMALS);
      expect(await realEstateToken.maxSupply()).to.equal(TOKEN_MAX_SUPPLY);
      expect(await realEstateToken.totalSupply()).to.equal(TOKEN_INITIAL_SUPPLY);
      expect(await realEstateToken.balanceOf(propertyOwner.address)).to.equal(TOKEN_INITIAL_SUPPLY);
      
      // 验证代币与房产关联
      expect(await tokenFactory.RealEstateTokens(PROPERTY_ID)).to.equal(tokenAddress);
    });
    
    it("将投资者加入白名单", async function() {
      // 将投资者添加到白名单
      await realEstateToken.connect(propertyManager).addToWhitelist(investor1.address);
      await realEstateToken.connect(propertyManager).addToWhitelist(investor2.address);
      
      // 验证投资者已在白名单中
      expect(await realEstateToken.isWhitelisted(investor1.address)).to.be.true;
      expect(await realEstateToken.isWhitelisted(investor2.address)).to.be.true;
    });
  });
  
  describe("3. 市场和投资者交互", function() {
    it("房产所有者上架代币", async function() {
      // 设置代币授权给市场合约
      await realEstateToken.connect(propertyOwner).approve(marketplace.address, ethers.utils.parseEther("600"));
      
      // 上架代币
      const listingPrice = ethers.utils.parseEther("1.1"); // 每代币1.1 USDT
      const listingAmount = ethers.utils.parseEther("600"); // 上架600个代币
      
      await marketplace.connect(propertyOwner).listToken(
        realEstateToken.address,
        listingPrice,
        listingAmount,
        stablecoin.address
      );
      
      // 验证上架成功
      const listing = await marketplace.getTokenListing(realEstateToken.address);
      expect(listing.token).to.equal(realEstateToken.address);
      expect(listing.price).to.equal(listingPrice);
      expect(listing.amount).to.equal(listingAmount);
      expect(listing.paymentToken).to.equal(stablecoin.address);
      expect(listing.seller).to.equal(propertyOwner.address);
    });
    
    it("投资者1购买代币", async function() {
      // 投资者向市场合约授权稳定币
      const purchaseAmount = ethers.utils.parseEther("300");
      const purchasePrice = ethers.utils.parseEther("1.1");
      const totalCost = purchaseAmount.mul(purchasePrice).div(ethers.utils.parseEther("1"));
      
      await stablecoin.connect(investor1).approve(marketplace.address, totalCost);
      
      // 购买代币
      await marketplace.connect(investor1).buyToken(
        realEstateToken.address,
        purchaseAmount
      );
      
      // 验证购买成功
      expect(await realEstateToken.balanceOf(investor1.address)).to.equal(purchaseAmount);
      
      // 验证卖家收到资金（减去手续费）
      const tradingFee = await feeManager.tradingFee();
      const feeAmount = totalCost.mul(tradingFee).div(10000);
      const sellerAmount = totalCost.sub(feeAmount);
      
      // 由于合约实际上可能将费用直接从交易金额中扣除
      // 我们验证卖家收到的金额应该大约为预期值（考虑到四舍五入误差）
      const balanceAfter = await stablecoin.balanceOf(propertyOwner.address);
      expect(balanceAfter).to.be.closeTo(sellerAmount, ethers.utils.parseEther("0.01"));
    });
    
    it("投资者2购买代币", async function() {
      // 投资者向市场合约授权稳定币
      const purchaseAmount = ethers.utils.parseEther("200");
      const purchasePrice = ethers.utils.parseEther("1.1");
      const totalCost = purchaseAmount.mul(purchasePrice).div(ethers.utils.parseEther("1"));
      
      await stablecoin.connect(investor2).approve(marketplace.address, totalCost);
      
      // 购买代币
      await marketplace.connect(investor2).buyToken(
        realEstateToken.address,
        purchaseAmount
      );
      
      // 验证购买成功
      expect(await realEstateToken.balanceOf(investor2.address)).to.equal(purchaseAmount);
    });
  });
  
  describe("4. 租金发放", function() {
    it("房产管理员发放租金", async function() {
      // 房产管理员向租金合约发送稳定币
      await stablecoin.connect(propertyManager).approve(rentDistributor.address, RENT_AMOUNT);
      
      // 分发租金
      await rentDistributor.connect(propertyManager).distributeRent(
        realEstateToken.address,
        stablecoin.address,
        RENT_AMOUNT
      );
      
      // 验证租金分发记录
      const distributionId = 1; // 第一次分发
      const distribution = await rentDistributor.rentDistributions(distributionId);
      
      expect(distribution.token).to.equal(realEstateToken.address);
      expect(distribution.paymentToken).to.equal(stablecoin.address);
      expect(distribution.amount).to.equal(RENT_AMOUNT);
    });
    
    it("投资者1领取租金", async function() {
      // 计算投资者1应得的租金
      const investor1Balance = await realEstateToken.balanceOf(investor1.address);
      const totalSupply = await realEstateToken.totalSupply();
      const expectedRent = RENT_AMOUNT.mul(investor1Balance).div(totalSupply);
      
      // 记录领取前的余额
      const balanceBefore = await stablecoin.balanceOf(investor1.address);
      
      // 投资者1领取租金
      const distributionId = 1; // 第一次分发
      await rentDistributor.connect(investor1).claimRent(distributionId);
      
      // 验证租金已领取
      const balanceAfter = await stablecoin.balanceOf(investor1.address);
      expect(balanceAfter.sub(balanceBefore)).to.be.closeTo(expectedRent, ethers.utils.parseEther("0.01"));
    });
    
    it("投资者2领取租金", async function() {
      // 计算投资者2应得的租金
      const investor2Balance = await realEstateToken.balanceOf(investor2.address);
      const totalSupply = await realEstateToken.totalSupply();
      const expectedRent = RENT_AMOUNT.mul(investor2Balance).div(totalSupply);
      
      // 记录领取前的余额
      const balanceBefore = await stablecoin.balanceOf(investor2.address);
      
      // 投资者2领取租金
      const distributionId = 1; // 第一次分发
      await rentDistributor.connect(investor2).claimRent(distributionId);
      
      // 验证租金已领取
      const balanceAfter = await stablecoin.balanceOf(investor2.address);
      expect(balanceAfter.sub(balanceBefore)).to.be.closeTo(expectedRent, ethers.utils.parseEther("0.01"));
    });
  });
  
  describe("5. 房产赎回", function() {
    it("投资者1请求赎回", async function() {
      // 投资者1授权代币给赎回管理器
      await realEstateToken.connect(investor1).approve(redemptionManager.address, REDEMPTION_AMOUNT);
      
      // 请求赎回
      await redemptionManager.connect(investor1).requestRedemption(
        PROPERTY_ID,
        realEstateToken.address,
        REDEMPTION_AMOUNT,
        stablecoin.address
      );
      
      // 验证赎回请求状态
      const requestId = 1; // 第一个赎回请求
      const request = await redemptionManager.redemptionRequests(requestId);
      
      expect(request.requester).to.equal(investor1.address);
      expect(request.tokenAddress).to.equal(realEstateToken.address);
      expect(request.tokenAmount).to.equal(REDEMPTION_AMOUNT);
      expect(request.status).to.equal(0); // Pending
      
      // 验证房产状态改变为赎回中
      const propertyStatus = await propertyRegistry.getPropertyStatus(PROPERTY_ID);
      expect(propertyStatus).to.equal(5); // Redemption
    });
    
    it("房产管理员批准赎回请求", async function() {
      // 批准赎回请求
      const requestId = 1; // 第一个赎回请求
      await redemptionManager.connect(propertyManager).approveRedemption(
        requestId,
        REDEMPTION_STABLECOIN_AMOUNT
      );
      
      // 验证赎回请求状态
      const request = await redemptionManager.redemptionRequests(requestId);
      expect(request.status).to.equal(1); // Approved
      expect(request.stablecoinAmount).to.equal(REDEMPTION_STABLECOIN_AMOUNT);
    });
    
    it("房产管理员完成赎回", async function() {
      // 房产管理员授权稳定币
      await stablecoin.connect(propertyManager).approve(redemptionManager.address, REDEMPTION_STABLECOIN_AMOUNT);
      
      // 记录赎回前的余额
      const balanceBefore = await stablecoin.balanceOf(investor1.address);
      const investor1TokenBalance = await realEstateToken.balanceOf(investor1.address);
      
      // 完成赎回
      const requestId = 1; // 第一个赎回请求
      await redemptionManager.connect(propertyManager).completeRedemption(requestId);
      
      // 验证赎回请求状态
      const request = await redemptionManager.redemptionRequests(requestId);
      expect(request.status).to.equal(3); // Completed
      
      // 验证投资者收到稳定币
      const balanceAfter = await stablecoin.balanceOf(investor1.address);
      
      // 计算赎回费用 (赎回费为1%)
      const redemptionFee = REDEMPTION_STABLECOIN_AMOUNT.mul(10).div(1000); // 1%
      const expectedAmount = REDEMPTION_STABLECOIN_AMOUNT.sub(redemptionFee);
      
      expect(balanceAfter.sub(balanceBefore)).to.be.closeTo(expectedAmount, ethers.utils.parseEther("0.01"));
      
      // 验证代币已被销毁
      const newTokenBalance = await realEstateToken.balanceOf(investor1.address);
      expect(investor1TokenBalance.sub(newTokenBalance)).to.equal(REDEMPTION_AMOUNT);
      
      // 验证房产状态恢复为已批准
      const propertyStatus = await propertyRegistry.getPropertyStatus(PROPERTY_ID);
      expect(propertyStatus).to.equal(2); // Approved
    });
  });
  
  describe("6. 查询系统状态", function() {
    it("查询代币持有者信息", async function() {
      // 使用TokenHolderQuery查询持有者信息
      const tokenHolders = await tokenHolderQuery.getTokenHolders(realEstateToken.address);
      
      // 验证结果包含预期的持有者
      expect(tokenHolders).to.include(investor1.address);
      expect(tokenHolders).to.include(investor2.address);
      expect(tokenHolders).to.include(propertyOwner.address);
    });
    
    it("查询代币持有者余额", async function() {
      // 验证投资者1余额（减去赎回金额）
      const investor1Expected = ethers.utils.parseEther("300").sub(REDEMPTION_AMOUNT);
      expect(await realEstateToken.balanceOf(investor1.address)).to.equal(investor1Expected);
      
      // 验证投资者2余额
      expect(await realEstateToken.balanceOf(investor2.address)).to.equal(ethers.utils.parseEther("200"));
    });
    
    it("查询系统状态", async function() {
      // 验证系统活跃状态
      expect(await realEstateSystem.systemActive()).to.be.true;
      
      // 获取系统合约信息
      const systemContracts = await realEstateSystem.getSystemContracts();
      expect(systemContracts[0]).to.equal(roleManager.address);
      expect(systemContracts[1]).to.equal(feeManager.address);
      expect(systemContracts[2]).to.equal(propertyRegistry.address);
    });
  });
}); 