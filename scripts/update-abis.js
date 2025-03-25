/**
 * ABI更新脚本
 * 负责在合约编译后更新共享的ABI文件
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { getLogger } = require("../shared/utils");

// 创建日志记录器
const logger = getLogger("abi-updater");

// 合约名称列表
const contractNames = [
  "RealEstateSystem",
  "RoleManager",
  "FeeManager",
  "PropertyRegistry",
  "TokenFactory",
  "RedemptionManager",
  "RentDistributor",
  "Marketplace",
  "TokenHolderQuery",
  "PropertyToken",
  "SystemDeployer",
  "SystemDeployerLib1",
  "SystemDeployerLib2"
];

// ABI目标目录
const ABI_DIR = path.join(__dirname, "../shared/contracts/abis");

// 查找合约文件的辅助函数
function findContractFile(dir, contractName) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // 递归搜索子目录
      const result = findContractFile(filePath, contractName);
      if (result) return result;
    } else if (file.isFile() && 
               file.name === `${contractName}.json` &&
               !file.name.includes('.dbg.json')) {
      return filePath;
    }
  }
  
  return null;
}

// 提取并保存ABI
function extractAndSaveAbi(contractName) {
  try {
    // 查找编译后的合约文件
    const artifactsDir = path.join(__dirname, '../artifacts/contracts');
    const contractFile = findContractFile(artifactsDir, contractName);
    
    if (!contractFile) {
      logger.warn(`找不到合约 ${contractName} 的编译文件，请确保已编译合约`);
      return false;
    }
    
    // 读取合约JSON
    const contractJson = JSON.parse(fs.readFileSync(contractFile, 'utf8'));
    const abi = contractJson.abi;
    
    if (!abi) {
      logger.warn(`合约 ${contractName} 没有ABI段`);
      return false;
    }
    
    // 确保目标目录存在
    if (!fs.existsSync(ABI_DIR)) {
      fs.mkdirSync(ABI_DIR, { recursive: true });
    }
    
    // 保存ABI到目标文件
    const abiFile = path.join(ABI_DIR, `${contractName}.json`);
    fs.writeFileSync(abiFile, JSON.stringify(abi, null, 2));
    
    logger.info(`已更新 ${contractName} 的ABI`);
    return true;
  } catch (error) {
    logger.error(`处理 ${contractName} ABI时出错: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  logger.info("开始更新ABI文件...");
  
  let successCount = 0;
  let failCount = 0;
  
  // 处理每个合约
  for (const contractName of contractNames) {
    const result = extractAndSaveAbi(contractName);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  // 生成索引文件
  generateIndexFile();
  
  logger.info(`ABI更新完成。成功: ${successCount}, 失败: ${failCount}`);
}

// 生成索引文件
function generateIndexFile() {
  try {
    // 读取ABI目录中的所有文件
    const files = fs.readdirSync(ABI_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
    
    // 生成导出代码
    let indexContent = '/**\n * ABI文件索引\n * 自动生成，请勿手动修改\n */\n\n';
    
    // 添加每个ABI的导入
    for (const file of files) {
      indexContent += `const ${file} = require('./${file}.json');\n`;
    }
    
    // 添加导出对象
    indexContent += '\nmodule.exports = {\n';
    for (const file of files) {
      indexContent += `  ${file},\n`;
    }
    indexContent += '};\n';
    
    // 写入索引文件
    const indexFile = path.join(ABI_DIR, 'index.js');
    fs.writeFileSync(indexFile, indexContent);
    
    logger.info('已生成ABI索引文件');
  } catch (error) {
    logger.error(`生成索引文件时出错: ${error.message}`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  // 作为模块导出
  module.exports = { main, extractAndSaveAbi };
} 