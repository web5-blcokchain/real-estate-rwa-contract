// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";
import "./TradingManager.sol";
import "./RewardManager.sol";

/**
 * @title RealEstateFacade
 * @dev 不动产系统的业务操作门面合约，提供统一的业务流程接口
 */
contract RealEstateFacade is 
    Initializable, 
    UUPSUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuardUpgradeable {
    
    // 版本控制
    uint8 public version;
    
    // 系统合约
    SimpleRealEstateSystem public system;
    
    // 角色管理器
    SimpleRoleManager public roleManager;
    
    // 房产管理器
    PropertyManager public propertyManager;
    
    // 代币工厂
    PropertyToken public tokenFactory;
    
    // 交易管理器
    TradingManager public tradingManager;
    
    // 奖励管理器
    RewardManager public rewardManager;
    
    // 事件
    event PropertyListed(bytes32 indexed propertyIdHash, address indexed tokenAddress);
    event TradeExecuted(uint256 indexed orderId, address indexed buyer, address indexed seller);
    event RewardsClaimed(address indexed user, uint256 indexed distributionId, uint256 amount);
    event PropertyValuationUpdated(bytes32 indexed propertyIdHash, uint256 oldValue, uint256 newValue);
    event TradingLimitsUpdated(address indexed tokenAddress, uint256 minAmount, uint256 maxAmount);
    event OrderCreated(uint256 indexed orderId, address indexed seller, address indexed token, uint256 amount, uint256 price);
    event OrderCancelled(uint256 indexed orderId, address indexed seller);
    event DistributionCreated(uint256 indexed distributionId, bytes32 indexed propertyIdHash, uint256 amount, string description);
    event PropertyStatusUpdated(bytes32 indexed propertyIdHash, uint8 oldStatus, uint8 newStatus);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(
        address _system,
        address _roleManager,
        address _propertyManager,
        address _tokenFactory,
        address _tradingManager,
        address _rewardManager
    ) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        system = SimpleRealEstateSystem(_system);
        roleManager = SimpleRoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        tokenFactory = PropertyToken(_tokenFactory);
        tradingManager = TradingManager(_tradingManager);
        rewardManager = RewardManager(_rewardManager);
        
        version = 1;
    }
    
    /**
     * @dev 修饰器：检查系统状态
     */
    modifier whenSystemActive() {
        require(system.systemStatus() == SimpleRealEstateSystem.SystemStatus.Active, "System not active");
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
     * @dev 房产上架流程
     */
    function listProperty(
        string memory propertyId,
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 initialPrice,
        string memory location,
        string memory description
    ) 
        external 
        whenNotPaused
        whenSystemActive
        onlyManager
        nonReentrant
        returns (address tokenAddress) 
    {
        // 1. 注册房产
        bytes32 propertyIdHash = propertyManager.registerProperty(
            propertyId,
            location,
            description
        );
        
        // 2. 创建代币
        tokenAddress = tokenFactory.createToken(
            propertyId,
            name,
            symbol,
            initialSupply
        );
        
        // 3. 注册代币到房产
        propertyManager.registerTokenForProperty(propertyIdHash, tokenAddress);
        
        // 4. 设置初始价格
        tradingManager.setInitialPrice(tokenAddress, initialPrice);
        
        emit PropertyListed(propertyIdHash, tokenAddress);
        
        return tokenAddress;
    }
    
    /**
     * @dev 执行交易
     */
    function executeTrade(uint256 orderId) 
        external 
        payable 
        whenNotPaused
        whenSystemActive
        nonReentrant 
    {
        // 1. 获取订单信息
        (
            uint256 id,
            address seller,
            address token,
            uint256 amount,
            uint256 price,
            ,
            bool active,
            bytes32 propertyIdHash
        ) = tradingManager.getOrder(orderId);
        
        require(active, "Order not active");
        require(msg.value >= price * amount, "Insufficient payment");
        
        // 2. 执行交易
        uint256 tradeId = tradingManager.executeOrder(orderId);
        
        // 3. 转移代币
        PropertyToken(token).transfer(msg.sender, amount);
        
        // 4. 转移ETH
        payable(seller).transfer(price * amount);
        
        emit TradeExecuted(orderId, msg.sender, seller);
    }
    
    /**
     * @dev 领取奖励
     */
    function claimRewards(uint256 distributionId) 
        external 
        whenNotPaused
        whenSystemActive
        nonReentrant 
    {
        // 1. 检查可领取金额
        (uint256 amount, bool canClaim, address paymentToken) = 
            rewardManager.getClaimableAmount(distributionId, msg.sender);
            
        require(canClaim, "No rewards to claim");
        
        // 2. 领取奖励
        rewardManager.withdrawRewards(distributionId, msg.sender);
        
        emit RewardsClaimed(msg.sender, distributionId, amount);
    }
    
    /**
     * @dev 更新房产估值
     */
    function updatePropertyValuation(
        bytes32 propertyIdHash,
        uint256 newValue,
        string memory reason
    ) 
        external 
        whenNotPaused
        whenSystemActive
        onlyManager 
    {
        // 1. 获取当前估值
        uint256 oldValue = tradingManager.getCurrentPrice(propertyManager.propertyTokens(propertyIdHash));
        
        // 2. 更新估值
        tradingManager.setCurrentPrice(
            propertyManager.propertyTokens(propertyIdHash),
            newValue
        );
        
        emit PropertyValuationUpdated(propertyIdHash, oldValue, newValue);
    }
    
    /**
     * @dev 设置交易限制
     */
    function setTradingLimits(
        address tokenAddress,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 cooldownPeriod
    ) 
        external 
        whenNotPaused
        whenSystemActive
        onlyManager 
    {
        // 1. 设置最小交易金额
        tradingManager.setMinTradeAmount(minAmount);
        
        // 2. 设置最大交易金额
        tradingManager.setMaxTradeAmount(maxAmount);
        
        // 3. 设置冷却期
        tradingManager.setCooldownPeriod(cooldownPeriod);
        
        emit TradingLimitsUpdated(tokenAddress, minAmount, maxAmount);
    }
    
    /**
     * @dev 获取用户资产概览
     */
    function getUserAssetOverview(address user) 
        external 
        view 
        returns (
            uint256 totalProperties,
            uint256 totalTokens,
            uint256 totalValue,
            uint256 pendingRewards
        ) 
    {
        // 1. 获取用户拥有的代币
        address[] memory tokens = tokenFactory.getAllTokens();
        totalTokens = 0;
        totalValue = 0;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = PropertyToken(tokens[i]).balanceOf(user);
            if (balance > 0) {
                totalTokens++;
                totalValue += balance * tradingManager.getCurrentPrice(tokens[i]);
            }
        }
        
        // 2. 获取用户拥有的房产
        bytes32[] memory properties = propertyManager.getAllPropertyHashes();
        totalProperties = 0;
        
        for (uint256 i = 0; i < properties.length; i++) {
            if (PropertyToken(propertyManager.propertyTokens(properties[i])).balanceOf(user) > 0) {
                totalProperties++;
            }
        }
        
        // 3. 获取待领取奖励
        pendingRewards = rewardManager.getPendingRewards(user);
        
        return (totalProperties, totalTokens, totalValue, pendingRewards);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyManager 
    {
        require(!system.emergencyMode(), "Emergency mode active");
        version += 1;
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
        whenSystemActive
        nonReentrant 
        returns (uint256 orderId) 
    {
        // 1. 检查代币余额
        require(PropertyToken(token).balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // 2. 创建订单
        orderId = tradingManager.createOrder(token, amount, price);
        
        emit OrderCreated(orderId, msg.sender, token, amount, price);
        
        return orderId;
    }
    
    /**
     * @dev 取消卖单
     */
    function cancelOrder(uint256 orderId) 
        external 
        whenNotPaused
        whenSystemActive
        nonReentrant 
    {
        // 1. 获取订单信息
        (
            uint256 id,
            address seller,
            address token,
            uint256 amount,
            uint256 price,
            ,
            bool active,
            bytes32 propertyIdHash
        ) = tradingManager.getOrder(orderId);
        
        require(msg.sender == seller, "Not order owner");
        require(active, "Order not active");
        
        // 2. 取消订单
        tradingManager.cancelOrder(orderId);
        
        emit OrderCancelled(orderId, msg.sender);
    }
    
    /**
     * @dev 创建奖励分配
     */
    function createDistribution(
        bytes32 propertyIdHash,
        uint256 amount,
        string memory description,
        bool applyFees,
        address paymentToken
    ) 
        external 
        whenNotPaused
        whenSystemActive
        onlyManager
        nonReentrant 
        returns (uint256 distributionId) 
    {
        // 1. 获取房产代币
        address tokenAddress = propertyManager.propertyTokens(propertyIdHash);
        require(tokenAddress != address(0), "Property token not found");
        
        // 2. 创建分配
        distributionId = rewardManager.createDistribution(
            propertyIdHash,
            tokenAddress,
            amount,
            RewardManager.DistributionType.Dividend,
            description,
            applyFees,
            paymentToken
        );
        
        emit DistributionCreated(distributionId, propertyIdHash, amount, description);
        
        return distributionId;
    }
    
    /**
     * @dev 更新房产状态
     */
    function updatePropertyStatus(
        bytes32 propertyIdHash,
        PropertyManager.PropertyStatus newStatus
    ) 
        external 
        whenNotPaused
        whenSystemActive
        onlyManager 
    {
        // 1. 获取当前状态
        uint8 oldStatus = uint8(propertyManager.getPropertyStatus(propertyIdHash));
        
        // 2. 更新状态
        propertyManager.updatePropertyStatus(propertyIdHash, newStatus);
        
        emit PropertyStatusUpdated(propertyIdHash, oldStatus, uint8(newStatus));
    }
    
    /**
     * @dev 获取房产详细信息
     */
    function getPropertyDetails(bytes32 propertyIdHash) 
        external 
        view 
        returns (
            string memory propertyId,
            string memory location,
            string memory description,
            uint8 status,
            address tokenAddress,
            uint256 currentPrice,
            uint256 totalSupply,
            uint256 tradingVolume
        ) 
    {
        // 1. 获取房产基本信息
        (
            propertyId,
            location,
            description,
            status,
            tokenAddress
        ) = propertyManager.getProperty(propertyIdHash);
        
        // 2. 获取代币信息
        if (tokenAddress != address(0)) {
            PropertyToken token = PropertyToken(tokenAddress);
            currentPrice = tradingManager.getCurrentPrice(tokenAddress);
            totalSupply = token.totalSupply();
            tradingVolume = tradingManager.getTokenTradingVolume(tokenAddress);
        }
        
        return (
            propertyId,
            location,
            description,
            status,
            tokenAddress,
            currentPrice,
            totalSupply,
            tradingVolume
        );
    }
    
    /**
     * @dev 获取用户订单列表
     */
    function getUserOrders(address user) 
        external 
        view 
        returns (
            uint256[] memory orderIds,
            address[] memory tokens,
            uint256[] memory amounts,
            uint256[] memory prices,
            bool[] memory active
        ) 
    {
        // 1. 获取用户订单ID列表
        orderIds = tradingManager.getUserOrders(user);
        
        // 2. 获取订单详情
        uint256 length = orderIds.length;
        tokens = new address[](length);
        amounts = new uint256[](length);
        prices = new uint256[](length);
        active = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            (
                ,
                ,
                tokens[i],
                amounts[i],
                prices[i],
                ,
                active[i],
                
            ) = tradingManager.getOrder(orderIds[i]);
        }
        
        return (orderIds, tokens, amounts, prices, active);
    }
    
    /**
     * @dev 获取用户奖励列表
     */
    function getUserRewards(address user) 
        external 
        view 
        returns (
            uint256[] memory distributionIds,
            uint256[] memory amounts,
            bool[] memory claimed,
            string[] memory descriptions
        ) 
    {
        // 1. 获取所有分配ID
        distributionIds = rewardManager.getUserDistributions(user);
        
        // 2. 获取分配详情
        uint256 length = distributionIds.length;
        amounts = new uint256[](length);
        claimed = new bool[](length);
        descriptions = new string[](length);
        
        for (uint256 i = 0; i < length; i++) {
            (
                amounts[i],
                claimed[i],
                descriptions[i]
            ) = rewardManager.getDistributionInfo(distributionIds[i]);
        }
        
        return (distributionIds, amounts, claimed, descriptions);
    }
} 