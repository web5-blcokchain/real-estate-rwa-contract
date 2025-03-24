const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// 合约ABI缓存
const contractAbis = {};

/**
 * 从指定路径加载ABI文件
 * @param {string} contractName 合约名称
 * @param {string} [abiPath] 可选的ABI文件路径
 * @returns {object} 合约ABI
 */
const loadAbi = (contractName, abiPath) => {
  try {
    // 如果未指定路径，则使用默认路径
    const filePath = abiPath || path.join(__dirname, `../../../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    
    // 读取并解析文件
    const abiJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 缓存ABI
    contractAbis[contractName] = abiJson.abi;
    
    return abiJson.abi;
  } catch (error) {
    logger.error(`无法加载 ${contractName} 的ABI: ${error.message}`);
    throw new Error(`无法加载 ${contractName} 的ABI: ${error.message}`);
  }
};

/**
 * 获取合约ABI
 * @param {string} contractName 合约名称
 * @param {string} [abiPath] 可选的ABI文件路径
 * @returns {object} 合约ABI
 */
const getAbi = (contractName, abiPath) => {
  if (contractAbis[contractName]) {
    return contractAbis[contractName];
  }
  
  return loadAbi(contractName, abiPath);
};

/**
 * 初始化加载所有主要合约的ABIs
 */
const initializeAbis = () => {
  try {
    // 主要合约列表
    const contracts = [
      'RoleManager',
      'PropertyRegistry',
      'TokenFactory',
      'RealEstateToken',
      'RedemptionManager',
      'RentDistributor',
      'FeeManager',
      'Marketplace'
    ];
    
    // 加载所有合约的ABI
    contracts.forEach(contract => {
      try {
        loadAbi(contract);
        logger.info(`已加载 ${contract} ABI`);
      } catch (error) {
        logger.warn(`加载 ${contract} ABI 失败: ${error.message}`);
      }
    });
    
    logger.info('ABI初始化完成');
  } catch (error) {
    logger.error(`ABI初始化失败: ${error.message}`);
  }
};

// 导出函数和缓存
module.exports = {
  getAbi,
  loadAbi,
  initializeAbis,
  contractAbis
}; 