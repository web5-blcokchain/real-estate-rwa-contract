/**
 * 修复PROPERTY_MANAGER角色授权问题
 * 该脚本用于解决"Caller is not a property manager"错误
 */

require('dotenv').config();
const { ethers } = require('hardhat');
const { logger } = require('../shared/utils');
const { ROLES, getRoleHash } = require('./utils/roles');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    logger.info('='.repeat(80));
    logger.info('开始修复PROPERTY_MANAGER角色授权问题...');
    logger.info('='.repeat(80));

    // 获取签名者
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    const deployerAddress = await deployer.getAddress();
    
    logger.info(`使用部署者地址: ${deployerAddress}`);
    
    // 尝试读取部署状态
    let deployState;
    try {
      deployState = require('./deploy-state.json');
      logger.info('已加载deploy-state.json');
    } catch (error) {
      logger.error('无法加载deploy-state.json，请确保已完成部署');
      return;
    }
    
    // 获取合约地址
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
      logger.error('找不到RoleManager合约地址，请确保部署成功');
      return;
    }
    
    logger.info(`找到RoleManager地址: ${roleManagerAddress}`);
    logger.info(`找到TokenFactory地址: ${tokenFactoryAddress || '未定义'}`);
    logger.info(`找到PropertyRegistry地址: ${propertyRegistryAddress || '未定义'}`);
    
    // 连接到RoleManager合约
    const roleManager = await ethers.getContractAt('RoleManager', roleManagerAddress);
    
    // 获取所有可用账户地址进行权限检查
    logger.info('\n检查现有账户的PROPERTY_MANAGER角色状态:');
    
    // 检查部署者是否有角色
    const deployerHasRole = await checkAndGrantRole(
      roleManager, 
      ROLES.PROPERTY_MANAGER, 
      deployerAddress, 
      'Deployer'
    );
    
    // 如果部署者没有角色，以下代码可能会失败，所以我们在此处检查
    if (!deployerHasRole) {
      logger.error('无法为部署者授予PROPERTY_MANAGER角色，可能存在严重问题');
      logger.info('尝试强制直接调用grantRole...');
      
      try {
        // 尝试直接授予角色 - 使用更底层的调用
        const propertyManagerRole = getRoleHash(ROLES.PROPERTY_MANAGER);
        const tx = await deployer.sendTransaction({
          to: roleManagerAddress,
          data: roleManager.interface.encodeFunctionData('grantRole', [propertyManagerRole, deployerAddress])
        });
        await tx.wait();
        logger.info('✓ 强制授予角色成功');
      } catch (error) {
        logger.error(`强制授予角色失败: ${error.message}`);
        logger.error('请尝试重新部署系统或检查合约状态');
        return;
      }
    }
    
    // 现在检查并授予TokenFactory角色
    if (tokenFactoryAddress) {
      await checkAndGrantRole(
        roleManager, 
        ROLES.PROPERTY_MANAGER, 
        tokenFactoryAddress, 
        'TokenFactory'
      );
    }
    
    // 检查环境变量中定义的特殊角色账户
    const propertyManagerKey = process.env.PROPERTY_MANAGER_PRIVATE_KEY;
    if (propertyManagerKey) {
      const propertyManagerWallet = new ethers.Wallet(propertyManagerKey, ethers.provider);
      const propertyManagerAddress = await propertyManagerWallet.getAddress();
      
      await checkAndGrantRole(
        roleManager, 
        ROLES.PROPERTY_MANAGER, 
        propertyManagerAddress, 
        'PropertyManager(from env)'
      );
    }
    
    // 如果PropertyRegistry存在，将TokenFactory设为授权合约
    if (propertyRegistryAddress && tokenFactoryAddress) {
      logger.info('\n确保TokenFactory是PropertyRegistry的授权合约:');
      const propertyRegistry = await ethers.getContractAt(
        'PropertyRegistry', 
        propertyRegistryAddress
      );
      
      try {
        const isAuthorized = await propertyRegistry.isAuthorizedContract(tokenFactoryAddress);
        if (isAuthorized) {
          logger.info('✓ TokenFactory已经是授权合约');
        } else {
          logger.info('添加TokenFactory为授权合约...');
          const tx = await propertyRegistry.addAuthorizedContract(tokenFactoryAddress);
          await tx.wait();
          logger.info('✓ TokenFactory已成功添加为授权合约');
        }
      } catch (error) {
        logger.warn(`检查授权状态失败: ${error.message}`);
        try {
          logger.info('尝试直接添加授权...');
          const tx = await propertyRegistry.addAuthorizedContract(tokenFactoryAddress);
          await tx.wait();
          logger.info('✓ TokenFactory已成功添加为授权合约');
        } catch (innerError) {
          logger.error(`添加授权失败: ${innerError.message}`);
        }
      }
    }
    
    logger.info('\n角色修复过程完成');
    logger.info('运行集成测试检查是否已解决"Caller is not a property manager"问题');
    logger.info('推荐命令: npx hardhat run scripts/tests/basic-processes-test.js');
    
    // 返回成功
    return { success: true };
  } catch (error) {
    logger.error('角色修复过程失败:', error);
    return { success: false, error };
  }
}

// 检查并授予角色的辅助函数
async function checkAndGrantRole(roleManager, roleName, address, label = '') {
  try {
    const roleHash = getRoleHash(roleName);
    
    // 首先检查是否已有角色
    try {
      const hasRole = await roleManager.hasRole(roleHash, address);
      if (hasRole) {
        logger.info(`✓ ${label}(${address}) 已拥有 ${roleName} 角色`);
        return true;
      } else {
        logger.info(`${label}(${address}) 没有 ${roleName} 角色，正在授予...`);
      }
    } catch (error) {
      logger.warn(`检查角色失败: ${error.message}`);
      logger.info('尝试直接授予角色...');
    }
    
    // 授予角色
    try {
      const tx = await roleManager.grantRole(roleHash, address);
      await tx.wait();
      logger.info(`✓ 成功授予 ${label}(${address}) ${roleName} 角色`);
      return true;
    } catch (error) {
      logger.error(`授予角色失败: ${error.message}`);
      
      // 尝试使用低级调用
      try {
        logger.info('尝试使用低级调用...');
        const signer = await ethers.provider.getSigner();
        const tx = await signer.sendTransaction({
          to: await roleManager.getAddress(),
          data: roleManager.interface.encodeFunctionData('grantRole', [roleHash, address])
        });
        await tx.wait();
        logger.info(`✓ 使用低级调用成功授予 ${label}(${address}) ${roleName} 角色`);
        return true;
      } catch (innerError) {
        logger.error(`低级调用失败: ${innerError.message}`);
        return false;
      }
    }
  } catch (error) {
    logger.error(`处理 ${address} 的 ${roleName} 角色时出错: ${error.message}`);
    return false;
  }
}

// 如果直接运行脚本则执行main
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { main }; 