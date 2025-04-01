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
import "./RoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";
import "./TradingManager.sol";
import "./RewardManager.sol";
import "./RealEstateSystem.sol";
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
    RealEstateSystem public system;
    RoleManager public roleManager;
    
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
        
        system = RealEstateSystem(_system);
        roleManager = RoleManager(_roleManager);
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
        require(!RoleManager(roleManager).emergencyMode(), "Emergency mode active");
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
        require(system.getSystemStatus() == RealEstateSystem.SystemStatus.Active, "System not active");
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
        
        // 先将代币转移到交易管理器合约
        propertyToken.transferFrom(msg.sender, address(tradingManager), amount);
        
        // 2. 创建订单，跳过转账(已经转过了)
        orderId = tradingManager.createOrderWithoutTransfer(token, amount, price, propertyIdHash);
        
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
            ,
            address seller,
            ,
            ,
            ,
            ,
            bool active,
            
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
     * @dev 领取奖励
     */
    function claimRewards(uint256 distributionId) 
        external 
        whenNotPaused
        whenSystemActive
        nonReentrant 
    {
        // 1. 检查可领取金额
        (uint256 amount, bool canClaim,) = 
            rewardManager.getAvailableDistributionAmount(distributionId, msg.sender);
            
        require(canClaim, "No rewards to claim");
        
        // 2. 领取奖励
        rewardManager.withdrawDistribution(distributionId);
        
        emit RewardsClaimed(msg.sender, distributionId, amount);
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
            ,
            address seller,
            address token,
            uint256 amount,
            uint256 price,
            ,
            bool active,
            
        ) = tradingManager.getOrder(orderId);
        
        require(active, "Order not active");
        
        // 2. 执行交易
        tradingManager.executeOrder{value: msg.value}(orderId);
        
        emit TradeExecuted(orderId, msg.sender, seller);
    }
    
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
} 