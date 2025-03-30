/**
 * 区块链浏览器验证脚本
 * 
 * 该脚本用于在Etherscan等区块链浏览器上验证智能合约代码，
 * 适用于可升级合约，会同时验证代理合约和实现合约。
 */

require('dotenv').config();
const { ethers, upgrades, run } = require('hardhat');
const fs = require('fs');
const path = require('path');
const logger = require('../shared/utils/logger');

// 需要验证的合约列表
const CONTRACTS_TO_VERIFY = [
  'RoleManager',
  'FeeManager',
  'PropertyRegistry',
  'RentDistributor',
  'TokenFactory',
  'RedemptionManager',
  'Marketplace',
  'TokenHolderQuery',
  'RealEstateSystem'
];

// 标志特定网络是否支持验证
function isVerificationSupported(network) {
  const supportedNetworks = [
    'mainnet',           // 以太坊主网
    'sepolia',           // Sepolia测试网
    'bsc',               // 币安智能链主网
    'bsctestnet'         // 币安智能链测试网
  ];
  
  return supportedNetworks.includes(network);
}

// 加载部署状态
function loadDeploymentState() {
  try {
    const deployStateFile = path.join(process.cwd(), 'scripts/deploy-state.json');
    
    if (!fs.existsSync(deployStateFile)) {
      throw new Error(`部署状态文件不存在: ${deployStateFile}`);
    }
    
    return JSON.parse(fs.readFileSync(deployStateFile, 'utf8'));
  } catch (error) {
    logger.error('加载部署状态失败:', error);
    throw error;
  }
}

// 验证实现合约
async function verifyImplementationContract(contractName, proxyAddress) {
  try {
    // 获取实现合约地址
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    logger.info(`${contractName} 实现合约地址: ${implAddress}`);
    
    // 验证实现合约
    logger.info(`验证 ${contractName} 实现合约...`);
    
    try {
      await run('verify:verify', {
        address: implAddress,
        constructorArguments: []  // 实现合约通常没有构造函数参数
      });
      
      logger.info(`✅ ${contractName} 实现合约验证成功`);
      return true;
    } catch (error) {
      if (error.message.includes('already verified') || error.message.includes('Already Verified')) {
        logger.info(`✅ ${contractName} 实现合约已经验证过了`);
        return true;
      } else {
        logger.error(`❌ ${contractName} 实现合约验证失败: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    logger.error(`获取 ${contractName} 实现合约地址失败:`, error);
    return false;
  }
}

// 验证代理合约
async function verifyProxyContract(contractName, proxyAddress) {
  try {
    logger.info(`验证 ${contractName} 代理合约...`);
    
    try {
      // 对于代理合约，我们使用verify:verify-proxy命令
      // 注意：此命令是假设的，实际上根据您使用的工具可能不同
      // Hardhat Etherscan插件最新版本支持验证代理
      await run('verify:verify', {
        address: proxyAddress,
        constructorArguments: []
      });
      
      logger.info(`✅ ${contractName} 代理合约验证成功`);
      
      // 或者提示用户使用Etherscan的UI界面验证
      logger.info(`提示: 对于代理合约，建议在Etherscan界面使用'Verify as Proxy'功能手动验证`);
      
      return true;
    } catch (error) {
      if (error.message.includes('already verified') || error.message.includes('Already Verified') || error.message.includes('Proxy')) {
        logger.info(`✅ ${contractName} 代理合约已经验证过或识别为代理`);
        return true;
      } else {
        logger.warn(`⚠️ ${contractName} 代理合约验证失败: ${error.message}`);
        logger.info(`提示: 请在Etherscan界面使用'Verify as Proxy'功能手动验证代理合约`);
        return false;
      }
    }
  } catch (error) {
    logger.error(`验证 ${contractName} 代理合约失败:`, error);
    return false;
  }
}

// 验证库合约
async function verifyLibraryContract(libraryName, address) {
  try {
    logger.info(`验证库合约 ${libraryName}...`);
    
    try {
      await run('verify:verify', {
        address,
        constructorArguments: []
      });
      
      logger.info(`✅ ${libraryName} 验证成功`);
      return true;
    } catch (error) {
      if (error.message.includes('already verified') || error.message.includes('Already Verified')) {
        logger.info(`✅ ${libraryName} 已经验证过了`);
        return true;
      } else {
        logger.error(`❌ ${libraryName} 验证失败: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    logger.error(`验证库合约 ${libraryName} 失败:`, error);
    return false;
  }
}

// 主函数
async function main() {
  try {
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    logger.info(`当前网络: ${network.name} (Chain ID: ${network.chainId})`);
    
    // 检查是否支持验证
    if (!isVerificationSupported(network.name)) {
      logger.warn(`⚠️ 当前网络 ${network.name} 可能不支持合约验证！`);
      logger.info('继续验证过程，但可能会失败...');
    }
    
    // 加载部署状态
    const deployState = loadDeploymentState();
    logger.info('已加载部署状态');
    
    // 验证库合约
    const libraries = ['SystemDeployerLib1', 'SystemDeployerLib2'];
    logger.info('===== 验证库合约 =====');
    
    for (const libName of libraries) {
      if (deployState[libName]) {
        await verifyLibraryContract(libName, deployState[libName]);
      } else {
        logger.warn(`⚠️ 库合约 ${libName} 地址未找到，跳过验证`);
      }
    }
    
    // 验证代币实现合约
    if (deployState.tokenImplementation) {
      logger.info('===== 验证代币实现合约 =====');
      await verifyLibraryContract('RealEstateToken (实现)', deployState.tokenImplementation);
    }
    
    // 验证系统合约
    logger.info('===== 验证系统合约 =====');
    
    for (const contractName of CONTRACTS_TO_VERIFY) {
      const lowerFirstChar = contractName.charAt(0).toLowerCase() + contractName.slice(1);
      
      if (deployState[contractName]) {
        logger.info(`\n处理 ${contractName}...`);
        const proxyAddress = deployState[contractName];
        
        // 验证实现合约
        const implVerified = await verifyImplementationContract(contractName, proxyAddress);
        
        // 验证代理合约
        const proxyVerified = await verifyProxyContract(contractName, proxyAddress);
        
        if (implVerified && proxyVerified) {
          logger.info(`✅ ${contractName} 验证完成`);
        } else {
          logger.warn(`⚠️ ${contractName} 验证部分成功或失败`);
        }
      } else if (deployState[lowerFirstChar]) {
        logger.info(`\n处理 ${contractName}...`);
        const proxyAddress = deployState[lowerFirstChar];
        
        // 验证实现合约
        const implVerified = await verifyImplementationContract(contractName, proxyAddress);
        
        // 验证代理合约
        const proxyVerified = await verifyProxyContract(contractName, proxyAddress);
        
        if (implVerified && proxyVerified) {
          logger.info(`✅ ${contractName} 验证完成`);
        } else {
          logger.warn(`⚠️ ${contractName} 验证部分成功或失败`);
        }
      } else {
        logger.warn(`⚠️ 合约 ${contractName} 地址未找到，跳过验证`);
      }
    }
    
    logger.info('\n===== 合约验证过程完成 =====');
    logger.info('注意: 对于代理合约，可能需要在区块链浏览器上手动使用"Verify as Proxy"功能验证');
    
    return { success: true };
  } catch (error) {
    logger.error('验证过程发生错误:', error);
    return { success: false, error };
  }
}

// 执行验证
if (require.main === module) {
  main()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('执行验证脚本失败:', error);
      process.exit(1);
    });
}

// 导出main函数给其他脚本使用
module.exports = { main }; 