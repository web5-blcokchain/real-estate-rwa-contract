// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./PropertyRegistry.sol";

/**
 * @title RealEstateToken
 * @dev 房产通证化的ERC20代币合约，包含暂停、快照和访问控制功能
 */
contract RealEstateToken is 
    ERC20Upgradeable, 
    ERC20SnapshotUpgradeable, 
    PausableUpgradeable, 
    AccessControlUpgradeable,
    UUPSUpgradeable {
    
    // 合约版本，用于追踪升级
    uint256 public version;
    
    // 角色定义
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    
    // 房产信息
    string public propertyId;
    PropertyRegistry public propertyRegistry;
    
    // 白名单映射
    mapping(address => bool) public whitelist;
    
    // 转账限制开关
    bool public transferRestricted;
    
    // 白名单功能开关
    bool public whitelistEnabled;
    
    // 代币总供应量上限
    uint256 public maxSupply;
    
    // 事件
    event WhitelistUpdated(address indexed user, bool status);
    event WhitelistBatchUpdated(uint256 count, bool status);
    event TransferRestrictionUpdated(bool restricted);
    event WhitelistEnabledUpdated(bool indexed enabled);
    event MaxSupplyUpdated(uint256 indexed oldMaxSupply, uint256 indexed newMaxSupply);
    event TokenInitialized(string propertyId, address admin, uint256 version);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize(
        string memory _propertyId,
        string memory _name,
        string memory _symbol,
        address _admin,
        address _propertyRegistry
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Snapshot_init();
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        propertyId = _propertyId;
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        transferRestricted = true;
        whitelistEnabled = false; // 默认不启用白名单功能
        maxSupply = 1000000000 * 10**decimals(); // 默认设置为10亿代币
        version = 1; // 初始版本
        
        // 使用_grantRole替代过时的_setupRole
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SUPER_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(SNAPSHOT_ROLE, _admin);
        
        // 自动将管理员添加到白名单
        whitelist[_admin] = true;
        
        emit TokenInitialized(_propertyId, _admin, version);
    }
    
    /**
     * @dev 铸造代币
     * @param to 接收者地址
     * @param amount 代币数量
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        // 检查是否超过最大供应量
        require(totalSupply() + amount <= maxSupply, "Exceeds maximum supply");
        _mint(to, amount);
    }
    
    /**
     * @dev 销毁代币
     * @param amount 代币数量
     */
    function burn(uint256 amount) external whenNotPaused {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev 设置最大供应量
     * @param _maxSupply 新的最大供应量
     */
    function setMaxSupply(uint256 _maxSupply) external onlyRole(SUPER_ADMIN_ROLE) {
        require(_maxSupply >= totalSupply(), "New max supply must be >= current total supply");
        uint256 oldMaxSupply = maxSupply;
        maxSupply = _maxSupply;
        emit MaxSupplyUpdated(oldMaxSupply, _maxSupply);
    }
    
    /**
     * @dev 暂停所有代币转账
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev 恢复所有代币转账
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev 启用/禁用转账限制
     * @param _restricted 是否限制
     */
    function setTransferRestriction(bool _restricted) external onlyRole(SUPER_ADMIN_ROLE) {
        transferRestricted = _restricted;
        emit TransferRestrictionUpdated(_restricted);
    }
    
    /**
     * @dev 启用/禁用白名单功能
     * @param _enabled 是否启用
     */
    function setWhitelistEnabled(bool _enabled) external onlyRole(SUPER_ADMIN_ROLE) {
        whitelistEnabled = _enabled;
        emit WhitelistEnabledUpdated(_enabled);
    }
    
    /**
     * @dev 添加地址到白名单
     * @param _user 用户地址
     */
    function addToWhitelist(address _user) external onlyRole(SUPER_ADMIN_ROLE) {
        require(_user != address(0), "Invalid address");
        whitelist[_user] = true;
        emit WhitelistUpdated(_user, true);
    }
    
    /**
     * @dev 从白名单中移除地址
     * @param _user 用户地址
     */
    function removeFromWhitelist(address _user) external onlyRole(SUPER_ADMIN_ROLE) {
        require(_user != address(0), "Invalid address");
        whitelist[_user] = false;
        emit WhitelistUpdated(_user, false);
    }
    
    /**
     * @dev 批量添加地址到白名单
     * @param _users 用户地址数组
     */
    function batchAddToWhitelist(address[] calldata _users) external onlyRole(SUPER_ADMIN_ROLE) {
        for (uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Invalid address");
            whitelist[_users[i]] = true;
        }
        emit WhitelistBatchUpdated(_users.length, true);
    }
    
    /**
     * @dev 批量从白名单中移除地址
     * @param _users 用户地址数组
     */
    function batchRemoveFromWhitelist(address[] calldata _users) external onlyRole(SUPER_ADMIN_ROLE) {
        for (uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Invalid address");
            whitelist[_users[i]] = false;
        }
        emit WhitelistBatchUpdated(_users.length, false);
    }
    
    /**
     * @dev 在转账前检查各种限制条件
     * @param from 发送者地址
     * @param to 接收者地址
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20SnapshotUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
        
        // 当合约暂停时，只允许特权角色进行操作
        if (paused()) {
            require(hasRole(PAUSER_ROLE, msg.sender), "Token transfers paused");
        }
        
        // 如果不是铸造或销毁操作，检查转账限制
        if (from != address(0) && to != address(0)) {
            _checkTransferRestrictions(from, to);
        }
    }
    
    /**
     * @dev 检查转账限制
     * @param from 发送者地址
     * @param to 接收者地址
     */
    function _checkTransferRestrictions(address from, address to) internal view {
        // 如果没有开启转账限制，则不需要检查
        if (!transferRestricted) {
            return;
        }
        
        // 管理员可以绕过限制
        if (hasRole(SUPER_ADMIN_ROLE, from) || hasRole(SUPER_ADMIN_ROLE, to)) {
            return;
        }
        
        // 获取房产状态
        PropertyRegistry.PropertyStatus status = propertyRegistry.getPropertyStatus(propertyId);
        
        // 检查房产状态
        if (status == PropertyRegistry.PropertyStatus.Delisted) {
            require(
                hasRole(SUPER_ADMIN_ROLE, from) || hasRole(SUPER_ADMIN_ROLE, to),
                "When delisted, only admins can transfer tokens"
            );
        }
        
        // 检查房产是否已审核通过
        require(
            status == PropertyRegistry.PropertyStatus.Approved || 
            hasRole(SUPER_ADMIN_ROLE, from) || 
            hasRole(SUPER_ADMIN_ROLE, to),
            "Property not in approved status"
        );
        
        // 白名单检查（如果启用）
        if (transferRestricted && whitelistEnabled) {
            require(whitelist[to], "Recipient not whitelisted");
        }
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(SUPER_ADMIN_ROLE) {
        // 更新版本号
        uint256 oldVersion = version;
        version += 1;
        emit VersionUpdated(oldVersion, version);
    }
    
    /**
     * @dev 批量转账
     * @param recipients 接收者地址数组
     * @param amounts 代币数量数组
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external whenNotPaused {
        require(recipients.length == amounts.length, "Array lengths must match");
        
        // 只检查一次转账发起者是否符合条件
        address sender = msg.sender;
        if (transferRestricted && !hasRole(SUPER_ADMIN_ROLE, sender)) {
            PropertyRegistry.PropertyStatus status = propertyRegistry.getPropertyStatus(propertyId);
            require(
                status == PropertyRegistry.PropertyStatus.Approved,
                "Property not in approved status"
            );
        }
        
        // 执行批量转账
        for (uint256 i = 0; i < recipients.length; i++) {
            // 检查接收者是否符合白名单条件
            if (transferRestricted && whitelistEnabled) {
                require(whitelist[recipients[i]], "Recipient not whitelisted");
            }
            _transfer(sender, recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev 创建快照
     * @return 快照ID
     */
    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }
    
    /**
     * @dev 检查特定地址是否在白名单中
     * @param account 要检查的地址
     * @return 是否在白名单中
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelist[account];
    }
    
    /**
     * @dev 检查当前可用供应量
     * @return availableSupply 可用供应量
     */
    function availableSupply() external view returns (uint256 availableSupply) {
        return maxSupply - totalSupply();
    }
}