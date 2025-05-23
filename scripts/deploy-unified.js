/**
 * 统一部署入口
 * 支持所有网络的部署，替代原有的deploy.js和deploy-bsc-testnet.js
 */
require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 导入共享模块
const { 
  logger, 
  deployUtils, 
  getLogger, 
  transaction, 
  contractService
} = require("../shared/utils");
// 使用ethers-v5模块来替代ethersUtils
const ethersUtils = require("../shared/utils/ethers-v5");
const { closeLoggers } = require("../shared/utils/logger");
const config = require("../shared/config");
const contracts = require("../shared/config/contracts");

// 获取部署专用日志记录器
const deployLogger = getLogger("deploy");

// 最大重试次数
const MAX_RETRIES = 3;
// 重试间隔（毫秒）
const RETRY_INTERVAL = 5000;

// 部署合约的辅助函数，包含重试逻辑
async function deployWithRetry(contractName, factory, deployFn, retries = 0) {
  try {
    deployLogger.info(`部署 ${contractName}... 尝试次数: ${retries + 1}`);
    return await deployFn();
  } catch (error) {
    if (retries < MAX_RETRIES) {
      deployLogger.warn(`部署 ${contractName} 失败，将在 ${RETRY_INTERVAL/1000} 秒后重试...`);
      deployLogger.warn(`错误: ${error.message}`);
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      return deployWithRetry(contractName, factory, deployFn, retries + 1);
    } else {
      deployLogger.error(`部署 ${contractName} 失败，已达到最大重试次数`);
      throw error;
    }
  }
}

// 监听部署进度的辅助函数
async function monitorDeploymentProgress(deployerContract) {
  deployLogger.info("开始监听部署进度...");
  
  // 定义部署步骤名称
  const stepNames = [
    "初始化", 
    "RoleManager", 
    "FeeManager", 
    "PropertyRegistry", 
    "RentDistributor",
    "TokenImplementation", 
    "TokenFactory", 
    "RedemptionManager", 
    "Marketplace", 
    "TokenHolderQuery", 
    "RealEstateSystem",
    "授予角色"
  ];
  
  try {
    // 设置事件过滤器 - 兼容ethers v5
    const filter = deployerContract.filters.DeploymentProgress();
    
    // 监听事件
    deployerContract.on(filter, (step, contractName, contractAddress) => {
      const stepNumber = Number(step);
      deployLogger.info(`步骤 ${stepNumber}/${stepNames.length-1}: ${contractName} 部署完成 (${contractAddress})`);
      
      // 如果是最后一步，停止监听
      if (stepNumber === stepNames.length - 1) {
        deployLogger.info("所有合约部署完成！");
        deployerContract.removeAllListeners();
      }
    });
    
    // 兼容性检查：添加错误处理
    deployerContract.on('error', (error) => {
      deployLogger.error(`监听部署事件时发生错误: ${error.message}`);
    });
  } catch (error) {
    deployLogger.error(`设置事件监听器时发生错误: ${error.message}`);
    // 继续执行部署，不因监听器问题中断
  }
}

// 保存部署记录
function saveDeploymentRecord(deployedContracts, chainId, networkName, deployer) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const deploymentPath = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const contractNames = [
    "RealEstateSystem",
    "RoleManager",
    "FeeManager",
    "PropertyRegistry",
    "TokenFactory",
    "RedemptionManager",
    "RentDistributor",
    "Marketplace",
    "TokenHolderQuery"
  ];
  
  // 创建部署记录对象
  const contractAddresses = {};
  for (let i = 0; i < contractNames.length; i++) {
    // Convert BigInt to string if needed
    const address = deployedContracts[i];
    contractAddresses[contractNames[i]] = typeof address === 'bigint' ? address.toString() : address;
  }
  
  const deploymentData = {
    network: networkName,
    chainId: chainId.toString(), // Convert chainId to string
    timestamp: timestamp,
    deployer: deployer,
    contracts: contractAddresses
  };
  
  // 保存部署记录，使用自定义replacer处理BigInt
  const replacer = (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  };
  
  // 保存部署记录
  const deploymentFile = path.join(deploymentPath, `${networkName}-${timestamp}.json`);
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(deploymentData, replacer, 2)
  );
  
  // 更新最新部署记录
  const latestDeploymentFile = path.join(deploymentPath, `${networkName}-latest.json`);
  fs.writeFileSync(
    latestDeploymentFile,
    JSON.stringify(deploymentData, replacer, 2)
  );
  
  // 同时更新共享配置中的合约地址
  Object.entries(contractAddresses).forEach(([name, address]) => {
    const configKey = name.charAt(0).toLowerCase() + name.slice(1);
    contracts.updateContractAddress(configKey, address);
  });
  
  // 保存到deploy-state.json
  contracts.saveToDeployState();
  
  deployLogger.info(`部署记录已保存到: ${deploymentFile}`);
}

// 逐步部署系统的辅助函数
async function deployStep(deployer_contract, step) {
  deployLogger.info(`部署步骤 ${step}...`);
  
  try {
    // 检查合约方法是否可用
    if (typeof deployer_contract.deployStep !== 'function') {
      throw new Error(`deployStep 方法不可用`);
    }
    
    // 使用共享的交易执行工具
    const result = await transaction.executeTransaction(
      deployer_contract,
      'deployStep',
      [step],
      {
        operation: `部署步骤 ${step}`,
        estimateGas: true,
        safetyMargin: 0.2,
        priority: 'medium'
      }
    );
    
    if (!result.success) {
      throw new Error(`步骤 ${step} 部署失败: ${result.error.message}`);
    }
    
    // 记录部署结果
    deployLogger.info(`步骤 ${step} 部署完成`);
    if (result.transactionHash) {
      deployLogger.info(`交易哈希: ${result.transactionHash}`);
    }
    if (result.gasUsed) {
      deployLogger.info(`Gas使用: ${result.gasUsed}`);
    }
    if (result.effectiveGasPrice) {
      deployLogger.info(`实际Gas价格: ${result.effectiveGasPrice}`);
    }
    if (result.blockNumber) {
      deployLogger.info(`部署区块: ${result.blockNumber}`);
    }
    
    return true;
  } catch (error) {
    deployLogger.error(`步骤 ${step} 部署失败: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    // 添加详细的错误日志记录
    console.error = function() {
      deployLogger.error.apply(deployLogger, arguments);
      console.log.apply(console, arguments);
    };
    console.warn = function() {
      deployLogger.warn.apply(deployLogger, arguments);
      console.log.apply(console, arguments);
    };
    
    // 获取网络和部署者信息
    try {
      // 使用Hardhat-ethers提供的ethers v5方法
      const signers = await ethers.getSigners();
      const signer = signers[0];
      
      console.log('成功获取签名者:', signer);
      
      try {
        // 获取签名者地址
        const signerAddress = await signer.getAddress();
        
        if (!signerAddress) {
          throw new Error('无法确定签名者地址');
        }
        
        console.log('成功获取签名者地址:', signerAddress);
        
        try {
          // 使用ethers v5的方法获取网络信息
          console.log('正在获取网络信息...');
          const provider = ethers.provider;
          if (!provider) {
            throw new Error('Provider未初始化');
          }
          
          console.log('Provider类型:', provider.constructor.name);
          console.log('Provider连接:', provider.connection);
          
          // 检查provider的方法
          console.log('Provider方法:', Object.keys(provider).filter(key => typeof provider[key] === 'function'));
          
          const network = await provider.getNetwork();
          console.log('网络信息:', network);
          
          const chainId = network.chainId;
          const networkName = network.name !== 'unknown' ? network.name : `chain-${chainId}`;
          
          // 获取余额
          const balanceWei = await provider.getBalance(signerAddress);
          const balance = ethersUtils.formatEther(balanceWei);
          
          // 记录部署信息
          deployLogger.info(`部署网络: ${networkName} (Chain ID: ${chainId})`);
          deployLogger.info(`部署账户: ${signerAddress}`);
          deployLogger.info(`账户余额: ${balance} ETH`);
          
          // 检查余额是否足够
          if (parseFloat(balance) < 0.1) {
            deployLogger.warn(`警告: 账户余额较低 (${balance} ETH), 可能无法完成部署`);
          }
          
          // 库合约部署
          deployLogger.info("部署库合约...");
          
          // 部署 SystemDeployerLib1
          deployLogger.info("开始部署 SystemDeployerLib1...");
          const SystemDeployerLib1 = await ethers.getContractFactory('SystemDeployerLib1');
          
          // 检查合约工厂实例
          if (!SystemDeployerLib1 || !SystemDeployerLib1.bytecode) {
            throw new Error('SystemDeployerLib1合约工厂无效或bytecode为空');
          }
          
          console.log('SystemDeployerLib1工厂创建成功, bytecode长度:', SystemDeployerLib1.bytecode.length);
          
          const estimatedGas1 = await ethers.provider.estimateGas({
            from: signerAddress,
            data: SystemDeployerLib1.bytecode
          });
          const gasLimit1 = BigInt(Math.floor(Number(estimatedGas1) * 1.5));
          deployLogger.info(`SystemDeployerLib1 预估 gas: ${estimatedGas1}`);
          deployLogger.info(`SystemDeployerLib1 设置 gas 限制: ${gasLimit1}`);

          const lib1Result = await deployUtils.deployContract(
            SystemDeployerLib1,
            'SystemDeployerLib1',
            [],
            {
              gasLimit: gasLimit1
            }
          );

          if (!lib1Result.success) {
            throw new Error(`SystemDeployerLib1 部署失败: ${lib1Result.error.message}`);
          }
          
          // 部署 SystemDeployerLib2
          const SystemDeployerLib2 = await ethers.getContractFactory('SystemDeployerLib2');
          const estimatedGas2 = await ethers.provider.estimateGas({
            from: signerAddress,
            data: SystemDeployerLib2.bytecode
          });
          const gasLimit2 = BigInt(Math.floor(Number(estimatedGas2) * 1.5));
          deployLogger.info(`SystemDeployerLib2 预估 gas: ${estimatedGas2}`);
          deployLogger.info(`SystemDeployerLib2 设置 gas 限制: ${gasLimit2}`);

          const lib2Result = await deployUtils.deployContract(
            SystemDeployerLib2,
            'SystemDeployerLib2',
            [],
            {
              gasLimit: gasLimit2
            }
          );

          if (!lib2Result.success) {
            throw new Error(`SystemDeployerLib2 部署失败: ${lib2Result.error.message}`);
          }
          
          // 部署主合约
          deployLogger.info('部署主合约...');
          const SystemDeployer = await ethers.getContractFactory('SystemDeployer', {
            libraries: {
              SystemDeployerLib1: lib1Result.contractAddress,
              SystemDeployerLib2: lib2Result.contractAddress
            }
          });
          
          // 估算主合约的 gas
          const estimatedGas3 = await ethers.provider.estimateGas({
            from: signerAddress,
            data: SystemDeployer.bytecode
          });
          const gasLimit3 = BigInt(Math.floor(Number(estimatedGas3) * 1.5));
          deployLogger.info(`SystemDeployer 预估 gas: ${estimatedGas3}`);
          deployLogger.info(`SystemDeployer 设置 gas 限制: ${gasLimit3}`);

          // 部署主合约
          const systemDeployerResult = await deployUtils.deployContract(
            SystemDeployer,
            'SystemDeployer',
            [],
            {
              gasLimit: gasLimit3,
              priority: 'high'
            }
          );
          
          if (!systemDeployerResult.success) {
            throw new Error(`SystemDeployer 部署失败: ${systemDeployerResult.error.message}`);
          }
          
          // 记录部署结果
          deployLogger.info(`SystemDeployer 部署成功`);
          deployLogger.info(`合约地址: ${systemDeployerResult.contractAddress}`);
          if (systemDeployerResult.transactionHash) {
            deployLogger.info(`交易哈希: ${systemDeployerResult.transactionHash}`);
          }
          if (systemDeployerResult.gasUsed) {
            deployLogger.info(`Gas使用: ${systemDeployerResult.gasUsed}`);
          }
          if (systemDeployerResult.effectiveGasPrice) {
            deployLogger.info(`实际Gas价格: ${systemDeployerResult.effectiveGasPrice}`);
          }
          if (systemDeployerResult.blockNumber) {
            deployLogger.info(`部署区块: ${systemDeployerResult.blockNumber}`);
          }
          
          // 获取合约实例
          const systemDeployer = await ethers.getContractAt('SystemDeployer', systemDeployerResult.contractAddress);
          
          // 开始监听部署进度
          monitorDeploymentProgress(systemDeployer);
          
          // 逐步部署系统
          for (let step = 0; step < 12; step++) {
            try {
              await deployStep(systemDeployer, step);
              // 等待一段时间，确保交易被确认
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
              deployLogger.error(`部署步骤 ${step} 失败，停止部署`);
              throw error;
            }
          }
          
          // 获取部署的合约地址
          const deployedContracts = await systemDeployer.getDeployedContracts();
          
          // 保存部署记录
          saveDeploymentRecord(deployedContracts, chainId, networkName, signerAddress);
          
          deployLogger.info("部署完成！");
        } catch (error) {
          deployLogger.error('获取网络信息失败:', error);
          throw error;
        }
      } catch (error) {
        deployLogger.error('获取签名者地址失败:', error);
        throw error;
      }
    } catch (error) {
      deployLogger.error('获取签名者失败:', error);
      throw error;
    }
  } catch (error) {
    deployLogger.error(`部署失败: ${error.message}`);
    throw error;
  }
}

// 执行部署
main()
  .then(() => {
    deployLogger.info("部署成功完成，关闭日志记录器");
    closeLoggers();
    process.exit(0);
  })
  .catch((error) => {
    deployLogger.error(`部署失败: ${error}`);
    deployLogger.error("关闭日志记录器");
    closeLoggers();
    process.exit(1);
  });