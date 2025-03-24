/**
 * 统一部署入口
 * 支持所有网络的部署，替代原有的deploy.js和deploy-bsc-testnet.js
 */
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const logger = require("./utils/logger");
const config = require("./config/deploy-config");
const { 
  deployUpgradeable, 
  getContract,
  getRoles
} = require("./utils/deploy-utils");

// 在main函数开始处添加
const validateEnv = require("./utils/validate-env");

async function main() {
  // 验证环境变量
  if (!validateEnv()) {
    logger.error("环境变量验证失败，部署终止");
    process.exit(1);
  }
  
  // 获取当前网络信息
  const network = await ethers.provider.getNetwork();
  const networkName = hre.network.name;
  logger.info(`部署到网络: ${networkName} (chainId: ${network.chainId})`);
  
  // 检查网络是否支持
  const supportedNetworks = Object.keys(hre.config.networks);
  if (!supportedNetworks.includes(networkName)) {
    logger.error(`不支持的网络: ${networkName}`);
    process.exit(1);
  }
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  logger.info(`部署账户: ${deployer.address}`);
  logger.info(`账户余额: ${ethers.utils.formatEther(await deployer.getBalance())}`);
  
  // 创建部署记录目录
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  // 部署记录对象
  const deployedContracts = {};
  
  try {
    logger.deployStart(networkName);
    
    // 按照配置的顺序部署合约
    for (const contractName of config.deploymentOrder) {
      logger.info(`部署 ${contractName}...`);
      
      // 获取初始化参数
      let args = [];
      if (config.initializationParams[contractName]) {
        args = config.initializationParams[contractName].map(paramName => {
          if (deployedContracts[paramName]) {
            return deployedContracts[paramName];
          }
          logger.error(`找不到参数 ${paramName} 的地址，请确保按正确顺序部署`);
          throw new Error(`找不到参数 ${paramName} 的地址`);
        });
      }
      
      // 部署合约
      const contract = await deployUpgradeable(contractName, args);
      deployedContracts[contractName] = contract.address;
      logger.info(`${contractName} 已部署到: ${contract.address}`);
    }
    
    // 初始化系统
    logger.info("初始化系统...");
    
    // 获取合约实例
    const realEstateSystem = await getContract(
      "RealEstateSystem",
      deployedContracts.RealEstateSystem
    );
    const roleManager = await getContract(
      "RoleManager",
      deployedContracts.RoleManager
    );
    const feeManager = await getContract(
      "FeeManager",
      deployedContracts.FeeManager
    );
    
    // 设置系统合约地址
    logger.info("设置系统合约地址...");
    await realEstateSystem.setSystemContracts(
      deployedContracts.RoleManager,
      deployedContracts.FeeManager,
      deployedContracts.PropertyRegistry,
      deployedContracts.TokenFactory,
      deployedContracts.RedemptionManager,
      deployedContracts.RentDistributor,
      deployedContracts.Marketplace,
      deployedContracts.TokenHolderQuery
    );
    
    // 设置角色
    logger.info("设置角色...");
    const roles = getRoles();
    const superAdminAddress = config.roles.superAdmin || deployer.address;
    const propertyManagerAddress = config.roles.propertyManager || deployer.address;
    const feeCollectorAddress = config.roles.feeCollector || deployer.address;
    
    await roleManager.grantRole(roles.SUPER_ADMIN, superAdminAddress);
    await roleManager.grantRole(roles.PROPERTY_MANAGER, propertyManagerAddress);
    await roleManager.grantRole(roles.FEE_COLLECTOR, feeCollectorAddress);
    
    // 设置费用
    logger.info("设置费用...");
    await feeManager.updateFee("trading", config.fees.trading);
    await feeManager.updateFee("tokenization", config.fees.tokenization);
    await feeManager.updateFee("redemption", config.fees.redemption);
    await feeManager.updateFee("platform", config.fees.platform);
    
    // 激活系统
    logger.info("激活系统...");
    await realEstateSystem.setSystemStatus(true);
    
    logger.info("系统初始化完成");
    
    // 保存部署记录
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const deploymentFile = path.join(deploymentPath, `${networkName}-${timestamp}.json`);
    const deploymentData = {
      network: networkName,
      chainId: network.chainId,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: deployedContracts
    };
    
    fs.writeFileSync(
      deploymentFile,
      JSON.stringify(deploymentData, null, 2)
    );
    
    // 更新最新部署记录
    const latestDeploymentFile = path.join(deploymentPath, `${networkName}-latest.json`);
    fs.writeFileSync(
      latestDeploymentFile,
      JSON.stringify(deploymentData, null, 2)
    );
    
    logger.info(`部署记录已保存到: ${deploymentFile}`);
    logger.info(`最新部署记录已更新: ${latestDeploymentFile}`);
    
    // 如果需要验证合约
    if (config.deployment.verify) {
      logger.info("生成验证脚本...");
      generateVerificationScript(networkName, deployedContracts);
    }
    
    logger.deployComplete(networkName, deployedContracts);
    
  } catch (error) {
    logger.error(`部署失败: ${error.message}`);
    logger.error(error.stack);
    
    // 记录错误到文件
    const errorLog = path.join(__dirname, "../logs");
    if (!fs.existsSync(errorLog)) {
      fs.mkdirSync(errorLog, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const errorLogFile = path.join(errorLog, `deploy-error-${timestamp}.log`);
    
    fs.writeFileSync(
      errorLogFile,
      `部署错误时间: ${new Date().toISOString()}\n` +
      `网络: ${networkName}\n` +
      `错误信息: ${error.message}\n` +
      `错误堆栈: ${error.stack}\n`
    );
    
    throw error;
  }
  
  return deployedContracts;
}

function generateVerificationScript(networkName, contracts) {
  const verifyScriptPath = path.join(__dirname, `verify-${networkName}.js`);
  let verifyScript = `
const hre = require("hardhat");

async function main() {
  console.log("开始验证${networkName}合约...");
  
`;

  // 为每个合约生成验证代码
  for (const [contractName, address] of Object.entries(contracts)) {
    let constructorArgs = "[]";
    
    // 根据合约类型设置构造函数参数
    if (contractName === "PropertyRegistry") {
      constructorArgs = `["${contracts.RoleManager}"]`;
    } else if (contractName === "TokenFactory") {
      constructorArgs = `["${contracts.PropertyRegistry}"]`;
    } else if (contractName === "RedemptionManager") {
      constructorArgs = `["${contracts.PropertyRegistry}"]`;
    } else if (contractName === "RentDistributor" || contractName === "Marketplace" || contractName === "TokenHolderQuery") {
      constructorArgs = `["${contracts.TokenFactory}"]`;
    }
    
    verifyScript += `  // 验证${contractName}
  try {
    await hre.run("verify:verify", {
      address: "${address}",
      constructorArguments: ${constructorArgs}
    });
    console.log("${contractName} 验证成功");
  } catch (error) {
    console.error("${contractName} 验证失败:", error.message);
  }
  
`;
  }
  
  verifyScript += `  console.log("验证完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

  fs.writeFileSync(verifyScriptPath, verifyScript);
  logger.info(`验证脚本已生成: ${verifyScriptPath}`);
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("部署过程中出错:", error);
      process.exit(1);
    });
} else {
  // 作为模块导出
  module.exports = { main };
}