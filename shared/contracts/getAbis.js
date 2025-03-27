/**
 * 合约ABI加载模块
 * 自动生成，请勿手动修改
 * 
 * 生成时间: 2025-03-26T20:20:49.721Z
 */

const path = require('path');
const fs = require('fs');

// ABI缓存
const abiCache = {};

/**
 * 获取合约ABI
 * @param {string} contractName 合约名称
 * @returns {Array} 合约ABI
 */
function getAbi(contractName) {
  // 如果已缓存，直接返回
  if (abiCache[contractName]) {
    return abiCache[contractName];
  }
  
  // 从文件加载ABI
  const abiPath = path.resolve(__dirname, `../../contracts/artifacts/${contractName}.json`);
  
  try {
    if (!fs.existsSync(abiPath)) {
      throw new Error(`ABI file not found for contract: ${contractName}`);
    }
    
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    if (!artifact.abi) {
      throw new Error(`Invalid ABI file for contract: ${contractName}`);
    }
    
    // 缓存ABI
    abiCache[contractName] = artifact.abi;
    return artifact.abi;
  } catch (error) {
    throw new Error(`Failed to load ABI for ${contractName}: ${error.message}`);
  }
}

/**
 * 初始化所有ABI
 * @param {Object} logger 日志对象
 */
async function initializeAbis(logger) {
  const contracts = [
  "RoleManager",
  "PropertyRegistry",
  "TokenFactory",
  "RealEstateToken",
  "RedemptionManager",
  "RentDistributor",
  "FeeManager",
  "Marketplace",
  "TokenHolderQuery",
  "RealEstateSystem"
];
  
  try {
    console.log('初始化合约ABI...');
    
    for (const contractName of contracts) {
      try {
        const abi = getAbi(contractName);
        if (logger) {
          logger.info(`${contractName} 的ABI已在缓存中`);
        } else {
          console.log(`${contractName} 的ABI已在缓存中`);
        }
      } catch (error) {
        if (logger) {
          logger.warn(`加载 ${contractName} 的ABI失败: ${error.message}`);
        } else {
          console.warn(`加载 ${contractName} 的ABI失败: ${error.message}`);
        }
      }
    }
    
    if (logger) {
      logger.info('ABI初始化完成');
    } else {
      console.log('ABI初始化完成');
    }
  } catch (error) {
    if (logger) {
      logger.error(`ABI初始化失败: ${error.message}`);
    } else {
      console.error(`ABI初始化失败: ${error.message}`);
    }
    throw error;
  }
}

// 导出函数
module.exports = {
  getAbi,
  initializeAbis
};