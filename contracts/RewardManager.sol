// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SimpleRoleManager.sol";
import "./PropertyToken.sol";

/**
 * @title RewardManager
 * @dev 统一的奖励和租金分配管理合约
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
    
    // 分配类型枚举
    enum DistributionType {
        Dividend,    // 分红
        Rental,      // 租金
        Bonus        // 奖励
    }
    
    // 分配状态枚举
    enum DistributionStatus {
        Created,     // 已创建
        Processing,  // 处理中
        Completed,   // 已完成
        Cancelled    // 已取消
    }
    
    // 分配信息结构体
    struct Distribution {
        uint256 id;
        bytes32 propertyIdHash;
        address tokenAddress;
        uint256 snapshotId;
        uint256 amount;
        uint256 platformFee;     // 平台费用
        uint256 maintenanceFee;  // 维护费用
        uint256 netAmount;       // 净分配金额
        uint256 createdAt;
        uint256 completedAt;
        DistributionStatus status;
        DistributionType distType;
        string description;
        address paymentToken;    // 支付代币地址，address(0)表示ETH
    }
    
    // 分配ID计数器
    uint256 private _nextDistributionId;
    
    // 分配记录映射
    mapping(uint256 => Distribution) private _distributions;
    
    // 房产分配列表
    mapping(bytes32 => uint256[]) private _propertyDistributions;
    
    // 分配类型映射
    mapping(DistributionType => uint256[]) private _distributionsByType;
    
    // 代币分配映射
    mapping(address => uint256[]) private _tokenDistributions;
    
    // 快照是否已使用
    mapping(address => mapping(uint256 => bool)) private _snapshotUsed;
    
    // 提款状态记录
    mapping(uint256 => mapping(address => bool)) private _withdrawals;
    
    // 每个分配的总提款金额
    mapping(uint256 => uint256) private _totalWithdrawn;
    
    // 平台费率 (基点，1% = 100)
    uint256 public platformFeeRate;
    
    // 维护费率 (基点，1% = 100)
    uint256 public maintenanceFeeRate;
    
    // 费用接收地址
    address public feeReceiver;
    
    // 紧急提款控制
    bool public emergencyWithdrawalEnabled;
    
    // 最低分配触发阈值
    uint256 public minDistributionThreshold;
    
    // 支持的支付代币映射
    mapping(address => bool) public supportedPaymentTokens;
    
    // 支付代币列表
    address[] public paymentTokensList;
    
    // 事件
    event DistributionCreated(
        uint256 indexed distributionId, 
        bytes32 indexed propertyIdHash, 
        address indexed tokenAddress, 
        uint256 snapshotId, 
        uint256 amount, 
        DistributionType distType,
        uint256 platformFee,
        uint256 maintenanceFee,
        uint256 netAmount,
        address paymentToken
    );
    event DistributionStatusChanged(uint256 indexed distributionId, DistributionStatus status);
    event DistributionWithdrawn(uint256 indexed distributionId, address indexed account, uint256 amount, address paymentToken);
    event FeeRatesUpdated(uint256 platformFeeRate, uint256 maintenanceFeeRate);
    event FeeReceiverUpdated(address oldReceiver, address newReceiver);
    event EmergencyWithdrawalStatusChanged(bool enabled);
    event MinDistributionThresholdChanged(uint256 oldValue, uint256 newValue);
    event PaymentTokenAdded(address indexed tokenAddress);
    event PaymentTokenRemoved(address indexed tokenAddress);
    
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
        _nextDistributionId = 1;
        
        // 默认设置
        platformFeeRate = 500;     // 5%
        maintenanceFeeRate = 200;  // 2%
        feeReceiver = msg.sender;
        emergencyWithdrawalEnabled = false;
        minDistributionThreshold = 0.01 ether; // 最低分配触发阈值
        
        // 默认支持ETH作为支付方式
        supportedPaymentTokens[address(0)] = true;
        
        version = 1;
    }
    
    /**
     * @dev 添加支持的支付代币
     */
    function addSupportedPaymentToken(address _tokenAddress) external onlyAdmin {
        require(_tokenAddress != address(0), "Invalid token address");
        require(IERC20(_tokenAddress).totalSupply() > 0, "Not a valid ERC20 token");
        
        if (!supportedPaymentTokens[_tokenAddress]) {
            supportedPaymentTokens[_tokenAddress] = true;
            paymentTokensList.push(_tokenAddress);
            emit PaymentTokenAdded(_tokenAddress);
        }
    }
    
    /**
     * @dev 移除支持的支付代币
     */
    function removeSupportedPaymentToken(address _tokenAddress) external onlyAdmin {
        require(_tokenAddress != address(0), "Cannot remove ETH support");
        supportedPaymentTokens[_tokenAddress] = false;
        emit PaymentTokenRemoved(_tokenAddress);
    }
    
    /**
     * @dev 获取所有支持的支付代币列表
     */
    function getSupportedPaymentTokens() external view returns (address[] memory) {
        return paymentTokensList;
    }
    
    /**
     * @dev 设置费率
     */
    function setFeeRates(uint256 _platformFeeRate, uint256 _maintenanceFeeRate) external onlyAdmin {
        require(_platformFeeRate <= 2000, "Platform fee too high"); // 最高20%
        require(_maintenanceFeeRate <= 2000, "Maintenance fee too high"); // 最高20%
        
        platformFeeRate = _platformFeeRate;
        maintenanceFeeRate = _maintenanceFeeRate;
        
        emit FeeRatesUpdated(_platformFeeRate, _maintenanceFeeRate);
    }
    
    /**
     * @dev 设置费用接收地址
     */
    function setFeeReceiver(address _feeReceiver) external onlyAdmin {
        require(_feeReceiver != address(0), "Zero address");
        address oldReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver);
    }
    
    /**
     * @dev 设置紧急提款状态
     */
    function setEmergencyWithdrawalStatus(bool _enabled) external onlyAdmin {
        emergencyWithdrawalEnabled = _enabled;
        emit EmergencyWithdrawalStatusChanged(_enabled);
    }
    
    /**
     * @dev 设置最低分配触发阈值
     */
    function setMinDistributionThreshold(uint256 _threshold) external onlyAdmin {
        uint256 oldValue = minDistributionThreshold;
        minDistributionThreshold = _threshold;
        emit MinDistributionThresholdChanged(oldValue, _threshold);
    }
    
    /**
     * @dev 计算费用
     */
    function calculateFees(uint256 _amount, bool _applyFees) internal view returns (
        uint256 platformFee,
        uint256 maintenanceFee,
        uint256 netAmount
    ) {
        if (_applyFees) {
            platformFee = _amount.mul(platformFeeRate).div(10000);
            maintenanceFee = _amount.mul(maintenanceFeeRate).div(10000);
            netAmount = _amount.sub(platformFee).sub(maintenanceFee);
        } else {
            platformFee = 0;
            maintenanceFee = 0;
            netAmount = _amount;
        }
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
     * @dev 创建新分配 - 支持ETH或ERC20代币支付
     * @param _propertyIdHash 房产ID哈希
     * @param _tokenAddress 代币地址
     * @param _amount 分配金额
     * @param _distType 分配类型
     * @param _description 描述
     * @param _applyFees 是否应用费用（租金通常需要，奖励通常不需要）
     * @param _paymentToken 支付代币地址，address(0)表示ETH
     */
    function createDistribution(
        bytes32 _propertyIdHash,
        address _tokenAddress,
        uint256 _amount,
        DistributionType _distType,
        string calldata _description,
        bool _applyFees,
        address _paymentToken
    ) external payable whenNotPaused nonReentrant onlyManager returns (uint256) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_amount >= minDistributionThreshold, "Below minimum threshold");
        require(supportedPaymentTokens[_paymentToken], "Payment token not supported");
        
        // 获取快照
        PropertyToken token = PropertyToken(_tokenAddress);
        require(token.propertyIdHash() == _propertyIdHash, "Token does not match property");
        
        uint256 snapshotId = token.snapshot();
        require(!_snapshotUsed[_tokenAddress][snapshotId], "Snapshot already used");
        
        _snapshotUsed[_tokenAddress][snapshotId] = true;
        
        // 计算费用
        (uint256 platformFee, uint256 maintenanceFee, uint256 netAmount) = calculateFees(_amount, _applyFees);
        
        // 处理支付
        if (_paymentToken == address(0)) {
            // ETH支付
            require(msg.value >= _amount, "Insufficient ETH");
            
            // 如果有费用，则转给费用接收者
            if (_applyFees && (platformFee > 0 || maintenanceFee > 0)) {
                payable(feeReceiver).transfer(platformFee.add(maintenanceFee));
            }
            
            // 如果发送额外的ETH，退还
            uint256 excess = msg.value - _amount;
            if (excess > 0) {
                payable(msg.sender).transfer(excess);
            }
        } else {
            // ERC20代币支付
            require(msg.value == 0, "ETH not needed for token payment");
            IERC20 paymentToken = IERC20(_paymentToken);
            
            // 转移代币到合约
            require(paymentToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
            
            // 如果有费用，则转给费用接收者
            if (_applyFees && (platformFee > 0 || maintenanceFee > 0)) {
                require(paymentToken.transfer(feeReceiver, platformFee.add(maintenanceFee)), "Fee transfer failed");
            }
        }
        
        // 创建分配记录
        uint256 distributionId = _nextDistributionId++;
        
        Distribution storage distribution = _distributions[distributionId];
        distribution.id = distributionId;
        distribution.propertyIdHash = _propertyIdHash;
        distribution.tokenAddress = _tokenAddress;
        distribution.snapshotId = snapshotId;
        distribution.amount = _amount;
        distribution.platformFee = platformFee;
        distribution.maintenanceFee = maintenanceFee;
        distribution.netAmount = netAmount;
        distribution.createdAt = block.timestamp;
        distribution.status = DistributionStatus.Created;
        distribution.distType = _distType;
        distribution.description = _description;
        distribution.paymentToken = _paymentToken;
        
        // 更新索引
        _propertyDistributions[_propertyIdHash].push(distributionId);
        _distributionsByType[_distType].push(distributionId);
        _tokenDistributions[_tokenAddress].push(distributionId);
        
        emit DistributionCreated(
            distributionId, 
            _propertyIdHash, 
            _tokenAddress, 
            snapshotId, 
            _amount, 
            _distType, 
            platformFee, 
            maintenanceFee, 
            netAmount,
            _paymentToken
        );
        
        return distributionId;
    }
    
    /**
     * @dev 完成分配 - 使其可供提取
     */
    function completeDistribution(uint256 _distributionId) external onlyOperator whenNotPaused {
        Distribution storage distribution = _distributions[_distributionId];
        require(distribution.id == _distributionId, "Distribution does not exist");
        require(
            distribution.status == DistributionStatus.Created || 
            distribution.status == DistributionStatus.Processing, 
            "Invalid distribution status"
        );
        
        distribution.status = DistributionStatus.Completed;
        distribution.completedAt = block.timestamp;
        
        emit DistributionStatusChanged(_distributionId, DistributionStatus.Completed);
    }
    
    /**
     * @dev 取消分配
     */
    function cancelDistribution(uint256 _distributionId) external onlyManager whenNotPaused nonReentrant {
        Distribution storage distribution = _distributions[_distributionId];
        require(distribution.id == _distributionId, "Distribution does not exist");
        require(
            distribution.status == DistributionStatus.Created || 
            distribution.status == DistributionStatus.Processing, 
            "Invalid distribution status"
        );
        
        // 计算未提取的金额
        uint256 remainingAmount = distribution.netAmount - _totalWithdrawn[_distributionId];
        
        // 将未提取的金额退还给管理员
        if (remainingAmount > 0) {
            if (distribution.paymentToken == address(0)) {
                // ETH退还
                payable(msg.sender).transfer(remainingAmount);
            } else {
                // 代币退还
                IERC20(distribution.paymentToken).transfer(msg.sender, remainingAmount);
            }
        }
        
        distribution.status = DistributionStatus.Cancelled;
        
        emit DistributionStatusChanged(_distributionId, DistributionStatus.Cancelled);
    }
    
    /**
     * @dev 提取分配
     */
    function withdrawDistribution(uint256 _distributionId) external whenNotPaused nonReentrant {
        Distribution storage distribution = _distributions[_distributionId];
        require(distribution.id == _distributionId, "Distribution does not exist");
        require(
            distribution.status == DistributionStatus.Completed || 
            (emergencyWithdrawalEnabled && distribution.status == DistributionStatus.Processing), 
            "Distribution not available for withdrawal"
        );
        require(!_withdrawals[_distributionId][msg.sender], "Already withdrawn");
        
        PropertyToken token = PropertyToken(distribution.tokenAddress);
        uint256 balance = token.balanceOfAt(msg.sender, distribution.snapshotId);
        require(balance > 0, "No tokens at snapshot");
        
        uint256 totalSupply = token.totalSupplyAt(distribution.snapshotId);
        uint256 share = distribution.netAmount.mul(balance).div(totalSupply);
        require(share > 0, "Share too small");
        
        // 记录提取状态
        _withdrawals[_distributionId][msg.sender] = true;
        _totalWithdrawn[_distributionId] = _totalWithdrawn[_distributionId].add(share);
        
        // 根据支付代币类型执行转账
        if (distribution.paymentToken == address(0)) {
            // ETH支付
            payable(msg.sender).transfer(share);
        } else {
            // 代币支付
            IERC20(distribution.paymentToken).transfer(msg.sender, share);
        }
        
        emit DistributionWithdrawn(_distributionId, msg.sender, share, distribution.paymentToken);
    }
    
    /**
     * @dev 检查用户是否已提取分配
     */
    function hasWithdrawn(uint256 _distributionId, address _account) external view returns (bool) {
        return _withdrawals[_distributionId][_account];
    }
    
    /**
     * @dev 获取分配详情
     */
    function getDistribution(uint256 _distributionId) 
        external 
        view 
        returns (
            uint256 id,
            bytes32 propertyIdHash,
            address tokenAddress,
            uint256 snapshotId,
            uint256 amount,
            uint256 platformFee,
            uint256 maintenanceFee,
            uint256 netAmount,
            uint256 createdAt,
            uint256 completedAt,
            DistributionStatus status,
            DistributionType distType,
            string memory description,
            address paymentToken,
            uint256 totalWithdrawn
        ) 
    {
        Distribution storage distribution = _distributions[_distributionId];
        return (
            distribution.id,
            distribution.propertyIdHash,
            distribution.tokenAddress,
            distribution.snapshotId,
            distribution.amount,
            distribution.platformFee,
            distribution.maintenanceFee,
            distribution.netAmount,
            distribution.createdAt,
            distribution.completedAt,
            distribution.status,
            distribution.distType,
            distribution.description,
            distribution.paymentToken,
            _totalWithdrawn[_distributionId]
        );
    }
    
    /**
     * @dev 获取用户可提取的分配数量
     */
    function getAvailableDistributionAmount(uint256 _distributionId, address _account) 
        external 
        view 
        returns (uint256 available, bool canWithdraw, address paymentToken) 
    {
        Distribution storage distribution = _distributions[_distributionId];
        if (distribution.id != _distributionId) return (0, false, address(0));
        
        bool isCompleted = distribution.status == DistributionStatus.Completed;
        bool isEmergencyWithdrawal = emergencyWithdrawalEnabled && distribution.status == DistributionStatus.Processing;
        
        if (!isCompleted && !isEmergencyWithdrawal) return (0, false, distribution.paymentToken);
        if (_withdrawals[_distributionId][_account]) return (0, false, distribution.paymentToken);
        
        PropertyToken token = PropertyToken(distribution.tokenAddress);
        uint256 balance = token.balanceOfAt(_account, distribution.snapshotId);
        
        if (balance == 0) return (0, false, distribution.paymentToken);
        
        uint256 totalSupply = token.totalSupplyAt(distribution.snapshotId);
        uint256 share = distribution.netAmount.mul(balance).div(totalSupply);
        
        return (share, share > 0, distribution.paymentToken);
    }
    
    /**
     * @dev 获取房产的所有分配
     */
    function getPropertyDistributions(bytes32 _propertyIdHash) external view returns (uint256[] memory) {
        return _propertyDistributions[_propertyIdHash];
    }
    
    /**
     * @dev 获取特定类型的所有分配
     */
    function getDistributionsByType(DistributionType _distType) external view returns (uint256[] memory) {
        return _distributionsByType[_distType];
    }
    
    /**
     * @dev 获取代币的所有分配
     */
    function getTokenDistributions(address _tokenAddress) external view returns (uint256[] memory) {
        return _tokenDistributions[_tokenAddress];
    }
    
    /**
     * @dev 获取分配总数
     */
    function getDistributionsCount() external view returns (uint256) {
        return _nextDistributionId - 1;
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
     * @dev 紧急代币提款 - 允许管理员在紧急情况下提取合约中的ERC20代币
     */
    function emergencyTokenWithdraw(address _token, uint256 _amount) external onlyAdmin {
        require(_token != address(0), "Cannot withdraw ETH with this function");
        IERC20(_token).transfer(msg.sender, _amount);
    }
    
    /**
     * @dev 接收以太币
     */
    receive() external payable {}
} 