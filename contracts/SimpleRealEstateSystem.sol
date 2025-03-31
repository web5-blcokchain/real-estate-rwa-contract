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
 * @title SimpleRealEstateSystem
 * @dev 优化的不动产系统集成合约，简化且安全的实现
 */
contract SimpleRealEstateSystem is 
    Initializable, 
    UUPSUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuardUpgradeable {
    
    // 版本控制 - 使用uint8节省gas
    uint8 public version;
    
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
    
    // 系统状态
    enum SystemStatus {
        Active,         // 系统正常运行
        Maintenance,    // 系统维护中，部分功能暂停
        Emergency,      // 紧急状态，只有管理员可操作
        Upgraded        // 系统已升级，指向新合约
    }
    
    // 当前系统状态
    SystemStatus public systemStatus;
    
    // 如果系统已升级，指向新合约的地址
    address public newSystemAddress;
    
    // 事件
    event SystemStatusChanged(SystemStatus previous, SystemStatus current);
    event NewSystemAddressSet(address indexed newSystem);
    event SystemInitialized(address indexed deployer, uint8 version);
    event ComponentUpdated(string indexed componentName, address indexed newAddress);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：检查系统状态是否可用
     */
    modifier whenSystemActive() {
        require(
            systemStatus == SystemStatus.Active || 
            (systemStatus == SystemStatus.Maintenance && roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender)) ||
            (roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender)), 
            "System not accessible"
        );
        _;
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(
        address _roleManager,
        address _propertyManager,
        address _tokenFactory,
        address _tradingManager,
        address _rewardManager
    ) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        tokenFactory = PropertyToken(_tokenFactory);
        tradingManager = TradingManager(_tradingManager);
        rewardManager = RewardManager(_rewardManager);
        
        systemStatus = SystemStatus.Active;
        version = 1;
        
        emit SystemInitialized(msg.sender, version);
    }
    
    /**
     * @dev 更新系统状态
     */
    function setSystemStatus(SystemStatus _status) external onlyAdmin {
        SystemStatus previousStatus = systemStatus;
        systemStatus = _status;
        
        if (_status == SystemStatus.Emergency) {
            roleManager.activateEmergencyMode();
        } else if (previousStatus == SystemStatus.Emergency && _status != SystemStatus.Emergency) {
            roleManager.deactivateEmergencyMode();
        }
        
        emit SystemStatusChanged(previousStatus, _status);
    }
    
    /**
     * @dev 设置新系统地址（当升级到新合约时）
     */
    function setNewSystemAddress(address _newSystemAddress) external onlyAdmin {
        require(_newSystemAddress != address(0), "Zero address");
        require(_newSystemAddress != address(this), "Same as current");
        
        newSystemAddress = _newSystemAddress;
        emit NewSystemAddressSet(_newSystemAddress);
    }
    
    /**
     * @dev 更新角色管理器
     */
    function updateRoleManager(address _newRoleManager) external onlyAdmin {
        require(_newRoleManager != address(0), "Zero address");
        roleManager = SimpleRoleManager(_newRoleManager);
        emit ComponentUpdated("roleManager", _newRoleManager);
    }
    
    /**
     * @dev 更新房产管理器
     */
    function updatePropertyManager(address _newPropertyManager) external onlyAdmin whenSystemActive {
        require(_newPropertyManager != address(0), "Zero address");
        propertyManager = PropertyManager(_newPropertyManager);
        emit ComponentUpdated("propertyManager", _newPropertyManager);
    }
    
    /**
     * @dev 更新代币工厂
     */
    function updateTokenFactory(address _newTokenFactory) external onlyAdmin whenSystemActive {
        require(_newTokenFactory != address(0), "Zero address");
        tokenFactory = PropertyToken(_newTokenFactory);
        emit ComponentUpdated("tokenFactory", _newTokenFactory);
    }
    
    /**
     * @dev 更新交易管理器
     */
    function updateTradingManager(address _newTradingManager) external onlyAdmin whenSystemActive {
        require(_newTradingManager != address(0), "Zero address");
        tradingManager = TradingManager(_newTradingManager);
        emit ComponentUpdated("tradingManager", _newTradingManager);
    }
    
    /**
     * @dev 更新奖励管理器
     */
    function updateRewardManager(address _newRewardManager) external onlyAdmin whenSystemActive {
        require(_newRewardManager != address(0), "Zero address");
        rewardManager = RewardManager(_newRewardManager);
        emit ComponentUpdated("rewardManager", _newRewardManager);
    }
    
    /**
     * @dev 暂停系统
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev 恢复系统
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @dev 完整流程：注册房产、创建代币、初始化分配
     */
    function registerPropertyAndCreateToken(
        bytes32 _propertyIdHash,
        string calldata _propertyId,
        string calldata _name,
        string calldata _symbol,
        string calldata _location,
        string calldata _description,
        uint256 _initialTokenSupply
    ) 
        external 
        whenNotPaused
        whenSystemActive
        onlyAdmin
        nonReentrant
        returns (address tokenAddress) 
    {
        // 注册房产
        propertyManager.registerProperty(
            _propertyIdHash,
            _propertyId,
            _location,
            _description,
            msg.sender
        );
        
        // 批准房产
        propertyManager.updatePropertyStatus(_propertyIdHash, PropertyManager.PropertyStatus.Approved);
        
        // 创建代币
        tokenAddress = tokenFactory.createToken(
            _propertyId,
            _name,
            _symbol,
            _initialTokenSupply
        );
        
        // 注册代币到房产
        propertyManager.registerTokenForProperty(_propertyIdHash, tokenAddress);
        
        return tokenAddress;
    }
    
    /**
     * @dev 系统诊断 - 检查各组件状态并返回健康报告
     */
    function systemHealthCheck() 
        external 
        view 
        returns (
            SystemStatus status,
            bool paused,
            bool emergencyMode,
            uint8 currentVersion,
            address[] memory componentAddresses,
            string memory statusMessage
        ) 
    {
        componentAddresses = new address[](5);
        componentAddresses[0] = address(roleManager);
        componentAddresses[1] = address(propertyManager);
        componentAddresses[2] = address(tokenFactory);
        componentAddresses[3] = address(tradingManager);
        componentAddresses[4] = address(rewardManager);
        
        bool allComponentsAvailable = 
            address(roleManager) != address(0) &&
            address(propertyManager) != address(0) &&
            address(tokenFactory) != address(0) &&
            address(tradingManager) != address(0) &&
            address(rewardManager) != address(0);
        
        string memory message;
        
        if (!allComponentsAvailable) {
            message = "One or more components unavailable";
        } else if (systemStatus == SystemStatus.Emergency) {
            message = "System in emergency state";
        } else if (systemStatus == SystemStatus.Maintenance) {
            message = "System undergoing maintenance";
        } else if (systemStatus == SystemStatus.Upgraded) {
            message = "System upgraded to new implementation";
        } else if (paused()) {
            message = "System paused but otherwise healthy";
        } else {
            message = "System operating normally";
        }
        
        return (
            systemStatus,
            paused(),
            roleManager.emergencyMode(),
            version,
            componentAddresses,
            message
        );
    }
    
    /**
     * @dev 批量授权角色给用户
     */
    function batchGrantRoles(address[] calldata users, bytes32[] calldata roles) 
        external 
        onlyAdmin 
        whenSystemActive 
    {
        require(users.length == roles.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            roleManager.grantRole(roles[i], users[i]);
        }
    }
    
    /**
     * @dev 批量撤销用户角色
     */
    function batchRevokeRoles(address[] calldata users, bytes32[] calldata roles) 
        external 
        onlyAdmin 
        whenSystemActive 
    {
        require(users.length == roles.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            roleManager.revokeRole(roles[i], users[i]);
        }
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyAdmin 
    {
        require(systemStatus != SystemStatus.Emergency, "Cannot upgrade during emergency");
        uint8 oldVersion = version;
        version += 1;
    }
    
    /**
     * @dev 紧急情况下的暂停所有组件
     */
    function emergencyPauseAll() external onlyAdmin {
        _pause();
        
        if (address(propertyManager) != address(0)) {
            propertyManager.pause();
        }
        
        // 交易管理器有暂停交易的特殊方法
        if (address(tradingManager) != address(0)) {
            tradingManager.pauseTrading();
            tradingManager.pause();
        }
        
        // 奖励管理器暂停
        if (address(rewardManager) != address(0)) {
            rewardManager.pause();
        }
        
        // 启用角色管理器的紧急模式
        roleManager.activateEmergencyMode();
        
        // 更新系统状态
        SystemStatus previousStatus = systemStatus;
        systemStatus = SystemStatus.Emergency;
        
        emit SystemStatusChanged(previousStatus, SystemStatus.Emergency);
    }
    
    /**
     * @dev 从紧急状态恢复所有组件
     */
    function emergencyRecoverAll() external onlyAdmin {
        _unpause();
        
        if (address(propertyManager) != address(0)) {
            propertyManager.unpause();
        }
        
        // 交易管理器恢复交易
        if (address(tradingManager) != address(0)) {
            tradingManager.unpauseTrading();
            tradingManager.unpause();
        }
        
        // 奖励管理器恢复
        if (address(rewardManager) != address(0)) {
            rewardManager.unpause();
        }
        
        // 解除角色管理器的紧急模式
        roleManager.deactivateEmergencyMode();
        
        // 更新系统状态
        SystemStatus previousStatus = systemStatus;
        systemStatus = SystemStatus.Active;
        
        emit SystemStatusChanged(previousStatus, SystemStatus.Active);
    }
} 