// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./utils/RoleConstants.sol";
import "./RealEstateSystem.sol";
import "./PropertyToken.sol";
import "./utils/SafeMath.sol";

/**
 * @title RewardManager
 * @dev 优化的奖励管理合约，提高存储效率和安全性
 * 权限说明：
 * - ADMIN: 最高权限，包含所有权限
 * - MANAGER: 管理权限，包含OPERATOR权限
 * - OPERATOR: 基础操作权限
 */
contract RewardManager is 
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable {
    
    using SafeMath for uint256;
    
    // 版本控制 - 使用uint8节省gas
    uint8 public version;
    
    // 系统合约引用
    RealEstateSystem public system;
    
    // 奖励状态 - 用uint8表示，节省gas
    enum RewardStatus {
        Pending,    // 0
        Distributed,// 1
        Cancelled   // 2
    }

    // 分配类型
    enum DistributionType {
        Dividend,   // 0 - 分红
        Rent,       // 1 - 租金
        Bonus       // 2 - 奖金
    }

    // 分配状态
    enum DistributionStatus {
        Pending,    // 0 - 待分配
        Active,     // 1 - 进行中
        Completed,  // 2 - 已完成
        Cancelled   // 3 - 已取消
    }
    
    // 奖励信息 - 优化存储布局
    struct Reward {
        // 固定属性组
        uint256 rewardId;         // 奖励ID
        uint8 status;             // 奖励状态
        uint40 createTime;        // 创建时间
        uint40 updateTime;        // 更新时间
        bool exists;              // 是否存在
        
        // 可变属性组
        address recipient;        // 接收者
        uint256 amount;           // 奖励金额
        address tokenAddress;     // 代币地址
        string description;       // 奖励描述
    }

    // 分配信息
    struct Distribution {
        // 固定属性组
        uint256 distributionId;   // 分配ID
        uint8 status;             // 分配状态
        uint8 distributionType;   // 分配类型
        uint40 createTime;        // 创建时间
        uint40 startTime;         // 开始时间
        uint40 endTime;           // 结束时间
        bool exists;              // 是否存在
        
        // 可变属性组
        string propertyId;        // 房产ID
        address tokenAddress;     // 代币地址
        uint256 totalAmount;      // 总金额
        string description;       // 描述
    }
    
    // 映射优化：使用uint256作为键
    mapping(uint256 => Reward) private _rewards;
    mapping(uint256 => Distribution) private _distributions;
    mapping(uint256 => mapping(address => bool)) private _hasWithdrawn;
    
    // 所有奖励ID数组
    uint256[] public allRewardIds;
    uint256[] public allDistributionIds;
    
    // 授权合约
    mapping(address => bool) public authorizedContracts;
    
    // 奖励参数
    uint256 public maxRewardAmount;
    uint256 public minRewardAmount;
    uint256 public cooldownPeriod;
    
    // 分配ID计数器
    uint256 private _nextDistributionId;
    
    // 事件 - 优化事件定义
    event RewardCreated(
        uint256 indexed rewardId,
        address indexed recipient,
        uint256 amount,
        uint40 createTime
    );
    event RewardStatusUpdated(
        uint256 indexed rewardId,
        uint8 oldStatus,
        uint8 newStatus,
        uint40 updateTime
    );
    event RewardParametersUpdated(
        uint256 maxRewardAmount,
        uint256 minRewardAmount,
        uint256 cooldownPeriod,
        uint40 updateTime
    );
    event ContractAuthorized(
        address indexed contractAddress,
        bool authorized,
        uint40 updateTime
    );
    event DistributionCreated(
        uint256 indexed distributionId, 
        string indexed propertyId,
        uint8 indexed distributionType,
        address tokenAddress,
        uint256 totalAmount,
        uint40 startTime,
        uint40 endTime
    );
    event DistributionStatusUpdated(
        uint256 indexed distributionId,
        uint8 oldStatus,
        uint8 newStatus,
        uint40 updateTime
    );
    event DistributionWithdrawn(
        uint256 indexed distributionId,
        address indexed user,
        uint256 amount,
        uint40 withdrawTime
    );
    event EmergencyWithdrawal(
        uint256 indexed distributionId,
        address indexed user,
        uint256 amount, 
        uint40 withdrawTime
    );
    event RewardManagerInitialized(
        address indexed deployer,
        address indexed system,
        uint8 version
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化合约
     */
    function initialize(
        address _systemAddress,
        address _propertyManager,
        address _tradingManager
    ) public initializer {
        require(_systemAddress != address(0), "System address cannot be zero");
        require(_propertyManager != address(0), "Property manager address cannot be zero");
        require(_tradingManager != address(0), "Trading manager address cannot be zero");
        
        system = RealEstateSystem(_systemAddress);
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        version = 1;
        
        emit RewardManagerInitialized(msg.sender, _systemAddress, version);
    }
    
    /**
     * @dev 创建奖励 - 需要OPERATOR或更高级别权限
     */
    function createReward(
        address recipient,
        uint256 amount,
        address tokenAddress,
        string memory description
    ) external whenNotPaused returns (uint256) {
        require(
            system.hasRole(RoleConstants.OPERATOR_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.MANAGER_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(recipient != address(0), "Invalid recipient address");
        require(amount >= minRewardAmount && amount <= maxRewardAmount, "Invalid reward amount");
        require(tokenAddress != address(0), "Invalid token address");
        
        uint256 rewardId = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            recipient,
            amount
        )));
        
        require(!_rewards[rewardId].exists, "Reward already exists");
        
        _rewards[rewardId] = Reward({
            rewardId: rewardId,
            status: uint8(RewardStatus.Pending),
            createTime: uint40(block.timestamp),
            updateTime: uint40(block.timestamp),
            exists: true,
            recipient: recipient,
            amount: amount,
            tokenAddress: tokenAddress,
            description: description
        });
        
        allRewardIds.push(rewardId);
        
        emit RewardCreated(rewardId, recipient, amount, uint40(block.timestamp));
        
        return rewardId;
    }
    
    /**
     * @dev 更新奖励状态 - 需要OPERATOR或更高级别权限
     */
    function updateRewardStatus(
        uint256 rewardId,
        RewardStatus status
    ) external whenNotPaused {
        require(
            system.hasRole(RoleConstants.OPERATOR_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.MANAGER_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(_rewards[rewardId].exists, "Reward not exist");
        
        uint8 oldStatus = _rewards[rewardId].status;
        _rewards[rewardId].status = uint8(status);
        _rewards[rewardId].updateTime = uint40(block.timestamp);
        
        emit RewardStatusUpdated(rewardId, oldStatus, uint8(status), uint40(block.timestamp));
    }
    
    /**
     * @dev 设置奖励参数 - 需要MANAGER或更高级别权限
     */
    function setRewardParameters(
        uint256 _maxRewardAmount,
        uint256 _minRewardAmount,
        uint256 _cooldownPeriod
    ) external whenNotPaused {
        require(
            system.hasRole(RoleConstants.MANAGER_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(_maxRewardAmount > _minRewardAmount, "Invalid amount range");
        require(_cooldownPeriod > 0, "Invalid cooldown period");
        
        maxRewardAmount = _maxRewardAmount;
        minRewardAmount = _minRewardAmount;
        cooldownPeriod = _cooldownPeriod;
        
        emit RewardParametersUpdated(_maxRewardAmount, _minRewardAmount, _cooldownPeriod, uint40(block.timestamp));
    }
    
    /**
     * @dev 授权合约 - 需要ADMIN权限
     */
    function authorizeContract(address _contract, bool _authorized) external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        authorizedContracts[_contract] = _authorized;
        emit ContractAuthorized(_contract, _authorized, uint40(block.timestamp));
    }
    
    /**
     * @dev 获取奖励信息
     */
    function getReward(uint256 rewardId) 
        external 
        view 
        returns (
            uint256,
            uint8,
            uint40,
            uint40,
            address,
            uint256,
            address,
            string memory
        ) 
    {
        require(_rewards[rewardId].exists, "Reward not exist");
        Reward memory reward = _rewards[rewardId];
        return (
            reward.rewardId,
            reward.status,
            reward.createTime,
            reward.updateTime,
            reward.recipient,
            reward.amount,
            reward.tokenAddress,
            reward.description
        );
    }
    
    /**
     * @dev 检查奖励是否存在
     */
    function rewardExists(uint256 rewardId) public view returns (bool) {
        return _rewards[rewardId].exists;
    }
    
    /**
     * @dev 获取奖励状态
     */
    function getRewardStatus(uint256 rewardId) public view returns (RewardStatus) {
        require(_rewards[rewardId].exists, "Reward not exist");
        return RewardStatus(_rewards[rewardId].status);
    }
    
    /**
     * @dev 获取所有奖励ID
     */
    function getAllRewardIds() external view returns (uint256[] memory) {
        return allRewardIds;
    }
    
    /**
     * @dev 获取分页的奖励列表
     */
    function getRewardsPaginated(
        uint256 offset,
        uint256 limit
    ) 
        external 
        view 
        returns (
            uint256 totalCount,
            uint256[] memory ids,
            uint8[] memory statuses,
            address[] memory recipients,
            uint256[] memory amounts,
            address[] memory tokenAddresses,
            string[] memory descriptions
        ) 
    {
        totalCount = allRewardIds.length;
        
        if (offset >= totalCount) {
            return (totalCount, new uint256[](0), new uint8[](0), new address[](0), 
                    new uint256[](0), new address[](0), new string[](0));
        }
        
        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        uint256 resultCount = end - offset;
        ids = new uint256[](resultCount);
        statuses = new uint8[](resultCount);
        recipients = new address[](resultCount);
        amounts = new uint256[](resultCount);
        tokenAddresses = new address[](resultCount);
        descriptions = new string[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            uint256 rewardId = allRewardIds[offset + i];
            Reward memory reward = _rewards[rewardId];
            
            ids[i] = reward.rewardId;
            statuses[i] = reward.status;
            recipients[i] = reward.recipient;
            amounts[i] = reward.amount;
            tokenAddresses[i] = reward.tokenAddress;
            descriptions[i] = reward.description;
        }
        
        return (totalCount, ids, statuses, recipients, amounts, tokenAddresses, descriptions);
    }
    
    /**
     * @dev 创建分配 - 需要OPERATOR或更高级别权限
     */
    function createDistribution(
        string memory propertyId,
        uint256 amount,
        string memory description
    ) external whenNotPaused returns (uint256) {
        require(
            system.hasRole(RoleConstants.OPERATOR_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.MANAGER_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(amount > 0, "Invalid amount");
        
        uint256 distributionId = _nextDistributionId++;
        
        _distributions[distributionId] = Distribution({
            distributionId: distributionId,
            status: uint8(DistributionStatus.Pending),
            distributionType: uint8(DistributionType.Dividend),
            createTime: uint40(block.timestamp),
            startTime: uint40(block.timestamp),
            endTime: uint40(block.timestamp + 30 days),
            exists: true,
            propertyId: propertyId,
            tokenAddress: address(0),
            totalAmount: amount,
            description: description
        });
        
        allDistributionIds.push(distributionId);
        
        emit DistributionCreated(
            distributionId, 
            propertyId,
            uint8(DistributionType.Dividend),
            address(0),
            amount,
            uint40(block.timestamp),
            uint40(block.timestamp + 30 days)
        );
        
        return distributionId;
    }
    
    /**
     * @dev 更新分配状态 - 需要MANAGER权限
     */
    function updateDistributionStatus(
        uint256 distributionId,
        DistributionStatus status
    ) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE, msg.sender);
        require(_distributions[distributionId].exists, "Distribution not exist");
        
        uint8 oldStatus = _distributions[distributionId].status;
        _distributions[distributionId].status = uint8(status);
        
        emit DistributionStatusUpdated(
            distributionId,
            oldStatus,
            uint8(status),
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 提取分配 - 需要OPERATOR或更高级别权限
     */
    function withdraw(
        uint256 distributionId,
        address user,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        require(
            system.hasRole(RoleConstants.OPERATOR_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.MANAGER_ROLE, msg.sender) ||
            system.hasRole(RoleConstants.ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(_distributions[distributionId].exists, "Distribution not exist");
        require(!_hasWithdrawn[distributionId][user], "Already withdrawn");
        require(amount > 0, "Invalid amount");
        
        Distribution storage distribution = _distributions[distributionId];
        require(distribution.status == uint8(DistributionStatus.Active), "Distribution not active");
        
        _hasWithdrawn[distributionId][user] = true;
        
        emit DistributionWithdrawn(
            distributionId,
            user,
            amount,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 紧急提取 - 需要ADMIN权限
     */
    function emergencyWithdraw(
        uint256 distributionId,
        address user,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        require(_distributions[distributionId].exists, "Distribution not exist");
        require(amount > 0, "Invalid amount");
        
        emit EmergencyWithdrawal(
            distributionId,
            user,
            amount,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 暂停合约 - 需要ADMIN权限
     */
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        _pause();
    }
    
    /**
     * @dev 恢复合约 - 需要ADMIN权限
     */
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        _unpause();
    }
    
    /**
     * @dev 授权合约升级 - 需要ADMIN权限
     */
    function _authorizeUpgrade(address newImplementation) internal override {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        require(!system.emergencyMode(), "Emergency mode active");
    }
    
    /**
     * @dev 获取版本号
     */
    function getVersion() external view returns (uint8) {
        return version;
    }

    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
    }
} 