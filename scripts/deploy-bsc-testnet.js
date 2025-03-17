// BSC测试网部署脚本
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // 确保我们在BSC测试网上
  const network = await ethers.provider.getNetwork();
  console.log(`部署到网络: ${network.name} (chainId: ${network.chainId})`);
  
  if (network.chainId !== 97) {
    console.warn("警告: 您不在BSC测试网上。请确保您的hardhat配置正确。");
    console.warn("继续部署...");
  }

  // 执行主部署脚本
  const deploy = require("./deploy");
  const deployedContracts = await deploy.main();
  
  // 将部署信息保存到文件
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentPath, "bsc-testnet.json");
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify({
      network: "bsc-testnet",
      chainId: network.chainId,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts
    }, null, 2)
  );
  
  console.log(`部署信息已保存到: ${deploymentFile}`);
  
  // 生成验证脚本
  generateVerificationScript(deployedContracts);
}

function generateVerificationScript(contracts) {
  const verifyScriptPath = path.join(__dirname, "verify-bsc-testnet.js");
  const verifyScript = `
const hre = require("hardhat");

async function main() {
  console.log("开始验证合约...");
  
  // 验证RealEstateSystem
  try {
    await hre.run("verify:verify", {
      address: "${contracts.RealEstateSystem}",
      constructorArguments: []
    });
    console.log("RealEstateSystem 验证成功");
  } catch (error) {
    console.error("RealEstateSystem 验证失败:", error.message);
  }
  
  // 验证其他合约...
  // 注意: 由于这些是通过代理部署的，验证可能需要特殊处理
  
  console.log("验证完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

  fs.writeFileSync(verifyScriptPath, verifyScript);
  console.log(`验证脚本已生成: ${verifyScriptPath}`);
}

// 执行部署
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署过程中出错:", error);
    process.exit(1);
  });