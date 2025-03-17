const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deploySystem, registerAndApproveProperty } = require("./utils/testHelpers");

describe("代币工厂测试", function () {
  let tokenFactory, propertyRegistry, owner, propertyManager;
  let propertyId;

  beforeEach(async function () {
    const deployed = await deploySystem();
    tokenFactory = deployed.tokenFactory;
    propertyRegistry = deployed.propertyRegistry;
    owner = deployed.owner;
    propertyManager = deployed.propertyManager;
    
    // 注册并审核房产
    propertyId = await registerAndApproveProperty(propertyRegistry, propertyManager, owner);
  });

  it("超级管理员应该能够创建房产代币", async function () {
    const tokenName = "Property Token";
    const tokenSymbol = "PT";
    const totalSupply = ethers.utils.parseEther("1000");
    
    const tx = await tokenFactory.connect(owner).createToken(
      propertyId, tokenName, tokenSymbol, totalSupply
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'TokenCreated');
    expect(event).to.not.be.undefined;
    
    const tokenAddress = event.args.tokenAddress;
    expect(await tokenFactory.propertyTokens(propertyId)).to.equal(tokenAddress);
    
    // 检查房产状态是否已更新为已通证化
    const property = await propertyRegistry.properties(propertyId);
    expect(property.status).to.equal(3); // Tokenized
    expect(property.tokenAddress).to.equal(tokenAddress);
    
    // 检查代币是否已正确创建
    const token = await ethers.getContractAt("RealEstateToken", tokenAddress);
    expect(await token.name()).to.equal(tokenName);
    expect(await token.symbol()).to.equal(tokenSymbol);
    expect(await token.totalSupply()).to.equal(totalSupply);
    
    // 检查代币列表是否已更新
    expect(await tokenFactory.getTokenCount()).to.equal(1);
    expect(await tokenFactory.tokenList(0)).to.equal(tokenAddress);
  });

  it("非超级管理员不应该能够创建房产代币", async function () {
    await expect(
      tokenFactory.connect(propertyManager).createToken(
        propertyId, "Property Token", "PT", ethers.utils.parseEther("1000")
      )
    ).to.be.revertedWith("Caller is not a super admin");
  });

  it("不应该能够为未审核的房产创建代币", async function () {
    const newPropertyId = "PROP-" + Date.now();
    const country = "Japan";
    const metadataURI = "https://metadata.example.com/property/" + newPropertyId;
    
    // 注册房产但不审核
    await propertyRegistry.connect(propertyManager).registerProperty(
      newPropertyId, country, metadataURI
    );
    
    await expect(
      tokenFactory.connect(owner).createToken(
        newPropertyId, "Property Token", "PT", ethers.utils.parseEther("1000")
      )
    ).to.be.revertedWith("Property not approved");
  });

  it("不应该能够为已有代币的房产再次创建代币", async function () {
    // 首次创建代币
    await tokenFactory.connect(owner).createToken(
      propertyId, "Property Token", "PT", ethers.utils.parseEther("1000")
    );
    
    // 尝试再次创建代币
    await expect(
      tokenFactory.connect(owner).createToken(
        propertyId, "Property Token 2", "PT2", ethers.utils.parseEther("1000")
      )
    ).to.be.revertedWith("Token already exists for property");
  });

  it("应该能够获取房产代币地址", async function () {
    await tokenFactory.connect(owner).createToken(
      propertyId, "Property Token", "PT", ethers.utils.parseEther("1000")
    );
    
    const tokenAddress = await tokenFactory.getPropertyToken(propertyId);
    expect(tokenAddress).to.not.equal(ethers.constants.AddressZero);
    expect(await tokenFactory.propertyTokens(propertyId)).to.equal(tokenAddress);
  });

  it("超级管理员应该能够更新代币实现合约", async function () {
    const oldImplementation = await tokenFactory.tokenImplementation();
    
    // 部署新的实现合约
    const RealEstateToken = await ethers.getContractFactory("RealEstateToken");
    const newImplementation = await RealEstateToken.deploy();
    await newImplementation.deployed();
    
    await tokenFactory.connect(owner).updateTokenImplementation(newImplementation.address);
    
    expect(await tokenFactory.tokenImplementation()).to.equal(newImplementation.address);
    expect(await tokenFactory.tokenImplementation()).to.not.equal(oldImplementation);
  });
});