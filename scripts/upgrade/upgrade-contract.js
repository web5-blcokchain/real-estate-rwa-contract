/**
 * 合约升级脚本
 * 用于升级可升级合约的实现逻辑
 */
require("dotenv").config();
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const { readDeployments, saveDeployments } = require("../utils/deploy-utils");

/**
 * 升级指定合约
 * @param {string} contractName - 合约名称
 * @param {string} proxyAddress - 代理合约地址
 * @returns {Promise<string>} - 新实现合约地址
 */
async function upgradeContract(contractName, proxyAddress) {
  logger.info(`开始升级合约: ${contractName}`);
  logger.info(`代理地址: ${proxyAddress}`);

  // 获取合约工厂
  const ContractFactory = await ethers.getContractFactory(contractName);
  
  // 升级合约
  const upgradedContract = await upgrades.upgradeProxy(proxyAddress, ContractFactory);
  await upgradedContract.deployed();
  
  // 获取实现合约地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  
  logger.info(`合约 ${contractName} 升级成功`);
  logger.info(`代理地址: ${proxyAddress}`);
  logger.info(`新实现地址: ${implementationAddress}`);
  
  return implementationAddress;
}

/**
 * 验证升级后的实现合约
 * @param {string} implementationAddress - 实现合约地址
 */
async function verifyImplementation(implementationAddress) {
  try {
    logger.info(`验证实现合约: ${implementationAddress}`);
    const { run } = require("hardhat");
    await run("verify:verify", {
      address: implementationAddress,
      constructorArguments: []
    });
    logger.info(`实现合约验证成功: ${implementationAddress}`);
  } catch (error) {
    logger.error(`实现合约验证失败: ${implementationAddress}`, error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  if (args.length < 1) {
    logger.error("请提供要升级的合约名称");
    logger.info("用法: npx hardhat run scripts/upgrade/upgrade-contract.js --network <network> <contractName>");
    process.exit(1);
  }
  
  const contractName = args[0];
  
  // 读取部署记录
  const deployments = readDeployments();
  
  // 检查合约是否已部署
  if (!deployments[contractName]) {
    logger.error(`找不到合约 ${contractName} 的部署记录`);
    process.exit(1);
  }
  
  const proxyAddress = deployments[contractName];
  
  try {
    // 升级合约
    const newImplementationAddress = await upgradeContract(contractName, proxyAddress);
    
    // 保存升级记录
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const upgradesDir = path.join(__dirname, "../../upgrades");
    if (!fs.existsSync(upgradesDir)) {
      fs.mkdirSync(upgradesDir, { recursive: true });
    }
    
    const network = hre.network.name;
    const upgradeRecord = {
      contractName,
      proxyAddress,
      previousImplementation: deployments[`${contractName}_Implementation`] || "unknown",
      newImplementation: newImplementationAddress,
      timestamp: new Date().toISOString(),
      network
    };
    
    const upgradeFile = path.join(upgradesDir, `${contractName}-${timestamp}.json`);
    fs.writeFileSync(
      upgradeFile,
      JSON.stringify(upgradeRecord, null, 2)
    );
    
    logger.info(`升级记录已保存到: ${upgradeFile}`);
    
    // 更新部署记录中的实现地址
    deployments[`${contractName}_Implementation`] = newImplementationAddress;
    saveDeployments(deployments);
    
    // 验证新的实现合约
    await verifyImplementation(newImplementationAddress);
    
    logger.info(`合约 ${contractName} 升级完成`);
  } catch (error) {
    logger.error(`升级失败: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("升级过程中出错:", error);
      process.exit(1);
    });
} else {
  // 作为模块导出
  module.exports = { upgradeContract, verifyImplementation };
}