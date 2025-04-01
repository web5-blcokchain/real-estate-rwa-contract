const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { logger } = require("../shared/src/logger");

async function verifyContract(address, name) {
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    logger.info(`${name} contract verified successfully`);
    return true;
  } catch (error) {
    logger.warn(`Failed to verify ${name} contract:`, error.message);
    return false;
  }
}

async function verifySystemStatus(system) {
  try {
    const status = await system.getSystemStatus();
    logger.info("System status:", status);
    return status;
  } catch (error) {
    logger.error("Failed to get system status:", error);
    return null;
  }
}

async function verifyRoles(roleManager) {
  try {
    const adminRole = await roleManager.ADMIN_ROLE();
    const managerRole = await roleManager.MANAGER_ROLE();
    const operatorRole = await roleManager.OPERATOR_ROLE();

    const admin = await roleManager.hasRole(adminRole, process.env.ADMIN_ADDRESS);
    const manager = await roleManager.hasRole(managerRole, process.env.MANAGER_ADDRESS);
    const operator = await roleManager.hasRole(operatorRole, process.env.OPERATOR_ADDRESS);

    logger.info("Role verification:", {
      admin: admin ? "✓" : "✗",
      manager: manager ? "✓" : "✗",
      operator: operator ? "✓" : "✗",
    });

    return { admin, manager, operator };
  } catch (error) {
    logger.error("Failed to verify roles:", error);
    return null;
  }
}

async function verifyPropertyManager(propertyManager) {
  try {
    const propertyCount = await propertyManager.getPropertyCount();
    logger.info("Property count:", propertyCount.toString());
    return propertyCount;
  } catch (error) {
    logger.error("Failed to verify property manager:", error);
    return null;
  }
}

async function verifyTokenFactory(tokenFactory) {
  try {
    const tokenCount = await tokenFactory.getTokenCount();
    logger.info("Token count:", tokenCount.toString());
    return tokenCount;
  } catch (error) {
    logger.error("Failed to verify token factory:", error);
    return null;
  }
}

async function verifyTradingManager(tradingManager) {
  try {
    const orderCount = await tradingManager.getOrderCount();
    logger.info("Order count:", orderCount.toString());
    return orderCount;
  } catch (error) {
    logger.error("Failed to verify trading manager:", error);
    return null;
  }
}

async function verifyRewardManager(rewardManager) {
  try {
    const distributionCount = await rewardManager.getDistributionCount();
    logger.info("Distribution count:", distributionCount.toString());
    return distributionCount;
  } catch (error) {
    logger.error("Failed to verify reward manager:", error);
    return null;
  }
}

async function main() {
  try {
    logger.info("Starting deployment verification...");

    // 读取部署信息
    const deploymentInfo = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../config/deployment.json"), "utf8")
    );

    // 获取合约实例
    const system = await hre.ethers.getContractAt(
      "RealEstateSystem",
      deploymentInfo.contracts.system
    );
    const facade = await hre.ethers.getContractAt(
      "RealEstateFacade",
      deploymentInfo.contracts.facade
    );
    const roleManager = await hre.ethers.getContractAt(
      "RoleManager",
      deploymentInfo.contracts.roleManager
    );
    const propertyManager = await hre.ethers.getContractAt(
      "PropertyManager",
      deploymentInfo.contracts.propertyManager
    );
    const tokenFactory = await hre.ethers.getContractAt(
      "PropertyToken",
      deploymentInfo.contracts.tokenFactory
    );
    const tradingManager = await hre.ethers.getContractAt(
      "TradingManager",
      deploymentInfo.contracts.tradingManager
    );
    const rewardManager = await hre.ethers.getContractAt(
      "RewardManager",
      deploymentInfo.contracts.rewardManager
    );

    // 验证合约
    if (hre.network.name !== "hardhat") {
      logger.info("Verifying contracts on Etherscan...");
      await verifyContract(deploymentInfo.contracts.systemDeployer, "SimpleSystemDeployer");
      await verifyContract(deploymentInfo.contracts.system, "RealEstateSystem");
      await verifyContract(deploymentInfo.contracts.facade, "RealEstateFacade");
      await verifyContract(deploymentInfo.contracts.roleManager, "RoleManager");
      await verifyContract(deploymentInfo.contracts.propertyManager, "PropertyManager");
      await verifyContract(deploymentInfo.contracts.tokenFactory, "PropertyToken");
      await verifyContract(deploymentInfo.contracts.tradingManager, "TradingManager");
      await verifyContract(deploymentInfo.contracts.rewardManager, "RewardManager");
    }

    // 验证系统状态
    await verifySystemStatus(system);

    // 验证角色
    await verifyRoles(roleManager);

    // 验证各个管理器
    await verifyPropertyManager(propertyManager);
    await verifyTokenFactory(tokenFactory);
    await verifyTradingManager(tradingManager);
    await verifyRewardManager(rewardManager);

    logger.info("Deployment verification completed successfully");
  } catch (error) {
    logger.error("Deployment verification failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  }); 