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
  try {
    // 标准化合约名称为驼峰命名（首字母小写）
    const normalizedName = toCamelCase(contractName);
    
    // 构建ABI文件路径（相对于项目根目录）
    const abiPath = path.resolve(__dirname, '../../../config/abi', `${normalizedName}.json`);
    
    // 检查文件是否存在
    if (!fs.existsSync(abiPath)) {
      throw new Error(`ABI文件不存在: ${abiPath}`);
    }
    
    // 读取并解析ABI
    const abiJson = fs.readFileSync(abiPath, 'utf8');
    return JSON.parse(abiJson);
  } catch (error) {
    console.error(`无法加载合约 ${contractName} 的ABI:`, error);
    throw new Error(`无法加载合约 ${contractName} 的ABI: ${error.message}`);
  }
};

module.exports = {
  getContractABI,
  toCamelCase // 导出函数以供其他模块使用
}; 