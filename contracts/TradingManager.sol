// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./SimpleRoleManager.sol";
import "./PropertyToken.sol";

/**
 * @title TradingManager
 * @dev 优化的交易管理合约，处理房产代币的挂单和交易
 */
contract TradingManager is 
    Initializable, 
    UUPSUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuardUpgradeable {
    
    using SafeMathUpgradeable for uint256;
    
    // 版本控制 - 使用uint8节省gas
    uint8 public version;
    
    // 角色管理器
    SimpleRoleManager public roleManager;
    
    // 订单结构体
    struct Order {
        uint256 id;
        address seller;
        address token;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
        bool active;
        bytes32 propertyIdHash;
    }
    
    // 交易结构体
    struct Trade {
        uint256 id;
        uint256 orderId;
        address buyer;
        address seller;
        address token;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
        bytes32 propertyIdHash;
    }
    
    // 订单ID计数器
    uint256 private _nextOrderId;
    
    // 交易ID计数器
    uint256 private _nextTradeId;
    
    // 交易手续费比例（以1/10000表示，例如100表示1%）
    uint256 public feeRate;
    
    // 手续费接收地址
    address public feeReceiver;
    
    // 订单映射 (订单ID => 订单)
    mapping(uint256 => Order) private _orders;
    
    // 用户订单映射 (用户地址 => 订单ID数组)
    mapping(address => uint256[]) private _userOrders;
    
    // 代币订单映射 (代币地址 => 订单ID数组)
    mapping(address => uint256[]) private _tokenOrders;
    
    // 所有活跃订单ID
    uint256[] private _activeOrderIds;
    
    // 交易映射 (交易ID => 交易)
    mapping(uint256 => Trade) private _trades;
    
    // 用户交易映射 (用户地址 => 交易ID数组)
    mapping(address => uint256[]) private _userTrades;
    
    // 代币交易映射 (代币地址 => 交易ID数组)
    mapping(address => uint256[]) private _tokenTrades;
    
    // 属性交易映射 (属性ID哈希 => 交易ID数组)
    mapping(bytes32 => uint256[]) private _propertyTrades;
    
    // 交易暂停状态 - 单独控制交易功能
    bool public tradingPaused;
    
    // 黑名单地址
    mapping(address => bool) public blacklisted;
    
    // 最小交易金额
    uint256 public minTradeAmount;
    
    // 事件
    event OrderCreated(uint256 indexed orderId, address indexed seller, address indexed token, uint256 amount, uint256 price, bytes32 propertyIdHash);
    event OrderCancelled(uint256 indexed orderId, address indexed seller);
    event OrderExecuted(uint256 indexed orderId, address indexed buyer, address indexed seller, address token, uint256 amount, uint256 price, uint256 tradeId, bytes32 propertyIdHash);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event FeeReceiverUpdated(address oldReceiver, address newReceiver);
    event TradingStatusUpdated(bool paused);
    event MinTradeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event AddressBlacklisted(address indexed account, bool status);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender), "Not manager");
        _;
    }
    
    /**
     * @dev 修饰器：交易未暂停
     */
    modifier whenTradingNotPaused() {
        require(!tradingPaused, "Trading paused");
        _;
    }
    
    /**
     * @dev 修饰器：确保地址没有被列入黑名单
     */
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "Address blacklisted");
        _;
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(address _roleManager) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        feeRate = 100; // 默认1%
        feeReceiver = msg.sender;
        _nextOrderId = 1;
        _nextTradeId = 1;
        tradingPaused = false;
        minTradeAmount = 0; // 默认无最小交易额度
        version = 1;
    }
    
    /**
     * @dev 将地址加入黑名单或移除
     */
    function setBlacklistStatus(address account, bool status) external onlyAdmin {
        blacklisted[account] = status;
        emit AddressBlacklisted(account, status);
    }
    
    /**
     * @dev 设置最小交易金额
     */
    function setMinTradeAmount(uint256 _minAmount) external onlyAdmin {
        uint256 oldAmount = minTradeAmount;
        minTradeAmount = _minAmount;
        emit MinTradeAmountUpdated(oldAmount, _minAmount);
    }
    
    /**
     * @dev 设置手续费比例
     */
    function setFeeRate(uint256 _feeRate) external onlyAdmin {
        require(_feeRate <= 500, "Fee rate too high"); // 最高5%
        uint256 oldRate = feeRate;
        feeRate = _feeRate;
        emit FeeRateUpdated(oldRate, _feeRate);
    }
    
    /**
     * @dev 设置手续费接收地址
     */
    function setFeeReceiver(address _feeReceiver) external onlyAdmin {
        require(_feeReceiver != address(0), "Zero address");
        address oldReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver);
    }
    
    /**
     * @dev 暂停交易
     */
    function pauseTrading() external onlyAdmin {
        tradingPaused = true;
        emit TradingStatusUpdated(true);
    }
    
    /**
     * @dev 恢复交易
     */
    function unpauseTrading() external onlyAdmin {
        tradingPaused = false;
        emit TradingStatusUpdated(false);
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @dev 创建卖单
     */
    function createOrder(
        address token,
        uint256 amount,
        uint256 price
    ) 
        external 
        whenNotPaused 
        whenTradingNotPaused 
        notBlacklisted(msg.sender)
        nonReentrant
        returns (uint256)
    {
        require(amount > 0, "Amount must be > 0");
        require(price > 0, "Price must be > 0");
        require(price.mul(amount) >= minTradeAmount, "Below min trade amount");
        
        // 验证代币
        PropertyToken tokenContract = PropertyToken(token);
        require(tokenContract.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // 获取属性ID
        bytes32 propertyIdHash = tokenContract.propertyIdHash();
        
        // 转移代币到该合约
        require(tokenContract.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // 创建订单
        uint256 orderId = _nextOrderId++;
        
        Order storage order = _orders[orderId];
        order.id = orderId;
        order.seller = msg.sender;
        order.token = token;
        order.amount = amount;
        order.price = price;
        order.timestamp = block.timestamp;
        order.active = true;
        order.propertyIdHash = propertyIdHash;
        
        // 更新索引
        _userOrders[msg.sender].push(orderId);
        _tokenOrders[token].push(orderId);
        _activeOrderIds.push(orderId);
        
        emit OrderCreated(orderId, msg.sender, token, amount, price, propertyIdHash);
        
        return orderId;
    }
    
    /**
     * @dev 取消卖单
     */
    function cancelOrder(uint256 orderId) 
        external 
        whenNotPaused 
        nonReentrant
    {
        Order storage order = _orders[orderId];
        require(order.active, "Order not active");
        require(order.seller == msg.sender || roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Not seller or admin");
        
        // 标记订单为非活跃
        order.active = false;
        
        // 退还代币
        PropertyToken(order.token).transfer(order.seller, order.amount);
        
        // 从活跃订单列表中移除
        _removeActiveOrder(orderId);
        
        emit OrderCancelled(orderId, order.seller);
    }
    
    /**
     * @dev 从活跃订单列表中移除
     */
    function _removeActiveOrder(uint256 orderId) private {
        for (uint256 i = 0; i < _activeOrderIds.length; i++) {
            if (_activeOrderIds[i] == orderId) {
                if (i < _activeOrderIds.length - 1) {
                    _activeOrderIds[i] = _activeOrderIds[_activeOrderIds.length - 1];
                }
                _activeOrderIds.pop();
                break;
            }
        }
    }
    
    /**
     * @dev 执行卖单
     */
    function executeOrder(uint256 orderId) 
        external 
        payable 
        whenNotPaused 
        whenTradingNotPaused 
        notBlacklisted(msg.sender)
        nonReentrant
    {
        Order storage order = _orders[orderId];
        require(order.active, "Order not active");
        require(order.seller != msg.sender, "Cannot buy own order");
        require(msg.value >= order.price.mul(order.amount), "Insufficient payment");
        
        // 标记订单为非活跃
        order.active = false;
        
        // 计算手续费
        uint256 fee = order.price.mul(order.amount).mul(feeRate).div(10000);
        uint256 sellerAmount = order.price.mul(order.amount).sub(fee);
        
        // 转账卖家金额
        payable(order.seller).transfer(sellerAmount);
        
        // 转账手续费
        if (fee > 0) {
            payable(feeReceiver).transfer(fee);
        }
        
        // 如果买家支付了额外金额，退还
        uint256 refund = msg.value.sub(order.price.mul(order.amount));
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
        
        // 转移代币给买家
        PropertyToken(order.token).transfer(msg.sender, order.amount);
        
        // 从活跃订单列表中移除
        _removeActiveOrder(orderId);
        
        // 创建交易记录
        uint256 tradeId = _nextTradeId++;
        
        Trade storage trade = _trades[tradeId];
        trade.id = tradeId;
        trade.orderId = orderId;
        trade.buyer = msg.sender;
        trade.seller = order.seller;
        trade.token = order.token;
        trade.amount = order.amount;
        trade.price = order.price;
        trade.timestamp = block.timestamp;
        trade.propertyIdHash = order.propertyIdHash;
        
        // 更新索引
        _userTrades[msg.sender].push(tradeId);
        _userTrades[order.seller].push(tradeId);
        _tokenTrades[order.token].push(tradeId);
        _propertyTrades[order.propertyIdHash].push(tradeId);
        
        emit OrderExecuted(
            orderId, 
            msg.sender, 
            order.seller, 
            order.token, 
            order.amount, 
            order.price, 
            tradeId,
            order.propertyIdHash
        );
    }
    
    /**
     * @dev 批量取消卖单
     */
    function batchCancelOrders(uint256[] calldata orderIds) 
        external 
        whenNotPaused 
        nonReentrant
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            uint256 orderId = orderIds[i];
            Order storage order = _orders[orderId];
            
            if (order.active && (order.seller == msg.sender || roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender))) {
                // 标记订单为非活跃
                order.active = false;
                
                // 退还代币
                PropertyToken(order.token).transfer(order.seller, order.amount);
                
                // 从活跃订单列表中移除
                _removeActiveOrder(orderId);
                
                emit OrderCancelled(orderId, order.seller);
            }
        }
    }
    
    /**
     * @dev 批量执行卖单 - 管理员紧急功能
     */
    function adminCancelAllOrders() 
        external 
        onlyAdmin 
        nonReentrant
    {
        uint256[] memory orderIdsToCancel = _activeOrderIds;
        
        for (uint256 i = 0; i < orderIdsToCancel.length; i++) {
            uint256 orderId = orderIdsToCancel[i];
            Order storage order = _orders[orderId];
            
            if (order.active) {
                // 标记订单为非活跃
                order.active = false;
                
                // 退还代币
                PropertyToken(order.token).transfer(order.seller, order.amount);
                
                emit OrderCancelled(orderId, order.seller);
            }
        }
        
        // 清空活跃订单列表
        delete _activeOrderIds;
    }
    
    /**
     * @dev 获取订单信息
     */
    function getOrder(uint256 orderId) 
        external 
        view 
        returns (
            uint256 id,
            address seller,
            address token,
            uint256 amount,
            uint256 price,
            uint256 timestamp,
            bool active,
            bytes32 propertyIdHash
        ) 
    {
        Order storage order = _orders[orderId];
        return (
            order.id,
            order.seller,
            order.token,
            order.amount,
            order.price,
            order.timestamp,
            order.active,
            order.propertyIdHash
        );
    }
    
    /**
     * @dev 获取交易信息
     */
    function getTrade(uint256 tradeId) 
        external 
        view 
        returns (
            uint256 id,
            uint256 orderId,
            address buyer,
            address seller,
            address token,
            uint256 amount,
            uint256 price,
            uint256 timestamp,
            bytes32 propertyIdHash
        ) 
    {
        Trade storage trade = _trades[tradeId];
        return (
            trade.id,
            trade.orderId,
            trade.buyer,
            trade.seller,
            trade.token,
            trade.amount,
            trade.price,
            trade.timestamp,
            trade.propertyIdHash
        );
    }
    
    /**
     * @dev 获取用户订单
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return _userOrders[user];
    }
    
    /**
     * @dev 获取用户交易
     */
    function getUserTrades(address user) external view returns (uint256[] memory) {
        return _userTrades[user];
    }
    
    /**
     * @dev 获取代币订单
     */
    function getTokenOrders(address token) external view returns (uint256[] memory) {
        return _tokenOrders[token];
    }
    
    /**
     * @dev 获取代币交易
     */
    function getTokenTrades(address token) external view returns (uint256[] memory) {
        return _tokenTrades[token];
    }
    
    /**
     * @dev 获取属性交易
     */
    function getPropertyTrades(bytes32 propertyIdHash) external view returns (uint256[] memory) {
        return _propertyTrades[propertyIdHash];
    }
    
    /**
     * @dev 获取活跃订单
     */
    function getActiveOrders() external view returns (uint256[] memory) {
        return _activeOrderIds;
    }
    
    /**
     * @dev 获取活跃订单数量
     */
    function getActiveOrdersCount() external view returns (uint256) {
        return _activeOrderIds.length;
    }
    
    /**
     * @dev 获取订单数量
     */
    function getOrdersCount() external view returns (uint256) {
        return _nextOrderId - 1;
    }
    
    /**
     * @dev 获取交易数量
     */
    function getTradesCount() external view returns (uint256) {
        return _nextTradeId - 1;
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyAdmin 
    {
        require(!SimpleRoleManager(roleManager).emergencyMode(), "Emergency mode active");
        uint8 oldVersion = version;
        version += 1;
    }
    
    /**
     * @dev 紧急提款 - 允许管理员提取合约中的以太坊
     */
    function emergencyWithdraw() external onlyAdmin {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    /**
     * @dev 紧急代币提款 - 允许管理员提取合约中的任何代币
     */
    function emergencyTokenWithdraw(address token, uint256 amount) external onlyAdmin {
        PropertyToken(token).transfer(msg.sender, amount);
    }
    
    /**
     * @dev 接收以太币
     */
    receive() external payable {}
} 