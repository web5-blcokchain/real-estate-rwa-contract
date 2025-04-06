/**
 * 数据格式化工具
 * 提供各种数据格式化函数
 */
const { ethers } = require('ethers');

/**
 * 格式化合约参数以便记录日志
 * @param {Array} args - 参数数组
 * @returns {Array} 格式化后的参数
 */
function formatContractArgs(args) {
  if (!args || !Array.isArray(args)) {
    return ['<无参数>'];
  }

  return args.map(arg => {
    // ethers v6兼容的BigNumber检测
    if (arg && typeof arg === 'object' && typeof arg.toString === 'function') {
      // 检测常见的BigNumber特征
      if (typeof arg.toBigInt === 'function' || 
          typeof arg.toHexString === 'function' ||
          (arg._hex !== undefined)) {
        return arg.toString();
      }
    }
    
    // 处理数组
    if (Array.isArray(arg)) {
      return formatContractArgs(arg);
    }
    
    // 处理Uint8Array和Buffer
    if (arg instanceof Uint8Array || (arg && typeof arg === 'object' && arg.buffer instanceof ArrayBuffer)) {
      try {
        return ethers.hexlify(arg);
      } catch (e) {
        return '<Binary>';
      }
    }
    
    // 处理对象
    if (typeof arg === 'object' && arg !== null) {
      try {
        const formattedObj = {};
        for (const key in arg) {
          if (typeof arg[key] !== 'function') { // 跳过方法
            formattedObj[key] = formatContractArgs([arg[key]])[0];
          }
        }
        return formattedObj;
      } catch (e) {
        return '<无法格式化对象>';
      }
    }
    
    // 其他类型直接返回
    return arg;
  });
}

module.exports = {
  formatContractArgs
}; 