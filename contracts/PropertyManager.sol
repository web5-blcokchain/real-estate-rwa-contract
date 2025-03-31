// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./SimpleRoleManager.sol";

/**
 * @title PropertyManager
 * @dev 简化版房产管理合约，处理房产注册和状态管理
 */
contract PropertyManager is Initializable, UUPSUpgradeable {
    // 版本控制
    uint256 public version;
    
    // 角色管理器
    SimpleRoleManager public roleManager;
    
    // 房产状态
    enum PropertyStatus {
        NotRegistered,
        Pending,
        Approved,
        Rejected,
        Delisted
    }
    
    // 房产信息
    struct Property {
        string propertyId;
        string country;
        string metadataURI;
        PropertyStatus status;
        uint256 registrationTime;
        bool exists;
    }
    
    // 房产映射
    mapping(string => Property) public properties;
    
    // 所有房产ID数组
    string[] public allPropertyIds;
    
    // 房产到代币地址的映射
    mapping(string => address) public propertyTokens;
    
    // 事件
    event PropertyRegistered(string indexed propertyId, string country, string metadataURI);
    event PropertyStatusUpdated(string indexed propertyId, PropertyStatus newStatus);
    event PropertyManagerInitialized(address deployer, address roleManager, uint256 version);
    event TokenRegistered(string indexed propertyId, address tokenAddress);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(address _roleManager) public initializer {
        __UUPSUpgradeable_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        version = 1;
        
        emit PropertyManagerInitialized(msg.sender, _roleManager, version);
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Caller is not an admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender), "Caller is not a manager");
        _;
    }
    
    /**
     * @dev 注册新房产
     */
    function registerProperty(
        string memory propertyId,
        string memory country,
        string memory metadataURI
    ) external onlyManager {
        require(bytes(propertyId).length > 0, "Property ID cannot be empty");
        require(properties[propertyId].status == PropertyStatus.NotRegistered, "Property already registered");
        
        properties[propertyId] = Property({
            propertyId: propertyId,
            country: country,
            metadataURI: metadataURI,
            status: PropertyStatus.Pending,
            registrationTime: block.timestamp,
            exists: true
        });
        
        allPropertyIds.push(propertyId);
        
        emit PropertyRegistered(propertyId, country, metadataURI);
    }
    
    /**
     * @dev 更新房产状态
     */
    function updatePropertyStatus(string memory propertyId, PropertyStatus newStatus) external onlyManager {
        require(properties[propertyId].exists, "Property does not exist");
        
        PropertyStatus oldStatus = properties[propertyId].status;
        properties[propertyId].status = newStatus;
        
        emit PropertyStatusUpdated(propertyId, newStatus);
    }
    
    /**
     * @dev 检查房产是否存在
     */
    function propertyExists(string memory propertyId) public view returns (bool) {
        return properties[propertyId].exists;
    }
    
    /**
     * @dev 获取房产状态
     */
    function getPropertyStatus(string memory propertyId) public view returns (PropertyStatus) {
        require(properties[propertyId].exists, "Property does not exist");
        return properties[propertyId].status;
    }
    
    /**
     * @dev 检查房产是否已批准
     */
    function isPropertyApproved(string memory propertyId) public view returns (bool) {
        if (!properties[propertyId].exists) return false;
        return properties[propertyId].status == PropertyStatus.Approved;
    }
    
    /**
     * @dev 注册代币地址
     */
    function registerTokenForProperty(string memory propertyId, address tokenAddress) external {
        require(properties[propertyId].exists, "Property does not exist");
        require(tokenAddress != address(0), "Invalid token address");
        require(propertyTokens[propertyId] == address(0), "Token already registered for property");
        
        propertyTokens[propertyId] = tokenAddress;
        
        emit TokenRegistered(propertyId, tokenAddress);
    }
    
    /**
     * @dev 获取所有房产ID
     */
    function getAllPropertyIds() external view returns (string[] memory) {
        return allPropertyIds;
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
} 