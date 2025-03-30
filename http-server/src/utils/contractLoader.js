/**
 * 合约加载工具
 * 从部署文件加载合约地址和ABI
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { logger } = require('./logger');

/**
 * 加载所有合约地址
 * @returns {Object} 包含所有合约地址的对象
 */
function loadContractAddresses() {
  try {
    // 读取部署状态文件
    const deployStateFile = config.blockchain.contracts.addressesPath;
    
    if (!fs.existsSync(deployStateFile)) {
      logger.error(`合约地址文件不存在: ${deployStateFile}`);
      return {};
    }
    
    const deployState = JSON.parse(fs.readFileSync(deployStateFile, 'utf8'));
    
    if (!deployState || !deployState.contracts) {
      logger.warn('合约地址文件不包含contracts字段');
      return {};
    }
    
    return deployState.contracts;
  } catch (error) {
    logger.error('加载合约地址失败', error);
    return {};
  }
}

/**
 * 加载合约ABI
 * @param {string} contractName - 合约名称
 * @returns {Array} 合约ABI数组
 */
function loadContractABI(contractName) {
  try {
    // 构建ABI文件路径
    const artifactsDir = path.resolve(__dirname, '../../../artifacts/contracts');
    const abiFilePath = path.join(artifactsDir, `${contractName}.sol/${contractName}.json`);
    
    if (!fs.existsSync(abiFilePath)) {
      logger.error(`合约ABI文件不存在: ${abiFilePath}`);
      return null;
    }
    
    const artifact = JSON.parse(fs.readFileSync(abiFilePath, 'utf8'));
    
    if (!artifact || !artifact.abi) {
      logger.warn(`合约ABI文件不包含abi字段: ${contractName}`);
      return null;
    }
    
    return artifact.abi;
  } catch (error) {
    logger.error(`加载合约ABI失败: ${contractName}`, error);
    return null;
  }
}

module.exports = {
  loadContractAddresses,
  loadContractABI
}; 