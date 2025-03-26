#!/usr/bin/env node
/**
 * 更新共享ABI模块的脚本
 * 
 * 此脚本用于从编译后的Hardhat合约ABI文件中提取定义，
 * 并更新到共享模块的ABI文件中。
 * 
 * 使用方法:
 *   node scripts/update-shared-abis.js [--artifacts-path path/to/artifacts]
 */

const fs = require('fs');
const path = require('path');
const { initializeEnvironment } = require('../../shared/config/environment');

// 初始化环境
initializeEnvironment();

// 脚本配置
const CONFIG = {
  // 默认artifacts路径
  artifactsPath: path.join(__dirname, '../../artifacts/contracts'),
  // 共享模块的ABI文件路径
  sharedAbisPath: path.join(__dirname, '../../shared/contracts/abis.js'),
  // 合约名称映射表 (合约名 -> 共享模块中的键名)
  contractMapping: {
    'RoleManager': 'RoleManager',
    'PropertyRegistry': 'PropertyRegistry',
    'TokenFactory': 'TokenFactory',
    'RealEstateToken': 'RealEstateToken',
    'Marketplace': 'Marketplace',
    'RentDistributor': 'RentDistributor',
    'RedemptionManager': 'RedemptionManager',
    'TokenHolderQuery': 'TokenHolderQuery',
    'RealEstateSystem': 'RealEstateSystem',
    'FeeManager': 'FeeManager'
  }
};

// 处理命令行参数
process.argv.forEach((arg, index) => {
  if (arg === '--artifacts-path' && process.argv[index + 1]) {
    CONFIG.artifactsPath = process.argv[index + 1];
  }
});

/**
 * 递归查找目录中的合约ABI文件
 * @param {string} dir 目录路径
 * @param {Array} fileList 文件列表
 * @returns {Array} 文件路径列表
 */
function findContractAbiFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      findContractAbiFiles(filePath, fileList);
    } else if (file.endsWith('.json') && !file.includes('.dbg.')) {
      // 跳过调试JSON文件
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * 获取合约的ABI
 * @param {string} filePath ABI文件路径
 * @returns {Object} 合约名和ABI
 */
function getContractAbi(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const contractData = JSON.parse(fileContent);
    
    // 确保这是有效的合约ABI
    if (!contractData.abi || !Array.isArray(contractData.abi)) {
      return null;
    }
    
    // 从文件路径中提取合约名
    const contractNameMatch = filePath.match(/([^/\\]+)\.json$/);
    if (!contractNameMatch) {
      return null;
    }
    
    const contractName = contractNameMatch[1];
    return { contractName, abi: contractData.abi };
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
    return null;
  }
}

/**
 * 读取现有的共享ABI文件
 * @returns {Object} 现有的ABI对象
 */
function readExistingSharedAbis() {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(CONFIG.sharedAbisPath)) {
      return {};
    }
    
    // 读取文件内容
    const fileContent = fs.readFileSync(CONFIG.sharedAbisPath, 'utf8');
    
    // 提取 module.exports = { ... } 部分
    const exportMatch = fileContent.match(/module\.exports\s*=\s*(\{[\s\S]*\})/);
    if (!exportMatch) {
      return {};
    }
    
    // 解析JSON对象
    // 注意：这是一个简化的解析，实际情况可能需要更复杂的处理
    const abisObject = eval(`(${exportMatch[1]})`);
    return abisObject;
  } catch (error) {
    console.error(`读取现有共享ABI文件失败:`, error.message);
    return {};
  }
}

/**
 * 生成共享ABI文件内容
 * @param {Object} abis 合约ABI映射表
 * @returns {string} 生成的文件内容
 */
function generateSharedAbiFileContent(abis) {
  // 文件头部注释
  let content = `/**
 * 合约ABI定义
 * 
 * 此文件由 update-shared-abis.js 脚本自动生成
 * 包含所有合约的ABI定义
 * 
 * 生成时间: ${new Date().toISOString()}
 */

const abis = {};\n\n`;

  // 为每个合约生成ABI变量
  for (const [contractName, abi] of Object.entries(abis)) {
    content += `// ${contractName} ABI\n`;
    content += `abis.${contractName} = ${JSON.stringify(abi, null, 2)};\n\n`;
  }

  // 导出部分
  content += `module.exports = abis;\n`;

  return content;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始更新共享合约ABI...');
  console.log(`> 从 ${CONFIG.artifactsPath} 读取合约编译产物`);
  console.log(`> 输出到 ${CONFIG.sharedAbisPath}`);
  
  try {
    // 找到所有合约ABI文件
    const abiFiles = findContractAbiFiles(CONFIG.artifactsPath);
    console.log(`找到 ${abiFiles.length} 个合约ABI文件`);
    
    // 读取现有的共享ABI
    const existingAbis = readExistingSharedAbis();
    console.log(`读取到 ${Object.keys(existingAbis).length} 个现有ABI定义`);
    
    // 提取每个合约的ABI
    let updatedCount = 0;
    
    for (const file of abiFiles) {
      const contractData = getContractAbi(file);
      
      if (contractData && contractData.abi.length > 0) {
        // 使用映射表将合约名映射到共享模块使用的键名
        const sharedKey = CONFIG.contractMapping[contractData.contractName];
        
        if (sharedKey) {
          existingAbis[sharedKey] = contractData.abi;
          console.log(`更新合约 ${contractData.contractName} => ${sharedKey}: ${contractData.abi.length} 个ABI项`);
          updatedCount++;
        }
      }
    }
    
    // 生成新的文件内容
    const fileContent = generateSharedAbiFileContent(existingAbis);
    
    // 确保目录存在
    const dir = path.dirname(CONFIG.sharedAbisPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(CONFIG.sharedAbisPath, fileContent);
    console.log(`已更新 ${updatedCount} 个合约的ABI到共享模块`);
    console.log('共享ABI更新完成!');
  } catch (error) {
    console.error('更新共享ABI失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main().catch(console.error); 