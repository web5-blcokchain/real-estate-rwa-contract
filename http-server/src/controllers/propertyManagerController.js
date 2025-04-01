import { ethers } from 'ethers';
import utils from '../utils/index.js';

const { 
  getContract, 
  getContractWithSigner, 
  getContractWithPrivateKey,
  createContractFromAddress
} = utils;
const EnvConfig = utils.EnvConfig;

// 创建环境配置实例
const env = new EnvConfig();

/**
 * 注册新房产
 */
export const registerProperty = async (req, res) => {
  try {
    const { 
      propertyId, 
      location, 
      area, 
      description, 
      initialSupply, 
      decimals = 18, 
      managerRole = 'manager' 
    } = req.body;
    
    // 参数验证
    if (!propertyId || !location || !area || !description || !initialSupply) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的房产信息'
      });
    }
    
    // 使用共享工具获取已连接的合约实例
    const connectedPropertyManager = await getContractWithSigner('PropertyManager', managerRole);
    
    // 注册房产
    const tx = await connectedPropertyManager.registerProperty(
      propertyId,
      location,
      area,
      description,
      ethers.parseUnits(initialSupply.toString(), decimals),
      decimals
    );
    
    const receipt = await tx.wait();
    
    // 从事件中获取代币地址
    const propertyRegisteredEvent = receipt.logs
      .filter((log) => {
        try {
          return connectedPropertyManager.interface.parseLog(log)?.name === 'PropertyRegistered';
        } catch (e) {
          return false;
        }
      })
      .map((log) => connectedPropertyManager.interface.parseLog(log))[0];
    
    const tokenAddress = propertyRegisteredEvent?.args?.tokenAddress;
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        tokenAddress,
        location,
        area,
        description,
        initialSupply,
        decimals,
        transaction: tx.hash,
        message: `已成功注册房产 ${propertyId}`
      }
    });
  } catch (error) {
    console.error('注册房产失败:', error);
    res.status(500).json({
      success: false,
      error: '注册房产失败',
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