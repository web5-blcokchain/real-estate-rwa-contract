// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title RoleManager
 * @dev 角色管理合约
 */
contract RoleManager is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable {
    
    // 版本控制
    uint8 private constant VERSION = 1;
    
    // 角色常量 - 使用固定bytes32值保证一致性
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // 紧急模式状态
    bool public emergencyMode;
    
    // 事件
    event RoleManagerAdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event EmergencyModeChanged(bool enabled);
    event EmergencyModeActivated(address indexed activator);
    event EmergencyModeDeactivated(address indexed deactivator);
    event EmergencyModeSet(bool status);
    event RoleManagerInitialized(address indexed deployer);
    
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
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        emergencyMode = false;
        
        emit RoleManagerInitialized(admin);
    }
    
    /**
     * @dev 检查地址是否有特定角色
     */
    function hasRole(bytes32 role, address account) public view override returns (bool) {
        return super.hasRole(role, account);
    }
    
    /**
     * @dev 为地址授予特定角色
     */
    function grantRole(bytes32 role, address account) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(role, account);
    }
    
    /**
     * @dev 撤销地址的特定角色
     */
    function revokeRole(bytes32 role, address account) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(role, account);
    }
    
    /**
     * @dev 转移管理员权限到新地址
     */
    function transferAdminRole(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "New admin is zero address");
        
        // 授予新管理员默认管理员角色和ADMIN_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _grantRole(ADMIN_ROLE, newAdmin);
        
        // 注意：这里没有移除当前管理员的权限
        // 如果需要完全转移权限，取消下面两行的注释
        // renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // renounceRole(ADMIN_ROLE, msg.sender);
        
        emit RoleManagerAdminChanged(msg.sender, newAdmin);
    }
    
    /**
     * @dev 转移管理员权限并撤销当前管理员权限
     */
    function transferAndRenounceAdminRole(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "New admin is zero address");
        
        // 授予新管理员默认管理员角色和ADMIN_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _grantRole(ADMIN_ROLE, newAdmin);
        
        // 撤销当前管理员的角色
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
        renounceRole(ADMIN_ROLE, msg.sender);
        
        emit RoleManagerAdminChanged(msg.sender, newAdmin);
    }
    
    /**
     * @dev 批量授予地址特定角色
     */
    function batchGrantRole(bytes32 role, address[] calldata accounts) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _grantRole(role, accounts[i]);
        }
    }
    
    /**
     * @dev 批量撤销地址的特定角色
     */
    function batchRevokeRole(bytes32 role, address[] calldata accounts) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _revokeRole(role, accounts[i]);
        }
    }
    
    /**
     * @dev 激活紧急模式
     */
    function activateEmergencyMode() external onlyRole(ADMIN_ROLE) {
        require(!emergencyMode, "Emergency mode already active");
        emergencyMode = true;
        _pause();
        emit EmergencyModeActivated(_msgSender());
    }
    
    /**
     * @dev 取消激活紧急模式
     */
    function deactivateEmergencyMode() external onlyRole(ADMIN_ROLE) {
        require(emergencyMode, "Emergency mode not active");
        emergencyMode = false;
        _unpause();
        emit EmergencyModeDeactivated(_msgSender());
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        require(!emergencyMode, "Emergency mode active");
    }

    /**
     * @dev Returns the version of the contract
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     */
    uint256[45] private __gap;
} 