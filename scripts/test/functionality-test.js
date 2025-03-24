const { ethers } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

async function main() {
  // 检查部署文件是否存在
  const deploymentsPath = path.join(__dirname, "../../deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    console.error("错误: 找不到部署记录文件，请先完成部署");
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath));

  // 检查必要的合约地址是否存在
  const requiredContracts = ["RealEstateSystem", "PropertyRegistry", "TokenFactory"];
  for (const contract of requiredContracts) {
    if (!deployments[contract]) {
      console.error(`错误: 找不到${contract}合约地址，请确保部署完整`);
      process.exit(1);
    }
  }

  // 获取合约实例
  const realEstateSystem = await ethers.getContractAt(
    "RealEstateSystem",
    deployments.RealEstateSystem
  );
  const propertyRegistry = await ethers.getContractAt(
    "PropertyRegistry",
    deployments.PropertyRegistry
  );
  // ... 获取其他合约实例

  console.log("开始功能测试...");

  // 测试房产注册
  const propertyId = "PROP001";
  await propertyRegistry.registerProperty(
    propertyId,
    "Japan",
    "ipfs://QmXxx..."
  );
  const property = await propertyRegistry.getProperty(propertyId);
  expect(property.status).to.equal(1); // Pending

  // 测试其他功能...

  console.log("功能测试完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });