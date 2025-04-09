// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "./utils/RoleConstants.sol";
import "./RealEstateSystem.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";
import "./TradingManager.sol";
import "./RewardManager.sol";
import "./utils/SafeMath.sol";

/**
 * @title RealEstateFacade
 * @dev 不动产系统的业务操作门面合约，提供统一的业务流程接口
 */
contract RealEstateFacade is 
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable {
    
    using SafeMath for uint256;
    
    // Version control - using uint8 to save gas
    uint8 private constant VERSION = 1;
    
    // 系统合约引用
    RealEstateSystem public system;
    
    // 房产管理器
    PropertyManager public propertyManager;
    
    // 代币工厂
    PropertyToken public propertyTokenContract;
    
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
    event TokenSellOrderCreated(address indexed seller, address indexed token, uint256 amount, uint256 price, uint256 orderId);
    event DirectSellOrderCreated(address indexed seller, bytes32 indexed propertyIdHash, address indexed token, uint256 amount, uint256 price, uint256 orderId);
    event FacadeInitialized(
        address indexed deployer,
        address indexed system,
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
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initializes the contract
     */
    function initialize(
        address _systemAddress,
        address _propertyManager,
        address payable _tradingManager,
        address payable _rewardManager
    ) public initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        
        propertyManager = PropertyManager(_propertyManager);
        tradingManager = TradingManager(payable(_tradingManager));
        rewardManager = RewardManager(payable(_rewardManager));
        
        emit FacadeInitialized(
            msg.sender,
            _systemAddress,
            _propertyManager,
            _tradingManager,
            _rewardManager
        );
    }
    
    /**
     * @dev 设置系统合约
     */
    function setSystem(address _systemAddress) external onlyAdmin {
        address oldSystem = address(system);
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        emit SystemContractUpdated(oldSystem, _systemAddress);
    }
    
    /**
     * @dev Pauses all operations
     */
    function pause() external onlyPauser {
        _pause();
    }
    
    /**
     * @dev Unpauses all operations
     */
    function unpause() external onlyPauser {
        _unpause();
    }
    
    /**
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {
        require(!system.emergencyMode(), "Emergency mode active");
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
    ) public onlyAdmin whenNotPaused nonReentrant returns (bytes32, address) {
        require(propertyTokenImplementation != address(0), "Invalid implementation");
        
        // 注册房产
        propertyManager.registerProperty(propertyId, country, metadataURI);
        
        // 直接计算哈希值，不使用已移除的propertyIdToHash
        bytes32 propertyIdHash = keccak256(abi.encodePacked(propertyId));
        
        // 部署代理合约
        bytes memory initData = abi.encodeWithSelector(
            PropertyToken(address(0)).initialize.selector,
            propertyIdHash,
            tokenName,
            tokenSymbol,
            initialSupply,
            msg.sender,
            address(system)
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
        propertyManager.registerTokenForProperty(propertyId, tokenAddress);
        
        // 触发事件
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
     * @dev 设置代币工厂模板
     */
    function setPropertyTokenContract(address _tokenContract) external onlyAdmin {
        require(_tokenContract != address(0), "Invalid contract address");
        propertyTokenContract = PropertyToken(_tokenContract);
    }
    
    /**
     * @dev 更新房产状态
     */
    function updatePropertyStatus(string memory propertyId, uint8 status) 
        external 
        onlyManager
        whenNotPaused 
    {
        bytes32 propertyIdHash = keccak256(abi.encodePacked(propertyId));
        uint8 oldStatus = uint8(propertyManager.getPropertyStatus(propertyId));
        
        propertyManager.updatePropertyStatus(propertyId, PropertyManager.PropertyStatus(status));
        
        emit PropertyStatusUpdated(propertyIdHash, oldStatus, status);
    }
    
    /**
     * @dev 创建代币出售订单
     */
    function createTokenSellOrder(
        address token,
        uint256 amount,
        uint256 price
    ) 
        external 
        whenNotPaused 
        nonReentrant
        onlyOperator
        returns (uint256) 
    {
        // 验证代币是否为有效房产代币
        PropertyToken tokenContract = PropertyToken(token);
        bytes32 propertyIdHash = tokenContract.propertyIdHash();
        
        uint256 orderId = tradingManager.createOrder(token, amount, price, propertyIdHash);
        
        emit TokenSellOrderCreated(msg.sender, token, amount, price, orderId);
        
        return orderId;
    }
    
    /**
     * @dev 取消订单
     */
    function cancelOrder(uint256 orderId) 
        external 
        whenNotPaused 
        nonReentrant
        onlyOperator
    {
        tradingManager.cancelOrder(orderId);
        
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
        returns (uint256) 
    {
        uint256 tradeId = tradingManager.executeOrder{value: msg.value}(orderId);
        
        (
            uint256 id,
            uint256 orderId,
            address buyer,
            address seller,
            address token,
            uint256 amount,
            uint256 price,
            ,
            bytes32 propertyIdHash
        ) = tradingManager.getTrade(tradeId);
        
        emit TradeExecuted(id, buyer, seller);
        
        return tradeId;
    }
    
    /**
     * @dev 直接创建并执行代币出售
     */
    function directSell(
        address token,
        uint256 amount,
        uint256 price,
        address buyer
    ) 
        external 
        whenNotPaused 
        nonReentrant
        onlyOperator
        returns (uint256) 
    {
        // 验证代币是否为有效房产代币
        PropertyToken tokenContract = PropertyToken(token);
        bytes32 propertyIdHash = tokenContract.propertyIdHash();
        
        // 创建订单
        uint256 orderId = tradingManager.createOrder(token, amount, price, propertyIdHash);
        
        // 记录原始卖家
        address seller = msg.sender;
        
        // 由买家完成交易
        // TODO: 实现让指定买家完成交易的逻辑
        
        emit DirectSellOrderCreated(seller, propertyIdHash, token, amount, price, orderId);
        
        return orderId;
    }
    
    /**
     * @dev 创建租金或分红分配
     */
    function createDistribution(
        bytes32 propertyIdHash,
        address tokenAddress,
        uint256 amount,
        string memory description,
        uint8 distributionType,
        address paymentToken
    ) 
        external 
        payable
        whenNotPaused 
        nonReentrant
        onlyManager
        returns (uint256) 
    {
        // 验证代币地址与房产匹配
        PropertyToken token = PropertyToken(tokenAddress);
        require(token.propertyIdHash() == propertyIdHash, "Token does not match property");
        
        // 创建快照
        uint256 snapshotId = token.snapshot();
        
        // 创建分配
        uint256 distributionId = rewardManager.createDistribution{value: msg.value}(
            propertyIdHash,
            tokenAddress,
            snapshotId,
            amount,
            description,
            RewardManager.DistributionType(distributionType),
            paymentToken
        );
        
        emit DistributionCreated(distributionId, propertyIdHash, amount, description);
        
        return distributionId;
    }
    
    /**
     * @dev 提取分配
     */
    function withdrawDistribution(uint256 distributionId)
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        uint256 amount = rewardManager.withdraw(distributionId);
        
        emit RewardsClaimed(msg.sender, distributionId, amount);
        
        return amount;
    }
    
    /**
     * @dev 一键创建房产、代币和初始分配
     */
    function oneClickPropertySetup(
        string memory propertyId,
        string memory country,
        string memory metadataURI,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        address propertyTokenImplementation,
        uint256 initialDistributionAmount,
        string memory distributionDescription,
        address paymentToken
    ) 
        external 
        payable
        onlyAdmin
        whenNotPaused 
        nonReentrant
        returns (bytes32, address, uint256) 
    {
        // 1. 注册房产并创建代币
        (bytes32 propertyIdHash, address tokenAddress) = registerPropertyAndCreateToken(
            propertyId,
            country,
            metadataURI,
            tokenName,
            tokenSymbol,
            initialSupply,
            propertyTokenImplementation
        );
        
        // 2. 创建初始分配
        uint256 distributionId = 0;
        if (initialDistributionAmount > 0) {
            // 创建快照
            PropertyToken token = PropertyToken(tokenAddress);
            uint256 snapshotId = token.snapshot();
            
            // 创建分配
            distributionId = rewardManager.createDistribution{value: msg.value}(
                propertyIdHash,
                tokenAddress,
                snapshotId,
                initialDistributionAmount,
                distributionDescription,
                RewardManager.DistributionType(0), // Dividend
                paymentToken
            );
            
            emit DistributionCreated(distributionId, propertyIdHash, initialDistributionAmount, distributionDescription);
        }
        
        return (propertyIdHash, tokenAddress, distributionId);
    }
    
    /**
     * @dev 获取房产详情（组合查询）
     */
    function getPropertyFullDetails(string memory propertyId) 
        external 
        view 
        returns (
            bytes32 propertyIdHash,
            uint8 status,
            uint40 registrationTime,
            string memory country,
            string memory metadataURI,
            address tokenAddress,
            uint256 tokenTotalSupply,
            uint256 tokenMaxSupply
        ) 
    {
        // 从PropertyManager获取基本信息
        (
            PropertyManager.PropertyStatus propertyStatus,
            uint40 propRegistrationTime,
            string memory propCountry,
            string memory propMetadataURI,
            address propTokenAddress
        ) = propertyManager.getPropertyDetails(propertyId);
        
        propertyIdHash = keccak256(abi.encodePacked(propertyId));
        status = uint8(propertyStatus);
        registrationTime = propRegistrationTime;
        country = propCountry;
        metadataURI = propMetadataURI;
        tokenAddress = propTokenAddress;
        
        // 如果存在代币，获取代币信息
        if (propTokenAddress != address(0)) {
            PropertyToken token = PropertyToken(propTokenAddress);
            tokenTotalSupply = token.totalSupply();
            tokenMaxSupply = token.maxSupply();
        }
        
        return (
            propertyIdHash,
            status,
            registrationTime,
            country,
            metadataURI,
            tokenAddress,
            tokenTotalSupply,
            tokenMaxSupply
        );
    }
    
    /**
     * @dev 获取用户的代币余额
     */
    function getUserTokenBalances(address user, address[] memory tokens) 
        external 
        view 
        returns (uint256[] memory balances) 
    {
        balances = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] != address(0)) {
                balances[i] = PropertyToken(tokens[i]).balanceOf(user);
            }
        }
        
        return balances;
    }
    
    /**
     * @dev 获取用户的分配份额
     */
    function getUserDistributionShares(address user, uint256[] memory distributionIds) 
        external 
        view 
        returns (uint256[] memory shares, bool[] memory withdrawn) 
    {
        uint256 length = distributionIds.length;
        shares = new uint256[](length);
        withdrawn = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            (shares[i], withdrawn[i]) = rewardManager.calculateUserShare(distributionIds[i], user);
        }
        
        return (shares, withdrawn);
    }
    
    /**
     * @dev 检查用户是否可以参与交易
     */
    function canUserTrade(address user) external view returns (bool) {
        // 检查用户是否在交易黑名单中
        return !tradingManager.blacklist(user);
    }
    
    /**
     * @dev 获取代币当前价格
     */
    function getTokenPrice(address tokenAddress) external view returns (uint256) {
        return tradingManager.getTokenPrice(tokenAddress);
    }
    
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
} 