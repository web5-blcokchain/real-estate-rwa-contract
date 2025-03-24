const { ethers } = require("hardhat");
const fs = require("fs");

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
    console.error("加载部署状态文件失败:", error);
  }
  return null;
}

// 验证RoleManager合约
async function verifyRoleManager(state) {
  console.log("\n🔍 验证RoleManager合约...");
  
  if (!state.contracts.RoleManager) {
    console.error("❌ RoleManager合约未部署");
    return false;
  }
  
  try {
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManager = RoleManager.attach(state.contracts.RoleManager.address);
    
    // 验证SUPER_ADMIN角色
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    const hasRole = await roleManager.hasRole(SUPER_ADMIN, state.deployer);
    
    if (hasRole) {
      console.log("✅ 部署者已被授予SUPER_ADMIN角色");
    } else {
      console.error("❌ 部署者未被授予SUPER_ADMIN角色");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("❌ RoleManager验证失败:", error.message);
    return false;
  }
}

// 验证FeeManager合约
async function verifyFeeManager(state) {
  console.log("\n🔍 验证FeeManager合约...");
  
  if (!state.contracts.FeeManager) {
    console.error("❌ FeeManager合约未部署");
    return false;
  }
  
  try {
    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = FeeManager.attach(state.contracts.FeeManager.address);
    
    // 验证角色管理器地址
    const roleManagerAddress = await feeManager.roleManager();
    
    if (roleManagerAddress === state.contracts.RoleManager.address) {
      console.log("✅ FeeManager正确引用了RoleManager");
    } else {
      console.error("❌ FeeManager引用了错误的RoleManager地址");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("❌ FeeManager验证失败:", error.message);
    return false;
  }
}

// 验证PropertyRegistry合约
async function verifyPropertyRegistry(state) {
  console.log("\n🔍 验证PropertyRegistry合约...");
  
  if (!state.contracts.PropertyRegistry) {
    console.error("❌ PropertyRegistry合约未部署");
    return false;
  }
  
  try {
    const PropertyRegistry = await ethers.getContractFactory("PropertyRegistry");
    const propertyRegistry = PropertyRegistry.attach(state.contracts.PropertyRegistry.address);
    
    // 验证角色管理器地址
    const roleManagerAddress = await propertyRegistry.roleManager();
    
    if (roleManagerAddress === state.contracts.RoleManager.address) {
      console.log("✅ PropertyRegistry正确引用了RoleManager");
    } else {
      console.error("❌ PropertyRegistry引用了错误的RoleManager地址");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("❌ PropertyRegistry验证失败:", error.message);
    return false;
  }
}

// 验证RealEstateSystem合约
async function verifyRealEstateSystem(state) {
  console.log("\n🔍 验证RealEstateSystem合约...");
  
  if (!state.contracts.RealEstateSystem) {
    console.error("❌ RealEstateSystem合约未部署");
    return false;
  }
  
  try {
    const RealEstateSystem = await ethers.getContractFactory("RealEstateSystem");
    const system = RealEstateSystem.attach(state.contracts.RealEstateSystem.address);
    
    // 验证各个组件地址
    const roleManagerAddress = await system.roleManager();
    const feeManagerAddress = await system.feeManager();
    const propertyRegistryAddress = await system.propertyRegistry();
    const tokenFactoryAddress = await system.tokenFactory();
    
    let allValid = true;
    
    if (roleManagerAddress !== state.contracts.RoleManager.address) {
      console.error("❌ RealEstateSystem引用了错误的RoleManager地址");
      allValid = false;
    }
    
    if (feeManagerAddress !== state.contracts.FeeManager.address) {
      console.error("❌ RealEstateSystem引用了错误的FeeManager地址");
      allValid = false;
    }
    
    if (propertyRegistryAddress !== state.contracts.PropertyRegistry.address) {
      console.error("❌ RealEstateSystem引用了错误的PropertyRegistry地址");
      allValid = false;
    }
    
    if (tokenFactoryAddress !== state.contracts.TokenFactory.address) {
      console.error("❌ RealEstateSystem引用了错误的TokenFactory地址");
      allValid = false;
    }
    
    if (allValid) {
      console.log("✅ RealEstateSystem正确引用了所有组件");
    }
    
    return allValid;
  } catch (error) {
    console.error("❌ RealEstateSystem验证失败:", error.message);
    return false;
  }
}

// 打印验证摘要
function printSummary(results) {
  console.log("\n==========================");
  console.log("🔍 验证摘要");
  console.log("==========================");
  
  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${name}`);
    if (!passed) allPassed = false;
  }
  
  console.log("==========================");
  console.log(`总体结果: ${allPassed ? '✅ 全部通过' : '❌ 有验证项未通过'}`);
  console.log("==========================\n");
}

// 主函数
async function main() {
  try {
    console.log("🚀 开始验证部署...");
    
    // 加载部署状态
    const state = loadDeployState();
    if (!state) {
      console.error("❌ 无法加载部署状态，请确保先运行部署脚本");
      return;
    }
    
    console.log(`📊 已部署的网络: ${state.network}`);
    console.log(`📊 部署者地址: ${state.deployer}`);
    console.log(`📊 部署步骤: ${state.currentStep} / 11`);
    
    if (state.currentStep < 11) {
      console.log("⚠️ 警告: 部署尚未完成，某些验证可能会失败");
    }
    
    // 执行验证
    const results = {
      "RoleManager": await verifyRoleManager(state),
      "FeeManager": await verifyFeeManager(state),
      "PropertyRegistry": await verifyPropertyRegistry(state),
      "RealEstateSystem": state.currentStep >= 10 ? await verifyRealEstateSystem(state) : "未部署"
    };
    
    // 打印摘要
    printSummary(results);
    
  } catch (error) {
    console.error("验证过程中出错:", error);
  }
}

// 运行主函数
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 