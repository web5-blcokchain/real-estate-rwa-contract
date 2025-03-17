const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deploySystem, SUPER_ADMIN_ROLE, PROPERTY_MANAGER_ROLE, KYC_MANAGER_ROLE } = require("./utils/testHelpers");

describe("角色管理测试", function () {
  let system, roleManager;
  let owner, user1, user2;

  beforeEach(async function () {
    const deployed = await deploySystem();
    system = deployed.system;
    roleManager = deployed.roleManager;
    owner = deployed.owner;
    user1 = deployed.user1;
    user2 = deployed.user2;
  });

  it("部署后应该将部署者设置为超级管理员", async function () {
    expect(await roleManager.hasRole(SUPER_ADMIN_ROLE, owner.address)).to.be.true;
  });

  it("超级管理员应该能够授予角色", async function () {
    await roleManager.connect(owner).grantRole(PROPERTY_MANAGER_ROLE, user1.address);
    expect(await roleManager.hasRole(PROPERTY_MANAGER_ROLE, user1.address)).to.be.true;
  });

  it("超级管理员应该能够撤销角色", async function () {
    await roleManager.connect(owner).grantRole(PROPERTY_MANAGER_ROLE, user1.address);
    await roleManager.connect(owner).revokeRole(PROPERTY_MANAGER_ROLE, user1.address);
    expect(await roleManager.hasRole(PROPERTY_MANAGER_ROLE, user1.address)).to.be.false;
  });

  it("非超级管理员不应该能够授予角色", async function () {
    await expect(
      roleManager.connect(user1).grantRole(KYC_MANAGER_ROLE, user2.address)
    ).to.be.revertedWith("AccessControl");
  });

  it("应该能够检查用户是否有特定角色", async function () {
    await roleManager.connect(owner).grantRole(KYC_MANAGER_ROLE, user1.address);
    expect(await roleManager.hasRole(KYC_MANAGER_ROLE, user1.address)).to.be.true;
    expect(await roleManager.hasRole(PROPERTY_MANAGER_ROLE, user1.address)).to.be.false;
  });
});