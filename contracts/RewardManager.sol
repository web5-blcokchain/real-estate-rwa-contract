// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
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
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable {
    
    using SafeMath for uint256;
    using RoleConstants for bytes32;
    
    // 版本控制 - 使用uint8节省gas
    uint8 public version;
    
    // 系统合约引用
    RealEstateSystem public system;
    
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
    
    // 分配信息 - 修改以支持默克尔树
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
        address tokenAddress;     // 代币地址(稳定币)
        uint256 totalAmount;      // 总金额
        bytes32 merkleRoot;       // 默克尔根 - 新增
        string description;       // 描述
    }
    
    // 映射优化：使用uint256作为键
    mapping(uint256 => Distribution) private _distributions;
    
    // 用户已提取金额记录
    mapping(uint256 => mapping(address => uint256)) private _userClaimedAmounts;
    
    // 分配总提取金额记录
    mapping(uint256 => uint256) private _distributionTotalClaimed;
    
    // 所有分配ID数组
    uint256[] public allDistributionIds;
    
    // 授权合约
    mapping(address => bool) public authorizedContracts;
    
    // 支持的稳定币列表
    mapping(address => bool) public supportedStablecoins;
    
    // 分配ID计数器
    uint256 private _nextDistributionId;
    
    // 事件 - 优化事件定义
    event DistributionCreated(
        uint256 indexed distributionId, 
        string indexed propertyId,
        uint8 indexed distributionType,
        address tokenAddress,
        uint256 totalAmount,
        bytes32 merkleRoot,            // 新增merkleRoot
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
    event StablecoinSupported(           // 新增事件
        address indexed stablecoin,
        bool supported,
        uint40 updateTime
    );
    event MerkleRootUpdated(             // 新增事件
        uint256 indexed distributionId,
        bytes32 merkleRoot,
        uint40 updateTime
    );
    event FundsRecovered(
        uint256 indexed distributionId,
        address indexed receiver,
        uint256 amount,
        uint40 recoveryTime
    );
    event ContractAuthorized(
        address indexed contractAddress,
        bool authorized,
        uint40 updateTime
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化合约
     * @param _systemAddress 系统合约地址，用于权限验证
     * @param _propertyManager 房产管理合约地址
     * @param _tradingManager 交易管理合约地址
     */
    function initialize(
        address _systemAddress,
        address _propertyManager,
        address _tradingManager
    ) public initializer {
        require(_systemAddress != address(0), "System address cannot be zero");
        require(_propertyManager != address(0), "Property manager address cannot be zero");
        require(_tradingManager != address(0), "Trading manager address cannot be zero");
        
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        system = RealEstateSystem(_systemAddress);
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        
        version = 1;
        
        emit RewardManagerInitialized(msg.sender, _systemAddress, version);
    }
    
    /**
     * @dev 授权合约 - 需要ADMIN权限
     * @param _contract 需要授权的合约地址
     * @param _authorized 是否授权，true为授权，false为撤销授权
     */
    function authorizeContract(address _contract, bool _authorized) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        authorizedContracts[_contract] = _authorized;
        emit ContractAuthorized(_contract, _authorized, uint40(block.timestamp));
    }
    
    /**
     * @dev 添加支持的稳定币 - 需要ADMIN权限
     * @param stablecoin 要添加为支持的稳定币合约地址
     */
    function addSupportedStablecoin(address stablecoin) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(stablecoin != address(0), "Invalid stablecoin address");
        supportedStablecoins[stablecoin] = true;
        emit StablecoinSupported(stablecoin, true, uint40(block.timestamp));
    }
    
    /**
     * @dev 移除支持的稳定币 - 需要ADMIN权限
     * @param stablecoin 要移除支持的稳定币合约地址
     */
    function removeSupportedStablecoin(address stablecoin) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        supportedStablecoins[stablecoin] = false;
        emit StablecoinSupported(stablecoin, false, uint40(block.timestamp));
    }
    
    /**
     * @dev 创建分配 - 需要MANAGER或更高级别权限
     * @param propertyId 房产ID，标识与哪个房产相关联
     * @param amount 分配的总金额（稳定币数量）
     * @param stablecoinAddress 用于分配的稳定币合约地址
     * @param merkleRoot 默克尔树根，用于验证用户提取权限
     * @param distributionType 分配类型（分红/租金/奖金等）
     * @param endTime 分配结束时间，0表示永不过期
     * @param description 分配的描述信息
     * @return 新创建的分配ID
     */
    function createDistribution(
        string memory propertyId,
        uint256 amount,
        address stablecoinAddress,
        bytes32 merkleRoot,
        DistributionType distributionType,
        uint40 endTime,
        string memory description
    ) external whenNotPaused returns (uint256) {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(amount > 0, "Invalid amount");
        require(bytes(propertyId).length > 0, "Invalid propertyId");
        require(stablecoinAddress != address(0), "Invalid stablecoin address");
        require(supportedStablecoins[stablecoinAddress], "Unsupported stablecoin");
        
        // 检查结束时间
        uint40 actualEndTime = endTime;
        if (endTime != 0 && endTime <= block.timestamp) {
            revert("End time must be in future or zero");
        }
        
        // 从调用者转移稳定币到合约
        require(IERC20Upgradeable(stablecoinAddress).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        uint256 distributionId = _nextDistributionId++;
        
        _distributions[distributionId] = Distribution({
            distributionId: distributionId,
            status: uint8(DistributionStatus.Pending),
            distributionType: uint8(distributionType),
            createTime: uint40(block.timestamp),
            startTime: uint40(block.timestamp),
            endTime: actualEndTime,
            exists: true,
            propertyId: propertyId,
            tokenAddress: stablecoinAddress,
            totalAmount: amount,
            merkleRoot: merkleRoot,
            description: description
        });
        
        allDistributionIds.push(distributionId);
        
        emit DistributionCreated(
            distributionId, 
            propertyId,
            uint8(distributionType),
            stablecoinAddress,
            amount,
            merkleRoot,
            uint40(block.timestamp),
            actualEndTime
        );
        
        return distributionId;
    }
    
    /**
     * @dev 更新分配默克尔根 - 需要MANAGER权限
     * @param distributionId 要更新的分配ID
     * @param merkleRoot 新的默克尔树根
     */
    function updateMerkleRoot(
        uint256 distributionId,
        bytes32 merkleRoot
    ) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_distributions[distributionId].exists, "Distribution not exist");
        require(merkleRoot != bytes32(0), "Invalid merkle root");
        
        _distributions[distributionId].merkleRoot = merkleRoot;
        
        emit MerkleRootUpdated(
            distributionId,
            merkleRoot,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 更新分配状态 - 需要MANAGER权限
     * @param distributionId 要更新的分配ID
     * @param status 新的分配状态（Pending/Active/Completed/Cancelled）
     */
    function updateDistributionStatus(
        uint256 distributionId,
        DistributionStatus status
    ) external whenNotPaused {
        system.validateRole(RoleConstants.MANAGER_ROLE(), msg.sender, "Caller is not a manager");
        require(_distributions[distributionId].exists, "Distribution not exist");
        require(_distributions[distributionId].merkleRoot != bytes32(0), "Merkle root not set");
        
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
     * @dev 提取分配 - 使用默克尔证明
     * @param distributionId 要提取的分配ID
     * @param user 提取的用户地址
     * @param amount 要提取的金额
     * @param totalEligible 用户有资格提取的总金额
     * @param merkleProof 默克尔证明，用于验证用户的提取资格
     */
    function withdraw(
        uint256 distributionId,
        address user,
        uint256 amount,
        uint256 totalEligible,
        bytes32[] calldata merkleProof
    ) external whenNotPaused nonReentrant {
        require(
            system.hasRole(RoleConstants.OPERATOR_ROLE(), msg.sender) ||
            system.hasRole(RoleConstants.MANAGER_ROLE(), msg.sender) ||
            system.hasRole(RoleConstants.ADMIN_ROLE(), msg.sender),
            "Not authorized"
        );
        
        // 验证分配存在
        require(_distributions[distributionId].exists, "Distribution not exist");
        require(amount > 0, "Invalid amount");
        
        Distribution storage distribution = _distributions[distributionId];
        
        // 验证分配状态
        require(distribution.status == uint8(DistributionStatus.Active), "Distribution not active");
        require(distribution.merkleRoot != bytes32(0), "Merkle root not set");
        
        // 验证是否已过期（如果设置了结束时间）
        if (distribution.endTime != 0) {
            require(block.timestamp <= distribution.endTime, "Distribution expired");
        }
        
        // 验证用户未超额提取
        uint256 alreadyClaimed = _userClaimedAmounts[distributionId][user];
        require(alreadyClaimed + amount <= totalEligible, "Exceeds eligible amount");
        
        // 验证累计提取不超过总分配金额
        require(_distributionTotalClaimed[distributionId] + amount <= distribution.totalAmount, "Exceeds total distribution amount");
        
        // 验证默克尔证明
        bytes32 leaf = keccak256(abi.encodePacked(user, totalEligible));
        require(MerkleProofUpgradeable.verify(merkleProof, distribution.merkleRoot, leaf), "Invalid merkle proof");
        
        // 更新已提取金额
        _userClaimedAmounts[distributionId][user] += amount;
        _distributionTotalClaimed[distributionId] += amount;
        
        // 转移稳定币给用户
        require(IERC20Upgradeable(distribution.tokenAddress).transfer(user, amount), "Transfer failed");
        
        emit DistributionWithdrawn(
            distributionId,
            user,
            amount,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 获取用户已提取金额
     * @param distributionId 分配ID
     * @param user 用户地址
     * @return 该用户在该分配中已提取的金额
     */
    function getUserClaimedAmount(uint256 distributionId, address user) external view returns (uint256) {
        return _userClaimedAmounts[distributionId][user];
    }
    
    /**
     * @dev 管理员回收过期或取消的分配中未领取的资金
     * @param distributionId 分配ID
     * @param receiver 接收剩余资金的地址
     */
    function recoverUnclaimedFunds(
        uint256 distributionId,
        address receiver
    ) external whenNotPaused nonReentrant {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        
        require(_distributions[distributionId].exists, "Distribution not exist");
        Distribution storage distribution = _distributions[distributionId];
        
        // 验证分配可以被回收（已过期或已取消）
        bool isExpired = distribution.endTime != 0 && block.timestamp > distribution.endTime;
        bool isCancelled = distribution.status == uint8(DistributionStatus.Cancelled);
        
        require(isExpired || isCancelled, "Distribution not expired or cancelled");
        require(distribution.status != uint8(DistributionStatus.Completed), "Distribution already completed");
        require(receiver != address(0), "Invalid receiver address");
        
        // 计算剩余金额
        uint256 claimedAmount = _distributionTotalClaimed[distributionId];
        uint256 remainingAmount = distribution.totalAmount - claimedAmount;
        
        require(remainingAmount > 0, "No funds to recover");
        
        // 更新分配状态为已完成
        distribution.status = uint8(DistributionStatus.Completed);
        
        // 转移剩余资金到接收者
        require(IERC20Upgradeable(distribution.tokenAddress).transfer(receiver, remainingAmount), "Transfer failed");
        
        emit FundsRecovered(
            distributionId,
            receiver,
            remainingAmount,
            uint40(block.timestamp)
        );
    }
    
    /**
     * @dev 获取分配的已领取总金额
     * @param distributionId 分配ID
     * @return 该分配已经被领取的总金额
     */
    function getDistributionClaimedAmount(uint256 distributionId) external view returns (uint256) {
        require(_distributions[distributionId].exists, "Distribution not exist");
        return _distributionTotalClaimed[distributionId];
    }
    
    /**
     * @dev 获取分配信息
     * @param distributionId 要查询的分配ID
     * @return 分配的详细信息，包含ID、状态、类型、时间、房产ID、代币地址、金额等
     */
    function getDistribution(uint256 distributionId) 
        external 
        view 
        returns (
            uint256,  // distributionId - 分配ID
            uint8,    // status - 分配状态
            uint8,    // distributionType - 分配类型
            uint40,   // createTime - 创建时间
            uint40,   // startTime - 开始时间
            uint40,   // endTime - 结束时间
            string memory,  // propertyId - 房产ID
            address,  // tokenAddress - 代币地址(稳定币)
            uint256,  // totalAmount - 总金额
            bytes32,  // merkleRoot - 默克尔根
            string memory   // description - 描述
        ) 
    {
        require(_distributions[distributionId].exists, "Distribution not exist");
        Distribution memory dist = _distributions[distributionId];
        
        return (
            dist.distributionId,
            dist.status,
            dist.distributionType,
            dist.createTime,
            dist.startTime,
            dist.endTime,
            dist.propertyId,
            dist.tokenAddress,
            dist.totalAmount,
            dist.merkleRoot,
            dist.description
        );
    }
    
    /**
     * @dev 获取所有分配ID
     * @return 包含所有分配ID的数组
     */
    function getAllDistributionIds() external view returns (uint256[] memory) {
        return allDistributionIds;
    }
    
    /**
     * @dev 检查是否为支持的稳定币
     * @param stablecoin 要检查的稳定币合约地址
     * @return 是否支持，true表示支持
     */
    function isStablecoinSupported(address stablecoin) external view returns (bool) {
        return supportedStablecoins[stablecoin];
    }
    
    /**
     * @dev 暂停合约 - 需要ADMIN权限
     * 暂停后，所有使用whenNotPaused修饰符的函数将无法调用
     */
    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _pause();
    }
    
    /**
     * @dev 恢复合约 - 需要ADMIN权限
     * 解除暂停状态，恢复合约正常运行
     */
    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _unpause();
    }
    
    /**
     * @dev 授权合约升级 - 需要ADMIN权限
     * @param newImplementation 新实现合约的地址
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(RoleConstants.UPGRADER_ROLE()) 
    {
        require(!system.emergencyMode(), "Emergency mode active");
    }
    
    /**
     * @dev 获取版本号
     * @return 合约的版本号
     */
    function getVersion() external view returns (uint8) {
        return version;
    }

    /**
     * @dev 更新系统合约地址 - 需要ADMIN权限
     * @param _systemAddress 新的系统合约地址
     */
    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
    }

    /**
     * @dev 验证用户分红资格
     * @param distributionId 分配ID
     * @param user 用户地址
     * @param totalEligible 声称的可提取总金额
     * @param merkleProof 用户的默克尔证明
     * @return 验证结果，true表示有效
     */
    function verifyMerkleProof(
        uint256 distributionId,
        address user,
        uint256 totalEligible,
        bytes32[] calldata merkleProof
    ) external view returns (bool) {
        require(_distributions[distributionId].exists, "Distribution not exist");
        
        bytes32 merkleRoot = _distributions[distributionId].merkleRoot;
        require(merkleRoot != bytes32(0), "Merkle root not set");
        
        bytes32 leaf = keccak256(abi.encodePacked(user, totalEligible));
        return MerkleProofUpgradeable.verify(merkleProof, merkleRoot, leaf);
    }
} 