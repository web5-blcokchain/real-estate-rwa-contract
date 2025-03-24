// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RoleManager.sol";
import "./RealEstateToken.sol";
import "./FeeManager.sol";

/**
 * @title Marketplace
 * @dev 房产代币二级市场（可升级版本）
 */
contract Marketplace is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    RoleManager public roleManager;
    FeeManager public feeManager;
    // 移除 KYCManager 变量
    // KYCManager public kycManager;
    
    // 修改初始化函数
    function initialize(
        address _roleManager,
        address _feeManager
        // 移除 address _kycManager
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        feeManager = FeeManager(_feeManager);
    }

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
    
    // 事件
    event OrderCreated(uint256 orderId, address seller, address tokenAddress, uint256 tokenAmount, uint256 price, address stablecoin);
    event OrderFulfilled(uint256 orderId, address buyer);
    event OrderCancelled(uint256 orderId);
    event PriceUpdated(uint256 orderId, uint256 oldPrice, uint256 newPrice);
    event StablecoinStatusUpdated(address indexed token, bool status);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    // 存在两个 initialize 函数，第一个在第23-33行，第二个在第78-89行
    // 第一个函数已经正确移除了 KYC 相关代码
    function initialize(
        address _roleManager,
        address _feeManager
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        feeManager = FeeManager(_feeManager);
    }
    
    function initialize(
        address _roleManager,
        address _feeManager,
        address _tokenFactory
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        feeManager = FeeManager(_feeManager);
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
        supportedStablecoins[_stablecoin] = true;
        emit StablecoinStatusUpdated(_stablecoin, true);
    }

    /**
     * @dev 移除支持的稳定币
     * @param _stablecoin 稳定币地址
     */
    function removeSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        supportedStablecoins[_stablecoin] = false;
        emit StablecoinStatusUpdated(_stablecoin, false);
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
    ) external nonReentrant {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        // 移除 require(kycManager.isKYCVerified(msg.sender), "Seller not KYC verified");
        require(supportedStablecoins[stablecoinAddress], "Unsupported stablecoin");
        
        RealEstateToken token = RealEstateToken(tokenAddress);
        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        
        // 转移代币到合约
        token.transferFrom(msg.sender, address(this), tokenAmount);
        
        // 创建订单
        orderCount++;
        orders[orderCount] = Order({
            orderId: orderCount,
            seller: msg.sender,
            tokenAddress: tokenAddress,
            tokenAmount: tokenAmount,
            price: price,
            stablecoinAddress: stablecoinAddress,
            creationTime: block.timestamp,
            status: OrderStatus.Active
        });
        
        emit OrderCreated(orderCount, msg.sender, tokenAddress, tokenAmount, price, stablecoinAddress);
    }

    /**
     * @dev 购买订单
     * @param orderId 订单ID
     */
    // 修改 fulfillOrder 函数
    function fulfillOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Active, "Order not active");
        // 移除 require(kycManager.isKYCVerified(msg.sender), "Buyer not KYC verified");
        
        // 获取稳定币合约
        IERC20 stablecoin = IERC20(order.stablecoinAddress);
        
        // 检查买家是否有足够的稳定币余额和授权
        require(stablecoin.balanceOf(msg.sender) >= order.price, "Insufficient stablecoin balance");
        require(stablecoin.allowance(msg.sender, address(this)) >= order.price, "Insufficient stablecoin allowance");
        
        // 计算交易费用
        uint256 fee = feeManager.calculateFee(order.price, feeManager.tradingFee());
        uint256 sellerAmount = order.price - fee;
        
        // 转移稳定币给卖家
        require(stablecoin.transferFrom(msg.sender, order.seller, sellerAmount), "Failed to transfer to seller");
        
        // 转移费用给费用收集者
        require(stablecoin.transferFrom(msg.sender, feeManager.feeCollector(), fee), "Failed to transfer fee");
        
        // 转移代币给买家
        RealEstateToken token = RealEstateToken(order.tokenAddress);
        token.transfer(msg.sender, order.tokenAmount);
        
        // 更新订单状态
        order.status = OrderStatus.Fulfilled;
        
        emit OrderFulfilled(orderId, msg.sender);
    }

    /**
     * @dev 取消订单
     * @param orderId 订单ID
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Active, "Order not active");
        require(order.seller == msg.sender, "Not seller");
        
        // 返还代币给卖家
        RealEstateToken token = RealEstateToken(order.tokenAddress);
        token.transfer(order.seller, order.tokenAmount);
        
        // 更新订单状态
        order.status = OrderStatus.Cancelled;
        
        emit OrderCancelled(orderId);
    }

    /**
     * @dev 更新订单价格
     * @param orderId 订单ID
     * @param newPrice 新价格
     */
    function updatePrice(uint256 orderId, uint256 newPrice) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Active, "Order not active");
        require(order.seller == msg.sender, "Not seller");
        require(newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = order.price;
        order.price = newPrice;
        
        emit PriceUpdated(orderId, oldPrice, newPrice);
    }

    /**
     * @dev 获取活跃订单数量
     * @return 活跃订单数量
     */
    function getActiveOrderCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= orderCount; i++) {
            if (orders[i].status == OrderStatus.Active) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev 获取用户订单
     * @param user 用户地址
     * @return 订单ID数组
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        uint256 userOrderCount = 0;
        
        // 计算用户订单数量
        for (uint256 i = 1; i <= orderCount; i++) {
            if (orders[i].seller == user) {
                userOrderCount++;
            }
        }
        
        // 创建结果数组
        uint256[] memory result = new uint256[](userOrderCount);
        uint256 index = 0;
        
        // 填充结果数组
        for (uint256 i = 1; i <= orderCount; i++) {
            if (orders[i].seller == user) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}