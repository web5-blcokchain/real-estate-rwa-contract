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
  getLogger, 
  transaction, 
  contractService 
} = require("../shared/utils");
const config = require("../shared/config");
const contracts = require("../shared/config/contracts");

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
    // Convert BigInt to string if needed
    const address = deployedContracts[i];
    contractAddresses[contractNames[i]] = typeof address === 'bigint' ? address.toString() : address;
  }
  
  const deploymentData = {
    network: networkName,
    chainId: chainId.toString(), // Convert chainId to string
    timestamp: timestamp,
    deployer: deployer,
    contracts: contractAddresses
  };
  
  // 保存部署记录，使用自定义replacer处理BigInt
  const replacer = (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  };
  
  // 保存部署记录
  const deploymentFile = path.join(deploymentPath, `${networkName}-${timestamp}.json`);
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(deploymentData, replacer, 2)
  );
  
  // 更新最新部署记录
  const latestDeploymentFile = path.join(deploymentPath, `${networkName}-latest.json`);
  fs.writeFileSync(
    latestDeploymentFile,
    JSON.stringify(deploymentData, replacer, 2)
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
    const [signer] = await ethers.getSigners();
    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    const network = await ethers.provider.getNetwork();
    const networkName = network.name !== 'unknown' ? network.name : `chain-${chainId}`;
    const balance = ethers.formatEther(await ethers.provider.getBalance(signer.address));
    
    // 记录部署信息
    deployLogger.info(`部署网络: ${networkName} (Chain ID: ${chainId})`);
    deployLogger.info(`部署账户: ${signer.address}`);
    deployLogger.info(`账户余额: ${balance} ETH`);
    
    // 检查余额是否足够
    if (parseFloat(balance) < 0.1) {
      deployLogger.warn(`警告: 账户余额较低 (${balance} ETH), 可能无法完成部署`);
    }
    
    // 库合约部署
    deployLogger.info("部署库合约...");
    
    // 部署 SystemDeployerLib1
    const SystemDeployerLib1 = await ethers.getContractFactory("SystemDeployerLib1");
    const lib1Result = await deployUtils.deployLibrary(
      SystemDeployerLib1,
      "SystemDeployerLib1",
      {
        gasLimit: 5000000,
        priority: 'medium'
      }
    );
    
    if (!lib1Result.success) {
      throw new Error(`SystemDeployerLib1 部署失败: ${lib1Result.error.message}`);
    }
    
    // 部署 SystemDeployerLib2
    const SystemDeployerLib2 = await ethers.getContractFactory("SystemDeployerLib2");
    const lib2Result = await deployUtils.deployLibrary(
      SystemDeployerLib2,
      "SystemDeployerLib2",
      {
        gasLimit: 5000000,
        priority: 'medium'
      }
    );
    
    if (!lib2Result.success) {
      throw new Error(`SystemDeployerLib2 部署失败: ${lib2Result.error.message}`);
    }
    
    // 部署主合约
    deployLogger.info("部署主合约...");
    const SystemDeployer = await ethers.getContractFactory("SystemDeployer", {
      libraries: {
        SystemDeployerLib1: lib1Result.contractAddress,
        SystemDeployerLib2: lib2Result.contractAddress
      }
    });
    
    const deployerResult = await deployUtils.deployContract(
      SystemDeployer,
      "SystemDeployer",
      [],
      { verify: true }
    );
    
    if (!deployerResult.success) {
      throw new Error(`SystemDeployer 部署失败: ${deployerResult.error.message}`);
    }
    
    const systemDeployer = await ethers.getContractAt("SystemDeployer", deployerResult.contractAddress);
    
    // 开始监听部署进度
    monitorDeploymentProgress(systemDeployer);
    
    // 逐步部署系统
    for (let step = 0; step < 12; step++) {
      await deployStep(systemDeployer, step);
    }
    
    // 获取部署的合约地址
    const deployedContracts = await systemDeployer.getDeployedContracts();
    
    // 保存部署记录
    saveDeploymentRecord(deployedContracts, chainId, networkName, signer.address);
    
    deployLogger.info("部署完成！");
  } catch (error) {
    deployLogger.error(`部署失败: ${error.message}`);
    throw error;
  }
}

// 执行部署
main()
  .then(() => process.exit(0))
  .catch((error) => {
    deployLogger.error(error);
    process.exit(1);
  });