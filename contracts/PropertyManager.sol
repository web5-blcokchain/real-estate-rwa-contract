// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./RoleManager.sol";

/**
 * @title PropertyManager
 * @dev 优化的房产管理合约，提高存储效率和安全性
 */
contract PropertyManager is 
    Initializable, 
    UUPSUpgradeable, 
    ReentrancyGuardUpgradeable,
    PausableUpgradeable {
    
    // 版本控制 - 使用uint8节省gas
    uint8 public version;
    
    // 角色管理器
    RoleManager public roleManager;
    
    // 房产状态 - 用uint8表示，节省gas
    enum PropertyStatus {
        NotRegistered,  // 0
        Pending,        // 1
        Approved,       // 2
        Rejected,       // 3
        Delisted        // 4
    }
    
    // 房产信息 - 优化存储布局
    struct Property {
        // 固定属性组
        string propertyId;         // 房产ID，直接使用字符串
        uint8 status;              // 房产状态
        uint40 registrationTime;   // 注册时间，足够表示到2104年
        bool exists;               // 是否存在
        
        // 可变属性组
        string country;            // 国家
        string metadataURI;        // 元数据URI
    }
    
    // 映射优化：直接使用string作为键
    mapping(string => Property) private _properties;
    
    // 所有房产ID数组
    string[] public allPropertyIds;
    
    // 房产到代币地址的映射
    mapping(string => address) public propertyTokens;
    
    // 授权合约
    mapping(address => bool) public authorizedContracts;
    
    // 房产所有者映射
    mapping(string => address) public propertyOwners;
    
    // 所有者拥有的房产列表
    mapping(address => string[]) public ownerProperties;
    
    // 事件 - 简化事件结构，使用非索引字符串
    event PropertyRegistered(string propertyId, string country, string metadataURI);
    event PropertyStatusUpdated(string propertyId, uint8 oldStatus, uint8 newStatus);
    event PropertyManagerInitialized(address indexed deployer, address indexed roleManager, uint8 version);
    event TokenRegistered(string propertyId, address indexed tokenAddress);
    event ContractAuthorized(address indexed contractAddress, bool status);
    event PropertyOwnershipTransferred(string propertyId, address oldOwner, address newOwner);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(address _roleManager) public initializer {
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        roleManager = RoleManager(_roleManager);
        version = 1;
        
        emit PropertyManagerInitialized(msg.sender, _roleManager, version);
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender), "Not manager");
        _;
    }
    
    /**
     * @dev 修饰器：只有授权合约或管理员可以调用
     */
    modifier onlyAuthorized() {
        require(
            authorizedContracts[msg.sender] || 
            roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender) ||
            roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender),
            "Not authorized"
        );
        _;
    }
    
    /**
     * @dev 授权合约调用
     */
    function setContractAuthorization(address contractAddress, bool authorized) external onlyAdmin {
        authorizedContracts[contractAddress] = authorized;
        emit ContractAuthorized(contractAddress, authorized);
    }
    
    /**
     * @dev 注册新房产
     */
    function registerProperty(
        string memory propertyId,
        string memory country,
        string memory metadataURI
    )
        external 
        onlyManager 
        whenNotPaused 
        nonReentrant 
    {
        require(bytes(propertyId).length > 0, "Property ID empty");
        require(!_properties[propertyId].exists, "Already registered");
        
        _properties[propertyId] = Property({
            propertyId: propertyId,
            status: uint8(PropertyStatus.Pending),
            registrationTime: uint40(block.timestamp),
            exists: true,
            country: country,
            metadataURI: metadataURI
        });
        
        allPropertyIds.push(propertyId);
        
        emit PropertyRegistered(propertyId, country, metadataURI);
    }
    
    /**
     * @dev 更新房产状态
     */
    function updatePropertyStatus(string memory propertyId, PropertyStatus newStatus) 
        external 
        onlyManager 
        whenNotPaused
    {
        require(_properties[propertyId].exists, "Property not exist");
        
        uint8 oldStatus = _properties[propertyId].status;
        _properties[propertyId].status = uint8(newStatus);
        
        emit PropertyStatusUpdated(propertyId, oldStatus, uint8(newStatus));
    }
    
    /**
     * @dev 检查房产是否存在
     */
    function propertyExists(string memory propertyId) public view returns (bool) {
        return _properties[propertyId].exists;
    }
    
    /**
     * @dev 获取房产状态
     */
    function getPropertyStatus(string memory propertyId) public view returns (PropertyStatus) {
        require(_properties[propertyId].exists, "Property not exist");
        return PropertyStatus(_properties[propertyId].status);
    }
    
    /**
     * @dev 检查房产是否已批准
     */
    function isPropertyApproved(string memory propertyId) public view returns (bool) {
        if (!_properties[propertyId].exists) return false;
        return _properties[propertyId].status == uint8(PropertyStatus.Approved);
    }
    
    /**
     * @dev 注册代币地址
     */
    function registerTokenForProperty(string memory propertyId, address tokenAddress) 
        external 
        onlyAuthorized
        whenNotPaused
    {
        require(_properties[propertyId].exists, "Property not exist");
        require(tokenAddress != address(0), "Invalid token address");
        require(propertyTokens[propertyId] == address(0), "Token already registered");
        
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
     * @dev 获取分页的房产列表
     * @param offset 起始位置
     * @param limit 返回的最大记录数
     * @return totalCount 总记录数
     * @return ids 房产ID数组
     * @return statuses 状态数组
     * @return countries 国家数组
     * @return tokenAddresses 代币地址数组
     */
    function getPropertiesPaginated(uint256 offset, uint256 limit) 
        external 
        view 
        returns (
            uint256 totalCount,
            string[] memory ids,
            uint8[] memory statuses,
            string[] memory countries,
            address[] memory tokenAddresses
        ) 
    {
        // 获取总房产数量
        totalCount = allPropertyIds.length;
        
        // 检查边界条件
        if (offset >= totalCount) {
            // 如果偏移量超出范围，返回空数组
            return (totalCount, new string[](0), new uint8[](0), new string[](0), new address[](0));
        }
        
        // 计算实际返回的记录数
        uint256 actualLimit = limit;
        if (offset + limit > totalCount) {
            actualLimit = totalCount - offset;
        }
        
        // 初始化返回数组
        ids = new string[](actualLimit);
        statuses = new uint8[](actualLimit);
        countries = new string[](actualLimit);
        tokenAddresses = new address[](actualLimit);
        
        // 填充返回数据
        for (uint256 i = 0; i < actualLimit; i++) {
            string memory propertyId = allPropertyIds[offset + i];
            Property storage property = _properties[propertyId];
            
            ids[i] = propertyId;
            statuses[i] = property.status;
            countries[i] = property.country;
            tokenAddresses[i] = propertyTokens[propertyId];
        }
        
        return (totalCount, ids, statuses, countries, tokenAddresses);
    }
    
    /**
     * @notice Gets a list of property ids with matching status
     * @param status The status to filter by
     * @return matchingIds Array of property ids with the given status
     * @return tokenAddresses Array of token addresses for the matching properties
     */
    function getPropertiesByStatus(uint8 status) public view returns (string[] memory matchingIds, address[] memory tokenAddresses) {
        // 找出所有匹配状态的房产
        string[] memory tempIds = new string[](allPropertyIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allPropertyIds.length; i++) {
            string memory propertyId = allPropertyIds[i];
            if (_properties[propertyId].status == status) {
                tempIds[count] = propertyId;
                count++;
            }
        }

        // 创建结果数组
        matchingIds = new string[](count);
        tokenAddresses = new address[](count);

        // 填充结果数组
        for (uint256 i = 0; i < count; i++) {
            matchingIds[i] = tempIds[i];
            tokenAddresses[i] = propertyTokens[tempIds[i]];
        }

        return (matchingIds, tokenAddresses);
    }
    
    /**
     * @dev 获取房产详情
     * @param propertyId 房产ID
     * @return status 房产状态
     * @return registrationTime 注册时间
     * @return country 国家
     * @return metadataURI 元数据URI
     * @return tokenAddress 代币地址
     */
    function getPropertyDetails(string memory propertyId) 
        external 
        view 
        returns (
            PropertyStatus status,
            uint40 registrationTime,
            string memory country,
            string memory metadataURI,
            address tokenAddress
        )
    {
        require(_properties[propertyId].exists, "Property not exist");
        
        Property storage property = _properties[propertyId];
        
        return (
            PropertyStatus(property.status),
            property.registrationTime,
            property.country,
            property.metadataURI,
            propertyTokens[propertyId]
        );
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        // 确保角色管理器不在紧急模式
        require(!RoleManager(roleManager).emergencyMode(), "Emergency mode active");
    }
    
    /**
     * @dev 验证房产归属权
     */
    function verifyPropertyOwnership(string memory propertyId, address owner) 
        external 
        view 
        returns (bool)
    {
        // 首先检查房产是否存在
        if (!_properties[propertyId].exists) {
            return false;
        }
        
        // 检查房产状态是否已批准
        if (_properties[propertyId].status != uint8(PropertyStatus.Approved)) {
            return false;
        }
        
        // 验证所有权
        return propertyOwners[propertyId] == owner;
    }

    /**
     * @dev 转移房产归属权
     */
    function transferPropertyOwnership(string memory propertyId, address newOwner) 
        external 
        onlyManager 
        whenNotPaused 
        nonReentrant 
    {
        require(_properties[propertyId].exists, "Property not exist");
        require(_properties[propertyId].status == uint8(PropertyStatus.Approved), "Property not approved");
        require(newOwner != address(0), "Invalid new owner");
        
        address currentOwner = propertyOwners[propertyId];
        
        // 更新所有权
        propertyOwners[propertyId] = newOwner;
        
        // 从当前所有者的属性列表中移除
        if (currentOwner != address(0)) {
            _removePropertyFromOwner(propertyId, currentOwner);
        }
        
        // 添加到新所有者的属性列表中
        ownerProperties[newOwner].push(propertyId);
        
        emit PropertyOwnershipTransferred(propertyId, currentOwner, newOwner);
    }
    
    /**
     * @dev 从所有者的属性列表中移除属性
     */
    function _removePropertyFromOwner(string memory propertyId, address owner) private {
        string[] storage properties = ownerProperties[owner];
        for (uint i = 0; i < properties.length; i++) {
            if (keccak256(bytes(properties[i])) == keccak256(bytes(propertyId))) {
                // 将最后一个元素移动到当前位置并删除最后一个元素
                properties[i] = properties[properties.length - 1];
                properties.pop();
                break;
            }
        }
    }
    
    /**
     * @dev 获取特定所有者的所有房产列表
     */
    function getOwnerProperties(address owner) 
        external 
        view 
        returns (string[] memory) 
    {
        return ownerProperties[owner];
    }
} 