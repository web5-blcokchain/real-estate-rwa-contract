// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./RoleManager.sol";
import "./PropertyManager.sol"; 
import "./TradingManager.sol";
import "./RewardManager.sol";

/**
 * @title RealEstateSystem
 * @dev 不动产系统管理合约，负责系统状态和组件管理
 */
contract RealEstateSystem is 
    Initializable, 
    UUPSUpgradeable, 
    ReentrancyGuardUpgradeable,
    PausableUpgradeable {
    
    // 系统状态枚举
    enum SystemStatus {
        NotInitialized,  // 0
        Active,          // 1
        Paused,          // 2
        Terminated       // 3
    }
    
    // 版本历史记录结构体
    struct VersionHistory {
        uint8 version;
        uint256 timestamp;
        string description;
    }
    
    // 系统组件
    RoleManager public roleManager;
    PropertyManager public propertyManager;
    TradingManager public tradingManager;
    RewardManager public rewardManager;
    
    // 系统状态
    SystemStatus public status;
    
    // 版本控制
    uint8 public version;
    
    // 版本历史记录数组
    VersionHistory[] public versionHistory;
    
    // 事件定义
    event SystemInitialized(
        address indexed deployer,
        address indexed roleManager,
        address indexed propertyManager,
        address tradingManager,
        address rewardManager
    );
    event SystemStatusChanged(SystemStatus oldStatus, SystemStatus newStatus);
    event ComponentUpdated(string indexed componentName, address indexed oldAddress, address indexed newAddress);
    event VersionUpdated(uint8 oldVersion, uint8 newVersion, string description);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化系统
     */
    function initialize(
        address _roleManager,
        address _propertyManager,
        address payable _tradingManager,
        address payable _rewardManager
    ) public initializer {
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        roleManager = RoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        tradingManager = TradingManager(_tradingManager);
        rewardManager = RewardManager(_rewardManager);
        
        status = SystemStatus.Active;
        version = 1; // 初始版本
        
        // 记录初始版本
        versionHistory.push(VersionHistory({
            version: 1,
            timestamp: block.timestamp,
            description: "Initial version"
        }));
        
        emit SystemInitialized(
            msg.sender,
            _roleManager,
            _propertyManager,
            _tradingManager,
            _rewardManager
        );
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：系统必须处于活动状态
     */
    modifier whenSystemActive() {
        require(status == SystemStatus.Active, "System not active");
        _;
    }
    
    /**
     * @dev 更新系统状态
     */
    function updateSystemStatus(SystemStatus _newStatus) public onlyAdmin {
        require(_newStatus != SystemStatus.NotInitialized, "Cannot set to NotInitialized");
        
        SystemStatus oldStatus = status;
        status = _newStatus;
        
        // 同步暂停状态
        if (_newStatus == SystemStatus.Paused && !paused()) {
            _pause();
        } else if (_newStatus == SystemStatus.Active && paused()) {
            _unpause();
        }
        
        emit SystemStatusChanged(oldStatus, _newStatus);
    }
    
    /**
     * @dev 更新版本
     */
    function updateVersion(uint8 _newVersion, string memory _description) external onlyAdmin {
        require(_newVersion > version, "New version must be greater than current");
        
        uint8 oldVersion = version;
        version = _newVersion;
        
        versionHistory.push(VersionHistory({
            version: _newVersion,
            timestamp: block.timestamp,
            description: _description
        }));
        
        emit VersionUpdated(oldVersion, _newVersion, _description);
    }
    
    /**
     * @dev 更新角色管理器
     */
    function updateRoleManager(address _newRoleManager) external onlyAdmin whenSystemActive {
        require(_newRoleManager != address(0), "Zero address not allowed");  // 添加零地址检查
        address oldAddress = address(roleManager);
        roleManager = RoleManager(_newRoleManager);
        emit ComponentUpdated("RoleManager", oldAddress, _newRoleManager);
    }
    
    /**
     * @dev 更新房产管理器
     */
    function updatePropertyManager(address _newPropertyManager) external onlyAdmin whenSystemActive {
        require(_newPropertyManager != address(0), "Zero address not allowed");
        address oldAddress = address(propertyManager);
        propertyManager = PropertyManager(_newPropertyManager);
        emit ComponentUpdated("PropertyManager", oldAddress, _newPropertyManager);
    }
    
    /**
     * @dev 更新交易管理器
     */
    function updateTradingManager(address payable _newTradingManager) external onlyAdmin whenSystemActive {
        require(_newTradingManager != address(0), "Zero address not allowed");
        address oldAddress = address(tradingManager);
        tradingManager = TradingManager(payable(_newTradingManager));
        emit ComponentUpdated("TradingManager", oldAddress, _newTradingManager);
    }
    
    /**
     * @dev 更新奖励管理器
     */
    function updateRewardManager(address payable _newRewardManager) external onlyAdmin whenSystemActive {
        require(_newRewardManager != address(0), "Zero address not allowed");
        address oldAddress = address(rewardManager);
        rewardManager = RewardManager(payable(_newRewardManager));
        emit ComponentUpdated("RewardManager", oldAddress, _newRewardManager);
    }
    
    /**
     * @dev 暂停系统
     */
    function pause() external onlyAdmin {
        _pause();
        updateSystemStatus(SystemStatus.Paused);
    }
    
    /**
     * @dev 恢复系统
     */
    function unpause() external onlyAdmin {
        _unpause();
        updateSystemStatus(SystemStatus.Active);
    }
    
    /**
     * @dev 获取系统状态
     */
    function getSystemStatus() external view returns (SystemStatus) {
        if (status == SystemStatus.Terminated) {
            return SystemStatus.Terminated;
        } else if (paused()) {
            return SystemStatus.Paused;
        } else {
            return status;
        }
    }
    
    /**
     * @dev 获取版本历史记录数量
     */
    function getVersionHistoryCount() external view returns (uint256) {
        return versionHistory.length;
    }
    
    /**
     * @dev 获取系统版本
     */
    function getVersion() external view returns (uint8) {
        return version;
    }
    
    /**
     * @dev 授权升级函数
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        require(!roleManager.emergencyMode(), "Emergency mode active");
    }
    
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
} 