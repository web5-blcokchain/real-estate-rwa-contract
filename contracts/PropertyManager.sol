// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./SimpleRoleManager.sol";

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
    SimpleRoleManager public roleManager;
    
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
        bytes32 propertyIdHash;     // propertyId的哈希，节省storage
        uint8 status;               // 房产状态
        uint40 registrationTime;    // 注册时间，足够表示到2104年
        bool exists;                // 是否存在
        
        // 可变属性组
        string country;             // 国家
        string metadataURI;         // 元数据URI
    }
    
    // 映射优化：使用bytes32作为键，而非string
    mapping(bytes32 => Property) private _properties;
    
    // ID到Hash的映射，便于通过原始ID访问
    mapping(string => bytes32) public propertyIdToHash;
    
    // 所有房产ID哈希数组
    bytes32[] public allPropertyHashes;
    
    // 房产到代币地址的映射
    mapping(bytes32 => address) public propertyTokens;
    
    // 授权合约
    mapping(address => bool) public authorizedContracts;
    
    // 事件 - 添加indexed优化事件过滤
    event PropertyRegistered(bytes32 indexed propertyIdHash, string propertyId, string country, string metadataURI);
    event PropertyStatusUpdated(bytes32 indexed propertyIdHash, uint8 oldStatus, uint8 newStatus);
    event PropertyManagerInitialized(address indexed deployer, address indexed roleManager, uint8 version);
    event TokenRegistered(bytes32 indexed propertyIdHash, address indexed tokenAddress);
    event ContractAuthorized(address indexed contractAddress, bool status);
    
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
        
        roleManager = SimpleRoleManager(_roleManager);
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
     * @dev 计算propertyId的哈希
     */
    function _hashPropertyId(string memory propertyId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(propertyId));
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
        
        bytes32 propertyIdHash = _hashPropertyId(propertyId);
        require(_properties[propertyIdHash].status == uint8(PropertyStatus.NotRegistered) || 
                !_properties[propertyIdHash].exists, "Already registered");
        
        _properties[propertyIdHash] = Property({
            propertyIdHash: propertyIdHash,
            status: uint8(PropertyStatus.Pending),
            registrationTime: uint40(block.timestamp),
            exists: true,
            country: country,
            metadataURI: metadataURI
        });
        
        propertyIdToHash[propertyId] = propertyIdHash;
        allPropertyHashes.push(propertyIdHash);
        
        emit PropertyRegistered(propertyIdHash, propertyId, country, metadataURI);
    }
    
    /**
     * @dev 更新房产状态
     */
    function updatePropertyStatus(bytes32 propertyIdHash, PropertyStatus newStatus) 
        external 
        onlyManager 
        whenNotPaused
    {
        require(_properties[propertyIdHash].exists, "Property not exist");
        
        uint8 oldStatus = _properties[propertyIdHash].status;
        _properties[propertyIdHash].status = uint8(newStatus);
        
        emit PropertyStatusUpdated(propertyIdHash, oldStatus, uint8(newStatus));
    }
    
    /**
     * @dev 通过propertyId更新房产状态 - 便利函数
     */
    function updatePropertyStatusByStringId(string memory propertyId, PropertyStatus newStatus) 
        external 
        onlyManager 
        whenNotPaused
    {
        bytes32 propertyIdHash = propertyIdToHash[propertyId];
        require(_properties[propertyIdHash].exists, "Property not exist");
        
        uint8 oldStatus = _properties[propertyIdHash].status;
        _properties[propertyIdHash].status = uint8(newStatus);
        
        emit PropertyStatusUpdated(propertyIdHash, oldStatus, uint8(newStatus));
    }
    
    /**
     * @dev 检查房产是否存在
     */
    function propertyExists(bytes32 propertyIdHash) public view returns (bool) {
        return _properties[propertyIdHash].exists;
    }
    
    /**
     * @dev 通过string ID检查房产是否存在
     */
    function propertyExistsByStringId(string memory propertyId) public view returns (bool) {
        bytes32 propertyIdHash = propertyIdToHash[propertyId];
        return _properties[propertyIdHash].exists;
    }
    
    /**
     * @dev 获取房产状态
     */
    function getPropertyStatus(bytes32 propertyIdHash) public view returns (PropertyStatus) {
        require(_properties[propertyIdHash].exists, "Property not exist");
        return PropertyStatus(_properties[propertyIdHash].status);
    }
    
    /**
     * @dev 通过string ID获取房产状态
     */
    function getPropertyStatusByStringId(string memory propertyId) public view returns (PropertyStatus) {
        bytes32 propertyIdHash = propertyIdToHash[propertyId];
        require(_properties[propertyIdHash].exists, "Property not exist");
        return PropertyStatus(_properties[propertyIdHash].status);
    }
    
    /**
     * @dev 检查房产是否已批准
     */
    function isPropertyApproved(bytes32 propertyIdHash) public view returns (bool) {
        if (!_properties[propertyIdHash].exists) return false;
        return _properties[propertyIdHash].status == uint8(PropertyStatus.Approved);
    }
    
    /**
     * @dev 通过string ID检查房产是否已批准
     */
    function isPropertyApprovedByStringId(string memory propertyId) public view returns (bool) {
        bytes32 propertyIdHash = propertyIdToHash[propertyId];
        if (!_properties[propertyIdHash].exists) return false;
        return _properties[propertyIdHash].status == uint8(PropertyStatus.Approved);
    }
    
    /**
     * @dev 注册代币地址
     */
    function registerTokenForProperty(bytes32 propertyIdHash, address tokenAddress) 
        external 
        onlyAuthorized
        whenNotPaused
    {
        require(_properties[propertyIdHash].exists, "Property not exist");
        require(tokenAddress != address(0), "Invalid token address");
        require(propertyTokens[propertyIdHash] == address(0), "Token already registered");
        
        propertyTokens[propertyIdHash] = tokenAddress;
        
        emit TokenRegistered(propertyIdHash, tokenAddress);
    }
    
    /**
     * @dev 通过string ID注册代币地址
     */
    function registerTokenForPropertyByStringId(string memory propertyId, address tokenAddress) 
        external 
        onlyAuthorized
        whenNotPaused
    {
        bytes32 propertyIdHash = propertyIdToHash[propertyId];
        require(_properties[propertyIdHash].exists, "Property not exist");
        require(tokenAddress != address(0), "Invalid token address");
        require(propertyTokens[propertyIdHash] == address(0), "Token already registered");
        
        propertyTokens[propertyIdHash] = tokenAddress;
        
        emit TokenRegistered(propertyIdHash, tokenAddress);
    }
    
    /**
     * @dev 获取所有房产哈希
     */
    function getAllPropertyHashes() external view returns (bytes32[] memory) {
        return allPropertyHashes;
    }
    
    /**
     * @dev 获取房产详情
     */
    function getPropertyDetails(bytes32 propertyIdHash) 
        external 
        view 
        returns (
            uint8 status,
            uint40 registrationTime,
            string memory country,
            string memory metadataURI,
            address tokenAddress
        ) 
    {
        require(_properties[propertyIdHash].exists, "Property not exist");
        Property storage prop = _properties[propertyIdHash];
        
        return (
            prop.status,
            prop.registrationTime,
            prop.country,
            prop.metadataURI,
            propertyTokens[propertyIdHash]
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
        require(!SimpleRoleManager(roleManager).emergencyMode(), "Emergency mode active");
    }
} 