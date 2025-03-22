// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./RoleManager.sol";

/**
 * @title PropertyRegistry
 * @dev 管理房产注册和审核（可升级版本）
 */
contract PropertyRegistry is Initializable, UUPSUpgradeable {
    RoleManager public roleManager;
    
    // 房产状态
    enum PropertyStatus { NotRegistered, Pending, Approved, Rejected, Delisted }
    
    // 房产信息
    struct Property {
        string propertyId;
        string country;
        string metadataURI;
        PropertyStatus status;
        uint256 registrationTime;
        address registeredBy;
    }
    
    // 房产映射
    mapping(string => Property) public properties;
    
    // 所有房产ID数组
    string[] public allPropertyIds;
    
    // 事件
    event PropertyRegistered(string propertyId, string country, string metadataURI, address registeredBy);
    event PropertyApproved(string propertyId, address approvedBy);
    event PropertyRejected(string propertyId, address rejectedBy);
    event PropertyDelisted(string propertyId, address delistedBy);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize(address _roleManager) public initializer {
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
     * @dev 注册新房产
     * @param propertyId 房产ID
     * @param country 国家
     * @param metadataURI 元数据URI
     */
    function registerProperty(
        string memory propertyId,
        string memory country,
        string memory metadataURI
    ) external onlyPropertyManager {
        require(bytes(propertyId).length > 0, "Property ID cannot be empty");
        require(properties[propertyId].status == PropertyStatus.NotRegistered, "Property already registered");
        
        properties[propertyId] = Property({
            propertyId: propertyId,
            country: country,
            metadataURI: metadataURI,
            status: PropertyStatus.Pending,
            registrationTime: block.timestamp,
            registeredBy: msg.sender
        });
        
        allPropertyIds.push(propertyId);
        
        emit PropertyRegistered(propertyId, country, metadataURI, msg.sender);
    }

    /**
     * @dev 审核房产
     * @param propertyId 房产ID
     */
    function approveProperty(string memory propertyId) external onlySuperAdmin {
        require(properties[propertyId].status == PropertyStatus.Pending, "Property not in pending status");
        
        properties[propertyId].status = PropertyStatus.Approved;
        
        emit PropertyApproved(propertyId, msg.sender);
    }

    /**
     * @dev 拒绝房产
     * @param propertyId 房产ID
     */
    function rejectProperty(string memory propertyId) external onlySuperAdmin {
        require(properties[propertyId].status == PropertyStatus.Pending, "Property not in pending status");
        
        properties[propertyId].status = PropertyStatus.Rejected;
        
        emit PropertyRejected(propertyId, msg.sender);
    }

    /**
     * @dev 下架房产
     * @param propertyId 房产ID
     */
    function delistProperty(string memory propertyId) external onlySuperAdmin {
        require(properties[propertyId].status == PropertyStatus.Approved, "Property not in approved status");
        
        properties[propertyId].status = PropertyStatus.Delisted;
        
        emit PropertyDelisted(propertyId, msg.sender);
    }

    /**
     * @dev 检查房产是否已审核
     * @param propertyId 房产ID
     * @return 是否已审核
     */
    function isPropertyApproved(string memory propertyId) public view returns (bool) {
        return properties[propertyId].status == PropertyStatus.Approved;
    }

    /**
     * @dev 获取房产信息
     * @param propertyId 房产ID
     * @return 房产信息
     */
    function getProperty(string memory propertyId) external view returns (Property memory) {
        return properties[propertyId];
    }

    /**
     * @dev 获取所有房产ID
     * @return 房产ID数组
     */
    function getAllPropertyIds() external view returns (string[] memory) {
        return allPropertyIds;
    }

    /**
     * @dev 获取房产总数
     * @return 房产总数
     */
    function getPropertyCount() external view returns (uint256) {
        return allPropertyIds.length;
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}