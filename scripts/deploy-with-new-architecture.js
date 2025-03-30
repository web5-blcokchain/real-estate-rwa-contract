/**
 * 使用新架构部署系统
 * 
 * 该脚本演示如何使用新的三层部署架构来部署整个合约系统
 */

require('dotenv').config();
const { ethers } = require('hardhat');
const { 
  SystemDeployer, 
  DEPLOYMENT_STRATEGIES,
  logger
} = require('../shared/utils');
const fs = require('fs');
const path = require('path');

// 流程标题日志
function logStage(stage) {
  const separator = "=".repeat(80);
  logger.info(`\n${separator}`);
  logger.info(`【${stage}】`);
  logger.info(`${separator}\n`);
}

// 部署选项
const DEPLOYMENT_CONFIG = {
  // 基本配置
  strategy: DEPLOYMENT_STRATEGIES.UPGRADEABLE,
  force: process.env.FORCE_DEPLOY === 'true',
  verify: process.env.VERIFY_CONTRACTS === 'true',
  
  // 要部署的库合约
  libraries: ['SystemDeployerLib1', 'SystemDeployerLib2'],
  
  // 角色配置
  roles: {
    ADMIN_ROLE: process.env.ADMIN_ADDRESS,
    OPERATOR_ROLE: process.env.OPERATOR_ADDRESS,
    VALIDATOR_ROLE: process.env.VALIDATOR_ADDRESS,
    TREASURY_ROLE: process.env.TREASURY_ADDRESS,
    MARKETPLACE_ROLE: process.env.MARKETPLACE_ADDRESS, // 将在部署后自动设置为Marketplace合约地址
    TOKEN_FACTORY_ROLE: process.env.TOKEN_FACTORY_ROLE_ADDRESS // 将在部署后自动设置为TokenFactory合约地址
  },
  
  // 部署选项
  options: {
    // 交易选项
    transaction: {
      gasLimitMultiplier: 2.0,
      gasPrice: null, // 自动
      confirmations: 1
    },
    
    // 重试选项
    retry: {
      maxRetries: 3,
      retryInterval: 5000
    },
    
    // 升级选项
    upgrade: {
      kind: 'uups',
      timeout: 60000
    },
    
    // 验证选项
    verify: {
      enabled: process.env.VERIFY_CONTRACTS === 'true',
      delay: 30000
    }
  }
};

/**
 * 主部署函数
 */
async function main() {
  try {
    // ========== 阶段1：环境准备 ==========
    logStage("1. 部署环境准备\n");
    
    // 获取当前网络
    const network = await ethers.provider.getNetwork();
    logger.info(`部署网络: ${network.name}`);
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    logger.info(`部署账户: ${deployer.address}`);
    
    // 检查账户余额
    const balance = await ethers.provider.getBalance(deployer.address);
    const ethBalance = ethers.formatEther(balance);
    logger.info(`部署账户余额: ${ethBalance} ETH`);
    
    if (balance < ethers.parseEther('0.1')) {
      logger.warn('部署账户余额不足，可能导致部署失败');
      const proceed = await promptUserConfirmation('是否继续部署？(y/n)');
      if (!proceed) {
        logger.info('用户取消部署');
        return;
      }
    }
    
    // 创建部署配置
    const deployConfig = {
      ...DEPLOYMENT_CONFIG,
      network: network.name
    };
    
    // 输出部署配置摘要
    logger.info('部署配置摘要:\n');
    logger.info(`- 部署策略: ${deployConfig.strategy}`);
    logger.info(`- 强制重新部署: ${deployConfig.force}`);
    logger.info(`- 验证合约: ${deployConfig.verify}`);
    logger.info(`- 待部署库合约: ${deployConfig.libraries.join(', ')}`);
    
    if (deployConfig.roles) {
      logger.info('角色配置:\n');
      Object.entries(deployConfig.roles).forEach(([role, address]) => {
        if (address) {
          logger.info(`- ${role}: ${address}`);
        }
      });
    }
    
    // ========== 阶段2：系统部署 ==========
    logStage("2. 合约系统部署\n");
    
    // 创建系统部署器
    const systemDeployer = new SystemDeployer(deployConfig);
    
    // 部署系统
    const result = await systemDeployer.deploySystem(deployConfig);
    
    // ========== 阶段3：部署验证 ==========
    logStage("3. 部署结果验证\n");
    
    if (result.success) {
      logger.info(`系统部署成功，用时 ${result.duration.toFixed(2)} 秒`);
      logger.info('已部署的合约:');
      Object.entries(result.contractAddresses).forEach(([name, address]) => {
        logger.info(`  ${name}: ${address}`);
      });
      
      // ========== 阶段4：初始化参数 ==========
      logStage("4. 合约初始化参数\n");
      
      // 打印各合约的初始化参数
      logger.info('合约初始化参数:');
      logger.info('- RoleManager: 无参数');
      logger.info('- FeeManager: [roleManagerAddress]');
      logger.info('- PropertyRegistry: [roleManagerAddress]');
      logger.info('- RentDistributor: [roleManagerAddress, propertyRegistryAddress]');
      logger.info('- TokenFactory: [roleManagerAddress, propertyRegistryAddress, tokenImplementation, rentDistributorAddress]');
      logger.info('- RedemptionManager: [roleManagerAddress, propertyRegistryAddress, tokenFactoryAddress]');
      logger.info('- Marketplace: [roleManagerAddress, feeManagerAddress]');
      logger.info('- TokenHolderQuery: [roleManagerAddress]');
      logger.info('- RealEstateSystem: [roleManagerAddress, feeManagerAddress, propertyRegistryAddress, tokenFactoryAddress, redemptionManagerAddress, rentDistributorAddress, marketplaceAddress, tokenHolderQueryAddress]');
      
      // ========== 阶段5：部署记录 ==========
      logStage("5. 部署记录保存\n");
      
      logger.info('部署记录已保存到:');
      logger.info('- scripts/deploy-state.json');
      logger.info('- shared/deployments/contracts.json');
      logger.info(`- shared/deployments/${network.name}-latest.json`);
      
      // 移除不重要的日志行
      cleanupLogs();
    } else {
      logger.error('系统部署失败:', result.error.message);
    }
  } catch (error) {
    logger.error('部署脚本执行失败:', error);
    process.exit(1);
  }
}

/**
 * 提示用户确认
 * @param {string} question 问题
 * @returns {Promise<boolean>} 用户是否确认
 */
async function promptUserConfirmation(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * 清理不重要的日志信息
 */
function cleanupLogs() {
  try {
    // 将来根据需要可以添加其他清理工作
  } catch (error) {
    logger.error('清理日志失败:', error);
  }
}

// 执行部署
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 