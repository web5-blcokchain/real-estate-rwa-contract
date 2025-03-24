const { ethers } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

async function main() {
  // 读取最新的BSC测试网部署记录
  const deploymentPath = path.join(__dirname, "../../deployments/bsc-testnet-latest.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("找不到BSC测试网部署记录，请先部署合约");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath));
  const contracts = deployment.contracts;
  
  console.log("开始BSC测试网功能测试...");
  
  // 获取合约实例
  const realEstateSystem = await ethers.getContractAt(
    "RealEstateSystem",
    contracts.RealEstateSystem
  );
  const roleManager = await ethers.getContractAt(
    "RoleManager",
    contracts.RoleManager
  );
  const propertyRegistry = await ethers.getContractAt(
    "PropertyRegistry",
    contracts.PropertyRegistry
  );
  
  // 测试系统状态
  const systemActive = await realEstateSystem.isSystemActive();
  console.log(`系统状态: ${systemActive ? "激活" : "未激活"}`);
  expect(systemActive).to.equal(true);
  
  // 测试角色设置
  const [deployer] = await ethers.getSigners();
  const SUPER_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUPER_ADMIN"));
  const isSuperAdmin = await roleManager.hasRole(SUPER_ADMIN_ROLE, deployer.address);
  console.log(`部署账户是否为超级管理员: ${isSuperAdmin}`);
  expect(isSuperAdmin).to.equal(true);
  
  console.log("BSC测试网功能测试完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("测试失败:", error);
    process.exit(1);
  });