// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./RoleManager.sol";

/**
 * @title PropertyRegistry
 * @dev 管理房产资产的注册和审核（可升级版本）
 */
contract PropertyRegistry is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    RoleManager public roleManager;

    // 房产状态
    enum PropertyStatus { 
        NotRegistered,    // 未注册
        Pending,          // 待审核
        Approved,         // 已批准
        Tokenized,        // 已通证化
        Rejected,         // 已拒绝
        Delisted          // 已下架
    }

    // 精简后的房产信息（只保留关键信息）
    struct Property {
        string propertyId;            // 房产ID
        string country;               // 所属国家
        uint256 registrationTime;     // 注册时间
        address propertyManager;      // 房产管理员
        PropertyStatus status;        // 状态
        address tokenAddress;         // 代币地址
        string metadataURI;           // 元数据URI（指向中心化数据库）
    }

    // 房产映射
    mapping(string => Property) public properties;
    
    // 房产ID列表
    string[] public propertyIds;

    // 事件
    event PropertyRegistered(string propertyId, address propertyManager, string metadataURI);
    event PropertyApproved(string propertyId, address approver);
    event PropertyRejected(string propertyId, address rejector);
    event PropertyTokenized(string propertyId, address tokenAddress);
    event PropertyDelisted(string propertyId);
    event MetadataUpdated(string propertyId, string metadataURI);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     * @param _roleManager 角色管理合约地址
     */
    function initialize(address _roleManager) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
    }

    /**
     * @dev 修饰器：只有超级管理员可以调用
     */
    modifier onlySuperAdmin() {
        require(roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), "Caller is not a super admin");
        _;
    }

    /**
     * @dev 修饰器：只有房产管理员可以调用
     */
    modifier onlyPropertyManager() {
        require(roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender), "Caller is not a property manager");
        _;
    }

    /**
     * @dev 修饰器：只有特定房产的管理员可以调用
     */
    modifier onlyPropertyOwner(string memory propertyId) {
        require(properties[propertyId].propertyManager == msg.sender || 
                roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), 
                "Not property owner or super admin");
        _;
    }

    /**
     * @dev 注册新房产（精简版）
     * @param propertyId 房产ID
     * @param country 所属国家
     * @param metadataURI 元数据URI
     */
    function registerProperty(
        string memory propertyId,
        string memory country,
        string memory metadataURI
    ) external onlyPropertyManager nonReentrant {
        require(bytes(propertyId).length > 0, "Property ID cannot be empty");
        require(properties[propertyId].status == PropertyStatus.NotRegistered, "Property already registered");
        
        properties[propertyId] = Property({
            propertyId: propertyId,
            country: country,
            registrationTime: block.timestamp,
            propertyManager: msg.sender,
            status: PropertyStatus.Pending,
            tokenAddress: address(0),
            metadataURI: metadataURI
        });
        
        propertyIds.push(propertyId);
        emit PropertyRegistered(propertyId, msg.sender, metadataURI);
    }

    /**
     * @dev 更新房产元数据
     * @param propertyId 房产ID
     * @param metadataURI 新的元数据URI
     */
    function updateMetadata(string memory propertyId, string memory metadataURI) external onlyPropertyOwner(propertyId) {
        require(properties[propertyId].status != PropertyStatus.NotRegistered, "Property not registered");
        require(properties[propertyId].status != PropertyStatus.Delisted, "Property delisted");
        
        properties[propertyId].metadataURI = metadataURI;
        emit MetadataUpdated(propertyId, metadataURI);
    }

    /**
     * @dev 批准房产
     * @param propertyId 房产ID
     */
    function approveProperty(string memory propertyId) external onlySuperAdmin {
        require(properties[propertyId].status == PropertyStatus.Pending, "Property not pending");
        
        properties[propertyId].status = PropertyStatus.Approved;
        emit PropertyApproved(propertyId, msg.sender);
    }

    /**
     * @dev 拒绝房产
     * @param propertyId 房产ID
     */
    function rejectProperty(string memory propertyId) external onlySuperAdmin {
        require(properties[propertyId].status == PropertyStatus.Pending, "Property not pending");
        
        properties[propertyId].status = PropertyStatus.Rejected;
        emit PropertyRejected(propertyId, msg.sender);
    }

    /**
     * @dev 设置房产已通证化
     * @param propertyId 房产ID
     * @param tokenAddress 代币地址
     */
    function setPropertyTokenized(string memory propertyId, address tokenAddress) external onlySuperAdmin {
        require(properties[propertyId].status == PropertyStatus.Approved, "Property not approved");
        require(tokenAddress != address(0), "Invalid token address");
        
        properties[propertyId].status = PropertyStatus.Tokenized;
        properties[propertyId].tokenAddress = tokenAddress;
        
        emit PropertyTokenized(propertyId, tokenAddress);
    }

    /**
     * @dev 下架房产
     * @param propertyId 房产ID
     */
    function delistProperty(string memory propertyId) external onlySuperAdmin {
        require(properties[propertyId].status != PropertyStatus.NotRegistered, "Property not registered");
        require(properties[propertyId].status != PropertyStatus.Delisted, "Property already delisted");
        
        properties[propertyId].status = PropertyStatus.Delisted;
        emit PropertyDelisted(propertyId);
    }

    /**
     * @dev 获取房产数量
     * @return 房产数量
     */
    function getPropertyCount() external view returns (uint256) {
        return propertyIds.length;
    }

    /**
     * @dev 获取房产详情
     * @param propertyId 房产ID
     * @return 国家, 状态, 代币地址, 元数据URI
     */
    function getPropertyDetails(string memory propertyId) external view returns (
        string memory, PropertyStatus, address, string memory
    ) {
        Property storage prop = properties[propertyId];
        return (
            prop.country,
            prop.status,
            prop.tokenAddress,
            prop.metadataURI
        );
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}