/**
 * 批量升级脚本
 * 用于升级系统中的所有合约
 */
require("dotenv").config();
const logger = require("../utils/logger");
const { readDeployments } = require("../utils/deploy-utils");
const { upgradeContract, verifyImplementation } = require("./upgrade-contract");

/**
 * 主函数
 */
async function main() {
  // 读取部署记录
  const deployments = readDeployments();
  
  // 获取所有需要升级的合约
  const contractsToUpgrade = [
    "RealEstateSystem",
    "RoleManager",
    "FeeManager",
    "PropertyRegistry",
    "TokenFactory",
    "RedemptionManager",
    "RentDistributor",
    "Marketplace",
    "TokenHolderQuery"
  ];
  
  logger.info("开始批量升级合约...");
  
  // 记录升级结果
  const results = {
    success: [],
    failed: []
  };
  
  // 逐个升级合约
  for (const contractName of contractsToUpgrade) {
    try {
      // 检查合约是否已部署
      if (!deployments[contractName]) {
        logger.warn(`跳过合约 ${contractName}，找不到部署记录`);
        results.failed.push({ name: contractName, reason: "找不到部署记录" });
        continue;
      }
      
      const proxyAddress = deployments[contractName];
      
      // 升级合约
      const newImplementationAddress = await upgradeContract(contractName, proxyAddress);
      
      // 验证新的实现合约
      await verifyImplementation(newImplementationAddress);
      
      results.success.push({ name: contractName, implementation: newImplementationAddress });
    } catch (error) {
      logger.error(`升级合约 ${contractName} 失败: ${error.message}`);
      results.failed.push({ name: contractName, reason: error.message });
    }
  }
  
  // 输出升级结果摘要
  logger.info("升级完成，结果摘要:");
  logger.info(`成功: ${results.success.length} 个合约`);
  for (const contract of results.success) {
    logger.info(`  - ${contract.name}: ${contract.implementation}`);
  }
  
  logger.info(`失败: ${results.failed.length} 个合约`);
  for (const contract of results.failed) {
    logger.info(`  - ${contract.name}: ${contract.reason}`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("批量升级过程中出错:", error);
      process.exit(1);
    });
}