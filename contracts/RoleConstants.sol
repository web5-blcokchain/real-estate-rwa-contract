// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RoleConstants - 日本房地产数字化平台角色常量定义
 * @author Fashi Shijian团队
 * @notice 本合约定义了系统中使用的所有角色常量，为权限控制提供标准化的角色标识
 * 
 * @dev 合约功能描述：
 * 1. 角色常量定义：提供系统中所有角色的标准化哈希值
 * 2. 角色名称映射：提供角色哈希值到可读名称的映射，便于日志和调试
 * 3. 权限层级设计：设计角色之间的继承关系（ADMIN > MANAGER > OPERATOR）
 * 
 * @dev 系统角色说明：
 * - ADMIN_ROLE：最高权限角色，可执行所有操作，包括系统配置、紧急暂停、合约升级等
 * - MANAGER_ROLE：管理权限角色，可执行管理操作，包括审核房产、管理分配、维护黑名单等
 * - OPERATOR_ROLE：基础操作角色，可执行日常操作，包括注册房产、创建订单、查询信息等
 * 
 * @dev 与其他模块的关联：
 * - RealEstateSystem：使用这些角色常量进行权限验证
 * - PropertyManager：继承系统权限结构，验证操作权限
 * - TradingManager：使用角色常量确认交易相关权限
 * - RewardManager：使用角色常量验证分配操作权限
 * - RealEstateFacade：代理权限验证，使用这些角色常量
 * 
 * @dev 使用方式：
 * 1. 作为常量库被其他合约引用
 * 2. 用于AccessControl相关函数的权限验证
 * 3. 用于权限检查和事件记录
 * 
 * @dev 扩展说明：
 * - 添加新角色时需要生成不冲突的角色哈希值
 * - 角色关系应在RealEstateSystem中配置（通过_setRoleAdmin函数）
 * - 合约选择纯常量形式实现，无状态存储，降低gas消耗
 */
contract RoleConstants {
    // 角色哈希值
    bytes32 public constant ADMIN_ROLE = 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775;
    bytes32 public constant MANAGER_ROLE = 0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08;
    bytes32 public constant OPERATOR_ROLE = 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929;
    
    // 角色名称
    string public constant ADMIN_ROLE_NAME = "ADMIN_ROLE";
    string public constant MANAGER_ROLE_NAME = "MANAGER_ROLE";
    string public constant OPERATOR_ROLE_NAME = "OPERATOR_ROLE";
} 