// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "./utils/RoleConstants.sol";
import "./RealEstateSystem.sol";
import "./PropertyToken.sol";

/**
 * @title PropertyManager - 日本房地产数字化平台资产管理合约
 * @author Fashi Shijian团队
 * @notice 本合约负责管理平台上所有房产资产的登记、审核、状态更新及代币化流程
 * 
 * @dev 合约功能描述：
 * 1. 房产资产登记：支持添加新房产，包括基本信息录入和元数据存储
 * 2. 房产状态管理：追踪每个房产的当前状态（未注册、待审核、已批准、已拒绝、已下架）
 * 3. 代币化处理：为每个房产创建对应的ERC20代币合约，实现资产数字化
 * 4. 所有权管理：记录并管理房产的所有者信息，支持所有权转移
 * 5. 元数据管理：维护每个房产的详细信息和外部数据链接
 * 
 * @dev 数据结构优化：
 * - 使用紧凑的数据类型（uint8, uint40等）减少存储消耗
 * - 优化映射和数组结构，提高数据访问效率
 * - 事件设计考虑索引和数据检索需求
 * 
 * @dev 与其他模块的关联：
 * - RealEstateSystem：依赖核心系统合约进行权限验证和状态检查
 * - PropertyToken：为每个房产创建独立的代币合约实例，实现资产代币化
 * - TradingManager：与交易管理合约协作，支持代币化资产的交易
 * - RealEstateFacade：通过外观模式合约暴露功能给外部调用
 * 
 * @dev 权限控制：
 * - ADMIN：可执行所有操作，包括紧急资产处理和高风险操作
 * - MANAGER：可审核房产、更新房产状态、管理元数据
 * - OPERATOR：可注册新房产、查询资产信息
 * 
 * @dev 安全考虑：
 * - 实现了重入攻击防护（ReentrancyGuard）
 * - 状态变更受权限控制保护
 * - 可暂停功能，应对紧急情况
 * - 房产唯一性验证，防止重复注册
 */
contract PropertyManager is 
    Initializable, 
    UUPSUpgradeable, 
    ReentrancyGuardUpgradeable,
    PausableUpgradeable {
    
    using RoleConstants for bytes32;
    
    // 版本控制 - 使用uint8节省gas
    uint8 public version;
    
    // 系统合约引用
    RealEstateSystem public system;
    
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
    
    // 房产所有者映射
    mapping(string => address) public propertyOwners;
    
    // 所有者拥有的房产列表
    mapping(address => string[]) public ownerProperties;
    
    // 事件 - 优化事件定义
    event PropertyRegistered(
        string indexed propertyId,
        string country,
        string metadataURI,
        uint40 registrationTime
    );
    event PropertyStatusUpdated(
        string indexed propertyId,
        uint8 oldStatus,
        uint8 newStatus,
        uint40 updateTime
    );
    event PropertyManagerInitialized(
        address indexed deployer,
        address indexed system,
        uint8 version
    );
    event TokenRegistered(
        string indexed propertyId,
        address indexed tokenAddress
    );
    event PropertyOwnershipTransferred(
        string indexed propertyId,
        address indexed oldOwner,
        address indexed newOwner
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化合约
     */
    function initialize(address _systemAddress) public initializer {
        require(_systemAddress != address(0), "System address cannot be zero");
        
        system = RealEstateSystem(_systemAddress);
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        version = 1;
        
        emit PropertyManagerInitialized(msg.sender, _systemAddress, version);
    }
    
    /**
     * @dev 注册新房产 - 需要OPERATOR权限
     */
    function registerProperty(
        string memory propertyId,
        string memory country,
        string memory metadataURI,
        uint256 initialSupply,
        string memory tokenName,
        string memory tokenSymbol
    ) external whenNotPaused returns (address) {
        // 验证调用者（RealEstateFacade 合约）是否有权限
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        require(!_properties[propertyId].exists, "Property already exists");
        
        uint40 registrationTime = uint40(block.timestamp);
        _properties[propertyId] = Property({
            propertyId: propertyId,
            status: uint8(PropertyStatus.Pending),
            registrationTime: registrationTime,
            exists: true,
            country: country,
            metadataURI: metadataURI
        });
        
        allPropertyIds.push(propertyId);
        
        // 创建代币合约
        address tokenAddress = _createToken(
            propertyId,
            initialSupply,
            tokenName,
            tokenSymbol
        );
        
        // 注册代币地址
        propertyTokens[propertyId] = tokenAddress;
        
        emit PropertyRegistered(propertyId, country, metadataURI, registrationTime);
        emit TokenRegistered(propertyId, tokenAddress);
        
        return tokenAddress;
    }
    
    /**
     * @dev 创建代币合约
     */
    function _createToken(
        string memory propertyId,
        uint256 initialSupply,
        string memory tokenName,
        string memory tokenSymbol
    ) private returns (address) {
        // 直接部署 PropertyToken 合约
        PropertyToken token = new PropertyToken();
        
        // 初始化代币合约
        token.initialize(
            system,
            propertyId,
            initialSupply,
            tokenName,
            tokenSymbol
        );
        
        return address(token);
    }
    
    /**
     * @dev 更新房产状态 - 需要MANAGER权限
     */
    function updatePropertyStatus(
        string memory propertyId,
        PropertyStatus status
    ) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_properties[propertyId].exists, "Property not exist");
        
        uint8 oldStatus = _properties[propertyId].status;
        _properties[propertyId].status = uint8(status);
        
        emit PropertyStatusUpdated(
            propertyId,
            oldStatus,
            uint8(status),
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 更新房产元数据 - 需要OPERATOR权限
     */
    function updatePropertyMetadata(
        string memory propertyId,
        string memory country,
        string memory metadataURI
    ) external whenNotPaused {
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        require(_properties[propertyId].exists, "Property not exist");
        
        _properties[propertyId].country = country;
        _properties[propertyId].metadataURI = metadataURI;
    }
    
    /**
     * @dev 获取房产信息
     */
    function getProperty(string memory propertyId) 
        external 
        view 
        returns (
            string memory,
            uint8,
            uint40,
            string memory,
            string memory
        ) 
    {
        require(_properties[propertyId].exists, "Property not exist");
        Property memory property = _properties[propertyId];
        return (
            property.propertyId,
            property.status,
            property.registrationTime,
            property.country,
            property.metadataURI
        );
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
    function getPropertiesPaginated(
        uint256 offset,
        uint256 limit
    ) 
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
        totalCount = allPropertyIds.length;
        
        if (offset >= totalCount) {
            return (totalCount, new string[](0), new uint8[](0), new string[](0), new address[](0));
        }
        
        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        uint256 resultCount = end - offset;
        ids = new string[](resultCount);
        statuses = new uint8[](resultCount);
        countries = new string[](resultCount);
        tokenAddresses = new address[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            string memory propertyId = allPropertyIds[offset + i];
            Property memory property = _properties[propertyId];
            
            ids[i] = property.propertyId;
            statuses[i] = property.status;
            countries[i] = property.country;
            tokenAddresses[i] = propertyTokens[propertyId];
        }
        
        return (totalCount, ids, statuses, countries, tokenAddresses);
    }
    
    /**
     * @dev 暂停合约 - 需要ADMIN权限
     */
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _pause();
    }
    
    /**
     * @dev 恢复合约 - 需要ADMIN权限
     */
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _unpause();
    }
    
    /**
     * @dev 授权合约升级 - 需要ADMIN权限
     */
    function _authorizeUpgrade(address newImplementation) internal override {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(!system.emergencyMode(), "Emergency mode active");
    }
    
    /**
     * @dev 获取版本号
     */
    function getVersion() external view returns (uint8) {
        return version;
    }
    
    /**
     * @dev 转移房产所有权 - 需要MANAGER权限
     */
    function transferPropertyOwnership(
        string memory propertyId,
        address newOwner
    ) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_properties[propertyId].exists, "Property not exist");
        require(newOwner != address(0), "Invalid new owner address");
        
        address oldOwner = propertyOwners[propertyId];
        if (oldOwner != address(0)) {
            // 从旧所有者列表中移除
            string[] storage oldOwnerProperties = ownerProperties[oldOwner];
            for (uint256 i = 0; i < oldOwnerProperties.length; i++) {
                if (keccak256(bytes(oldOwnerProperties[i])) == keccak256(bytes(propertyId))) {
                    oldOwnerProperties[i] = oldOwnerProperties[oldOwnerProperties.length - 1];
                    oldOwnerProperties.pop();
                    break;
                }
            }
        }
        
        // 更新所有权
        propertyOwners[propertyId] = newOwner;
        ownerProperties[newOwner].push(propertyId);
        
        emit PropertyOwnershipTransferred(propertyId, oldOwner, newOwner);
    }
    
    /**
     * @dev 获取所有者拥有的所有房产ID
     */
    function getPropertiesByOwner(address owner) external view returns (string[] memory) {
        return ownerProperties[owner];
    }
    
    /**
     * @dev 检查地址是否是房产所有者
     */
    function isPropertyOwner(string memory propertyId, address owner) external view returns (bool) {
        return propertyOwners[propertyId] == owner;
    }

    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
    }

    /**
     * @dev 获取房产代币地址
     */
    function getPropertyToken(string memory propertyId) external view returns (address) {
        require(_properties[propertyId].exists, "Property not exist");
        return propertyTokens[propertyId];
    }
} 