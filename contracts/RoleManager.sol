// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title RoleManager
 * @dev 管理系统角色（可升级版本）
 */
contract RoleManager is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    // 合约版本，用于追踪升级
    uint256 public version;
    
    // 角色常量
    bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");
    bytes32 public constant PROPERTY_MANAGER = keccak256("PROPERTY_MANAGER");
    bytes32 public constant FEE_COLLECTOR = keccak256("FEE_COLLECTOR"); // 添加费用收集者角色
    
    // 事件
    event RoleManagerInitialized(address deployer, uint256 version);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        version = 1;
        
        // 设置角色管理员
        _setRoleAdmin(SUPER_ADMIN, DEFAULT_ADMIN_ROLE); // 修改SUPER_ADMIN的管理员为DEFAULT_ADMIN_ROLE
        _setRoleAdmin(PROPERTY_MANAGER, SUPER_ADMIN);
        _setRoleAdmin(FEE_COLLECTOR, SUPER_ADMIN);
        
        // 授予部署者默认管理员角色
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // 同时授予SUPER_ADMIN角色，确保部署者具有完整权限
        _grantRole(SUPER_ADMIN, msg.sender);
        
        emit RoleManagerInitialized(msg.sender, version);
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(SUPER_ADMIN) {
        // 更新版本号
        uint256 oldVersion = version;
        version += 1;
        emit VersionUpdated(oldVersion, version);
    }
    
    /**
     * @dev 检查地址是否拥有任何角色
     * @param account 要检查的地址
     * @return 如果账户拥有任何角色则返回true
     */
    function hasAnyRole(address account) external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account) || 
               hasRole(SUPER_ADMIN, account) || 
               hasRole(PROPERTY_MANAGER, account) || 
               hasRole(FEE_COLLECTOR, account);
    }
    
    /**
     * @dev 检查地址所拥有的所有角色
     * @param account 要检查的地址
     * @return adminRole 是否拥有管理员角色
     * @return superAdminRole 是否拥有超级管理员角色
     * @return propertyManagerRole 是否拥有房产管理员角色
     * @return feeCollectorRole 是否拥有费用收集员角色
     */
    function checkRoles(address account) external view returns (
        bool adminRole,
        bool superAdminRole,
        bool propertyManagerRole,
        bool feeCollectorRole
    ) {
        return (
            hasRole(DEFAULT_ADMIN_ROLE, account),
            hasRole(SUPER_ADMIN, account),
            hasRole(PROPERTY_MANAGER, account),
            hasRole(FEE_COLLECTOR, account)
        );
    }
}