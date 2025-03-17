// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RoleManager
 * @dev 管理系统中的所有角色和权限
 */
contract RoleManager is AccessControl {
    // 角色定义
    bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");           // 超级管理员
    bytes32 public constant PLATFORM_MAINTAINER = keccak256("PLATFORM_MAINTAINER"); // 平台维护者
    bytes32 public constant PROPERTY_MANAGER = keccak256("PROPERTY_MANAGER");  // 房产维护者（地区管理员）
    bytes32 public constant KYC_VERIFIER = keccak256("KYC_VERIFIER");         // KYC验证员
    bytes32 public constant FEE_COLLECTOR = keccak256("FEE_COLLECTOR");       // 费用收集者

    // 事件
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev 构造函数，设置调用者为默认管理员和超级管理员
     */
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(SUPER_ADMIN, msg.sender);
    }

    /**
     * @dev 授予角色
     * @param role 角色
     * @param account 账户地址
     */
    function grantRole(bytes32 role, address account) public override onlyRole(SUPER_ADMIN) {
        super.grantRole(role, account);
        emit RoleGranted(role, account, msg.sender);
    }

    /**
     * @dev 撤销角色
     * @param role 角色
     * @param account 账户地址
     */
    function revokeRole(bytes32 role, address account) public override onlyRole(SUPER_ADMIN) {
        super.revokeRole(role, account);
        emit RoleRevoked(role, account, msg.sender);
    }
}