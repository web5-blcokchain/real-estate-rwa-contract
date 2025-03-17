const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deploySystem } = require("./utils/testHelpers");

describe("费用管理测试", function () {
  let feeManager, owner, user1, feeCollector;

  beforeEach(async function () {
    const deployed = await deploySystem();
    feeManager = deployed.feeManager;
    owner = deployed.owner;
    user1 = deployed.user1;
    feeCollector = deployed.feeCollector;
  });

  it("应该正确设置费用收集者", async function () {
    expect(await feeManager.feeCollector()).to.equal(feeCollector.address);
    
    await feeManager.connect(owner).setFeeCollector(user1.address);
    expect(await feeManager.feeCollector()).to.equal(user1.address);
  });

  it("应该正确设置费用比例", async function () {
    await feeManager.connect(owner).setFeeRate("PLATFORM_FEE", 250);
    expect(await feeManager.platformFee()).to.equal(250);
    
    await feeManager.connect(owner).setFeeRate("MAINTENANCE_FEE", 350);
    expect(await feeManager.maintenanceFee()).to.equal(350);
    
    await feeManager.connect(owner).setFeeRate("TRADING_FEE", 150);
    expect(await feeManager.tradingFee()).to.equal(150);
    
    await feeManager.connect(owner).setFeeRate("REDEMPTION_FEE", 200);
    expect(await feeManager.redemptionFee()).to.equal(200);
  });

  it("非超级管理员不应该能够设置费用收集者", async function () {
    await expect(
      feeManager.connect(user1).setFeeCollector(user1.address)
    ).to.be.revertedWith("Caller is not a super admin");
  });

  it("非超级管理员不应该能够设置费用比例", async function () {
    await expect(
      feeManager.connect(user1).setFeeRate("PLATFORM_FEE", 300)
    ).to.be.revertedWith("Caller is not a super admin");
  });

  it("应该正确计算费用", async function () {
    const amount = ethers.utils.parseEther("1000");
    
    // 平台费用 2%
    let fee = await feeManager.calculateFee(amount, await feeManager.platformFee());
    expect(fee).to.equal(ethers.utils.parseEther("20"));
    
    // 维护费用 3%
    fee = await feeManager.calculateFee(amount, await feeManager.maintenanceFee());
    expect(fee).to.equal(ethers.utils.parseEther("30"));
    
    // 交易费用 1%
    fee = await feeManager.calculateFee(amount, await feeManager.tradingFee());
    expect(fee).to.equal(ethers.utils.parseEther("10"));
    
    // 赎回费用 1.5%
    fee = await feeManager.calculateFee(amount, await feeManager.redemptionFee());
    expect(fee).to.equal(ethers.utils.parseEther("15"));
  });
});