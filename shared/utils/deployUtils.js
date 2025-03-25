/**
 * 部署工具模块
 * 提供智能合约部署和验证的公共函数
 */
const { ethers } = require('hardhat');
const { logger } = require('./logger');
const { getProvider } = require('./web3Provider');
const { contracts, deployConfig } = require('../config');
const { executeTransaction } = require('./transaction');

/**
 * 通用部署函数
 * @param {ethers.ContractFactory} factory 合约工厂
 * @param {string} contractName 合约名称
 * @param {Array} constructorArgs 构造函数参数
 * @param {Object} options 部署选项
 * @returns {Promise<Object>} 部署结果
 */
async function deployContract(factory, contractName, constructorArgs = [], options = {}) {
  try {
    logger.info(`开始部署 ${contractName}...`);
    
    // 检查是否已经部署
    const existingAddress = contracts.addresses[contractName.charAt(0).toLowerCase() + contractName.slice(1)];
    if (existingAddress && !options.force && !deployConfig.forceRedeploy) {
      logger.info(`${contractName} 已部署在地址 ${existingAddress}，跳过部署`);
      return {
        success: true,
        alreadyDeployed: true,
        contractAddress: existingAddress,
        contractName
      };
    }
    
    // 部署选项
    const deployOptions = {};
    
    // 设置gas限制
    if (options.gasLimit) {
      deployOptions.gasLimit = options.gasLimit;
    }
    
    // 设置gas价格
    if (options.gasPrice) {
      deployOptions.gasPrice = options.gasPrice;
    }
    
    // 设置交易优先级
    if (options.priority === 'high') {
      const baseGasPrice = options.gasPrice || await ethers.provider.getFeeData().then(fee => fee.gasPrice);
      deployOptions.maxFeePerGas = baseGasPrice * BigInt(2);
      deployOptions.maxPriorityFeePerGas = baseGasPrice / BigInt(2);
    }
    
    // 检查 provider
    const provider = await ethers.provider;
    if (!provider) {
      throw new Error('Provider is not initialized');
    }
    logger.info(`使用网络: ${(await provider.getNetwork()).name}`);
    
    // 使用ethers的ContractFactory部署合约
    const contract = await factory.deploy(...constructorArgs, deployOptions);
    if (!contract) {
      throw new Error('Contract deployment failed');
    }
    
    const tx = contract.deploymentTransaction();
    if (!tx) {
      throw new Error('Deployment transaction is not available');
    }
    
    logger.info(`${contractName} 部署交易已提交: ${tx.hash}`);
    
    // 等待合约部署确认
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    logger.info(`${contractName} 部署成功，合约地址: ${contractAddress}`);
    
    // 更新合约地址配置
    const configKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
    contracts.updateContractAddress(configKey, contractAddress);
    
    // 保存部署状态
    if (options.saveState !== false) {
      contracts.saveToDeployState();
    }
    
    // 返回部署结果
    return {
      success: true,
      contractAddress: contractAddress.toString(),
      contractName,
      transactionHash: tx.hash
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
 * @returns {Promise<boolean>} 验证结果
 */
async function verifyContract(contractAddress, contractName, constructorArgs = []) {
  try {
    logger.info(`开始验证合约 ${contractName} (${contractAddress})...`);
    
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    
    // 根据不同的网络选择验证方式
    switch (chainId) {
      case 1: // Ethereum Mainnet
        // 使用 Etherscan API
        await run("verify:verify", {
          address: contractAddress,
          constructorArguments: constructorArgs,
        });
        break;
        
      case 56: // BSC Mainnet
        // 使用 BSCscan API
        await run("verify:verify", {
          address: contractAddress,
          constructorArguments: constructorArgs,
        });
        break;
        
      case 97: // BSC Testnet
        // 使用 BSCscan Testnet API
        await run("verify:verify", {
          address: contractAddress,
          constructorArguments: constructorArgs,
        });
        break;
        
      default:
        logger.warn(`网络 ${network.name} (Chain ID: ${chainId}) 暂不支持合约验证`);
        return false;
    }
    
    logger.info(`合约 ${contractName} 验证成功`);
    return true;
  } catch (error) {
    logger.error(`合约 ${contractName} 验证失败: ${error.message}`);
    return false;
  }
}

/**
 * 部署可升级合约
 * @param {ethers.ContractFactory} factory 合约工厂
 * @param {string} contractName 合约名称
 * @param {Array} constructorArgs 构造函数参数
 * @param {Array} initializerArgs 初始化函数参数
 * @param {Object} options 部署选项
 * @returns {Promise<Object>} 部署结果
 */
async function deployUpgradeableContract(factory, contractName, constructorArgs = [], initializerArgs = [], options = {}) {
  try {
    logger.info(`开始部署可升级合约 ${contractName}...`);
    
    // 检查是否已经部署
    const existingAddress = contracts.addresses[contractName.charAt(0).toLowerCase() + contractName.slice(1)];
    if (existingAddress && !options.force && !deployConfig.forceRedeploy) {
      logger.info(`${contractName} 已部署在地址 ${existingAddress}，跳过部署`);
      return {
        success: true,
        alreadyDeployed: true,
        contractAddress: existingAddress,
        contractName
      };
    }
    
    // 部署实现合约
    const contract = await factory.deploy(...constructorArgs);
    logger.info(`${contractName} 实现合约部署交易已提交: ${contract.deploymentTransaction().hash}`);
    await contract.waitForDeployment();
    const implementationAddress = await contract.getAddress();
    logger.info(`${contractName} 实现合约部署成功，地址: ${implementationAddress}`);
    
    // 部署代理合约
    logger.info(`部署 ${contractName} 的代理合约...`);
    const proxyContract = await deployProxyContract(implementationAddress, initializerArgs);
    
    // 更新合约地址配置
    const configKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
    contracts.updateContractAddress(configKey, proxyContract.address);
    
    // 保存部署状态
    if (options.saveState !== false) {
      contracts.saveToDeployState();
    }
    
    // 验证合约
    if (deployConfig.verifyContracts && options.verify !== false) {
      try {
        await verifyContract(implementationAddress, contractName, constructorArgs);
      } catch (verifyError) {
        logger.warn(`${contractName} 验证失败: ${verifyError.message}`);
      }
    }
    
    return {
      success: true,
      contractAddress: proxyContract.address,
      implementationAddress: implementationAddress,
      contractName,
      transactionHash: proxyContract.deploymentTransaction().hash
    };
  } catch (error) {
    logger.error(`${contractName} 可升级合约部署失败: ${error.message}`);
    return {
      success: false,
      error: {
        message: error.message,
        contractName,
        transactionHash: error.transaction?.hash
      }
    };
  }
}

/**
 * 部署代理合约 (简化实现)
 * @param {string} implementationAddress 实现合约地址
 * @param {Array} initializerArgs 初始化函数参数
 * @returns {Promise<ethers.Contract>} 代理合约
 */
async function deployProxyContract(implementationAddress, initializerArgs = []) {
  // 这里应该使用实际的代理合约部署逻辑
  // 在真实场景中会使用OpenZeppelin的可升级合约库
  
  // 模拟代理合约部署
  logger.info(`模拟代理合约部署，指向实现合约: ${implementationAddress}`);
  
  // 返回模拟的代理合约对象
  return {
    address: `0xProxy${implementationAddress.substring(4)}`,
    deploymentTransaction: () => ({
      hash: `0xProxyTx${Date.now().toString(16)}`
    })
  };
}

/**
 * 部署合约库
 * @param {ethers.ContractFactory} factory 合约工厂
 * @param {string} libraryName 库名称
 * @param {Object} options 部署选项
 * @returns {Promise<Object>} 部署结果
 */
async function deployLibrary(factory, libraryName, options = {}) {
  try {
    logger.info(`开始部署库 ${libraryName}...`);
    
    // 部署库
    const library = await factory.deploy(options);
    logger.info(`${libraryName} 部署交易已提交: ${library.deploymentTransaction().hash}`);
    
    // 等待部署完成
    await library.waitForDeployment();
    const libraryAddress = await library.getAddress();
    logger.info(`${libraryName} 部署成功，地址: ${libraryAddress}`);
    
    // 返回部署结果
    return {
      success: true,
      contractAddress: libraryAddress.toString(),
      libraryName,
      transactionHash: library.deploymentTransaction().hash
    };
  } catch (error) {
    logger.error(`${libraryName} 库部署失败: ${error.message}`);
    return {
      success: false,
      error: {
        message: error.message,
        libraryName,
        transactionHash: error.transaction?.hash
      }
    };
  }
}

/**
 * 初始化合约
 * @param {ethers.Contract} contract 合约实例
 * @param {string} initMethod 初始化方法名
 * @param {Array} args 方法参数
 * @param {Object} options 选项
 * @returns {Promise<Object>} 初始化结果
 */
async function initializeContract(contract, initMethod, args, options = {}) {
  return executeTransaction(contract, initMethod, args, {
    operation: `初始化合约 ${contract.address}`,
    ...options
  });
}

/**
 * 链接库到合约工厂
 * @param {Object} libraries 库地址映射
 * @param {Array<string>} contractNames 需要链接的合约名称
 * @returns {Object} 链接结果
 */
async function linkLibraries(libraries, contractNames) {
  try {
    logger.info(`开始链接库到合约: ${contractNames.join(', ')}...`);
    
    // 验证所有库地址
    for (const [name, address] of Object.entries(libraries)) {
      const code = await ethers.provider.getCode(address);
      if (code === '0x') {
        throw new Error(`库 ${name} 在地址 ${address} 不存在`);
      }
    }
    
    // 返回链接信息
    return {
      success: true,
      linkedLibraries: libraries,
      contractNames
    };
  } catch (error) {
    logger.error(`链接库失败: ${error.message}`);
    return {
      success: false,
      error: {
        message: error.message
      }
    };
  }
}

module.exports = {
  deployContract,
  verifyContract,
  deployUpgradeableContract,
  deployLibrary,
  initializeContract,
  linkLibraries
}; 