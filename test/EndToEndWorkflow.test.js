const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deploySystem } = require("./utils/testHelpers");

describe("端到端工作流测试", function () {
  let deployed;
  let owner, propertyManager, kycManager, user1, user2, user3, feeCollector;
  let system, roleManager, feeManager, kycManagerContract, propertyRegistry, tokenFactory;
  let redemptionManager, rentDistributor, marketplace, stablecoin;
  let propertyId, token, tokenAddress;

  beforeEach(async function () {
    deployed = await deploySystem();
    
    owner = deployed.owner;
    propertyManager = deployed.propertyManager;
    kycManager = deployed.kycManager;
    user1 = deployed.user1;
    user2 = deployed.user2;
    user3 = deployed.user3;
    feeCollector = deployed.feeCollector;
    
    system = deployed.system;
    roleManager = deployed.roleManager;
    feeManager = deployed.feeManager;
    kycManagerContract = deployed.kycManager;
    propertyRegistry = deployed.propertyRegistry;
    tokenFactory = deployed.tokenFactory;
    redemptionManager = deployed.redemptionManager;
    rentDistributor = deployed.rentDistributor;
    marketplace = deployed.marketplace;
    stablecoin = deployed.stablecoin;
  });

  it("应该能够完成房产通证化的完整生命周期", async function () {
    // 1. 房产管理员注册房产
    propertyId = "PROP-" + Date.now();
    const country = "Japan";
    const metadataURI = "https://metadata.example.com/property/" + propertyId;
    
    await propertyRegistry.connect(propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    // 2. 超级管理员审核房产
    await propertyRegistry.connect(owner).approveProperty(propertyId);
    
    // 3. KYC管理员验证用户
    await kycManagerContract.connect(kycManager).batchVerifyUsers([
      user1.address, user2.address, user3.address
    ]);
    
    // 4. 超级管理员创建房产代币
    const tokenName = "Tokyo Apartment";
    const tokenSymbol = "TKYO";
    const totalSupply = ethers.utils.parseEther("1000");
    
    const tx = await tokenFactory.connect(owner).createToken(
      propertyId, tokenName, tokenSymbol, totalSupply
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'TokenCreated');
    tokenAddress = event.args.tokenAddress;
    token = await ethers.getContractAt("RealEstateToken", tokenAddress);
    
    // 5. 超级管理员将用户添加到白名单
    await token.connect(owner).batchAddToWhitelist([
      user1.address, user2.address, user3.address
    ]);
    
    // 6. 超级管理员向投资者分发代币
    await token.connect(owner).transfer(user1.address, ethers.utils.parseEther("300"));
    await token.connect(owner).transfer(user2.address, ethers.utils.parseEther("200"));
    
    // 7. 投资者在二级市场上出售代币
    const tokenAmount = ethers.utils.parseEther("100");
    await token.connect(user1).approve(marketplace.address, tokenAmount);
    
    const price = ethers.utils.parseEther("150");
    const sellTx = await marketplace.connect(user1).createOrder(
      tokenAddress, tokenAmount, price, stablecoin.address
    );
    
    const sellReceipt = await sellTx.wait();
    const sellEvent = sellReceipt.events.find(e => e.event === 'OrderCreated');
    const orderId = sellEvent.args.orderId;
    
    // 8. 另一个投资者购买代币
    await stablecoin.connect(user3).approve(marketplace.address, price);
    await marketplace.connect(user3).fulfillOrder(orderId);
    
    // 验证交易结果
    expect(await token.balanceOf(user3.address)).to.equal(tokenAmount);
    
    // 9. 房产管理员分配租金
    const rentAmount = ethers.utils.parseEther("500");
    await stablecoin.connect(owner).approve(rentDistributor.address, rentAmount);
    
    const rentTx = await rentDistributor.connect(propertyManager).createDistribution(
      propertyId, tokenAddress, stablecoin.address, rentAmount
    );
    
    const rentReceipt = await rentTx.wait();
    const rentEvent = rentReceipt.events.find(e => e.event === 'RentDistributionCreated');
    const distributionId = rentEvent.args.distributionId;
    
    // 10. 超级管理员处理租金分配
    await rentDistributor.connect(owner).processDistribution(distributionId);
    
    // 11. 投资者领取租金
    await rentDistributor.connect(user1).claimRent(distributionId);
    await rentDistributor.connect(user2).claimRent(distributionId);
    await rentDistributor.connect(user3).claimRent(distributionId);
    
    // 12. 投资者请求赎回代币
    const redemptionAmount = ethers.utils.parseEther("50");
    await token.connect(user2).approve(redemptionManager.address, redemptionAmount);
    
    const redemptionTx = await redemptionManager.connect(user2).requestRedemption(
      propertyId, tokenAddress, redemptionAmount, stablecoin.address
    );
    
    const redemptionReceipt = await redemptionTx.wait();
    const redemptionEvent = redemptionReceipt.events.find(e => e.event === 'RedemptionRequested');
    const requestId = redemptionEvent.args.requestId;
    
    // 13. 超级管理员批准赎回请求
    await redemptionManager.connect(owner).approveRedemption(requestId);
    
    // 14. 超级管理员完成赎回
    const payoutAmount = ethers.utils.parseEther("75");
    await stablecoin.connect(owner).approve(redemptionManager.address, payoutAmount);
    
    await redemptionManager.connect(owner).completeRedemption(
      requestId, tokenAddress, payoutAmount
    );
    
    // 验证赎回结果
    expect(await token.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("150"));
    
    // 15. 超级管理员下架房产
    await propertyRegistry.connect(owner).delistProperty(propertyId);
    
    const property = await propertyRegistry.properties(propertyId);
    expect(property.status).to.equal(5); // Delisted
  });
});