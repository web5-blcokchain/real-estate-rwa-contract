/**
 * 合约工具函数
 * 提供合约操作相关的实用方法
 */
import { ethers } from 'ethers';
import utils from './index.js';
import logger from './logger.js';

const {
  getContract,
  getContractWithSigner,
  createContractFromAddress
} = utils;

/**
 * 获取合约实例
 * @param {string} contractName - 合约名称
 * @param {string} [role=''] - 角色名称，如果指定则使用对应的签名者
 * @returns {Promise<ethers.Contract>} 合约实例
 */
export const getContractInstance = async (contractName, role = '') => {
  try {
    logger.debug(`尝试获取${contractName}合约实例${role ? `，使用角色${role}` : ''}`);
    
    if (role) {
      return await getContractWithSigner(contractName, role);
    } else {
      return await getContract(contractName);
    }
  } catch (error) {
    logger.error(`获取${contractName}合约实例失败:`, error);
    throw error;
  }
};

/**
 * 为已注册的房产注册代币
 * @param {string} propertyId - 房产ID
 * @param {string} tokenAddress - 代币地址
 * @param {string} role - 角色名称，用于获取对应的签名者
 * @returns {Promise<ethers.ContractTransaction>} 交易对象
 */
export const registerTokenForProperty = async (propertyId, tokenAddress, role = 'manager') => {
  try {
    const propertyManager = await getContractWithSigner('PropertyManager', role);
    const tx = await propertyManager.registerTokenForProperty(propertyId, tokenAddress);
    return tx;
  } catch (error) {
    logger.error(`为房产 ${propertyId} 注册代币失败:`, error);
    throw error;
  }
};

/**
 * 创建房产代币
 * @param {string} propertyId - 房产ID
 * @param {string} name - 代币名称
 * @param {string} symbol - 代币符号
 * @param {number|string} initialSupply - 初始供应量
 * @param {number} decimals - 精度，默认18
 * @param {string} role - 角色名称，用于获取对应的签名者
 * @returns {Promise<{tx: ethers.ContractTransaction, tokenAddress: string}>} 交易对象和代币地址
 */
export const createPropertyToken = async (propertyId, name, symbol, initialSupply, decimals = 18, role = 'manager') => {
  try {
    // 获取PropertyTokenFactory合约
    const factory = await getContractWithSigner('PropertyTokenFactory', role);
    
    // 创建代币
    const tx = await factory.createToken(
      name,
      symbol,
      ethers.parseUnits(initialSupply.toString(), decimals),
      decimals,
      propertyId
    );
    
    // 等待交易确认
    const receipt = await tx.wait();
    
    // 从事件中提取代币地址
    const tokenCreatedEvent = receipt.logs
      .filter((log) => {
        try {
          return factory.interface.parseLog(log)?.name === 'TokenCreated';
        } catch (e) {
          return false;
        }
      })
      .map((log) => factory.interface.parseLog(log))[0];
    
    const tokenAddress = tokenCreatedEvent?.args?.tokenAddress;
    
    if (!tokenAddress) {
      throw new Error('无法从事件中获取代币地址');
    }
    
    return {
      tx,
      tokenAddress
    };
  } catch (error) {
    logger.error(`创建房产代币失败:`, error);
    throw error;
  }
}; 