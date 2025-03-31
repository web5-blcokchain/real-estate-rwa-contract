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
const { upgrades } = require('hardhat');

// 流程标题日志
function logStage(stage) {
  const separator = '='.repeat(80);
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
    MARKETPLACE_ROLE: null, // 将在部署后自动设置为Marketplace合约地址
    TOKEN_FACTORY_ROLE: null // 将在部署后自动设置为TokenFactory合约地址
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
 * 部署代币实现合约
 */
async function deployTokenImplementation(contractAddresses) {
  try {
    logStage("6. 部署代币实现合约");
    logger.info('开始部署RealEstateToken实现合约...');
    
    // 部署RealEstateToken实现合约
    const RealEstateToken = await ethers.getContractFactory('RealEstateToken');
    const tokenImplementation = await RealEstateToken.deploy();
    
    // 等待部署完成
    logger.info('等待代币实现合约部署完成...');
    await tokenImplementation.waitForDeployment();
    
    // 获取部署地址
    const tokenImplAddress = await tokenImplementation.getAddress();
    logger.info(`RealEstateToken实现合约已部署: ${tokenImplAddress}`);
    
    // 获取TokenFactory合约实例
    const tokenFactory = await ethers.getContractAt('TokenFactory', contractAddresses.tokenFactory);
    
    // 更新TokenFactory的代币实现地址
    logger.info('正在更新TokenFactory的代币实现地址...');
    const tx = await tokenFactory.updateTokenImplementation(tokenImplAddress);
    
    // 等待交易确认
    logger.info('交易已提交，等待确认...');
    await tx.wait();
    logger.info('交易已确认！TokenFactory代币实现地址已更新');
    
    // 更新部署状态文件
    return {
      ...contractAddresses,
      tokenImplementation: tokenImplAddress
    };
  } catch (error) {
    logger.error('部署代币实现合约失败:', error);
    throw error;
  }
}

/**
 * 运行部署后验证
 */
async function runDeploymentVerification() {
  try {
    logStage('7. 部署验证');
    logger.info('执行部署验证脚本...');
    
    // 使用直接导入的方式运行验证脚本
    const { main: verifyDeployment } = require('./verify-deployment');
    const verificationResult = await verifyDeployment();
    
    if (!verificationResult || !verificationResult.success) {
      logger.error(`部署验证失败! 阶段: ${verificationResult?.stage || 'unknown'}`);
      if (verificationResult?.error) {
        logger.error(`错误详情: ${verificationResult.error.message}`);
      }
      return false;
    }
    
    logger.info('部署验证成功!');
    return true;
  } catch (error) {
    logger.error('运行验证脚本失败:', error);
    return false;
  }
}

/**
 * 检查并运行测试
 */
async function runTests() {
  try {
    logStage('8. 运行集成测试');
    logger.info('执行基本流程测试...');
    
    try {
      // 运行基本流程测试
      const { main: runBasicTest } = require('./tests/basic-processes-test');
      await runBasicTest();
      
      logger.info('基本流程测试完成');
      return true;
    } catch (testError) {
      // 捕获测试过程中的错误
      logger.error('基本流程测试失败:', testError.message);
      logger.error('错误详情:', testError.stack);
      logger.warn('测试失败不会影响部署结果，部署过程已经成功完成');
      return false;
    }
  } catch (error) {
    logger.error('运行测试失败:', error);
    logger.warn('测试失败不会影响部署结果，部署过程已经成功完成');
    return false;
  }
}

/**
 * 设置系统角色
 */
async function setupSystemRoles() {
  try {
    logStage('9. 设置系统角色');
    logger.info('执行角色设置脚本...');
    
    // 使用直接导入的方式运行角色设置脚本
    const { main: setupRoles } = require('./setup-roles');
    await setupRoles();
    
    logger.info('角色设置成功!');
    return true;
  } catch (error) {
    logger.error('设置系统角色失败:', error);
    logger.warn('角色设置失败不会影响部署结果，部署过程已经成功完成');
    return false;
  }
}

/**
 * 主部署函数
 */
async function main() {
  try {
    // ========== 阶段1：环境准备 ==========
    logStage("1. 部署环境准备");
    
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
    logger.info('部署配置摘要:');
    logger.info(`- 部署策略: ${deployConfig.strategy}`);
    logger.info(`- 强制重新部署: ${deployConfig.force}`);
    logger.info(`- 验证合约: ${deployConfig.verify}`);
    logger.info(`- 待部署库合约: ${deployConfig.libraries.join(', ')}`);
    
    if (deployConfig.roles) {
      logger.info('角色配置:');
      Object.entries(deployConfig.roles).forEach(([role, address]) => {
        if (address) {
          logger.info(`- ${role}: ${address}`);
        }
      });
    }
    
    // ========== 阶段2：系统部署 ==========
    logStage("2. 合约系统部署");
    
    // 创建系统部署器
    const systemDeployer = new SystemDeployer(deployConfig);
    
    // 部署系统
    const result = await systemDeployer.deploySystem(deployConfig);
    
    if (!result.success) {
      logger.error('系统部署失败:', result.error.message);
      return;
    }
    
    // ========== 阶段3：部署代币实现合约 ==========
    const contractAddresses = await deployTokenImplementation(result.contractAddresses);
    
    // 保存更新后的合约地址
    const deploymentsDir = path.join(process.cwd(), 'shared/deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // 从SystemDeployer获取实现合约地址
    const implementations = {};
    try {
      for (const contractName of Object.keys(result.contractAddresses)) {
        // 跳过库合约
        if (contractName.includes('Lib') || contractName === 'tokenImplementation') {
          continue;
        }
        
        // 尝试获取实现合约地址
        const proxyAddress = result.contractAddresses[contractName];
        if (proxyAddress && proxyAddress.startsWith('0x')) {
          try {
            const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
            implementations[contractName] = implAddress;
            logger.info(`获取到实现合约地址: ${contractName} => ${implAddress}`);
          } catch (error) {
            logger.warn(`无法获取${contractName}的实现合约地址: ${error.message}`);
          }
        }
      }
    } catch (error) {
      logger.warn(`获取实现合约地址时出错: ${error.message}`);
    }
    
    // 准备新格式的合约地址数据
    const formattedAddresses = {
      // 保留原始格式的地址（向后兼容）
      ...contractAddresses,
      
      // 新的格式 - 分离contracts和implementations
      contracts: {},
      implementations: {}
    };
    
    // 填充contracts字段
    Object.entries(contractAddresses).forEach(([name, address]) => {
      // 只处理合约地址，不包括库和tokenImplementation
      if (!name.includes('Lib') && name !== 'tokenImplementation' && address && address.startsWith('0x')) {
        formattedAddresses.contracts[name] = address;
      }
    });
    
    // 填充implementations字段
    Object.assign(formattedAddresses.implementations, implementations);
    // 添加tokenImplementation到implementations
    if (contractAddresses.tokenImplementation) {
      formattedAddresses.implementations['RealEstateToken'] = contractAddresses.tokenImplementation;
    }
    
    // 保存到scripts/deploy-state.json
    fs.writeFileSync(
      path.join(process.cwd(), 'scripts/deploy-state.json'),
      JSON.stringify(formattedAddresses, null, 2)
    );
    
    // 保存到shared/deployments/contracts.json
    fs.writeFileSync(
      path.join(deploymentsDir, 'contracts.json'),
      JSON.stringify(formattedAddresses, null, 2)
    );
    
    const networkFilename = `${network.name}-latest.json`;
    fs.writeFileSync(
      path.join(deploymentsDir, networkFilename),
      JSON.stringify(formattedAddresses, null, 2)
    );
    
    // ========== 阶段4：部署验证 ==========
    const verificationSuccess = await runDeploymentVerification();
    
    // ========== 阶段5：运行测试 ==========
    if (verificationSuccess && process.env.RUN_TESTS === 'true') {
      await runTests();
    }
    
    // ========== 阶段6：设置系统角色 ==========
    await setupSystemRoles();
    
    // 输出部署摘要
    logger.info('\n🎉 部署全部完成！');
    logger.info(`📝 合约地址已保存至 ${path.join(process.cwd(), 'scripts/deploy-state.json')}`);
    logger.info(`💾 部署日志已保存至 ${path.join(process.cwd(), 'logs/deployment')}`);
    
    return { success: true };
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