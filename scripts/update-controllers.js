/**
 * 更新控制器文件脚本
 * 
 * 将所有控制器中的contractService替换为blockchainService
 * 包括方法名替换：
 * 1. contractService.createContractInstance -> blockchainService.createContract
 * 2. contractService.callMethod -> blockchainService.callContractMethod
 * 3. contractService.sendTransaction -> blockchainService.sendContractTransaction
 */

const fs = require('fs');
const path = require('path');

// 控制器目录
const CONTROLLERS_DIR = path.resolve(__dirname, '../http-server/src/controllers');

// 需要替换的控制器文件列表
const controllerFiles = [
  'role.controller.js',
  'reward.controller.js',
  'property.controller.js',
  'trading.controller.js',
  'system.controller.js'
];

// 替换映射
const replacements = [
  {
    from: /const\s+contractService\s+=\s+require\(['"]\.\.\/services\/contractService['"]\);/g,
    to: 'const blockchainService = require(\'../services/blockchainService\');'
  },
  {
    from: /contractService\.createContractInstance/g,
    to: 'blockchainService.createContract'
  },
  {
    from: /contractService\.callMethod/g, 
    to: 'blockchainService.callContractMethod'
  },
  {
    from: /contractService\.sendTransaction/g,
    to: 'blockchainService.sendContractTransaction'
  }
];

/**
 * 更新单个文件
 * @param {string} filePath - 文件路径
 */
function updateFile(filePath) {
  console.log(`正在处理: ${filePath}`);
  
  // 读取文件内容
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  // 应用所有替换
  replacements.forEach(replacement => {
    content = content.replace(replacement.from, replacement.to);
  });
  
  // 检查是否有变更
  if (content !== originalContent) {
    // 写入更新后的内容
    fs.writeFileSync(filePath, content);
    console.log(`已更新: ${filePath}`);
  } else {
    console.log(`无需更新: ${filePath}`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('开始更新控制器文件...');
  
  // 确保目录存在
  if (!fs.existsSync(CONTROLLERS_DIR)) {
    console.error(`错误: 控制器目录不存在: ${CONTROLLERS_DIR}`);
    process.exit(1);
  }
  
  // 处理每个文件
  controllerFiles.forEach(filename => {
    const filePath = path.join(CONTROLLERS_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      updateFile(filePath);
    } else {
      console.warn(`警告: 文件不存在: ${filePath}`);
    }
  });
  
  console.log('控制器文件更新完成!');
}

// 执行主函数
main(); 