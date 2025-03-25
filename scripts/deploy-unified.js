/**
 * 统一部署入口
 * 支持所有网络的部署，替代原有的deploy.js和deploy-bsc-testnet.js
 */
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 导入共享模块
const { 
  logger, 
  deployUtils, 
  contracts, 
  getLogger, 
  transaction, 
  contractService 
} = require("../shared/utils");
const config = require("../shared/config");

// 获取部署专用日志记录器
const deployLogger = getLogger("deploy");

// 最大重试次数
const MAX_RETRIES = 3;
// 重试间隔（毫秒）
const RETRY_INTERVAL = 5000;

// 部署合约的辅助函数，包含重试逻辑
async function deployWithRetry(contractName, factory, deployFn, retries = 0) {
  try {
    deployLogger.info(`部署 ${contractName}... 尝试次数: ${retries + 1}`);
    return await deployFn();
  } catch (error) {
    if (retries < MAX_RETRIES) {
      deployLogger.warn(`部署 ${contractName} 失败，将在 ${RETRY_INTERVAL/1000} 秒后重试...`);
      deployLogger.warn(`错误: ${error.message}`);
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      return deployWithRetry(contractName, factory, deployFn, retries + 1);
    } else {
      deployLogger.error(`部署 ${contractName} 失败，已达到最大重试次数`);
      throw error;
    }
  }
}

// 监听部署进度的辅助函数
async function monitorDeploymentProgress(deployerContract) {
  deployLogger.info("开始监听部署进度...");
  
  // 定义部署步骤名称
  const stepNames = [
    "初始化", 
    "RoleManager", 
    "FeeManager", 
    "PropertyRegistry", 
    "RentDistributor",
    "TokenImplementation", 
    "TokenFactory", 
    "RedemptionManager", 
    "Marketplace", 
    "TokenHolderQuery", 
    "RealEstateSystem",
    "授予角色"
  ];
  
  // 设置事件过滤器
  const filter = deployerContract.filters.DeploymentProgress();
  
  // 监听事件
  deployerContract.on(filter, (step, contractName, contractAddress) => {
    deployLogger.info(`步骤 ${step}/${stepNames.length-1}: ${contractName} 部署完成 (${contractAddress})`);
    
    // 如果是最后一步，停止监听
    if (Number(step) === stepNames.length - 1) {
      deployLogger.info("所有合约部署完成！");
      deployerContract.removeAllListeners();
    }
  });
}

// 保存部署记录
function saveDeploymentRecord(deployedContracts, chainId, networkName, deployer) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const deploymentPath = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const contractNames = [
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
  
  // 创建部署记录对象
  const contractAddresses = {};
  for (let i = 0; i < contractNames.length; i++) {
    contractAddresses[contractNames[i]] = deployedContracts[i];
  }
  
  const deploymentData = {
    network: networkName,
    chainId: chainId,
    timestamp: timestamp,
    deployer: deployer,
    contracts: contractAddresses
  };
  
  // 保存部署记录
  const deploymentFile = path.join(deploymentPath, `${networkName}-${timestamp}.json`);
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
  
  // 同时更新共享配置中的合约地址
  Object.entries(contractAddresses).forEach(([name, address]) => {
    const configKey = name.charAt(0).toLowerCase() + name.slice(1);
    contracts.updateContractAddress(configKey, address);
  });
  
  // 保存到deploy-state.json
  contracts.saveToDeployState();
  
  deployLogger.info(`部署记录已保存到: ${deploymentFile}`);
}

// 逐步部署系统的辅助函数
async function deployStep(deployer_contract, step) {
  deployLogger.info(`部署步骤 ${step}...`);
  
  // 使用共享的交易执行工具
  await transaction.executeTransaction(
    deployer_contract,
    'deployStep',
    [step],
    {
      operation: `部署步骤 ${step}`,
      estimateGas: true,
      safetyMargin: 0.2,
      priority: 'medium'
    }
  );
  
  deployLogger.info(`步骤 ${step} 已完成`);
}

async function main() {
  try {
    // 获取网络和部署者信息
    const [deployer] = await ethers.getSigners();
    const chainId = await deployer.getChainId();
    const network = await ethers.provider.getNetwork();
    const networkName = network.name !== 'unknown' ? network.name : `chain-${chainId}`;
    const balance = ethers.utils.formatEther(await deployer.getBalance());
    
    // 记录部署信息
    deployLogger.info(`部署网络: ${networkName} (Chain ID: ${chainId})`);
    deployLogger.info(`部署账户: ${deployer.address}`);
    deployLogger.info(`账户余额: ${balance} ETH`);
    
    // 检查余额是否足够
    if (parseFloat(balance) < 0.1) {
      deployLogger.warn(`警告: 账户余额较低 (${balance} ETH), 可能无法完成部署`);
    }
    
    // 库合约部署
    deployLogger.info("部署库合约...");
    
    // 部署 SystemDeployerLib1
    const SystemDeployerLib1 = await ethers.getContractFactory("SystemDeployerLib1");
    const lib1 = await deployUtils.deployContract(
      SystemDeployerLib1,
      "SystemDeployerLib1",
      [],
      { verify: true }
    );
    
    // 部署 SystemDeployerLib2
    const SystemDeployerLib2 = await ethers.getContractFactory("SystemDeployerLib2");
    const lib2 = await deployUtils.deployContract(
      SystemDeployerLib2,
      "SystemDeployerLib2",
      [],
      { verify: true }
    );
    
    // 链接库合约到SystemDeployer
    deployLogger.info("链接库合约到SystemDeployer...");
    const libraries = {
      SystemDeployerLib1: lib1.contractAddress,
      SystemDeployerLib2: lib2.contractAddress
    };
    
    await deployUtils.linkLibraries(libraries, ["SystemDeployer"]);
    
    // 部署SystemDeployer合约
    const SystemDeployer = await ethers.getContractFactory("SystemDeployer", {
      libraries: libraries
    });
    
    const deployerConfig = {
      superAdmin: config.roleAddresses.superAdmin || deployer.address,
      propertyManager: config.roleAddresses.propertyManager || deployer.address,
      feeCollector: config.roleAddresses.feeCollector || deployer.address,
      tradingFee: config.feeConfig.tradingFee,
      tokenizationFee: config.feeConfig.tokenizationFee,
      redemptionFee: config.feeConfig.redemptionFee,
      platformFee: config.feeConfig.platformFee,
      maintenanceFee: config.feeConfig.maintenanceFee
    };
    
    deployLogger.info("部署SystemDeployer合约...");
    deployLogger.info(`配置参数: ${JSON.stringify(deployerConfig)}`);
    
    const deployerResult = await deployUtils.deployContract(
      SystemDeployer,
      "SystemDeployer",
      [
        deployerConfig.superAdmin,
        deployerConfig.propertyManager,
        deployerConfig.feeCollector,
        deployerConfig.tradingFee,
        deployerConfig.tokenizationFee,
        deployerConfig.redemptionFee,
        deployerConfig.platformFee,
        deployerConfig.maintenanceFee
      ],
      {
        gasLimit: 8000000,
        verify: true
      }
    );
    
    const deployer_contract = SystemDeployer.attach(deployerResult.contractAddress);
    
    // 监听部署进度
    monitorDeploymentProgress(deployer_contract);
    
    // 执行部署步骤
    const totalSteps = 12; // 总共12个步骤
    
    for (let step = 0; step < totalSteps; step++) {
      await deployStep(deployer_contract, step);
    }
    
    // 获取部署结果
    deployLogger.info("获取部署结果...");
    const deployedContracts = await deployer_contract.getDeployedContracts();
    
    // 保存部署记录
    saveDeploymentRecord(deployedContracts, chainId, networkName, deployer.address);
    
    // 初始化合约服务
    contractService.initialize(contracts.getContractAddresses());
    
    deployLogger.info("部署完成！");
    
  } catch (error) {
    deployLogger.error(`部署失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });