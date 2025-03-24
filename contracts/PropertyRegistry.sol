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
    
    // 合并后的房产状态
    enum PropertyStatus { 
        NotRegistered,  // 未注册
        Pending,        // 待审核
        Approved,       // 已审核并激活
        Rejected,       // 已拒绝
        Delisted,       // 已下架
        Redemption,     // 赎回中
        Frozen          // 已冻结
    }
    
    // 房产信息
    struct Property {
        string propertyId;
        string country;
        string metadataURI;
        PropertyStatus status;
        uint256 registrationTime;
        address registeredBy;
        bool exists;  // 添加 exists 字段
    }
    
    // 房产映射
    mapping(string => Property) public properties;
    
    // 所有房产ID数组
    string[] public allPropertyIds;
    
    // 合约版本，用于追踪升级
    uint256 public version;
    
    // 事件
    event PropertyRegistered(string propertyId, string country, string metadataURI, address registeredBy);
    event PropertyApproved(string propertyId, address approvedBy);
    event PropertyRejected(string propertyId, address rejectedBy);
    event PropertyDelisted(string propertyId, address delistedBy);
    event PropertyStatusUpdated(string propertyId, PropertyStatus status);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    event PropertyRegistryInitialized(address deployer, address roleManager, uint256 version);
    
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
        version = 1;
        
        emit PropertyRegistryInitialized(msg.sender, _roleManager, version);
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
    // 在 registerProperty 函数中设置 exists 字段
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
            registeredBy: msg.sender,
            exists: true  // 设置 exists 字段
        });
        
        allPropertyIds.push(propertyId);
        
        emit PropertyRegistered(propertyId, country, metadataURI, msg.sender);
    }

    /**
     * @dev 审核房产
     * @param propertyId 房产ID
     */
    function approveProperty(string memory propertyId) external onlySuperAdmin {
        _setPropertyStatus(propertyId, PropertyStatus.Approved, PropertyStatus.Pending);
        emit PropertyApproved(propertyId, msg.sender);
    }

    /**
     * @dev 拒绝房产
     * @param propertyId 房产ID
     */
    function rejectProperty(string memory propertyId) external onlySuperAdmin {
        _setPropertyStatus(propertyId, PropertyStatus.Rejected, PropertyStatus.Pending);
        emit PropertyRejected(propertyId, msg.sender);
    }

    /**
     * @dev 下架房产
     * @param propertyId 房产ID
     */
    function delistProperty(string memory propertyId) external onlySuperAdmin {
        _setPropertyStatus(propertyId, PropertyStatus.Delisted, PropertyStatus.Approved);
        emit PropertyDelisted(propertyId, msg.sender);
    }

    /**
     * @dev 设置房产为赎回状态
     * @param propertyId 房产ID
     */
    function setPropertyToRedemption(string memory propertyId) external onlySuperAdmin {
        _setPropertyStatus(propertyId, PropertyStatus.Redemption, PropertyStatus.Approved);
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
     * @dev 获取特定状态的房产数量
     * @param status 要查询的状态
     * @return 该状态的房产数量
     */
    function getPropertyCountByStatus(PropertyStatus status) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < allPropertyIds.length; i++) {
            if (properties[allPropertyIds[i]].status == status) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {
        // 更新版本号
        uint256 oldVersion = version;
        version += 1;
        emit VersionUpdated(oldVersion, version);
    }

    
    // 保留233行和245行的函数定义
    function freezeProperty(string memory propertyId) external onlySuperAdmin {
        require(properties[propertyId].exists, "Property does not exist");
        properties[propertyId].status = PropertyStatus.Frozen;
        emit PropertyStatusUpdated(propertyId, PropertyStatus.Frozen);
    }

    function unfreezeProperty(string memory propertyId) external onlySuperAdmin {
        require(properties[propertyId].exists, "Property does not exist");
        properties[propertyId].status = PropertyStatus.Approved;
        emit PropertyStatusUpdated(propertyId, PropertyStatus.Approved);
    }

    /**
     * @dev 设置房产状态（内部函数）
     * @param propertyId 房产ID
     * @param newStatus 新状态
     * @param requiredStatus 要求的当前状态（如果为 NotRegistered 则不检查）
     */
    function _setPropertyStatus(
        string memory propertyId, 
        PropertyStatus newStatus, 
        PropertyStatus requiredStatus
    ) internal {
        require(properties[propertyId].exists, "Property does not exist");
        
        // 如果指定了requiredStatus，则验证当前状态
        if (requiredStatus != PropertyStatus.NotRegistered) {
            require(properties[propertyId].status == requiredStatus, 
                    string(abi.encodePacked("Property not in ", _getStatusString(requiredStatus), " status")));
        }
        
        // 验证状态转换的有效性
        _validateStatusTransition(properties[propertyId].status, newStatus);
        
        properties[propertyId].status = newStatus;
        emit PropertyStatusUpdated(propertyId, newStatus);
    }
    
    /**
     * @dev 验证状态转换是否有效
     * @param currentStatus 当前状态
     * @param newStatus 新状态
     */
    function _validateStatusTransition(PropertyStatus currentStatus, PropertyStatus newStatus) internal pure {
        // Frozen状态可以转换为Approved
        if (currentStatus == PropertyStatus.Frozen && newStatus == PropertyStatus.Approved) {
            return;
        }
        
        // Redemption状态可以转换为Approved
        if (currentStatus == PropertyStatus.Redemption && newStatus == PropertyStatus.Approved) {
            return;
        }
        
        // 通常的状态转换路径
        if (currentStatus == PropertyStatus.Pending && 
            (newStatus == PropertyStatus.Approved || newStatus == PropertyStatus.Rejected)) {
            return;
        }
        
        if (currentStatus == PropertyStatus.Approved && 
            (newStatus == PropertyStatus.Delisted || 
             newStatus == PropertyStatus.Redemption || 
             newStatus == PropertyStatus.Frozen)) {
            return;
        }
        
        // 拒绝无效的状态转换
        revert("Invalid status transition");
    }

    /**
     * @dev 获取状态字符串（用于错误消息）
     */
    function _getStatusString(PropertyStatus status) internal pure returns (string memory) {
        if (status == PropertyStatus.NotRegistered) return "not registered";
        if (status == PropertyStatus.Pending) return "pending";
        if (status == PropertyStatus.Approved) return "approved";
        if (status == PropertyStatus.Rejected) return "rejected";
        if (status == PropertyStatus.Delisted) return "delisted";
        if (status == PropertyStatus.Redemption) return "redemption";
        if (status == PropertyStatus.Frozen) return "frozen";
        return "";
    }

    /**
     * @dev 检查房产是否存在
     * @param propertyId 房产ID
     * @return 是否存在
     */
    function propertyExists(string memory propertyId) public view returns (bool) {
        return properties[propertyId].status != PropertyStatus.NotRegistered;
    }

    /**
     * @dev 分页获取房产ID
     * @param offset 起始位置
     * @param limit 每页数量
     * @return 房产ID数组
     */
    function getPropertyIdsPaginated(uint256 offset, uint256 limit) external view returns (string[] memory) {
        uint256 totalCount = allPropertyIds.length;
        
        if (offset >= totalCount) {
            return new string[](0);
        }
        
        uint256 endIndex = offset + limit;
        if (endIndex > totalCount) {
            endIndex = totalCount;
        }
        
        uint256 resultLength = endIndex - offset;
        string[] memory result = new string[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allPropertyIds[offset + i];
        }
        
        return result;
    }

    /**
     * @dev 获取房产状态
     * @param _propertyId 房产ID
     * @return 房产状态
     */
    function getPropertyStatus(string memory _propertyId) external view returns (PropertyStatus) {
        require(properties[_propertyId].exists, "Property does not exist");
        return properties[_propertyId].status;
    }
    
    /**
     * @dev 获取房产状态 (重载函数，支持uint256类型ID)
     * @param _propertyId 数值型房产ID
     * @return 房产状态
     */
    function getPropertyStatus(uint256 _propertyId) external view returns (PropertyStatus) {
        string memory propertyIdStr = uint256ToString(_propertyId);
        require(properties[propertyIdStr].exists, "Property does not exist");
        return properties[propertyIdStr].status;
    }
    
    /**
     * @dev 设置房产状态（公开接口）
     * @param propertyId 房产ID
     * @param newStatus 新状态
     */
    function setPropertyStatus(string memory propertyId, PropertyStatus newStatus) external {
        // 检查调用者是否是超级管理员或有房产管理权限
        require(
            roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender) || 
            roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender),
            "Caller is not authorized to set property status"
        );
        
        require(properties[propertyId].exists, "Property does not exist");
        
        // 验证状态转换的有效性
        _validateStatusTransition(properties[propertyId].status, newStatus);
        
        properties[propertyId].status = newStatus;
        emit PropertyStatusUpdated(propertyId, newStatus);
    }
    
    /**
     * @dev 设置房产状态（公开接口，重载版本支持uint256类型ID）
     * @param propertyId 房产ID (uint256)
     * @param newStatus 新状态
     */
    function setPropertyStatus(uint256 propertyId, PropertyStatus newStatus) external {
        string memory propertyIdStr = uint256ToString(propertyId);
        // 检查调用者是否是超级管理员或有房产管理权限
        require(
            roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender) || 
            roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender),
            "Caller is not authorized to set property status"
        );
        
        require(properties[propertyIdStr].exists, "Property does not exist");
        
        // 验证状态转换的有效性
        _validateStatusTransition(properties[propertyIdStr].status, newStatus);
        
        properties[propertyIdStr].status = newStatus;
        emit PropertyStatusUpdated(propertyIdStr, newStatus);
    }
    
    /**
     * @dev 将uint256转换为string（内部辅助函数）
     * @param value 要转换的整数值
     * @return 转换后的字符串
     */
    function uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        
        uint256 temp = value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}