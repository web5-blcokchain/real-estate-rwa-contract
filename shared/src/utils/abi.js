/**
 * ABI加载工具
 * 统一管理合约ABI的获取逻辑
 */
const path = require('path');
const fs = require('fs');

/**
 * 将字符串转换为驼峰命名（首字母小写）
 * @param {string} str - 输入字符串
 * @returns {string} 驼峰命名的字符串
 */
const toCamelCase = (str) => {
  // 先转换为小写，移除可能的空格
  const normalized = str.toLowerCase().trim();
  // 将单词分割并转换为首字母大写（除了第一个单词）
  return normalized.replace(/([A-Z])/g, ' $1')
    .split(/\s+/)
    .map((word, index) => {
      if (index === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
};

/**
 * 获取合约ABI
 * @param {string} contractName - 合约名称
 * @returns {Object} 合约ABI
 */
const getContractABI = (contractName) => {
  console.log(`尝试获取合约ABI，合约名称: ${contractName}`);
  
  // 可能的ABI文件路径目录
  const possibleDirs = [
    // 项目根目录下的config/abi目录
    path.resolve(__dirname, '../../../config/abi'),
  ];
  
  console.log(`尝试从以下目录查找ABI文件:`);
  possibleDirs.forEach(dir => console.log(`- ${dir}`));
  
  // 首先尝试与合约名称完全匹配的文件名
  for (const dir of possibleDirs) {
    const exactNamePath = path.join(dir, `${contractName}.json`);
    try {
      if (fs.existsSync(exactNamePath)) {
        console.log(`找到ABI文件: ${exactNamePath}`);
        const abiJson = fs.readFileSync(exactNamePath, 'utf8');
        const abiData = JSON.parse(abiJson);
        const abi = abiData.abi || abiData;
        
        if (Array.isArray(abi)) {
          console.log(`成功加载合约 ${contractName} 的ABI`);
          return abi;
        }
      }
    } catch (error) {
      console.warn(`尝试读取 ${exactNamePath} 失败:`, error.message);
    }
  }
  
  // 如果没有找到完全匹配的，尝试其他可能的名称格式
  const possibleNames = [
    contractName.toLowerCase(),
    contractName.charAt(0).toLowerCase() + contractName.slice(1),
    // 可以使用toCamelCase函数进行尝试
    toCamelCase(contractName)
  ];
  
  for (const dir of possibleDirs) {
    for (const name of possibleNames) {
      const filesToTry = [
        `${name}.json`,
        `${name}.abi.json`,
        `${name}/${name}.json`,
        `${name}/artifacts/${name}.json`,
      ];
      
      for (const file of filesToTry) {
        const abiPath = path.join(dir, file);
        try {
          if (fs.existsSync(abiPath)) {
            console.log(`找到备选ABI文件: ${abiPath}`);
            const abiJson = fs.readFileSync(abiPath, 'utf8');
            const abiData = JSON.parse(abiJson);
            const abi = abiData.abi || abiData;
            
            if (Array.isArray(abi)) {
              console.log(`成功加载合约 ${contractName} 的ABI（使用备选名称）`);
              return abi;
            }
          }
        } catch (error) {
          console.warn(`尝试读取 ${abiPath} 失败:`, error.message);
        }
      }
    }
  }
  
  console.error(`无法找到合约 ${contractName} 的ABI文件`);
  throw new Error(`无法找到合约 ${contractName} 的ABI文件`);
};

module.exports = {
  getContractABI
}; 