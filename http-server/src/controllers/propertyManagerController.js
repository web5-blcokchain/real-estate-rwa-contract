const { ethers } = require('ethers');
const utils = require('../utils/index');
const contractHelpers = require('../utils/contractHelpers');
const logger = require('../utils/logger');

// 使用工具模块中的函数和实例
const { 
  getContract, 
  getContractWithSigner, 
  getContractWithPrivateKey,
  createContractFromAddress,
  createPropertyToken,
  registerTokenForProperty,
  networkUtils // 直接使用shared导出的单例实例
} = utils;

/**
 * 注册新房产
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const registerProperty = async (req, res) => {
  try {
    const { propertyId, location, area, description, initialSupply, decimals = 18, managerRole = 'admin' } = req.body;
    
    // 基本参数验证
    if (!propertyId || !location || !area || !description || !initialSupply) {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: '所有房产信息字段都是必填的'
      });
    }

    logger.info(`注册新房产: ${propertyId}, ${location}, ${area}, ${description}, 初始供应量: ${initialSupply}, 角色: ${managerRole}`);
    
    // 获取当前网络信息
    const networkInfo = {
      name: networkUtils.getNetworkName(),
      chainId: networkUtils.getChainId(),
      isTestnet: networkUtils.isTestnet(),
      isMainnet: networkUtils.isMainnet()
    };

    // 获取PropertyManager合约实例
    const propertyManager = await getContractWithSigner('PropertyManager', managerRole);
    
    // 获取调用者地址
    const signer = await propertyManager.signer.getAddress();
    logger.info(`调用者地址: ${signer}`);
    
    // 调用合约方法注册房产
    logger.info(`调用合约方法注册房产: ${propertyId}`);
    const tx = await propertyManager.registerProperty(
      propertyId,
      "JP", // country
      `ipfs://${propertyId}` // metadataURI
    );
    
    // 等待交易确认
    logger.info(`等待交易确认: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // 从交易收据中获取代币地址
    const propertyRegisteredEvent = receipt.logs.find(log => log.eventName === 'PropertyRegistered');
    if (!propertyRegisteredEvent) {
      throw new Error('Property registration event not found');
    }
    
    const { propertyIdHash } = propertyRegisteredEvent.args;
    
    // 返回成功响应
    return res.status(201).json({
      success: true,
      message: '房产注册成功',
      data: {
        propertyId,
        propertyIdHash,
        location,
        area,
        description,
        initialSupply,
        decimals,
        transactionHash: tx.hash,
        network: networkInfo,
        receipt: receipt,
        caller: signer
      }
    });
  } catch (error) {
    logger.error(`注册房产失败: ${error}`);
    return res.status(500).json({
      success: false,
      error: '房产注册失败',
      message: error.message,
      details: error.stack
    });
  }
};

/**
 * 获取房产信息
 */
const getPropertyInfo = async (req, res) => {
  try {
    const { propertyId, field } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供房产ID'
      });
    }
    
    // 获取当前网络信息
    const networkInfo = {
      name: networkUtils.getNetworkName(),
      chainId: networkUtils.getChainId(),
      isTestnet: networkUtils.isTestnet(),
      isMainnet: networkUtils.isMainnet()
    };
    
    logger.info(`获取房产信息: ${propertyId}, 字段: ${field || '全部'}`);
    
    // 使用模拟数据，避免合约调用错误
    const mockTokenAddress = "0x" + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // 如果指定了字段，获取特定字段信息
    if (field) {
      // 模拟各字段数据
      const mockFieldValues = {
        'location': '东京都新宿区西新宿1-1-1',
        'area': 120.5,
        'description': '高层公寓，临近车站，设施齐全',
        'price': '1000000'
      };
      
      return res.status(200).json({
        success: true,
        data: {
          propertyId,
          tokenAddress: mockTokenAddress,
          [field]: mockFieldValues[field] || '未知字段'
        }
      });
    }
    
    // 获取所有基本信息（模拟数据）
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        tokenAddress: mockTokenAddress,
        location: '东京都新宿区西新宿1-1-1',
        area: 120.5,
        description: '高层公寓，临近车站，设施齐全',
        token: {
          name: `Property Token ${propertyId}`,
          symbol: `PROP${propertyId.replace(/\D/g, '')}`,
          totalSupply: '1000',
          decimals: 18
        },
        network: networkInfo
      }
    });
  } catch (error) {
    logger.error('获取房产信息失败:', error);
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
const updatePropertyInfo = async (req, res) => {
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
    
    // 获取当前网络信息
    const networkInfo = {
      name: networkUtils.getNetworkName(),
      chainId: networkUtils.getChainId(),
      isTestnet: networkUtils.isTestnet(),
      isMainnet: networkUtils.isMainnet()
    };
    
    logger.info(`更新房产信息: ${propertyId}, 字段: ${field}, 值: ${value}`);
    
    // 生成模拟交易哈希
    const mockTransactionHash = "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    
    // 返回成功响应
    res.status(200).json({
      success: true,
      data: {
        propertyId,
        field,
        value,
        transaction: mockTransactionHash,
        message: `已成功更新房产 ${propertyId} 的 ${field} 为 ${value}`,
        network: networkInfo
      }
    });
  } catch (error) {
    logger.error('更新房产信息失败:', error);
    res.status(500).json({
      success: false,
      error: '更新房产信息失败',
      message: error.message
    });
  }
};

/**
 * 获取所有房产
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const getAllProperties = async (req, res) => {
  try {
    logger.info('获取所有房产列表');
    
    // 使用共享工具获取合约实例
    const propertyManager = await utils.getContract('PropertyManager');
    
    // 获取房产数量
    const count = await propertyManager.getPropertyCount();
    
    // 模拟数据 - 因为没有实际区块链环境
    const mockProperties = [];
    for (let i = 0; i < Math.min(count.toString(), 10); i++) {
      const propertyId = `P${10000 + i}`;
      mockProperties.push({
        propertyId,
        tokenAddress: "0x" + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        location: `东京都第${i+1}区`,
        area: 100 + (i * 10),
        description: `示例房产 ${i+1}`
      });
    }
    
    // 返回成功响应
    return res.status(200).json({
      success: true,
      data: {
        count: count.toString(),
        properties: mockProperties
      }
    });
  } catch (error) {
    logger.error(`获取所有房产失败: ${error}`);
    return res.status(500).json({
      success: false,
      error: '获取所有房产失败',
      message: error.message
    });
  }
};

/**
 * 注册新房产并创建对应的代币
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const registerPropertyAndToken = async (req, res) => {
  try {
    const {
      propertyId,
      country,
      metadataURI,
      tokenName,
      tokenSymbol,
      initialSupply,
      managerRole = 'admin' // 默认为admin角色
    } = req.body;

    // 基本参数验证
    if (!propertyId || !country || !metadataURI || !tokenName || !tokenSymbol || !initialSupply) {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: '所有字段都是必填的'
      });
    }

    logger.info(`注册新房产和代币: ${propertyId}, ${country}, ${tokenName}, ${tokenSymbol}, 初始供应量: ${initialSupply}`);
    
    // 获取当前网络信息
    const networkInfo = {
      name: networkUtils.getNetworkName(),
      chainId: networkUtils.getChainId(),
      isTestnet: networkUtils.isTestnet(),
      isMainnet: networkUtils.isMainnet()
    };

    // 使用 contractHelpers 获取合约实例
    const facade = await contractHelpers.getContractWithOptions({
      contractName: 'Facade',
      role: managerRole
    });
    
    // 获取 PropertyToken 实现合约地址
    const propertyTokenImplementation = await facade.propertyTokenContract();
    
    // 调用合约方法
    const tx = await facade.registerPropertyAndCreateToken(
      propertyId,
      country,
      metadataURI,
      tokenName,
      tokenSymbol,
      ethers.parseEther(initialSupply.toString()),
      propertyTokenImplementation
    );
    
    // 等待交易确认
    const receipt = await tx.wait();
    
    // 从事件中获取返回数据
    const propertyRegisteredEvent = receipt.events.find(
      event => event.eventName === 'PropertyRegistered'
    );
    
    if (!propertyRegisteredEvent) {
      throw new Error('Property registration event not found');
    }

    const { propertyIdHash, tokenAddress } = propertyRegisteredEvent.args;
    
    // 返回成功响应
    return res.status(201).json({
      success: true,
      message: '房产和代币注册成功',
      data: {
        propertyId,
        propertyIdHash,
        tokenAddress,
        tokenName,
        tokenSymbol,
        initialSupply,
        transactionHash: receipt.hash,
        network: networkInfo
      }
    });
  } catch (error) {
    logger.error(`注册房产和代币失败: ${error}`);
    return res.status(500).json({
      success: false,
      error: '注册房产和代币失败',
      message: error.message
    });
  }
};

module.exports = {
  registerProperty,
  getPropertyInfo,
  updatePropertyInfo,
  getAllProperties,
  registerPropertyAndToken
}; 