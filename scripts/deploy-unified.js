/**
 * 统一部署入口
 * 支持所有网络的部署，替代原有的deploy.js和deploy-bsc-testnet.js
 */
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { validateEnv } = require("./utils/validate-env");
const { logger, getLogger } = require("./utils/logger");
const config = require("./config/deploy-config");

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
function saveDeploymentRecord(contracts, chainId, networkName, deployer) {
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
    contractAddresses[contractNames[i]] = contracts[i];
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
  
  deployLogger.info(`部署记录已保存到: ${deploymentFile}`);
}

// 逐步部署系统的辅助函数
async function deployStep(deployer_contract, step) {
  deployLogger.info(`部署步骤 ${step}...`);
  
  // 估算gas
  const gasEstimate = await deployer_contract.estimateGas.deployStep(step);
  const safeGas = gasEstimate.mul(120).div(100); // 增加20%的安全余量
  
  // 获取gas价格
  const gasPrice = await ethers.provider.getGasPrice();
  const fastGasPrice = gasPrice.mul(110).div(100); // 增加10%
  
  const tx = await deployer_contract.deployStep(step, {
    gasLimit: safeGas,
    gasPrice: fastGasPrice
  });
  
  deployLogger.info(`步骤 ${step} 交易已提交: ${tx.hash}`);
  await tx.wait();
  deployLogger.info(`步骤 ${step} 已完成`);
}

async function main() {
  try {
    // 验证环境变量
    deployLogger.info("验证环境变量...");
    if (!validateEnv()) {
      deployLogger.error("环境变量验证失败，中止部署");
      return;
    }
    deployLogger.info("环境变量验证通过");
    
    // 获取网络和部署者信息
    const [deployer] = await ethers.getSigners();
    const chainId = await deployer.getChainId();
    const network = await ethers.provider.getNetwork();
    const networkName = network.name !== 'unknown' ? network.name : `chain-${chainId}`;
    const balance = ethers.utils.formatEther(await deployer.getBalance());
    
    // 记录部署信息
    deployLogger.deployStart(networkName);
    deployLogger.info(`部署账户: ${deployer.address}`);
    deployLogger.info(`账户余额: ${balance}`);
    
    // 检查余额是否足够
    if (parseFloat(balance) < 0.1) {
      deployLogger.warn(`警告: 账户余额较低 (${balance} ETH), 可能无法完成部署`);
    }
    
    // 启动本地区块链网络
    if (networkName === 'localhost' || networkName === 'hardhat') {
      deployLogger.info("正在使用本地网络，确保本地节点已启动");
    }
    
    // 部署SystemDeployer合约
    deployLogger.info("部署 SystemDeployer...");
    
    const SystemDeployer = await ethers.getContractFactory("SystemDeployer");
    const deployerContractFn = () => SystemDeployer.deploy();
    const deployer_contract = await deployWithRetry("SystemDeployer", SystemDeployer, deployerContractFn);
    
    await deployer_contract.deployed();
    deployLogger.info(`SystemDeployer部署成功: ${deployer_contract.address}`);
    
    // 设置部署进度监听
    await monitorDeploymentProgress(deployer_contract);
    
    // 逐步部署系统
    deployLogger.info("开始逐步部署系统...");
    
    // 部署总共11个步骤
    for (let step = 1; step <= 11; step++) {
      try {
        await deployStep(deployer_contract, step);
      } catch (error) {
        deployLogger.error(`步骤 ${step} 部署失败: ${error.message}`);
        throw error;
      }
    }
    
    deployLogger.info("系统部署完成");
    
    // 获取部署的合约地址
    const contracts = await deployer_contract.getDeployedContracts();
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
    
    const contractAddresses = {};
    for (let i = 0; i < contractNames.length; i++) {
      contractAddresses[contractNames[i]] = contracts[i];
      deployLogger.info(`${contractNames[i]}: ${contracts[i]}`);
    }
    
    // 保存部署记录
    saveDeploymentRecord(contracts, chainId, networkName, deployer.address);
    
    // 完成部署日志
    deployLogger.deployComplete(networkName, contractAddresses);
    
    // 停止事件监听
    deployer_contract.removeAllListeners();
    
  } catch (error) {
    deployLogger.error(`部署失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 运行主函数
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