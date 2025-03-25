const { web3Provider } = require('../../../shared/utils/web3Provider');
const { getAbis } = require('../../../shared/utils/getAbis');
const { logger } = require('../utils/logger');

/**
 * 初始化以太坊提供者
 * @returns {Promise<ethers.Provider>} 以太坊提供者
 */
async function initProvider() {
  try {
    // 使用共享的web3Provider
    const provider = await web3Provider.getProvider();
    return provider;
  } catch (error) {
    logger.error(`创建以太坊提供者失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取以太坊提供者
 * @returns {Promise<ethers.Provider>} 以太坊提供者
 */
async function getProvider() {
  return web3Provider.getProvider();
}

/**
 * 获取签名者
 * @returns {Promise<ethers.Signer>} 签名者
 */
async function getSigner() {
  return web3Provider.getSigner();
}

/**
 * 测试网络连接
 * @returns {Promise<boolean>} 是否连接成功
 */
async function testConnection() {
  try {
    const provider = await getProvider();
    const network = await provider.getNetwork();
    logger.info(`网络连接测试成功: ${network.name} (chainId: ${network.chainId})`);
    return true;
  } catch (error) {
    logger.error(`网络连接测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取合约ABI
 * @param {string} contractName 合约名称
 * @returns {Object} 合约ABI
 */
function getContractAbi(contractName) {
  return getAbis.getContractAbi(contractName);
}

module.exports = {
  initProvider,
  getProvider,
  getSigner,
  testConnection,
  getContractAbi
}; 