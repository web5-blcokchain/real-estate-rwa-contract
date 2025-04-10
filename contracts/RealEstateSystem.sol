// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./utils/RoleConstants.sol";
import "./PropertyManager.sol"; 
import "./TradingManager.sol";
import "./RewardManager.sol";

/**
 * @title RealEstateSystem
 * @dev 系统核心合约，管理系统状态和权限
 */
contract RealEstateSystem is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable {
    
    // 版本控制
    uint8 private constant VERSION = 1;
    
    // 紧急模式状态
    bool public emergencyMode;
    
    // 系统状态
    enum SystemStatus {
        Inactive,   // 系统尚未激活
        Testing,    // 测试阶段
        Active,     // 正常运行
        Suspended,  // 暂停运行
        Upgrading   // 升级维护中
    }
    
    // 当前系统状态
    SystemStatus public systemStatus;

    // 授权合约地址
    mapping(address => bool) public authorizedContracts;
    
    // 事件
    event SystemStatusChanged(SystemStatus oldStatus, SystemStatus newStatus);
    event EmergencyModeChanged(bool enabled);
    event SystemAdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event SystemInitialized(address indexed deployer);
    event ContractAuthorized(address indexed contractAddress, bool status);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        // 设置默认管理员
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        
        // 设置角色层级关系
        _setupRole(RoleConstants.ADMIN_ROLE, admin);
        _setupRole(RoleConstants.MANAGER_ROLE, admin);
        _setupRole(RoleConstants.OPERATOR_ROLE, admin);
        _setupRole(RoleConstants.PAUSER_ROLE, admin);
        _setupRole(RoleConstants.UPGRADER_ROLE, admin);
        
        systemStatus = SystemStatus.Inactive;
        emergencyMode = false;
        
        emit SystemInitialized(admin);
    }
    
    /**
     * @dev 重写_setupRole以支持角色层级关系
     */
    function _setupRole(bytes32 role, address account) internal override {
        super._setupRole(role, account);
        
        // 设置角色层级关系
        if (role == RoleConstants.ADMIN_ROLE) {
            // ADMIN 自动获得 MANAGER 和 OPERATOR 权限
            super._setupRole(RoleConstants.MANAGER_ROLE, account);
            super._setupRole(RoleConstants.OPERATOR_ROLE, account);
            emit RoleGranted(RoleConstants.MANAGER_ROLE, account, msg.sender);
            emit RoleGranted(RoleConstants.OPERATOR_ROLE, account, msg.sender);
        } else if (role == RoleConstants.MANAGER_ROLE) {
            // MANAGER 自动获得 OPERATOR 权限
            super._setupRole(RoleConstants.OPERATOR_ROLE, account);
            emit RoleGranted(RoleConstants.OPERATOR_ROLE, account, msg.sender);
        }
        
        emit RoleGranted(role, account, msg.sender);
    }
    
    /**
     * @dev 重写_grantRole以支持角色层级关系
     */
    function _grantRole(bytes32 role, address account) internal override {
        super._grantRole(role, account);
        
        // 设置角色层级关系
        if (role == RoleConstants.ADMIN_ROLE) {
            // ADMIN 自动获得 MANAGER 和 OPERATOR 权限
            super._grantRole(RoleConstants.MANAGER_ROLE, account);
            super._grantRole(RoleConstants.OPERATOR_ROLE, account);
            emit RoleGranted(RoleConstants.MANAGER_ROLE, account, msg.sender);
            emit RoleGranted(RoleConstants.OPERATOR_ROLE, account, msg.sender);
        } else if (role == RoleConstants.MANAGER_ROLE) {
            // MANAGER 自动获得 OPERATOR 权限
            super._grantRole(RoleConstants.OPERATOR_ROLE, account);
            emit RoleGranted(RoleConstants.OPERATOR_ROLE, account, msg.sender);
        }
        
        emit RoleGranted(role, account, msg.sender);
    }
    
    /**
     * @dev 重写_revokeRole以支持角色层级关系
     */
    function _revokeRole(bytes32 role, address account) internal override {
        super._revokeRole(role, account);
        
        // 撤销相关角色的权限
        if (role == RoleConstants.ADMIN_ROLE) {
            // 撤销 ADMIN 时同时撤销 MANAGER 和 OPERATOR 权限
            super._revokeRole(RoleConstants.MANAGER_ROLE, account);
            super._revokeRole(RoleConstants.OPERATOR_ROLE, account);
        } else if (role == RoleConstants.MANAGER_ROLE) {
            // 撤销 MANAGER 时同时撤销 OPERATOR 权限
            super._revokeRole(RoleConstants.OPERATOR_ROLE, account);
        }
    }
    
    /**
     * @dev 设置系统状态
     */
    function setSystemStatus(SystemStatus newStatus) 
        external 
        onlyRole(RoleConstants.ADMIN_ROLE) 
    {
        SystemStatus oldStatus = systemStatus;
        systemStatus = newStatus;
        
        if (newStatus == SystemStatus.Suspended) {
            _pause();
        } else if (oldStatus == SystemStatus.Suspended && newStatus == SystemStatus.Active) {
            _unpause();
        }
        
        emit SystemStatusChanged(oldStatus, newStatus);
    }
    
    /**
     * @dev 激活紧急模式
     */
    function activateEmergencyMode() external onlyRole(RoleConstants.ADMIN_ROLE) {
        require(!emergencyMode, "Emergency mode already active");
        emergencyMode = true;
        _pause();
        emit EmergencyModeChanged(true);
    }
    
    /**
     * @dev 取消激活紧急模式
     */
    function deactivateEmergencyMode() external onlyRole(RoleConstants.ADMIN_ROLE) {
        require(emergencyMode, "Emergency mode not active");
        emergencyMode = false;
        _unpause();
        emit EmergencyModeChanged(false);
    }
    
    /**
     * @dev 转移管理员权限到新地址
     */
    function transferAdminRole(address newAdmin) external onlyRole(RoleConstants.ADMIN_ROLE) {
        require(newAdmin != address(0), "New admin is zero address");
        
        // 授予新管理员所有角色
        _setupRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _setupRole(RoleConstants.ADMIN_ROLE, newAdmin);
        _setupRole(RoleConstants.MANAGER_ROLE, newAdmin);
        _setupRole(RoleConstants.OPERATOR_ROLE, newAdmin);
        _setupRole(RoleConstants.PAUSER_ROLE, newAdmin);
        _setupRole(RoleConstants.UPGRADER_ROLE, newAdmin);
        
        emit SystemAdminChanged(msg.sender, newAdmin);
    }
    
    /**
     * @dev 转移管理员权限并撤销当前管理员权限
     */
    function transferAndRenounceAdminRole(address newAdmin) external onlyRole(RoleConstants.ADMIN_ROLE) {
        require(newAdmin != address(0), "New admin is zero address");
        
        // 授予新管理员所有角色
        _setupRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _setupRole(RoleConstants.ADMIN_ROLE, newAdmin);
        _setupRole(RoleConstants.MANAGER_ROLE, newAdmin);
        _setupRole(RoleConstants.OPERATOR_ROLE, newAdmin);
        _setupRole(RoleConstants.PAUSER_ROLE, newAdmin);
        _setupRole(RoleConstants.UPGRADER_ROLE, newAdmin);
        
        // 撤销当前管理员的角色
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
        renounceRole(RoleConstants.ADMIN_ROLE, msg.sender);
        renounceRole(RoleConstants.MANAGER_ROLE, msg.sender);
        renounceRole(RoleConstants.OPERATOR_ROLE, msg.sender);
        renounceRole(RoleConstants.PAUSER_ROLE, msg.sender);
        renounceRole(RoleConstants.UPGRADER_ROLE, msg.sender);
        
        emit SystemAdminChanged(msg.sender, newAdmin);
    }

    /**
     * @dev 授权合约调用
     */
    function setContractAuthorization(address contractAddress, bool authorized) external onlyRole(RoleConstants.ADMIN_ROLE) {
        authorizedContracts[contractAddress] = authorized;
        emit ContractAuthorized(contractAddress, authorized);
    }

    /**
     * @dev 检查地址是否有特定角色 - 供其他合约调用
     * @param role 角色
     * @param account 账户地址
     * @return 是否有该角色
     */
    function checkRole(bytes32 role, address account) external view returns (bool) {
        return hasRole(role, account);
    }

    /**
     * @dev 验证调用者是否具有指定角色
     * @param role 角色
     * @param errorMessage 错误信息
     */
    function validateRole(bytes32 role, string memory errorMessage) public view {
        require(hasRole(role, msg.sender), errorMessage);
    }
    
    /**
     * @dev 获取系统状态
     */
    function getSystemStatus() external view returns (SystemStatus) {
        return systemStatus;
    }
    
    /**
     * @dev 获取版本号
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(RoleConstants.UPGRADER_ROLE) 
    {
        require(!emergencyMode, "Emergency mode active");
    }
    
    /**
     * @dev 批量授予地址特定角色
     */
    function batchGrantRole(bytes32 role, address[] calldata accounts) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            grantRole(role, accounts[i]);
        }
    }
    
    /**
     * @dev 批量撤销地址的特定角色
     */
    function batchRevokeRole(bytes32 role, address[] calldata accounts) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            revokeRole(role, accounts[i]);
        }
    }

    /**
     * @dev 检查授权合约或角色 - 供其他合约调用
     * @param authorizedList 授权合约映射
     * @param sender 调用者地址
     * @return 是否有授权
     */
    function checkAuthorization(mapping(address => bool) storage authorizedList, address sender) internal view returns (bool) {
        return authorizedList[sender] || 
               hasRole(RoleConstants.ADMIN_ROLE, sender) ||
               hasRole(RoleConstants.MANAGER_ROLE, sender);
    }
} 