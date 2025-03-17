const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
  deploySystem, 
  registerAndApproveProperty, 
  createPropertyToken,
  verifyUsers,
  addUsersToWhitelist
} = require("./utils/testHelpers");

describe("房产代币测试", function () {
  let owner, user1, user2, propertyManager, kycManager;
  let propertyRegistry, tokenFactory, kycManagerContract;
  let token, tokenAddress, propertyId;
  let stablecoin;

  beforeEach(async function () {
    const deployed = await deploySystem();
    owner = deployed.owner;
    user1 = deployed.user1;
    user2 = deployed.user2;
    propertyManager = deployed.propertyManager;
    kycManager = deployed.kycManager;
    propertyRegistry = deployed.propertyRegistry;
    tokenFactory = deployed.tokenFactory;
    kycManagerContract = deployed.kycManager;
    stablecoin = deployed.stablecoin;
    
    // 注册并审核房产
    propertyId = await registerAndApproveProperty(propertyRegistry, propertyManager, owner);
    
    // 创建房产代币
    const result = await createPropertyToken(tokenFactory, propertyId, owner);
    token = result.token;
    tokenAddress = result.tokenAddress;
    
    // KYC验证用户
    await verifyUsers(kycManagerContract, kycManager, [user1, user2]);
    
    // 将用户添加到白名单
    await addUsersToWhitelist(token, owner, [user1, user2]);
  });

  it("应该正确初始化代币信息", async function () {
    const propertyInfo = await token.propertyInfo();
    expect(propertyInfo.propertyId).to.equal(propertyId);
    expect(propertyInfo.country).to.equal("Japan");
    expect(propertyInfo.totalSupply).to.equal(ethers.utils.parseEther("1000"));
    
    expect(await token.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1000"));
  });

  it("白名单用户之间应该能够转移代币", async function () {
    const amount = ethers.utils.parseEther("100");
    await token.connect(owner).transfer(user1.address, amount);
    
    expect(await token.balanceOf(user1.address)).to.equal(amount);
    expect(await token.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("900"));
    
    // 用户之间转移
    await token.connect(user1).transfer(user2.address, ethers.utils.parseEther("50"));
    
    expect(await token.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("50"));
    expect(await token.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("50"));
  });

  it("非白名单用户不应该能够接收代币", async function () {
    const user3 = (await ethers.getSigners())[5]; // 获取一个未添加到白名单的用户
    
    // 验证KYC但不添加到白名单
    await kycManagerContract.connect(kycManager).verifyUser(user3.address);
    
    await expect(
      token.connect(owner).transfer(user3.address, ethers.utils.parseEther("100"))
    ).to.be.revertedWith("Recipient not in whitelist");
  });

  it("非KYC验证用户不应该能够接收代币", async function () {
    const user3 = (await ethers.getSigners())[5]; // 获取一个未KYC验证的用户
    
    // 添加到白名单但不验证KYC
    await token.connect(owner).addToWhitelist(user3.address);
    
    await expect(
      token.connect(owner).transfer(user3.address, ethers.utils.parseEther("100"))
    ).to.be.revertedWith("Recipient not KYC verified");
  });

  it("超级管理员应该能够暂停和恢复代币转移", async function () {
    // 暂停代币转移
    await token.connect(owner).pause();
    
    await expect(
      token.connect(owner).transfer(user1.address, ethers.utils.parseEther("100"))
    ).to.be.revertedWith("Pausable: paused");
    
    // 恢复代币转移
    await token.connect(owner).unpause();
    
    await token.connect(owner).transfer(user1.address, ethers.utils.parseEther("100"));
    expect(await token.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("100"));
  });

  it("超级管理员应该能够销毁代币", async function () {
    const initialSupply = await token.totalSupply();
    const burnAmount = ethers.utils.parseEther("100");
    
    await token.connect(owner).burn(burnAmount);
    
    expect(await token.totalSupply()).to.equal(initialSupply.sub(burnAmount));
    expect(await token.balanceOf(owner.address)).to.equal(initialSupply.sub(burnAmount));
  });

  it("应该能够接收和分配租金", async function () {
    // 分发代币给用户
    await token.connect(owner).transfer(user1.address, ethers.utils.parseEther("300"));
    await token.connect(owner).transfer(user2.address, ethers.utils.parseEther("200"));
    
    // 模拟租金支付
    const rentAmount = ethers.utils.parseEther("1000");
    await stablecoin.connect(owner).approve(token.address, rentAmount);
    await token.connect(owner).distributeRent(stablecoin.address, rentAmount);
    
    // 检查租金分配
    expect(await token.rentBalance(stablecoin.address)).to.equal(rentAmount);
    
    // 用户1领取租金 (300/1000 * 1000 = 300)
    await token.connect(user1).claimRent(stablecoin.address);
    expect(await stablecoin.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("10300")); // 初始10000 + 300
    
    // 用户2领取租金 (200/1000 * 1000 = 200)
    await token.connect(user2).claimRent(stablecoin.address);
    expect(await stablecoin.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("10200")); // 初始10000 + 200
    
    // 所有者领取租金 (500/1000 * 1000 = 500)
    await token.connect(owner).claimRent(stablecoin.address);
    
    // 检查租金余额是否已清零
    expect(await token.rentBalance(stablecoin.address)).to.equal(0);
  });

  it("应该能够更新代币元数据", async function () {
    const newMetadataURI = "https://metadata.example.com/property/updated";
    await token.connect(owner).updateMetadataURI(newMetadataURI);
    
    const propertyInfo = await token.propertyInfo();
    expect(propertyInfo.metadataURI).to.equal(newMetadataURI);
  });
});