import { Request, Response } from 'express';
import { ethers } from 'ethers';

// 导入环境配置和合约工具
const envConfig = require('../../../shared/src/config/env');
const env = new envConfig();

// 获取合约实例
const getContract = async (contractName:) => {
  const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
  const contractAddress = env.get(`${contractName.toUpperCase()}_ADDRESS`);
  const contractABI = require(`../../../config/abi/${contractName}.json`);
  return new ethers.Contract(contractAddress, contractABI, provider);
};

// 获取钱包实例
const getWallet = (role:) => {
  const privateKey = env.get(`${role.toUpperCase()}_PRIVATE_KEY`);
  if (!privateKey) {
    throw new Error(`未找到角色 ${role} 的私钥配置`);
  }
  const provider = new ethers.JsonRpcProvider(env.get('RPC_URL'));
  return new ethers.Wallet(privateKey, provider);
};

/**
 * 创建订单
 */
export const createOrder = async (req:, res:) => {
  try {
    const { token, amount, price, sellerRole = 'seller' } = req.body;
    
    // 参数验证
    if (!token || !ethers.isAddress(token) || !amount || !price) {
      return res.status(400).json({
        success:,
        error:'参数不完整',
        message:'请提供所有必要的订单信息'
      });
    }
    
    // 从环境变量获取卖家钱包
    const wallet = getWallet(sellerRole);
    const tradingManager = await getContract('TradingManager');
    const connectedTradingManager = tradingManager.connect(wallet);
    
    // 获取代币合约
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(token).connect(wallet);
    
    // 检查代币授权
    const sellerAddress = wallet.address;
    const allowance = await connectedToken.allowance(sellerAddress, tradingManager.target);
    const amountBigInt = ethers.parseUnits(amount.toString(), await connectedToken.decimals());
    
    // 如果授权不足，先进行授权
    if (allowance < amountBigInt) {
      const approveTx = await connectedToken.approve(tradingManager.target, amountBigInt);
      await approveTx.wait();
    }
    
    // 创建订单
    const tx = await connectedTradingManager.createOrder(
      token,
      amountBigInt,
      ethers.parseUnits(price.toString(), 18) // 假设价格以ETH为单位，18位小数
    );
    
    const receipt = await tx.wait();
    
    // 从事件中获取订单ID
    const orderCreatedEvent = receipt.logs
      .filter((log:) => {
        try {
          return tradingManager.interface.parseLog(log)?.name === 'OrderCreated';
        } catch (e) {
          return false;
        }
      })
      .map((log:) => tradingManager.interface.parseLog(log))[0];
    
    const orderId = orderCreatedEvent?.args?.orderId;
    
    res.status(200).json({
      success:,
      data:{
        orderId:.toString(),
        seller:,
        token,
        amount:.toString(),
        price:.toString(),
        transaction:.hash,
        message:`已成功创建订单 #${orderId}`
      }
    });
  } catch (error:) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success:,
      error:'创建订单失败',
      message:.message
    });
  }
};

/**
 * 执行订单
 */
export const executeOrder = async (req:, res:) => {
  try {
    const { orderId, buyerRole = 'buyer' } = req.body;
    
    // 参数验证
    if (!orderId) {
      return res.status(400).json({
        success:,
        error:'参数不完整',
        message:'请提供所有必要的参数'
      });
    }
    
    // 从环境变量获取买家钱包
    const wallet = getWallet(buyerRole);
    const tradingManager = await getContract('TradingManager');
    const connectedTradingManager = tradingManager.connect(wallet);
    
    // 获取订单信息
    const order = await tradingManager.getOrder(orderId);
    
    // 执行订单
    const tx = await connectedTradingManager.executeOrder(orderId, {
      value:[4] // price
    });
    
    const receipt = await tx.wait();
    
    res.status(200).json({
      success:,
      data:{
        orderId:.toString(),
        buyer:.address,
        seller:[1],
        token:[2],
        amount:.formatUnits(order[3], 18), // 假设代币有18位小数
        price:.formatEther(order[4]),
        transaction:.hash,
        message:`已成功执行订单 #${orderId}`
      }
    });
  } catch (error:) {
    console.error('执行订单失败:', error);
    res.status(500).json({
      success:,
      error:'执行订单失败',
      message:.message
    });
  }
};

/**
 * 取消订单
 */
export const cancelOrder = async (req:, res:) => {
  try {
    const { orderId, sellerRole = 'seller' } = req.body;
    
    // 参数验证
    if (!orderId) {
      return res.status(400).json({
        success:,
        error:'参数不完整',
        message:'请提供所有必要的参数'
      });
    }
    
    // 从环境变量获取卖家钱包
    const wallet = getWallet(sellerRole);
    const tradingManager = await getContract('TradingManager');
    const connectedTradingManager = tradingManager.connect(wallet);
    
    // 取消订单
    const tx = await connectedTradingManager.cancelOrder(orderId);
    const receipt = await tx.wait();
    
    res.status(200).json({
      success:,
      data:{
        orderId:.toString(),
        transaction:.hash,
        message:`已成功取消订单 #${orderId}`
      }
    });
  } catch (error:) {
    console.error('取消订单失败:', error);
    res.status(500).json({
      success:,
      error:'取消订单失败',
      message:.message
    });
  }
};

/**
 * 获取订单信息
 */
export const getOrder = async (req:, res:) => {
  try {
    const { orderId } = req.params;
    
    // 参数验证
    if (!orderId) {
      return res.status(400).json({
        success:,
        error:'参数不完整',
        message:'请提供订单ID'
      });
    }
    
    // 获取合约实例
    const tradingManager = await getContract('TradingManager');
    
    // 获取订单信息
    const order = await tradingManager.getOrder(orderId);
    
    // 获取代币信息
    const tokenContract = await getContract('PropertyToken');
    const connectedToken = tokenContract.attach(order[2]);
    const decimals = await connectedToken.decimals();
    
    res.status(200).json({
      success:,
      data:{
        orderId:[0].toString(),
        seller:[1],
        token:[2],
        amount:.formatUnits(order[3], decimals),
        price:.formatEther(order[4]),
        timestamp: Date(Number(order[5]) * 1000).toISOString(),
        active:[6],
        propertyIdHash:[7]
      }
    });
  } catch (error:) {
    console.error('获取订单信息失败:', error);
    res.status(500).json({
      success:,
      error:'获取订单信息失败',
      message:.message
    });
  }
};

/**
 * 获取活跃订单列表
 */
export const getActiveOrders = async (req:, res:) => {
  try {
    // 获取合约实例
    const tradingManager = await getContract('TradingManager');
    
    // 获取活跃订单ID列表
    const activeOrderIds = await tradingManager.getActiveOrders();
    
    // 获取订单详情
    const orders = [];
    for (const orderId of activeOrderIds) {
      const order = await tradingManager.getOrder(orderId);
      
      // 获取代币信息
      const tokenContract = await getContract('PropertyToken');
      const connectedToken = tokenContract.attach(order[2]);
      const decimals = await connectedToken.decimals();
      
      orders.push({
        orderId:[0].toString(),
        seller:[1],
        token:[2],
        amount:.formatUnits(order[3], decimals),
        price:.formatEther(order[4]),
        timestamp: Date(Number(order[5]) * 1000).toISOString(),
        active:[6],
        propertyIdHash:[7]
      });
    }
    
    res.status(200).json({
      success:,
      data:{
        count:.length,
        orders
      }
    });
  } catch (error:) {
    console.error('获取活跃订单列表失败:', error);
    res.status(500).json({
      success:,
      error:'获取活跃订单列表失败',
      message:.message
    });
  }
};

/**
 * 获取用户订单列表
 */
export const getUserOrders = async (req:, res:) => {
  try {
    const { address } = req.params;
    
    // 参数验证
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success:,
        error:'无效的地址',
        message:'请提供有效的以太坊地址'
      });
    }
    
    // 获取合约实例
    const tradingManager = await getContract('TradingManager');
    
    // 获取用户订单ID列表
    const userOrderIds = await tradingManager.getUserOrders(address);
    
    // 获取订单详情
    const orders = [];
    for (const orderId of userOrderIds) {
      const order = await tradingManager.getOrder(orderId);
      
      // 获取代币信息
      const tokenContract = await getContract('PropertyToken');
      const connectedToken = tokenContract.attach(order[2]);
      const decimals = await connectedToken.decimals();
      
      orders.push({
        orderId:[0].toString(),
        seller:[1],
        token:[2],
        amount:.formatUnits(order[3], decimals),
        price:.formatEther(order[4]),
        timestamp: Date(Number(order[5]) * 1000).toISOString(),
        active:[6],
        propertyIdHash:[7]
      });
    }
    
    res.status(200).json({
      success:,
      data:{
        address,
        count:.length,
        orders
      }
    });
  } catch (error:) {
    console.error('获取用户订单列表失败:', error);
    res.status(500).json({
      success:,
      error:'获取用户订单列表失败',
      message:.message
    });
  }
};
