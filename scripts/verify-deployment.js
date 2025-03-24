const { ethers } = require("hardhat");
const fs = require("fs");
const { getLogger } = require("./utils/logger");
const verifyLogger = getLogger("verify");

// 部署状态文件
const DEPLOY_STATE_FILE = "deploy-state.json";

// 加载部署状态
function loadDeployState() {
  try {
    if (fs.existsSync(DEPLOY_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(DEPLOY_STATE_FILE, 'utf8'));
      return state;
    }
  } catch (error) {
    verifyLogger.error(`加载部署状态文件失败: ${error.message}`);
  }
  return null;
}

// 加载部署记录
function loadDeployment(network) {
  try {
    const deploymentPath = `./deployments/${network}-latest.json`;
    if (fs.existsSync(deploymentPath)) {
      return JSON.parse(fs.readFileSync(deploymentPath));
    }
    verifyLogger.warn(`未找到${network}网络的部署记录，尝试使用部署状态文件`);
    return null;
  } catch (error) {
    verifyLogger.error(`加载部署记录失败: ${error.message}`);
    return null;
  }
}

// 获取部署信息（兼容两种部署方式）
async function getDeploymentInfo() {
  // 先尝试获取网络名称
  const network = await ethers.provider.getNetwork();
  const networkName = network.name !== 'unknown' ? network.name : `chain-${network.chainId}`;
  
  // 先尝试从部署记录加载
  const deployment = loadDeployment(networkName);
  if (deployment) {
    return {
      network: deployment.network,
      deployer: deployment.deployer,
      contracts: deployment.contracts,
      currentStep: deployment.contracts.RealEstateSystem ? 11 : 0,
      source: "部署记录"
    };
  }
  
  // 再尝试从部署状态加载
  const state = loadDeployState();
  if (state) {
    return {
      ...state,
      source: "部署状态"
    };
  }
  
  return null;
}

// 验证RoleManager合约
async function verifyRoleManager(deployInfo) {
  verifyLogger.info("验证RoleManager合约...");
  
  const roleManagerAddress = deployInfo.contracts.RoleManager?.address || deployInfo.contracts.RoleManager;
  if (!roleManagerAddress) {
    verifyLogger.error("RoleManager合约未部署");
    return false;
  }
  
  try {
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManager = RoleManager.attach(roleManagerAddress);
    
    // 验证SUPER_ADMIN角色
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    const hasRole = await roleManager.hasRole(SUPER_ADMIN, deployInfo.deployer);
    
    if (hasRole) {
      verifyLogger.info("部署者已被授予SUPER_ADMIN角色");
    } else {
      verifyLogger.error("部署者未被授予SUPER_ADMIN角色");
      return false;
    }
    
    return true;
  } catch (error) {
    verifyLogger.error(`RoleManager验证失败: ${error.message}`);
    return false;
  }
}

// 验证FeeManager合约
async function verifyFeeManager(deployInfo) {
  verifyLogger.info("验证FeeManager合约...");
  
  const feeManagerAddress = deployInfo.contracts.FeeManager?.address || deployInfo.contracts.FeeManager;
  const roleManagerAddress = deployInfo.contracts.RoleManager?.address || deployInfo.contracts.RoleManager;
  
  if (!feeManagerAddress) {
    verifyLogger.error("FeeManager合约未部署");
    return false;
  }
  
  try {
    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = FeeManager.attach(feeManagerAddress);
    
    // 验证角色管理器地址
    const configuredRoleManager = await feeManager.roleManager();
    
    if (configuredRoleManager === roleManagerAddress) {
      verifyLogger.info("FeeManager正确引用了RoleManager");
    } else {
      verifyLogger.error(`FeeManager引用了错误的RoleManager地址: ${configuredRoleManager} 应为 ${roleManagerAddress}`);
      return false;
    }
    
    return true;
  } catch (error) {
    verifyLogger.error(`FeeManager验证失败: ${error.message}`);
    return false;
  }
}

// 验证PropertyRegistry合约
async function verifyPropertyRegistry(deployInfo) {
  verifyLogger.info("验证PropertyRegistry合约...");
  
  const propertyRegistryAddress = deployInfo.contracts.PropertyRegistry?.address || deployInfo.contracts.PropertyRegistry;
  const roleManagerAddress = deployInfo.contracts.RoleManager?.address || deployInfo.contracts.RoleManager;
  
  if (!propertyRegistryAddress) {
    verifyLogger.error("PropertyRegistry合约未部署");
    return false;
  }
  
  try {
    const PropertyRegistry = await ethers.getContractFactory("PropertyRegistry");
    const propertyRegistry = PropertyRegistry.attach(propertyRegistryAddress);
    
    // 验证角色管理器地址
    const configuredRoleManager = await propertyRegistry.roleManager();
    
    if (configuredRoleManager === roleManagerAddress) {
      verifyLogger.info("PropertyRegistry正确引用了RoleManager");
    } else {
      verifyLogger.error(`PropertyRegistry引用了错误的RoleManager地址: ${configuredRoleManager} 应为 ${roleManagerAddress}`);
      return false;
    }
    
    return true;
  } catch (error) {
    verifyLogger.error(`PropertyRegistry验证失败: ${error.message}`);
    return false;
  }
}

// 验证RealEstateSystem合约
async function verifyRealEstateSystem(deployInfo) {
  verifyLogger.info("验证RealEstateSystem合约...");
  
  const systemAddress = deployInfo.contracts.RealEstateSystem?.address || deployInfo.contracts.RealEstateSystem;
  if (!systemAddress) {
    verifyLogger.error("RealEstateSystem合约未部署");
    return false;
  }
  
  try {
    const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
    const system = RealEstateSystem.attach(systemAddress);
    
    // 验证各个组件地址
    const configuredRoleManager = await system.roleManager();
    const configuredFeeManager = await system.feeManager();
    const configuredPropertyRegistry = await system.propertyRegistry();
    const configuredTokenFactory = await system.tokenFactory();
    
    const roleManagerAddress = deployInfo.contracts.RoleManager?.address || deployInfo.contracts.RoleManager;
    const feeManagerAddress = deployInfo.contracts.FeeManager?.address || deployInfo.contracts.FeeManager;
    const propertyRegistryAddress = deployInfo.contracts.PropertyRegistry?.address || deployInfo.contracts.PropertyRegistry;
    const tokenFactoryAddress = deployInfo.contracts.TokenFactory?.address || deployInfo.contracts.TokenFactory;
    
    let allValid = true;
    
    if (configuredRoleManager !== roleManagerAddress) {
      verifyLogger.error(`RealEstateSystem引用了错误的RoleManager地址: ${configuredRoleManager} 应为 ${roleManagerAddress}`);
      allValid = false;
    }
    
    if (configuredFeeManager !== feeManagerAddress) {
      verifyLogger.error(`RealEstateSystem引用了错误的FeeManager地址: ${configuredFeeManager} 应为 ${feeManagerAddress}`);
      allValid = false;
    }
    
    if (configuredPropertyRegistry !== propertyRegistryAddress) {
      verifyLogger.error(`RealEstateSystem引用了错误的PropertyRegistry地址: ${configuredPropertyRegistry} 应为 ${propertyRegistryAddress}`);
      allValid = false;
    }
    
    if (configuredTokenFactory !== tokenFactoryAddress) {
      verifyLogger.error(`RealEstateSystem引用了错误的TokenFactory地址: ${configuredTokenFactory} 应为 ${tokenFactoryAddress}`);
      allValid = false;
    }
    
    if (allValid) {
      verifyLogger.info("RealEstateSystem正确引用了所有组件");
    }
    
    return allValid;
  } catch (error) {
    verifyLogger.error(`RealEstateSystem验证失败: ${error.message}`);
    return false;
  }
}

// 打印验证摘要
function printSummary(results) {
  verifyLogger.info("\n==========================");
  verifyLogger.info("验证摘要");
  verifyLogger.info("==========================");
  
  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    const status = passed === true ? '✅ 通过' : 
                  passed === false ? '❌ 失败' : 
                  passed === "未部署" ? '⏳ 未部署' : '❓ 未知';
    verifyLogger.info(`${name}: ${status}`);
    if (passed === false) allPassed = false;
  }
  
  verifyLogger.info("==========================");
  verifyLogger.info(`总体结果: ${allPassed ? '✅ 全部通过' : '❌ 有验证项未通过'}`);
  verifyLogger.info("==========================\n");
}

// 主函数
async function main() {
  try {
    verifyLogger.info("开始验证部署...");
    
    // 获取部署信息
    const deployInfo = await getDeploymentInfo();
    if (!deployInfo) {
      verifyLogger.error("无法加载部署信息，请确保先运行部署脚本");
      return;
    }
    
    verifyLogger.info(`已部署的网络: ${deployInfo.network}`);
    verifyLogger.info(`部署者地址: ${deployInfo.deployer}`);
    verifyLogger.info(`数据来源: ${deployInfo.source}`);
    
    if (deployInfo.currentStep < 10) {
      verifyLogger.warn("警告: 部署尚未完成，某些验证可能会失败");
    }
    
    // 执行验证
    const results = {
      "RoleManager": await verifyRoleManager(deployInfo),
      "FeeManager": await verifyFeeManager(deployInfo),
      "PropertyRegistry": await verifyPropertyRegistry(deployInfo),
      "RealEstateSystem": deployInfo.currentStep >= 10 ? await verifyRealEstateSystem(deployInfo) : "未部署"
    };
    
    // 打印摘要
    printSummary(results);
    
  } catch (error) {
    verifyLogger.error(`验证过程中出错: ${error.message}`);
    console.error(error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  // 作为模块导出
  module.exports = { main };
} 