/**
 * 核心部署模块
 * 提供智能合约部署的核心逻辑
 */
const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * 部署库合约
 * @param {Object} signer 部署账户
 * @param {Object} options 部署选项
 * @returns {Promise<Object>} 已部署的库合约地址映射
 */
async function deployLibraries(signer, options = {}) {
  logger.info('部署库合约...');
  const libraries = {};

  try {
    // 部署 SystemDeployerLib1
    logger.info('部署库合约 SystemDeployerLib1...');
    const SystemDeployerLib1 = await ethers.getContractFactory('SystemDeployerLib1', signer);
    
    let systemDeployerLib1;
    
    if (!options.skipGasEstimation) {
      // 使用估算的gas
      try {
        const estimatedGas1 = await ethers.provider.estimateGas(SystemDeployerLib1.getDeployTransaction());
        logger.info(`SystemDeployerLib1 预估 gas: ${estimatedGas1}`);
        const gasLimit1 = BigInt(Math.floor(Number(estimatedGas1) * 1.5));
        logger.info(`SystemDeployerLib1 设置 gas 限制: ${gasLimit1}`);
        systemDeployerLib1 = await SystemDeployerLib1.deploy({ gasLimit: gasLimit1 });
      } catch (error) {
        logger.warn(`SystemDeployerLib1 gas 预估失败: ${error.message}`);
        const gasLimit1 = options.defaultGasLimit || BigInt(10000000);
        logger.info(`SystemDeployerLib1 设置 gas 限制: ${gasLimit1}`);
        systemDeployerLib1 = await SystemDeployerLib1.deploy({ gasLimit: gasLimit1 });
      }
    } else {
      // 跳过gas估算，让Hardhat自动处理gas
      logger.info('SystemDeployerLib1 跳过gas估算，使用Hardhat自动处理');
      systemDeployerLib1 = await SystemDeployerLib1.deploy();
    }
    
    libraries['SystemDeployerLib1'] = await systemDeployerLib1.getAddress();
    logger.info(`SystemDeployerLib1 已部署: ${libraries['SystemDeployerLib1']}`);
    
    // 部署 SystemDeployerLib2
    logger.info('部署库合约 SystemDeployerLib2...');
    const SystemDeployerLib2 = await ethers.getContractFactory('SystemDeployerLib2', signer);
    
    let systemDeployerLib2;
    
    if (!options.skipGasEstimation) {
      // 使用估算的gas
      try {
        const estimatedGas2 = await ethers.provider.estimateGas(SystemDeployerLib2.getDeployTransaction());
        logger.info(`SystemDeployerLib2 预估 gas: ${estimatedGas2}`);
        const gasLimit2 = BigInt(Math.floor(Number(estimatedGas2) * 1.5));
        logger.info(`SystemDeployerLib2 设置 gas 限制: ${gasLimit2}`);
        systemDeployerLib2 = await SystemDeployerLib2.deploy({ gasLimit: gasLimit2 });
      } catch (error) {
        logger.warn(`SystemDeployerLib2 gas 预估失败: ${error.message}`);
        const gasLimit2 = options.defaultGasLimit || BigInt(10000000);
        logger.info(`SystemDeployerLib2 设置 gas 限制: ${gasLimit2}`);
        systemDeployerLib2 = await SystemDeployerLib2.deploy({ gasLimit: gasLimit2 });
      }
    } else {
      // 跳过gas估算，让Hardhat自动处理gas
      logger.info('SystemDeployerLib2 跳过gas估算，使用Hardhat自动处理');
      systemDeployerLib2 = await SystemDeployerLib2.deploy();
    }
    
    libraries['SystemDeployerLib2'] = await systemDeployerLib2.getAddress();
    logger.info(`SystemDeployerLib2 已部署: ${libraries['SystemDeployerLib2']}`);
    
    return libraries;
  } catch (error) {
    logger.error('库合约部署失败:', error);
    throw error;
  }
}

/**
 * 部署可升级合约
 * @param {string} contractName 合约名称
 * @param {Array} initArgs 初始化参数
 * @param {Object} libraries 库合约地址
 * @param {Object} options 部署选项
 * @returns {Promise<Object>} 已部署的合约信息
 */
async function deployUpgradeableContract(contractName, initArgs = [], libraries = {}, options = {}) {
  logger.info(`部署 ${contractName}...`);
  
  try {
    // 检查合约是否需要库
    const contractsRequiringLibraries = [
      'PropertyRegistry',
      'TokenFactory',
      'RealEstateSystem',
      'RentDistributor',
      'RedemptionManager',
      'Marketplace',
      'TokenHolderQuery'
    ];
    
    // 创建合约工厂，只有需要库的合约才链接库
    let Contract;
    if (contractsRequiringLibraries.includes(contractName)) {
      logger.info(`${contractName} 需要链接库`);
      Contract = await ethers.getContractFactory(contractName, {
        libraries: libraries
      });
    } else {
      logger.info(`${contractName} 不需要链接库`);
      Contract = await ethers.getContractFactory(contractName);
    }
    
    // 部署可升级合约
    const contract = await upgrades.deployProxy(Contract, initArgs, {
      initializer: 'initialize',
      kind: 'uups',
      ...options.upgradeOptions
    });
    
    // 获取代理地址和实现地址
    const proxyAddress = await contract.getAddress();
    logger.info(`${contractName} 代理地址: ${proxyAddress}`);
    
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    logger.info(`${contractName} 实现合约地址: ${implAddress}`);
    
    return {
      contract,
      proxyAddress,
      implementationAddress: implAddress
    };
  } catch (error) {
    // 处理特定错误 - 如果是库链接错误，尝试不带库重新部署
    if (error.message && error.message.includes("not one of its libraries")) {
      logger.warn(`${contractName} 不需要链接库，尝试重新部署...`);
      return deployUpgradeableContract(contractName, initArgs, {}, options);
    }
    
    logger.error(`${contractName} 部署失败:`, error);
    throw error;
  }
}

/**
 * 保存部署记录
 * @param {Object} deploymentRecord 部署记录
 * @param {string} networkName 网络名称
 * @param {boolean} generateSummary 是否生成摘要文档
 * @returns {Promise<void>}
 */
async function saveDeploymentRecord(deploymentRecord, networkName, generateSummary = true) {
  try {
    // 创建日志目录 - 使用绝对路径，避免嵌套scripts目录
    const rootDir = process.cwd();
    const loggingDir = path.join(rootDir, 'scripts', 'logging');
    if (!fs.existsSync(loggingDir)) {
      fs.mkdirSync(loggingDir, { recursive: true });
    }
    
    // 准备合约地址数据 - 直接作为扁平结构保存
    const contractAddresses = {
      ...deploymentRecord.libraries || {},
      ...deploymentRecord.contracts || {}
    };
    
    // 保存到scripts/logging/contracts.json - 保留完整版，包含libraries和contracts
    fs.writeFileSync(
      path.join(loggingDir, 'contracts.json'),
      JSON.stringify({
        libraries: deploymentRecord.libraries || {},
        contracts: deploymentRecord.contracts || {}
      }, null, 2)
    );
    logger.info('合约地址已保存到scripts/logging/contracts.json');
    
    // 保存到scripts/deploy-state.json - 以扁平结构保存，只包含合约地址
    fs.writeFileSync(
      path.join(rootDir, 'scripts', 'deploy-state.json'),
      JSON.stringify(contractAddresses, null, 2)
    );
    logger.info('合约地址已保存到scripts/deploy-state.json');
    
    // 保存完整部署记录
    const timestamp = deploymentRecord.timestamp || new Date().toISOString().replace(/:/g, '-');
    const deploymentPath = path.join(loggingDir, `${networkName}-${timestamp}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentRecord, null, 2));
    logger.info(`部署记录已保存到: ${deploymentPath}`);
    
    // 保存最新部署记录
    const latestPath = path.join(loggingDir, `${networkName}-latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(deploymentRecord, null, 2));
    
    // 生成部署摘要
    if (generateSummary) {
      const summary = generateDeploymentSummary(
        networkName,
        deploymentRecord.strategy,
        deploymentRecord.deployer,
        deploymentRecord.contracts,
        deploymentRecord.libraries
      );
      
      // 保存到scripts/logging/DEPLOYMENT.md
      fs.writeFileSync(
        path.join(loggingDir, 'DEPLOYMENT.md'),
        summary
      );
      logger.info('部署摘要已保存到scripts/logging/DEPLOYMENT.md');
      
      // 同时保存到scripts/DEPLOYMENT.md
      fs.writeFileSync(
        path.join(rootDir, 'scripts', 'DEPLOYMENT.md'),
        summary
      );
      logger.info('部署摘要已保存到scripts/DEPLOYMENT.md');
    }
  } catch (error) {
    logger.error('保存部署记录失败:', error);
    throw error;
  }
}

/**
 * 生成部署摘要文档
 */
function generateDeploymentSummary(networkName, strategy, deployerAddress, contracts, libraries) {
  const timestamp = new Date().toString();
  const strategyName = {
    'direct': '直接部署',
    'upgradeable': '可升级',
    'minimal': '最小化'
  }[strategy] || strategy;

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

module.exports = {
  deployLibraries,
  deployUpgradeableContract,
  saveDeploymentRecord,
  generateDeploymentSummary
};