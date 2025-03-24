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
    bytes32 public constant PROPERTY_STATUS_CHECKER_ROLE = keccak256("PROPERTY_STATUS_CHECKER_ROLE");
    
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
    event BatchTransferCompleted(address indexed sender, uint256 successCount, uint256 failureCount);
    event BatchTransferFailures(
        address indexed sender, 
        address[] recipients, 
        uint256[] amounts, 
        string[] reasons, 
        uint256 failureCount
    );
    
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
        
        // 验证propertyId不为空
        require(bytes(_propertyId).length > 0, "Property ID cannot be empty");
        
        // 验证PropertyRegistry合约地址有效
        require(_propertyRegistry != address(0), "PropertyRegistry address cannot be zero");
        PropertyRegistry registry = PropertyRegistry(_propertyRegistry);
        
        // 可选：检查propertyId是否存在并已批准 (取消注释如需启用)
        // require(registry.isPropertyApproved(_propertyId), "Property not approved");
        
        propertyId = _propertyId;
        propertyRegistry = registry;
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
     * @return addedCount 实际添加的数量
     */
    function batchAddToWhitelist(address[] calldata _users) external onlyRole(SUPER_ADMIN_ROLE) returns (uint256 addedCount) {
        addedCount = 0;
        for (uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Invalid address");
            // 只有当地址不在白名单中时才添加，避免重复操作
            if (!whitelist[_users[i]]) {
                whitelist[_users[i]] = true;
                addedCount++;
            }
        }
        
        if (addedCount > 0) {
            emit WhitelistBatchUpdated(addedCount, true);
        }
        
        return addedCount;
    }
    
    /**
     * @dev 批量从白名单中移除地址
     * @param _users 用户地址数组
     * @return removedCount 实际移除的数量
     */
    function batchRemoveFromWhitelist(address[] calldata _users) external onlyRole(SUPER_ADMIN_ROLE) returns (uint256 removedCount) {
        removedCount = 0;
        for (uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Invalid address");
            // 只有当地址在白名单中时才移除，避免重复操作
            if (whitelist[_users[i]]) {
                whitelist[_users[i]] = false;
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            emit WhitelistBatchUpdated(removedCount, false);
        }
        
        return removedCount;
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
        
        // 获取房产状态，使用PropertyRegistry而不是接口
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
     * @return successCount 成功转账数量
     * @return failureCount 失败转账数量
     */
    function batchTransfer(address[] memory recipients, uint256[] memory amounts) 
        external 
        whenNotPaused 
        returns (uint256 successCount, uint256 failureCount) 
    {
        require(recipients.length == amounts.length, "Array lengths must match");
        require(recipients.length > 0, "Empty recipients array");
        
        // 初始化成功和失败计数器
        successCount = 0;
        failureCount = 0;
        
        // 预检查总金额，确保发送者余额充足
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(balanceOf(msg.sender) >= totalAmount, "Insufficient total balance");
        
        // 创建事件数组存储失败的转账信息
        address[] memory failedRecipients = new address[](recipients.length);
        uint256[] memory failedAmounts = new uint256[](recipients.length);
        string[] memory failReasons = new string[](recipients.length);
        
        // 只检查一次转账发起者是否符合条件
        address sender = msg.sender;
        if (transferRestricted && !hasRole(SUPER_ADMIN_ROLE, sender)) {
            PropertyRegistry.PropertyStatus status = propertyRegistry.getPropertyStatus(propertyId);
            require(
                status == PropertyRegistry.PropertyStatus.Approved,
                "Property not in approved status"
            );
        }
        
        // 预先检查白名单状态，避免在循环中重复检查
        bool needsWhitelist = transferRestricted && whitelistEnabled;
        
        // 执行批量转账
        for (uint256 i = 0; i < recipients.length; i++) {
            // 检查接收者地址是否有效
            if (recipients[i] == address(0)) {
                failedRecipients[failureCount] = recipients[i];
                failedAmounts[failureCount] = amounts[i];
                failReasons[failureCount] = "Recipient is zero address";
                failureCount++;
                continue;
            }
            
            // 检查接收者是否符合白名单条件
            if (needsWhitelist && !whitelist[recipients[i]]) {
                failedRecipients[failureCount] = recipients[i];
                failedAmounts[failureCount] = amounts[i];
                failReasons[failureCount] = "Recipient not whitelisted";
                failureCount++;
                continue;
            }
            
            // 执行转账
            try this.transfer(recipients[i], amounts[i]) returns (bool success) {
                if (success) {
                    successCount++;
                } else {
                    failedRecipients[failureCount] = recipients[i];
                    failedAmounts[failureCount] = amounts[i];
                    failReasons[failureCount] = "Transfer failed";
                    failureCount++;
                }
            } catch Error(string memory reason) {
                failedRecipients[failureCount] = recipients[i];
                failedAmounts[failureCount] = amounts[i];
                failReasons[failureCount] = reason;
                failureCount++;
            } catch {
                failedRecipients[failureCount] = recipients[i];
                failedAmounts[failureCount] = amounts[i];
                failReasons[failureCount] = "Unknown error";
                failureCount++;
            }
        }
        
        // 验证总和是否一致
        require(successCount + failureCount == recipients.length, "Transfer count mismatch");
        
        // 触发批量转账结果事件
        emit BatchTransferCompleted(sender, successCount, failureCount);
        
        // 记录详细的失败信息
        if (failureCount > 0) {
            emit BatchTransferFailures(sender, failedRecipients, failedAmounts, failReasons, failureCount);
        }
        
        return (successCount, failureCount);
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