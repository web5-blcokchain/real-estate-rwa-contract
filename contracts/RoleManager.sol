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
    
    // 部署者地址，用于紧急恢复
    address public deployer;
    
    // 角色常量
    bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");
    bytes32 public constant PROPERTY_MANAGER = keccak256("PROPERTY_MANAGER");
    bytes32 public constant TOKEN_MANAGER = keccak256("TOKEN_MANAGER");
    bytes32 public constant MARKETPLACE_MANAGER = keccak256("MARKETPLACE_MANAGER");
    bytes32 public constant FEE_MANAGER = keccak256("FEE_MANAGER");
    bytes32 public constant REDEMPTION_MANAGER = keccak256("REDEMPTION_MANAGER");
    bytes32 public constant FEE_COLLECTOR = keccak256("FEE_COLLECTOR"); // 添加费用收集者角色
    
    // 事件
    event RoleManagerInitialized(address deployer, uint256 version);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    event EmergencyAdminRecovery(address indexed deployer);
    event EmergencyRoleGranted(address indexed deployer, bytes32 indexed role, address indexed account);
    
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
        
        // 记录部署者地址
        deployer = msg.sender;
        version = 1;
        
        // 步骤1: 先授予DEFAULT_ADMIN_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // 步骤2: 设置角色管理关系
        _setRoleAdmin(SUPER_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(PROPERTY_MANAGER, SUPER_ADMIN);
        _setRoleAdmin(TOKEN_MANAGER, SUPER_ADMIN);
        _setRoleAdmin(MARKETPLACE_MANAGER, SUPER_ADMIN);
        _setRoleAdmin(FEE_MANAGER, SUPER_ADMIN);
        _setRoleAdmin(REDEMPTION_MANAGER, SUPER_ADMIN);
        _setRoleAdmin(FEE_COLLECTOR, SUPER_ADMIN);
        
        // 步骤3: 最后授予SUPER_ADMIN角色
        _grantRole(SUPER_ADMIN, msg.sender);
        
        // 验证初始化结果
        bool hasDefaultAdmin = hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bool hasSuperAdmin = hasRole(SUPER_ADMIN, msg.sender);
        
        // 确保部署者拥有必要权限，否则初始化应该失败
        require(hasDefaultAdmin, "Initialization failed: deployer is not DEFAULT_ADMIN");
        require(hasSuperAdmin, "Initialization failed: deployer is not SUPER_ADMIN");
        
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

    /**
     * @dev 紧急恢复函数 - 允许部署者在出现问题时重新获得管理员权限
     */
    function emergencyRecoverAdmin() external {
        require(msg.sender == deployer, "Only deployer can recover admin role");
        
        // 检查部署者是否已有DEFAULT_ADMIN_ROLE
        if (!hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            // 直接授予部署者DEFAULT_ADMIN_ROLE
            _grantRole(DEFAULT_ADMIN_ROLE, deployer);
            emit EmergencyAdminRecovery(deployer);
        }
        
        // 检查部署者是否已有SUPER_ADMIN
        if (!hasRole(SUPER_ADMIN, deployer)) {
            // 授予部署者SUPER_ADMIN角色
            _grantRole(SUPER_ADMIN, deployer);
        }
    }
    
    /**
     * @dev 紧急授予角色 - 只有部署者可以调用，用于紧急情况
     */
    function emergencyGrantRole(bytes32 role, address account) external {
        require(msg.sender == deployer, "Only deployer can emergency grant roles");
        require(account != address(0), "Cannot grant role to zero address");
        
        _grantRole(role, account);
        emit EmergencyRoleGranted(deployer, role, account);
    }

    /**
     * @dev 验证角色管理结构是否正确
     * 该函数在每次角色授予前被内部调用，确保角色管理关系正确
     */
    function validateRoleStructure() internal {
        // 验证SUPER_ADMIN角色的管理员是DEFAULT_ADMIN_ROLE
        bytes32 adminRole = getRoleAdmin(SUPER_ADMIN);
        if (adminRole != DEFAULT_ADMIN_ROLE) {
            // 如果管理关系不正确，修复它
            _setRoleAdmin(SUPER_ADMIN, DEFAULT_ADMIN_ROLE);
        }
        
        // 验证其他角色的管理员是SUPER_ADMIN
        if (getRoleAdmin(PROPERTY_MANAGER) != SUPER_ADMIN) {
            _setRoleAdmin(PROPERTY_MANAGER, SUPER_ADMIN);
        }
        
        if (getRoleAdmin(TOKEN_MANAGER) != SUPER_ADMIN) {
            _setRoleAdmin(TOKEN_MANAGER, SUPER_ADMIN);
        }
        
        if (getRoleAdmin(MARKETPLACE_MANAGER) != SUPER_ADMIN) {
            _setRoleAdmin(MARKETPLACE_MANAGER, SUPER_ADMIN);
        }
        
        if (getRoleAdmin(FEE_MANAGER) != SUPER_ADMIN) {
            _setRoleAdmin(FEE_MANAGER, SUPER_ADMIN);
        }
        
        if (getRoleAdmin(REDEMPTION_MANAGER) != SUPER_ADMIN) {
            _setRoleAdmin(REDEMPTION_MANAGER, SUPER_ADMIN);
        }
        
        if (getRoleAdmin(FEE_COLLECTOR) != SUPER_ADMIN) {
            _setRoleAdmin(FEE_COLLECTOR, SUPER_ADMIN);
        }
    }

    /**
     * @dev 重写grantRole函数，添加角色结构验证
     * @param role 要授予的角色
     * @param account 接收角色的账户
     */
    function grantRole(bytes32 role, address account) public override(AccessControlUpgradeable) {
        // 每次授予角色前，先验证角色结构
        validateRoleStructure();
        
        // 继续原始的grantRole逻辑
        super.grantRole(role, account);
    }
}