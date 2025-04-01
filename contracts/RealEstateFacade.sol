// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";
import "./TradingManager.sol";
import "./RewardManager.sol";
import "./SimpleRealEstateSystem.sol";
import "./utils/SafeMath.sol";

/**
 * @title RealEstateFacade
 * @dev 不动产系统的业务操作门面合约，提供统一的业务流程接口
 */
contract RealEstateFacade is 
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable {
    
    using SafeMath for uint256;
    
    // Version control - using uint8 to save gas
    uint8 private constant VERSION = 1;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // System contracts
    SimpleRealEstateSystem public system;
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
    event SystemContractUpdated(address indexed oldSystem, address indexed newSystem);
    event RoleManagerUpdated(address indexed oldManager, address indexed newManager);
    event TokenSellOrderCreated(address indexed seller, address indexed token, uint256 amount, uint256 price, uint256 orderId);
    event DirectSellOrderCreated(address indexed seller, bytes32 indexed propertyIdHash, address indexed token, uint256 amount, uint256 price, uint256 orderId);
    event FacadeInitialized(
        address indexed deployer,
        address indexed system,
        address indexed roleManager,
        address propertyManager,
        address tradingManager,
        address rewardManager
    );
    event PropertyRegistered(
        bytes32 indexed propertyIdHash,
        string propertyId,
        string country,
        string metadataURI,
        address tokenAddress
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initializes the contract
     */
    function initialize(
        address _system,
        address _roleManager,
        address _propertyManager,
        address payable _tradingManager,
        address payable _rewardManager
    ) public initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        __AccessControl_init();
        
        system = SimpleRealEstateSystem(_system);
        roleManager = SimpleRoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        tradingManager = TradingManager(payable(_tradingManager));
        rewardManager = RewardManager(payable(_rewardManager));
        
        // Grant roles to msg.sender
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        
        emit FacadeInitialized(
            msg.sender,
            _system,
            _roleManager,
            _propertyManager,
            _tradingManager,
            _rewardManager
        );
    }
    
    /**
     * @dev Updates the system contract address
     */
    function updateSystemContract(address _newSystem) external onlyRole(ADMIN_ROLE) {
        require(_newSystem != address(0), "Invalid system address");
        address oldSystem = address(system);
        system = SimpleRealEstateSystem(_newSystem);
        emit SystemContractUpdated(oldSystem, _newSystem);
    }
    
    /**
     * @dev Updates the role manager contract address
     */
    function updateRoleManager(address _newManager) external onlyRole(ADMIN_ROLE) {
        require(_newManager != address(0), "Invalid manager address");
        address oldManager = address(roleManager);
        roleManager = SimpleRoleManager(_newManager);
        emit RoleManagerUpdated(oldManager, _newManager);
    }
    
    /**
     * @dev Pauses all operations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpauses all operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        require(!SimpleRoleManager(roleManager).emergencyMode(), "Emergency mode active");
    }
    
    /**
     * @dev Returns the version of the contract
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }
    
    /**
     * @dev 修饰器：检查系统状态
     */
    modifier whenSystemActive() {
        require(system.getSystemStatus() == SimpleRealEstateSystem.SystemStatus.Active, "System not active");
        _;
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
     * @dev 修饰器：只有OPERATOR角色可以调用
     */
    modifier onlyOperator() {
        require(roleManager.hasRole(roleManager.OPERATOR_ROLE(), msg.sender), "Not operator");
        _;
    }
    
    /**
     * @dev 注册新房产并创建对应的代币
     */
    function registerPropertyAndCreateToken(
        string memory propertyId,
        string memory country,
        string memory metadataURI,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        address propertyTokenImplementation
    ) external onlyRole(ADMIN_ROLE) whenNotPaused nonReentrant returns (bytes32, address) {
        require(propertyTokenImplementation != address(0), "Invalid implementation");
        
        // 注册房产
        propertyManager.registerProperty(propertyId, country, metadataURI);
        bytes32 propertyIdHash = propertyManager.propertyIdToHash(propertyId);
        
        // 部署代理合约
        bytes memory initData = abi.encodeWithSelector(
            PropertyToken(address(0)).initialize.selector,
            propertyIdHash,
            tokenName,
            tokenSymbol,
            initialSupply,
            msg.sender,
            address(roleManager)
        );
        
        // 使用系统合约作为ProxyAdmin
        address proxyAdmin = address(system);
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            propertyTokenImplementation,
            proxyAdmin,
            initData
        );
        
        // 记录代币地址
        address tokenAddress = address(proxy);
        
        // 注册代币和房产的关联
        propertyManager.registerTokenForProperty(propertyIdHash, tokenAddress);
        
        emit PropertyRegistered(
            propertyIdHash,
            propertyId,
            country,
            metadataURI,
            tokenAddress
        );
        
        return (propertyIdHash, tokenAddress);
    }
    
    /**
     * @dev 执行交易
     */
    function executeTrade(
        address token,
        uint256 amount,
        uint256 price,
        address seller
    ) external payable whenNotPaused nonReentrant {
        require(msg.value >= price.mul(amount), "Insufficient payment");
        
        // 查询代币的属性ID哈希
        PropertyToken propertyToken = PropertyToken(token);
        bytes32 propertyIdHash = propertyToken.propertyIdHash();
        
        // 执行交易
        uint256 orderId = tradingManager.createOrder(token, amount, price, propertyIdHash);
        tradingManager.executeOrder{value: msg.value}(orderId);
        
        // 转账给卖家
        uint256 totalAmount = price.mul(amount);
        payable(seller).transfer(totalAmount);
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
            rewardManager.getAvailableDistributionAmount(distributionId, msg.sender);
            
        require(canClaim, "No rewards to claim");
        
        // 2. 领取奖励
        rewardManager.withdrawDistribution(distributionId);
        
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
    function getUserAssetsOverview(address user) external view returns (
        uint256 totalValue,
        uint256[] memory tokenBalances,
        address[] memory tokens
    ) {
        tokens = tradingManager.getUserTokens(user);
        tokenBalances = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenBalances[i] = PropertyToken(tokens[i]).balanceOf(user);
            totalValue = totalValue.add(tokenBalances[i].mul(tradingManager.getCurrentPrice(tokens[i])));
        }
        
        return (totalValue, tokenBalances, tokens);
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
        
        // 获取属性ID哈希
        PropertyToken propertyToken = PropertyToken(token);
        bytes32 propertyIdHash = propertyToken.propertyIdHash();
        
        // 2. 创建订单
        orderId = tradingManager.createOrder(token, amount, price, propertyIdHash);
        
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
            uint8 status,
            uint40 registrationTime,
            string memory country,
            string memory metadataURI,
            address tokenAddress,
            uint256 currentPrice,
            uint256 totalSupply,
            uint256 tradingVolume
        ) 
    {
        // 1. 获取房产基本信息
        (
            status,
            registrationTime,
            country,
            metadataURI,
            tokenAddress
        ) = propertyManager.getPropertyDetails(propertyIdHash);
        
        // 2. 获取代币信息
        if (tokenAddress != address(0)) {
            PropertyToken token = PropertyToken(tokenAddress);
            currentPrice = tradingManager.getCurrentPrice(tokenAddress);
            totalSupply = token.totalSupply();
            tradingVolume = tradingManager.getTokenTradingVolume(tokenAddress);
        }
        
        return (
            status,
            registrationTime,
            country,
            metadataURI,
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
    
    /**
     * @dev 创建卖单
     */
    function createTokenSellOrder(address token, uint256 amount, uint256 price) 
        external 
        whenNotPaused
        whenSystemActive
        nonReentrant 
        returns (uint256 orderId)
    {
        // 1. 检查交易参数
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        
        // 2. 检查用户是否有足够的代币
        PropertyToken propertyToken = PropertyToken(token);
        require(propertyToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // 3. 获取属性ID哈希
        bytes32 propertyIdHash = propertyToken.propertyIdHash();
        
        // 4. 检查代币转移授权
        require(propertyToken.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        
        // 5. 先将代币转移到这个合约
        propertyToken.transferFrom(msg.sender, address(this), amount);
        
        // 6. 然后将代币授权给交易管理器
        propertyToken.approve(address(tradingManager), amount);
        
        // 7. 创建卖单
        uint256 orderId = tradingManager.createOrder(token, amount, price, propertyIdHash);
        
        emit TokenSellOrderCreated(
            msg.sender,
            token,
            amount,
            price,
            orderId
        );
        
        return orderId;
    }
    
    /**
     * @dev 创建卖单
     */
    function createDirectSellOrder(
        bytes32 propertyIdHash,
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
        // 1. 验证属性代币地址
        require(token != address(0), "Invalid token address");
        require(propertyManager.isPropertyApproved(propertyIdHash), "Property not active");
        require(propertyManager.propertyTokens(propertyIdHash) == token, "Token mismatch");
        
        // 2. 检查代币余额和授权
        PropertyToken propertyToken = PropertyToken(token);
        require(propertyToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(propertyToken.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        
        // 3. 转移代币到合约
        propertyToken.transferFrom(msg.sender, address(this), amount);
        
        // 4. 授权交易管理器使用代币
        propertyToken.approve(address(tradingManager), amount);
        
        // 5. 创建卖单
        orderId = tradingManager.createOrder(token, amount, price, propertyIdHash);
        
        emit DirectSellOrderCreated(
            msg.sender,
            propertyIdHash,
            token,
            amount,
            price,
            orderId
        );
        
        return orderId;
    }
    
    /**
     * @dev 从卖家购买房产
     */
    function buyFromSeller(
        address token,
        uint256 amount,
        uint256 price,
        address seller
    ) external payable whenNotPaused nonReentrant {
        require(msg.value >= price.mul(amount), "Insufficient payment");
        
        // 查询代币的属性ID哈希
        PropertyToken propertyToken = PropertyToken(token);
        bytes32 propertyIdHash = propertyToken.propertyIdHash();
        
        // 执行交易
        uint256 orderId = tradingManager.createOrder(token, amount, price, propertyIdHash);
        tradingManager.executeOrder{value: msg.value}(orderId);
        
        // 转账给卖家
        uint256 totalAmount = price.mul(amount);
        payable(seller).transfer(totalAmount);
    }
    
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
} 