/**
 * 角色设置脚本
 * 该脚本在部署后运行，为系统设置所有必要的角色
 */

require('dotenv').config();
const { ethers } = require('hardhat');
const { logger } = require('../shared/utils');

// 定义角色常量（与合约中的角色保持一致）
const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  TOKEN_MANAGER: "TOKEN_MANAGER",
  FEE_MANAGER: "FEE_MANAGER",
  RENT_MANAGER: "RENT_MANAGER",
  REDEMPTION_MANAGER: "REDEMPTION_MANAGER",
  MARKETPLACE_MANAGER: "MARKETPLACE_MANAGER",
  FEE_COLLECTOR: "FEE_COLLECTOR"
};

// 将角色名转换为角色哈希
function getRoleHash(roleName) {
  return ethers.keccak256(ethers.toUtf8Bytes(roleName));
}

// 加载角色私钥账户
function loadRoleAccounts() {
  const accounts = {};
  
  // 定义所有角色对应的私钥环境变量
  const roleKeyMapping = {
    SUPER_ADMIN: process.env.SUPER_ADMIN_PRIVATE_KEY,
    SYSTEM_ADMIN: process.env.ADMIN_PRIVATE_KEY,
    PROPERTY_MANAGER: process.env.PROPERTY_MANAGER_PRIVATE_KEY,
    TOKEN_MANAGER: process.env.TOKEN_MANAGER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY,
    FEE_MANAGER: process.env.FEE_MANAGER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY,
    RENT_MANAGER: process.env.RENT_MANAGER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY,
    REDEMPTION_MANAGER: process.env.REDEMPTION_MANAGER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY,
    MARKETPLACE_MANAGER: process.env.MARKETPLACE_MANAGER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY,
    FEE_COLLECTOR: process.env.FEE_COLLECTOR_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY
  };
  
  // Hardhat内置账户（用于本地开发）
  const hardhatAccounts = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // 账户0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // 账户1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // 账户2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // 账户3
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // 账户4
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", // 账户5
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9", // 账户6
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // 账户7
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // 账户8
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"  // 账户9
  ];
  
  // 对于每个角色，如果有指定的私钥，使用该私钥创建账户；否则，使用Hardhat内置账户
  Object.keys(ROLES).forEach((role, index) => {
    if (roleKeyMapping[role]) {
      accounts[role] = new ethers.Wallet(roleKeyMapping[role], ethers.provider);
    } else {
      // 使用Hardhat内置账户，确保不超出范围
      const accountIndex = index % hardhatAccounts.length;
      accounts[role] = { address: hardhatAccounts[accountIndex] };
    }
  });
  
  return accounts;
}

// 主函数
async function main() {
  try {
    logger.info("开始设置系统角色...");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info(`使用部署者账户: ${deployer.address}`);
    
    // 加载所有角色账户
    const roleAccounts = loadRoleAccounts();
    logger.info("已加载角色账户");
    
    // 获取RoleManager合约
    const RoleManager = await ethers.getContractFactory("RoleManager");
    const roleManagerAddress = require('./deploy-state.json').RoleManager || 
                               require('./deploy-state.json').roleManager;
    
    if (!roleManagerAddress) {
      throw new Error("找不到RoleManager合约地址，请确保已部署合约并更新deploy-state.json");
    }
    
    const roleManager = await ethers.getContractAt("RoleManager", roleManagerAddress);
    logger.info(`已连接到RoleManager合约: ${roleManagerAddress}`);
    
    // 检查部署者是否有SUPER_ADMIN角色
    const SUPER_ADMIN_HASH = getRoleHash(ROLES.SUPER_ADMIN);
    const deployerHasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN_HASH, deployer.address);
    
    if (!deployerHasSuperAdmin) {
      logger.warn(`部署者 ${deployer.address} 没有SUPER_ADMIN角色，尝试自授权...`);
      
      // 尝试自授权SUPER_ADMIN角色
      try {
        const tx = await roleManager.grantRole(SUPER_ADMIN_HASH, deployer.address);
        await tx.wait();
        logger.info(`已成功为部署者 ${deployer.address} 授权SUPER_ADMIN角色`);
      } catch (error) {
        logger.error(`无法为部署者授权SUPER_ADMIN角色: ${error.message}`);
        
        // 如果失败，可能需要调用紧急授权函数
        try {
          const tx = await roleManager.emergencyGrantRole(SUPER_ADMIN_HASH, deployer.address);
          await tx.wait();
          logger.info(`已通过紧急授权为部署者 ${deployer.address} 授权SUPER_ADMIN角色`);
        } catch (emergencyError) {
          logger.error(`紧急授权也失败: ${emergencyError.message}`);
          throw new Error("无法为部署者授权SUPER_ADMIN角色");
        }
      }
    } else {
      logger.info(`部署者 ${deployer.address} 已有SUPER_ADMIN角色`);
    }
    
    // 为每个角色分配对应的账户
    for (const [roleName, account] of Object.entries(roleAccounts)) {
      const roleHash = getRoleHash(roleName);
      const hasRole = await roleManager.hasRole(roleHash, account.address);
      
      if (!hasRole) {
        logger.info(`为 ${account.address} 授权 ${roleName} 角色...`);
        try {
          const tx = await roleManager.grantRole(roleHash, account.address);
          await tx.wait();
          logger.info(`✅ 已成功为 ${account.address} 授权 ${roleName} 角色`);
        } catch (error) {
          logger.error(`❌ 无法为 ${account.address} 授权 ${roleName} 角色: ${error.message}`);
        }
      } else {
        logger.info(`✅ ${account.address} 已有 ${roleName} 角色`);
      }
    }
    
    // 特别处理PROPERTY_MANAGER角色（确保HTTP服务器propertyAdmin账户有此权限）
    const httpServerPrivateKey = process.env.PROPERTY_MANAGER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
    if (httpServerPrivateKey) {
      const httpServerWallet = new ethers.Wallet(httpServerPrivateKey, ethers.provider);
      const PROPERTY_MANAGER_HASH = getRoleHash(ROLES.PROPERTY_MANAGER);
      const hasPropertyManagerRole = await roleManager.hasRole(PROPERTY_MANAGER_HASH, httpServerWallet.address);
      
      if (!hasPropertyManagerRole) {
        logger.info(`为HTTP服务器账户 ${httpServerWallet.address} 授权 PROPERTY_MANAGER 角色...`);
        try {
          const tx = await roleManager.grantRole(PROPERTY_MANAGER_HASH, httpServerWallet.address);
          await tx.wait();
          logger.info(`✅ 已成功为HTTP服务器账户 ${httpServerWallet.address} 授权 PROPERTY_MANAGER 角色`);
        } catch (error) {
          logger.error(`❌ 无法为HTTP服务器账户授权 PROPERTY_MANAGER 角色: ${error.message}`);
        }
      } else {
        logger.info(`✅ HTTP服务器账户 ${httpServerWallet.address} 已有 PROPERTY_MANAGER 角色`);
      }
    }
    
    logger.info("🎉 角色设置完成！");
  } catch (error) {
    logger.error(`设置角色时出错: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 脚本入口
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 