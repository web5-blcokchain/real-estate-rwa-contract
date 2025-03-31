// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title SimpleRoleManager
 * @dev 优化的角色管理合约，简化权限控制并增强安全性
 */
contract SimpleRoleManager is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable {
    
    // 使用bytes32常量而非计算值，节省gas
    bytes32 public constant ADMIN_ROLE = 0x41444d494e5f524f4c45000000000000000000000000000000000000000000; // bytes32("ADMIN_ROLE")
    bytes32 public constant MANAGER_ROLE = 0x4d414e414745525f524f4c4500000000000000000000000000000000000000; // bytes32("MANAGER_ROLE")
    bytes32 public constant OPERATOR_ROLE = 0x4f50455241544f525f524f4c45000000000000000000000000000000000000; // bytes32("OPERATOR_ROLE")
    
    // 合约版本 - uint8足够表示版本号
    uint8 public version;
    
    // 系统紧急状态
    bool public emergencyMode;
    
    // 部署者地址，用于紧急恢复
    address public deployer;
    
    // 事件
    event RoleManagerInitialized(address indexed deployer, uint8 version);
    event VersionUpdated(uint8 oldVersion, uint8 newVersion);
    event EmergencyModeActivated(address indexed admin);
    event EmergencyModeDeactivated(address indexed admin);
    event EmergencyRoleRestored(address indexed deployer);
    
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
        
        deployer = msg.sender;
        version = 1;
        emergencyMode = false;
        
        // 设置角色管理关系
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, MANAGER_ROLE);
        
        // 授予ADMIN_ROLE
        _grantRole(ADMIN_ROLE, msg.sender);
        
        emit RoleManagerInitialized(msg.sender, version);
    }
    
    /**
     * @dev 激活紧急模式
     */
    function activateEmergencyMode() external onlyRole(ADMIN_ROLE) {
        emergencyMode = true;
        emit EmergencyModeActivated(msg.sender);
    }
    
    /**
     * @dev 解除紧急模式
     */
    function deactivateEmergencyMode() external onlyRole(ADMIN_ROLE) {
        emergencyMode = false;
        emit EmergencyModeDeactivated(msg.sender);
    }
    
    /**
     * @dev 紧急恢复部署者权限
     * 仅部署者可调用，用于系统紧急情况下的恢复
     */
    function emergencyRestoreAccess() external nonReentrant {
        require(msg.sender == deployer, "Only deployer can restore access");
        
        // 确保部署者拥有所有管理权限
        _grantRole(DEFAULT_ADMIN_ROLE, deployer);
        _grantRole(ADMIN_ROLE, deployer);
        
        emit EmergencyRoleRestored(deployer);
    }
    
    /**
     * @dev 批量授予角色给多个地址
     * @param role 要授予的角色
     * @param accounts 要授予角色的地址数组
     */
    function grantRoleBatch(bytes32 role, address[] calldata accounts) 
        external 
        onlyRole(getRoleAdmin(role))
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            grantRole(role, accounts[i]);
        }
    }
    
    /**
     * @dev 批量撤销角色
     * @param role 要撤销的角色
     * @param accounts 要撤销角色的地址数组
     */
    function revokeRoleBatch(bytes32 role, address[] calldata accounts)
        external
        onlyRole(getRoleAdmin(role))
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            revokeRole(role, accounts[i]);
        }
    }
    
    /**
     * @dev 查询地址拥有的所有角色
     * @param account 要查询的地址
     * @return adminRole 是否拥有ADMIN_ROLE
     * @return managerRole 是否拥有MANAGER_ROLE
     * @return operatorRole 是否拥有OPERATOR_ROLE
     */
    function getUserRoles(address account) 
        external 
        view 
        returns (bool adminRole, bool managerRole, bool operatorRole) 
    {
        return (
            hasRole(ADMIN_ROLE, account),
            hasRole(MANAGER_ROLE, account),
            hasRole(OPERATOR_ROLE, account)
        );
    }

    /**
     * @dev 升级合约实现
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        require(!emergencyMode, "Cannot upgrade during emergency");
        
        uint8 oldVersion = version;
        version += 1;
        
        emit VersionUpdated(oldVersion, version);
    }
} 