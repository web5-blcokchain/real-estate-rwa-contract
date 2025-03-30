/**
 * 部署核心模块 - 核心层
 * 
 * 该模块提供合约部署的核心功能，包括单个合约部署、库合约部署、保存部署记录等。
 * 它整合了deployUtils.js和旧版deployment-core.js的功能，提供统一的接口。
 * 
 * @module deployment-core
 * @version 1.0.0
 */

const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { deploymentState } = require('./deployment-state');

/**
 * 部署选项的默认值
 * @type {Object}
 */
const DEFAULT_OPTIONS = {
  // 交易选项
  transaction: {
    gasLimitMultiplier: 1.5,
    gasPrice: null,
    priority: 'normal', // 'low', 'normal', 'high'
    confirmations: 1
  },
  
  // 重试选项
  retry: {
    maxRetries: 3,
    retryInterval: 5000, // ms
    retryMultiplier: 1.5
  },
  
  // 升级选项
  upgrade: {
    kind: 'uups',
    timeout: 60000
  },
  
  // 验证选项
  verify: {
    enabled: false,
    delay: 60000
  },
  
  // 部署记录选项
  records: {
    saveRecords: true,
    generateSummary: true
  }
};

/**
 * 通用部署函数
 * @param {ethers.ContractFactory} factory 合约工厂
 * @param {string} contractName 合约名称
 * @param {Array} constructorArgs 构造函数参数
 * @param {Object} options 部署选项
 * @returns {Promise<Object>} 部署结果
 */
async function deployContract(factory, contractName, constructorArgs = [], options = {}) {
  // 合并默认选项
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    transaction: {
      ...DEFAULT_OPTIONS.transaction,
      ...options.transaction
    },
    retry: {
      ...DEFAULT_OPTIONS.retry,
      ...options.retry
    }
  };
  
  try {
    logger.info(`开始部署 ${contractName}...`);
    
    // 检查是否已经部署
    if (options.checkExisting !== false) {
      const configKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
      const existingAddress = await deploymentState.getContractAddress(configKey);
      
      if (existingAddress && !options.force && !options.forceRedeploy) {
        logger.info(`${contractName} 已部署在地址 ${existingAddress}，跳过部署`);
        return {
          success: true,
          alreadyDeployed: true,
          contractAddress: existingAddress,
          contractName
        };
      }
    }
    
    // 部署选项
    const deployOptions = {};
    
    // 设置gas限制
    if (options.gasLimit) {
      deployOptions.gasLimit = options.gasLimit;
    }
    
    // 设置gas价格
    if (mergedOptions.transaction.gasPrice) {
      deployOptions.gasPrice = mergedOptions.transaction.gasPrice;
    }
    
    // 设置交易优先级
    if (mergedOptions.transaction.priority === 'high') {
      const baseGasPrice = mergedOptions.transaction.gasPrice || await ethers.provider.getFeeData().then(fee => fee.gasPrice);
      deployOptions.maxFeePerGas = baseGasPrice * BigInt(2);
      deployOptions.maxPriorityFeePerGas = baseGasPrice / BigInt(2);
    }
    
    // 检查 provider
    const provider = await ethers.provider;
    if (!provider) {
      throw new Error('Provider is not initialized');
    }
    const network = await provider.getNetwork();
    logger.info(`使用网络: ${network.name}`);
    
    // 重试逻辑
    let retries = 0;
    let lastError = null;
    
    while (retries <= mergedOptions.retry.maxRetries) {
      try {
        if (retries > 0) {
          const delay = mergedOptions.retry.retryInterval * Math.pow(mergedOptions.retry.retryMultiplier, retries - 1);
          logger.info(`重试部署 ${contractName}... (${retries}/${mergedOptions.retry.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // 使用ethers的ContractFactory部署合约
        const contract = await factory.deploy(...constructorArgs, deployOptions);
        if (!contract) {
          throw new Error('Contract deployment failed');
        }
        
        // Ethers v6: Get deployment transaction
        const tx = contract.deploymentTransaction();
        if (!tx) {
          throw new Error('Deployment transaction is not available');
        }
        
        logger.info(`${contractName} 部署交易已提交: ${tx.hash}`);
        
        // 等待合约部署确认
        const receipt = await tx.wait(mergedOptions.transaction.confirmations);
        logger.info(`${contractName} 部署交易已确认: ${receipt.hash}`);
        
        const contractAddress = await contract.getAddress();
        logger.info(`${contractName} 部署成功，合约地址: ${contractAddress}`);
        
        // 更新部署时间戳
        await deploymentState.updateDeployTimestamp(contractName);
        
        // 更新合约地址
        if (options.updateAddresses !== false) {
          const configKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
          await deploymentState.updateContractAddress(configKey, contractAddress);
        }
        
        // 验证合约
        if (mergedOptions.verify.enabled) {
          // 延迟验证以确保合约代码已上链
          setTimeout(() => {
            verifyContract(contractAddress, contractName, constructorArgs)
              .catch(e => logger.error(`验证合约失败: ${e.message}`));
          }, mergedOptions.verify.delay);
        }
        
        // 返回部署结果
        return {
          success: true,
          contract,
          contractAddress: contractAddress.toString(),
          contractName,
          transactionHash: tx.hash
        };
      } catch (error) {
        lastError = error;
        retries++;
        
        // 如果是最后一次重试，则记录错误
        if (retries > mergedOptions.retry.maxRetries) {
          break;
        }
        
        logger.warn(`部署 ${contractName} 失败，将重试: ${error.message}`);
      }
    }
    
    // 如果所有重试都失败，则抛出错误
    logger.error(`${contractName} 部署失败: ${lastError.message}`);
    logger.error(`错误详情: ${JSON.stringify(lastError, null, 2)}`);
    
    // 构建错误对象
    const errorObj = {
      message: lastError.message,
      contractName,
      stack: lastError.stack
    };
    
    // 如果存在交易哈希，则添加
    if (lastError.transaction?.hash) {
      errorObj.transactionHash = lastError.transaction.hash;
    }
    
    return {
      success: false,
      error: errorObj
    };
  } catch (error) {
    logger.error(`${contractName} 部署失败: ${error.message}`);
    logger.error(`错误详情: ${JSON.stringify(error, null, 2)}`);
    
    // 构建错误对象
    const errorObj = {
      message: error.message,
      contractName,
      stack: error.stack
    };
    
    // 如果存在交易哈希，则添加
    if (error.transaction?.hash) {
      errorObj.transactionHash = error.transaction.hash;
    }
    
    return {
      success: false,
      error: errorObj
    };
  }
}

/**
 * 验证合约代码
 * @param {string} contractAddress 合约地址
 * @param {string} contractName 合约名称
 * @param {Array} constructorArgs 构造函数参数
 * @param {Object} options 验证选项
 * @returns {Promise<boolean>} 验证结果
 */
async function verifyContract(contractAddress, contractName, constructorArgs = [], options = {}) {
  try {
    logger.info(`开始验证合约 ${contractName} (${contractAddress})...`);
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    
    // 获取 run 函数
    const { run } = require('hardhat');
    
    // 根据不同的网络选择验证方式
    switch (chainId) {
      case 1n: // Ethereum Mainnet
      case 56n: // BSC Mainnet
      case 97n: // BSC Testnet
      case 11155111n: // Sepolia
        // 使用 Etherscan/BSCscan API
        await run('verify:verify', {
          address: contractAddress,
          constructorArguments: constructorArgs,
          ...options
        });
        break;
        
      default:
        logger.warn(`网络 ${network.name} (Chain ID: ${chainId}) 暂不支持合约验证`);
        return false;
    }
    
    logger.info(`合约 ${contractName} 验证成功`);
    return true;
  } catch (error) {
    // 如果已经验证，也返回成功
    if (error.message.includes('already verified') || error.message.includes('Already Verified')) {
      logger.info(`合约 ${contractName} 已经验证过了`);
      return true;
    }
    
    logger.error(`验证合约 ${contractName} 失败: ${error.message}`);
    throw error;
  }
}

/**
 * 部署库合约
 * @param {string[]} libraryNames 库合约名称数组
 * @param {Object} signer 部署账户
 * @param {Object} options 部署选项
 * @returns {Promise<Object>} 已部署的库合约地址映射
 */
async function deployLibraries(libraryNames, signer, options = {}) {
  logger.info('开始部署库合约...');
  const libraries = {};

  try {
    // 部署所有指定的库合约
    for (const libName of libraryNames) {
      logger.info(`部署库合约 ${libName}...`);
      const LibraryFactory = await ethers.getContractFactory(libName, signer);
      
      const gasEstimationOptions = { skipGasEstimation: options.skipGasEstimation };
      
      // 估算gas
      let gasLimit;
      if (!gasEstimationOptions.skipGasEstimation) {
        try {
          const txData = await LibraryFactory.getDeployTransaction();
          const estimatedGas = await ethers.provider.estimateGas({
            from: signer.address,
            data: txData.data
          });
          
          logger.info(`${libName} 预估 gas: ${estimatedGas}`);
          gasLimit = BigInt(Math.floor(Number(estimatedGas) * (options.gasLimitMultiplier || 1.5)));
          logger.info(`${libName} 设置 gas 限制: ${gasLimit}`);
        } catch (error) {
          logger.warn(`${libName} gas 预估失败: ${error.message}`);
          gasLimit = options.defaultGasLimit || BigInt(10000000);
          logger.info(`${libName} 使用默认 gas 限制: ${gasLimit}`);
        }
      }
      
      // 部署库合约
      const deployOptions = gasLimit ? { gasLimit } : {};
      const result = await deployContract(LibraryFactory, libName, [], {
        ...options,
        ...deployOptions
      });
      
      if (!result.success) {
        throw new Error(`部署库合约 ${libName} 失败: ${result.error.message}`);
      }
      
      libraries[libName] = result.contractAddress;
      logger.info(`${libName} 已部署: ${libraries[libName]}`);
    }
    
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
  logger.info(`部署可升级合约 ${contractName}...`);
  
  // 合并默认选项
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    upgrade: {
      ...DEFAULT_OPTIONS.upgrade,
      ...options.upgrade
    }
  };
  
  try {
    // 检查是否已经部署
    if (options.checkExisting !== false) {
      const configKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
      const existingAddress = await deploymentState.getContractAddress(configKey);
      
      if (existingAddress && !options.force && !options.forceRedeploy) {
        logger.info(`${contractName} 已部署在地址 ${existingAddress}，跳过部署`);
        return {
          success: true,
          alreadyDeployed: true,
          proxyAddress: existingAddress,
          contractName
        };
      }
    }
    
    // 检查合约是否需要库
    let contractFactoryOptions = {};
    
    // 如果有提供库，使用提供的库
    if (Object.keys(libraries).length > 0) {
      contractFactoryOptions.libraries = libraries;
    }
    
    // 创建合约工厂
    const Contract = await ethers.getContractFactory(
      contractName,
      contractFactoryOptions
    );
    
    // 部署可升级合约
    const contract = await upgrades.deployProxy(Contract, initArgs, {
      initializer: 'initialize',
      kind: mergedOptions.upgrade.kind,
      timeout: mergedOptions.upgrade.timeout,
      unsafeAllow: options.unsafeAllow,
      ...options.upgradeOptions
    });
    
    // 等待部署完成
    await contract.waitForDeployment();
    
    // 获取代理地址和实现地址
    const proxyAddress = await contract.getAddress();
    logger.info(`${contractName} 代理地址: ${proxyAddress}`);
    
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    logger.info(`${contractName} 实现合约地址: ${implAddress}`);
    
    // 更新部署时间戳
    await deploymentState.updateDeployTimestamp(contractName);
    
    // 更新合约地址
    if (options.updateAddresses !== false) {
      const configKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
      await deploymentState.updateContractAddress(configKey, proxyAddress);
    }
    
    // 验证合约
    if (mergedOptions.verify.enabled) {
      // 延迟验证以确保合约代码已上链
      setTimeout(() => {
        verifyContract(implAddress, contractName, [])
          .catch(e => logger.error(`验证合约失败: ${e.message}`));
      }, mergedOptions.verify.delay);
    }
    
    return {
      success: true,
      contract,
      proxyAddress,
      implementationAddress: implAddress,
      contractName
    };
  } catch (error) {
    // 处理特定错误 - 如果是库链接错误，尝试不带库重新部署
    if (error.message && error.message.includes("not one of its libraries") && Object.keys(libraries).length > 0) {
      logger.warn(`${contractName} 不需要链接库，尝试重新部署...`);
      return deployUpgradeableContract(contractName, initArgs, {}, options);
    }
    
    logger.error(`${contractName} 部署失败:`, error);
    
    return {
      success: false,
      error: {
        message: error.message,
        contractName,
        stack: error.stack
      }
    };
  }
}

/**
 * 保存部署记录
 * @param {Object} deploymentRecord 部署记录
 * @param {string} networkName 网络名称
 * @param {Object} options 选项
 * @returns {Promise<void>}
 */
async function saveDeploymentRecord(deploymentRecord, networkName, options = {}) {
  // 合并默认选项
  const mergedOptions = {
    ...DEFAULT_OPTIONS.records,
    ...options
  };
  
  try {
    // 确保部署记录有时间戳
    if (!deploymentRecord.timestamp) {
      deploymentRecord.timestamp = new Date().toISOString();
    }
    
    // 创建日志目录
    const rootDir = process.cwd();
    const loggingDir = path.join(rootDir, 'scripts', 'logging');
    if (!fs.existsSync(loggingDir)) {
      fs.mkdirSync(loggingDir, { recursive: true });
    }
    
    // 创建部署记录目录
    const deploymentDir = path.join(rootDir, 'shared', 'deployments');
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    // 准备合约地址数据
    const contractAddresses = {
      ...deploymentRecord.libraries || {},
      ...deploymentRecord.contracts || {}
    };
    
    // 保存到scripts/logging/contracts.json
    fs.writeFileSync(
      path.join(loggingDir, 'contracts.json'),
      JSON.stringify({
        libraries: deploymentRecord.libraries || {},
        contracts: deploymentRecord.contracts || {}
      }, null, 2)
    );
    logger.info('合约地址已保存到scripts/logging/contracts.json');
    
    // 保存到scripts/deploy-state.json
    fs.writeFileSync(
      path.join(rootDir, 'scripts', 'deploy-state.json'),
      JSON.stringify(contractAddresses, null, 2)
    );
    logger.info('合约地址已保存到scripts/deploy-state.json');
    
    // 保存到shared/deployments/contracts.json
    fs.writeFileSync(
      path.join(deploymentDir, 'contracts.json'),
      JSON.stringify(contractAddresses, null, 2)
    );
    logger.info('合约地址已保存到shared/deployments/contracts.json');
    
    // 格式化时间戳用于文件名
    const fileTimestamp = deploymentRecord.timestamp.replace(/:/g, '-');
    
    // 保存到shared/deployments/<network>-latest.json
    const latestPath = path.join(deploymentDir, `${networkName}-latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(deploymentRecord, null, 2));
    logger.info(`最新部署记录已保存到: ${latestPath}`);
    
    // 保存到scripts/logging/<network>-<timestamp>.json
    const timestampedPath = path.join(loggingDir, `${networkName}-${fileTimestamp}.json`);
    fs.writeFileSync(timestampedPath, JSON.stringify(deploymentRecord, null, 2));
    logger.info(`时间戳部署记录已保存到: ${timestampedPath}`);
    
    // 可选: 生成摘要文档
    if (mergedOptions.generateSummary) {
      const summaryText = generateDeploymentSummary(deploymentRecord, networkName);
      const summaryPath = path.join(loggingDir, 'DEPLOYMENT.md');
      fs.writeFileSync(summaryPath, summaryText);
      logger.info(`部署摘要已保存到: ${summaryPath}`);
    }
  } catch (error) {
    logger.error('保存部署记录失败:', error);
    throw error;
  }
}

/**
 * 生成部署摘要文档
 * @param {Object} record 部署记录
 * @param {string} networkName 网络名称
 * @returns {string} 摘要文档内容
 */
function generateDeploymentSummary(record, networkName) {
  const timestamp = record.timestamp || new Date().toISOString();
  
  let summaryText = `# 部署摘要\n\n`;
  summaryText += `网络: ${networkName}\n`;
  summaryText += `时间: ${timestamp}\n`;
  summaryText += `部署账户: ${record.deployer || '未知'}\n\n`;
  
  summaryText += `## 库合约\n\n`;
  const libraries = record.libraries || {};
  for (const [name, address] of Object.entries(libraries)) {
    summaryText += `- ${name}: ${address}\n`;
  }
  
  summaryText += `\n## 合约地址\n\n`;
  const contracts = record.contracts || {};
  for (const [name, address] of Object.entries(contracts)) {
    summaryText += `- ${name}: ${address}\n`;
  }
  
  if (record.strategy) {
    summaryText += `\n## 部署策略\n\n`;
    summaryText += `- 策略: ${record.strategy}\n`;
  }
  
  return summaryText;
}

/**
 * 升级可升级合约
 * @param {string} contractName 合约名称
 * @param {string} proxyAddress 代理合约地址
 * @param {Object} libraries 库合约地址
 * @param {Object} options 升级选项
 * @returns {Promise<Object>} 升级结果
 */
async function upgradeContract(contractName, proxyAddress, libraries = {}, options = {}) {
  logger.info(`升级合约 ${contractName} (${proxyAddress})...`);
  
  // 合并默认选项
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    upgrade: {
      ...DEFAULT_OPTIONS.upgrade,
      ...options.upgrade
    }
  };
  
  try {
    // 创建合约工厂
    const contractFactoryOptions = {};
    if (Object.keys(libraries).length > 0) {
      contractFactoryOptions.libraries = libraries;
    }
    
    const Contract = await ethers.getContractFactory(
      contractName,
      contractFactoryOptions
    );
    
    // 保存旧实现地址
    const oldImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    logger.info(`${contractName} 旧实现合约地址: ${oldImplAddress}`);
    
    // 升级合约
    const upgraded = await upgrades.upgradeProxy(proxyAddress, Contract, {
      kind: mergedOptions.upgrade.kind,
      timeout: mergedOptions.upgrade.timeout,
      unsafeAllow: options.unsafeAllow,
      ...options.upgradeOptions
    });
    
    // 等待升级完成
    await upgraded.waitForDeployment();
    
    // 获取新实现地址
    const newImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    logger.info(`${contractName} 新实现合约地址: ${newImplAddress}`);
    
    // 验证合约
    if (mergedOptions.verify.enabled) {
      // 延迟验证以确保合约代码已上链
      setTimeout(() => {
        verifyContract(newImplAddress, contractName, [])
          .catch(e => logger.error(`验证合约失败: ${e.message}`));
      }, mergedOptions.verify.delay);
    }
    
    return {
      success: true,
      contract: upgraded,
      proxyAddress,
      oldImplementationAddress: oldImplAddress,
      newImplementationAddress: newImplAddress,
      contractName
    };
  } catch (error) {
    // 处理特定错误 - 如果是库链接错误，尝试不带库重新升级
    if (error.message && error.message.includes("not one of its libraries") && Object.keys(libraries).length > 0) {
      logger.warn(`${contractName} 不需要链接库，尝试重新升级...`);
      return upgradeContract(contractName, proxyAddress, {}, options);
    }
    
    logger.error(`${contractName} 升级失败:`, error);
    
    return {
      success: false,
      error: {
        message: error.message,
        contractName,
        proxyAddress,
        stack: error.stack
      }
    };
  }
}

// 导出所有功能
module.exports = {
  // 部署功能
  deployContract,
  deployLibraries,
  deployUpgradeableContract,
  
  // 验证功能
  verifyContract,
  
  // 记录功能
  saveDeploymentRecord,
  generateDeploymentSummary,
  
  // 升级功能
  upgradeContract,
  
  // 默认选项
  DEFAULT_OPTIONS
};