/**
 * 角色设置脚本
 * 该脚本在部署后运行，为系统设置所有必要的角色
 */

require('dotenv').config();
const { ethers } = require('hardhat');
const { logger } = require('../shared/utils');
const { ROLES, getRoleHash, grantRole } = require('./utils/roles');

// 默认管理员角色
const DEFAULT_ADMIN_ROLE = ROLES.DEFAULT_ADMIN;

// 打印角色哈希值，用于调试
function logRoleHashes() {
  const roleHashes = {
    SUPER_ADMIN: getRoleHash(ROLES.SUPER_ADMIN),
    PROPERTY_MANAGER: getRoleHash(ROLES.PROPERTY_MANAGER),
    TOKEN_MANAGER: getRoleHash(ROLES.TOKEN_MANAGER),
    DEFAULT_ADMIN_ROLE: ROLES.DEFAULT_ADMIN, 
    MINTER_ROLE: ROLES.MINTER
  };

  logger.info('角色哈希值:');
  for (const [role, hash] of Object.entries(roleHashes)) {
    logger.info(`${role}: ${hash}`);
  }
}

// 安全地授予角色 - 即使失败也不会中断流程
async function safeGrantRole(roleManager, role, address, description = '') {
  try {
    const roleHash = getRoleHash(role);
    logger.info(`尝试授予${description ? description + ' ' : ''}${role}角色给 ${address}...`);
    
    // 首先检查是否已有角色
    try {
      const hasRole = await roleManager.hasRole(roleHash, address);
      if (hasRole) {
        logger.info(`✅ 地址 ${address} 已拥有 ${role} 角色`);
        return true;
      }
    } catch (checkError) {
      logger.warn(`检查角色状态时出错: ${checkError.message}`);
      // 继续尝试授予角色
    }
    
    // 尝试授予角色
    try {
      const tx = await roleManager.grantRole(roleHash, address);
      await tx.wait();
      logger.info(`✅ 成功为 ${address} 授予 ${role} 角色`);
      return true;
    } catch (grantError) {
      logger.warn(`授予角色时出错: ${grantError.message}`);
      // 如果是ABI解码错误，尝试使用低级调用
      if (grantError.message.includes('could not decode result data')) {
        logger.info('尝试使用低级调用授予角色...');
        try {
          const methodSig = 'grantRole(bytes32,address)';
          const fragment = roleManager.interface.getFunction(methodSig);
          const calldata = roleManager.interface.encodeFunctionData(fragment, [roleHash, address]);
          
          const tx = await roleManager.signer.sendTransaction({
            to: await roleManager.getAddress(),
            data: calldata
          });
          
          await tx.wait();
          logger.info(`✅ 使用低级调用成功为 ${address} 授予 ${role} 角色`);
          return true;
        } catch (lowLevelError) {
          logger.warn(`低级调用授予角色失败: ${lowLevelError.message}`);
          return false;
        }
      }
      return false;
    }
  } catch (error) {
    logger.warn(`授予${role}角色过程中发生错误: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  try {
    logger.info('开始设置系统角色...');
    
    // 打印角色哈希值，用于调试
    logRoleHashes();
    
    // 读取部署状态
    const deployState = require('./deploy-state.json');
    logger.info('已加载部署状态文件');
    
    // 获取部署者账户
    let deployer, deployerAddress;
    try {
      deployer = await ethers.provider.getSigner();
      deployerAddress = await deployer.getAddress();
      logger.info(`使用部署者账户: ${deployerAddress}`);
    } catch (error) {
      logger.warn(`无法获取部署者地址: ${error.message}`);
      logger.info('尝试使用第一个签名者作为部署者...');
      
      // 使用备用方法获取部署者
      const signers = await ethers.getSigners();
      deployer = signers[0];
      deployerAddress = await deployer.getAddress();
      logger.info(`使用备用部署者账户: ${deployerAddress}`);
    }
    
    // 获取合约地址 - 支持新旧两种格式
    let roleManagerAddress, tokenFactoryAddress, propertyRegistryAddress;
    
    if (deployState.contracts) {
      // 新格式
      roleManagerAddress = deployState.contracts.roleManager;
      tokenFactoryAddress = deployState.contracts.tokenFactory;
      propertyRegistryAddress = deployState.contracts.propertyRegistry;
    } else {
      // 旧格式
      roleManagerAddress = deployState.roleManager;
      tokenFactoryAddress = deployState.tokenFactory;
      propertyRegistryAddress = deployState.propertyRegistry;
    }
    
    if (!roleManagerAddress) {
      throw new Error('找不到RoleManager合约地址，请检查deploy-state.json文件');
    }
    
    logger.info(`RoleManager合约地址: ${roleManagerAddress}`);
    logger.info(`TokenFactory合约地址: ${tokenFactoryAddress || '未定义'}`);
    logger.info(`PropertyRegistry合约地址: ${propertyRegistryAddress || '未定义'}`);
    
    // 连接到RoleManager合约
    const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
    
    // ================== 授予部署者SUPER_ADMIN角色 ==================
    logger.info('为部署者设置基本角色...');
    
    // 使用安全的角色授予方法
    await safeGrantRole(roleManager, ROLES.SUPER_ADMIN, deployerAddress, '部署者');
    await safeGrantRole(roleManager, ROLES.PROPERTY_MANAGER, deployerAddress, '部署者');
    await safeGrantRole(roleManager, ROLES.TOKEN_MANAGER, deployerAddress, '部署者');
    await safeGrantRole(roleManager, ROLES.MINTER, deployerAddress, '部署者');
    
    // ================== TokenFactory权限设置 ==================
    if (tokenFactoryAddress) {
      logger.info('为TokenFactory设置角色...');
      
      // 使用安全的角色授予方法
      await safeGrantRole(roleManager, ROLES.MINTER, tokenFactoryAddress, 'TokenFactory');
      await safeGrantRole(roleManager, ROLES.PROPERTY_MANAGER, tokenFactoryAddress, 'TokenFactory');
      await safeGrantRole(roleManager, ROLES.TOKEN_MANAGER, tokenFactoryAddress, 'TokenFactory');
      await safeGrantRole(roleManager, ROLES.SNAPSHOT, tokenFactoryAddress, 'TokenFactory');
      
      // 将TokenFactory添加为PropertyRegistry的授权合约
      if (propertyRegistryAddress) {
        try {
          logger.info('将TokenFactory添加为PropertyRegistry的授权合约...');
          const propertyRegistry = await ethers.getContractAt(
            'PropertyRegistry',
            propertyRegistryAddress
          );
          
          logger.info(`检查TokenFactory(${tokenFactoryAddress})是否已是授权合约...`);
          
          // 使用安全的方式检查是否已授权
          let isAuthorized = false;
          try {
            isAuthorized = await propertyRegistry.isAuthorizedContract(tokenFactoryAddress);
          } catch (checkError) {
            logger.warn(`检查TokenFactory授权状态时出错: ${checkError.message}`);
          }
          
          if (isAuthorized) {
            logger.info('✅ TokenFactory已经是授权合约');
          } else {
            logger.info('TokenFactory不是授权合约，正在添加...');
            try {
              const tx = await propertyRegistry.addAuthorizedContract(tokenFactoryAddress);
              await tx.wait();
              logger.info('✅ TokenFactory成功添加为授权合约');
            } catch (addError) {
              logger.warn(`添加TokenFactory为授权合约失败: ${addError.message}`);
              
              // 如果失败，尝试使用低级调用
              logger.info('尝试使用低级调用添加授权合约...');
              try {
                const methodSig = 'addAuthorizedContract(address)';
                const fragment = propertyRegistry.interface.getFunction(methodSig);
                const calldata = propertyRegistry.interface.encodeFunctionData(fragment, [tokenFactoryAddress]);
                
                const tx = await propertyRegistry.signer.sendTransaction({
                  to: await propertyRegistry.getAddress(),
                  data: calldata
                });
                
                await tx.wait();
                logger.info('✅ 使用低级调用成功添加TokenFactory为授权合约');
              } catch (lowLevelError) {
                logger.warn(`低级调用添加授权合约失败: ${lowLevelError.message}`);
              }
            }
          }
        } catch (error) {
          logger.warn(`处理PropertyRegistry授权时出错: ${error.message}`);
        }
      }
    }
    
    logger.info('角色设置完成。');
    
  } catch (error) {
    logger.error('角色设置失败:', error);
    throw error;
  }
}

// 如果直接运行脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 