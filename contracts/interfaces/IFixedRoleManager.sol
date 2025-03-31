// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFixedRoleManager {
    // 角色常量
    function SUPER_ADMIN() external view returns (bytes32);
    function PROPERTY_MANAGER() external view returns (bytes32);
    function TOKEN_MANAGER() external view returns (bytes32);
    function MARKETPLACE_MANAGER() external view returns (bytes32);
    function FEE_MANAGER() external view returns (bytes32);
    function REDEMPTION_MANAGER() external view returns (bytes32);
    function FEE_COLLECTOR() external view returns (bytes32);
    function SNAPSHOT_ROLE() external view returns (bytes32);
    function MINTER_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);
    
    // 角色相关方法
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
    
    // 辅助方法
    function deployer() external view returns (address);
    function version() external view returns (uint256);
}
