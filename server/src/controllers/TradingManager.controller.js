/**
 * TradingManager合约控制器
 * 直接代理TradingManager.json ABI文件中的所有方法
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../../../shared/src');
const { blockchainService } = require('../services');
const { processContractResult, sendResponse } = require('../utils/ContractUtils');

// 读取ABI文件
const abiPath = path.resolve(process.cwd(), 'config/abi/TradingManager.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// 合约地址配置
const addressConfigPath = path.resolve(process.cwd(), 'config/contract-addresses.json');
let contractAddress;

// 从配置文件获取合约地址
if (fs.existsSync(addressConfigPath)) {
  const addressConfig = JSON.parse(fs.readFileSync(addressConfigPath, 'utf8'));
  const networkType = process.env.BLOCKCHAIN_NETWORK || 'localhost';
  contractAddress = addressConfig[networkType]?.TradingManager;
}

// 如果配置文件中没有，尝试从环境变量获取
if (!contractAddress) {
  contractAddress = process.env.CONTRACT_TRADINGMANAGER_ADDRESS;
}

// 合约实例
let contractInstance = null;

/**
 * 初始化合约实例
 */
async function initContract() {
  try {
    if (!contractInstance) {
      await blockchainService.initialize();
      contractInstance = blockchainService.getContractInstance(abi, contractAddress);
      Logger.info('TradingManager合约初始化成功', { address: contractAddress });
    }
    return contractInstance;
  } catch (error) {
    Logger.error(`TradingManager合约初始化失败: ${error.message}`, { error });
    throw error;
  }
}

/**
 * 获取合约地址
 */
async function getContractAddress(req, res) {
  try {
    sendResponse(res, { address: contractAddress });
  } catch (error) {
    Logger.error('获取TradingManager合约地址失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 创建卖单
 */
async function createOrder(req, res) {
  try {
    const { token, amount, price, propertyIdHash } = req.body;
    
    if (!token || !amount || !price) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.createOrder(
      token,
      amount,
      price,
      propertyIdHash || ethers.constants.HashZero
    );
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    // 解析事件找到订单ID
    const event = receipt.events?.find(e => e.event === 'OrderCreated');
    const orderId = event ? event.args.orderId.toString() : null;
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      orderId: orderId,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('创建卖单失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 取消订单
 */
async function cancelOrder(req, res) {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return sendResponse(res, { error: '缺少订单ID参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.cancelOrder(orderId);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('取消订单失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 执行订单
 */
async function executeOrder(req, res) {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return sendResponse(res, { error: '缺少订单ID参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.executeOrder(orderId);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    // 解析事件找到交易ID
    const event = receipt.events?.find(e => e.event === 'OrderExecuted');
    const tradeId = event ? event.args.tradeId.toString() : null;
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      tradeId: tradeId,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('执行订单失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取订单信息
 */
async function getOrder(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return sendResponse(res, { error: '缺少订单ID参数' }, 400);
    }
    
    const contract = await initContract();
    const order = await contract.getOrder(orderId);
    
    sendResponse(res, { 
      order: {
        id: processContractResult(order.id),
        seller: order.seller,
        token: order.token,
        amount: processContractResult(order.amount),
        price: processContractResult(order.price),
        timestamp: processContractResult(order.timestamp),
        active: order.active,
        propertyIdHash: order.propertyIdHash
      }
    });
  } catch (error) {
    Logger.error('获取订单信息失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取交易信息
 */
async function getTrade(req, res) {
  try {
    const { tradeId } = req.params;
    
    if (!tradeId) {
      return sendResponse(res, { error: '缺少交易ID参数' }, 400);
    }
    
    const contract = await initContract();
    const trade = await contract.getTrade(tradeId);
    
    sendResponse(res, { 
      trade: {
        id: processContractResult(trade.id),
        orderId: processContractResult(trade.orderId),
        buyer: trade.buyer,
        seller: trade.seller,
        token: trade.token,
        amount: processContractResult(trade.amount),
        price: processContractResult(trade.price),
        timestamp: processContractResult(trade.timestamp),
        propertyIdHash: trade.propertyIdHash
      }
    });
  } catch (error) {
    Logger.error('获取交易信息失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取用户订单
 */
async function getUserOrders(req, res) {
  try {
    const { user } = req.params;
    
    if (!user) {
      return sendResponse(res, { error: '缺少用户地址参数' }, 400);
    }
    
    const contract = await initContract();
    const orders = await contract.getUserOrders(user);
    
    sendResponse(res, { orders: processContractResult(orders) });
  } catch (error) {
    Logger.error('获取用户订单失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取用户交易
 */
async function getUserTrades(req, res) {
  try {
    const { user } = req.params;
    
    if (!user) {
      return sendResponse(res, { error: '缺少用户地址参数' }, 400);
    }
    
    const contract = await initContract();
    const trades = await contract.getUserTrades(user);
    
    sendResponse(res, { trades: processContractResult(trades) });
  } catch (error) {
    Logger.error('获取用户交易失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取代币交易
 */
async function getTokenTrades(req, res) {
  try {
    const { token } = req.params;
    
    if (!token) {
      return sendResponse(res, { error: '缺少代币地址参数' }, 400);
    }
    
    const contract = await initContract();
    const trades = await contract.getTokenTrades(token);
    
    sendResponse(res, { trades: processContractResult(trades) });
  } catch (error) {
    Logger.error('获取代币交易失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取用户的所有代币地址
 */
async function getUserTokens(req, res) {
  try {
    const { user } = req.params;
    
    if (!user) {
      return sendResponse(res, { error: '缺少用户地址参数' }, 400);
    }
    
    const contract = await initContract();
    const tokens = await contract.getUserTokens(user);
    
    sendResponse(res, { tokens });
  } catch (error) {
    Logger.error('获取用户代币失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取订单总数
 */
async function getOrderCount(req, res) {
  try {
    const contract = await initContract();
    const count = await contract.getOrderCount();
    
    sendResponse(res, { count: processContractResult(count) });
  } catch (error) {
    Logger.error('获取订单总数失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取交易总数
 */
async function getTradeCount(req, res) {
  try {
    const contract = await initContract();
    const count = await contract.getTradeCount();
    
    sendResponse(res, { count: processContractResult(count) });
  } catch (error) {
    Logger.error('获取交易总数失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取代币当前价格
 */
async function getCurrentPrice(req, res) {
  try {
    const { token } = req.params;
    
    if (!token) {
      return sendResponse(res, { error: '缺少代币地址参数' }, 400);
    }
    
    const contract = await initContract();
    const price = await contract.getCurrentPrice(token);
    
    sendResponse(res, { price: processContractResult(price) });
  } catch (error) {
    Logger.error('获取代币价格失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 设置代币初始价格
 */
async function setInitialPrice(req, res) {
  try {
    const { token, price } = req.body;
    
    if (!token || !price) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.setInitialPrice(token, price);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('设置代币初始价格失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 设置代币当前价格
 */
async function setCurrentPrice(req, res) {
  try {
    const { token, price } = req.body;
    
    if (!token || !price) {
      return sendResponse(res, { error: '缺少必要参数' }, 400);
    }
    
    const contract = await initContract();
    
    // 准备交易
    const tx = await contract.setCurrentPrice(token, price);
    
    // 等待交易被挖矿
    const receipt = await tx.wait();
    
    sendResponse(res, { 
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    Logger.error('设置代币当前价格失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

/**
 * 获取代币交易量
 */
async function getTokenTradingVolume(req, res) {
  try {
    const { token } = req.params;
    
    if (!token) {
      return sendResponse(res, { error: '缺少代币地址参数' }, 400);
    }
    
    const contract = await initContract();
    const volume = await contract.getTokenTradingVolume(token);
    
    sendResponse(res, { volume: processContractResult(volume) });
  } catch (error) {
    Logger.error('获取代币交易量失败', { error });
    sendResponse(res, { error: error.message }, 500);
  }
}

module.exports = {
  getContractAddress,
  createOrder,
  cancelOrder,
  executeOrder,
  getOrder,
  getTrade,
  getUserOrders,
  getUserTrades,
  getTokenTrades,
  getUserTokens,
  getOrderCount,
  getTradeCount,
  getCurrentPrice,
  setInitialPrice,
  setCurrentPrice,
  getTokenTradingVolume
}; 