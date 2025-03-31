// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/**
 * @title SimpleRoleManager
 * @dev 简化的角色管理合约
 */
contract SimpleRoleManager is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable {
    
    // 版本控制
    uint8 public version;
    
    // 角色常量 - 使用固定bytes32值保证一致性
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // 紧急模式状态
    bool public emergencyMode;
    
    // 事件
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event EmergencyModeChanged(bool enabled);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize() public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        // 设置默认角色
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        
        emergencyMode = false;
        version = 1;
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
        emit RoleGranted(role, account, msg.sender);
    }
    
    /**
     * @dev 撤销地址的特定角色
     */
    function revokeRole(bytes32 role, address account) public override onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(role, account);
        emit RoleRevoked(role, account, msg.sender);
    }
    
    /**
     * @dev 转移管理员权限到新地址
     */
    function transferAdminRole(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "New admin is zero address");
        
        // 授予新管理员默认管理员角色和ADMIN_ROLE
        _setupRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _setupRole(ADMIN_ROLE, newAdmin);
        
        // 注意：这里没有移除当前管理员的权限
        // 如果需要完全转移权限，取消下面两行的注释
        // renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // renounceRole(ADMIN_ROLE, msg.sender);
        
        emit AdminTransferred(msg.sender, newAdmin);
    }
    
    /**
     * @dev 转移管理员权限并撤销当前管理员权限
     */
    function transferAndRenounceAdminRole(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "New admin is zero address");
        
        // 授予新管理员默认管理员角色和ADMIN_ROLE
        _setupRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _setupRole(ADMIN_ROLE, newAdmin);
        
        // 撤销当前管理员的角色
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
        renounceRole(ADMIN_ROLE, msg.sender);
        
        emit AdminTransferred(msg.sender, newAdmin);
    }
    
    /**
     * @dev 批量授予地址特定角色
     */
    function batchGrantRole(bytes32 role, address[] calldata accounts) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _grantRole(role, accounts[i]);
            emit RoleGranted(role, accounts[i], msg.sender);
        }
    }
    
    /**
     * @dev 批量撤销地址的特定角色
     */
    function batchRevokeRole(bytes32 role, address[] calldata accounts) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _revokeRole(role, accounts[i]);
            emit RoleRevoked(role, accounts[i], msg.sender);
        }
    }
    
    /**
     * @dev 激活紧急模式
     */
    function activateEmergencyMode() external onlyRole(ADMIN_ROLE) {
        emergencyMode = true;
        _pause();
        emit EmergencyModeChanged(true);
    }
    
    /**
     * @dev 取消激活紧急模式
     */
    function deactivateEmergencyMode() external onlyRole(ADMIN_ROLE) {
        emergencyMode = false;
        _unpause();
        emit EmergencyModeChanged(false);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!emergencyMode, "Cannot upgrade during emergency mode");
        version += 1;
    }
} 