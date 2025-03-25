#!/usr/bin/env node
/**
 * 合约ABI更新脚本
 * 
 * 此脚本用于从编译后的Hardhat合约ABI文件中提取事件定义，
 * 并更新到监控工具的合约ABI文件中。
 * 
 * 使用方法:
 *   node scripts/update-abis.js [--full] [--artifacts-path path/to/artifacts]
 * 
 * 选项:
 *   --full           提取完整ABI而不仅仅是事件定义
 *   --artifacts-path 指定合约artifacts目录的路径，默认为"../artifacts/contracts"
 */

const fs = require('fs');
const path = require('path');

// 脚本配置
const CONFIG = {
  // 默认artifacts路径
  artifactsPath: path.join(__dirname, '../../artifacts/contracts'),
  // 监控工具合约ABI文件路径
  monitorAbisPath: path.join(__dirname, '../src/contracts/index.js'),
  // 是否提取完整ABI
  extractFullAbi: false,
  // 合约名称映射表 (合约名 -> 监控工具中的键名)
  contractMapping: {
    'RoleManager': 'roleManager',
    'PropertyRegistry': 'propertyRegistry',
    'TokenFactory': 'tokenFactory',
    'RealEstateToken': 'token',
    'Marketplace': 'marketplace',
    'RentDistributor': 'rentDistributor',
    'RedemptionManager': 'redemptionManager',
    'TokenHolderQuery': 'tokenHolderQuery',
    'RealEstateSystem': 'realEstateSystem',
    'FeeManager': 'feeManager'
  }
};

// 处理命令行参数
process.argv.forEach((arg, index) => {
  if (arg === '--full') {
    CONFIG.extractFullAbi = true;
  } else if (arg === '--artifacts-path' && process.argv[index + 1]) {
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
 * 从ABI中提取事件定义
 * @param {Array} abi 合约ABI
 * @returns {Array} 事件定义列表
 */
function extractEventDefinitions(abi) {
  if (CONFIG.extractFullAbi) {
    return abi; // 返回完整ABI
  }
  
  // 只提取事件定义
  return abi.filter(item => item.type === 'event').map(event => {
    const inputs = event.inputs.map(input => {
      let typeStr = input.type;
      if (input.indexed) {
        return `${typeStr} indexed ${input.name}`;
      }
      return `${typeStr} ${input.name}`;
    }).join(', ');
    
    return `event ${event.name}(${inputs})`;
  });
}

/**
 * 获取合约中的所有事件定义
 * @param {string} filePath ABI文件路径
 * @returns {Object} 合约名和事件列表
 */
function getContractEvents(filePath) {
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
    const events = extractEventDefinitions(contractData.abi);
    
    return { contractName, events };
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
    return null;
  }
}

/**
 * 生成合约ABI索引文件内容
 * @param {Object} contractEvents 合约事件映射表
 * @returns {string} 生成的文件内容
 */
function generateAbiFileContent(contractEvents) {
  // 文件头部注释
  let content = `/**
 * 合约ABI索引文件
 * 
 * 此文件由 update-abis.js 脚本自动生成
 * 包含所有合约的${CONFIG.extractFullAbi ? '完整ABI' : '事件定义'}
 * 
 * 生成时间: ${new Date().toISOString()}
 */

`;

  // 为每个合约生成ABI变量
  for (const [contractKey, events] of Object.entries(contractEvents)) {
    content += `// ${contractKey} 合约ABI\n`;
    if (CONFIG.extractFullAbi) {
      content += `const ${contractKey}ABI = ${JSON.stringify(events, null, 2)};\n\n`;
    } else {
      content += `const ${contractKey}ABI = [\n`;
      events.forEach(event => {
        content += `  "${event}",\n`;
      });
      content += `];\n\n`;
    }
  }

  // 导出部分
  content += `// 导出所有合约ABI的映射表\nmodule.exports = {\n`;
  for (const contractKey of Object.keys(contractEvents)) {
    content += `  ${contractKey}: ${contractKey}ABI,\n`;
  }
  content += `};\n`;

  return content;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始更新合约ABI...');
  console.log(`> 从 ${CONFIG.artifactsPath} 读取合约编译产物`);
  console.log(`> 提取模式: ${CONFIG.extractFullAbi ? '完整ABI' : '仅事件'}`);
  
  try {
    // 找到所有合约ABI文件
    const abiFiles = findContractAbiFiles(CONFIG.artifactsPath);
    console.log(`找到 ${abiFiles.length} 个合约ABI文件`);
    
    // 提取每个合约的事件定义
    const contractEventsMap = {};
    
    for (const file of abiFiles) {
      const contractData = getContractEvents(file);
      
      if (contractData && contractData.events.length > 0) {
        // 使用映射表将合约名映射到监控工具使用的键名
        const monitorKey = CONFIG.contractMapping[contractData.contractName];
        
        if (monitorKey) {
          contractEventsMap[monitorKey] = contractData.events;
          console.log(`处理合约 ${contractData.contractName} => ${monitorKey}: 提取了 ${contractData.events.length} 个${CONFIG.extractFullAbi ? 'ABI项' : '事件'}`);
        }
      }
    }
    
    // 确保至少有一个合约被处理
    if (Object.keys(contractEventsMap).length === 0) {
      console.error('没有找到任何有效的合约ABI！请检查artifacts路径是否正确。');
      process.exit(1);
    }
    
    // 生成新的ABI索引文件内容
    const fileContent = generateAbiFileContent(contractEventsMap);
    
    // 备份现有文件
    if (fs.existsSync(CONFIG.monitorAbisPath)) {
      const backupPath = `${CONFIG.monitorAbisPath}.bak`;
      fs.copyFileSync(CONFIG.monitorAbisPath, backupPath);
      console.log(`已备份原文件到 ${backupPath}`);
    }
    
    // 写入新文件
    fs.writeFileSync(CONFIG.monitorAbisPath, fileContent);
    console.log(`已更新ABI定义到 ${CONFIG.monitorAbisPath}`);
    
    console.log('合约ABI更新完成！');
  } catch (error) {
    console.error('更新ABI时出错:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 