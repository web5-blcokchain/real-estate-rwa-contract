const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// 合约ABI缓存
const contractAbis = {};

// 初始化状态标志
let initialized = false;

// 获取 shared 目录的路径
const SHARED_DIR = path.join(__dirname, '..');

// 根目录路径
const ROOT_DIR = path.join(__dirname, '..', '..');

// 缓存文件路径
const ABI_CACHE_FILE = path.join(SHARED_DIR, 'cache/abi-cache.json');

/**
 * 从指定路径加载ABI文件
 * @param {string} contractName 合约名称
 * @returns {Promise<object>} 合约ABI
 */
const loadAbi = async (contractName) => {
  try {
    // 从 artifacts 目录加载
    const artifactPath = path.join(ROOT_DIR, 'contracts', 'artifacts', `${contractName}.json`);
    console.log(`尝试从${artifactPath}加载ABI...`);
    
    if (fsSync.existsSync(artifactPath)) {
      const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
      if (artifact.abi) {
        const abi = artifact.abi;
        console.log(`从artifacts加载了${contractName}的ABI`);
        
        // 验证ABI格式
        if (!Array.isArray(abi)) {
          throw new Error(`ABI格式错误: ${contractName}`);
        }
        
        // 验证ABI内容
        if (abi.length === 0) {
          throw new Error(`ABI为空: ${contractName}`);
        }
        
        // 验证每个ABI项
        for (const item of abi) {
          if (!item.type) {
            throw new Error(`ABI项缺少type字段: ${contractName}`);
          }
        }
        
        // 缓存ABI
        contractAbis[contractName] = abi;
        console.log(`已缓存 ${contractName} 的ABI`);
        
        return abi;
      }
    }
    
    throw new Error(`找不到合约 ${contractName} 的ABI文件`);
  } catch (error) {
    const errorMsg = `无法加载 ${contractName} 的ABI: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * 获取合约的ABI
 * @param {string} contractName 合约名称
 * @returns {Object} ABI对象
 */
function getAbi(contractName) {
  if (!initialized) {
    throw new Error('ABI尚未初始化，请先调用 initializeAbis()');
  }

  const abi = contractAbis[contractName];
  if (!abi) {
    throw new Error(`找不到合约 ${contractName} 的ABI`);
  }

  return abi;
}

/**
 * 初始化所有ABI
 * @param {Object} logger 可选的日志对象
 * @returns {Promise<void>}
 */
async function initializeAbis(logger) {
  if (initialized) {
    console.log('ABI已经初始化');
    return;
  }

  const log = (msg) => {
    if (logger) {
      logger.info(msg);
    } else {
      console.log(msg);
    }
  };

  log('开始初始化ABI...');

  try {
    // 尝试从缓存加载
    log('尝试从缓存加载ABI...');
    await loadCachedAbis();
    log(`已从缓存加载 ${Object.keys(contractAbis).length} 个ABI`);

    // 获取需要加载的合约列表
    const requiredContracts = [
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
    log('需要加载的合约: ' + requiredContracts.join(', '));

    // 加载每个合约的ABI
    for (const contractName of requiredContracts) {
      try {
        if (!contractAbis[contractName]) {
          log(`加载 ${contractName} 的ABI...`);
          await loadAbi(contractName);
          log(`已加载 ${contractName} 的ABI`);
        } else {
          log(`${contractName} 的ABI已在缓存中`);
        }
      } catch (error) {
        const errorMsg = `加载 ${contractName} ABI 失败: ${error.message}`;
        if (logger) {
          logger.error(errorMsg);
        } else {
          console.error(errorMsg);
        }
        throw error;
      }
    }

    // 保存到缓存
    await saveCachedAbis();
    log('ABI缓存已更新');

    initialized = true;
    log('ABI初始化完成');
  } catch (error) {
    const errorMsg = `ABI初始化失败: ${error.message}`;
    if (logger) {
      logger.error(errorMsg);
    } else {
      console.error(errorMsg);
    }
    throw error;
  }
}

/**
 * 从缓存文件加载ABI
 */
const loadCachedAbis = async () => {
  try {
    console.log('尝试从缓存加载ABI...');
    console.log('缓存文件路径:', ABI_CACHE_FILE);
    
    if (fsSync.existsSync(ABI_CACHE_FILE)) {
      const fileContent = await fs.readFile(ABI_CACHE_FILE, 'utf8');
      const cachedData = JSON.parse(fileContent);
      Object.assign(contractAbis, cachedData);
      console.log(`已从缓存加载 ${Object.keys(cachedData).length} 个ABI`);
    } else {
      console.log('缓存文件不存在');
    }
  } catch (error) {
    console.warn(`加载ABI缓存失败: ${error.message}`);
  }
};

/**
 * 保存ABI到缓存文件
 */
const saveCachedAbis = async () => {
  try {
    console.log('保存ABI到缓存...');
    
    // 确保目录存在
    const cacheDir = path.dirname(ABI_CACHE_FILE);
    if (!fsSync.existsSync(cacheDir)) {
      console.log(`创建缓存目录: ${cacheDir}`);
      fsSync.mkdirSync(cacheDir, { recursive: true });
    }
    
    await fs.writeFile(ABI_CACHE_FILE, JSON.stringify(contractAbis, null, 2));
    console.log(`已保存 ${Object.keys(contractAbis).length} 个ABI到缓存`);
  } catch (error) {
    console.warn(`保存ABI缓存失败: ${error.message}`);
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