// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title RealEstateToken
 * @dev 房产代币，代表对特定房产的所有权份额
 */
contract RealEstateToken is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    // 角色定义
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // 房产信息
    string public propertyId;
    PropertyRegistry public propertyRegistry;
    
    // 白名单映射
    mapping(address => bool) public whitelist;
    
    // 转账限制开关
    bool public transferRestricted;
    
    // 白名单功能开关
    bool public whitelistEnabled;
    
    // 事件
    event WhitelistUpdated(address indexed user, bool status);
    event TransferRestrictionUpdated(bool restricted);
    event WhitelistEnabledUpdated(bool enabled);
    event OperationalStatusUpdated(OperationalStatus status);

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
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        propertyId = _propertyId;
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        transferRestricted = true;
        whitelistEnabled = false; // 默认不启用白名单功能
        
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(SUPER_ADMIN_ROLE, _admin);
        _setupRole(MINTER_ROLE, _admin);
        
        // 自动将管理员添加到白名单
        whitelist[_admin] = true;
    }
    
    /**
     * @dev 铸造代币
     * @param to 接收者地址
     * @param amount 代币数量
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    /**
     * @dev 销毁代币
     * @param amount 代币数量
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
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
    function transfer(address to, uint256 amount) public override returns (bool) {
        _checkTransferRestrictions(msg.sender, to);
        return super.transfer(to, amount);
    }
    
    /**
     * @dev 重写transferFrom函数，添加白名单检查
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
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
    
    /**
     * @dev 设置运营状态
     * @param _status 运营状态
     */
    function setOperationalStatus(OperationalStatus _status) external onlyRole(SUPER_ADMIN_ROLE) {
        operationalStatus = _status;
        emit OperationalStatusUpdated(_status);
    }

    /**
     * @dev 检查转账限制
     */
    function _checkTransferRestrictions(address from, address to) internal view {
        // 检查房产注册状态
        PropertyRegistry.Property memory property = propertyRegistry.getProperty(propertyId);
        PropertyRegistry.PropertyStatus registrationStatus = property.status;
        
        // 检查房产是否已下架
        if (registrationStatus == PropertyRegistry.PropertyStatus.Delisted) {
            require(
                hasRole(SUPER_ADMIN_ROLE, from) || hasRole(SUPER_ADMIN_ROLE, to),
                "When delisted, only admins can transfer tokens"
            );
        }
        
        // 检查房产是否已审核通过
        require(
            registrationStatus == PropertyRegistry.PropertyStatus.Approved || 
            hasRole(SUPER_ADMIN_ROLE, from) || 
            hasRole(SUPER_ADMIN_ROLE, to),
            "Property not in approved status"
        );
        
        // 检查运营状态
        if (operationalStatus == OperationalStatus.Frozen) {
            revert("Transfers frozen: property is in frozen state");
        }
        
        if (operationalStatus == OperationalStatus.Redemption) {
            // 在赎回状态下，只允许向管理员转账（用于赎回流程）
            require(
                hasRole(SUPER_ADMIN_ROLE, to) || hasRole(MINTER_ROLE, to),
                "During redemption, transfers only allowed to admins"
            );
        }
        
        // 白名单检查（如果启用）
        if (transferRestricted && whitelistEnabled) {
            require(whitelist[to], "Recipient not whitelisted");
        }
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(SUPER_ADMIN_ROLE) {}
}