// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";

/**
 * @title RewardManager
 * @dev 优化的奖励管理合约，处理房产代币的分红和奖励逻辑
 */
contract RewardManager is 
    Initializable, 
    UUPSUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuardUpgradeable {
    
    using SafeMathUpgradeable for uint256;
    
    // 版本控制 - 使用uint8节省gas
    uint8 public version;
    
    // 角色管理器
    SimpleRoleManager public roleManager;
    
    // 房产管理器
    PropertyManager public propertyManager;
    
    // 费用率 (基点，1% = 100)
    uint256 public platformFee;      // 平台费用
    uint256 public maintenanceFee;   // 维护费用
    
    // 支持的稳定币
    mapping(address => bool) public supportedStablecoins;
    address[] public stablecoinsList;
    
    // 费用收集地址
    address public feeCollector;
    
    // 奖励状态枚举
    enum RewardStatus {
        Created,
        Processing,
        Completed,
        Cancelled
    }
    
    // 奖励类型枚举
    enum RewardType {
        Dividend,
        Rental,
        Bonus
    }
    
    // 奖励信息结构体
    struct Reward {
        uint256 id;
        bytes32 propertyIdHash;
        address tokenAddress;
        uint256 snapshotId;
        uint256 amount;
        uint256 createdAt;
        uint256 completedAt;
        RewardStatus status;
        RewardType rewardType;
        string description;
    }
    
    // 奖励ID计数器
    uint256 private _nextRewardId;
    
    // 奖励记录映射
    mapping(uint256 => Reward) private _rewards;
    
    // 房产奖励列表
    mapping(bytes32 => uint256[]) private _propertyRewards;
    
    // 奖励类型映射
    mapping(RewardType => uint256[]) private _rewardsByType;
    
    // 代币奖励映射
    mapping(address => uint256[]) private _tokenRewards;
    
    // 快照是否已使用
    mapping(address => mapping(uint256 => bool)) private _snapshotUsed;
    
    // 提款状态记录
    mapping(uint256 => mapping(address => bool)) private _withdrawals;
    
    // 每个奖励的总提款金额
    mapping(uint256 => uint256) private _totalWithdrawn;
    
    // 紧急提款控制
    bool public emergencyWithdrawalEnabled;
    
    // 最低奖励触发阈值
    uint256 public minRewardThreshold;
    
    // 事件
    event RewardCreated(uint256 indexed rewardId, bytes32 indexed propertyIdHash, address indexed tokenAddress, uint256 snapshotId, uint256 amount, RewardType rewardType);
    event RewardProcessing(uint256 indexed rewardId);
    event RewardCompleted(uint256 indexed rewardId, uint256 completedAt);
    event RewardCancelled(uint256 indexed rewardId);
    event RewardWithdrawn(uint256 indexed rewardId, address indexed account, uint256 amount);
    event EmergencyWithdrawalStatusChanged(bool enabled);
    event MinRewardThresholdChanged(uint256 oldValue, uint256 newValue);
    event RentReceived(uint256 distributionId, string propertyId, address stablecoin, uint256 amount, string rentalPeriod);
    event RentProcessed(uint256 distributionId, uint256 platformFee, uint256 maintenanceFee, uint256 netAmount);
    event RentClaimed(uint256 distributionId, address user, uint256 amount);
    event FeeUpdated(string feeType, uint256 oldValue, uint256 newValue);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event StablecoinStatusUpdated(address indexed token, bool status);
    event RewardManagerInitialized(address deployer, address roleManager, address propertyManager, uint256 version);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
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
     * @dev 修饰器：只有OPERATOR角色可以调用
     */
    modifier onlyOperator() {
        require(roleManager.hasRole(roleManager.OPERATOR_ROLE(), msg.sender), "Not operator");
        _;
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(address _roleManager) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        _nextRewardId = 1;
        emergencyWithdrawalEnabled = false;
        minRewardThreshold = 0.01 ether; // 默认最低奖励触发阈值
        version = 1;
        
        // 设置默认费用
        platformFee = 500;     // 5%
        maintenanceFee = 200;  // 2%
        feeCollector = msg.sender;
        
        emit RewardManagerInitialized(msg.sender, _roleManager, address(0), version);
    }
    
    /**
     * @dev 设置紧急提款状态
     */
    function setEmergencyWithdrawalStatus(bool _enabled) external onlyAdmin {
        emergencyWithdrawalEnabled = _enabled;
        emit EmergencyWithdrawalStatusChanged(_enabled);
    }
    
    /**
     * @dev 设置最低奖励触发阈值
     */
    function setMinRewardThreshold(uint256 _threshold) external onlyAdmin {
        uint256 oldValue = minRewardThreshold;
        minRewardThreshold = _threshold;
        emit MinRewardThresholdChanged(oldValue, _threshold);
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
     * @dev 设置平台费率
     */
    function setPlatformFee(uint256 _fee) external onlyAdmin {
        require(_fee <= 1000, "Fee too high"); // 最高10%
        uint256 oldFee = platformFee;
        platformFee = _fee;
        emit FeeUpdated("PLATFORM", oldFee, _fee);
    }
    
    /**
     * @dev 设置维护费率
     */
    function setMaintenanceFee(uint256 _fee) external onlyAdmin {
        require(_fee <= 1000, "Fee too high"); // 最高10%
        uint256 oldFee = maintenanceFee;
        maintenanceFee = _fee;
        emit FeeUpdated("MAINTENANCE", oldFee, _fee);
    }
    
    /**
     * @dev 设置费用收集地址
     */
    function setFeeCollector(address _collector) external onlyAdmin {
        require(_collector != address(0), "Invalid address");
        address oldCollector = feeCollector;
        feeCollector = _collector;
        emit FeeCollectorUpdated(oldCollector, _collector);
    }
    
    /**
     * @dev 添加支持的稳定币
     */
    function addSupportedStablecoin(address _stablecoin) external onlyAdmin {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        if (!supportedStablecoins[_stablecoin]) {
            supportedStablecoins[_stablecoin] = true;
            stablecoinsList.push(_stablecoin);
            emit StablecoinStatusUpdated(_stablecoin, true);
        }
    }
    
    /**
     * @dev 移除支持的稳定币
     */
    function removeSupportedStablecoin(address _stablecoin) external onlyAdmin {
        supportedStablecoins[_stablecoin] = false;
        emit StablecoinStatusUpdated(_stablecoin, false);
    }
    
    /**
     * @dev 计算平台费用
     */
    function calculatePlatformFee(uint256 amount) public view returns (uint256) {
        return (amount * platformFee) / 10000;
    }
    
    /**
     * @dev 计算维护费用
     */
    function calculateMaintenanceFee(uint256 amount) public view returns (uint256) {
        return (amount * maintenanceFee) / 10000;
    }
    
    /**
     * @dev 接收租金
     */
    function receiveRent(
        string memory propertyId,
        address tokenAddress,
        address stablecoinAddress,
        uint256 amount,
        string memory rentalPeriod
    ) external nonReentrant onlyManager {
        require(bytes(propertyId).length > 0, "Property ID cannot be empty");
        require(PropertyManager(propertyManager).isPropertyApproved(propertyId), "Property not approved");
        require(tokenAddress != address(0), "Invalid token address");
        require(supportedStablecoins[stablecoinAddress], "Unsupported stablecoin");
        require(amount > 0, "Amount must be greater than 0");
        
        // 转移稳定币
        IERC20 stablecoin = IERC20(stablecoinAddress);
        require(stablecoin.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // 创建分配记录
        uint256 distributionId = ++distributionCount;
        rentDistributions[distributionId] = RentDistribution({
            distributionId: distributionId,
            propertyId: propertyId,
            tokenAddress: tokenAddress,
            stablecoinAddress: stablecoinAddress,
            rentalPeriod: rentalPeriod,
            totalAmount: amount,
            platformFeeAmount: 0,
            maintenanceFeeAmount: 0,
            netAmount: 0,
            isProcessed: false,
            snapshotId: 0,
            totalClaimed: 0,
            distributionTime: block.timestamp
        });
        
        emit RentReceived(distributionId, propertyId, stablecoinAddress, amount, rentalPeriod);
    }
    
    /**
     * @dev 处理租金分配
     */
    function processRentDistribution(uint256 distributionId) external nonReentrant onlyManager {
        RentDistribution storage distribution = rentDistributions[distributionId];
        require(!distribution.isProcessed, "Already processed");
        
        // 计算费用
        uint256 platformFeeAmount = calculatePlatformFee(distribution.totalAmount);
        uint256 maintenanceFeeAmount = calculateMaintenanceFee(distribution.totalAmount);
        uint256 netAmount = distribution.totalAmount - platformFeeAmount - maintenanceFeeAmount;
        
        // 更新分配记录
        distribution.platformFeeAmount = platformFeeAmount;
        distribution.maintenanceFeeAmount = maintenanceFeeAmount;
        distribution.netAmount = netAmount;
        
        // 转移费用
        IERC20 stablecoin = IERC20(distribution.stablecoinAddress);
        
        if (platformFeeAmount > 0) {
            require(stablecoin.transfer(feeCollector, platformFeeAmount), "Platform fee transfer failed");
        }
        
        if (maintenanceFeeAmount > 0) {
            require(stablecoin.transfer(feeCollector, maintenanceFeeAmount), "Maintenance fee transfer failed");
        }
        
        // 创建代币快照
        uint256 snapshotId = PropertyToken(distribution.tokenAddress).snapshot();
        distribution.snapshotId = snapshotId;
        distribution.isProcessed = true;
        
        emit RentProcessed(distributionId, platformFeeAmount, maintenanceFeeAmount, netAmount);
    }
    
    /**
     * @dev 领取租金
     */
    function claimRent(uint256 distributionId) external nonReentrant {
        RentDistribution storage distribution = rentDistributions[distributionId];
        require(distribution.isProcessed, "Distribution not processed");
        require(!hasClaimed[distributionId][msg.sender], "Already claimed");
        
        // 获取快照时的代币余额和总供应量
        PropertyToken token = PropertyToken(distribution.tokenAddress);
        uint256 userBalance = token.balanceOfAt(msg.sender, distribution.snapshotId);
        uint256 totalSupply = token.totalSupplyAt(distribution.snapshotId);
        
        require(userBalance > 0, "No balance at snapshot");
        
        // 计算用户应得的租金
        uint256 userShare = (distribution.netAmount * userBalance) / totalSupply;
        require(userShare > 0, "Share too small");
        
        // 标记为已领取
        hasClaimed[distributionId][msg.sender] = true;
        distribution.totalClaimed += userShare;
        
        // 转移租金
        IERC20 stablecoin = IERC20(distribution.stablecoinAddress);
        require(stablecoin.transfer(msg.sender, userShare), "Transfer failed");
        
        emit RentClaimed(distributionId, msg.sender, userShare);
    }
    
    /**
     * @dev 批量处理分配
     */
    function batchProcessDistributions(uint256[] calldata distributionIds) external onlyManager {
        for (uint256 i = 0; i < distributionIds.length; i++) {
            if (!rentDistributions[distributionIds[i]].isProcessed) {
                this.processRentDistribution(distributionIds[i]);
            }
        }
    }
    
    /**
     * @dev 创建新奖励
     */
    function createReward(
        bytes32 _propertyIdHash,
        address _tokenAddress,
        uint256 _amount,
        RewardType _rewardType,
        string calldata _description
    ) external payable whenNotPaused nonReentrant onlyManager returns (uint256) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(msg.value >= _amount, "Insufficient funds");
        require(_amount >= minRewardThreshold, "Below minimum reward threshold");
        
        // 获取快照
        PropertyToken token = PropertyToken(_tokenAddress);
        require(token.propertyIdHash() == _propertyIdHash, "Token does not match property");
        
        uint256 snapshotId = token.snapshot();
        require(!_snapshotUsed[_tokenAddress][snapshotId], "Snapshot already used");
        
        _snapshotUsed[_tokenAddress][snapshotId] = true;
        
        // 创建奖励记录
        uint256 rewardId = _nextRewardId++;
        
        Reward storage reward = _rewards[rewardId];
        reward.id = rewardId;
        reward.propertyIdHash = _propertyIdHash;
        reward.tokenAddress = _tokenAddress;
        reward.snapshotId = snapshotId;
        reward.amount = _amount;
        reward.createdAt = block.timestamp;
        reward.status = RewardStatus.Created;
        reward.rewardType = _rewardType;
        reward.description = _description;
        
        // 更新索引
        _propertyRewards[_propertyIdHash].push(rewardId);
        _rewardsByType[_rewardType].push(rewardId);
        _tokenRewards[_tokenAddress].push(rewardId);
        
        // 如果发送额外的ETH，退还
        uint256 excess = msg.value - _amount;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        emit RewardCreated(rewardId, _propertyIdHash, _tokenAddress, snapshotId, _amount, _rewardType);
        
        return rewardId;
    }
    
    /**
     * @dev 开始处理奖励
     */
    function startProcessingReward(uint256 _rewardId) external onlyOperator whenNotPaused {
        Reward storage reward = _rewards[_rewardId];
        require(reward.id == _rewardId, "Reward does not exist");
        require(reward.status == RewardStatus.Created, "Invalid reward status");
        
        reward.status = RewardStatus.Processing;
        
        emit RewardProcessing(_rewardId);
    }
    
    /**
     * @dev 完成奖励处理
     */
    function completeReward(uint256 _rewardId) external onlyOperator whenNotPaused {
        Reward storage reward = _rewards[_rewardId];
        require(reward.id == _rewardId, "Reward does not exist");
        require(reward.status == RewardStatus.Processing, "Invalid reward status");
        
        reward.status = RewardStatus.Completed;
        reward.completedAt = block.timestamp;
        
        emit RewardCompleted(_rewardId, block.timestamp);
    }
    
    /**
     * @dev 取消奖励
     */
    function cancelReward(uint256 _rewardId) external onlyManager whenNotPaused nonReentrant {
        Reward storage reward = _rewards[_rewardId];
        require(reward.id == _rewardId, "Reward does not exist");
        require(reward.status == RewardStatus.Created || reward.status == RewardStatus.Processing, "Invalid reward status");
        
        // 计算未提取的金额
        uint256 remainingAmount = reward.amount - _totalWithdrawn[_rewardId];
        
        // 将未提取的金额退还给管理员
        if (remainingAmount > 0) {
            payable(msg.sender).transfer(remainingAmount);
        }
        
        reward.status = RewardStatus.Cancelled;
        
        emit RewardCancelled(_rewardId);
    }
    
    /**
     * @dev 提取奖励
     */
    function withdrawReward(uint256 _rewardId) external whenNotPaused nonReentrant {
        Reward storage reward = _rewards[_rewardId];
        require(reward.id == _rewardId, "Reward does not exist");
        require(
            reward.status == RewardStatus.Completed || 
            (emergencyWithdrawalEnabled && reward.status == RewardStatus.Processing), 
            "Reward not available for withdrawal"
        );
        require(!_withdrawals[_rewardId][msg.sender], "Already withdrawn");
        
        PropertyToken token = PropertyToken(reward.tokenAddress);
        uint256 balance = token.balanceOfAt(msg.sender, reward.snapshotId);
        require(balance > 0, "No tokens at snapshot");
        
        uint256 totalSupply = token.totalSupplyAt(reward.snapshotId);
        uint256 share = reward.amount.mul(balance).div(totalSupply);
        require(share > 0, "Share too small");
        
        // 记录提取状态
        _withdrawals[_rewardId][msg.sender] = true;
        _totalWithdrawn[_rewardId] = _totalWithdrawn[_rewardId].add(share);
        
        // 转账
        payable(msg.sender).transfer(share);
        
        emit RewardWithdrawn(_rewardId, msg.sender, share);
    }
    
    /**
     * @dev 批量提取奖励
     */
    function batchWithdrawRewards(uint256[] calldata _rewardIds) external whenNotPaused nonReentrant {
        uint256 totalShare = 0;
        
        for (uint256 i = 0; i < _rewardIds.length; i++) {
            uint256 rewardId = _rewardIds[i];
            Reward storage reward = _rewards[rewardId];
            
            if (reward.id != rewardId) continue;
            if (_withdrawals[rewardId][msg.sender]) continue;
            
            if (reward.status != RewardStatus.Completed && 
                !(emergencyWithdrawalEnabled && reward.status == RewardStatus.Processing)) continue;
            
            PropertyToken token = PropertyToken(reward.tokenAddress);
            uint256 balance = token.balanceOfAt(msg.sender, reward.snapshotId);
            
            if (balance == 0) continue;
            
            uint256 totalSupply = token.totalSupplyAt(reward.snapshotId);
            uint256 share = reward.amount.mul(balance).div(totalSupply);
            
            if (share == 0) continue;
            
            // 记录提取状态
            _withdrawals[rewardId][msg.sender] = true;
            _totalWithdrawn[rewardId] = _totalWithdrawn[rewardId].add(share);
            totalShare = totalShare.add(share);
            
            emit RewardWithdrawn(rewardId, msg.sender, share);
        }
        
        require(totalShare > 0, "No rewards to withdraw");
        
        // 一次性转账总金额
        payable(msg.sender).transfer(totalShare);
    }
    
    /**
     * @dev 检查用户是否已提取奖励
     */
    function hasWithdrawn(uint256 _rewardId, address _account) external view returns (bool) {
        return _withdrawals[_rewardId][_account];
    }
    
    /**
     * @dev 获取奖励详情
     */
    function getReward(uint256 _rewardId) 
        external 
        view 
        returns (
            uint256 id,
            bytes32 propertyIdHash,
            address tokenAddress,
            uint256 snapshotId,
            uint256 amount,
            uint256 createdAt,
            uint256 completedAt,
            RewardStatus status,
            RewardType rewardType,
            string memory description,
            uint256 totalWithdrawn
        ) 
    {
        Reward storage reward = _rewards[_rewardId];
        return (
            reward.id,
            reward.propertyIdHash,
            reward.tokenAddress,
            reward.snapshotId,
            reward.amount,
            reward.createdAt,
            reward.completedAt,
            reward.status,
            reward.rewardType,
            reward.description,
            _totalWithdrawn[_rewardId]
        );
    }
    
    /**
     * @dev 获取用户可提取的奖励数量
     */
    function getAvailableRewardAmount(uint256 _rewardId, address _account) 
        external 
        view 
        returns (uint256 available, bool canWithdraw) 
    {
        Reward storage reward = _rewards[_rewardId];
        if (reward.id != _rewardId) return (0, false);
        
        bool isCompleted = reward.status == RewardStatus.Completed;
        bool isEmergencyWithdrawal = emergencyWithdrawalEnabled && reward.status == RewardStatus.Processing;
        
        if (!isCompleted && !isEmergencyWithdrawal) return (0, false);
        if (_withdrawals[_rewardId][_account]) return (0, false);
        
        PropertyToken token = PropertyToken(reward.tokenAddress);
        uint256 balance = token.balanceOfAt(_account, reward.snapshotId);
        
        if (balance == 0) return (0, false);
        
        uint256 totalSupply = token.totalSupplyAt(reward.snapshotId);
        uint256 share = reward.amount.mul(balance).div(totalSupply);
        
        return (share, share > 0);
    }
    
    /**
     * @dev 获取房产的所有奖励
     */
    function getPropertyRewards(bytes32 _propertyIdHash) external view returns (uint256[] memory) {
        return _propertyRewards[_propertyIdHash];
    }
    
    /**
     * @dev 获取特定类型的所有奖励
     */
    function getRewardsByType(RewardType _rewardType) external view returns (uint256[] memory) {
        return _rewardsByType[_rewardType];
    }
    
    /**
     * @dev 获取代币的所有奖励
     */
    function getTokenRewards(address _tokenAddress) external view returns (uint256[] memory) {
        return _tokenRewards[_tokenAddress];
    }
    
    /**
     * @dev 获取奖励总数
     */
    function getRewardsCount() external view returns (uint256) {
        return _nextRewardId - 1;
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyAdmin 
    {
        require(!SimpleRoleManager(roleManager).emergencyMode(), "Emergency mode active");
        uint8 oldVersion = version;
        version += 1;
    }
    
    /**
     * @dev 紧急提款 - 允许管理员在紧急情况下提取合约中的以太坊
     */
    function emergencyWithdraw() external onlyAdmin {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    /**
     * @dev 接收以太币
     */
    receive() external payable {}
} 