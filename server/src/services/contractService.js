/**
 * 导出shared目录下的合约服务
 * 这个文件作为兼容性层，以便在不破坏现有代码的情况下过渡到共享服务
 */

const { contractService, ContractService } = require('../../../shared/utils/contractService');
const logger = require('../utils/logger');

// 创建获取合约的异步方法
const getTokenFactory = async () => {
  if (!contractService.initialized) {
    try {
      await contractService.initialize();
      logger.info('Contract service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize contract service:', error);
      throw error;
    }
  }
  
  try {
    return await contractService.getTokenFactory();
  } catch (error) {
    logger.warn(`TokenFactory contract not available: ${error.message}`);
    return null;
  }
};

const getPropertyRegistry = async () => {
  if (!contractService.initialized) {
    try {
      await contractService.initialize();
      logger.info('Contract service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize contract service:', error);
      throw error;
    }
  }
  
  try {
    return await contractService.getPropertyRegistry();
  } catch (error) {
    logger.warn(`PropertyRegistry contract not available: ${error.message}`);
    return null;
  }
};

const getToken = async (tokenAddress) => {
  if (!contractService.initialized) {
    try {
      await contractService.initialize();
      logger.info('Contract service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize contract service:', error);
      throw error;
    }
  }
  
  try {
    return await contractService.getToken(tokenAddress);
  } catch (error) {
    logger.warn(`Token contract not available at ${tokenAddress}: ${error.message}`);
    return null;
  }
};

// 导出单例实例和异步方法
module.exports = {
  // 异步方法
  getTokenFactory,
  getPropertyRegistry,
  getToken,
  
  // 为向后兼容性暴露整个contractService实例
  contractService,
  ContractService
}; 