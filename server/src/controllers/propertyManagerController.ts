import { Request, Response } from 'express';
import { ethers } from 'ethers';

// 导入环境配置和合约工具
const envConfig = require('../../../shared/src/config/env');
const env = new envConfig();

// 获取合约实例
const getContract = async (contractName: string) => {
  const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
  const contractAddress = env.get(`${contractName.toUpperCase()}_ADDRESS`);
  const contractABI = require(`../../../config/abi/${contractName}.json`);
  return new ethers.Contract(contractAddress, contractABI, provider);
};

/**
 * 注册新房产
 */
export const registerProperty = async (req: Request, res: Response) => {
  try {
    const { 
      propertyId, 
      location, 
      area, 
      description, 
      initialSupply, 
      decimals, 
      managerPrivateKey 
    } = req.body;
    
    // 参数验证
    if (!propertyId || !location || !area || !description || !initialSupply || !managerPrivateKey) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的房产信息'
      });
    }
    
    // 获取合约实例
    const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
    const wallet = new ethers.Wallet(managerPrivateKey, provider);
    const propertyManager = await getContract('PropertyManager');
    const connectedPropertyManager = propertyManager.connect(wallet);
    
    // 调用合约方法
    const tx = await connectedPropertyManager.registerProperty(
      propertyId,
      location,
      area,
      description,
      ethers.parseUnits(initialSupply.toString(), decimals || 18),
      decimals || 18
    );
    
    const receipt = await tx.wait();
    
    // 从事件中获取新创建的代币地址
    const propertyTokenCreatedEvent = receipt.logs
      .filter((log: any) => {
        try {
          return propertyManager.interface.parseLog(log)?.name === 'PropertyTokenCreated';
        } catch (e) {
          return false;
        }
      })
      .map((log: any) => propertyManager.interface.parseLog(log))[0];
    
    const tokenAddress = propertyTokenCreatedEvent?.args?.tokenAddress;
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        tokenAddress,
        transaction: tx.hash,
        message: `已成功注册房产 ${propertyId}`
      }
    });
  } catch (error: any) {
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
export const getPropertyInfo = async (req: Request, res: Response) => {
  try {
    const { propertyId, field } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供房产ID'
      });
    }
    
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
    
    // 获取代币信息
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(tokenAddress);
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
  } catch (error: any) {
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
export const updatePropertyInfo = async (req: Request, res: Response) => {
  try {
    const { propertyId, field, value, managerPrivateKey } = req.body;
    
    // 参数验证
    if (!propertyId || !field || !value || !managerPrivateKey) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的参数'
      });
    }
    
    // 获取合约实例
    const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
    const wallet = new ethers.Wallet(managerPrivateKey, provider);
    const propertyManager = await getContract('PropertyManager');
    const connectedPropertyManager = propertyManager.connect(wallet);
    
    // 获取旧值
    const oldValue = await propertyManager.getPropertyInfo(propertyId, field);
    
    // 调用合约方法
    const tx = await connectedPropertyManager.updatePropertyInfo(propertyId, field, value);
    await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        field,
        oldValue,
        newValue: value,
        transaction: tx.hash,
        message: `已成功更新房产 ${propertyId} 的 ${field} 字段`
      }
    });
  } catch (error: any) {
    console.error('更新房产信息失败:', error);
    res.status(500).json({
      success: false,
      error: '更新房产信息失败',
      message: error.message
    });
  }
};

/**
 * 获取所有房产列表
 */
export const getAllProperties = async (req: Request, res: Response) => {
  try {
    const propertyManager = await getContract('PropertyManager');
    
    // 获取房产数量
    const propertyCount = await propertyManager.getPropertyCount();
    
    // 获取所有房产ID
    const properties = [];
    for (let i = 0; i < propertyCount; i++) {
      const propertyId = await propertyManager.getPropertyIdByIndex(i);
      const tokenAddress = await propertyManager.getPropertyToken(propertyId);
      
      properties.push({
        propertyId,
        tokenAddress
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        count: propertyCount,
        properties
      }
    });
  } catch (error: any) {
    console.error('获取房产列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取房产列表失败',
      message: error.message
    });
  }
};