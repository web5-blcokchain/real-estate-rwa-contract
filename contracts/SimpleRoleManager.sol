// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title SimpleRoleManager
 * @dev 简化版角色管理合约，仅包含核心角色
 */
contract SimpleRoleManager is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    // 合约版本
    uint256 public version;
    
    // 主要角色常量（简化为三个核心角色）
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // 事件
    event RoleManagerInitialized(address deployer, uint256 version);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数
     */
    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        version = 1;
        
        // 授予调用者管理员角色
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // 设置角色管理关系
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(OPERATOR_ROLE, MANAGER_ROLE);
        
        // 授予ADMIN_ROLE
        _grantRole(ADMIN_ROLE, msg.sender);
        
        emit RoleManagerInitialized(msg.sender, version);
    }

    /**
     * @dev 升级合约实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {
        uint256 oldVersion = version;
        version += 1;
        emit VersionUpdated(oldVersion, version);
    }
} 