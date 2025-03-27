/**
 * 部署工具模块
 * 提供智能合约部署和验证的公共函数
 */
const { getAbi } = require('../contracts/getAbis');
const { configManager } = require('../config');
const contracts = require('../config/contracts');
const deployConfig = require('../config/deploy');
const logger = require('./logger').getLogger('deploy');
const { executeTransaction } = require('./transaction');
// 使用我们的ethers-v5模块
const { ethers, getAddress, isAddress } = require('./ethers-v5');

/**
 * 获取合约地址（兼容不同版本的ethers）
 * @param {Object} contract 合约对象
 * @returns {Promise<string>} 合约地址
 */
async function getContractAddress(contract) {
  try {
    // 如果合约有address属性(通常是v5)
    if (contract.address) {
      return contract.address;
    }
    // 如果getAddress是函数(通常是v6)
    else if (typeof contract.getAddress === 'function') {
      return await contract.getAddress();
    }
    // 兜底方案
    else {
      logger.error('无法获取合约地址：合约对象既没有address属性也没有getAddress方法');
      throw new Error('无法获取合约地址：合约对象格式不支持');
    }
  } catch (error) {
    logger.error(`获取合约地址时出错: ${error.message}`);
    throw error;
  }
}

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
    
    // 获取交易，兼容v5和v6
    let tx;
    if (contract.deployTransaction) {
      // ethers v5
      tx = contract.deployTransaction;
    } else if (typeof contract.deploymentTransaction === 'function') {
      // ethers v6
      tx = contract.deploymentTransaction();
    } else {
      throw new Error('无法获取部署交易');
    }
    
    if (!tx) {
      throw new Error('Deployment transaction is not available');
    }
    
    logger.info(`${contractName} 部署交易已提交: ${tx.hash}`);
    
    // 等待合约部署确认
    if (typeof contract.waitForDeployment === 'function') {
      // ethers v6
      await contract.waitForDeployment();
    } else if (typeof contract.deployed === 'function') {
      // ethers v5
      await contract.deployed();
    } else {
      // 尝试等待交易确认
      await tx.wait(1);
    }
    
    const contractAddress = await getContractAddress(contract);
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
    
    // 获取Hardhat的run函数
    // 注意：这个函数需要在Hardhat环境中使用
    // 在非Hardhat环境中，此验证可能会失败
    let hardhatRun;
    try {
      const hardhat = require('hardhat');
      hardhatRun = hardhat.run;
    } catch (error) {
      logger.warn(`无法加载Hardhat: ${error.message}`);
      return false;
    }
    
    if (!hardhatRun) {
      logger.warn('Hardhat run函数不可用，无法验证合约');
      return false;
    }
    
    // 根据不同的网络选择验证方式
    switch (chainId) {
      case 1: // Ethereum Mainnet
        // 使用 Etherscan API
        await hardhatRun('verify:verify', {
          address: contractAddress,
          constructorArguments: constructorArgs
        });
        break;
        
      case 56: // BSC Mainnet
        // 使用 BSCscan API
        await hardhatRun('verify:verify', {
          address: contractAddress,
          constructorArguments: constructorArgs
        });
        break;
        
      case 97: // BSC Testnet
        // 使用 BSCscan Testnet API
        await hardhatRun('verify:verify', {
          address: contractAddress,
          constructorArguments: constructorArgs
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
    const implementationAddress = await getContractAddress(contract);
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
    
    // 部署库 - ethers v5中factory.deploy()方法支持将options作为覆盖参数传递
    const library = await factory.deploy({
      ...options
    });
    
    // 兼容 ethers v5 和 v6
    let deployTx;
    if (library.deployTransaction) {
      // ethers v5
      deployTx = library.deployTransaction;
    } else if (typeof library.deploymentTransaction === 'function') {
      // ethers v6
      deployTx = library.deploymentTransaction();
    } else {
      throw new Error('无法获取部署交易信息');
    }
    
    logger.info(`${libraryName} 部署交易已提交: ${deployTx.hash}`);
    
    // 等待部署完成 - 兼容不同版本
    if (typeof library.waitForDeployment === 'function') {
      // ethers v6
      await library.waitForDeployment();
    } else if (typeof library.deployed === 'function') {
      // ethers v5
      await library.deployed();
    } else {
      // 尝试等待交易确认
      await deployTx.wait(1);
    }
    
    // 获取合约地址
    let libraryAddress;
    if (library.address) {
      // ethers v5
      libraryAddress = library.address;
    } else if (typeof library.getAddress === 'function') {
      // ethers v6
      libraryAddress = await library.getAddress();
    } else {
      throw new Error('无法获取库合约地址');
    }
    
    logger.info(`${libraryName} 部署成功，地址: ${libraryAddress}`);
    
    // 更新合约地址配置
    const configKey = libraryName.charAt(0).toLowerCase() + libraryName.slice(1);
    contracts.updateContractAddress(configKey, libraryAddress.toString());
    
    // 保存部署状态
    if (options.saveState !== false) {
      contracts.saveToDeployState();
    }
    
    // 返回部署结果
    return {
      success: true,
      contractAddress: libraryAddress.toString(),
      libraryName,
      transactionHash: deployTx.hash
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