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
  // 标准化合约名称为驼峰命名（首字母小写）
  const normalizedName = toCamelCase(contractName);
  
  console.log(`尝试获取合约ABI，合约名称: ${contractName}, 标准化名称: ${normalizedName}`);
  
  // 可能的ABI文件名变体
  const possibleNames = [
    normalizedName,
    contractName.toLowerCase(),
    contractName,
    // 特殊处理PropertyManager
    contractName === 'PropertyManager' ? 'propertyManager' : normalizedName,
    contractName === 'PropertyManager' ? 'property' : normalizedName,
    contractName === 'PropertyManager' ? 'PropertyManager' : normalizedName,
  ];
  
  // 可能的ABI文件路径目录
  const possibleDirs = [
    // 项目根目录下的config/abi目录
    path.resolve(__dirname, '../../../config/abi'),
    // 上一级目录下的config/abi目录
    path.resolve(__dirname, '../../../../config/abi'),
    // 当前工作目录下的config/abi目录
    path.resolve(process.cwd(), 'config/abi'),
    // 从shared模块路径到config/abi
    path.resolve(__dirname, '../../../config/abi'),
    // 从artifacts目录
    path.resolve(__dirname, '../../../artifacts/contracts'),
  ];
  
  console.log(`尝试从以下目录查找ABI文件:`);
  possibleDirs.forEach(dir => console.log(`- ${dir}`));
  
  // 尝试所有可能的路径
  for (const dir of possibleDirs) {
    for (const name of possibleNames) {
      // 尝试不同的文件扩展名和格式
      const filesToTry = [
        `${name}.json`,
        `${name}.abi.json`,
        `${name}/${name}.json`,
        `${name}/${name}.abi`,
        `${name}/artifacts/${name}.json`,
      ];
      
      for (const file of filesToTry) {
        const abiPath = path.join(dir, file);
        try {
          // 检查文件是否存在
          if (fs.existsSync(abiPath)) {
            console.log(`找到ABI文件: ${abiPath}`);
            
            // 读取并解析ABI
            const abiJson = fs.readFileSync(abiPath, 'utf8');
            const abiData = JSON.parse(abiJson);
            
            // ABI可能在不同的属性中
            const abi = abiData.abi || abiData;
            
            // 验证是否找到了有效的ABI
            if (Array.isArray(abi)) {
              // 输出找到的函数列表
              const functions = abi
                .filter(item => item.type === 'function')
                .map(fn => `${fn.name}(${fn.inputs.map(i => i.type).join(',')})`);
              
              console.log(`合约ABI包含以下函数:`);
              functions.forEach(fn => console.log(`- ${fn}`));
              
              // 特别检查是否包含registerProperty函数
              if (contractName === 'PropertyManager') {
                const hasRegisterProperty = abi.some(item => 
                  item.type === 'function' && item.name === 'registerProperty'
                );
                console.log(`ABI ${hasRegisterProperty ? '包含' : '不包含'} registerProperty 函数`);
              }
              
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
  throw new Error(`无法找到合约 ${contractName} 的ABI文件，已尝试查找以下名称: ${possibleNames.join(', ')}`);
};

module.exports = {
  getContractABI,
  toCamelCase // 导出函数以供其他模块使用
}; 