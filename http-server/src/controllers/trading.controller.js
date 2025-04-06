/**
 * 交易管理控制器
 */
const { Logger, Validation } = require('../../../shared/src');
const blockchainService = require('../services/blockchainService');
const { success, error, paginated } = require('../utils/responseFormatter');

/**
 * 获取所有交易订单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getAllOrders(req, res, next) {
  try {
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const propertyFilter = req.query.property;
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取TradingManager合约实例
    const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
    const tradingManager = await blockchainService.createContract('TradingManager', { address: tradingManagerAddress });
    
    // 获取订单总数
    const totalCount = await blockchainService.callContractMethod(tradingManager, 'getOrdersCount');
    const totalItems = parseInt(totalCount.toString());
    
    // 计算分页信息
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    
    // 获取订单列表
    let orders = [];
    for (let i = startIndex; i < endIndex; i++) {
      const orderId = await blockchainService.callContractMethod(tradingManager, 'getOrderIdAtIndex', [i]);
      const orderData = await blockchainService.callContractMethod(tradingManager, 'getOrder', [orderId]);
      
      // 如果有房产过滤，检查通证是否匹配
      if (propertyFilter) {
        // 获取PropertyManager合约实例
        const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
        const propertyManager = await blockchainService.createContract('PropertyManager', { address: propertyManagerAddress });
        
        // 检查该通证是否属于指定房产
        const properties = await blockchainService.callContractMethod(propertyManager, 'getPropertiesByToken', [orderData.token]);
        if (!properties.some(prop => prop.toLowerCase() === propertyFilter.toLowerCase())) {
          continue; // 跳过不匹配的订单
        }
      }
      
      // 获取通证信息
      let tokenSymbol = '';
      let tokenName = '';
      try {
        const tokenContract = await blockchainService.createContract('PropertyToken', { address: orderData.token });
        tokenSymbol = await blockchainService.callContractMethod(tokenContract, 'symbol');
        tokenName = await blockchainService.callContractMethod(tokenContract, 'name');
      } catch (err) {
        Logger.warn(`获取通证信息失败: ${err.message}`);
      }
      
      // 添加订单信息
      orders.push({
        orderId: orderId.toString(),
        seller: orderData.seller,
        token: orderData.token,
        amount: orderData.amount.toString(),
        price: orderData.price.toString(),
        active: orderData.active,
        tokenSymbol,
        tokenName
      });
    }
    
    // 返回分页结果
    return paginated(res, orders, {
      page,
      pageSize: limit,
      totalItems,
      totalPages
    });
  } catch (err) {
    Logger.error(`获取交易订单列表失败: ${err.message}`, { error: err });
    return error(res, '获取交易订单列表失败', 500);
  }
}

/**
 * 获取订单详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getOrderById(req, res, next) {
  try {
    const orderId = req.params.orderId;
    if (!orderId || !Validation.isValidId(orderId)) {
      return error(res, '订单ID无效', 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取TradingManager合约实例
    const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
    const tradingManager = await blockchainService.createContract('TradingManager', { address: tradingManagerAddress });
    
    // 获取订单详情
    const orderData = await blockchainService.callContractMethod(tradingManager, 'getOrder', [orderId]);
    
    // 验证订单存在
    if (!orderData || orderData.seller === '0x0000000000000000000000000000000000000000') {
      return error(res, '订单不存在', 404);
    }
    
    // 获取通证信息
    let tokenSymbol = '';
    let tokenName = '';
    let propertyData = null;
    try {
      const tokenContract = await blockchainService.createContract('PropertyToken', { address: orderData.token });
      tokenSymbol = await blockchainService.callContractMethod(tokenContract, 'symbol');
      tokenName = await blockchainService.callContractMethod(tokenContract, 'name');
      
      // 获取PropertyManager合约实例
      const propertyManagerAddress = await blockchainService.callContractMethod(facade, 'propertyManager');
      const propertyManager = await blockchainService.createContract('PropertyManager', { address: propertyManagerAddress });
      
      // 获取房产信息
      const properties = await blockchainService.callContractMethod(propertyManager, 'getPropertiesByToken', [orderData.token]);
      if (properties && properties.length > 0) {
        propertyData = await blockchainService.callContractMethod(propertyManager, 'getProperty', [properties[0]]);
      }
    } catch (err) {
      Logger.warn(`获取通证或房产信息失败: ${err.message}`);
    }
    
    // 构建订单详情响应
    const orderDetails = {
      orderId: orderId.toString(),
      seller: orderData.seller,
      token: orderData.token,
      amount: orderData.amount.toString(),
      price: orderData.price.toString(),
      active: orderData.active,
      tokenSymbol,
      tokenName
    };
    
    // 添加房产信息（如果有）
    if (propertyData) {
      orderDetails.propertyIdHash = propertyData.propertyIdHash || properties[0];
      orderDetails.propertyId = propertyData.propertyId;
    }
    
    return success(res, orderDetails);
  } catch (err) {
    Logger.error(`获取订单详情失败: ${err.message}`, { error: err });
    return error(res, '获取订单详情失败', 500);
  }
}

/**
 * 创建出售订单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function createOrder(req, res, next) {
  try {
    // 验证请求参数
    const { token, amount, price, privateKey } = req.body;
    
    if (!token || !Validation.isValidAddress(token)) {
      return error(res, '通证地址无效', 400);
    }
    
    if (!amount || !Validation.isValidAmount(amount)) {
      return error(res, '出售数量无效', 400);
    }
    
    if (!price || !Validation.isValidAmount(price)) {
      return error(res, '价格无效', 400);
    }
    
    if (!privateKey) {
      return error(res, '私钥不能为空', 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取TradingManager合约实例
    const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
    
    // 创建钱包
    const provider = await contractService.blockchainService.getProvider();
    const wallet = await contractService.blockchainService.createWalletFromPrivateKey(privateKey, provider);
    const sellerAddress = await wallet.getAddress();
    
    // 检查通证授权
    const tokenContract = await blockchainService.createContract('PropertyToken', { 
      address: token,
      wallet
    });
    
    // 检查余额
    const balance = await blockchainService.callContractMethod(tokenContract, 'balanceOf', [sellerAddress]);
    if (balance.lt(amount)) {
      return error(res, '通证余额不足', 400);
    }
    
    // 检查授权
    const allowance = await blockchainService.callContractMethod(tokenContract, 'allowance', [sellerAddress, tradingManagerAddress]);
    if (allowance.lt(amount)) {
      // 授权通证给交易管理器
      const approveTx = await blockchainService.sendContractTransaction(
        tokenContract,
        'approve',
        [tradingManagerAddress, amount],
        { wallet }
      );
      
      Logger.info(`通证授权成功: ${approveTx.transactionHash}`);
    }
    
    // 创建交易管理器合约实例（带钱包）
    const tradingManager = await blockchainService.createContract('TradingManager', { 
      address: tradingManagerAddress,
      wallet
    });
    
    // 创建出售订单
    const tx = await blockchainService.sendContractTransaction(
      tradingManager,
      'createOrder',
      [token, amount, price],
      { wallet }
    );
    
    // 从事件中获取订单ID
    const receipt = await tx.wait();
    let orderId = null;
    for (const event of receipt.events) {
      if (event.event === 'OrderCreated') {
        orderId = event.args.orderId.toString();
        break;
      }
    }
    
    return success(res, {
      orderId,
      txHash: tx.transactionHash
    }, 201);
  } catch (err) {
    Logger.error(`创建出售订单失败: ${err.message}`, { error: err });
    return error(res, '创建出售订单失败', 500);
  }
}

/**
 * 执行交易订单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function executeOrder(req, res, next) {
  try {
    const orderId = req.params.orderId;
    if (!orderId || !Validation.isValidId(orderId)) {
      return error(res, '订单ID无效', 400);
    }
    
    // 验证请求参数
    const { privateKey } = req.body;
    if (!privateKey) {
      return error(res, '私钥不能为空', 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取TradingManager合约实例
    const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
    const tradingManager = await blockchainService.createContract('TradingManager', { address: tradingManagerAddress });
    
    // 获取订单详情
    const orderData = await blockchainService.callContractMethod(tradingManager, 'getOrder', [orderId]);
    
    // 验证订单存在且活跃
    if (!orderData || !orderData.active) {
      return error(res, '订单不存在或已被取消', 404);
    }
    
    // 创建钱包
    const provider = await contractService.blockchainService.getProvider();
    const wallet = await contractService.blockchainService.createWalletFromPrivateKey(privateKey, provider);
    const buyerAddress = await wallet.getAddress();
    
    // 检查买家ETH余额
    const buyerBalance = await provider.getBalance(buyerAddress);
    if (buyerBalance.lt(orderData.price)) {
      return error(res, 'ETH余额不足以完成交易', 400);
    }
    
    // 使用钱包创建交易管理器合约实例
    const tradingManagerWithWallet = await blockchainService.createContract('TradingManager', { 
      address: tradingManagerAddress,
      wallet
    });
    
    // 执行订单
    const tx = await blockchainService.sendContractTransaction(
      tradingManagerWithWallet,
      'executeOrder',
      [orderId],
      { wallet, value: orderData.price }
    );
    
    return success(res, {
      orderId,
      txHash: tx.transactionHash,
      buyer: buyerAddress,
      amount: orderData.amount.toString(),
      price: orderData.price.toString()
    });
  } catch (err) {
    Logger.error(`执行交易订单失败: ${err.message}`, { error: err });
    return error(res, '执行交易订单失败', 500);
  }
}

/**
 * 取消交易订单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function cancelOrder(req, res, next) {
  try {
    const orderId = req.params.orderId;
    if (!orderId || !Validation.isValidId(orderId)) {
      return error(res, '订单ID无效', 400);
    }
    
    // 验证请求参数
    const { privateKey } = req.body;
    if (!privateKey) {
      return error(res, '私钥不能为空', 400);
    }
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取TradingManager合约实例
    const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
    const tradingManager = await blockchainService.createContract('TradingManager', { address: tradingManagerAddress });
    
    // 获取订单详情
    const orderData = await blockchainService.callContractMethod(tradingManager, 'getOrder', [orderId]);
    
    // 验证订单存在且活跃
    if (!orderData || !orderData.active) {
      return error(res, '订单不存在或已被取消', 404);
    }
    
    // 创建钱包
    const provider = await contractService.blockchainService.getProvider();
    const wallet = await contractService.blockchainService.createWalletFromPrivateKey(privateKey, provider);
    const userAddress = await wallet.getAddress();
    
    // 验证调用者是订单创建者
    if (userAddress.toLowerCase() !== orderData.seller.toLowerCase()) {
      return error(res, '只有订单创建者才能取消订单', 403);
    }
    
    // 使用钱包创建交易管理器合约实例
    const tradingManagerWithWallet = await blockchainService.createContract('TradingManager', { 
      address: tradingManagerAddress,
      wallet
    });
    
    // 取消订单
    const tx = await blockchainService.sendContractTransaction(
      tradingManagerWithWallet,
      'cancelOrder',
      [orderId],
      { wallet }
    );
    
    return success(res, {
      orderId,
      txHash: tx.transactionHash
    });
  } catch (err) {
    Logger.error(`取消交易订单失败: ${err.message}`, { error: err });
    return error(res, '取消交易订单失败', 500);
  }
}

/**
 * 获取用户的交易订单
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function getUserOrders(req, res, next) {
  try {
    const userAddress = req.params.address;
    if (!userAddress || !Validation.isValidAddress(userAddress)) {
      return error(res, '用户地址无效', 400);
    }
    
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const activeOnly = req.query.active === 'true';
    
    // 获取RealEstateFacade合约实例
    const facade = await blockchainService.createContract('RealEstateFacade');
    
    // 获取TradingManager合约实例
    const tradingManagerAddress = await blockchainService.callContractMethod(facade, 'tradingManager');
    const tradingManager = await blockchainService.createContract('TradingManager', { address: tradingManagerAddress });
    
    // 获取用户订单总数
    const totalCount = await blockchainService.callContractMethod(tradingManager, 'getUserOrdersCount', [userAddress]);
    const totalItems = parseInt(totalCount.toString());
    
    // 计算分页信息
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    
    // 获取用户订单列表
    let orders = [];
    for (let i = startIndex; i < endIndex; i++) {
      const orderId = await blockchainService.callContractMethod(tradingManager, 'getUserOrderIdAtIndex', [userAddress, i]);
      const orderData = await blockchainService.callContractMethod(tradingManager, 'getOrder', [orderId]);
      
      // 如果只查询活跃订单且当前订单不活跃，则跳过
      if (activeOnly && !orderData.active) {
        continue;
      }
      
      // 获取通证信息
      let tokenSymbol = '';
      let tokenName = '';
      try {
        const tokenContract = await blockchainService.createContract('PropertyToken', { address: orderData.token });
        tokenSymbol = await blockchainService.callContractMethod(tokenContract, 'symbol');
        tokenName = await blockchainService.callContractMethod(tokenContract, 'name');
      } catch (err) {
        Logger.warn(`获取通证信息失败: ${err.message}`);
      }
      
      // 添加订单信息
      orders.push({
        orderId: orderId.toString(),
        seller: orderData.seller,
        token: orderData.token,
        amount: orderData.amount.toString(),
        price: orderData.price.toString(),
        active: orderData.active,
        tokenSymbol,
        tokenName
      });
    }
    
    // 返回分页结果
    return paginated(res, orders, {
      page,
      pageSize: limit,
      totalItems,
      totalPages
    });
  } catch (err) {
    Logger.error(`获取用户交易订单列表失败: ${err.message}`, { error: err });
    return error(res, '获取用户交易订单列表失败', 500);
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  executeOrder,
  cancelOrder,
  getUserOrders
}; 