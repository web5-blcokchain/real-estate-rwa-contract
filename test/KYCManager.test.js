const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deploySystem } = require("./utils/testHelpers");

describe("KYC管理测试", function () {
  let kycManager, owner, user1, user2, kycManagerSigner;

  beforeEach(async function () {
    const deployed = await deploySystem();
    kycManager = deployed.kycManager;
    owner = deployed.owner;
    user1 = deployed.user1;
    user2 = deployed.user2;
    kycManagerSigner = deployed.kycManager;
  });

  it("KYC管理员应该能够验证用户", async function () {
    await kycManager.connect(kycManagerSigner).verifyUser(user1.address);
    expect(await kycManager.isKYCVerified(user1.address)).to.be.true;
  });

  it("KYC管理员应该能够撤销用户验证", async function () {
    await kycManager.connect(kycManagerSigner).verifyUser(user1.address);
    await kycManager.connect(kycManagerSigner).revokeVerification(user1.address);
    expect(await kycManager.isKYCVerified(user1.address)).to.be.false;
  });

  it("非KYC管理员不应该能够验证用户", async function () {
    await expect(
      kycManager.connect(user1).verifyUser(user2.address)
    ).to.be.revertedWith("Caller is not a KYC manager");
  });

  it("非KYC管理员不应该能够撤销用户验证", async function () {
    await kycManager.connect(kycManagerSigner).verifyUser(user2.address);
    await expect(
      kycManager.connect(user1).revokeVerification(user2.address)
    ).to.be.revertedWith("Caller is not a KYC manager");
  });

  it("应该能够批量验证用户", async function () {
    const users = [user1.address, user2.address];
    await kycManager.connect(kycManagerSigner).batchVerifyUsers(users);
    
    expect(await kycManager.isKYCVerified(user1.address)).to.be.true;
    expect(await kycManager.isKYCVerified(user2.address)).to.be.true;
  });

  it("应该能够批量撤销用户验证", async function () {
    const users = [user1.address, user2.address];
    await kycManager.connect(kycManagerSigner).batchVerifyUsers(users);
    await kycManager.connect(kycManagerSigner).batchRevokeVerifications(users);
    
    expect(await kycManager.isKYCVerified(user1.address)).to.be.false;
    expect(await kycManager.isKYCVerified(user2.address)).to.be.false;
  });
});