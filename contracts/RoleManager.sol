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
    // 角色常量
    bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");
    bytes32 public constant PROPERTY_MANAGER = keccak256("PROPERTY_MANAGER");
    
    // 事件
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

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
        
        // 设置角色管理员
        _setRoleAdmin(SUPER_ADMIN, SUPER_ADMIN);
        _setRoleAdmin(PROPERTY_MANAGER, SUPER_ADMIN);
        
        // 授予部署者默认管理员角色
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(SUPER_ADMIN) {}
}