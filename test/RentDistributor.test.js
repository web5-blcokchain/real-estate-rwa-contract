const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
  deploySystem, 
  registerAndApproveProperty, 
  createPropertyToken,
  verifyUsers,
  addUsersToWhitelist,
  distributeTokens
} = require("./utils/testHelpers");

describe("租金分配测试", function () {
  let owner, user1, user2, propertyManager, feeCollector;
  let rentDistributor, feeManager;
  let token, tokenAddress, propertyId;
  let stablecoin;
  let distributionId;

  beforeEach(async function () {
    const deployed = await deploySystem();
    owner = deployed.owner;
    user1 = deployed.user1;
    user2 = deployed.user2;
    propertyManager = deployed.propertyManager;
    feeCollector = deployed.feeCollector;
    rentDistributor = deployed.rentDistributor;
    feeManager = deployed.feeManager;
    stablecoin = deployed.stablecoin;
    
    // 注册并审核房产
    propertyId = await registerAndApproveProperty(deployed.propertyRegistry, propertyManager, owner);
    
    // 创建房产代币
    const result = await createPropertyToken(deployed.tokenFactory, propertyId, owner);
    token = result.token;
    tokenAddress = result.tokenAddress;
    
    // KYC验证用户并添加到白名单
    await verifyUsers(deployed.kycManager, deployed.kycManager, [user1, user2]);
    await addUsersToWhitelist(token, owner, [user1, user2]);
    
    // 分发代币给用户
    await distributeTokens(token, owner, [user1, user2], ethers.utils.parseEther("300"));
    
    // 创建租金分配
    const rentAmount = ethers.utils.parseEther("1000");
    await stablecoin.connect(owner).approve(rentDistributor.address, rentAmount);
    
    const tx = await rentDistributor.connect(propertyManager).createDistribution(
      propertyId, tokenAddress, stablecoin.address, rentAmount
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'RentDistributionCreated');
    distributionId = event.args.distributionId;
  });

  it("房产管理员应该能够创建租金分配", async function () {
    const distribution = await rentDistributor.rentDistributions(distributionId);
    
    expect(distribution.propertyId).to.equal(propertyId);
    expect(distribution.tokenAddress).to.equal(tokenAddress);
    expect(distribution.stablecoinAddress).to.equal(stablecoin.address);
    expect(distribution.totalAmount).to.equal(ethers.utils.parseEther("1000"));
    expect(distribution.isProcessed).to.be.false;
  });

  it("超级管理员应该能够处理租金分配", async function () {
    await rentDistributor.connect(owner).processDistribution(distributionId);
    
    const distribution = await rentDistributor.rentDistributions(distributionId);
    expect(distribution.isProcessed).to.be.true;
    
    // 检查平台费用和维护费用
    const platformFee = ethers.utils.parseEther("20"); // 2% of 1000
    const maintenanceFee = ethers.utils.parseEther("30"); // 3% of 1000
    const netAmount = ethers.utils.parseEther("950"); // 1000 - 20 - 30
    
    expect(distribution.platformFee).to.equal(platformFee);
    expect(distribution.maintenanceFee).to.equal(maintenanceFee);
    expect(distribution.netAmount).to.equal(netAmount);
    
    // 检查平台费用是否已转移给费用收集者
    expect(await stablecoin.balanceOf(feeCollector.address)).to.equal(platformFee);
  });

  it("用户应该能够领取租金", async function () {
    await rentDistributor.connect(owner).processDistribution(distributionId);
    
    // 用户1领取租金 (300/1000 * 950 = 285)
    await rentDistributor.connect(user1).claimRent(distributionId);
    
    const expectedRent = ethers.utils.parseEther("285");
    expect(await stablecoin.balanceOf(user1.address)).to.be.closeTo(
      ethers.utils.parseEther("10285"), // 初始10000 + 285
      ethers.utils.parseEther("0.1") // 允许一点误差
    );
    
    // 检查用户已领取状态
    expect(await rentDistributor.hasClaimed(distributionId, user1.address)).to.be.true;
    
    // 用户不应该能够重复领取
    await expect(
      rentDistributor.connect(user1).claimRent(distributionId)
    ).to.be.revertedWith("Already claimed");
  });

  it("房产管理员应该能够提取维护费用", async function () {
    await rentDistributor.connect(owner).processDistribution(distributionId);
    
    const maintenanceFee = ethers.utils.parseEther("30"); // 3% of 1000
    const initialBalance = await stablecoin.balanceOf(propertyManager.address);
    
    await rentDistributor.connect(propertyManager).withdrawMaintenanceFee(distributionId);
    
    expect(await stablecoin.balanceOf(propertyManager.address)).to.equal(
      initialBalance.add(maintenanceFee)
    );
    
    // 维护费用应该已清零
    const distribution = await rentDistributor.rentDistributions(distributionId);
    expect(distribution.maintenanceFee).to.equal(0);
  });

  it("应该能够获取用户可领取的租金", async function () {
    await rentDistributor.connect(owner).processDistribution(distributionId);
    
    // 用户1可领取的租金 (300/1000 * 950 = 285)
    const claimable = await rentDistributor.getClaimableRent(distributionId, user1.address);
    expect(claimable).to.be.closeTo(
      ethers.utils.parseEther("285"),
      ethers.utils.parseEther("0.1") // 允许一点误差
    );
  });

  it("应该能够获取分配信息", async function () {
    await rentDistributor.connect(owner).processDistribution(distributionId);
    
    const info = await rentDistributor.getDistributionInfo(distributionId);
    
    expect(info[0]).to.equal(propertyId); // propertyId
    expect(info[1]).to.equal(tokenAddress); // tokenAddress
    expect(info[2]).to.equal(stablecoin.address); // stablecoinAddress
    expect(info[3]).to.equal(ethers.utils.parseEther("1000")); // totalAmount
    expect(info[5]).to.equal(ethers.utils.parseEther("20")); // platformFee
    expect(info[6]).to.equal(ethers.utils.parseEther("30")); // maintenanceFee
    expect(info[7]).to.equal(ethers.utils.parseEther("950")); // netAmount
    expect(info[8]).to.be.true; // isProcessed
  });
});