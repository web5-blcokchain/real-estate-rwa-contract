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
 * 权限说明：
 * - ADMIN: 最高权限，包含所有权限
 * - MANAGER: 管理权限，包含OPERATOR权限
 * - OPERATOR: 基础操作权限
 */
contract RealEstateFacade is 
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable {
    
    using SafeMath for uint256;
    using RoleConstants for bytes32;
    
    // Version control - using uint8 to save gas
    uint8 private constant VERSION = 1;
    
    // 版本控制
    uint8 public version;
    
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
    event PropertyListed(
        string indexed propertyId,
        address indexed tokenAddress,
        uint40 listTime
    );
    event TradeExecuted(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed seller,
        uint40 executeTime
    );
    event RewardsClaimed(
        address indexed user,
        uint256 indexed distributionId,
        uint256 amount,
        uint40 claimTime
    );
    event PropertyValuationUpdated(
        string indexed propertyId,
        uint256 oldValue,
        uint256 newValue,
        uint40 updateTime
    );
    event TradingLimitsUpdated(
        address indexed tokenAddress,
        uint256 minAmount,
        uint256 maxAmount,
        uint40 updateTime
    );
    event OrderCreated(
        uint256 indexed orderId,
        address indexed seller,
        address indexed token,
        uint256 amount,
        uint256 price,
        uint40 createTime
    );
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed seller,
        uint40 cancelTime
    );
    event DistributionCreated(
        uint256 indexed distributionId,
        string indexed propertyId,
        uint256 amount,
        string description,
        uint40 createTime
    );
    event PropertyStatusUpdated(
        string indexed propertyId,
        uint8 oldStatus,
        uint8 newStatus,
        uint40 updateTime
    );
    event SystemContractUpdated(
        address indexed oldSystem,
        address indexed newSystem,
        uint40 updateTime
    );
    event TokenSellOrderCreated(
        address indexed seller,
        address indexed token,
        uint256 amount,
        uint256 price,
        uint256 orderId,
        uint40 createTime
    );
    event DirectSellOrderCreated(
        address indexed seller,
        string indexed propertyId,
        address indexed token,
        uint256 amount,
        uint256 price,
        uint256 orderId,
        uint40 createTime
    );
    event FacadeInitialized(
        address indexed deployer,
        address indexed system,
        address propertyManager,
        address tradingManager,
        address rewardManager,
        uint40 initTime
    );
    event PropertyRegistered(
        string indexed propertyId,
        string country,
        string metadataURI,
        address tokenAddress,
        uint40 registerTime
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化合约
     */
    function initialize(
        address _systemAddress,
        address _propertyManagerAddress,
        address payable _tradingManagerAddress,
        address payable _rewardManagerAddress
    ) public initializer {
        require(_systemAddress != address(0), "System address cannot be zero");
        require(_propertyManagerAddress != address(0), "PropertyManager address cannot be zero");
        require(_tradingManagerAddress != address(0), "TradingManager address cannot be zero");
        require(_rewardManagerAddress != address(0), "RewardManager address cannot be zero");
        
        system = RealEstateSystem(_systemAddress);
        propertyManager = PropertyManager(_propertyManagerAddress);
        tradingManager = TradingManager(_tradingManagerAddress);
        rewardManager = RewardManager(_rewardManagerAddress);
        
        // 验证调用者是否有 ADMIN_ROLE 权限
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        version = 1;
        
        emit FacadeInitialized(
            msg.sender,
            _systemAddress,
            _propertyManagerAddress,
            _tradingManagerAddress,
            _rewardManagerAddress,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 设置系统合约 - 需要ADMIN权限
     */
    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        address oldSystem = address(system);
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        emit SystemContractUpdated(oldSystem, _systemAddress, uint40(block.timestamp));
    }
    
    /**
     * @dev 暂停所有操作 - 需要ADMIN权限
     */
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _pause();
    }
    
    /**
     * @dev 恢复所有操作 - 需要ADMIN权限
     */
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _unpause();
    }
    
    /**
     * @dev 授权合约升级 - 需要ADMIN权限
     */
    function _authorizeUpgrade(address newImplementation) internal override {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
    }
    
    /**
     * @dev 获取合约版本
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }
    
    /**
     * @dev 检查系统状态
     */
    modifier whenSystemActive() {
        require(system.getSystemStatus() == RealEstateSystem.SystemStatus.Active, "System not active");
        _;
    }
    
    /**
     * @dev 注册新房产并创建对应的代币 - 需要OPERATOR权限
     */
    function registerPropertyAndCreateToken(
        string memory propertyId,
        string memory country,
        string memory metadataURI,
        uint256 initialSupply,
        string memory tokenName,
        string memory tokenSymbol
    ) public whenNotPaused nonReentrant returns (address) {
        // 验证调用者权限
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        
        // 调用 PropertyManager 注册房产
        address tokenAddress = propertyManager.registerProperty(
            propertyId,
            country,
            metadataURI,
            initialSupply,
            tokenName,
            tokenSymbol
        );
        
        emit PropertyRegistered(
            propertyId,
            country,
            metadataURI,
            tokenAddress,
            uint40(block.timestamp)
        );
        
        return tokenAddress;
    }
    
    /**
     * @dev 创建卖单
     */
    function createSellOrder(
        string memory propertyId,
        uint256 amount,
        uint256 price
    ) external whenNotPaused nonReentrant {
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        
        address token = propertyManager.getPropertyToken(propertyId);
        require(token != address(0), "Property token not found");
        
        tradingManager.createSellOrder(token, msg.sender, amount, price);
    }

    /**
     * @dev 创建买单
     */
    function createBuyOrder(
        string memory propertyId,
        uint256 amount,
        uint256 price
    ) external whenNotPaused nonReentrant {
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        
        address token = propertyManager.getPropertyToken(propertyId);
        require(token != address(0), "Property token not found");
        
        tradingManager.createBuyOrder(token, msg.sender, amount, price);
    }
    
    /**
     * @dev 更新房产估值 - 需要MANAGER权限
     */
    function updatePropertyValuation(
        string memory propertyId,
        uint256 newValue
    ) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(newValue > 0, "Invalid value");
        
        // 获取当前估值
        address tokenAddress = propertyManager.propertyTokens(propertyId);
        require(tokenAddress != address(0), "Token not found");
        uint256 oldValue = tradingManager.getTokenPrice(tokenAddress);
        
        // 更新估值
        tradingManager.setTokenPrice(tokenAddress, newValue);
        
        emit PropertyValuationUpdated(
            propertyId,
            oldValue,
            newValue,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 更新交易限制 - 需要MANAGER权限
     */
    function updateTradingLimits(
        address tokenAddress,
        uint256 minAmount,
        uint256 maxAmount
    ) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(tokenAddress != address(0), "Invalid token address");
        require(minAmount <= maxAmount, "Invalid limits");
        
        tradingManager.setMinTradeAmount(minAmount);
        tradingManager.setMaxTradeAmount(maxAmount);
        
        emit TradingLimitsUpdated(
            tokenAddress,
            minAmount,
            maxAmount,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 创建奖励分配 - 需要MANAGER权限
     */
    function createDistribution(
        string memory propertyId,
        uint256 amount,
        string memory description
    ) external whenNotPaused nonReentrant returns (uint256) {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 distributionId = rewardManager.createDistribution(
            propertyId,
            amount,
            description
        );
        
        emit DistributionCreated(
            distributionId,
            propertyId,
            amount,
            description,
            uint40(block.timestamp)
        );
        
        return distributionId;
    }
    
    /**
     * @dev 更新分配状态 - 需要MANAGER权限
     */
    function updateDistributionStatus(
        uint256 distributionId,
        uint8 status
    ) external whenNotPaused nonReentrant {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        
        // 调用奖励管理器的更新分配状态函数
        rewardManager.updateDistributionStatus(distributionId, RewardManager.DistributionStatus(status));
        
        // Note: rewardManager will emit its own event for this change
    }
    
    /**
     * @dev 提取分红
     */
    function withdraw(
        uint256 distributionId,
        address user,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        rewardManager.withdraw(distributionId, user, amount);
    }
    
    /**
     * @dev 更新房产状态 - 需要MANAGER权限
     */
    function updatePropertyStatus(
        string memory propertyId,
        uint8 newStatus
    ) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        
        uint8 oldStatus = uint8(propertyManager.getPropertyStatus(propertyId));
        propertyManager.updatePropertyStatus(propertyId, PropertyManager.PropertyStatus(newStatus));
        
        emit PropertyStatusUpdated(
            propertyId,
            oldStatus,
            newStatus,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 获取房产代币地址
     */
    function getPropertyTokenAddress(string memory propertyId) external view returns (address) {
        return propertyManager.propertyTokens(propertyId);
    }
    
    /**
     * @dev 获取房产状态
     */
    function getPropertyStatus(string memory propertyId) external view returns (uint8) {
        return uint8(propertyManager.getPropertyStatus(propertyId));
    }
    
    /**
     * @dev 获取交易限制
     */
    function getTradingLimits(address tokenAddress) external view returns (uint256, uint256) {
        return (
            tradingManager.getMinTradeAmount(),
            tradingManager.getMaxTradeAmount()
        );
    }
    
    /**
     * @dev 获取房产估值
     */
    function getPropertyValuation(string memory propertyId) external view returns (uint256) {
        address tokenAddress = propertyManager.propertyTokens(propertyId);
        return tradingManager.getTokenPrice(tokenAddress);
    }
    
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
} 