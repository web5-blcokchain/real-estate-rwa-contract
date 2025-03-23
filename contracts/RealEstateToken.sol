// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./PropertyRegistry.sol";

/**
 * @title RealEstateToken
 * @dev 房产代币，代表对特定房产的所有权份额
 */
// 在合约定义中添加ERC20SnapshotUpgradeable
contract RealEstateToken is Initializable, ERC20Upgradeable, ERC20SnapshotUpgradeable, AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    // 角色定义
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE"); // 添加快照角色
    
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
    event TransferRestrictionUpdated(bool restricted);
    event WhitelistEnabledUpdated(bool indexed enabled);
    event MaxSupplyUpdated(uint256 indexed oldMaxSupply, uint256 indexed newMaxSupply);
    
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
        // 将传入的地址转换为PropertyRegistry合约实例，用于后续调用PropertyRegistry的函数
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        transferRestricted = true;
        whitelistEnabled = false; // 默认不启用白名单功能
        maxSupply = 1000000000 * 10**decimals(); // 默认设置为10亿代币
        
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(SUPER_ADMIN_ROLE, _admin);
        _setupRole(MINTER_ROLE, _admin);
        _setupRole(PAUSER_ROLE, _admin);
        
        // 自动将管理员添加到白名单
        whitelist[_admin] = true;
    }
    
    /**
     * @dev 铸造代币
     * @param to 接收者地址
     * @param amount 代币数量
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
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
     * @dev 暂停所有代币操作
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev 恢复所有代币操作
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev 设置转账限制状态
     * @param _restricted 是否限制
     */
    function setTransferRestriction(bool _restricted) external onlyRole(SUPER_ADMIN_ROLE) {
        transferRestricted = _restricted;
        emit TransferRestrictionUpdated(_restricted);
    }
    
    /**
     * @dev 添加用户到白名单
     * @param _user 用户地址
     */
    function addToWhitelist(address _user) external onlyRole(SUPER_ADMIN_ROLE) {
        whitelist[_user] = true;
        emit WhitelistUpdated(_user, true);
    }
    
    /**
     * @dev 从白名单移除用户
     * @param _user 用户地址
     */
    function removeFromWhitelist(address _user) external onlyRole(SUPER_ADMIN_ROLE) {
        whitelist[_user] = false;
        emit WhitelistUpdated(_user, false);
    }
    
    /**
     * @dev 批量添加用户到白名单
     * @param _users 用户地址数组
     */
    function batchAddToWhitelist(address[] calldata _users) external onlyRole(SUPER_ADMIN_ROLE) {
        for (uint256 i = 0; i < _users.length; i++) {
            whitelist[_users[i]] = true;
            emit WhitelistUpdated(_users[i], true);
        }
    }
    
    /**
     * @dev 批量从白名单移除用户
     * @param _users 用户地址数组
     */
    function batchRemoveFromWhitelist(address[] calldata _users) external onlyRole(SUPER_ADMIN_ROLE) {
        for (uint256 i = 0; i < _users.length; i++) {
            whitelist[_users[i]] = false;
            emit WhitelistUpdated(_users[i], false);
        }
    }
    
    /**
     * @dev 重写transfer函数，添加白名单检查
     */
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        _checkTransferRestrictions(msg.sender, to);
        return super.transfer(to, amount);
    }
    
    /**
     * @dev 重写transferFrom函数，添加白名单检查
     */
    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        _checkTransferRestrictions(from, to);
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev 设置白名单功能开关
     * @param _enabled 是否启用白名单
     */
    function setWhitelistEnabled(bool _enabled) external onlyRole(SUPER_ADMIN_ROLE) {
        whitelistEnabled = _enabled;
        emit WhitelistEnabledUpdated(_enabled);
    }
    
    // 删除: 
    // function setOperationalStatus(OperationalStatus _status) external onlyRole(SUPER_ADMIN_ROLE) {
    //     operationalStatus = _status;
    //     emit OperationalStatusUpdated(_status);
    // }

    /**
     * @dev 检查转账限制
     */
    /**
     * @dev 检查转账限制
     */
    function _checkTransferRestrictions(address from, address to) internal view {
        // 获取房产信息
        PropertyRegistry.Property memory property = propertyRegistry.getProperty(propertyId);
        PropertyRegistry.PropertyStatus status = property.status;
        
        // 检查房产状态
        if (status == PropertyRegistry.PropertyStatus.Frozen) {
            revert("Transfers frozen: property is in frozen state");
        }
        
        if (status == PropertyRegistry.PropertyStatus.Redemption) {
            // 在赎回状态下，只允许向管理员转账（用于赎回流程）
            require(
                hasRole(SUPER_ADMIN_ROLE, to) || hasRole(MINTER_ROLE, to),
                "During redemption, transfers only allowed to admins"
            );
        }
        
        if (status == PropertyRegistry.PropertyStatus.Delisted) {
            // 在下架状态下，可以增加特定的限制
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
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(SUPER_ADMIN_ROLE) {}
    
    /**
     * @dev 批量转账
     * @param recipients 接收者地址数组
     * @param amounts 代币数量数组
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external whenNotPaused {
        require(recipients.length == amounts.length, "Array lengths must match");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _checkTransferRestrictions(msg.sender, recipients[i]);
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev 创建快照
     * @return 快照ID
     */
    // 添加 SNAPSHOT_ROLE 常量
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    
    // 添加 snapshot 函数
    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }
    
    // 重写 _beforeTokenTransfer 函数
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20SnapshotUpgradeable, PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}