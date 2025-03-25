// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./RoleManager.sol";

// 前置声明RealEstateToken接口以避免循环引用
interface IRealEstateToken {
    function notifyPropertyStatusChange(PropertyRegistry.PropertyStatus newStatus) external;
}

/**
 * @title PropertyRegistry
 * @dev 管理房产注册信息
 */
contract PropertyRegistry is Initializable, UUPSUpgradeable {
    // 映射版本控制
    uint256 public version;
    uint256 public chainId;
    
    RoleManager public roleManager;
    
    // 房产状态
    enum PropertyStatus {
        NotRegistered,
        Pending,
        Approved,
        Rejected,
        Delisted,
        Redemption,
        Frozen
    }
    
    // 房产信息
    struct Property {
        string propertyId;
        string country;      // 国家/地区
        string metadataURI;  // 元数据URI
        PropertyStatus status;
        bool exists;
        uint256 registrationTime;
    }
    
    // 房产映射
    mapping(string => Property) public properties;
    
    // 所有房产ID数组
    string[] public allPropertyIds;
    
    // 房产状态计数器
    mapping(PropertyStatus => uint256) public statusCounts;
    
    // 授权合约列表
    mapping(address => bool) public authorizedContracts;
    
    // 添加房产ID到代币地址的映射，与TokenFactory中的数据保持一致
    mapping(string => address) public RealEstateTokens;
    
    // 事件
    event PropertyRegistered(string indexed propertyId, string country, string metadataURI);
    event PropertyApproved(string indexed propertyId, address approver);
    event PropertyRejected(string indexed propertyId, address rejecter, string reason);
    event PropertyDelisted(string indexed propertyId, address delister);
    event PropertyStatusUpdated(string indexed propertyId, PropertyStatus newStatus);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    event PropertyRegistryInitialized(address deployer, address roleManager, uint256 version, uint256 chainId);
    event PropertyStatusTransition(string indexed propertyId, PropertyStatus oldStatus, PropertyStatus newStatus, address indexed changer);
    event AuthorizedContractUpdated(address indexed contractAddress, bool isAuthorized);
    event TokenRegistered(string indexed propertyId, address tokenAddress);
    
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
        
        // 记录当前链ID
        uint256 id;
        assembly {
            id := chainid()
        }
        chainId = id;
        
        emit PropertyRegistryInitialized(msg.sender, _roleManager, version, chainId);
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
        
        // 验证propertyId格式 - 支持数字和非数字格式
        if(_isNumericPropertyId(propertyId)) {
            // 如果是数字格式，确保大于零
            uint256 numericId = _parseStringToUint(propertyId);
            require(numericId > 0, "Numeric Property ID must be greater than zero");
        }
        
        require(properties[propertyId].status == PropertyStatus.NotRegistered, "Property already registered");
        
        properties[propertyId] = Property({
            propertyId: propertyId,
            country: country,
            metadataURI: metadataURI,
            status: PropertyStatus.Pending,
            registrationTime: block.timestamp,
            exists: true  // 设置 exists 字段
        });
        
        allPropertyIds.push(propertyId);
        
        emit PropertyRegistered(propertyId, country, metadataURI);
    }
    
    /**
     * @dev 检查propertyId是否是纯数字字符串
     * @param propertyId 要检查的房产ID
     * @return 是否是纯数字
     */
    function _isNumericPropertyId(string memory propertyId) internal pure returns (bool) {
        bytes memory b = bytes(propertyId);
        for(uint i = 0; i < b.length; i++) {
            if(b[i] < 0x30 || b[i] > 0x39) {
                return false;
            }
        }
        return b.length > 0;
    }
    
    /**
     * @dev 将字符串解析为uint256（仅用于数字ID）
     * @param str 要解析的字符串
     * @return 解析后的uint256
     */
    function _parseStringToUint(string memory str) internal pure returns (uint256) {
        bytes memory b = bytes(str);
        uint256 result = 0;
        for(uint i = 0; i < b.length; i++) {
            require(b[i] >= 0x30 && b[i] <= 0x39, "Invalid numeric string");
            result = result * 10 + (uint8(b[i]) - 48);
        }
        return result;
    }
    
    /**
     * @dev 获取房产状态并规范化返回
     * @param propertyId 房产ID (可以是字符串形式的数字)
     * @return status 房产状态
     * @return exists 房产是否存在
     */
    function getPropertyStatusExtended(string memory propertyId) external view 
        returns (PropertyStatus status, bool exists) 
    {
        if (!properties[propertyId].exists) {
            // 检查是否可能是数字ID以字符串形式提供
            if(_isNumericPropertyId(propertyId)) {
                uint256 numericId = _parseStringToUint(propertyId);
                string memory altPropertyId = uint256ToString(numericId);
                
                // 检查转换后的ID是否存在
                if(properties[altPropertyId].exists) {
                    return (properties[altPropertyId].status, true);
                }
            }
            return (PropertyStatus.NotRegistered, false);
        }
        return (properties[propertyId].status, true);
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
        emit PropertyRejected(propertyId, msg.sender, "");
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
        
        // 重新检查链ID，确保即使在硬分叉后也能正确识别
        uint256 id;
        assembly {
            id := chainid()
        }
        
        // 如果链ID发生变化，记录新的链ID
        if (id != chainId) {
            chainId = id;
        }
        
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
        // 相同状态，允许
        if (currentStatus == newStatus) {
            return;
        }
        
        // 定义允许的状态转换
        if (currentStatus == PropertyStatus.Pending) {
            // 从Pending可以转换到Approved或Rejected
            require(
                newStatus == PropertyStatus.Approved ||
                newStatus == PropertyStatus.Rejected,
                "Invalid transition from Pending status"
            );
            return;
        }
        
        if (currentStatus == PropertyStatus.Approved) {
            // 从Approved可以转换到Delisted, Redemption或Frozen
            require(
                newStatus == PropertyStatus.Delisted ||
                newStatus == PropertyStatus.Redemption ||
                newStatus == PropertyStatus.Frozen,
                "Invalid transition from Approved status"
            );
            return;
        }
        
        if (currentStatus == PropertyStatus.Rejected) {
            // 从Rejected只能转换到Pending (重新申请)
            require(
                newStatus == PropertyStatus.Pending,
                "Invalid transition from Rejected status"
            );
            return;
        }
        
        if (currentStatus == PropertyStatus.Delisted) {
            // 从Delisted只能重新转换为Approved
            require(
                newStatus == PropertyStatus.Approved,
                "Invalid transition from Delisted status"
            );
            return;
        }
        
        if (currentStatus == PropertyStatus.Redemption) {
            // 从Redemption只能转换回Approved
            require(
                newStatus == PropertyStatus.Approved,
                "Invalid transition from Redemption status"
            );
            return;
        }
        
        if (currentStatus == PropertyStatus.Frozen) {
            // 从Frozen只能转换回Approved
            require(
                newStatus == PropertyStatus.Approved,
                "Invalid transition from Frozen status"
            );
            return;
        }
        
        // 如果到这里，说明是未处理的状态转换
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
     * @param propertyId 房产ID
     * @return 房产状态
     */
    function getPropertyStatus(string memory propertyId) external view returns (PropertyStatus) {
        if (!properties[propertyId].exists) {
            return PropertyStatus.NotRegistered;
        }
        return properties[propertyId].status;
    }

    /**
     * @dev 获取房产状态 (uint256类型)
     * @param propertyId 房产ID (uint256)
     * @return 房产状态
     */
    function getPropertyStatus(uint256 propertyId) external view returns (PropertyStatus) {
        string memory propertyIdStr = uint256ToString(propertyId);
        if (!properties[propertyIdStr].exists) {
            return PropertyStatus.NotRegistered;
        }
        return properties[propertyIdStr].status;
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

    /**
     * @dev 添加授权合约
     * @param contractAddress 合约地址
     */
    function addAuthorizedContract(address contractAddress) external onlySuperAdmin {
        require(contractAddress != address(0), "Invalid contract address");
        authorizedContracts[contractAddress] = true;
        emit AuthorizedContractUpdated(contractAddress, true);
    }
    
    /**
     * @dev 移除授权合约
     * @param contractAddress 合约地址
     */
    function removeAuthorizedContract(address contractAddress) external onlySuperAdmin {
        authorizedContracts[contractAddress] = false;
        emit AuthorizedContractUpdated(contractAddress, false);
    }
    
    /**
     * @dev 检查是否是授权合约
     * @param contractAddress 合约地址
     * @return 是否授权
     */
    function isAuthorizedContract(address contractAddress) public view returns (bool) {
        return authorizedContracts[contractAddress];
    }

    /**
     * @dev 设置房产状态（公开函数，供其他合约调用）
     * @param propertyId 房产ID
     * @param newStatus 新状态
     */
    function setPropertyStatus(string memory propertyId, PropertyStatus newStatus) external {
        // 检查propertyId不为空
        require(bytes(propertyId).length > 0, "Property ID cannot be empty");
        
        // 检查调用者是否是超级管理员、房产管理员或授权合约
        require(
            roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender) || 
            roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender) ||
            isAuthorizedContract(msg.sender),
            "Caller is not authorized to set property status"
        );
        
        require(properties[propertyId].exists, "Property does not exist");
        
        // 记录旧状态用于日志
        PropertyStatus oldStatus = properties[propertyId].status;
        
        // 验证状态转换的有效性
        _validateStatusTransition(oldStatus, newStatus);
        
        // 更新状态
        properties[propertyId].status = newStatus;
        
        // 如果该房产已关联代币，通知代币合约状态变更
        address tokenAddress = RealEstateTokens[propertyId];
        if (tokenAddress != address(0)) {
            // 尝试调用代币合约的通知函数
            try IRealEstateToken(tokenAddress).notifyPropertyStatusChange(newStatus) {
                // 调用成功
            } catch {
                // 调用失败，但不影响状态更新主流程
                // 可以考虑记录错误日志
            }
        }
        
        // 记录日志
        emit PropertyStatusUpdated(propertyId, newStatus);
        emit PropertyStatusTransition(propertyId, oldStatus, newStatus, msg.sender);
    }
    
    /**
     * @dev 设置房产状态（公开函数，重载版本支持uint256类型ID）
     * @param propertyId 房产ID (uint256)
     * @param newStatus 新状态
     */
    function setPropertyStatus(uint256 propertyId, PropertyStatus newStatus) external {
        // 检查propertyId不为0
        require(propertyId > 0, "Property ID cannot be zero");
        
        string memory propertyIdStr = uint256ToString(propertyId);
        
        // 检查调用者是否是超级管理员、房产管理员或授权合约
        require(
            roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender) || 
            roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender) ||
            isAuthorizedContract(msg.sender),
            "Caller is not authorized to set property status"
        );
        
        require(properties[propertyIdStr].exists, "Property does not exist");
        
        // 记录旧状态用于日志
        PropertyStatus oldStatus = properties[propertyIdStr].status;
        
        // 验证状态转换的有效性
        _validateStatusTransition(oldStatus, newStatus);
        
        // 更新状态
        properties[propertyIdStr].status = newStatus;
        
        // 如果该房产已关联代币，通知代币合约状态变更
        address tokenAddress = RealEstateTokens[propertyIdStr];
        if (tokenAddress != address(0)) {
            // 尝试调用代币合约的通知函数
            try IRealEstateToken(tokenAddress).notifyPropertyStatusChange(newStatus) {
                // 调用成功
            } catch {
                // 调用失败，但不影响状态更新主流程
                // 可以考虑记录错误日志
            }
        }
        
        // 记录日志
        emit PropertyStatusUpdated(propertyIdStr, newStatus);
        emit PropertyStatusTransition(propertyIdStr, oldStatus, newStatus, msg.sender);
    }

    // 新增函数，由TokenFactory调用来注册代币地址
    function registerTokenForProperty(string memory propertyId, address tokenAddress) external {
        // 只允许授权合约调用
        require(isAuthorizedContract(msg.sender), "Only authorized contracts can register tokens");
        require(properties[propertyId].exists, "Property does not exist");
        require(RealEstateTokens[propertyId] == address(0), "Token already registered for property");
        
        RealEstateTokens[propertyId] = tokenAddress;
        emit TokenRegistered(propertyId, tokenAddress);
    }
}