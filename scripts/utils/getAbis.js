/**
 * 获取合约ABI的工具函数
 * 该模块主要是为了兼容旧代码，推荐直接使用共享的ABI工具
 */
const path = require('path');
const fs = require('fs');

// 导入共享的ABI工具模块
const { getAbi } = require('../../shared/utils');

// 获取智能合约ABI
function getContractAbi(contractName) {
  return getAbi(contractName);
}

// 获取多个智能合约ABI
function getContractAbis(contractNames) {
  const abis = {};
  
  for (const name of contractNames) {
    try {
      abis[name] = getContractAbi(name);
    } catch (error) {
      console.error(`获取合约 ${name} 的ABI失败: ${error.message}`);
    }
  }
  
  return abis;
}

// 为了向后兼容保留的函数
function _getLegacyContractAbi(contractName) {
  try {
    // 先尝试使用共享ABI工具
    return getAbi(contractName);
  } catch (error) {
    // 回退到本地查找
    const artifactsDir = path.join(__dirname, '../../artifacts/contracts');
    
    // 查找编译后的合约文件
    const artifacts = findContractFile(artifactsDir, contractName);
    
    if (!artifacts) {
      throw new Error(`找不到合约 ${contractName} 的编译文件`);
    }
    
    // 读取合约ABI
    const contractJson = JSON.parse(fs.readFileSync(artifacts, 'utf8'));
    return contractJson.abi;
  }
}

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

module.exports = {
  getContractAbi,
  getContractAbis
}; 