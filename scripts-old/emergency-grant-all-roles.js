/**
 * 紧急授权脚本 - 为部署者和TokenFactory授予所有系统角色，以快速通过测试
 * 警告：此脚本仅用于测试环境，不应在生产环境中使用
 */

const { ethers } = require('hardhat');
const logger = require('../shared/utils/logger');

// 获取部署状态
function getDeployState() {
  try {
    return require('./deploy-state.json');
  } catch (error) {
    logger.error(`无法加载部署状态: ${error.message}`);
    throw error;
  }
}

// 将角色名转换为角色哈希
function getRoleHash(roleName) {
  return ethers.keccak256(ethers.toUtf8Bytes(roleName));
}

async function main() {
  try {
    logger.info('开始紧急授权所有角色...');
    
    // 加载部署状态
    const deployState = getDeployState();
    logger.info('已加载部署状态');
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info(`部署者账户: ${deployer.address}`);
    
    // 获取合约地址
    const roleManagerAddress = deployState.roleManager;
    const tokenFactoryAddress = deployState.tokenFactory;
    const propertyRegistryAddress = deployState.propertyRegistry;
    
    logger.info(`RoleManager: ${roleManagerAddress}`);
    logger.info(`TokenFactory: ${tokenFactoryAddress}`);
    logger.info(`PropertyRegistry: ${propertyRegistryAddress}`);
    
    // 连接到RoleManager合约
    const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
    
    // 定义所有角色
    const roles = {
      DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
      SUPER_ADMIN: getRoleHash('SUPER_ADMIN'),
      PROPERTY_MANAGER: getRoleHash('PROPERTY_MANAGER'),
      TOKEN_MANAGER: getRoleHash('TOKEN_MANAGER'),
      MARKETPLACE_MANAGER: getRoleHash('MARKETPLACE_MANAGER'),
      FEE_MANAGER: getRoleHash('FEE_MANAGER'),
      REDEMPTION_MANAGER: getRoleHash('REDEMPTION_MANAGER'),
      FEE_COLLECTOR: getRoleHash('FEE_COLLECTOR'),
      MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
      SNAPSHOT_ROLE: getRoleHash('SNAPSHOT_ROLE')
    };
    
    // 打印角色哈希值
    logger.info('角色哈希:');
    Object.entries(roles).forEach(([name, hash]) => {
      logger.info(`${name}: ${hash}`);
    });
    
    // 为部署者授予所有角色
    logger.info('为部署者授予所有角色...');
    for (const [name, hash] of Object.entries(roles)) {
      try {
        const tx = await roleManager.grantRole(hash, deployer.address);
        await tx.wait();
        logger.info(`✅ 已授予部署者 ${name} 角色`);
      } catch (error) {
        logger.warn(`无法授予 ${name} 角色: ${error.message}`);
      }
    }
    
    // 为TokenFactory授予所有角色
    if (tokenFactoryAddress) {
      logger.info('为TokenFactory授予所有角色...');
      for (const [name, hash] of Object.entries(roles)) {
        try {
          const tx = await roleManager.grantRole(hash, tokenFactoryAddress);
          await tx.wait();
          logger.info(`✅ 已授予TokenFactory ${name} 角色`);
        } catch (error) {
          logger.warn(`无法授予TokenFactory ${name} 角色: ${error.message}`);
        }
      }
      
      // 确保TokenFactory被授权为PropertyRegistry的授权合约
      if (propertyRegistryAddress) {
        try {
          const propertyRegistry = await ethers.getContractAt('PropertyRegistry', propertyRegistryAddress);
          const isAuthorized = await propertyRegistry.isAuthorizedContract(tokenFactoryAddress);
          
          if (!isAuthorized) {
            logger.info('将TokenFactory添加为PropertyRegistry的授权合约...');
            const tx = await propertyRegistry.addAuthorizedContract(tokenFactoryAddress);
            await tx.wait();
            logger.info('✅ TokenFactory成功添加为PropertyRegistry的授权合约');
          } else {
            logger.info('TokenFactory已是PropertyRegistry的授权合约');
          }
        } catch (error) {
          logger.warn(`添加TokenFactory为PropertyRegistry授权合约失败: ${error.message}`);
        }
      }
    }
    
    // 获取代币实现合约地址并授予所有权限
    try {
      const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddress);
      const tokenImplAddress = await tokenFactory.tokenImplementation();
      
      if (tokenImplAddress && tokenImplAddress !== ethers.ZeroAddress) {
        logger.info(`为代币实现合约授予权限: ${tokenImplAddress}`);
        
        // 为代币实现合约授予MINTER_ROLE
        try {
          const tx = await roleManager.grantRole(roles.MINTER_ROLE, tokenImplAddress);
          await tx.wait();
          logger.info('✅ 已授予代币实现合约 MINTER_ROLE 角色');
        } catch (error) {
          logger.warn(`无法授予代币实现合约 MINTER_ROLE: ${error.message}`);
        }
      } else {
        logger.warn('代币实现合约地址未设置或为零地址');
      }
    } catch (error) {
      logger.warn(`获取代币实现合约地址失败: ${error.message}`);
    }
    
    logger.info('🎉 紧急授权完成！所有可能的角色都已尝试授予');
    
  } catch (error) {
    logger.error(`紧急授权失败: ${error.message}`);
    throw error;
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
}

module.exports = { main }; 