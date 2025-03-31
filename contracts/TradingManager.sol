// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";

/**
 * @title TradingManager
 * @dev 简化版交易管理合约，整合市场和赎回功能
 */
contract TradingManager is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    // 版本控制
    uint256 public version;
    
    // 角色管理器
    SimpleRoleManager public roleManager;
    
    // 房产管理器
    PropertyManager public propertyManager;
    
    // 暂停状态
    bool public paused;
    
    // 交易费率 (基点，1% = 100)
    uint256 public tradingFee;
    
    // 支持的稳定币
    mapping(address => bool) public supportedStablecoins;
    address[] public stablecoinsList;
    
    // 费用收集地址
    address public feeCollector;
    
    // 订单状态
    enum OrderStatus {
        Active,
        Fulfilled,
        Cancelled
    }
    
    // 订单信息
    struct Order {
        uint256 orderId;
        address seller;
        address tokenAddress;
        uint256 tokenAmount;
        uint256 price;
        address stablecoinAddress;
        uint256 creationTime;
        OrderStatus status;
    }
    
    // 赎回状态
    enum RedemptionStatus {
        Pending,
        Approved,
        Rejected,
        Completed,
        Cancelled
    }
    
    // 赎回请求
    struct RedemptionRequest {
        uint256 requestId;
        string propertyId;
        address requester;
        address tokenAddress;
        uint256 tokenAmount;
        address stablecoinAddress;
        uint256 requestTime;
        uint256 approvalTime;
        uint256 completionTime;
        uint256 stablecoinAmount;
        RedemptionStatus status;
    }
    
    // 订单映射
    mapping(uint256 => Order) public orders;
    uint256 public orderCount;
    
    // 赎回请求映射
    mapping(uint256 => RedemptionRequest) public redemptionRequests;
    uint256 public requestCount;
    
    // 事件
    event OrderCreated(uint256 indexed orderId, address indexed seller, address tokenAddress, uint256 tokenAmount, uint256 price, address stablecoin);
    event OrderFulfilled(uint256 indexed orderId, address indexed buyer, uint256 price);
    event OrderCancelled(uint256 indexed orderId, address indexed seller);
    event RedemptionRequested(uint256 indexed requestId, address indexed requester, string indexed propertyId, address tokenAddress, uint256 tokenAmount);
    event RedemptionApproved(uint256 indexed requestId, address indexed approver, uint256 stablecoinAmount);
    event RedemptionRejected(uint256 indexed requestId, address indexed rejecter, string reason);
    event RedemptionCompleted(uint256 indexed requestId, address indexed completer);
    event RedemptionCancelled(uint256 indexed requestId, address indexed canceller);
    event FeeCollected(uint256 indexed orderId, uint256 amount, address token);
    event StablecoinStatusUpdated(address indexed token, bool status);
    event TradingFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event TradingManagerInitialized(address deployer, address roleManager, address propertyManager, uint256 version);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(
        address _roleManager,
        address _propertyManager
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        
        tradingFee = 100; // 默认1%
        feeCollector = msg.sender;
        version = 1;
        
        emit TradingManagerInitialized(msg.sender, _roleManager, _propertyManager, version);
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Caller is not an admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender), "Caller is not a manager");
        _;
    }
    
    /**
     * @dev 修饰器：检查合约是否暂停
     */
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyAdmin {
        paused = true;
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyAdmin {
        paused = false;
    }
    
    /**
     * @dev 设置交易费率
     */
    function setTradingFee(uint256 _fee) external onlyAdmin {
        require(_fee <= 1000, "Fee too high"); // 最高10%
        uint256 oldFee = tradingFee;
        tradingFee = _fee;
        emit TradingFeeUpdated(oldFee, _fee);
    }
    
    /**
     * @dev 设置费用收集地址
     */
    function setFeeCollector(address _collector) external onlyAdmin {
        require(_collector != address(0), "Invalid address");
        address oldCollector = feeCollector;
        feeCollector = _collector;
        emit FeeCollectorUpdated(oldCollector, _collector);
    }
    
    /**
     * @dev 添加支持的稳定币
     */
    function addSupportedStablecoin(address _stablecoin) external onlyAdmin {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        if (!supportedStablecoins[_stablecoin]) {
            supportedStablecoins[_stablecoin] = true;
            stablecoinsList.push(_stablecoin);
            emit StablecoinStatusUpdated(_stablecoin, true);
        }
    }
    
    /**
     * @dev 移除支持的稳定币
     */
    function removeSupportedStablecoin(address _stablecoin) external onlyAdmin {
        supportedStablecoins[_stablecoin] = false;
        emit StablecoinStatusUpdated(_stablecoin, false);
    }
    
    /**
     * @dev 计算费用
     */
    function calculateFee(uint256 amount) public view returns (uint256) {
        return (amount * tradingFee) / 10000;
    }
    
    /**
     * @dev 创建订单
     */
    function createOrder(
        address tokenAddress,
        uint256 tokenAmount,
        uint256 price,
        address stablecoinAddress
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(tokenAddress != address(0) && tokenAmount > 0 && price > 0, "Invalid parameters");
        require(supportedStablecoins[stablecoinAddress], "Unsupported stablecoin");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Transfer failed");
        
        uint256 orderId = ++orderCount;
        orders[orderId] = Order({
            orderId: orderId,
            seller: msg.sender,
            tokenAddress: tokenAddress,
            tokenAmount: tokenAmount,
            price: price,
            stablecoinAddress: stablecoinAddress,
            creationTime: block.timestamp,
            status: OrderStatus.Active
        });
        
        emit OrderCreated(orderId, msg.sender, tokenAddress, tokenAmount, price, stablecoinAddress);
        return orderId;
    }
    
    /**
     * @dev 完成订单
     */
    function fulfillOrder(uint256 orderId) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Active, "Order not active");
        
        IERC20 stablecoin = IERC20(order.stablecoinAddress);
        
        // 计算费用
        uint256 feeAmount = calculateFee(order.price);
        uint256 sellerAmount = order.price - feeAmount;
        
        // 转移稳定币
        require(stablecoin.transferFrom(msg.sender, address(this), order.price), "Transfer failed");
        require(stablecoin.transfer(order.seller, sellerAmount), "Seller transfer failed");
        
        if (feeAmount > 0) {
            require(stablecoin.transfer(feeCollector, feeAmount), "Fee transfer failed");
            emit FeeCollected(orderId, feeAmount, order.stablecoinAddress);
        }
        
        // 转移代币
        IERC20 token = IERC20(order.tokenAddress);
        require(token.transfer(msg.sender, order.tokenAmount), "Token transfer failed");
        
        // 更新订单状态
        order.status = OrderStatus.Fulfilled;
        
        emit OrderFulfilled(orderId, msg.sender, order.price);
    }
    
    /**
     * @dev 取消订单
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Active, "Order not active");
        require(order.seller == msg.sender, "Not order owner");
        
        // 退还代币
        IERC20 token = IERC20(order.tokenAddress);
        require(token.transfer(order.seller, order.tokenAmount), "Token transfer failed");
        
        // 更新订单状态
        order.status = OrderStatus.Cancelled;
        
        emit OrderCancelled(orderId, msg.sender);
    }
    
    /**
     * @dev 请求赎回
     */
    function requestRedemption(
        string memory propertyId,
        address tokenAddress,
        uint256 tokenAmount,
        address stablecoinAddress
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(bytes(propertyId).length > 0, "Property ID cannot be empty");
        require(PropertyManager(propertyManager).isPropertyApproved(propertyId), "Property not approved");
        require(supportedStablecoins[stablecoinAddress], "Unsupported stablecoin");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Transfer failed");
        
        uint256 requestId = ++requestCount;
        redemptionRequests[requestId] = RedemptionRequest({
            requestId: requestId,
            propertyId: propertyId,
            requester: msg.sender,
            tokenAddress: tokenAddress,
            tokenAmount: tokenAmount,
            stablecoinAddress: stablecoinAddress,
            requestTime: block.timestamp,
            approvalTime: 0,
            completionTime: 0,
            stablecoinAmount: 0,
            status: RedemptionStatus.Pending
        });
        
        emit RedemptionRequested(requestId, msg.sender, propertyId, tokenAddress, tokenAmount);
        return requestId;
    }
    
    /**
     * @dev 批准赎回请求
     */
    function approveRedemption(uint256 requestId, uint256 stablecoinAmount) external onlyManager {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Pending, "Request not pending");
        
        request.status = RedemptionStatus.Approved;
        request.stablecoinAmount = stablecoinAmount;
        request.approvalTime = block.timestamp;
        
        emit RedemptionApproved(requestId, msg.sender, stablecoinAmount);
    }
    
    /**
     * @dev 拒绝赎回请求
     */
    function rejectRedemption(uint256 requestId, string calldata reason) external onlyManager {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Pending, "Request not pending");
        
        // 退还代币
        IERC20 token = IERC20(request.tokenAddress);
        require(token.transfer(request.requester, request.tokenAmount), "Token transfer failed");
        
        request.status = RedemptionStatus.Rejected;
        
        emit RedemptionRejected(requestId, msg.sender, reason);
    }
    
    /**
     * @dev 完成赎回请求
     */
    function completeRedemption(uint256 requestId) external onlyManager nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Approved, "Request not approved");
        
        // 转移稳定币
        IERC20 stablecoin = IERC20(request.stablecoinAddress);
        require(stablecoin.transferFrom(msg.sender, request.requester, request.stablecoinAmount), "Transfer failed");
        
        // 销毁代币
        PropertyToken(request.tokenAddress).burn(request.tokenAmount);
        
        request.status = RedemptionStatus.Completed;
        request.completionTime = block.timestamp;
        
        emit RedemptionCompleted(requestId, msg.sender);
    }
    
    /**
     * @dev 取消赎回请求
     */
    function cancelRedemption(uint256 requestId) external nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.requester == msg.sender, "Not request owner");
        require(request.status == RedemptionStatus.Pending, "Request not pending");
        
        // 退还代币
        IERC20 token = IERC20(request.tokenAddress);
        require(token.transfer(request.requester, request.tokenAmount), "Token transfer failed");
        
        request.status = RedemptionStatus.Cancelled;
        
        emit RedemptionCancelled(requestId, msg.sender);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
} 