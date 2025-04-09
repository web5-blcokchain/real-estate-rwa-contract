// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title RoleConstants
 * @dev 集中定义所有角色常量，确保系统中角色定义一致
 */
library RoleConstants {
    // 角色常量 - 使用固定bytes32值保证一致性
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // 权限控制角色
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
} 