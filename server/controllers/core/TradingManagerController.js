const { AddressUtils, Logger, EnvUtils } = require('../../../common');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');
const { ethers } = require('ethers');

/**
 * 交易管理控制器
 */
class TradingManagerController extends BaseController {
    /**
     * 创建卖单
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async createOrder(req, res) {
        const { token, amount, price, propertyId } = req.body;
        
        console.log("\n[createOrder] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[createOrder] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { token, amount, price, propertyId, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(token)) {
            return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[createOrder] 获取合约实例...");
                
                // 获取operator角色合约实例
                const contract = this.getContract('TradingManager', 'operator');
                
                // 调用合约方法
                console.log("[createOrder] 准备调用合约方法...");
                console.log("[createOrder] 参数:", {
                    token,
                    amount,
                    price,
                    propertyId
                });
                
                const tx = await contract.createOrder(token, amount, price, propertyId);
                console.log("[createOrder] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[createOrder] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[createOrder] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    token,
                    amount,
                    price,
                    propertyId
                };
            },
            '创建卖单成功',
            { token, amount, price, propertyId },
            '创建卖单失败'
        );
    }

    /**
     * 创建卖单（无需转账）
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async createOrderWithoutTransfer(req, res) {
        const { token, amount, price, propertyId } = req.body;
        
        console.log("\n[createOrderWithoutTransfer] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[createOrderWithoutTransfer] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { token, amount, price, propertyId, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(token)) {
            return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[createOrderWithoutTransfer] 获取合约实例...");
                
                // 获取operator角色合约实例
                const contract = this.getContract('TradingManager', 'operator');
                
                // 调用合约方法
                console.log("[createOrderWithoutTransfer] 准备调用合约方法...");
                console.log("[createOrderWithoutTransfer] 参数:", {
                    token,
                    amount,
                    price,
                    propertyId
                });
                
                const tx = await contract.createOrderWithoutTransfer(token, amount, price, propertyId);
                console.log("[createOrderWithoutTransfer] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[createOrderWithoutTransfer] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[createOrderWithoutTransfer] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    token,
                    amount,
                    price,
                    propertyId
                };
            },
            '创建卖单（无需转账）成功',
            { token, amount, price, propertyId },
            '创建卖单（无需转账）失败'
        );
    }

    /**
     * 取消卖单
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async cancelOrder(req, res) {
        const { orderId } = req.body;
        
        console.log("\n[cancelOrder] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[cancelOrder] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { orderId, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[cancelOrder] 获取合约实例...");
                
                // 获取operator角色合约实例
                const contract = this.getContract('TradingManager', 'operator');
                
                // 调用合约方法
                console.log("[cancelOrder] 准备调用合约方法...");
                console.log("[cancelOrder] 参数:", {
                    orderId
                });
                
                const tx = await contract.cancelOrder(orderId);
                console.log("[cancelOrder] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[cancelOrder] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[cancelOrder] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    orderId
                };
            },
            '取消卖单成功',
            { orderId },
            '取消卖单失败'
        );
    }

    /**
     * 执行交易
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async executeOrder(req, res) {
        const { orderId, buyer, amount } = req.body;
        
        console.log("\n[executeOrder] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[executeOrder] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { orderId, buyer, amount, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(buyer)) {
            return ResponseUtils.sendError(res, '无效的买家地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[executeOrder] 获取合约实例...");
                
                // 获取operator角色合约实例
                const contract = this.getContract('TradingManager', 'operator');
                
                // 调用合约方法
                console.log("[executeOrder] 准备调用合约方法...");
                console.log("[executeOrder] 参数:", {
                    orderId,
                    buyer,
                    amount
                });
                
                const tx = await contract.executeOrder(orderId, buyer, amount);
                console.log("[executeOrder] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[executeOrder] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[executeOrder] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    orderId,
                    buyer,
                    amount
                };
            },
            '执行交易成功',
            { orderId, buyer, amount },
            '执行交易失败'
        );
    }

    /**
     * 设置交易费率
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setFeeRate(req, res) {
        const { feeRate } = req.body;
        
        console.log("\n[setFeeRate] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setFeeRate] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { feeRate, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setFeeRate] 获取合约实例...");
                
                // 获取manager角色合约实例
                const contract = this.getContract('TradingManager', 'manager');
                
                // 调用合约方法
                console.log("[setFeeRate] 准备调用合约方法...");
                console.log("[setFeeRate] 参数:", {
                    feeRate
                });
                
                const tx = await contract.setFeeRate(feeRate);
                console.log("[setFeeRate] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setFeeRate] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setFeeRate] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    feeRate
                };
            },
            '设置交易费率成功',
            { feeRate },
            '设置交易费率失败'
        );
    }

    /**
     * 设置手续费接收地址
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setFeeReceiver(req, res) {
        const { feeReceiver } = req.body;
        
        console.log("\n[setFeeReceiver] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setFeeReceiver] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { feeReceiver, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(feeReceiver)) {
            return ResponseUtils.sendError(res, '无效的手续费接收地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setFeeReceiver] 获取合约实例...");
                
                // 获取manager角色合约实例
                const contract = this.getContract('TradingManager', 'manager');
                
                // 调用合约方法
                console.log("[setFeeReceiver] 准备调用合约方法...");
                console.log("[setFeeReceiver] 参数:", {
                    feeReceiver
                });
                
                const tx = await contract.setFeeReceiver(feeReceiver);
                console.log("[setFeeReceiver] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setFeeReceiver] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setFeeReceiver] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    feeReceiver
                };
            },
            '设置手续费接收地址成功',
            { feeReceiver },
            '设置手续费接收地址失败'
        );
    }

    /**
     * 设置最小交易金额
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setMinTradeAmount(req, res) {
        const { minTradeAmount } = req.body;
        
        console.log("\n[setMinTradeAmount] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setMinTradeAmount] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { minTradeAmount, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setMinTradeAmount] 获取合约实例...");
                
                // 获取manager角色合约实例
                const contract = this.getContract('TradingManager', 'manager');
                
                // 调用合约方法
                console.log("[setMinTradeAmount] 准备调用合约方法...");
                console.log("[setMinTradeAmount] 参数:", {
                    minTradeAmount
                });
                
                const tx = await contract.setMinTradeAmount(minTradeAmount);
                console.log("[setMinTradeAmount] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setMinTradeAmount] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setMinTradeAmount] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    minTradeAmount
                };
            },
            '设置最小交易金额成功',
            { minTradeAmount },
            '设置最小交易金额失败'
        );
    }

    /**
     * 设置最大交易金额
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setMaxTradeAmount(req, res) {
        const { maxTradeAmount } = req.body;
        
        console.log("\n[setMaxTradeAmount] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setMaxTradeAmount] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { maxTradeAmount, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setMaxTradeAmount] 获取合约实例...");
                
                // 获取manager角色合约实例
                const contract = this.getContract('TradingManager', 'manager');
                
                // 调用合约方法
                console.log("[setMaxTradeAmount] 准备调用合约方法...");
                console.log("[setMaxTradeAmount] 参数:", {
                    maxTradeAmount
                });
                
                const tx = await contract.setMaxTradeAmount(maxTradeAmount);
                console.log("[setMaxTradeAmount] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setMaxTradeAmount] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setMaxTradeAmount] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    maxTradeAmount
                };
            },
            '设置最大交易金额成功',
            { maxTradeAmount },
            '设置最大交易金额失败'
        );
    }

    /**
     * 设置冷却期
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setCooldownPeriod(req, res) {
        const { cooldownPeriod } = req.body;
        
        console.log("\n[setCooldownPeriod] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setCooldownPeriod] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { cooldownPeriod, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setCooldownPeriod] 获取合约实例...");
                
                // 获取manager角色合约实例
                const contract = this.getContract('TradingManager', 'manager');
                
                // 调用合约方法
                console.log("[setCooldownPeriod] 准备调用合约方法...");
                console.log("[setCooldownPeriod] 参数:", {
                    cooldownPeriod
                });
                
                const tx = await contract.setCooldownPeriod(cooldownPeriod);
                console.log("[setCooldownPeriod] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setCooldownPeriod] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setCooldownPeriod] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    cooldownPeriod
                };
            },
            '设置冷却期成功',
            { cooldownPeriod },
            '设置冷却期失败'
        );
    }

    /**
     * 暂停合约
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async pause(req, res) {
        console.log("\n[pause] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[pause] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[pause] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[pause] 准备调用合约方法...");
                
                const tx = await contract.pause();
                console.log("[pause] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[pause] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[pause] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash
                };
            },
            '暂停合约成功',
            null,
            '暂停合约失败'
        );
    }

    /**
     * 恢复合约
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async unpause(req, res) {
        console.log("\n[unpause] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[unpause] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[unpause] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[unpause] 准备调用合约方法...");
                
                const tx = await contract.unpause();
                console.log("[unpause] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[unpause] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[unpause] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash
                };
            },
            '恢复合约成功',
            null,
            '恢复合约失败'
        );
    }

    /**
     * 设置地址黑名单状态
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setBlacklistStatus(req, res) {
        const { account, status } = req.body;
        
        console.log("\n[setBlacklistStatus] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setBlacklistStatus] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { account, status, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(account)) {
            return ResponseUtils.sendError(res, '无效的账户地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setBlacklistStatus] 获取合约实例...");
                
                // 获取manager角色合约实例
                const contract = this.getContract('TradingManager', 'manager');
                
                // 调用合约方法
                console.log("[setBlacklistStatus] 准备调用合约方法...");
                console.log("[setBlacklistStatus] 参数:", {
                    account,
                    status
                });
                
                const tx = await contract.setBlacklistStatus(account, status);
                console.log("[setBlacklistStatus] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setBlacklistStatus] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setBlacklistStatus] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    account,
                    status
                };
            },
            '设置地址黑名单状态成功',
            { account, status },
            '设置地址黑名单状态失败'
        );
    }

    /**
     * 获取订单信息
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getOrder(req, res) {
        const { orderId } = req.query;
        
        console.log("\n[getOrder] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getOrder] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { orderId, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getOrder] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getOrder] 准备调用合约方法...");
                console.log("[getOrder] 参数:", {
                    orderId
                });
                
                const [id, seller, token, amount, price, timestamp, active, propertyId] = await contract.getOrder(orderId);
                console.log("[getOrder] 获取到的订单信息:", {
                    id,
                    seller,
                    token,
                    amount,
                    price,
                    timestamp,
                    active,
                    propertyId
                });
                
                return {
                    id,
                    seller,
                    token,
                    amount,
                    price,
                    timestamp,
                    active,
                    propertyId
                };
            },
            '获取订单信息成功',
            null,
            '获取订单信息失败'
        );
    }

    /**
     * 获取交易信息
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getTrade(req, res) {
        const { tradeId } = req.query;
        
        console.log("\n[getTrade] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getTrade] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { tradeId, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getTrade] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getTrade] 准备调用合约方法...");
                console.log("[getTrade] 参数:", {
                    tradeId
                });
                
                const [id, orderId, buyer, seller, token, amount, price, timestamp, propertyId] = await contract.getTrade(tradeId);
                console.log("[getTrade] 获取到的交易信息:", {
                    id,
                    orderId,
                    buyer,
                    seller,
                    token,
                    amount,
                    price,
                    timestamp,
                    propertyId
                });
                
                return {
                    id,
                    orderId,
                    buyer,
                    seller,
                    token,
                    amount,
                    price,
                    timestamp,
                    propertyId
                };
            },
            '获取交易信息成功',
            null,
            '获取交易信息失败'
        );
    }

    /**
     * 获取用户订单
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getUserOrders(req, res) {
        const { user } = req.query;
        
        console.log("\n[getUserOrders] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getUserOrders] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { user, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(user)) {
            return ResponseUtils.sendError(res, '无效的用户地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getUserOrders] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getUserOrders] 准备调用合约方法...");
                console.log("[getUserOrders] 参数:", {
                    user
                });
                
                const orderIds = await contract.getUserOrders(user);
                console.log("[getUserOrders] 获取到的订单ID列表:", orderIds);
                
                return {
                    user,
                    orderIds
                };
            },
            '获取用户订单成功',
            null,
            '获取用户订单失败'
        );
    }

    /**
     * 获取用户交易
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getUserTrades(req, res) {
        const { user } = req.query;
        
        console.log("\n[getUserTrades] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getUserTrades] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { user, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(user)) {
            return ResponseUtils.sendError(res, '无效的用户地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getUserTrades] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getUserTrades] 准备调用合约方法...");
                console.log("[getUserTrades] 参数:", {
                    user
                });
                
                const tradeIds = await contract.getUserTrades(user);
                console.log("[getUserTrades] 获取到的交易ID列表:", tradeIds);
                
                return {
                    user,
                    tradeIds
                };
            },
            '获取用户交易成功',
            null,
            '获取用户交易失败'
        );
    }

    /**
     * 获取代币交易
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getTokenTrades(req, res) {
        const { token } = req.query;
        
        console.log("\n[getTokenTrades] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getTokenTrades] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { token, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(token)) {
            return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getTokenTrades] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getTokenTrades] 准备调用合约方法...");
                console.log("[getTokenTrades] 参数:", {
                    token
                });
                
                const tradeIds = await contract.getTokenTrades(token);
                console.log("[getTokenTrades] 获取到的交易ID列表:", tradeIds);
                
                return {
                    token,
                    tradeIds
                };
            },
            '获取代币交易成功',
            null,
            '获取代币交易失败'
        );
    }

    /**
     * 设置代币价格
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setTokenPrice(req, res) {
        const { token, price } = req.body;
        
        console.log("\n[setTokenPrice] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setTokenPrice] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { token, price, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(token)) {
            return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setTokenPrice] 获取合约实例...");
                
                // 获取manager角色合约实例
                const contract = this.getContract('TradingManager', 'manager');
                
                // 调用合约方法
                console.log("[setTokenPrice] 准备调用合约方法...");
                console.log("[setTokenPrice] 参数:", {
                    token,
                    price
                });
                
                const tx = await contract.setTokenPrice(token, price);
                console.log("[setTokenPrice] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setTokenPrice] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setTokenPrice] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    token,
                    price
                };
            },
            '设置代币价格成功',
            { token, price },
            '设置代币价格失败'
        );
    }

    /**
     * 获取代币价格
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getTokenPrice(req, res) {
        const { token } = req.query;
        
        console.log("\n[getTokenPrice] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getTokenPrice] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { token, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(token)) {
            return ResponseUtils.sendError(res, '无效的代币地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getTokenPrice] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getTokenPrice] 准备调用合约方法...");
                console.log("[getTokenPrice] 参数:", {
                    token
                });
                
                const price = await contract.getTokenPrice(token);
                console.log("[getTokenPrice] 获取到的代币价格:", price);
                
                return {
                    token,
                    price
                };
            },
            '获取代币价格成功',
            null,
            '获取代币价格失败'
        );
    }

    /**
     * 设置紧急提款时间锁
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setEmergencyTimelock(req, res) {
        const { timelock } = req.body;
        
        console.log("\n[setEmergencyTimelock] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setEmergencyTimelock] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { timelock, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setEmergencyTimelock] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[setEmergencyTimelock] 准备调用合约方法...");
                console.log("[setEmergencyTimelock] 参数:", {
                    timelock
                });
                
                const tx = await contract.setEmergencyTimelock(timelock);
                console.log("[setEmergencyTimelock] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setEmergencyTimelock] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setEmergencyTimelock] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    timelock
                };
            },
            '设置紧急提款时间锁成功',
            { timelock },
            '设置紧急提款时间锁失败'
        );
    }

    /**
     * 设置紧急提款所需批准数
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setRequiredApprovals(req, res) {
        const { required } = req.body;
        
        console.log("\n[setRequiredApprovals] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[setRequiredApprovals] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { required, contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[setRequiredApprovals] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[setRequiredApprovals] 准备调用合约方法...");
                console.log("[setRequiredApprovals] 参数:", {
                    required
                });
                
                const tx = await contract.setRequiredApprovals(required);
                console.log("[setRequiredApprovals] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[setRequiredApprovals] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[setRequiredApprovals] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    required
                };
            },
            '设置紧急提款所需批准数成功',
            { required },
            '设置紧急提款所需批准数失败'
        );
    }

    /**
     * 开始紧急提款流程
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async initiateEmergencyWithdrawal(req, res) {
        console.log("\n[initiateEmergencyWithdrawal] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[initiateEmergencyWithdrawal] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[initiateEmergencyWithdrawal] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[initiateEmergencyWithdrawal] 准备调用合约方法...");
                
                const tx = await contract.initiateEmergencyWithdrawal();
                console.log("[initiateEmergencyWithdrawal] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[initiateEmergencyWithdrawal] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[initiateEmergencyWithdrawal] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash
                };
            },
            '开始紧急提款流程成功',
            null,
            '开始紧急提款流程失败'
        );
    }

    /**
     * 批准紧急提款
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async approveEmergencyWithdrawal(req, res) {
        console.log("\n[approveEmergencyWithdrawal] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[approveEmergencyWithdrawal] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[approveEmergencyWithdrawal] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[approveEmergencyWithdrawal] 准备调用合约方法...");
                
                const tx = await contract.approveEmergencyWithdrawal();
                console.log("[approveEmergencyWithdrawal] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[approveEmergencyWithdrawal] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[approveEmergencyWithdrawal] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash
                };
            },
            '批准紧急提款成功',
            null,
            '批准紧急提款失败'
        );
    }

    /**
     * 执行紧急提款
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async executeEmergencyWithdrawal(req, res) {
        const { recipient } = req.body;
        
        console.log("\n[executeEmergencyWithdrawal] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[executeEmergencyWithdrawal] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { recipient, contractAddress })) {
            return;
        }
        
        // 验证地址格式
        if (!AddressUtils.isValid(recipient)) {
            return ResponseUtils.sendError(res, '无效的接收地址格式', 400);
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[executeEmergencyWithdrawal] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[executeEmergencyWithdrawal] 准备调用合约方法...");
                console.log("[executeEmergencyWithdrawal] 参数:", {
                    recipient
                });
                
                const tx = await contract.executeEmergencyWithdrawal(recipient);
                console.log("[executeEmergencyWithdrawal] 交易已发送:", tx.hash);
                
                // 等待交易确认
                console.log("[executeEmergencyWithdrawal] 等待交易确认...");
                const receipt = await this.waitForTransaction(tx);
                console.log("[executeEmergencyWithdrawal] 交易已确认:", receipt.hash);
                
                return {
                    transactionHash: receipt.hash,
                    recipient
                };
            },
            '执行紧急提款成功',
            { recipient },
            '执行紧急提款失败'
        );
    }

    /**
     * 获取版本
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getVersion(req, res) {
        console.log("\n[getVersion] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getVersion] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getVersion] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getVersion] 准备调用合约方法...");
                
                const version = await contract.getVersion();
                console.log("[getVersion] 获取到的版本:", version);
                
                return {
                    version
                };
            },
            '获取版本成功',
            null,
            '获取版本失败'
        );
    }

    /**
     * 获取最小交易金额
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getMinTradeAmount(req, res) {
        console.log("\n[getMinTradeAmount] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getMinTradeAmount] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getMinTradeAmount] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getMinTradeAmount] 准备调用合约方法...");
                
                const minTradeAmount = await contract.getMinTradeAmount();
                console.log("[getMinTradeAmount] 获取到的最小交易金额:", minTradeAmount);
                
                return {
                    minTradeAmount
                };
            },
            '获取最小交易金额成功',
            null,
            '获取最小交易金额失败'
        );
    }

    /**
     * 获取最大交易金额
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getMaxTradeAmount(req, res) {
        console.log("\n[getMaxTradeAmount] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getMaxTradeAmount] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getMaxTradeAmount] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getMaxTradeAmount] 准备调用合约方法...");
                
                const maxTradeAmount = await contract.getMaxTradeAmount();
                console.log("[getMaxTradeAmount] 获取到的最大交易金额:", maxTradeAmount);
                
                return {
                    maxTradeAmount
                };
            },
            '获取最大交易金额成功',
            null,
            '获取最大交易金额失败'
        );
    }

    /**
     * 获取冷却期
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getCooldownPeriod(req, res) {
        console.log("\n[getCooldownPeriod] 开始执行");
        
        const contractAddress = EnvUtils.getContractAddress('TradingManager');
        console.log("[getCooldownPeriod] 合约地址:", contractAddress);
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress })) {
            return;
        }
        
        await this.handleContractAction(
            res,
            async () => {
                console.log("[getCooldownPeriod] 获取合约实例...");
                
                // 获取admin角色合约实例
                const contract = this.getContract('TradingManager', 'admin');
                
                // 调用合约方法
                console.log("[getCooldownPeriod] 准备调用合约方法...");
                
                const cooldownPeriod = await contract.getCooldownPeriod();
                console.log("[getCooldownPeriod] 获取到的冷却期:", cooldownPeriod);
                
                return {
                    cooldownPeriod
                };
            },
            '获取冷却期成功',
            null,
            '获取冷却期失败'
        );
    }
}

module.exports = TradingManagerController; 