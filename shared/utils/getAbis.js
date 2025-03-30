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

// 合约ABI源目录 - 使用 Hardhat 的标准输出目录
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts', 'contracts');

// 共享模块的ABI文件路径
const SHARED_ABIS_PATH = path.join(SHARED_DIR, 'contracts/abis.js');

/**
 * 从指定路径加载ABI文件
 * @param {string} contractName 合约名称
 * @returns {Promise<object>} 合约ABI
 */
const loadAbi = async (contractName) => {
  try {
    // 首先尝试从shared/contracts/abis.js加载
    try {
      console.log(`尝试从shared contracts模块加载${contractName}的ABI...`);
      const sharedAbis = require(SHARED_ABIS_PATH);
      if (sharedAbis[contractName] && Array.isArray(sharedAbis[contractName])) {
        console.log(`从shared/contracts/abis.js加载了${contractName}的ABI`);
        contractAbis[contractName] = sharedAbis[contractName];
        return sharedAbis[contractName];
      }
    } catch (error) {
      console.warn(`从shared contracts模块加载ABI失败: ${error.message}`);
    }
    
    // 如果从shared模块加载失败，从artifacts目录加载，遵循Hardhat标准结构
    const contractDir = path.join(ARTIFACTS_DIR, `${contractName}.sol`);
    const artifactPath = path.join(contractDir, `${contractName}.json`);
    
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
    
    // 尝试从contracts/artifacts目录加载（兼容旧结构）
    const legacyPath = path.join(ROOT_DIR, 'contracts', 'artifacts', `${contractName}.json`);
    console.log(`尝试从旧路径${legacyPath}加载ABI...`);
    
    if (fsSync.existsSync(legacyPath)) {
      const artifact = JSON.parse(await fs.readFile(legacyPath, 'utf8'));
      if (artifact.abi) {
        const abi = artifact.abi;
        console.log(`从旧路径加载了${contractName}的ABI`);
        contractAbis[contractName] = abi;
        return abi;
      }
    }
    
    // 找不到ABI文件，尝试通过临时编译获取
    console.warn(`在标准路径和旧路径都找不到 ${contractName} 的ABI文件`);
    console.warn('请确保已编译合约，或先运行 npx hardhat compile');
    
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
  // 如果尚未初始化，尝试延迟初始化
  if (!initialized) {
    console.warn('ABI尚未初始化，尝试延迟初始化...');
    try {
      // 首先尝试从shared/contracts/abis.js加载
      try {
        console.log(`尝试从shared contracts模块加载ABI...`);
        const sharedAbis = require(SHARED_ABIS_PATH);
        // 检查合约ABI是否存在
        if (sharedAbis[contractName] && Array.isArray(sharedAbis[contractName])) {
          contractAbis[contractName] = sharedAbis[contractName];
          initialized = true;
          console.log(`从shared/contracts/abis.js加载了${contractName}的ABI`);
          return sharedAbis[contractName];
        } else {
          console.log(`在shared/contracts/abis.js中找不到${contractName}的ABI，尝试其他来源`);
        }
      } catch (error) {
        console.warn(`从shared contracts模块加载ABI失败: ${error.message}`);
      }
      
      // 如果从shared模块加载失败，尝试从缓存加载
      if (fsSync.existsSync(ABI_CACHE_FILE)) {
        const cachedData = JSON.parse(fsSync.readFileSync(ABI_CACHE_FILE, 'utf8'));
        Object.assign(contractAbis, cachedData);
        initialized = true;
        console.log(`已从缓存加载 ${Object.keys(cachedData).length} 个ABI`);
      } else {
        throw new Error('ABI尚未初始化，请先调用 initializeAbis()');
      }
    } catch (error) {
      throw new Error(`ABI尚未初始化: ${error.message}`);
    }
  }

  const abi = contractAbis[contractName];
  if (!abi) {
    // 尝试同步加载单个ABI
    try {
      // 首先尝试从shared/contracts/abis.js加载
      try {
        const sharedAbis = require(SHARED_ABIS_PATH);
        if (sharedAbis[contractName] && Array.isArray(sharedAbis[contractName])) {
          contractAbis[contractName] = sharedAbis[contractName];
          console.log(`已从shared/contracts/abis.js动态加载 ${contractName} 的ABI`);
          return sharedAbis[contractName];
        }
      } catch (e) {
        console.warn(`从shared/contracts/abis.js加载ABI失败: ${e.message}`);
      }
      
      // 再尝试从标准Hardhat结构加载
      const contractDir = path.join(ARTIFACTS_DIR, `${contractName}.sol`);
      const artifactPath = path.join(contractDir, `${contractName}.json`);
      
      if (fsSync.existsSync(artifactPath)) {
        const artifact = JSON.parse(fsSync.readFileSync(artifactPath, 'utf8'));
        if (artifact.abi && Array.isArray(artifact.abi) && artifact.abi.length > 0) {
          contractAbis[contractName] = artifact.abi;
          console.log(`已动态加载 ${contractName} 的ABI`);
          return artifact.abi;
        }
      }
      
      // 最后尝试从旧路径加载
      const legacyPath = path.join(ROOT_DIR, 'contracts', 'artifacts', `${contractName}.json`);
      if (fsSync.existsSync(legacyPath)) {
        const artifact = JSON.parse(fsSync.readFileSync(legacyPath, 'utf8'));
        if (artifact.abi && Array.isArray(artifact.abi) && artifact.abi.length > 0) {
          contractAbis[contractName] = artifact.abi;
          console.log(`已从旧路径动态加载 ${contractName} 的ABI`);
          return artifact.abi;
        }
      }
    } catch (e) {
      console.error(`动态加载 ${contractName} 的ABI失败: ${e.message}`);
    }
    
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

    // 如果缓存已包含所有必需的合约，则不再重新加载
    const missingContracts = requiredContracts.filter(name => !contractAbis[name]);
    if (missingContracts.length === 0) {
      log('所有必需的合约ABI已在缓存中，跳过加载');
      initialized = true;
      return;
    }

    // 检查ABI源目录是否存在
    if (!fsSync.existsSync(ARTIFACTS_DIR)) {
      log(`警告: 标准ABI源目录不存在: ${ARTIFACTS_DIR}`);
      log('请确保已编译合约，或先运行 npx hardhat compile');
    }

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

/**
 * 获取ABI源目录路径
 * @returns {string} ABI源目录路径
 */
function getAbiSourceDir() {
  return ARTIFACTS_DIR;
}

// 导出函数和缓存
module.exports = {
  getAbi,
  loadAbi,
  initializeAbis,
  contractAbis,
  loadCachedAbis,
  saveCachedAbis,
  getAbiSourceDir
}; 