/**
 * 部署代币实现合约并设置到TokenFactory
 * 解决代币创建问题
 */
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');
const logger = require('../shared/utils/logger');
const { closeLoggers } = require('../shared/utils/logger');

// 获取已部署合约地址
async function getContractAddresses() {
  try {
    // 尝试从shared/config/contracts.js加载
    try {
      const { getContractAddresses } = require('../shared/config/contracts');
      if (typeof getContractAddresses === 'function') {
        const addresses = getContractAddresses();
        if (addresses && Object.keys(addresses).length > 0) {
          return addresses;
        }
      }
    } catch (e) {
      logger.warn(`从shared/config加载失败: ${e.message}`);
    }
    
    // 尝试从deploy-state.json加载
    const deployStatePath = path.join(__dirname, 'deploy-state.json');
    if (fs.existsSync(deployStatePath)) {
      const deployState = JSON.parse(fs.readFileSync(deployStatePath, 'utf8'));
      if (deployState.contracts) {
        return deployState.contracts;
      }
      return deployState;
    }
    
    // 如果找不到，从logging/contracts.json加载
    const contractsPath = path.join(__dirname, 'logging/contracts.json');
    if (fs.existsSync(contractsPath)) {
      const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
      return contracts;
    }
    
    throw new Error('未找到合约地址');
  } catch (error) {
    logger.error(`获取合约地址失败: ${error.message}`);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    logger.info('=== 开始部署代币实现合约并配置TokenFactory ===');
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === 'unknown' ? 'localhost' : network.name;
    logger.info(`部署网络: ${networkName} (Chain ID: ${network.chainId})`);
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    logger.info(`部署者地址: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    logger.info(`部署者余额: ${ethers.formatEther(balance)} ETH`);
    
    // 获取已部署合约地址
    const contracts = await getContractAddresses();
    logger.info('已加载合约地址');
    
    // 确认TokenFactory合约已部署
    if (!contracts.TokenFactory) {
      throw new Error('TokenFactory合约未找到，请先部署基础合约');
    }
    
    logger.info(`TokenFactory地址: ${contracts.TokenFactory}`);
    
    // 获取TokenFactory合约实例
    const tokenFactory = await ethers.getContractAt('TokenFactory', contracts.TokenFactory);
    
    // 获取当前TokenFactory中的实现地址
    const currentImplementation = await tokenFactory.tokenImplementation();
    logger.info(`当前TokenFactory实现地址: ${currentImplementation}`);
    
    // 检查是否已有有效的实现地址
    const isZeroAddress = currentImplementation === ethers.ZeroAddress;
    if (!isZeroAddress) {
      logger.info(`TokenFactory已有非零实现地址: ${currentImplementation}`);
      
      // 询问是否继续部署新的实现
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      if (!process.env.FORCE_DEPLOY) {
        const continueDeployment = await new Promise(resolve => {
          readline.question('TokenFactory已有实现地址，是否仍要部署并更新? (y/N): ', answer => {
            resolve(answer.toLowerCase() === 'y');
            readline.close();
          });
        });
        
        if (!continueDeployment) {
          logger.info('已取消部署，保留现有实现地址');
          return {
            tokenImplementation: currentImplementation,
            success: true,
            message: '保留现有实现地址'
          };
        }
      }
    }
    
    // 部署RealEstateToken实现合约
    logger.info('开始部署RealEstateToken实现合约...');
    const RealEstateToken = await ethers.getContractFactory('RealEstateToken');
    const tokenImplementation = await RealEstateToken.deploy();
    
    // 等待部署完成
    logger.info('等待代币实现合约部署完成...');
    await tokenImplementation.waitForDeployment();
    
    // 获取部署地址
    const tokenImplAddress = await tokenImplementation.getAddress();
    logger.info(`RealEstateToken实现合约已部署: ${tokenImplAddress}`);
    
    // 检查部署者是否有权限调用更新函数
    logger.info('检查部署者角色...');
    const roleManager = await ethers.getContractAt('RoleManager', await tokenFactory.roleManager());
    const SUPER_ADMIN = await roleManager.SUPER_ADMIN();
    
    const hasSuperAdmin = await roleManager.hasRole(SUPER_ADMIN, deployer.address);
    logger.info(`部署者是否有SUPER_ADMIN角色: ${hasSuperAdmin}`);
    
    if (!hasSuperAdmin) {
      logger.warn('部署者没有SUPER_ADMIN角色，可能无法更新TokenFactory');
      logger.warn('尝试继续更新，但可能会失败...');
    }
    
    // 更新TokenFactory的代币实现地址
    logger.info('正在更新TokenFactory的代币实现地址...');
    try {
      // 使用正确的方法名称更新实现地址
      // 根据合约函数可能是updateTokenImplementation或setTokenImplementation
      let tx;
      try {
        // 首先尝试updateTokenImplementation
        tx = await tokenFactory.updateTokenImplementation(tokenImplAddress);
      } catch (e) {
        // 如果失败，尝试setTokenImplementation
        logger.info('updateTokenImplementation失败，尝试setTokenImplementation...');
        tx = await tokenFactory.setTokenImplementation(tokenImplAddress);
      }
      
      // 等待交易确认
      logger.info(`交易已提交，等待确认...`);
      await tx.wait();
      logger.info(`交易已确认！`);
    } catch (error) {
      logger.error(`更新TokenFactory失败: ${error.message}`);
      throw error;
    }
    
    // 验证更新是否成功
    const newImplementation = await tokenFactory.tokenImplementation();
    logger.info(`更新后的TokenFactory实现地址: ${newImplementation}`);
    
    if (newImplementation !== tokenImplAddress) {
      const errorMsg = `验证失败：TokenFactory.tokenImplementation (${newImplementation}) 与部署的实现 (${tokenImplAddress}) 不匹配`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    logger.info('✅ TokenFactory代币实现地址更新成功!');
    
    // 保存代币实现地址到文件
    const outputData = {
      ...contracts,
      RealEstateTokenImplementation: tokenImplAddress
    };
    
    try {
      // 更新deploy-state.json
      await updateDeployStateWithTokenImpl(tokenImplAddress);
    } catch (error) {
      logger.error(`保存配置文件失败: ${error.message}`);
      // 不中断流程，因为合约已经更新成功
    }
    
    logger.info('=====================================');
    logger.info('✅ 配置完成 - 现在可以创建代币了!');
    logger.info('TokenFactory.tokenImplementation已正确设置');
    logger.info('业务流程测试应该可以正常运行');
    
    return {
      tokenImplementation: tokenImplAddress,
      success: true
    };
  } catch (error) {
    logger.error('部署代币实现合约失败:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    closeLoggers();
  }
}

async function updateDeployStateWithTokenImpl(tokenImplAddress) {
  logger.info('更新部署状态文件...');

  try {
    // 从deploy-state.json加载当前状态
    const deployStatePath = path.join(__dirname, 'deploy-state.json');
    const deployStateContent = fs.existsSync(deployStatePath)
      ? JSON.parse(fs.readFileSync(deployStatePath, 'utf8'))
      : {};
    
    // 更新token实现地址 - 使用扁平结构
    deployStateContent['RealEstateTokenImplementation'] = tokenImplAddress;
    
    // 保存更新后的状态
    fs.writeFileSync(
      deployStatePath,
      JSON.stringify(deployStateContent, null, 2)
    );
    
    logger.info(`已更新deploy-state.json，RealEstateTokenImplementation: ${tokenImplAddress}`);
    
    // 同时更新logging/contracts.json
    const loggingPath = path.join(__dirname, 'logging', 'contracts.json');
    if (fs.existsSync(loggingPath)) {
      const loggingContent = JSON.parse(fs.readFileSync(loggingPath, 'utf8'));
      
      // 确保contracts字段存在
      if (!loggingContent.contracts) {
        loggingContent.contracts = {};
      }
      
      // 更新token实现地址
      loggingContent.contracts['RealEstateTokenImplementation'] = tokenImplAddress;
      
      // 保存
      fs.writeFileSync(
        loggingPath,
        JSON.stringify(loggingContent, null, 2)
      );
      
      logger.info(`已更新logging/contracts.json`);
    }
  } catch (error) {
    logger.error('更新部署状态出错:', error);
    throw error;
  }
}

// 执行主函数
if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log(`✨ 代币实现合约已部署并配置: ${result.tokenImplementation}`);
        console.log(`TokenFactory现在可以正常创建代币了！`);
        process.exit(0);
      } else {
        console.error(`❌ 部署失败: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 