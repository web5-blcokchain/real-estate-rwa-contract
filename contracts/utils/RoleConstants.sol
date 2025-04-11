// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RoleConstants
 * @dev 集中定义所有角色常量，确保系统中角色定义一致
 */
library RoleConstants {
    // 角色哈希值
    function ADMIN_ROLE() internal pure returns (bytes32) {
        return 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775;
    }
    
    function MANAGER_ROLE() internal pure returns (bytes32) {
        return 0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08;
    }
    
    function OPERATOR_ROLE() internal pure returns (bytes32) {
        return 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929;
    }
    
    // 角色名称
    function ADMIN_ROLE_NAME() internal pure returns (string memory) {
        return "ADMIN_ROLE";
    }
    
    function MANAGER_ROLE_NAME() internal pure returns (string memory) {
        return "MANAGER_ROLE";
    }
    
    function OPERATOR_ROLE_NAME() internal pure returns (string memory) {
        return "OPERATOR_ROLE";
    }
    
    // 权限控制角色
    function PAUSER_ROLE() internal pure returns (bytes32) {
        return keccak256("PAUSER_ROLE");
    }
    
    function UPGRADER_ROLE() internal pure returns (bytes32) {
        return keccak256("UPGRADER_ROLE");
    }
} 