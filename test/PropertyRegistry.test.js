const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deploySystem } = require("./utils/testHelpers");

describe("房产注册测试", function () {
  let propertyRegistry, owner, propertyManager, user1;
  let propertyId, country, metadataURI;

  beforeEach(async function () {
    const deployed = await deploySystem();
    propertyRegistry = deployed.propertyRegistry;
    owner = deployed.owner;
    propertyManager = deployed.propertyManager;
    user1 = deployed.user1;
    
    propertyId = "PROP-" + Date.now();
    country = "Japan";
    metadataURI = "https://metadata.example.com/property/" + propertyId;
  });

  it("房产管理员应该能够注册房产", async function () {
    await propertyRegistry.connect(propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    const property = await propertyRegistry.properties(propertyId);
    expect(property.propertyId).to.equal(propertyId);
    expect(property.country).to.equal(country);
    expect(property.status).to.equal(1); // Pending
    expect(property.propertyManager).to.equal(propertyManager.address);
    expect(property.metadataURI).to.equal(metadataURI);
  });

  it("非房产管理员不应该能够注册房产", async function () {
    await expect(
      propertyRegistry.connect(user1).registerProperty(propertyId, country, metadataURI)
    ).to.be.revertedWith("Caller is not a property manager");
  });

  it("超级管理员应该能够审核房产", async function () {
    await propertyRegistry.connect(propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    await propertyRegistry.connect(owner).approveProperty(propertyId);
    
    const property = await propertyRegistry.properties(propertyId);
    expect(property.status).to.equal(2); // Approved
  });

  it("超级管理员应该能够拒绝房产", async function () {
    await propertyRegistry.connect(propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    await propertyRegistry.connect(owner).rejectProperty(propertyId);
    
    const property = await propertyRegistry.properties(propertyId);
    expect(property.status).to.equal(4); // Rejected
  });

  it("非超级管理员不应该能够审核房产", async function () {
    await propertyRegistry.connect(propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    await expect(
      propertyRegistry.connect(user1).approveProperty(propertyId)
    ).to.be.revertedWith("Caller is not a super admin");
  });

  it("应该能够获取房产详情", async function () {
    await propertyRegistry.connect(propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    const details = await propertyRegistry.getPropertyDetails(propertyId);
    expect(details[0]).to.equal(country);
    expect(details[1]).to.equal(1); // Pending
    expect(details[2]).to.equal(propertyManager.address);
    expect(details[3]).to.equal(metadataURI);
  });

  it("应该能够设置房产为已通证化", async function () {
    await propertyRegistry.connect(propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    await propertyRegistry.connect(owner).approveProperty(propertyId);
    
    const tokenAddress = "0x1234567890123456789012345678901234567890";
    await propertyRegistry.connect(owner).setPropertyTokenized(propertyId, tokenAddress);
    
    const property = await propertyRegistry.properties(propertyId);
    expect(property.status).to.equal(3); // Tokenized
    expect(property.tokenAddress).to.equal(tokenAddress);
  });

  it("应该能够下架房产", async function () {
    await propertyRegistry.connect(propertyManager).registerProperty(
      propertyId, country, metadataURI
    );
    
    await propertyRegistry.connect(owner).approveProperty(propertyId);
    await propertyRegistry.connect(owner).delistProperty(propertyId);
    
    const property = await propertyRegistry.properties(propertyId);
    expect(property.status).to.equal(5); // Delisted
  });
});