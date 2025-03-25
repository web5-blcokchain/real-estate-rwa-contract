/**
 * 区块链连接提供者模块
 * 重新导出共享模块提供的功能
 */
const sharedProvider = require('../../../shared/utils/web3Provider');
const logger = require('./logger');

/**
 * @typedef {import('ethers').providers.Provider} Provider
 * @typedef {import('ethers').Signer} Signer
 */

/**
 * 获取以太坊提供者
 * @param {string} [customRpcUrl] 可选的自定义RPC URL
 * @returns {Provider} 以太坊提供者
 */
const getProvider = sharedProvider.getProvider;

/**
 * 获取带签名者的合约实例
 * @param {string} privateKey 私钥
 * @param {Provider} [customProvider] 可选的自定义提供者
 * @returns {Signer} 签名者
 */
const getSigner = sharedProvider.getSigner;

// 直接导出共享模块的函数
module.exports = sharedProvider;

// 初始化时测试连接
(async () => {
  try {
    const connected = await sharedProvider.testConnection();
    if (connected) {
      const networkInfo = await sharedProvider.getNetworkInfo();
      logger.info(`服务器已连接到区块链网络: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`);
    } else {
      logger.warn('服务器未能连接到区块链网络，将在需要时重试');
    }
  } catch (error) {
    logger.error(`初始化区块链连接失败: ${error.message}`);
  }
})();