const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 合约名称数组
const contractNames = [
  "RoleManager",
  "FeeManager",
  "PropertyRegistry", 
  "RentDistributor",
  "RealEstateToken", // 代币实现
  "TokenFactory",
  "RedemptionManager",
  "Marketplace",
  "TokenHolderQuery",
  "RealEstateSystem"
];

// 记录部署状态的文件
const DEPLOY_STATE_FILE = "deploy-state.json";

// 创建初始部署状态
async function initDeployState() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0].address;
  
  const initialState = {
    network: (await ethers.provider.getNetwork()).name,
    deployer,
    timestamp: new Date().toISOString(),
    contracts: {},
    status: "initialized",
    currentStep: 0
  };
  
  saveDeployState(initialState);
  console.log(`部署状态初始化完成。部署者地址: ${deployer}`);
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
    console.error("加载部署状态文件失败:", error);
  }
  return null;
}

// 保存部署状态
function saveDeployState(state) {
  fs.writeFileSync(DEPLOY_STATE_FILE, JSON.stringify(state, null, 2));
  console.log("部署状态已保存。");
}

// 部署单个合约
async function deployContract(contractName, constructorArgs = [], initializeArgs = []) {
  console.log(`正在部署 ${contractName}...`);
  
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
  
  console.log(`${contractName} 已部署到地址: ${contract.address}`);
  return contract;
}

// 为部署者授予SUPER_ADMIN角色
async function grantSuperAdminRole(roleManagerAddress, deployerAddress) {
  console.log("正在授予SUPER_ADMIN角色...");
  
  // 获取RoleManager合约
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = RoleManager.attach(roleManagerAddress);
  
  // 获取SUPER_ADMIN角色的ID
  const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
  
  // 检查部署者是否已经拥有角色
  const hasRole = await roleManager.hasRole(SUPER_ADMIN, deployerAddress);
  if (hasRole) {
    console.log("部署者已拥有SUPER_ADMIN角色");
    return;
  }
  
  // 授予角色
  const tx = await roleManager.grantRole(SUPER_ADMIN, deployerAddress);
  await tx.wait();
  
  console.log(`SUPER_ADMIN角色已授予部署者(${deployerAddress})`);
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
  console.log("\n======= 部署状态 =======");
  console.log(`网络: ${state.network}`);
  console.log(`部署者: ${state.deployer}`);
  console.log(`当前步骤: ${state.currentStep} / ${contractNames.length + 1}`);
  console.log(`状态: ${state.status}`);
  
  console.log("\n已部署的合约:");
  for (const [name, details] of Object.entries(state.contracts)) {
    console.log(`- ${name}: ${details.address}`);
  }
  
  console.log("\n下一步:");
  if (state.currentStep < contractNames.length) {
    console.log(`部署 ${contractNames[state.currentStep]}`);
  } else if (state.currentStep === contractNames.length) {
    console.log("授予SUPER_ADMIN角色");
  } else {
    console.log("部署已完成");
  }
  console.log("========================\n");
}

// 主函数
async function main() {
  try {
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
      console.log("使用方法:");
      console.log("  npx hardhat run scripts/manual-deploy.js --network <network_name> next - 执行下一个部署步骤");
      console.log("  npx hardhat run scripts/manual-deploy.js --network <network_name> step <number> - 执行指定的部署步骤");
      console.log("  npx hardhat run scripts/manual-deploy.js --network <network_name> status - 显示当前部署状态");
      return;
    }
    
    // 解析命令
    const command = args[0];
    
    if (command === "next") {
      // 执行下一步
      const nextStep = state.currentStep + 1;
      if (nextStep > contractNames.length + 1) {
        console.log("部署已完成。没有更多步骤。");
        return;
      }
      
      state = await executeDeployStep(state, nextStep);
      printDeployStatus(state);
    } else if (command === "step" && args.length > 1) {
      // 执行指定步骤
      const step = parseInt(args[1]);
      if (isNaN(step) || step < 1 || step > contractNames.length + 1) {
        console.error(`无效的步骤: ${args[1]}`);
        return;
      }
      
      state = await executeDeployStep(state, step);
      printDeployStatus(state);
    } else if (command === "status") {
      // 打印当前状态
      printDeployStatus(state);
    } else {
      console.error(`未知命令: ${command}`);
    }
  } catch (error) {
    console.error("部署出错:", error);
  }
}

// 运行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 