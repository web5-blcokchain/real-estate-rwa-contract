/**
 * 智能合约部署脚本
 * 统一入口点
 */
require('dotenv').config();
const { ethers, upgrades, config } = require('hardhat');
const { DeploymentStrategy, loadDeploymentConfig } = require('../shared/config/deployment');
const logger = require('../shared/utils/logger');
const { closeLoggers } = require('../shared/utils/logger');
const fs = require('fs');
const path = require('path');
const {
  deployLibraries,
  deployUpgradeableContract,
  saveDeploymentRecord
} = require('../shared/utils/deployment-core');

/**
 * 生成部署摘要文档
 */
function generateDeploymentSummary(networkName, strategy, deployerAddress, contracts, libraries) {
  const timestamp = new Date().toString();
  const strategyName = {
    [DeploymentStrategy.DIRECT]: '直接部署',
    [DeploymentStrategy.UPGRADEABLE]: '可升级',
    [DeploymentStrategy.MINIMAL]: '最小化'
  }[strategy];

  let content = '# 部署摘要\n\n';
  content += '## 部署信息\n';
  content += `- 网络: ${networkName}\n`;
  content += `- 策略: ${strategyName}\n`;
  content += `- 部署账户: ${deployerAddress}\n\n`;
  
  content += '## 已部署合约\n';
  Object.keys(contracts).forEach(name => {
    content += `- ${name}: ${contracts[name]}\n`;
  });
  
  if (libraries && Object.keys(libraries).length > 0) {
    content += '\n## 库合约\n';
    Object.keys(libraries).forEach(name => {
      content += `- ${name}: ${libraries[name]}\n`;
    });
  }
  
  content += `\n## 部署时间\n${timestamp}\n`;
  
  return content;
}

/**
 * 部署入口函数
 */
async function main() {
  try {
    // 读取环境变量
    const strategy = process.env.DEPLOY_STRATEGY || 'upgradeable';
    const shouldVerify = process.env.DEPLOY_VERIFY === 'true';
    const forceDeploy = process.env.FORCE_DEPLOY === 'true';
    
    console.log(`部署策略: ${strategy}`);
    console.log(`验证合约: ${shouldVerify}`);
    console.log(`强制部署: ${forceDeploy}`);

    // 加载先前部署的合约地址
    let deployData = {};
    try {
      deployData = loadDeployments();
      console.log('已加载现有部署状态。');
    } catch (error) {
      console.log('未找到先前的部署状态，将创建新的部署记录。');
    }

    // 获取网络信息
    const networkName = hre.network.name;
    console.log(`部署到网络: ${networkName}`);
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log(`部署者地址: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    logger.info(`部署者余额: ${ethers.formatEther(balance)} ETH`);
    
    // 加载部署配置
    const deployConfig = await loadDeploymentConfig();
    
    // 获取合约顺序
    const contractDeployOrder = await getDeploymentOrder(strategy);
    
    // 获取网络配置
    const network = await getNetworkConfig();
    
    logger.info(`开始部署 (策略: ${strategy})`);
    logger.info(`部署网络: ${networkName} (Chain ID: ${network.chainId})`);
    logger.info(`部署账户: ${deployer.address}`);
    
    // 使用之前获取的账户余额，无需重复获取
    logger.info(`账户余额: ${ethers.formatEther(balance)} ETH`);
    
    // 如果强制重新部署，更新部署配置
    if (forceDeploy) {
      deployConfig.forceRedeploy = true;
      logger.info('强制重新部署模式已启用');
    }
    
    // 库合约部署
    console.log('=== 部署库合约 ===');
    const SystemDeployerLib1 = await ethers.getContractFactory('SystemDeployerLib1');
    const SystemDeployerLib2 = await ethers.getContractFactory('SystemDeployerLib2');
    
    // 预估库合约部署的gas使用量
    if (forceDeploy) {
      try {
        const lib1DeployTx = await SystemDeployerLib1.getDeployTransaction();
        const lib1GasEstimate = await deployer.estimateGas(lib1DeployTx);
        console.log(`SystemDeployerLib1预估gas使用量: ${lib1GasEstimate.toString()}`);
        
        const lib2DeployTx = await SystemDeployerLib2.getDeployTransaction();
        const lib2GasEstimate = await deployer.estimateGas(lib2DeployTx);
        console.log(`SystemDeployerLib2预估gas使用量: ${lib2GasEstimate.toString()}`);
        
        console.log('警告: 库合约非常大，可能需要大量gas进行部署');
        console.log('建议确保本地节点配置了足够高的区块gas限制');
        
        // 询问用户是否继续
        if (!process.env.SKIP_GAS_CONFIRMATION) {
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          await new Promise((resolve) => {
            readline.question('是否继续部署? (y/N): ', (answer) => {
              if (answer.toLowerCase() !== 'y') {
                console.log('部署已取消');
                process.exit(0);
              }
              readline.close();
              resolve();
            });
          });
        }
      } catch (error) {
        console.log('预估gas失败，这可能是因为合约太大。将继续尝试部署。');
        console.log(`错误详情: ${error.message}`);
      }
    }
    
    // 库合约部署逻辑
    let systemDeployerLib1, systemDeployerLib2;
    
    // 检查是否在强制部署模式下
    if (forceDeploy || !deployData.SystemDeployerLib1) {
      console.log('部署 SystemDeployerLib1...');
      systemDeployerLib1 = await SystemDeployerLib1.deploy();
      await systemDeployerLib1.deployed();
      console.log(`SystemDeployerLib1 已部署到: ${systemDeployerLib1.address}`);
    } else {
      console.log(`使用现有 SystemDeployerLib1: ${deployData.SystemDeployerLib1.address}`);
      systemDeployerLib1 = {address: deployData.SystemDeployerLib1.address};
    }

    if (forceDeploy || !deployData.SystemDeployerLib2) {
      console.log('部署 SystemDeployerLib2...');
      systemDeployerLib2 = await SystemDeployerLib2.deploy();
      await systemDeployerLib2.deployed();
      console.log(`SystemDeployerLib2 已部署到: ${systemDeployerLib2.address}`);
    } else {
      console.log(`使用现有 SystemDeployerLib2: ${deployData.SystemDeployerLib2.address}`);
      systemDeployerLib2 = {address: deployData.SystemDeployerLib2.address};
    }
    
    // 根据策略部署合约
    const deployedContracts = {};
    const implementations = {};
    
    if (strategy === DeploymentStrategy.UPGRADEABLE) {
      logger.info(`使用可升级部署策略...`);
      
      // 实现可升级部署逻辑
      for (const contractName of contractDeployOrder) {
        // 获取初始化参数
        const initFn = deployConfig.initializeParams[contractName];
        const initArgs = (typeof initFn === 'function') ? initFn(deployedContracts) : (initFn || []);
        
        // 部署合约
        const { proxyAddress, implementationAddress } = await deployUpgradeableContract(
          contractName,
          initArgs,
          {
            SystemDeployerLib1: systemDeployerLib1,
            SystemDeployerLib2: systemDeployerLib2
          },
          { force: forceDeploy }
        );
        
        deployedContracts[contractName] = proxyAddress;
        implementations[contractName] = implementationAddress;
      }
    } else if (strategy === DeploymentStrategy.DIRECT) {
      // 实现直接部署逻辑 (未实现)
      logger.warn('直接部署策略暂未实现');
    } else if (strategy === DeploymentStrategy.MINIMAL) {
      // 实现最小化部署逻辑 (未实现)
      logger.warn('最小化部署策略暂未实现');
    }
    
    // 保存部署记录
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const deploymentRecord = {
      timestamp,
      network: networkName,
      chainId: network.chainId.toString(),
      strategy,
      deployer: deployer.address,
      contracts: deployedContracts,
      libraries: { SystemDeployerLib1: systemDeployerLib1, SystemDeployerLib2: systemDeployerLib2 },
      implementations,
      forceDeployed: forceDeploy
    };
    
    await saveDeploymentRecord(deploymentRecord, networkName, true);
    
    // 输出部署信息
    logger.info(`====== 部署完成 ======`);
    logger.info(`已部署合约:`);
    
    for (const [name, address] of Object.entries(deployedContracts)) {
      logger.info(`${name}: ${address}`);
    }
    logger.info(`=====================`);
    
    return deployedContracts;
  } catch (error) {
    logger.error('部署失败:', error);
    throw error;
  } finally {
    closeLoggers();
  }
}

// 执行部署
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 