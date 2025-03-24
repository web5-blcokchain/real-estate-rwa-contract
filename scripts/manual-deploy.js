const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { getLogger } = require("./utils/logger");
const { validateEnv } = require("./utils/validate-env");
const config = require("./config/deploy-config");

const deployLogger = getLogger("manual-deploy");

// 记录部署状态的文件
const DEPLOY_STATE_FILE = "deploy-state.json";

// 部署步骤和合约名称数组（从配置文件中获取）
const contractNames = config.deploymentOrder;

// 创建初始部署状态
async function initDeployState() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0].address;
  const network = await ethers.provider.getNetwork();
  const networkName = network.name !== 'unknown' ? network.name : `chain-${network.chainId}`;
  
  const initialState = {
    network: networkName,
    chainId: network.chainId,
    deployer,
    timestamp: new Date().toISOString(),
    contracts: {},
    status: "initialized",
    currentStep: 0
  };
  
  saveDeployState(initialState);
  deployLogger.info(`部署状态初始化完成。部署者地址: ${deployer}`);
  return initialState;
}

// 加载部署状态
function loadDeployState() {
  try {
    if (fs.existsSync(DEPLOY_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(DEPLOY_STATE_FILE, 'utf8'));
      return state;
    }
  } catch (error) {
    deployLogger.error(`加载部署状态文件失败: ${error.message}`);
  }
  return null;
}

// 保存部署状态
function saveDeployState(state) {
  fs.writeFileSync(DEPLOY_STATE_FILE, JSON.stringify(state, null, 2));
  deployLogger.info("部署状态已保存。");
}

// 部署单个合约
async function deployContract(contractName, constructorArgs = [], initializeArgs = []) {
  deployLogger.info(`正在部署 ${contractName}...`);
  
  const ContractFactory = await ethers.getContractFactory(contractName);
  
  // 处理代币实现合约的特殊情况（无需代理）
  if (contractName === "RealEstateToken") {
    const contract = await ContractFactory.deploy();
    await contract.deployed();
    return contract;
  }
  
  // 使用代理部署可升级合约
  const contract = await upgrades.deployProxy(ContractFactory, initializeArgs);
  await contract.deployed();
  
  deployLogger.info(`${contractName} 已部署到地址: ${contract.address}`);
  return contract;
}

// 为部署者授予SUPER_ADMIN角色
async function grantSuperAdminRole(roleManagerAddress, deployerAddress) {
  deployLogger.info("正在授予SUPER_ADMIN角色...");
  
  // 获取RoleManager合约
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = RoleManager.attach(roleManagerAddress);
  
  // 获取SUPER_ADMIN角色的ID
  const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
  
  // 检查部署者是否已经拥有角色
  const hasRole = await roleManager.hasRole(SUPER_ADMIN, deployerAddress);
  if (hasRole) {
    deployLogger.info("部署者已拥有SUPER_ADMIN角色");
    return;
  }
  
  // 授予角色
  const tx = await roleManager.grantRole(SUPER_ADMIN, deployerAddress);
  await tx.wait();
  
  deployLogger.info(`SUPER_ADMIN角色已授予部署者(${deployerAddress})`);
}

// 执行部署步骤
async function executeDeployStep(state, step) {
  if (step <= 0 || step > contractNames.length + 1) {
    throw new Error(`无效的步骤: ${step}`);
  }
  
  if (step === contractNames.length + 1) {
    // 最后一步：授予角色
    await grantSuperAdminRole(state.contracts.RoleManager.address, state.deployer);
    state.status = "completed";
  } else {
    // 部署合约
    const contractName = contractNames[step - 1];
    const initArgs = getInitializeArgs(state, contractName);
    const contract = await deployContract(contractName, [], initArgs);
    
    // 更新状态
    state.contracts[contractName] = {
      address: contract.address,
      deployedAt: new Date().toISOString()
    };
  }
  
  state.currentStep = step;
  saveDeployState(state);
  
  return state;
}

// 获取合约初始化参数
function getInitializeArgs(state, contractName) {
  // 获取初始化依赖
  const dependencies = config.initializationParams[contractName] || [];
  
  // 根据合约名称返回合适的初始化参数
  switch (contractName) {
    case "RoleManager":
      return [];
    case "FeeManager":
      return [state.contracts.RoleManager.address];
    case "PropertyRegistry":
      return [state.contracts.RoleManager.address];
    case "RentDistributor":
      return [state.contracts.RoleManager.address];
    case "RealEstateToken":
      return []; // 实现合约不需要初始化
    case "TokenFactory":
      return [
        state.contracts.RoleManager.address,
        state.contracts.PropertyRegistry.address,
        state.contracts.RealEstateToken.address
      ];
    case "RedemptionManager":
      return [
        state.contracts.RoleManager.address,
        state.contracts.PropertyRegistry.address
      ];
    case "Marketplace":
      return [
        state.contracts.RoleManager.address,
        state.contracts.FeeManager.address
      ];
    case "TokenHolderQuery":
      return [];
    case "RealEstateSystem":
      return [
        state.contracts.RoleManager.address,
        state.contracts.FeeManager.address,
        state.contracts.PropertyRegistry.address,
        state.contracts.TokenFactory.address,
        state.contracts.RedemptionManager.address,
        state.contracts.RentDistributor.address,
        state.contracts.Marketplace.address,
        state.contracts.TokenHolderQuery.address
      ];
    default:
      return [];
  }
}

// 打印部署状态
function printDeployStatus(state) {
  deployLogger.info("\n======= 部署状态 =======");
  deployLogger.info(`网络: ${state.network} (chainId: ${state.chainId})`);
  deployLogger.info(`部署者: ${state.deployer}`);
  deployLogger.info(`当前步骤: ${state.currentStep} / ${contractNames.length + 1}`);
  deployLogger.info(`状态: ${state.status}`);
  
  deployLogger.info("\n已部署的合约:");
  for (const [name, details] of Object.entries(state.contracts)) {
    deployLogger.info(`- ${name}: ${details.address}`);
  }
  
  deployLogger.info("\n下一步:");
  if (state.currentStep < contractNames.length) {
    deployLogger.info(`部署 ${contractNames[state.currentStep]}`);
  } else if (state.currentStep === contractNames.length) {
    deployLogger.info("授予SUPER_ADMIN角色");
  } else {
    deployLogger.info("部署已完成");
  }
  deployLogger.info("========================\n");
}

// 将部署状态转换为deployments格式并保存
function saveToDeployments(state) {
  if (state.status !== "completed") {
    deployLogger.warn("部署未完成，不保存到deployments目录");
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const deploymentPath = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  // 创建部署记录对象
  const contractAddresses = {};
  for (const [name, details] of Object.entries(state.contracts)) {
    contractAddresses[name] = details.address;
  }
  
  const deploymentData = {
    network: state.network,
    chainId: state.chainId,
    timestamp: timestamp,
    deployer: state.deployer,
    contracts: contractAddresses
  };
  
  // 保存部署记录
  const deploymentFile = path.join(deploymentPath, `${state.network}-${timestamp}.json`);
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(deploymentData, null, 2)
  );
  
  // 更新最新部署记录
  const latestDeploymentFile = path.join(deploymentPath, `${state.network}-latest.json`);
  fs.writeFileSync(
    latestDeploymentFile,
    JSON.stringify(deploymentData, null, 2)
  );
  
  deployLogger.info(`部署记录已保存到: ${deploymentFile}`);
}

// 主函数
async function main() {
  try {
    // 验证环境变量
    if (!validateEnv(false)) {
      deployLogger.warn("环境变量验证有警告，但将继续部署");
    }
    
    // 检查部署状态
    let state = loadDeployState();
    
    if (!state) {
      // 初始化新的部署状态
      state = await initDeployState();
    }
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    if (args.length === 0) {
      // 没有参数，打印当前状态
      printDeployStatus(state);
      deployLogger.info("使用方法:");
      deployLogger.info("  npx hardhat run scripts/manual-deploy.js --network <network_name> next - 执行下一个部署步骤");
      deployLogger.info("  npx hardhat run scripts/manual-deploy.js --network <network_name> step <number> - 执行指定的部署步骤");
      deployLogger.info("  npx hardhat run scripts/manual-deploy.js --network <network_name> status - 显示当前部署状态");
      deployLogger.info("  npx hardhat run scripts/manual-deploy.js --network <network_name> save - 将部署状态保存到deployments目录");
      return;
    }
    
    // 解析命令
    const command = args[0];
    
    if (command === "next") {
      // 执行下一步
      const nextStep = state.currentStep + 1;
      if (nextStep > contractNames.length + 1) {
        deployLogger.info("部署已完成。没有更多步骤。");
        return;
      }
      
      state = await executeDeployStep(state, nextStep);
      printDeployStatus(state);
      
      // 如果部署完成，保存到deployments目录
      if (state.status === "completed") {
        saveToDeployments(state);
      }
    } else if (command === "step" && args.length > 1) {
      // 执行指定步骤
      const step = parseInt(args[1]);
      if (isNaN(step) || step < 1 || step > contractNames.length + 1) {
        deployLogger.error(`无效的步骤: ${args[1]}`);
        return;
      }
      
      state = await executeDeployStep(state, step);
      printDeployStatus(state);
      
      // 如果部署完成，保存到deployments目录
      if (state.status === "completed") {
        saveToDeployments(state);
      }
    } else if (command === "status") {
      // 显示当前状态
      printDeployStatus(state);
    } else if (command === "save") {
      // 强制保存到deployments目录
      saveToDeployments(state);
    } else {
      deployLogger.error(`未知命令: ${command}`);
      deployLogger.info("使用方法:");
      deployLogger.info("  npx hardhat run scripts/manual-deploy.js --network <network_name> next - 执行下一个部署步骤");
      deployLogger.info("  npx hardhat run scripts/manual-deploy.js --network <network_name> step <number> - 执行指定的部署步骤");
      deployLogger.info("  npx hardhat run scripts/manual-deploy.js --network <network_name> status - 显示当前部署状态");
      deployLogger.info("  npx hardhat run scripts/manual-deploy.js --network <network_name> save - 将部署状态保存到deployments目录");
    }
  } catch (error) {
    deployLogger.error(`部署过程中出错: ${error.message}`);
    console.error(error);
    process.exit(1);
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