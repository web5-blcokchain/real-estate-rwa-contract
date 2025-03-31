/**
 * 测试PROPERTY_MANAGER角色权限
 * 该脚本检查propertyAdmin账户是否有PROPERTY_MANAGER角色权限
 */

require('dotenv').config();
const { ethers } = require('hardhat');
const { logger } = require('../shared/utils');

// 主函数
async function main() {
  try {
    logger.info('开始测试PROPERTY_MANAGER角色权限...');
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info(`使用部署者账户: ${deployer.address}`);
    
    // 获取RoleManager合约
    const roleManagerAddress = require('./deploy-state.json').RoleManager || 
                               require('./deploy-state.json').roleManager;
    
    if (!roleManagerAddress) {
      throw new Error('找不到RoleManager合约地址，请确保已部署合约并更新deploy-state.json');
    }
    
    const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
    logger.info(`已连接到RoleManager合约: ${roleManagerAddress}`);
    
    // 获取PropertyRegistry合约
    const propertyRegistryAddress = require('./deploy-state.json').PropertyRegistry || 
                                    require('./deploy-state.json').propertyRegistry;
    
    if (!propertyRegistryAddress) {
      throw new Error('找不到PropertyRegistry合约地址，请确保已部署合约并更新deploy-state.json');
    }
    
    const propertyRegistry = await ethers.getContractAt('PropertyRegistry', propertyRegistryAddress);
    logger.info(`已连接到PropertyRegistry合约: ${propertyRegistryAddress}`);
    
    // 获取PROPERTY_MANAGER角色哈希
    const PROPERTY_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PROPERTY_MANAGER'));
    logger.info(`PROPERTY_MANAGER角色哈希: ${PROPERTY_MANAGER_ROLE}`);
    
    // 检查HTTP服务器使用的propertyAdmin账户
    const propertyAdminKey = process.env.PROPERTY_MANAGER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
    
    if (!propertyAdminKey) {
      throw new Error('找不到PROPERTY_MANAGER_PRIVATE_KEY或ADMIN_PRIVATE_KEY环境变量');
    }
    
    const propertyAdmin = new ethers.Wallet(propertyAdminKey, ethers.provider);
    logger.info(`HTTP服务器propertyAdmin账户: ${propertyAdmin.address}`);
    
    // 检查propertyAdmin是否有PROPERTY_MANAGER角色
    const hasRole = await roleManager.hasRole(PROPERTY_MANAGER_ROLE, propertyAdmin.address);
    
    if (hasRole) {
      logger.info(`✅ 成功! propertyAdmin (${propertyAdmin.address}) 已有PROPERTY_MANAGER角色`);
    } else {
      logger.error(`❌ 失败! propertyAdmin (${propertyAdmin.address}) 没有PROPERTY_MANAGER角色`);
      
      // 尝试授予角色
      logger.info('尝试授予PROPERTY_MANAGER角色...');
      
      try {
        const tx = await roleManager.grantRole(PROPERTY_MANAGER_ROLE, propertyAdmin.address);
        await tx.wait();
        logger.info(`✅ 已成功为propertyAdmin账户授予PROPERTY_MANAGER角色`);
        
        // 再次检查
        const hasRoleNow = await roleManager.hasRole(PROPERTY_MANAGER_ROLE, propertyAdmin.address);
        if (hasRoleNow) {
          logger.info(`✅ 确认: propertyAdmin现在已有PROPERTY_MANAGER角色`);
        } else {
          logger.error(`❌ 错误: 无法确认propertyAdmin已获得PROPERTY_MANAGER角色`);
        }
      } catch (error) {
        logger.error(`❌ 无法授予PROPERTY_MANAGER角色: ${error.message}`);
      }
    }
    
    // 测试注册属性功能
    logger.info('测试注册属性功能...');
    
    try {
      // 使用propertyAdmin账户连接到PropertyRegistry合约
      const propertyRegistryAsAdmin = propertyRegistry.connect(propertyAdmin);
      
      // 创建测试属性数据
      const propertyId = `TEST-${Math.floor(Math.random() * 10000)}`;
      const country = 'Japan';
      const metadata = JSON.stringify({
        name: '测试属性',
        location: '东京新宿区',
        description: '这是一个测试属性',
        area: 120,
        bedrooms: 3,
        bathrooms: 2
      });
      
      logger.info(`尝试注册测试属性 ${propertyId}...`);
      
      // 注册属性
      const tx = await propertyRegistryAsAdmin.registerProperty(propertyId, country, metadata);
      await tx.wait();
      
      logger.info(`✅ 成功注册测试属性! 交易哈希: ${tx.hash}`);
      
      // 检查属性是否存在
      const property = await propertyRegistry.getProperty(propertyId);
      
      if (property.exists) {
        logger.info(`✅ 属性注册确认: ${propertyId} 已成功注册`);
        logger.info(`属性详情:`);
        logger.info(`- 国家: ${property.country}`);
        logger.info(`- 状态: ${property.status}`);
        logger.info(`- 注册时间: ${new Date(Number(property.registrationTime) * 1000).toISOString()}`);
      } else {
        logger.error(`❌ 属性注册失败: 无法找到属性 ${propertyId}`);
      }
    } catch (error) {
      logger.error(`❌ 注册属性测试失败: ${error.message}`);
    }
    
    logger.info('PROPERTY_MANAGER角色权限测试完成');
  } catch (error) {
    logger.error(`测试PROPERTY_MANAGER角色权限时出错: ${error.message}`);
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