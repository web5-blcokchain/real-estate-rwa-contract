/**
 * 智能合约验证脚本
 * 用于验证已部署的合约源代码
 */
require("dotenv").config();
const { ethers, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 导入共享模块
const { 
  logger, 
  getLogger,
  contracts 
} = require("../shared/utils");
const config = require("../shared/config");

// 获取验证专用日志记录器
const verifyLogger = getLogger("verify");

// 延迟函数
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 读取部署记录
async function getDeploymentRecord(networkName) {
  const deploymentPath = path.join(__dirname, "../deployments");
  const latestDeploymentFile = path.join(deploymentPath, `${networkName}-latest.json`);
  
  if (!fs.existsSync(latestDeploymentFile)) {
    throw new Error(`找不到网络 ${networkName} 的最新部署记录`);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(latestDeploymentFile, "utf8"));
  verifyLogger.info(`加载部署记录: ${networkName}`);
  verifyLogger.info(`部署时间: ${deploymentData.timestamp}`);
  verifyLogger.info(`部署者: ${deploymentData.deployer}`);
  
  return deploymentData;
}

// 验证部署的合约
async function verifyContract(contractName, contractAddress, constructorArguments = []) {
  verifyLogger.info(`开始验证合约: ${contractName} (${contractAddress})`);
  
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments
    });
    
    verifyLogger.info(`${contractName} 验证成功!`);
    return true;
  } catch (error) {
    // 如果合约已经验证，不视为错误
    if (error.message.includes("Already Verified") || 
        error.message.includes("Already verified")) {
      verifyLogger.info(`${contractName} 已经验证过`);
      return true;
    }
    
    verifyLogger.error(`${contractName} 验证失败: ${error.message}`);
    return false;
  }
}

// 验证带有库的合约
async function verifyContractWithLibraries(contractName, contractAddress, libraries, constructorArguments = []) {
  verifyLogger.info(`开始验证带库的合约: ${contractName} (${contractAddress})`);
  
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
      libraries: libraries
    });
    
    verifyLogger.info(`${contractName} 验证成功!`);
    return true;
  } catch (error) {
    // 如果合约已经验证，不视为错误
    if (error.message.includes("Already Verified") || 
        error.message.includes("Already verified")) {
      verifyLogger.info(`${contractName} 已经验证过`);
      return true;
    }
    
    verifyLogger.error(`${contractName} 验证失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  try {
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    const networkName = network.name !== "unknown" ? network.name : `chain-${network.chainId}`;
    const [deployer] = await ethers.getSigners();
    
    verifyLogger.info(`网络: ${networkName} (Chain ID: ${network.chainId})`);
    verifyLogger.info(`验证账户: ${deployer.address}`);
    
    // 获取部署记录
    const deploymentData = await getDeploymentRecord(networkName);
    const contractAddresses = deploymentData.contracts;
    
    // 从部署记录中获取部署地址，如果找不到则从contracts模块获取
    async function getContractAddress(name) {
      if (contractAddresses[name]) {
        return contractAddresses[name];
      }
      
      // 尝试从共享配置获取
      const configKey = name.charAt(0).toLowerCase() + name.slice(1);
      const address = contracts.getContractAddress(configKey);
      if (address) {
        return address;
      }
      
      throw new Error(`找不到合约 ${name} 的地址`);
    }
    
    // 验证库合约
    const lib1Address = await getContractAddress("SystemDeployerLib1") ||
                        contracts.getContractAddress("systemDeployerLib1");
    const lib2Address = await getContractAddress("SystemDeployerLib2") ||
                        contracts.getContractAddress("systemDeployerLib2");
    
    if (lib1Address) {
      await verifyContract("SystemDeployerLib1", lib1Address, []);
      // 验证后需要等待一些时间以避免API限制
      await sleep(3000);
    }
    
    if (lib2Address) {
      await verifyContract("SystemDeployerLib2", lib2Address, []);
      await sleep(3000);
    }
    
    // 验证部署器合约
    const deployerAddress = await getContractAddress("SystemDeployer") ||
                           contracts.getContractAddress("systemDeployer");
    
    if (deployerAddress) {
      // 创建libraries对象
      const libraries = {};
      if (lib1Address) libraries["SystemDeployerLib1"] = lib1Address;
      if (lib2Address) libraries["SystemDeployerLib2"] = lib2Address;
      
      // 查找合约构造函数参数
      const deployerArgs = [
        config.roleAddresses.superAdmin || deployer.address,
        config.roleAddresses.propertyManager || deployer.address,
        config.roleAddresses.feeCollector || deployer.address,
        config.feeConfig.tradingFee,
        config.feeConfig.tokenizationFee,
        config.feeConfig.redemptionFee,
        config.feeConfig.platformFee,
        config.feeConfig.maintenanceFee
      ];
      
      // 验证部署器合约
      await verifyContractWithLibraries(
        "SystemDeployer",
        deployerAddress,
        libraries,
        deployerArgs
      );
      await sleep(3000);
    }
    
    // 验证主要系统合约
    const mainContracts = [
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
    
    for (const contractName of mainContracts) {
      try {
        const address = await getContractAddress(contractName);
        if (address) {
          await verifyContract(contractName, address);
          await sleep(3000); // 避免API限制
        }
      } catch (error) {
        verifyLogger.warn(`跳过 ${contractName} 验证: ${error.message}`);
      }
    }
    
    // 验证Token实现合约
    try {
      const tokenImplementationAddress = contracts.getContractAddress("tokenImplementation");
      if (tokenImplementationAddress) {
        await verifyContract("PropertyToken", tokenImplementationAddress);
      }
    } catch (error) {
      verifyLogger.warn(`跳过 PropertyToken 实现合约验证: ${error.message}`);
    }
    
    verifyLogger.info("合约验证流程完成");
    
  } catch (error) {
    verifyLogger.error(`验证过程出错: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 