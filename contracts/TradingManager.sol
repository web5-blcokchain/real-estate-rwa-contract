// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./RoleManager.sol";
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
    
    // 角色管理器
    RoleManager public roleManager;
    
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
    
    // 初始化
    function initialize(address _roleManager) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        roleManager = RoleManager(_roleManager);
        
        // 初始化状态变量
        _nextOrderId = 1;
        _nextTradeId = 1;
        emergencyTimelock = 24 hours;
        requiredApprovals = 2;
    }
    
    // 修饰符
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Caller is not an admin");
        _;
    }
    
    modifier onlyManager() {
        require(
            roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender) || 
            roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender), 
            "Caller is not a manager"
        );
        _;
    }
    
    modifier onlyOperator() {
        require(
            roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender) || 
            roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender) || 
            roleManager.hasRole(roleManager.OPERATOR_ROLE(), msg.sender), 
            "Caller is not an operator"
        );
        _;
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklist[account], "Account is blacklisted");
        _;
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
        PropertyToken(token).transferFrom(msg.sender, address(this), amount);
        
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
     * @dev 取消卖单
     */
    function cancelOrder(uint256 orderId) 
        external 
        whenNotPaused 
        nonReentrant 
        notBlacklisted(msg.sender)
    {
        Order storage order = _orders[orderId];
        require(order.id == orderId, "Order does not exist");
        require(order.seller == msg.sender, "Not the seller");
        require(order.active, "Order not active");
        
        // 标记订单为非活跃
        order.active = false;
        
        // 将代币返回给卖家
        PropertyToken(order.token).transfer(order.seller, order.amount);
        
        // 触发事件
        emit OrderCancelled(orderId, msg.sender);
    }
    
    /**
     * @dev 执行买单
     */
    function executeOrder(uint256 orderId) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
        notBlacklisted(msg.sender)
        notBlacklisted(_orders[orderId].seller)
    {
        Order storage order = _orders[orderId];
        require(order.id == orderId, "Order does not exist");
        require(order.active, "Order not active");
        require(order.seller != msg.sender, "Cannot buy own order");
        
        // 检查冷却期
        if (cooldownPeriod > 0) {
            require(block.timestamp >= order.timestamp.add(cooldownPeriod), "Order in cooldown period");
        }
        
        // 确认支付金额正确
        uint256 totalPrice = order.price.mul(order.amount).div(1e18);
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // 标记订单为非活跃
        order.active = false;
        
        // 计算费用
        (uint256 platformFee, , uint256 netAmount) = calculateFees(totalPrice, true);
        
        // 将代币转移给买家
        PropertyToken(order.token).transfer(msg.sender, order.amount);
        
        // 将ETH转移给卖家和手续费接收者
        if (platformFee > 0 && feeReceiver != address(0)) {
            payable(feeReceiver).transfer(platformFee);
        }
        payable(order.seller).transfer(netAmount);
        
        // 如果买家支付了超额，退还多余的ETH
        uint256 excess = msg.value.sub(totalPrice);
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
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
        
        // 更新用户和代币交易列表
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
    function getUserOrders(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return _userOrders[user];
    }
    
    /**
     * @dev 获取用户交易
     */
    function getUserTrades(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return _userTrades[user];
    }
    
    /**
     * @dev 获取代币交易
     */
    function getTokenTrades(address token) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return _tokenTrades[token];
    }
    
    /**
     * @dev 获取订单数量
     */
    function getOrderCount() 
        external 
        view 
        returns (uint256) 
    {
        return _nextOrderId - 1;
    }
    
    /**
     * @dev 获取交易数量
     */
    function getTradeCount() 
        external 
        view 
        returns (uint256) 
    {
        return _nextTradeId - 1;
    }
    
    /**
     * @dev 设置费率
     */
    function setFeeRate(uint256 _feeRate) 
        external 
        onlyAdmin 
    {
        require(_feeRate <= 500, "Fee rate too high"); // 最高 5%
        uint256 oldRate = feeRate;
        feeRate = _feeRate;
        emit FeeRateUpdated(oldRate, _feeRate);
    }
    
    /**
     * @dev 设置费用接收者
     */
    function setFeeReceiver(address _feeReceiver) 
        external 
        onlyAdmin 
    {
        require(_feeReceiver != address(0), "Invalid fee receiver");
        address oldReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver);
    }
    
    /**
     * @dev 设置最小交易金额
     */
    function setMinTradeAmount(uint256 _minAmount) 
        external 
        onlyAdmin 
    {
        uint256 oldAmount = minTradeAmount;
        minTradeAmount = _minAmount;
        emit MinTradeAmountUpdated(oldAmount, _minAmount);
    }
    
    /**
     * @dev 设置最大交易金额
     */
    function setMaxTradeAmount(uint256 _maxAmount) 
        external 
        onlyAdmin 
    {
        uint256 oldAmount = maxTradeAmount;
        maxTradeAmount = _maxAmount;
        emit MaxTradeAmountUpdated(oldAmount, _maxAmount);
    }
    
    /**
     * @dev 设置冷却期
     */
    function setCooldownPeriod(uint256 _period) 
        external 
        onlyAdmin 
    {
        uint256 oldPeriod = cooldownPeriod;
        cooldownPeriod = _period;
        emit CooldownPeriodUpdated(oldPeriod, _period);
    }
    
    /**
     * @dev 设置地址黑名单状态
     */
    function setBlacklist(address account, bool status) 
        external 
        onlyAdmin 
    {
        blacklist[account] = status;
        emit AddressBlacklisted(account, status);
    }
    
    /**
     * @dev 暂停交易
     */
    function pause() 
        external 
        onlyAdmin 
    {
        _pause();
        emit TradingStatusUpdated(true);
    }
    
    /**
     * @dev 恢复交易
     */
    function unpause() 
        external 
        onlyAdmin 
    {
        _unpause();
        emit TradingStatusUpdated(false);
    }
    
    /**
     * @dev 升级授权
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyAdmin 
    {
        // 升级授权逻辑
    }
    
    /**
     * @dev 接收以太币
     */
    receive() external payable {}
    
    /**
     * @dev 计算费用，使用高精度计算避免精度损失
     */
    function calculateFees(uint256 _amount, bool _applyFees) internal view returns (
        uint256 platformFee,
        uint256 maintenanceFee,
        uint256 netAmount
    ) {
        if (_applyFees) {
            // 使用更高精度的计算方式
            platformFee = _amount.mul(feeRate).div(10000);
            
            // 确保费用至少为1 wei，避免舍入为0
            if (feeRate > 0 && platformFee == 0) {
                platformFee = 1;
            }
            
            maintenanceFee = 0; // 假设maintenanceFeeRate为0
            
            // 确保netAmount不会因精度问题变为负数
            if (platformFee > _amount) {
                platformFee = _amount;
                netAmount = 0;
            } else {
                netAmount = _amount.sub(platformFee);
            }
        } else {
            platformFee = 0;
            maintenanceFee = 0;
            netAmount = _amount;
        }
    }
    
    /**
     * @dev 获取代币交易数量
     */
    function getTokenTradingVolume(address token) external view returns (uint256) {
        uint256[] memory trades = _tokenTrades[token];
        uint256 totalVolume = 0;
        
        for (uint256 i = 0; i < trades.length; i++) {
            Trade storage trade = _trades[trades[i]];
            totalVolume = totalVolume.add(trade.amount);
        }
        
        return totalVolume;
    }
    
    /**
     * @dev 获取系统版本
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }
    
    /**
     * @dev 设置代币的初始价格
     */
    function setInitialPrice(address token, uint256 price) external onlyManager whenNotPaused {
        require(token != address(0), "Invalid token address");
        require(price > 0, "Price must be greater than 0");
        require(_tokenPrices[token] == 0, "Price already set");

        _tokenPrices[token] = price;
    }

    /**
     * @dev 设置代币的当前价格
     */
    function setCurrentPrice(address token, uint256 price) external onlyManager whenNotPaused {
        require(token != address(0), "Invalid token address");
        require(price > 0, "Price must be greater than 0");

        _tokenPrices[token] = price;
    }

    /**
     * @dev 获取代币的当前价格
     */
    function getCurrentPrice(address token) external view returns (uint256) {
        require(token != address(0), "Invalid token address");
        return _tokenPrices[token];
    }

    /**
     * @dev 获取用户的所有代币地址
     */
    function getUserTokens(address user) external view returns (address[] memory) {
        uint256[] memory userOrderIds = _userOrders[user];
        address[] memory tokens = new address[](userOrderIds.length);
        uint256 tokenCount = 0;
        
        // 遍历用户的所有订单
        for (uint256 i = 0; i < userOrderIds.length; i++) {
            Order storage order = _orders[userOrderIds[i]];
            bool isDuplicate = false;
            
            // 检查是否已添加此代币
            for (uint256 j = 0; j < tokenCount; j++) {
                if (tokens[j] == order.token) {
                    isDuplicate = true;
                    break;
                }
            }
            
            // 如果不是重复的，则添加到数组
            if (!isDuplicate) {
                tokens[tokenCount] = order.token;
                tokenCount++;
            }
        }
        
        // 创建最终数组
        address[] memory result = new address[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            result[i] = tokens[i];
        }
        
        return result;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
    
    // 紧急提款请求结构
    struct EmergencyWithdrawalRequest {
        uint256 requestTime;
        uint256 amount;
        address token;
        bool executed;
        uint256 approvals;
    }
    
    // 紧急提款请求映射
    mapping(uint256 => EmergencyWithdrawalRequest) public emergencyRequests;
    uint256 public nextRequestId;
    
    // 紧急提款时间锁定期（默认24小时）
    uint256 public emergencyTimelock;
    
    // 紧急提款所需确认数
    uint256 public requiredApprovals;
    
    // 紧急提款请求确认映射
    mapping(uint256 => mapping(address => bool)) public emergencyApprovals;
    
    // 事件
    event EmergencyWithdrawalRequested(uint256 indexed requestId, address indexed requester, uint256 amount);
    event EmergencyWithdrawalApproved(uint256 indexed requestId, address indexed approver);
    event EmergencyWithdrawalExecuted(uint256 indexed requestId, address indexed executor, uint256 amount);
    event EmergencyTokenWithdrawalRequested(uint256 indexed requestId, address indexed requester, address token, uint256 amount);
    event EmergencyTokenWithdrawalExecuted(uint256 indexed requestId, address indexed executor, address token, uint256 amount);
    event EmergencyTimelockUpdated(uint256 oldTimelock, uint256 newTimelock);
    event RequiredApprovalsUpdated(uint256 oldRequired, uint256 newRequired);
}

