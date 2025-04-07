const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

// 日志工具
const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args),
  debug: (message, ...args) => console.debug(`DEBUG: ${message}`, ...args)
};

/**
 * 从环境变量获取部署信息
 * @returns {Object} 部署信息
 */
function getDeploymentInfo() {
  try {
    logger.info("从环境变量加载合约地址信息");
    
    // 尝试不同的环境变量命名模式获取合约地址
    const getAddressFromEnv = (contractName) => {
      const patterns = [
        `CONTRACT_${contractName.toUpperCase()}_ADDRESS`,
        `${contractName.toUpperCase()}_ADDRESS`,
        `${contractName.toUpperCase()}_CONTRACT_ADDRESS`,
        `CONTRACT_${contractName}`
      ];
      
      for (const pattern of patterns) {
        if (process.env[pattern]) {
          logger.debug(`找到合约 ${contractName} 的地址: ${process.env[pattern]} (环境变量: ${pattern})`);
          return process.env[pattern];
        }
      }
      
      logger.warn(`未找到合约 ${contractName} 的地址环境变量`);
      return null;
    };
    
    // 构建部署信息对象
    const deploymentInfo = {
      network: process.env.BLOCKCHAIN_NETWORK || 'localhost',
      timestamp: new Date().toISOString(),
      contracts: {
        RoleManager: getAddressFromEnv('RoleManager'),
        PropertyManager: getAddressFromEnv('PropertyManager'),
        TradingManager: getAddressFromEnv('TradingManager'),
        RewardManager: getAddressFromEnv('RewardManager'),
        PropertyToken: getAddressFromEnv('PropertyToken'),
        System: getAddressFromEnv('RealEstateSystem'),
        RealEstateFacade: getAddressFromEnv('RealEstateFacade')
      }
    };
    
    // 检查是否获取到了RealEstateFacade地址
    if (!deploymentInfo.contracts.RealEstateFacade) {
      throw new Error("未能从环境变量中获取RealEstateFacade合约地址，请确保.env文件包含该地址");
    }
    
    logger.info("成功从环境变量加载合约地址信息");
    return deploymentInfo;
  } catch (error) {
    logger.error(`获取合约地址信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 验证RealEstateFacade与子模块连接
 */
async function verifyFacadeConnections() {
  try {
    logger.info("开始验证RealEstateFacade合约与子模块的连接...");
    
    // 获取部署信息
    const deploymentInfo = getDeploymentInfo();
    
    // 获取已部署合约地址
    const contracts = deploymentInfo.contracts;
    logger.info("部署合约地址: ", contracts);
    
    // 创建RealEstateFacade合约实例
    const realEstateFacade = await ethers.getContractAt("RealEstateFacade", contracts.RealEstateFacade);
    
    // 验证System连接
    const systemAddress = await realEstateFacade.system();
    logger.info(`当前System地址: ${systemAddress}`);
    logger.info(`预期System地址: ${contracts.System}`);
    const systemConnected = systemAddress.toLowerCase() === contracts.System.toLowerCase();
    if (systemConnected) {
      logger.info("✅ System连接验证成功");
    } else {
      logger.error("❌ System连接验证失败");
    }
    
    // 验证RoleManager连接
    const roleManagerAddress = await realEstateFacade.roleManager();
    logger.info(`当前RoleManager地址: ${roleManagerAddress}`);
    logger.info(`预期RoleManager地址: ${contracts.RoleManager}`);
    const roleManagerConnected = roleManagerAddress.toLowerCase() === contracts.RoleManager.toLowerCase();
    if (roleManagerConnected) {
      logger.info("✅ RoleManager连接验证成功");
    } else {
      logger.error("❌ RoleManager连接验证失败");
    }
    
    // 验证PropertyManager连接
    const propertyManagerAddress = await realEstateFacade.propertyManager();
    logger.info(`当前PropertyManager地址: ${propertyManagerAddress}`);
    logger.info(`预期PropertyManager地址: ${contracts.PropertyManager}`);
    const propertyManagerConnected = propertyManagerAddress.toLowerCase() === contracts.PropertyManager.toLowerCase();
    if (propertyManagerConnected) {
      logger.info("✅ PropertyManager连接验证成功");
    } else {
      logger.error("❌ PropertyManager连接验证失败");
    }
    
    // 验证TradingManager连接
    const tradingManagerAddress = await realEstateFacade.tradingManager();
    logger.info(`当前TradingManager地址: ${tradingManagerAddress}`);
    logger.info(`预期TradingManager地址: ${contracts.TradingManager}`);
    const tradingManagerConnected = tradingManagerAddress.toLowerCase() === contracts.TradingManager.toLowerCase();
    if (tradingManagerConnected) {
      logger.info("✅ TradingManager连接验证成功");
    } else {
      logger.error("❌ TradingManager连接验证失败");
    }
    
    // 验证RewardManager连接
    const rewardManagerAddress = await realEstateFacade.rewardManager();
    logger.info(`当前RewardManager地址: ${rewardManagerAddress}`);
    logger.info(`预期RewardManager地址: ${contracts.RewardManager}`);
    const rewardManagerConnected = rewardManagerAddress.toLowerCase() === contracts.RewardManager.toLowerCase();
    if (rewardManagerConnected) {
      logger.info("✅ RewardManager连接验证成功");
    } else {
      logger.error("❌ RewardManager连接验证失败");
    }
    
    // 总体验证结果
    const allConnected = systemConnected && roleManagerConnected && propertyManagerConnected && 
                         tradingManagerConnected && rewardManagerConnected;
    
    if (allConnected) {
      logger.info("✅ RealEstateFacade合约与所有子模块连接验证成功");
    } else {
      logger.error("❌ RealEstateFacade合约与子模块连接验证失败");
    }
    
    // 返回验证结果
    return {
      success: allConnected,
      connections: {
        system: systemConnected,
        roleManager: roleManagerConnected,
        propertyManager: propertyManagerConnected,
        tradingManager: tradingManagerConnected,
        rewardManager: rewardManagerConnected
      }
    };
  } catch (error) {
    logger.error(`验证过程出错: ${error.message}`);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    await verifyFacadeConnections();
  } catch (error) {
    logger.error(`验证失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

// 导出函数供其他脚本使用
module.exports = {
  verifyFacadeConnections
}; 