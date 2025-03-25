const fs = require('fs');
const path = require('path');

// 合约ABI缓存
const contractAbis = {};

// 缓存文件路径
const ABI_CACHE_FILE = path.join(process.cwd(), 'shared/cache/abi-cache.json');

/**
 * 从指定路径加载ABI文件
 * @param {string} contractName 合约名称
 * @param {string} [abiPath] 可选的ABI文件路径
 * @returns {object} 合约ABI
 */
const loadAbi = (contractName, abiPath) => {
  try {
    // 如果未指定路径，则使用默认路径
    const filePath = abiPath || path.join(process.cwd(), `artifacts/contracts/${contractName}.sol/${contractName}.json`);
    
    // 读取并解析文件
    const abiJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 缓存ABI
    contractAbis[contractName] = abiJson.abi;
    
    return abiJson.abi;
  } catch (error) {
    const errorMsg = `无法加载 ${contractName} 的ABI: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
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
 * @param {Function} [logger] 可选的日志函数
 */
const initializeAbis = (logger = console) => {
  try {
    // 尝试从缓存加载
    loadCachedAbis(logger);
    
    // 主要合约列表
    const contracts = [
      'RoleManager',
      'PropertyRegistry',
      'TokenFactory',
      'RealEstateToken',
      'RedemptionManager',
      'RentDistributor',
      'FeeManager',
      'Marketplace',
      'TokenHolderQuery',
      'RealEstateSystem'
    ];
    
    // 加载所有合约的ABI
    let missingContractCount = 0;
    contracts.forEach(contract => {
      try {
        if (!contractAbis[contract]) {
          loadAbi(contract);
          logger.info ? logger.info(`已加载 ${contract} ABI`) : logger.log(`已加载 ${contract} ABI`);
          missingContractCount++;
        }
      } catch (error) {
        logger.warn ? logger.warn(`加载 ${contract} ABI 失败: ${error.message}`) : logger.log(`加载 ${contract} ABI 失败: ${error.message}`);
      }
    });
    
    // 如果有新加载的ABI，保存到缓存
    if (missingContractCount > 0) {
      saveCachedAbis(logger);
    }
    
    logger.info ? logger.info('ABI初始化完成') : logger.log('ABI初始化完成');
  } catch (error) {
    logger.error ? logger.error(`ABI初始化失败: ${error.message}`) : logger.log(`ABI初始化失败: ${error.message}`);
  }
};

/**
 * 从缓存文件加载ABI
 * @param {Function} [logger] 可选的日志函数 
 */
const loadCachedAbis = (logger = console) => {
  try {
    if (fs.existsSync(ABI_CACHE_FILE)) {
      const cachedData = JSON.parse(fs.readFileSync(ABI_CACHE_FILE, 'utf8'));
      Object.assign(contractAbis, cachedData);
      logger.info ? logger.info(`已从缓存加载 ${Object.keys(cachedData).length} 个ABI`) : logger.log(`已从缓存加载 ${Object.keys(cachedData).length} 个ABI`);
    }
  } catch (error) {
    logger.warn ? logger.warn(`加载ABI缓存失败: ${error.message}`) : logger.log(`加载ABI缓存失败: ${error.message}`);
  }
};

/**
 * 保存ABI到缓存文件
 * @param {Function} [logger] 可选的日志函数
 */
const saveCachedAbis = (logger = console) => {
  try {
    // 确保目录存在
    const cacheDir = path.dirname(ABI_CACHE_FILE);
    if (!fs.existsSync(cacheDir)){
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    fs.writeFileSync(ABI_CACHE_FILE, JSON.stringify(contractAbis, null, 2));
    logger.info ? logger.info(`已保存 ${Object.keys(contractAbis).length} 个ABI到缓存`) : logger.log(`已保存 ${Object.keys(contractAbis).length} 个ABI到缓存`);
  } catch (error) {
    logger.warn ? logger.warn(`保存ABI缓存失败: ${error.message}`) : logger.log(`保存ABI缓存失败: ${error.message}`);
  }
};

// 导出函数和缓存
module.exports = {
  getAbi,
  loadAbi,
  initializeAbis,
  contractAbis,
  loadCachedAbis,
  saveCachedAbis
}; 