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
 * 创建交易订单
 */
export const createOrder = async (req, res) => {
  try {
    const { 
      propertyId, 
      amount, 
      price, 
      traderRole = 'trader' 
    } = req.body;
    
    // 参数验证
    if (!propertyId || !amount || !price) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供所有必要的订单信息'
      });
    }
    
    // 获取合约实例
    const propertyManager = await getContract('PropertyManager');
    const tradingManager = await getContractWithSigner('TradingManager', traderRole);
    
    // 获取代币地址
    const tokenAddress = await propertyManager.getPropertyToken(propertyId);
    
    if (tokenAddress === ethers.ZeroAddress) {
      return res.status(404).json({
        success: false,
        error: '房产不存在',
        message: `未找到ID为 ${propertyId} 的房产`
      });
    }
    
    // 创建订单
    const decimals = 18; // 假设代币精度为18，实际应从代币合约中获取
    const amountWei = ethers.parseUnits(amount.toString(), decimals);
    const priceWei = ethers.parseUnits(price.toString(), 18); // 价格以ETH为单位，精度为18
    
    const tx = await tradingManager.createOrder(propertyId, amountWei, priceWei);
    const receipt = await tx.wait();
    
    // 从事件中获取订单ID
    const orderCreatedEvent = receipt.logs
      .filter((log) => {
        try {
          return tradingManager.interface.parseLog(log)?.name === 'OrderCreated';
        } catch (e) {
          return false;
        }
      })
      .map((log) => tradingManager.interface.parseLog(log))[0];
    
    const orderId = orderCreatedEvent?.args?.orderId;
    
    res.status(200).json({
      success: true,
      data: {
        orderId,
        propertyId,
        tokenAddress,
        amount,
        price,
        transaction: tx.hash,
        message: `已成功创建订单，ID: ${orderId}`
      }
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      error: '创建订单失败',
      message: error.message
    });
  }
};

/**
 * 执行交易订单
 */
export const executeOrder = async (req, res) => {
  try {
    const { orderId, traderRole = 'trader' } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供订单ID'
      });
    }
    
    // 获取合约实例
    const tradingManager = await getContractWithSigner('TradingManager', traderRole);
    
    // 获取订单信息
    const order = await tradingManager.getOrder(orderId);
    
    if (order.seller === ethers.ZeroAddress) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
        message: `未找到ID为 ${orderId} 的订单`
      });
    }
    
    if (order.executed) {
      return res.status(400).json({
        success: false,
        error: '订单已执行',
        message: `订单 ${orderId} 已被执行`
      });
    }
    
    if (order.cancelled) {
      return res.status(400).json({
        success: false,
        error: '订单已取消',
        message: `订单 ${orderId} 已被取消`
      });
    }
    
    // 执行订单
    const value = order.price; // 价格
    const tx = await tradingManager.executeOrder(orderId, { value });
    const receipt = await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        orderId,
        seller: order.seller,
        buyer: await tradingManager.signer.getAddress(),
        propertyId: order.propertyId,
        amount: ethers.formatUnits(order.amount, 18),
        price: ethers.formatUnits(order.price, 18),
        transaction: tx.hash,
        message: `已成功执行订单 ${orderId}`
      }
    });
  } catch (error) {
    console.error('执行订单失败:', error);
    res.status(500).json({
      success: false,
      error: '执行订单失败',
      message: error.message
    });
  }
};

/**
 * 取消交易订单
 */
export const cancelOrder = async (req, res) => {
  try {
    const { orderId, traderRole = 'trader' } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: '参数不完整',
        message: '请提供订单ID'
      });
    }
    
    // 获取合约实例
    const tradingManager = await getContractWithSigner('TradingManager', traderRole);
    
    // 获取订单信息
    const order = await tradingManager.getOrder(orderId);
    
    if (order.seller === ethers.ZeroAddress) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
        message: `未找到ID为 ${orderId} 的订单`
      });
    }
    
    if (order.executed) {
      return res.status(400).json({
        success: false,
        error: '订单已执行',
        message: `订单 ${orderId} 已被执行`
      });
    }
    
    if (order.cancelled) {
      return res.status(400).json({
        success: false,
        error: '订单已取消',
        message: `订单 ${orderId} 已被取消`
      });
    }
    
    // 检查是否是卖家
    const signerAddress = await tradingManager.signer.getAddress();
    if (signerAddress.toLowerCase() !== order.seller.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: '权限不足',
        message: '只有卖家可以取消订单'
      });
    }
    
    // 取消订单
    const tx = await tradingManager.cancelOrder(orderId);
    const receipt = await tx.wait();
    
    res.status(200).json({
      success: true,
      data: {
        orderId,
        propertyId: order.propertyId,
        transaction: tx.hash,
        message: `已成功取消订单 ${orderId}`
      }
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    res.status(500).json({
      success: false,
      error: '取消订单失败',
      message: error.message
    });
  }
};

/**
 * 获取所有订单
 */
export const getAllOrders = async (req, res) => {
  try {
    // 获取合约实例
    const tradingManager = await getContract('TradingManager');
    
    // 获取订单数量
    const orderCount = await tradingManager.getOrderCount();
    
    // 获取所有订单
    const orders = [];
    for (let i = 1; i <= orderCount; i++) {
      const order = await tradingManager.getOrder(i);
      
      // 跳过无效订单
      if (order.seller === ethers.ZeroAddress) {
        continue;
      }
      
      orders.push({
        orderId: i,
        seller: order.seller,
        propertyId: order.propertyId,
        amount: ethers.formatUnits(order.amount, 18),
        price: ethers.formatUnits(order.price, 18),
        executed: order.executed,
        cancelled: order.cancelled,
        timestamp: Number(order.timestamp)
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        totalCount: orders.length,
        orders
      }
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单列表失败',
      message: error.message
    });
  }
};

/**
 * 获取特定订单
 */
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(parseInt(orderId))) {
      return res.status(400).json({
        success: false,
        error: '参数无效',
        message: '请提供有效的订单ID'
      });
    }
    
    // 获取合约实例
    const tradingManager = await getContract('TradingManager');
    
    // 获取订单信息
    const order = await tradingManager.getOrder(orderId);
    
    if (order.seller === ethers.ZeroAddress) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
        message: `未找到ID为 ${orderId} 的订单`
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        orderId: parseInt(orderId),
        seller: order.seller,
        propertyId: order.propertyId,
        amount: ethers.formatUnits(order.amount, 18),
        price: ethers.formatUnits(order.price, 18),
        executed: order.executed,
        cancelled: order.cancelled,
        timestamp: Number(order.timestamp)
      }
    });
  } catch (error) {
    console.error('获取订单信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取订单信息失败',
      message: error.message
    });
  }
}; 