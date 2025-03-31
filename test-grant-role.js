const { ethers } = require('hardhat');
const { logger } = require('./http-server/src/utils/logger');

async function main() {
  try {
    // 获取RoleManager地址
    const roleManagerAddress = require('./scripts/deploy-state.json').roleManager;
    logger.info(`RoleManager合约地址: ${roleManagerAddress}`);

    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info(`部署者账户: ${deployer.address}`);

    // 获取RoleManager合约工厂
    const RoleManager = await ethers.getContractFactory('RoleManager');

    // 连接到已部署的RoleManager
    const roleManager = await RoleManager.attach(roleManagerAddress);
    logger.info('已连接到RoleManager合约');

    // 尝试获取PROPERTY_MANAGER角色哈希
    const propertyManagerRole = await roleManager.PROPERTY_MANAGER();
    logger.info(`PROPERTY_MANAGER角色哈希: ${propertyManagerRole}`);

    // 获取环境变量中的PROPERTY_MANAGER私钥
    require('dotenv').config();
    const propertyManagerPrivateKey = process.env.PROPERTY_MANAGER_PRIVATE_KEY;
    if (!propertyManagerPrivateKey) {
      throw new Error('缺少PROPERTY_MANAGER_PRIVATE_KEY环境变量');
    }
    
    // 从私钥创建钱包
    const propertyManagerWallet = new ethers.Wallet(propertyManagerPrivateKey, ethers.provider);
    logger.info(`PropertyManager账户: ${propertyManagerWallet.address}`);
    
    // 检查账户是否有PROPERTY_MANAGER角色
    const hasRole = await roleManager.hasRole(propertyManagerRole, propertyManagerWallet.address);
    logger.info(`账户${propertyManagerWallet.address}有PROPERTY_MANAGER角色: ${hasRole}`);
    
    // 如果没有角色，尝试授予
    if (!hasRole) {
      // 检查部署者是否有SUPER_ADMIN角色
      const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
      const deployerHasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN, deployer.address);
      logger.info(`部署者有SUPER_ADMIN角色: ${deployerHasSuperAdmin}`);
      
      if (deployerHasSuperAdmin) {
        const tx = await roleManager.grantRole(propertyManagerRole, propertyManagerWallet.address);
        await tx.wait();
        logger.info(`已授予${propertyManagerWallet.address}PROPERTY_MANAGER角色`);
        
        // 再次检查
        const hasRoleNow = await roleManager.hasRole(propertyManagerRole, propertyManagerWallet.address);
        logger.info(`现在账户${propertyManagerWallet.address}有PROPERTY_MANAGER角色: ${hasRoleNow}`);
      } else {
        logger.error('部署者没有SUPER_ADMIN角色，无法授予PROPERTY_MANAGER角色');
      }
    }

  } catch (error) {
    logger.error('测试RoleManager时出错:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 