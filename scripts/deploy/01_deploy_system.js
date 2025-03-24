const { ethers, upgrades } = require("hardhat");
const { 
  deployUpgradeable, 
  readDeployments, 
  saveDeployments 
} = require("../utils/deploy-utils");

async function main() {
  // 读取现有部署记录
  const deployments = readDeployments();
  
  // 部署 RealEstateSystem
  const realEstateSystem = await deployUpgradeable("RealEstateSystem");
  
  // 更新部署记录
  deployments.RealEstateSystem = realEstateSystem.address;
  saveDeployments(deployments);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });