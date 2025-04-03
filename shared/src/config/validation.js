/**
 * 配置验证工具
 * 提供配置模块使用的验证函数
 */

/**
 * 验证字符串是否非空
 * @param {string} value - 要验证的字符串
 * @returns {boolean} 是否是非空字符串
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 验证网络类型是否有效
 * @param {string} value - 要验证的网络类型
 * @returns {boolean} 是否是有效的网络类型
 */
function isValidNetworkType(value) {
  if (!isNonEmptyString(value)) return false;
  const network = value.toLowerCase();
  return ['localhost', 'testnet', 'mainnet'].includes(network);
}

/**
 * 验证RPC URL是否有效
 * @param {string} value - 要验证的URL
 * @returns {boolean} 是否是有效的URL
 */
function isValidRpcUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 验证链ID是否有效
 * @param {string|number} value - 要验证的链ID
 * @returns {boolean} 是否是有效的链ID
 */
function isValidChainId(value) {
  if (typeof value === 'string') {
    return /^\d+$/.test(value);
  }
  return Number.isInteger(value) && value > 0;
}

/**
 * 验证以太坊地址是否有效
 * @param {string} value - 要验证的地址
 * @returns {boolean} 是否是有效的以太坊地址
 */
function isValidAddress(value) {
  if (!isNonEmptyString(value)) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * 验证私钥是否有效
 * @param {string} value - 要验证的私钥
 * @returns {boolean} 是否是有效的私钥
 */
function isValidPrivateKey(value) {
  if (!isNonEmptyString(value)) return false;
  const key = value.startsWith('0x') ? value.slice(2) : value;
  return /^[a-fA-F0-9]{64}$/.test(key);
}

/**
 * 验证配置对象
 * @param {boolean} condition - 验证条件
 * @param {string} message - 验证失败时的错误消息
 * @throws {Error} 验证失败时抛出错误
 */
function validate(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

module.exports = {
  isNonEmptyString,
  isValidNetworkType,
  isValidRpcUrl,
  isValidChainId,
  isValidAddress,
  isValidPrivateKey,
  validate
}; 