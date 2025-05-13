// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./utils/RoleConstants.sol";
import "./RealEstateSystem.sol";
import "./PropertyToken.sol";
import "./utils/SafeMath.sol";

/// @custom:dev 日本房地产代币交易管理合约
contract TradingManager is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable {
    
    using SafeMath for uint256;
    using RoleConstants for bytes32;
    
    uint8 private constant VERSION = 1;
    RealEstateSystem public system;
    address public usdtAddress;
    
    // 订单状态
    mapping(uint256 => Order) private _orders;
    mapping(address => uint256[]) private _userOrders;
    mapping(address => uint256) private _lastTrade;
    
    uint256 private _nextOrderId;
    uint256 public feeRate;
    address public feeReceiver;
    uint256 public minTradeAmount;
    uint256 public maxTradeAmount;
    uint256 public cooldownPeriod;
    mapping(address => uint256) private _tokenPrices;
    mapping(address => bool) public blacklist;
    
    // 事件
    event OrderCreated(uint256 indexed orderId, address indexed seller, address indexed token, string propertyId, uint256 amount, uint256 price, bool isSellOrder, uint40 createTime);
    event OrderCancelled(uint256 indexed orderId, address indexed seller, uint40 cancelTime);
    event OrderExecuted(uint256 indexed orderId, address indexed buyer, address indexed seller, address token, string propertyId, uint256 amount, uint256 price, bool isSellOrder, uint40 executeTime);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate, uint40 updateTime);
    event FeeReceiverUpdated(address oldReceiver, address newReceiver, uint40 updateTime);
    event TradingStatusUpdated(bool paused, uint40 updateTime);
    event MinTradeAmountUpdated(uint256 oldAmount, uint256 newAmount, uint40 updateTime);
    event MaxTradeAmountUpdated(uint256 oldAmount, uint256 newAmount, uint40 updateTime);
    event CooldownPeriodUpdated(uint256 oldPeriod, uint256 newPeriod, uint40 updateTime);
    event AddressBlacklisted(address indexed account, bool status, uint40 updateTime);
    event EmergencyWithdrawalExecuted(address indexed recipient, uint256 amount, uint40 executeTime);
    
    // 紧急提款
    uint256 public emergencyTimelock;
    uint256 public requiredApprovals;
    mapping(address => bool) private _emergencyApprovals;
    uint256 private _approvalCount;
    uint256 private _emergencyTimestamp;
    bool private _emergencyActive;
    
    struct Order {
        uint256 id;
        address creator;
        address token;
        string propertyId;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
        bool active;
        bool isSellOrder;
    }
    
    /// @custom:dev 只有ADMIN角色可以调用
    modifier onlyAdmin() {
        require(system.checkRole(RoleConstants.ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }
    
    /// @custom:dev 只有MANAGER角色可以调用
    modifier onlyManager() {
        require(system.checkRole(RoleConstants.MANAGER_ROLE(), msg.sender), "Not manager");
        _;
    }
    
    /// @custom:dev 只有OPERATOR角色可以调用
    modifier onlyOperator() {
        require(system.checkRole(RoleConstants.OPERATOR_ROLE(), msg.sender), "Not operator");
        _;
    }
    
    /// @custom:dev 只有UPGRADER角色可以调用
    modifier onlyUpgrader() {
        require(system.checkRole(RoleConstants.UPGRADER_ROLE(), msg.sender), "Not upgrader");
        _;
    }
    
    /// @custom:dev 只有PAUSER角色可以调用
    modifier onlyPauser() {
        require(system.checkRole(RoleConstants.PAUSER_ROLE(), msg.sender), "Not pauser");
        _;
    }
    
    /// @custom:dev 初始化函数
    function initialize(address _systemAddress) public initializer {
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        _nextOrderId = 1;
        emergencyTimelock = 24 hours;
        requiredApprovals = 2;
        minTradeAmount = 1;
        maxTradeAmount = 1000000;
        cooldownPeriod = 10 seconds;
        feeRate = 50;
    }
    
    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
    }
    
    function setUsdtAddress(address _usdtAddress) external onlyAdmin {
        require(_usdtAddress != address(0), "USDT address cannot be zero");
        usdtAddress = _usdtAddress;
    }
    
    function calculateTradeAmount(uint256 amount, uint256 price) public view returns (uint256) {
        return amount * price;
    }
    
    function calculateFee(uint256 amount) public view returns (uint256) {
        return (amount * feeRate) / 10000;
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklist[account], "Account is blacklisted");
        _;
    }
    
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
        
        require(amount >= minTradeAmount, "Amount below minimum");
        require(amount <= maxTradeAmount, "Amount above maximum");
        
        require(!blacklist[msg.sender], "Seller is blacklisted");
        
        IERC20Upgradeable propertyToken = IERC20Upgradeable(token);
        
        uint256 tokenAllowance = propertyToken.allowance(msg.sender, address(this));
        require(tokenAllowance >= amount, "Insufficient token allowance");
        
        require(propertyToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        
        uint256 orderId = _nextOrderId++;
        _orders[orderId] = Order({
            id: orderId,
            creator: msg.sender,
            token: token,
            propertyId: propertyId,
            amount: amount,
            price: price,
            timestamp: block.timestamp,
            active: true,
            isSellOrder: true
        });
        
        _userOrders[msg.sender].push(orderId);
        
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
        
        require(amount >= minTradeAmount, "Amount below minimum");
        require(amount <= maxTradeAmount, "Amount above maximum");
        
        require(!blacklist[msg.sender], "Buyer is blacklisted");
        
        uint256 usdtAmount = amount * price;
        uint256 usdtFee = (usdtAmount * feeRate) / 10000;
        uint256 totalUsdt = usdtAmount + usdtFee;
        
        IERC20Upgradeable usdt = IERC20Upgradeable(usdtAddress);
        require(usdt.allowance(msg.sender, address(this)) >= totalUsdt, "Insufficient USDT allowance");
        require(usdt.transferFrom(msg.sender, address(this), totalUsdt), "USDT transfer failed");
        require(usdt.balanceOf(address(this)) >= totalUsdt, "USDT transfer failed");
        
        uint256 orderId = _nextOrderId++;
        _orders[orderId] = Order({
            id: orderId,
            creator: msg.sender,
            token: token,
            propertyId: propertyId,
            amount: amount,
            price: price,
            timestamp: block.timestamp,
            active: true,
            isSellOrder: false
        });
        
        _userOrders[msg.sender].push(orderId);
        
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
    
    function cancelOrder(uint256 orderId) external whenNotPaused nonReentrant {
        // ... existing implementation ...
    }
    
    function setFeeRate(uint256 _feeRate) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_feeRate <= 10000, "Fee rate too high");
        
        uint256 oldRate = feeRate;
        feeRate = _feeRate;
        
        emit FeeRateUpdated(oldRate, _feeRate, uint40(block.timestamp));
    }
    
    function setFeeReceiver(address _feeReceiver) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_feeReceiver != address(0), "Invalid fee receiver");
        
        address oldReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver, uint40(block.timestamp));
    }
    
    function setMinTradeAmount(uint256 _minTradeAmount) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_minTradeAmount <= maxTradeAmount, "Invalid min amount");
        
        uint256 oldAmount = minTradeAmount;
        minTradeAmount = _minTradeAmount;
        
        emit MinTradeAmountUpdated(oldAmount, _minTradeAmount, uint40(block.timestamp));
    }
    
    function setMaxTradeAmount(uint256 _maxTradeAmount) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_maxTradeAmount >= minTradeAmount, "Invalid max amount");
        
        uint256 oldAmount = maxTradeAmount;
        maxTradeAmount = _maxTradeAmount;
        
        emit MaxTradeAmountUpdated(oldAmount, _maxTradeAmount, uint40(block.timestamp));
    }
    
    function setCooldownPeriod(uint256 _cooldownPeriod) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_cooldownPeriod > 0, "Invalid cooldown period");
        
        uint256 oldPeriod = cooldownPeriod;
        cooldownPeriod = _cooldownPeriod;
        
        emit CooldownPeriodUpdated(oldPeriod, _cooldownPeriod, uint40(block.timestamp));
    }
    
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _pause();
        emit TradingStatusUpdated(true, uint40(block.timestamp));
    }
    
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _unpause();
        emit TradingStatusUpdated(false, uint40(block.timestamp));
    }
    
    function setBlacklistStatus(address account, bool status) external {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(account != address(0), "Invalid account");
        
        blacklist[account] = status;
        
        emit AddressBlacklisted(account, status, uint40(block.timestamp));
    }
    
    function getOrder(uint256 orderId)
        external
        view
        returns (
            uint256 id,
            address seller,
            address token,
            string memory propertyId,
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
            order.creator,
            order.token,
            order.propertyId,
            order.amount,
            order.price,
            order.timestamp,
            order.active,
            order.isSellOrder
        );
    }
    
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return _userOrders[user];
    }
    
    function setTokenPrice(address token, uint256 price)
        external
        onlyManager
    {
        _tokenPrices[token] = price;
    }
    
    function getTokenPrice(address token) external view returns (uint256) {
        return _tokenPrices[token];
    }
    
    function setEmergencyTimelock(uint256 _timelock) 
        external 
        onlyAdmin
    {
        emergencyTimelock = _timelock;
    }
    
    function setRequiredApprovals(uint256 _required) 
        external 
        onlyAdmin
    {
        requiredApprovals = _required;
    }
    
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
    
    function approveEmergencyWithdrawal() 
        external 
        onlyAdmin
    {
        require(_emergencyActive, "Emergency withdrawal not active");
        require(!_emergencyApprovals[msg.sender], "Already approved");
        
        _emergencyApprovals[msg.sender] = true;
        _approvalCount += 1;
    }
    
    function executeEmergencyWithdrawal(address payable recipient) 
        external 
        onlyAdmin
    {
        require(_emergencyActive, "Emergency withdrawal not active");
        require(_approvalCount >= requiredApprovals, "Not enough approvals");
        require(block.timestamp >= _emergencyTimestamp + emergencyTimelock, "Timelock not expired");
        
        recipient.transfer(address(this).balance);
        
        _emergencyActive = false;
        _approvalCount = 0;
        _emergencyTimestamp = 0;
        
        emit EmergencyWithdrawalExecuted(recipient, address(this).balance, uint40(block.timestamp));
    }
    
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(RoleConstants.UPGRADER_ROLE()) 
    {
        require(!system.emergencyMode(), "Emergency mode active");
    }
    
    function getMinTradeAmount() external view returns (uint256) {
        return minTradeAmount;
    }
    
    function getMaxTradeAmount() external view returns (uint256) {
        return maxTradeAmount;
    }
    
    function getCooldownPeriod() external view returns (uint256) {
        return cooldownPeriod;
    }
    
    function buyOrder(uint256 sellOrderId) external whenNotPaused nonReentrant {
        Order storage order = _orders[sellOrderId];
        require(order.id != 0, "Order does not exist");
        require(order.active == true, "Order is not active");
        require(order.isSellOrder == true, "Not a sell order");
        
        require(order.amount >= minTradeAmount, "Amount below minimum");
        require(order.amount <= maxTradeAmount, "Amount above maximum");
        
        require(block.timestamp >= _lastTrade[msg.sender] + cooldownPeriod, "In cooldown period");
        
        require(!blacklist[msg.sender], "Buyer is blacklisted");
        
        uint256 usdtAmount = order.amount * order.price;
        uint256 usdtFee = (usdtAmount * feeRate) / 10000;
        uint256 totalUsdt = usdtAmount + usdtFee;
        
        IERC20Upgradeable usdt = IERC20Upgradeable(usdtAddress);
        require(usdt.allowance(msg.sender, address(this)) >= totalUsdt, "Insufficient USDT allowance");
        require(usdt.transferFrom(msg.sender, address(this), totalUsdt), "USDT transfer failed");
        
        IERC20Upgradeable token = IERC20Upgradeable(order.token);
        require(token.transfer(msg.sender, order.amount), "Token transfer failed");
        
        require(usdt.transfer(order.creator, usdtAmount), "USDT transfer failed");
        
        if (usdtFee > 0) {
            require(usdt.transfer(feeReceiver, usdtFee), "Fee transfer failed");
        }
        
        order.active = false;
        
        _lastTrade[msg.sender] = block.timestamp;
        
        emit OrderExecuted(
            sellOrderId,
            msg.sender,
            order.creator,
            order.token,
            order.propertyId,
            order.amount,
            order.price,
            true,
            uint40(block.timestamp)
        );
    }

    function sellOrder(uint256 buyOrderId) external whenNotPaused nonReentrant {
        Order storage order = _orders[buyOrderId];
        require(order.id != 0, "Order does not exist");
        require(order.active == true, "Order is not active");
        require(order.isSellOrder == false, "Not a buy order");
        
        require(order.amount >= minTradeAmount, "Amount below minimum");
        require(order.amount <= maxTradeAmount, "Amount above maximum");
        
        require(block.timestamp >= _lastTrade[msg.sender] + cooldownPeriod, "In cooldown period");
        
        require(!blacklist[msg.sender], "Seller is blacklisted");
        
        IERC20Upgradeable token = IERC20Upgradeable(order.token);
        require(token.allowance(msg.sender, address(this)) >= order.amount, "Insufficient token allowance");
        require(token.transferFrom(msg.sender, address(this), order.amount), "Token transfer failed");
        require(token.transfer(order.creator, order.amount), "Token transfer failed");
        
        uint256 usdtAmount = order.amount * order.price;
        uint256 usdtFee = (usdtAmount * feeRate) / 10000;
        uint256 totalUsdt = usdtAmount + usdtFee;
        
        IERC20Upgradeable usdt = IERC20Upgradeable(usdtAddress);
        require(usdt.balanceOf(address(this)) >= totalUsdt, "Insufficient USDT balance in contract");
        
        require(usdt.transfer(msg.sender, usdtAmount), "USDT transfer failed");
        
        if (usdtFee > 0) {
            require(usdt.transfer(feeReceiver, usdtFee), "Fee transfer failed");
        }
        
        order.active = false;
        
        _lastTrade[msg.sender] = block.timestamp;
        
        emit OrderExecuted(
            buyOrderId,
            order.creator,
            msg.sender,
            order.token,
            order.propertyId,
            order.amount,
            order.price,
            false,
            uint40(block.timestamp)
        );
    }
    
    receive() external payable {}
}

