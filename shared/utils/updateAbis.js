#!/usr/bin/env node
/**
 * 统一的ABI更新工具
 * 
 * 该工具从编译后的合约artifacts目录中提取ABI，
 * 并将其保存到共享目录，供所有模块使用。
 * 
 * 用法:
 *   - 直接运行: node shared/utils/updateAbis.js
 *   - 指定artifacts路径: node shared/utils/updateAbis.js --artifacts-path <路径>
 *   - 更新特定合约: node shared/utils/updateAbis.js --contracts ContractA,ContractB
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// 配置
const CONFIG = {
  // Hardhat编译产物路径
  artifactsPath: path.resolve(__dirname, '../../artifacts/contracts'),
  // 保存ABI的路径
  abiOutputDir: path.resolve(__dirname, '../../contracts/artifacts'),
  // 共享ABI模块路径
  sharedAbisPath: path.resolve(__dirname, '../contracts'),
  // 默认处理的合约列表
  defaultContracts: [
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
  ]
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  let artifactsPath = CONFIG.artifactsPath;
  let contracts = CONFIG.defaultContracts;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--artifacts-path' && args[i + 1]) {
      artifactsPath = args[++i];
    } else if (args[i] === '--contracts' && args[i + 1]) {
      contracts = args[++i].split(',');
    }
  }

  return { artifactsPath, contracts };
}

/**
 * 递归查找合约ABI文件
 * @param {string} dir 目录路径
 * @param {string} contractName 合约名称
 * @returns {string|null} 找到的文件路径或null
 */
function findContractFile(dir, contractName) {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        // 递归搜索目录
        if (file.name === `${contractName}.sol`) {
          // 如果找到合约目录，查找里面的JSON文件
          const jsonFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.json') && !f.endsWith('.dbg.json'));
          if (jsonFiles.length > 0) {
            return path.join(fullPath, jsonFiles[0]);
          }
        } else {
          // 否则继续递归
          const result = findContractFile(fullPath, contractName);
          if (result) return result;
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`查找合约文件时出错: ${error.message}`);
    return null;
  }
}

/**
 * 读取合约ABI
 * @param {string} filePath 合约JSON文件路径
 * @returns {Object|null} 合约ABI或null
 */
function readContractAbi(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    if (!data.abi) {
      logger.warn(`文件不包含ABI: ${filePath}`);
      return null;
    }
    return data;
  } catch (error) {
    logger.error(`读取合约ABI失败: ${error.message}`);
    return null;
  }
}

/**
 * 确保目录存在
 * @param {string} dir 目录路径
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`创建目录: ${dir}`);
  }
}

/**
 * 复制合约ABI到目标路径
 * @param {string} sourcePath 源文件路径
 * @param {string} contractName 合约名称
 * @param {string} targetDir 目标目录
 * @returns {boolean} 是否成功
 */
function copyContractAbi(sourcePath, contractName, targetDir) {
  try {
    const sourceData = readContractAbi(sourcePath);
    if (!sourceData) return false;
    
    const targetPath = path.join(targetDir, `${contractName}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(sourceData, null, 2));
    logger.info(`已保存合约ABI: ${targetPath}`);
    return true;
  } catch (error) {
    logger.error(`复制合约ABI失败: ${error.message}`);
    return false;
  }
}

/**
 * 生成共享ABI模块
 * @param {Array<string>} contracts 合约列表
 * @param {string} targetDir 目标目录
 */
function generateSharedAbisModule(contracts, targetDir) {
  try {
    const abisContent = `/**
 * 合约ABI加载模块
 * 自动生成，请勿手动修改
 * 
 * 生成时间: ${new Date().toISOString()}
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
  const abiPath = path.resolve(__dirname, \`../../contracts/artifacts/\${contractName}.json\`);
  
  try {
    if (!fs.existsSync(abiPath)) {
      throw new Error(\`ABI file not found for contract: \${contractName}\`);
    }
    
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    if (!artifact.abi) {
      throw new Error(\`Invalid ABI file for contract: \${contractName}\`);
    }
    
    // 缓存ABI
    abiCache[contractName] = artifact.abi;
    return artifact.abi;
  } catch (error) {
    throw new Error(\`Failed to load ABI for \${contractName}: \${error.message}\`);
  }
}

/**
 * 初始化所有ABI
 * @param {Object} logger 日志对象
 */
async function initializeAbis(logger) {
  const contracts = ${JSON.stringify(contracts, null, 2)};
  
  try {
    console.log('初始化合约ABI...');
    
    for (const contractName of contracts) {
      try {
        const abi = getAbi(contractName);
        if (logger) {
          logger.info(\`\${contractName} 的ABI已在缓存中\`);
        } else {
          console.log(\`\${contractName} 的ABI已在缓存中\`);
        }
      } catch (error) {
        if (logger) {
          logger.warn(\`加载 \${contractName} 的ABI失败: \${error.message}\`);
        } else {
          console.warn(\`加载 \${contractName} 的ABI失败: \${error.message}\`);
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
      logger.error(\`ABI初始化失败: \${error.message}\`);
    } else {
      console.error(\`ABI初始化失败: \${error.message}\`);
    }
    throw error;
  }
}

// 导出函数
module.exports = {
  getAbi,
  initializeAbis
};`;

    const modulePath = path.join(targetDir, 'getAbis.js');
    fs.writeFileSync(modulePath, abisContent);
    logger.info(`已生成共享ABI模块: ${modulePath}`);
  } catch (error) {
    logger.error(`生成共享ABI模块失败: ${error.message}`);
  }
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const { artifactsPath, contracts } = parseArgs();
  
  logger.info('开始更新合约ABI...');
  logger.info(`源目录: ${artifactsPath}`);
  logger.info(`目标目录: ${CONFIG.abiOutputDir}`);
  logger.info(`要处理的合约: ${contracts.join(', ')}`);
  
  // 确保目标目录存在
  ensureDirectoryExists(CONFIG.abiOutputDir);
  ensureDirectoryExists(CONFIG.sharedAbisPath);
  
  // 处理每个合约
  let successCount = 0;
  let failCount = 0;
  
  for (const contractName of contracts) {
    const contractFile = findContractFile(artifactsPath, contractName);
    
    if (!contractFile) {
      logger.warn(`找不到合约 ${contractName} 的编译文件`);
      failCount++;
      continue;
    }
    
    const success = copyContractAbi(contractFile, contractName, CONFIG.abiOutputDir);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  // 生成共享ABI模块
  generateSharedAbisModule(contracts, CONFIG.sharedAbisPath);
  
  logger.info(`ABI更新完成。成功: ${successCount}, 失败: ${failCount}`);
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error(`ABI更新失败: ${error.message}`);
      process.exit(1);
    });
} else {
  // 作为模块导出
  module.exports = { main };
} 