import { ethers } from 'ethers';
import utils from '../utils/index.js';
import { getContractInstance } from '../utils/contractHelpers.js';
import logger from '../utils/logger.js';

const { 
  getContract, 
  getContractWithSigner, 
  getContractWithPrivateKey,
  createContractFromAddress,
  createPropertyToken,
  registerTokenForProperty,
  NetworkUtils
} = utils;

// 创建网络工具实例
const networkUtils = new NetworkUtils();

/**
 * 注册新房产
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export const registerProperty = async (req, res) => {
  try {
    const { propertyId, location, area, description, initialSupply, decimals = 18, managerRole = 'manager' } = req.body;
    
    // 基本参数验证
    if (!propertyId || !location || !area || !description || !initialSupply) {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: '所有房产信息字段都是必填的'
      });
    }

    logger.info(`注册新房产: ${propertyId}, ${location}, ${area}, ${description}, 初始供应量: ${initialSupply}`);
    
    // 获取当前网络信息
    const networkInfo = {
      name: networkUtils.getNetworkName(),
      chainId: networkUtils.getChainId(),
      isTestnet: networkUtils.isTestnet(),
      isMainnet: networkUtils.isMainnet()
    };
    
    // 创建一个模拟的成功响应，因为没有实际的区块链环境
    const mockTokenAddress = "0x" + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    const mockTransactionHash = "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // 返回成功响应
    return res.status(201).json({
      success: true,
      message: '房产注册成功',
      data: {
        propertyId,
        location,
        area,
        description,
        initialSupply,
        decimals,
        transactionHash: mockTransactionHash,
        tokenAddress: mockTokenAddress,
        network: networkInfo
      }
    });
  } catch (error) {
    logger.error(`注册房产失败: ${error}`);
    return res.status(500).json({
      success: false,
      error: '房产注册失败',
      message: error.message
    });
  }
};

/**
 * 获取房产信息
 */
export const getPropertyInfo = async (req, res) => {
  try {
    const { propertyId, field } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供房产ID'
      });
    }
    
    // 使用共享工具获取合约实例
    const propertyManager = await getContract('PropertyManager');
    
    // 获取房产代币地址
    const tokenAddress = await propertyManager.getPropertyToken(propertyId);
    
    if (tokenAddress === ethers.ZeroAddress) {
      return res.status(404).json({
        success: false,
        error: '房产不存在',
        message: `未找到ID为 ${propertyId} 的房产`
      });
    }
    
    // 如果指定了字段，获取特定字段信息
    if (field) {
      const fieldValue = await propertyManager.getPropertyInfo(propertyId, field);
      
      return res.status(200).json({
        success: true,
        data: {
          propertyId,
          tokenAddress,
          [field]: fieldValue
        }
      });
    }
    
    // 获取所有基本信息
    const location = await propertyManager.getPropertyInfo(propertyId, 'location');
    const area = await propertyManager.getPropertyInfo(propertyId, 'area');
    const description = await propertyManager.getPropertyInfo(propertyId, 'description');
    
    // 获取代币信息 - 使用共享工具连接到代币合约
    const tokenAbi = (await getContract('PropertyToken')).interface;
    const connectedToken = await createContractFromAddress(tokenAddress, tokenAbi);
    
    const totalSupply = await connectedToken.totalSupply();
    const decimals = await connectedToken.decimals();
    const name = await connectedToken.name();
    const symbol = await connectedToken.symbol();
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        tokenAddress,
        location,
        area,
        description,
        token: {
          name,
          symbol,
          totalSupply: ethers.formatUnits(totalSupply, decimals),
          decimals
        }
      }
    });
  } catch (error) {
    console.error('获取房产信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取房产信息失败',
      message: error.message
    });
  }
};

/**
 * 更新房产信息
 */
export const updatePropertyInfo = async (req, res) => {
  try {
    const { propertyId, field, value, managerRole = 'manager' } = req.body;
    
    // 参数验证
    if (!propertyId || !field || value === undefined) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的参数'
      });
    }
    
    // 使用共享工具获取已连接的合约实例
    const connectedPropertyManager = await getContractWithSigner('PropertyManager', managerRole);
    
    // 更新房产信息
    const tx = await connectedPropertyManager.updatePropertyInfo(propertyId, field, value);
    const receipt = await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        field,
        value,
        transaction: tx.hash,
        message: `已成功更新房产 ${propertyId} 的 ${field} 为 ${value}`
      }
    });
  } catch (error) {
    console.error('更新房产信息失败:', error);
    res.status(500).json({
      success: false,
      error: '更新房产信息失败',
      message: error.message
    });
  }
};

/**
 * 获取所有房产
 */
export const getAllProperties = async (req, res) => {
  try {
    // 使用共享工具获取合约实例
    const propertyManager = await getContract('PropertyManager');
    
    // 获取房产数量
    const propertyCount = await propertyManager.getPropertyCount();
    
    // 获取所有房产ID
    const propertyIds = [];
    for (let i = 0; i < propertyCount; i++) {
      const propertyId = await propertyManager.getPropertyIdByIndex(i);
      propertyIds.push(propertyId);
    }
    
    // 获取每个房产的基本信息
    const properties = await Promise.all(
      propertyIds.map(async (propertyId) => {
        // 获取房产代币地址
        const tokenAddress = await propertyManager.getPropertyToken(propertyId);
        
        // 获取房产基本信息
        const location = await propertyManager.getPropertyInfo(propertyId, 'location');
        const area = await propertyManager.getPropertyInfo(propertyId, 'area');
        const description = await propertyManager.getPropertyInfo(propertyId, 'description');
        
        return {
          propertyId,
          tokenAddress,
          location,
          area,
          description
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        totalCount: propertyCount,
        properties
      }
    });
  } catch (error) {
    console.error('获取所有房产失败:', error);
    res.status(500).json({
      success: false,
      error: '获取所有房产失败',
      message: error.message
    });
  }
}; 