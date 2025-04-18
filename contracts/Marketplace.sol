// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";  // 添加 IERC20 导入
import "./RoleManager.sol";
import "./FeeManager.sol";  // 添加 FeeManager 导入
import "./RealEstateToken.sol";  // 添加 RealEstateToken 导入

/**
 * @title Marketplace
 * @dev 房产通证交易市场合约，支持创建/取消订单和完成交易
 */
contract Marketplace is 
    Initializable, 
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable {  // 添加继承
    RoleManager public roleManager;
    FeeManager public feeManager;
    
    // 合约版本，用于追踪升级
    uint256 public version;
    
    // 暂停状态标志
    bool public paused;
    
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
        address stablecoinAddress; // 支付的稳定币地址
        uint256 creationTime;
        OrderStatus status;
    }

    // 订单映射
    mapping(uint256 => Order) public orders;
    
    // 订单计数
    uint256 public orderCount;
    
    // 支持的稳定币列表
    mapping(address => bool) public supportedStablecoins;
    
    // 添加一个数组来存储所有支持的稳定币地址
    address[] private supportedStablecoinsList;
    
    // 错误定义
    error InvalidOrderStatus(uint256 orderId, OrderStatus currentStatus);
    error UnsupportedStablecoin(address stablecoin);
    error NotOrderOwner(uint256 orderId, address caller);
    error InsufficientTokenAllowance(address token, uint256 required, uint256 actual);
    error InvalidOrderParameters();
    error TransferFailed();
    
    // 事件
    event OrderCreated(uint256 indexed orderId, address indexed seller, address tokenAddress, uint256 tokenAmount, uint256 price, address stablecoin);
    event OrderFulfilled(uint256 indexed orderId, address indexed buyer, uint256 price);
    event OrderCancelled(uint256 indexed orderId, address indexed seller);
    event PriceUpdated(uint256 indexed orderId, uint256 oldPrice, uint256 newPrice);
    event StablecoinStatusUpdated(address indexed token, bool status);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    event MarketplaceInitialized(address deployer, address roleManager, address feeManager, uint256 version);
    event TradingFeeCollected(uint256 orderId, uint256 feeAmount, address feeToken);
    event MarketplacePaused(address indexed admin);
    event MarketplaceUnpaused(address indexed admin);
    event EmergencyWithdraw(address indexed admin, address indexed token, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize(
        address _roleManager,
        address _feeManager
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        feeManager = FeeManager(_feeManager);
        version = 1;
        
        emit MarketplaceInitialized(msg.sender, _roleManager, _feeManager, version);
    }

    /**
     * @dev 修饰器：只有超级管理员可以调用
     */
    modifier onlySuperAdmin() {
        require(roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), "Caller is not a super admin");
        _;
    }

    /**
     * @dev 添加支持的稳定币
     * @param _stablecoin 稳定币地址
     */
    function addSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        // 只有首次添加时才加入列表
        if (!supportedStablecoins[_stablecoin]) {
            supportedStablecoins[_stablecoin] = true;
            supportedStablecoinsList.push(_stablecoin);
            emit StablecoinStatusUpdated(_stablecoin, true);
        }
    }

    /**
     * @dev 移除支持的稳定币
     * @param _stablecoin 稳定币地址
     */
    function removeSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        // 检查稳定币是否已经在支持列表中
        if (supportedStablecoins[_stablecoin]) {
            // 从映射中移除
            supportedStablecoins[_stablecoin] = false;
            emit StablecoinStatusUpdated(_stablecoin, false);
        }
    }

    /**
     * @dev 修饰器：检查合约是否处于暂停状态
     */
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    /**
     * @dev 暂停合约交易
     */
    function pause() external onlySuperAdmin {
        paused = true;
        emit MarketplacePaused(msg.sender);
    }
    
    /**
     * @dev 恢复合约交易
     */
    function unpause() external onlySuperAdmin {
        paused = false;
        emit MarketplaceUnpaused(msg.sender);
    }

    /**
     * @dev 创建订单
     * @param tokenAddress 代币地址
     * @param tokenAmount 代币数量
     * @param price 价格
     * @param stablecoinAddress 支付的稳定币地址
     */
    function createOrder(
        address tokenAddress,
        uint256 tokenAmount,
        uint256 price,
        address stablecoinAddress
    ) external nonReentrant whenNotPaused returns (uint256) {
        // 参数验证
        if (tokenAddress == address(0) || tokenAmount == 0 || price == 0 || stablecoinAddress == address(0)) {
            revert InvalidOrderParameters();
        }
        
        // 检查稳定币是否支持
        if (!supportedStablecoins[stablecoinAddress]) {
            revert UnsupportedStablecoin(stablecoinAddress);
        }
        
        // 检查代币授权
        IERC20 token = IERC20(tokenAddress);
        uint256 allowance = token.allowance(msg.sender, address(this));
        if (allowance < tokenAmount) {
            revert InsufficientTokenAllowance(tokenAddress, tokenAmount, allowance);
        }
        
        // 转移代币到市场合约
        bool success = token.transferFrom(msg.sender, address(this), tokenAmount);
        if (!success) {
            revert TransferFailed();
        }
        
        // 创建订单
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
     * @param orderId 订单ID
     */
    function fulfillOrder(uint256 orderId) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];
        
        // 检查订单状态
        if (order.status != OrderStatus.Active) {
            revert InvalidOrderStatus(orderId, order.status);
        }
        
        // 获取订单详情
        address seller = order.seller;
        address tokenAddress = order.tokenAddress;
        uint256 tokenAmount = order.tokenAmount;
        uint256 price = order.price;
        address stablecoinAddress = order.stablecoinAddress;
        
        // 计算交易费用
        IERC20 stablecoin = IERC20(stablecoinAddress);
        uint256 tradingFee = (price * feeManager.tradingFee()) / 10000;
        uint256 sellerAmount = price - tradingFee;
        
        // 验证总额是否准确（防止舍入误差）
        require(tradingFee + sellerAmount == price, "Fee calculation error");
        
        // 检查买家的稳定币授权
        uint256 allowance = stablecoin.allowance(msg.sender, address(this));
        if (allowance < price) {
            revert InsufficientTokenAllowance(stablecoinAddress, price, allowance);
        }
        
        // 先更新订单状态
        order.status = OrderStatus.Fulfilled;

        // 触发订单完成事件
        emit OrderFulfilled(orderId, msg.sender, price);
        
        // 转移稳定币（从买家到卖家和平台）
        bool stablecoinSuccess = stablecoin.transferFrom(msg.sender, seller, sellerAmount);
        if (!stablecoinSuccess) {
            revert TransferFailed();
        }
        
        // 如果有交易费，转移到费用收集地址
        if (tradingFee > 0) {
            address feeCollector = feeManager.feeCollector();
            bool feeSuccess = stablecoin.transferFrom(msg.sender, feeCollector, tradingFee);
            if (!feeSuccess) {
                revert TransferFailed();
            }
            emit TradingFeeCollected(orderId, tradingFee, stablecoinAddress);
        }
        
        // 转移代币到买家
        IERC20 token = IERC20(tokenAddress);
        bool tokenSuccess = token.transfer(msg.sender, tokenAmount);
        if (!tokenSuccess) {
            revert TransferFailed();
        }
        
        // 记录交易费用
        uint256 feeTypeValue = 1; // FeeManager.FeeType.TRADING 的枚举值
        feeManager.collectFee(tradingFee, FeeManager.FeeType(feeTypeValue), msg.sender);
    }

    /**
     * @dev 取消订单
     * @param orderId 订单ID
     */
    function cancelOrder(uint256 orderId) external nonReentrant whenNotPaused {
        Order storage order = orders[orderId];
        
        // 检查订单状态
        if (order.status != OrderStatus.Active) {
            revert InvalidOrderStatus(orderId, order.status);
        }
        
        // 检查是否是订单创建者或超级管理员
        if (order.seller != msg.sender && !roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender)) {
            revert NotOrderOwner(orderId, msg.sender);
        }
        
        // 先更新订单状态
        order.status = OrderStatus.Cancelled;
        
        // 触发取消事件
        emit OrderCancelled(orderId, msg.sender);
        
        // 返还代币给卖家
        IERC20 token = IERC20(order.tokenAddress);
        bool success = token.transfer(order.seller, order.tokenAmount);
        if (!success) {
            revert TransferFailed();
        }
    }

    /**
     * @dev 更新订单价格
     * @param orderId 订单ID
     * @param newPrice 新价格
     */
    function updateOrderPrice(uint256 orderId, uint256 newPrice) external whenNotPaused {
        require(newPrice > 0, "Invalid price");
        
        Order storage order = orders[orderId];
        
        // 检查订单状态
        if (order.status != OrderStatus.Active) {
            revert InvalidOrderStatus(orderId, order.status);
        }
        
        // 检查是否是订单创建者
        if (order.seller != msg.sender) {
            revert NotOrderOwner(orderId, msg.sender);
        }
        
        // 更新价格
        uint256 oldPrice = order.price;
        order.price = newPrice;
        
        emit PriceUpdated(orderId, oldPrice, newPrice);
    }

    /**
     * @dev 获取订单详情
     * @param orderId 订单ID
     */
    function getOrder(uint256 orderId) external view returns (
        address seller,
        address tokenAddress,
        uint256 tokenAmount,
        uint256 price,
        address stablecoin,
        uint256 creationTime,
        OrderStatus status
    ) {
        Order storage order = orders[orderId];
        return (
            order.seller,
            order.tokenAddress,
            order.tokenAmount,
            order.price,
            order.stablecoinAddress,
            order.creationTime,
            order.status
        );
    }

    /**
     * @dev 获取卖家的活跃订单
     * @param seller 卖家地址
     */
    function getSellerActiveOrders(address seller) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // 首先计算活跃订单数量
        for (uint256 i = 1; i <= orderCount; i++) {
            if (orders[i].seller == seller && orders[i].status == OrderStatus.Active) {
                count++;
            }
        }
        
        // 创建结果数组
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        // 填充结果数组
        for (uint256 i = 1; i <= orderCount; i++) {
            if (orders[i].seller == seller && orders[i].status == OrderStatus.Active) {
                result[index++] = i;
            }
        }
        
        return result;
    }

    /**
     * @dev 检查稳定币是否被支持
     * @param stablecoin 稳定币地址
     */
    function isStablecoinSupported(address stablecoin) external view returns (bool) {
        return supportedStablecoins[stablecoin];
    }
    
    /**
     * @dev 获取支持的稳定币列表
     * @param offset 起始偏移量（分页用）
     * @param limit 数量限制（分页用）
     * @return 支持的稳定币地址数组
     */
    function getSupportedStablecoins(uint256 offset, uint256 limit) external view returns (address[] memory) {
        // 获取活跃的稳定币总数
        uint256 activeCount = 0;
        for (uint256 i = 0; i < supportedStablecoinsList.length; i++) {
            if (supportedStablecoins[supportedStablecoinsList[i]]) {
                activeCount++;
            }
        }
        
        // 处理分页参数
        if (offset >= activeCount) {
            return new address[](0);
        }
        
        uint256 resultSize = (activeCount - offset) < limit ? (activeCount - offset) : limit;
        address[] memory result = new address[](resultSize);
        
        // 填充结果数组
        uint256 current = 0;
        uint256 added = 0;
        
        for (uint256 i = 0; i < supportedStablecoinsList.length && added < resultSize; i++) {
            address stablecoin = supportedStablecoinsList[i];
            if (supportedStablecoins[stablecoin]) {
                if (current >= offset) {
                    result[added] = stablecoin;
                    added++;
                }
                current++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {
        // 更新版本号
        uint256 oldVersion = version;
        version += 1;
        emit VersionUpdated(oldVersion, version);
    }
    
    /**
     * @dev 紧急提取代币（用于意外情况）
     * @param tokenAddress 代币地址
     * @param amount 数量
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlySuperAdmin nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than zero");
        
        // 计算该代币在活跃订单中的锁定总量
        uint256 lockedAmount = 0;
        for (uint256 i = 1; i <= orderCount; i++) {
            Order storage order = orders[i];
            if (order.status == OrderStatus.Active && order.tokenAddress == tokenAddress) {
                lockedAmount += order.tokenAmount;
            }
        }
        
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        
        // 确保提取后剩余数量足够支付所有活跃订单
        require(balance - amount >= lockedAmount, "Cannot withdraw locked tokens");
        
        // 记录事件，然后进行转账
        emit EmergencyWithdraw(msg.sender, tokenAddress, amount);
        
        bool success = token.transfer(msg.sender, amount);
        require(success, "Transfer failed");
    }
}