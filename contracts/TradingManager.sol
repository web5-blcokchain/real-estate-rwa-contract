// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./utils/RoleConstants.sol";
import "./RealEstateSystem.sol";
import "./PropertyToken.sol";
import "./utils/SafeMath.sol";

/**
 * @title TradingManager - 日本房地产代币交易管理合约
 * @author Fashi Shijian团队
 * @notice 本合约负责管理平台上所有房产代币的交易流程，包括挂单、撮合、清算和费用管理
 * 
 * @dev 合约功能描述：
 * 1. 订单管理：支持用户创建买单和卖单，维护订单生命周期
 * 2. 交易撮合：实现买单和卖单的自动撮合，执行代币和资金的原子交换
 * 3. 价格发现：通过市场机制形成房产代币的实时价格
 * 4. 费用管理：收取交易费用并转发给指定接收方
 * 5. 风险控制：
 *    - 实现交易黑名单，限制高风险用户
 *    - 交易金额限制，防止异常交易
 *    - 冷却期机制，防止市场操纵
 *    - 紧急提款机制，应对特殊情况
 * 
 * @dev 数据结构：
 * - Order：订单数据结构，包含卖方、代币、数量、价格等信息
 * - Trade：交易记录结构，包含买方、卖方、代币、数量、价格等信息
 * - 各种映射结构：追踪用户订单、交易历史和代币价格
 * 
 * @dev 与其他模块的关联：
 * - RealEstateSystem：依赖核心系统合约进行权限验证和系统状态检查
 * - PropertyToken：与代币合约交互，执行代币转移
 * - PropertyManager：获取可交易的房产代币信息
 * - RewardManager：与奖励系统协作，支持交易激励机制
 * 
 * @dev 权限控制：
 * - ADMIN：可配置交易参数、管理费率和接收方、处理紧急情况
 * - MANAGER：可监督交易活动、维护黑名单、暂停异常交易
 * - OPERATOR：可查询交易状态、协助用户解决交易问题
 * 
 * @dev 业务规则：
 * - 交易费率：基于交易金额的百分比（基数为10000，即0.01%单位）
 * - 最小/最大交易金额：限制单笔交易规模，防止异常交易
 * - 冷却期：限制频繁交易，防止市场操纵
 * - 紧急机制：多签名授权的紧急提款功能，应对特殊情况
 * 
 * @dev 安全考虑：
 * - 实现了重入攻击防护（ReentrancyGuard）
 * - 原子交易执行，确保代币和资金的安全交换
 * - 紧急暂停功能，应对市场异常
 * - 多签名授权的紧急提款机制
 */
contract TradingManager is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable {
    
    using SafeMath for uint256;
    using RoleConstants for bytes32;
    
    // Version control - using uint8 to save gas
    uint8 private constant VERSION = 1;
    
    // 系统合约引用
    RealEstateSystem public system;
    
    // USDT 合约地址
    address public usdtAddress;
    
    // 订单和交易状态
    mapping(uint256 => Order) private _orders;
    mapping(uint256 => Trade) private _trades;
    mapping(address => uint256[]) private _userOrders;
    mapping(address => uint256[]) private _userTrades;
    mapping(address => uint256[]) private _tokenTrades;
    mapping(address => uint256) private _lastTrade;  // 添加最后交易时间映射
    
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
    
    // 事件 - 优化事件定义
    event OrderCreated(
        uint256 indexed orderId,
        address indexed seller,
        address indexed token,
        string propertyId,
        uint256 amount,
        uint256 price,
        bool isSellOrder,
        uint40 createTime
    );
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed seller,
        uint40 cancelTime
    );
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed seller,
        address token,
        string propertyId,
        uint256 amount,
        uint256 price,
        uint256 tradeId,
        bool isSellOrder,
        uint40 executeTime
    );
    event FeeRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint40 updateTime
    );
    event FeeReceiverUpdated(
        address oldReceiver,
        address newReceiver,
        uint40 updateTime
    );
    event TradingStatusUpdated(
        bool paused,
        uint40 updateTime
    );
    event MinTradeAmountUpdated(
        uint256 oldAmount,
        uint256 newAmount,
        uint40 updateTime
    );
    event MaxTradeAmountUpdated(
        uint256 oldAmount,
        uint256 newAmount,
        uint40 updateTime
    );
    event CooldownPeriodUpdated(
        uint256 oldPeriod,
        uint256 newPeriod,
        uint40 updateTime
    );
    event AddressBlacklisted(
        address indexed account,
        bool status,
        uint40 updateTime
    );
    event EmergencyWithdrawalExecuted(
        address indexed recipient,
        uint256 amount,
        uint40 executeTime
    );
    
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
        string propertyId;
        uint256 amount;  // 直接使用整数，表示房产份额数量
        uint256 price;   // 价格保持精度
        uint256 timestamp;
        bool active;
        bool isSellOrder;
    }
    
    // 交易结构体
    struct Trade {
        uint256 id;
        uint256 orderId;
        address buyer;
        address seller;
        address token;
        string propertyId;
        uint256 amount;  // 直接使用整数，表示房产份额数量
        uint256 price;   // 价格保持精度
        uint256 timestamp;
        bool isSellOrder;
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(system.checkRole(RoleConstants.ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(system.checkRole(RoleConstants.MANAGER_ROLE(), msg.sender), "Not manager");
        _;
    }
    
    /**
     * @dev 修饰器：只有OPERATOR角色可以调用
     */
    modifier onlyOperator() {
        require(system.checkRole(RoleConstants.OPERATOR_ROLE(), msg.sender), "Not operator");
        _;
    }
    
    /**
     * @dev 修饰器：只有UPGRADER角色可以调用
     */
    modifier onlyUpgrader() {
        require(system.checkRole(RoleConstants.UPGRADER_ROLE(), msg.sender), "Not upgrader");
        _;
    }
    
    /**
     * @dev 修饰器：只有PAUSER角色可以调用
     */
    modifier onlyPauser() {
        require(system.checkRole(RoleConstants.PAUSER_ROLE(), msg.sender), "Not pauser");
        _;
    }
    
    /**
     * @dev 初始化函数 - 需要ADMIN权限
     */
    function initialize(address _systemAddress) public initializer {
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        // 初始化状态变量
        _nextOrderId = 1;
        _nextTradeId = 1;
        emergencyTimelock = 24 hours;
        requiredApprovals = 2;
        
        // 设置交易参数
        minTradeAmount = 1;  // 设置最小交易金额为1个代币
        maxTradeAmount = 1000000;  // 设置最大交易金额
        cooldownPeriod = 10 seconds;  // 设置冷却期为10秒
        feeRate = 50;  // 设置费率为0.5%
    }
    
    /**
     * @dev 设置系统合约 - 需要ADMIN权限
     */
    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
    }
    
    /**
     * @dev 设置 USDT 合约地址 - 需要ADMIN权限
     */
    function setUsdtAddress(address _usdtAddress) external onlyAdmin {
        require(_usdtAddress != address(0), "Invalid USDT address");
        usdtAddress = _usdtAddress;
    }
    
    // 修饰符
    modifier notBlacklisted(address account) {
        require(!blacklist[account], "Account is blacklisted");
        _;
    }
    
    
    /**
     * @dev 创建卖单
     */
    function createSellOrder(
        address token,
        string memory propertyId,
        uint256 amount,
        uint256 price
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(token != address(0), "Invalid token address");
        require(bytes(propertyId).length > 0, "Invalid property ID");
        require(amount > 0, "Invalid amount");
        require(price > 0, "Invalid price");
        
        // 检查交易限制
        require(amount >= minTradeAmount, "Amount below minimum");
        require(amount <= maxTradeAmount, "Amount above maximum");
        
        // 检查黑名单
        require(!blacklist[msg.sender], "Seller is blacklisted");
        
        // 获取代币合约实例
        IERC20Upgradeable propertyToken = IERC20Upgradeable(token);
        
        // 检查用户是否已授权足够的代币
        uint256 tokenAllowance = propertyToken.allowance(msg.sender, address(this));
        require(tokenAllowance >= amount, "Insufficient token allowance");
        
        // 转移代币
        require(propertyToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        
        // 创建订单
        uint256 orderId = _nextOrderId++;
        _orders[orderId] = Order({
            id: orderId,
            seller: msg.sender,
            token: token,
            propertyId: propertyId,
            amount: amount,
            price: price,
            timestamp: block.timestamp,
            active: true,
            isSellOrder: true
        });
        
        _userOrders[msg.sender].push(orderId);
        _tokenTrades[token].push(orderId);
        
        emit OrderCreated(
            orderId,
            msg.sender,
            token,
            propertyId,
            amount,
            price,
            true,
            uint40(block.timestamp)
        );
        
        return orderId;
    }
    
    /**
     * @dev 创建买单
     */
    function createBuyOrder(
        address token,
        string memory propertyId,
        uint256 amount,
        uint256 price
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(token != address(0), "Invalid token address");
        require(bytes(propertyId).length > 0, "Invalid property ID");
        require(amount > 0, "Invalid amount");
        require(price > 0, "Invalid price");
        
        // 检查交易限制
        require(amount >= minTradeAmount, "Amount below minimum");
        require(amount <= maxTradeAmount, "Amount above maximum");
        
        // 检查黑名单
        require(!blacklist[msg.sender], "Buyer is blacklisted");
        
        // 计算需要的 USDT 数量
        uint256 requiredUsdt = amount * price;
        
        // 检查并转移 USDT
        IERC20Upgradeable usdt = IERC20Upgradeable(usdtAddress);
        require(usdt.allowance(msg.sender, address(this)) >= requiredUsdt, "Insufficient USDT allowance");
        require(usdt.transferFrom(msg.sender, address(this), requiredUsdt), "USDT transfer failed");
        
        // 创建订单
        uint256 orderId = _nextOrderId++;
        _orders[orderId] = Order({
            id: orderId,
            seller: msg.sender,
            token: token,
            propertyId: propertyId,
            amount: amount,
            price: price,
            timestamp: block.timestamp,
            active: true,
            isSellOrder: false
        });
        
        _userOrders[msg.sender].push(orderId);
        _tokenTrades[token].push(orderId);
        
        emit OrderCreated(
            orderId,
            msg.sender,
            token,
            propertyId,
            amount,
            price,
            false,
            uint40(block.timestamp)
        );
        
        return orderId;
    }
    
    /**
     * @dev 取消卖单
     */
    function cancelOrder(uint256 orderId) external whenNotPaused nonReentrant {
        // ... existing implementation ...
    }
    
    /**
     * @dev 设置交易费率 - 需要MANAGER权限
     */
    function setFeeRate(uint256 _feeRate) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_feeRate <= 10000, "Fee rate too high");
        
        uint256 oldRate = feeRate;
        feeRate = _feeRate;
        
        emit FeeRateUpdated(oldRate, _feeRate, uint40(block.timestamp));
    }
    
    /**
     * @dev 设置手续费接收地址 - 需要MANAGER权限
     */
    function setFeeReceiver(address _feeReceiver) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_feeReceiver != address(0), "Invalid fee receiver");
        
        address oldReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver, uint40(block.timestamp));
    }
    
    /**
     * @dev 设置最小交易金额 - 需要MANAGER权限
     */
    function setMinTradeAmount(uint256 _minTradeAmount) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_minTradeAmount <= maxTradeAmount, "Invalid min amount");
        
        uint256 oldAmount = minTradeAmount;
        minTradeAmount = _minTradeAmount;
        
        emit MinTradeAmountUpdated(oldAmount, _minTradeAmount, uint40(block.timestamp));
    }
    
    /**
     * @dev 设置最大交易金额 - 需要MANAGER权限
     */
    function setMaxTradeAmount(uint256 _maxTradeAmount) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_maxTradeAmount >= minTradeAmount, "Invalid max amount");
        
        uint256 oldAmount = maxTradeAmount;
        maxTradeAmount = _maxTradeAmount;
        
        emit MaxTradeAmountUpdated(oldAmount, _maxTradeAmount, uint40(block.timestamp));
    }
    
    /**
     * @dev 设置冷却期 - 需要MANAGER权限
     */
    function setCooldownPeriod(uint256 _cooldownPeriod) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_cooldownPeriod > 0, "Invalid cooldown period");
        
        uint256 oldPeriod = cooldownPeriod;
        cooldownPeriod = _cooldownPeriod;
        
        emit CooldownPeriodUpdated(oldPeriod, _cooldownPeriod, uint40(block.timestamp));
    }
    
    /**
     * @dev 暂停合约 - 需要ADMIN权限
     */
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _pause();
        emit TradingStatusUpdated(true, uint40(block.timestamp));
    }
    
    /**
     * @dev 恢复合约 - 需要ADMIN权限
     */
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _unpause();
        emit TradingStatusUpdated(false, uint40(block.timestamp));
    }
    
    /**
     * @dev 设置地址黑名单状态 - 需要MANAGER权限
     */
    function setBlacklistStatus(address account, bool status) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(account != address(0), "Invalid account");
        
        blacklist[account] = status;
        
        emit AddressBlacklisted(account, status, uint40(block.timestamp));
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
            bool isSellOrder
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
            order.isSellOrder
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
            bool isSellOrder
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
            trade.isSellOrder
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
        emit EmergencyWithdrawalExecuted(recipient, address(this).balance, uint40(block.timestamp));
    }
    
    /**
     * @dev 获取版本
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }
    
    /**
     * @dev 授权合约升级 - 需要ADMIN权限
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(RoleConstants.UPGRADER_ROLE()) 
    {
        require(!system.emergencyMode(), "Emergency mode active");
    }
    
    /**
     * @dev 获取最小交易金额
     */
    function getMinTradeAmount() external view returns (uint256) {
        return minTradeAmount;
    }
    
    /**
     * @dev 获取最大交易金额
     */
    function getMaxTradeAmount() external view returns (uint256) {
        return maxTradeAmount;
    }
    
    /**
     * @dev 获取冷却期
     */
    function getCooldownPeriod() external view returns (uint256) {
        return cooldownPeriod;
    }
    
    /**
     * @dev 购买卖单
     */
    function buyOrder(uint256 sellOrderId) external whenNotPaused nonReentrant {
        // 获取卖单信息
        Order storage order = _orders[sellOrderId];
        require(order.id != 0, "Order does not exist");
        require(order.active == true, "Order is not active");
        require(order.isSellOrder == true, "Not a sell order");
        
        // 检查交易限制
        require(order.amount >= minTradeAmount, "Amount below minimum");
        require(order.amount <= maxTradeAmount, "Amount above maximum");
        
        // 检查冷却期
        require(block.timestamp >= _lastTrade[msg.sender] + cooldownPeriod, "In cooldown period");
        
        // 检查买家是否在黑名单中
        require(!blacklist[msg.sender], "Buyer is blacklisted");
        
        // 计算需要的 USDT 数量（包含手续费）
        uint256 usdtAmount = order.amount * order.price;
        uint256 usdtFee = (usdtAmount * feeRate) / 10000;
        uint256 totalUsdt = usdtAmount + usdtFee;
        
        // 检查并转移 USDT
        IERC20Upgradeable usdt = IERC20Upgradeable(usdtAddress);
        require(usdt.allowance(msg.sender, address(this)) >= totalUsdt, "Insufficient USDT allowance");
        require(usdt.transferFrom(msg.sender, address(this), totalUsdt), "USDT transfer failed");
        
        // 转移代币给买家
        IERC20Upgradeable token = IERC20Upgradeable(order.token);
        require(token.transfer(msg.sender, order.amount), "Token transfer failed");
        
        // 转移 USDT 给卖家（扣除手续费）
        require(usdt.transfer(order.seller, usdtAmount), "USDT transfer failed");
        
        // 转移手续费
        if (usdtFee > 0) {
            require(usdt.transfer(feeReceiver, usdtFee), "Fee transfer failed");
        }
        
        // 更新卖单状态
        order.active = false;
        
        // 更新最后交易时间
        _lastTrade[msg.sender] = block.timestamp;
        
        // 记录交易
        uint256 tradeId = _nextTradeId++;
        _trades[tradeId] = Trade({
            id: tradeId,
            orderId: sellOrderId,
            buyer: msg.sender,
            seller: order.seller,
            token: order.token,
            propertyId: order.propertyId,
            amount: order.amount,
            price: order.price,
            timestamp: block.timestamp,
            isSellOrder: true
        });
        
        _userTrades[msg.sender].push(tradeId);
        _userTrades[order.seller].push(tradeId);
        _tokenTrades[order.token].push(tradeId);
        
        emit OrderExecuted(
            sellOrderId,
            msg.sender,
            order.seller,
            order.token,
            order.propertyId,
            order.amount,
            order.price,
            tradeId,
            true,
            uint40(block.timestamp)
        );
    }

    /**
     * @dev 出售给买单
     */
    function sellOrder(uint256 buyOrderId) external whenNotPaused nonReentrant {
        // 获取买单信息
        Order storage order = _orders[buyOrderId];
        require(order.id != 0, "Order does not exist");
        require(order.active == true, "Order is not active");
        require(order.isSellOrder == false, "Not a buy order");
        
        // 检查交易限制
        require(order.amount >= minTradeAmount, "Amount below minimum");
        require(order.amount <= maxTradeAmount, "Amount above maximum");
        
        // 检查冷却期
        require(block.timestamp >= _lastTrade[msg.sender] + cooldownPeriod, "In cooldown period");
        
        // 检查卖家是否在黑名单中
        require(!blacklist[msg.sender], "Seller is blacklisted");
        
        // 检查并转移代币
        IERC20Upgradeable token = IERC20Upgradeable(order.token);
        require(token.allowance(msg.sender, address(this)) >= order.amount, "Insufficient token allowance");
        require(token.transferFrom(msg.sender, address(this), order.amount), "Token transfer failed");
        
        // 计算 USDT 金额（包含手续费）
        uint256 usdtAmount = order.amount * order.price;
        uint256 usdtFee = (usdtAmount * feeRate) / 10000;
        uint256 totalUsdt = usdtAmount + usdtFee;
        
        // 转移代币给买家
        require(token.transfer(order.seller, order.amount), "Token transfer failed");
        
        // 转移 USDT 给卖家（扣除手续费）
        IERC20Upgradeable usdt = IERC20Upgradeable(usdtAddress);
        require(usdt.transfer(msg.sender, usdtAmount), "USDT transfer failed");
        
        // 转移手续费
        if (usdtFee > 0) {
            require(usdt.transfer(feeReceiver, usdtFee), "Fee transfer failed");
        }
        
        // 更新买单状态
        order.active = false;
        
        // 更新最后交易时间
        _lastTrade[msg.sender] = block.timestamp;
        
        // 记录交易
        uint256 tradeId = _nextTradeId++;
        _trades[tradeId] = Trade({
            id: tradeId,
            orderId: buyOrderId,
            buyer: order.seller,
            seller: msg.sender,
            token: order.token,
            propertyId: order.propertyId,
            amount: order.amount,
            price: order.price,
            timestamp: block.timestamp,
            isSellOrder: false
        });
        
        _userTrades[order.seller].push(tradeId);
        _userTrades[msg.sender].push(tradeId);
        _tokenTrades[order.token].push(tradeId);
        
        emit OrderExecuted(
            buyOrderId,
            order.seller,
            msg.sender,
            order.token,
            order.propertyId,
            order.amount,
            order.price,
            tradeId,
            false,
            uint40(block.timestamp)
        );
    }
    
    // 接收ETH
    receive() external payable {}
}

