// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./utils/RoleConstants.sol";
import "./RealEstateSystem.sol";
import "./PropertyToken.sol";
import "./utils/SafeMath.sol";

/**
 * @title TradingManager
 * @dev 优化的交易管理合约，处理房产代币的挂单和交易
 */
contract TradingManager is 
    Initializable, 
    UUPSUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuardUpgradeable {
    
    using SafeMath for uint256;
    
    // Version control - using uint8 to save gas
    uint8 private constant VERSION = 1;
    
    // 系统合约引用
    RealEstateSystem public system;
    
    // 订单和交易状态
    mapping(uint256 => Order) private _orders;
    mapping(uint256 => Trade) private _trades;
    mapping(address => uint256[]) private _userOrders;
    mapping(address => uint256[]) private _userTrades;
    mapping(address => uint256[]) private _tokenTrades;
    
    uint256 private _nextOrderId;
    uint256 private _nextTradeId;
    
    // 交易费率，基数为10000（0.01%）
    uint256 public feeRate;
    address public feeReceiver;
    
    // 最小交易金额
    uint256 public minTradeAmount;
    uint256 public maxTradeAmount;
    uint256 public cooldownPeriod;
    
    // 代币价格映射
    mapping(address => uint256) private _tokenPrices;
    
    // 地址黑名单
    mapping(address => bool) public blacklist;
    
    // 事件
    event OrderCreated(uint256 indexed orderId, address indexed seller, address indexed token, uint256 amount, uint256 price, bytes32 propertyIdHash);
    event OrderCancelled(uint256 indexed orderId, address indexed seller);
    event OrderExecuted(uint256 indexed orderId, address indexed buyer, address indexed seller, address token, uint256 amount, uint256 price, uint256 tradeId, bytes32 propertyIdHash);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event FeeReceiverUpdated(address oldReceiver, address newReceiver);
    event TradingStatusUpdated(bool paused);
    event MinTradeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event MaxTradeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event CooldownPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event AddressBlacklisted(address indexed account, bool status);
    event EmergencyWithdrawalExecuted(address recipient, uint256 amount);
    
    // 紧急提款相关
    uint256 public emergencyTimelock;
    uint256 public requiredApprovals;
    mapping(address => bool) private _emergencyApprovals;
    uint256 private _approvalCount;
    uint256 private _emergencyTimestamp;
    bool private _emergencyActive;
    
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
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(system.checkRole(RoleConstants.ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(system.checkRole(RoleConstants.MANAGER_ROLE, msg.sender), "Not manager");
        _;
    }
    
    /**
     * @dev 修饰器：只有OPERATOR角色可以调用
     */
    modifier onlyOperator() {
        require(system.checkRole(RoleConstants.OPERATOR_ROLE, msg.sender), "Not operator");
        _;
    }
    
    /**
     * @dev 修饰器：只有UPGRADER角色可以调用
     */
    modifier onlyUpgrader() {
        require(system.checkRole(RoleConstants.UPGRADER_ROLE, msg.sender), "Not upgrader");
        _;
    }
    
    /**
     * @dev 修饰器：只有PAUSER角色可以调用
     */
    modifier onlyPauser() {
        require(system.checkRole(RoleConstants.PAUSER_ROLE, msg.sender), "Not pauser");
        _;
    }
    
    // 初始化
    function initialize(address _systemAddress) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        
        // 初始化状态变量
        _nextOrderId = 1;
        _nextTradeId = 1;
        emergencyTimelock = 24 hours;
        requiredApprovals = 2;
    }
    
    /**
     * @dev 设置系统合约
     */
    function setSystem(address _systemAddress) external onlyAdmin {
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
    }
    
    // 修饰符
    modifier notBlacklisted(address account) {
        require(!blacklist[account], "Account is blacklisted");
        _;
    }
    
    /**
     * @dev 创建卖单 (内部细节函数)
     */
    function _createOrderInternal(
        address token, 
        uint256 amount, 
        uint256 price, 
        bytes32 propertyIdHash,
        bool skipTransfer
    ) 
        internal
        returns (uint256) 
    {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        
        // 检查最小交易金额
        if (minTradeAmount > 0) {
            require(amount >= minTradeAmount, "Amount below minimum");
        }
        
        // 检查最大交易金额
        if (maxTradeAmount > 0) {
            require(amount <= maxTradeAmount, "Amount above maximum");
        }
        
        // 将代币转移到合约
        if (!skipTransfer) {
            PropertyToken(token).transferFrom(msg.sender, address(this), amount);
        }
        
        // 创建订单
        uint256 orderId = _nextOrderId++;
        _orders[orderId] = Order({
            id: orderId,
            seller: msg.sender,
            token: token,
            amount: amount,
            price: price,
            timestamp: block.timestamp,
            active: true,
            propertyIdHash: propertyIdHash
        });
        
        // 更新用户订单列表
        _userOrders[msg.sender].push(orderId);
        
        // 触发事件
        emit OrderCreated(orderId, msg.sender, token, amount, price, propertyIdHash);
        
        return orderId;
    }
    
    /**
     * @dev 创建卖单
     */
    function createOrder(
        address token, 
        uint256 amount, 
        uint256 price, 
        bytes32 propertyIdHash
    ) 
        external 
        whenNotPaused 
        nonReentrant 
        notBlacklisted(msg.sender)
        onlyOperator
        returns (uint256) 
    {
        return _createOrderInternal(token, amount, price, propertyIdHash, false);
    }
    
    /**
     * @dev 创建卖单（无需转账）
     */
    function createOrderWithoutTransfer(
        address token, 
        uint256 amount, 
        uint256 price, 
        bytes32 propertyIdHash
    ) 
        external 
        whenNotPaused 
        nonReentrant 
        notBlacklisted(msg.sender)
        onlyOperator
        returns (uint256) 
    {
        return _createOrderInternal(token, amount, price, propertyIdHash, true);
    }
    
    /**
     * @dev 取消卖单
     */
    function cancelOrder(uint256 orderId) 
        external 
        whenNotPaused 
        nonReentrant 
        notBlacklisted(msg.sender)
        onlyOperator
    {
        Order storage order = _orders[orderId];
        require(order.id == orderId, "Order does not exist");
        require(order.active, "Order is not active");
        require(order.seller == msg.sender, "Not the seller");
        
        // 更新订单状态
        order.active = false;
        
        // 将代币退还给卖家
        IERC20Upgradeable(order.token).transfer(order.seller, order.amount);
        
        // 触发事件
        emit OrderCancelled(orderId, msg.sender);
    }
    
    /**
     * @dev 执行交易
     */
    function executeOrder(uint256 orderId) 
        external 
        payable
        whenNotPaused 
        nonReentrant 
        notBlacklisted(msg.sender)
        notBlacklisted(_orders[orderId].seller)
        onlyOperator
        returns (uint256) 
    {
        Order storage order = _orders[orderId];
        require(order.id == orderId, "Order does not exist");
        require(order.active, "Order is not active");
        require(order.seller != msg.sender, "Cannot buy own order");
        require(msg.value >= order.price, "Insufficient payment");
        
        // 更新订单状态
        order.active = false;
        
        uint256 feeAmount = 0;
        uint256 sellerAmount = order.price;
        
        // 计算并扣除交易费用
        if (feeRate > 0 && feeReceiver != address(0)) {
            feeAmount = order.price.mul(feeRate).div(10000);
            sellerAmount = order.price.sub(feeAmount);
            
            // 转账交易费用
            payable(feeReceiver).transfer(feeAmount);
        }
        
        // 向卖家转账ETH
        payable(order.seller).transfer(sellerAmount);
        
        // 将代币转移给买家
        IERC20Upgradeable(order.token).transfer(msg.sender, order.amount);
        
        // 退回多余的ETH
        if (msg.value > order.price) {
            payable(msg.sender).transfer(msg.value - order.price);
        }
        
        // 创建交易记录
        uint256 tradeId = _nextTradeId++;
        _trades[tradeId] = Trade({
            id: tradeId,
            orderId: orderId,
            buyer: msg.sender,
            seller: order.seller,
            token: order.token,
            amount: order.amount,
            price: order.price,
            timestamp: block.timestamp,
            propertyIdHash: order.propertyIdHash
        });
        
        // 更新用户交易记录
        _userTrades[msg.sender].push(tradeId);
        _userTrades[order.seller].push(tradeId);
        _tokenTrades[order.token].push(tradeId);
        
        // 触发事件
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
        
        return tradeId;
    }
    
    /**
     * @dev 设置交易费率
     */
    function setFeeRate(uint256 _feeRate) 
        external 
        onlyAdmin
    {
        require(_feeRate <= 1000, "Fee rate cannot exceed 10%");
        uint256 oldRate = feeRate;
        feeRate = _feeRate;
        emit FeeRateUpdated(oldRate, _feeRate);
    }
    
    /**
     * @dev 设置费用接收地址
     */
    function setFeeReceiver(address _feeReceiver) 
        external 
        onlyAdmin
    {
        require(_feeReceiver != address(0), "Fee receiver cannot be zero address");
        address oldReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver);
    }
    
    /**
     * @dev 设置最小交易金额
     */
    function setMinTradeAmount(uint256 _minAmount)
        external
        onlyManager
    {
        if (maxTradeAmount > 0) {
            require(_minAmount <= maxTradeAmount, "Min amount cannot exceed max amount");
        }
        uint256 oldAmount = minTradeAmount;
        minTradeAmount = _minAmount;
        emit MinTradeAmountUpdated(oldAmount, _minAmount);
    }
    
    /**
     * @dev 设置最大交易金额
     */
    function setMaxTradeAmount(uint256 _maxAmount)
        external
        onlyManager
    {
        if (_maxAmount > 0 && minTradeAmount > 0) {
            require(_maxAmount >= minTradeAmount, "Max amount cannot be less than min amount");
        }
        uint256 oldAmount = maxTradeAmount;
        maxTradeAmount = _maxAmount;
        emit MaxTradeAmountUpdated(oldAmount, _maxAmount);
    }
    
    /**
     * @dev 设置交易冷却期
     */
    function setCooldownPeriod(uint256 _period)
        external
        onlyManager
    {
        uint256 oldPeriod = cooldownPeriod;
        cooldownPeriod = _period;
        emit CooldownPeriodUpdated(oldPeriod, _period);
    }
    
    /**
     * @dev 暂停交易
     */
    function pause() external onlyAdmin {
        _pause();
        emit TradingStatusUpdated(true);
    }
    
    /**
     * @dev 恢复交易
     */
    function unpause() external onlyAdmin {
        _unpause();
        emit TradingStatusUpdated(false);
    }
    
    /**
     * @dev 将地址加入黑名单
     */
    function setBlacklist(address _account, bool _status)
        external
        onlyAdmin
    {
        blacklist[_account] = _status;
        emit AddressBlacklisted(_account, _status);
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
        require(order.id == orderId, "Order does not exist");
        
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
        require(trade.id == tradeId, "Trade does not exist");
        
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
     * @dev 获取代币交易
     */
    function getTokenTrades(address token) external view returns (uint256[] memory) {
        return _tokenTrades[token];
    }
    
    /**
     * @dev 设置代币价格
     */
    function setTokenPrice(address token, uint256 price)
        external
        onlyManager
    {
        _tokenPrices[token] = price;
    }
    
    /**
     * @dev 获取代币价格
     */
    function getTokenPrice(address token) external view returns (uint256) {
        return _tokenPrices[token];
    }
    
    /**
     * @dev 设置紧急提款时间锁
     */
    function setEmergencyTimelock(uint256 _timelock) 
        external 
        onlyAdmin
    {
        emergencyTimelock = _timelock;
    }
    
    /**
     * @dev 设置紧急提款所需批准数
     */
    function setRequiredApprovals(uint256 _required) 
        external 
        onlyAdmin
    {
        requiredApprovals = _required;
    }
    
    /**
     * @dev 开始紧急提款流程
     */
    function initiateEmergencyWithdrawal() 
        external 
        onlyAdmin
    {
        require(!_emergencyActive, "Emergency withdrawal already active");
        
        _emergencyApprovals[msg.sender] = true;
        _approvalCount = 1;
        _emergencyTimestamp = block.timestamp;
        _emergencyActive = true;
    }
    
    /**
     * @dev 批准紧急提款
     */
    function approveEmergencyWithdrawal() 
        external 
        onlyAdmin
    {
        require(_emergencyActive, "Emergency withdrawal not active");
        require(!_emergencyApprovals[msg.sender], "Already approved");
        
        _emergencyApprovals[msg.sender] = true;
        _approvalCount += 1;
    }
    
    /**
     * @dev 执行紧急提款
     */
    function executeEmergencyWithdrawal(address payable recipient) 
        external 
        onlyAdmin
    {
        require(_emergencyActive, "Emergency withdrawal not active");
        require(_approvalCount >= requiredApprovals, "Not enough approvals");
        require(block.timestamp >= _emergencyTimestamp + emergencyTimelock, "Timelock not expired");
        
        // 执行提款
        recipient.transfer(address(this).balance);
        
        // 重置状态
        _emergencyActive = false;
        _approvalCount = 0;
        _emergencyTimestamp = 0;
        
        // 清除所有批准 - 修复为使用事件记录而不是尝试清除所有管理员的批准
        emit EmergencyWithdrawalExecuted(recipient, address(this).balance);
    }
    
    /**
     * @dev 获取版本
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }
    
    /**
     * @dev 授权升级合约
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyUpgrader
    {
        require(!system.emergencyMode(), "Emergency mode active");
    }
    
    // 接收ETH
    receive() external payable {}
}

