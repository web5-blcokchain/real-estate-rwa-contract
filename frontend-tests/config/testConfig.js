const { logger } = require('../../shared/utils/logger');
const { ethers } = require('ethers');
const { networkConfig } = require('../../shared/config');

/**
 * 获取测试配置
 * @returns {Promise<Object>} 测试配置
 */
async function getTestConfig() {
  try {
    // 测试配置
    const config = {
      // 测试超时时间（毫秒）
      timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
      
      // 测试重试次数
      retries: parseInt(process.env.TEST_RETRIES || '3'),
      
      // 测试间隔时间（毫秒）
      interval: parseInt(process.env.TEST_INTERVAL || '1000'),
      
      // 测试账户配置
      accounts: {
        // 测试账户余额阈值（ETH）
        balanceThreshold: parseFloat(process.env.TEST_BALANCE_THRESHOLD || '0.1'),
        
        // 测试账户初始余额（ETH）
        initialBalance: parseFloat(process.env.TEST_INITIAL_BALANCE || '1.0')
      },
      
      // 测试网络配置
      network: {
        // 测试网络 RPC URL
        rpcUrl: networkConfig.rpcUrl,
        
        // 测试网络 Chain ID
        chainId: networkConfig.chainId
      },
      
      // 测试合约配置
      contracts: {
        // 测试合约部署超时时间（毫秒）
        deployTimeout: parseInt(process.env.TEST_DEPLOY_TIMEOUT || '60000'),
        
        // 测试合约验证超时时间（毫秒）
        verifyTimeout: parseInt(process.env.TEST_VERIFY_TIMEOUT || '30000')
      },

      // 测试数据
      testData: {
        // 房产测试数据
        property: {
          id: 'PROP-001',
          country: 'Japan',
          metadataURI: 'ipfs://property-PROP-001',
          tokenName: 'Japan Real Estate Token #1',
          tokenSymbol: 'JRET1',
          totalSupply: ethers.parseEther('1000000'), // 1,000,000 代币
          price: ethers.parseEther('1000'), // 1,000 ETH
          rent: ethers.parseEther('50') // 50 ETH/月
        }
      }
    };

    // 验证配置
    if (!config.network.rpcUrl) {
      throw new Error('找不到测试网络 RPC URL');
    }

    logger.info('测试配置加载完成');
    return config;
  } catch (error) {
    logger.error('加载测试配置失败:', error);
    throw error;
  }
}

module.exports = {
  getTestConfig
}; 