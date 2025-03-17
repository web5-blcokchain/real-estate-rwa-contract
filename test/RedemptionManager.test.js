const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
  deploySystem, 
  registerAndApproveProperty, 
  createPropertyToken,
  verifyUsers,
  addUsersToWhitelist
} = require("./utils/testHelpers");

describe("赎回管理测试", function () {
  let owner, user1, user2, feeCollector;
  let redemptionManager, token, tokenAddress, propertyId, stablecoin;
  let requestId;

  beforeEach(async function () {
    const deployed = await deploySystem();
    owner = deployed.owner;
    user1 = deployed.user1;
    user2 = deployed.user2;
    feeCollector = deployed.feeCollector;
    redemptionManager = deployed.redemptionManager;
    stablecoin = deployed.stablecoin;
    
    // 注册并审核房产
    propertyId = await registerAndApproveProperty(deployed.propertyRegistry, deployed.propertyManager, owner);
    
    // 创建房产代币
    const result = await createPropertyToken(deployed.tokenFactory, propertyId, owner);
    token = result.token;
    tokenAddress = result.tokenAddress;
    
    // KYC验证用户并添加到白名单
    await verifyUsers(deployed.kycManager, deployed.kycManager, [user1, user2]);
    await addUsersToWhitelist(token, owner, [user1, user2]);
    
    // 分发代币给用户
    await token.connect(owner).transfer(user1.address, ethers.utils.parseEther("300"));
    
    // 用户批准赎回管理合约使用代币
    const tokenAmount = ethers.utils.parseEther("100");
    await token.connect(user1).approve(redemptionManager.address, tokenAmount);
    
    // 创建赎回请求
    const tx = await redemptionManager.connect(user1).requestRedemption(
      propertyId, tokenAddress, tokenAmount, stablecoin.address
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'RedemptionRequested');
    requestId = event.args.requestId;
  });

  it("用户应该能够请求赎回", async function () {
    const request = await redemptionManager.redemptionRequests(requestId);
    
    expect(request.propertyId).to.equal(propertyId);
    expect(request.requester).to.equal(user1.address);
    expect(request.tokenAmount).to.equal(ethers.utils.parseEther("100"));
    expect(request.status).to.equal(0); // Pending
    expect(request.stablecoinAddress).to.equal(stablecoin.address);
    
    // 检查代币是否已转移到赎回管理合约
    expect(await token.balanceOf(redemptionManager.address)).to.equal(ethers.utils.parseEther("100"));
  });

  it("超级管理员应该能够批准赎回请求", async function () {
    await redemptionManager.connect(owner).approveRedemption(requestId);
    
    const request = await redemptionManager.redemptionRequests(requestId);
    expect(request.status).to.equal(1); // Approved
    expect(request.approvalTime).to.not.equal(0);
  });

  it("超级管理员应该能够拒绝赎回请求", async function () {
    const initialBalance = await token.balanceOf(user1.address);
    
    await redemptionManager.connect(owner).rejectRedemption(requestId, tokenAddress);
    
    const request = await redemptionManager.redemptionRequests(requestId);
    expect(request.status).to.equal(2); // Rejected
    
    // 检查代币是否已返还给用户
    expect(await token.balanceOf(user1.address)).to.equal(initialBalance.add(ethers.utils.parseEther("100")));
  });

  it("超级管理员应该能够完成赎回", async function () {
    await redemptionManager.connect(owner).approveRedemption(requestId);
    
    const redemptionAmount = ethers.utils.parseEther("200");
    const fee = ethers.utils.parseEther("3"); // 1.5% of 200
    const netAmount = redemptionAmount.sub(fee);
    
    // 超级管理员批准稳定币使用
    await stablecoin.connect(owner).approve(redemptionManager.address, redemptionAmount);
    
    const initialUserBalance = await stablecoin.balanceOf(user1.address);
    const initialFeeCollectorBalance = await stablecoin.balanceOf(feeCollector.address);
    
    await redemptionManager.connect(owner).completeRedemption(
      requestId, tokenAddress, redemptionAmount
    );
    
    const request = await redemptionManager.redemptionRequests(requestId);
    expect(request.status).to.equal(3); // Completed
    expect(request.completionTime).to.not.equal(0);
    
    // 检查代币是否已销毁
    expect(await token.balanceOf(redemptionManager.address)).to.equal(0);
    
    // 检查稳定币是否已转移给用户
    expect(await stablecoin.balanceOf(user1.address)).to.equal(initialUserBalance.add(netAmount));
    
    // 检查费用是否已转移给费用收集者
    expect(await stablecoin.balanceOf(feeCollector.address)).to.equal(initialFeeCollectorBalance.add(fee));
  });

  it("用户应该能够取消赎回请求", async function () {
    const initialBalance = await token.balanceOf(user1.address);
    
    await redemptionManager.connect(user1).cancelRedemption(requestId, tokenAddress);
    
    const request = await redemptionManager.redemptionRequests(requestId);
    expect(request.status).to.equal(4); // Cancelled
    
    // 检查代币是否已返还给用户
    expect(await token.balanceOf(user1.address)).to.equal(initialBalance.add(ethers.utils.parseEther("100")));
  });

  it("非请求者不应该能够取消赎回请求", async function () {
    await expect(
      redemptionManager.connect(user2).cancelRedemption(requestId, tokenAddress)
    ).to.be.revertedWith("Not requester");
  });

  it("超级管理员应该能够设置赎回期限", async function () {
    const newPeriod = 60 * 60 * 24 * 60; // 60天
    await redemptionManager.connect(owner).setRedemptionPeriod(newPeriod);
    
    expect(await redemptionManager.redemptionPeriod()).to.equal(newPeriod);
  });
});