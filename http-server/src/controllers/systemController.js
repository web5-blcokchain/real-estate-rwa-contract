const { ethers } = require('ethers');
const utils = require('../utils/index');
const logger = require('../utils/logger');
const contractHelpers = require('../utils/contractHelpers');

// 使用工具模块中的函数和实例
const { 
  getContract, 
  getContractWithSigner,
  networkUtils, // 直接使用shared导出的单例实例
  env // 使用环境配置单例
} = utils;

/**
 * 获取系统状态
 */
const getSystemStatus = async (req, res) => {
  try {
    // 获取各合约实例
    const roleManager = await getContract('RoleManager');
    const propertyManager = await getContract('PropertyManager');
    const tradingManager = await getContract('TradingManager');
    const rewardManager = await getContract('RewardManager');
    
    // 获取系统状态
    const isEmergency = await roleManager.isEmergency();
    const isTradingPaused = await tradingManager.isPaused();
    
    // 获取系统概况
    const propertyCount = await propertyManager.getPropertyCount();
    
    // 获取网络信息 - 使用networkUtils单例
    const networkInfo = {
      name: networkUtils.getNetworkName(),
      chainId: networkUtils.getChainId(),
      isTestnet: networkUtils.isTestnet(),
      isMainnet: networkUtils.isMainnet()
    };
    
    res.status(200).json({
      success: true,
      data: {
        systemHealth: {
          isEmergency,
          isTradingPaused
        },
        statistics: {
          propertyCount: Number(propertyCount)
        },
        network: networkInfo
      }
    });
  } catch (error) {
    logger.error('获取系统状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统状态失败',
      message: error.message
    });
  }
};

/**
 * 开启/关闭紧急模式
 */
const toggleEmergencyMode = async (req, res) => {
  try {
    const { enable, adminRole = 'admin' } = req.body;
    
    if (enable === undefined) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请指定是否启用紧急模式'
      });
    }
    
    // 获取合约实例
    const roleManager = await getContractWithSigner('RoleManager', adminRole);
    
    // 获取当前状态
    const currentState = await roleManager.isEmergency();
    
    // 只有状态需要改变时才执行
    if (currentState !== enable) {
      // 使用contractHelpers执行交易
      const txFunc = () => enable ? 
        roleManager.enableEmergency() : 
        roleManager.disableEmergency();
      
      const result = await contractHelpers.executeTransaction(
        txFunc, 
        `${enable ? '启用' : '关闭'}紧急模式`
      );
      
      res.status(200).json({
        success: true,
        data: {
          isEmergency: enable,
          transaction: result.transaction.hash,
          message: enable ? '已启用紧急模式' : '已关闭紧急模式'
        }
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          isEmergency: enable,
          message: `紧急模式已经${enable ? '开启' : '关闭'}，无需更改`
        }
      });
    }
  } catch (error) {
    logger.error('切换紧急模式失败:', error);
    res.status(500).json({
      success: false,
      error: '切换紧急模式失败',
      message: error.message
    });
  }
};

/**
 * 暂停/恢复交易
 */
const toggleTradingPause = async (req, res) => {
  try {
    const { enable, adminRole = 'admin' } = req.body;
    
    if (enable === undefined) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请指定是否暂停交易'
      });
    }
    
    // 获取合约实例
    const tradingManager = await getContractWithSigner('TradingManager', adminRole);
    
    // 获取当前状态
    const currentState = await tradingManager.isPaused();
    
    // 只有状态需要改变时才执行
    if (currentState !== enable) {
      // 使用contractHelpers执行交易
      const txFunc = () => enable ? 
        tradingManager.pause() : 
        tradingManager.unpause();
      
      const result = await contractHelpers.executeTransaction(
        txFunc, 
        `${enable ? '暂停' : '恢复'}交易`
      );
      
      res.status(200).json({
        success: true,
        data: {
          isPaused: enable,
          transaction: result.transaction.hash,
          message: enable ? '已暂停交易' : '已恢复交易'
        }
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          isPaused: enable,
          message: `交易已经${enable ? '暂停' : '开启'}，无需更改`
        }
      });
    }
  } catch (error) {
    logger.error('切换交易暂停状态失败:', error);
    res.status(500).json({
      success: false,
      error: '切换交易暂停状态失败',
      message: error.message
    });
  }
};

/**
 * 暂停/恢复合约功能
 */
const togglePause = async (req, res) => {
  try {
    const { contractName, enable, adminRole = 'admin' } = req.body;
    
    if (!contractName || enable === undefined) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请指定合约名称和是否暂停'
      });
    }
    
    // 获取合约实例
    const contract = await getContractWithSigner(contractName, adminRole);
    
    // 检查合约是否有暂停功能
    if (!contract.pause || !contract.unpause) {
      return res.status(400).json({
        success: false,
        error: '不支持的操作',
        message: `合约 ${contractName} 不支持暂停功能`
      });
    }
    
    // 获取当前状态（如果合约支持查询暂停状态）
    let currentState = false;
    if (contract.isPaused) {
      currentState = await contract.isPaused();
    }
    
    // 执行暂停/恢复操作
    if (currentState !== enable) {
      // 使用contractHelpers执行交易
      const txFunc = () => enable ? 
        contract.pause() : 
        contract.unpause();
      
      const result = await contractHelpers.executeTransaction(
        txFunc, 
        `${enable ? '暂停' : '恢复'}合约 ${contractName}`
      );
      
      res.status(200).json({
        success: true,
        data: {
          contractName,
          isPaused: enable,
          transaction: result.transaction.hash,
          message: enable ? `已暂停 ${contractName}` : `已恢复 ${contractName}`
        }
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          contractName,
          isPaused: enable,
          message: `${contractName} 已经${enable ? '暂停' : '开启'}，无需更改`
        }
      });
    }
  } catch (error) {
    logger.error('切换合约暂停状态失败:', error);
    res.status(500).json({
      success: false,
      error: '切换合约暂停状态失败',
      message: error.message
    });
  }
};

module.exports = {
  getSystemStatus,
  toggleEmergencyMode,
  toggleTradingPause,
  togglePause
}; 