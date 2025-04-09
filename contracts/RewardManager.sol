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
 * @dev 统一的奖励和租金分配管理合约
 */
contract RewardManager is 
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable {
    
    using SafeMath for uint256;
    
    // Version control - using uint8 to save gas
    uint8 private constant VERSION = 1;
    
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
    
    // 系统合约引用
    RealEstateSystem public system;
    
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
    event PlatformFeeRateUpdated(uint256 oldRate, uint256 newRate);
    event MaintenanceFeeRateUpdated(uint256 oldRate, uint256 newRate);
    event FeesDistributed(address indexed token, uint256 amount, uint256 platformFee, uint256 maintenanceFee);
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(system.checkRole(RoleConstants.ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有OPERATOR角色可以调用
     */
    modifier onlyOperator() {
        require(system.checkRole(RoleConstants.OPERATOR_ROLE, msg.sender), "Not operator");
        _;
    }
    
    /**
     * @dev 修饰器：只有UPGRADER角色可以调用
     */
    modifier onlyUpgrader() {
        require(system.checkRole(RoleConstants.UPGRADER_ROLE, msg.sender), "Not upgrader");
        _;
    }
    
    /**
     * @dev 修饰器：检查系统是否处于紧急模式
     */
    modifier checkEmergencyMode() {
        require(!system.emergencyMode(), "Emergency mode active");
        _;
    }
    
    /**
     * @dev 修饰器：只有PAUSER角色可以调用
     */
    modifier onlyPauser() {
        require(system.checkRole(RoleConstants.PAUSER_ROLE, msg.sender), "Not pauser");
        _;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(
        uint256 _platformFeeRate,
        uint256 _maintenanceFeeRate,
        address _feeReceiver,
        uint256 _minDistributionThreshold,
        address _systemAddress
    ) public initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        require(_systemAddress != address(0), "System address cannot be zero");
        system = RealEstateSystem(_systemAddress);
        
        _nextDistributionId = 1;
        
        platformFeeRate = _platformFeeRate;
        maintenanceFeeRate = _maintenanceFeeRate;
        feeReceiver = _feeReceiver;
        minDistributionThreshold = _minDistributionThreshold;
        
        // 默认设置
        emergencyWithdrawalEnabled = false;
        
        // 默认支持ETH作为支付方式
        supportedPaymentTokens[address(0)] = true;
    }
    
    /**
     * @dev 添加支持的支付代币
     */
    function addSupportedPaymentToken(address _tokenAddress) external onlyAdmin {
        require(_tokenAddress != address(0), "Invalid token address");
        require(IERC20Upgradeable(_tokenAddress).totalSupply() > 0, "Not a valid ERC20 token");
        
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
     * @dev 设置平台费率
     */
    function setPlatformFeeRate(uint256 _rate) external onlyAdmin {
        require(_rate <= 5000, "Rate can't exceed 50%"); // 最大50%
        uint256 oldRate = platformFeeRate;
        platformFeeRate = _rate;
        emit PlatformFeeRateUpdated(oldRate, _rate);
    }
    
    /**
     * @dev 设置维护费率
     */
    function setMaintenanceFeeRate(uint256 _rate) external onlyAdmin {
        require(_rate <= 5000, "Rate can't exceed 50%"); // 最大50%
        uint256 oldRate = maintenanceFeeRate;
        maintenanceFeeRate = _rate;
        emit MaintenanceFeeRateUpdated(oldRate, _rate);
    }
    
    /**
     * @dev 设置费用接收地址
     */
    function setFeeReceiver(address _receiver) external onlyAdmin {
        require(_receiver != address(0), "Fee receiver is zero address");
        address oldReceiver = feeReceiver;
        feeReceiver = _receiver;
        emit FeeReceiverUpdated(oldReceiver, _receiver);
    }
    
    /**
     * @dev 设置紧急提款状态
     */
    function setEmergencyWithdrawalStatus(bool _enabled) external onlyAdmin {
        emergencyWithdrawalEnabled = _enabled;
        emit EmergencyWithdrawalStatusChanged(_enabled);
    }
    
    /**
     * @dev 设置最低分配阈值
     */
    function setMinDistributionThreshold(uint256 _threshold) external onlyAdmin {
        uint256 oldValue = minDistributionThreshold;
        minDistributionThreshold = _threshold;
        emit MinDistributionThresholdChanged(oldValue, _threshold);
    }
    
    /**
     * @dev 创建新的分配
     */
    function createDistribution(
        bytes32 _propertyIdHash,
        address _tokenAddress,
        uint256 _snapshotId,
        uint256 _amount,
        string memory _description,
        DistributionType _distType,
        address _paymentToken
    ) 
        external 
        payable
        onlyOperator
        whenNotPaused
        nonReentrant
        returns (uint256) 
    {
        // 验证参数
        require(_tokenAddress != address(0), "Invalid token address");
        require(_snapshotId > 0, "Invalid snapshot ID");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount >= minDistributionThreshold, "Amount below threshold");
        require(supportedPaymentTokens[_paymentToken], "Unsupported payment token");
        require(!_snapshotUsed[_tokenAddress][_snapshotId], "Snapshot already used");
        
        // 验证支付
        if (_paymentToken == address(0)) {
            // ETH支付
            require(msg.value >= _amount, "Insufficient ETH sent");
        } else {
            // ERC20支付，需要先授权
            IERC20Upgradeable token = IERC20Upgradeable(_paymentToken);
            uint256 allowance = token.allowance(msg.sender, address(this));
            require(allowance >= _amount, "Insufficient token allowance");
            
            // 转账到合约
            bool success = token.transferFrom(msg.sender, address(this), _amount);
            require(success, "Token transfer failed");
        }
        
        // 计算费用
        uint256 platformFee = _amount.mul(platformFeeRate).div(10000);
        uint256 maintenanceFee = _amount.mul(maintenanceFeeRate).div(10000);
        uint256 netAmount = _amount.sub(platformFee).sub(maintenanceFee);
        
        // 创建分配记录
        uint256 distributionId = _nextDistributionId++;
        _distributions[distributionId] = Distribution({
            id: distributionId,
            propertyIdHash: _propertyIdHash,
            tokenAddress: _tokenAddress,
            snapshotId: _snapshotId,
            amount: _amount,
            platformFee: platformFee,
            maintenanceFee: maintenanceFee,
            netAmount: netAmount,
            createdAt: block.timestamp,
            completedAt: 0,
            status: DistributionStatus.Created,
            distType: _distType,
            description: _description,
            paymentToken: _paymentToken
        });
        
        // 更新索引
        _propertyDistributions[_propertyIdHash].push(distributionId);
        _distributionsByType[_distType].push(distributionId);
        _tokenDistributions[_tokenAddress].push(distributionId);
        
        // 标记快照已使用
        _snapshotUsed[_tokenAddress][_snapshotId] = true;
        
        // 处理费用分配
        if (feeReceiver != address(0) && (platformFee > 0 || maintenanceFee > 0)) {
            if (_paymentToken == address(0)) {
                // ETH费用转账
                if (platformFee > 0) {
                    payable(feeReceiver).transfer(platformFee);
                }
                if (maintenanceFee > 0) {
                    payable(feeReceiver).transfer(maintenanceFee);
                }
            } else {
                // ERC20费用转账
                IERC20Upgradeable token = IERC20Upgradeable(_paymentToken);
                uint256 totalFee = platformFee.add(maintenanceFee);
                if (totalFee > 0) {
                    bool success = token.transfer(feeReceiver, totalFee);
                    require(success, "Fee transfer failed");
                }
            }
            
            emit FeesDistributed(_paymentToken, _amount, platformFee, maintenanceFee);
        }
        
        // 退回多余的ETH
        if (_paymentToken == address(0) && msg.value > _amount) {
            payable(msg.sender).transfer(msg.value - _amount);
        }
        
        // 触发事件
        emit DistributionCreated(
            distributionId, 
            _propertyIdHash, 
            _tokenAddress, 
            _snapshotId, 
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
     * @dev 更新分配状态
     */
    function updateDistributionStatus(uint256 _distributionId, DistributionStatus _status) 
        external 
        onlyOperator
        whenNotPaused
    {
        require(_distributionId < _nextDistributionId, "Distribution does not exist");
        Distribution storage dist = _distributions[_distributionId];
        
        require(dist.status != _status, "Status already set");
        require(_status != DistributionStatus.Created, "Cannot set to created status");
        
        if (_status == DistributionStatus.Completed) {
            require(dist.status == DistributionStatus.Processing, "Can only complete from processing");
            dist.completedAt = block.timestamp;
        } else if (_status == DistributionStatus.Cancelled) {
            require(dist.status != DistributionStatus.Completed, "Cannot cancel completed distribution");
        }
        
        dist.status = _status;
        emit DistributionStatusChanged(_distributionId, _status);
    }
    
    /**
     * @dev 用户提取分配金额
     */
    function withdraw(uint256 _distributionId) 
        external 
        nonReentrant 
        whenNotPaused
        returns (uint256)
    {
        require(_distributionId < _nextDistributionId, "Distribution does not exist");
        Distribution storage dist = _distributions[_distributionId];
        
        require(dist.status == DistributionStatus.Created || dist.status == DistributionStatus.Processing, 
                "Distribution not active");
        
        // 检查是否已提取
        require(!_withdrawals[_distributionId][msg.sender], "Already withdrawn");
        
        // 获取代币余额
        PropertyToken token = PropertyToken(dist.tokenAddress);
        uint256 balance = token.balanceOfAt(msg.sender, dist.snapshotId);
        require(balance > 0, "No token balance at snapshot");
        
        // 计算应得份额
        uint256 totalSupply = token.totalSupplyAt(dist.snapshotId);
        uint256 amount = dist.netAmount.mul(balance).div(totalSupply);
        require(amount > 0, "Amount too small");
        
        // 标记为已提取
        _withdrawals[_distributionId][msg.sender] = true;
        
        // 增加已提取金额
        _totalWithdrawn[_distributionId] = _totalWithdrawn[_distributionId].add(amount);
        
        // 转账给用户
        if (dist.paymentToken == address(0)) {
            // ETH转账
            payable(msg.sender).transfer(amount);
        } else {
            // ERC20转账
            IERC20Upgradeable paymentToken = IERC20Upgradeable(dist.paymentToken);
            bool success = paymentToken.transfer(msg.sender, amount);
            require(success, "Token transfer failed");
        }
        
        // 触发事件
        emit DistributionWithdrawn(_distributionId, msg.sender, amount, dist.paymentToken);
        
        return amount;
    }
    
    /**
     * @dev 紧急提款 (管理员功能)
     */
    function emergencyWithdraw(address _token, address payable _to, uint256 _amount) 
        external 
        onlyAdmin
        nonReentrant 
    {
        require(emergencyWithdrawalEnabled, "Emergency withdrawal not enabled");
        require(_to != address(0), "Cannot withdraw to zero address");
        
        if (_token == address(0)) {
            // ETH提款
            require(_amount <= address(this).balance, "Insufficient balance");
            _to.transfer(_amount);
        } else {
            // ERC20提款
            IERC20Upgradeable token = IERC20Upgradeable(_token);
            uint256 balance = token.balanceOf(address(this));
            require(_amount <= balance, "Insufficient token balance");
            bool success = token.transfer(_to, _amount);
            require(success, "Token transfer failed");
        }
    }
    
    /**
     * @dev 检查用户是否已提取特定分配
     */
    function hasWithdrawn(uint256 _distributionId, address _user) external view returns (bool) {
        return _withdrawals[_distributionId][_user];
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
        require(_distributionId < _nextDistributionId, "Distribution does not exist");
        Distribution storage dist = _distributions[_distributionId];
        
        return (
            dist.id,
            dist.propertyIdHash,
            dist.tokenAddress,
            dist.snapshotId,
            dist.amount,
            dist.platformFee,
            dist.maintenanceFee,
            dist.netAmount,
            dist.createdAt,
            dist.completedAt,
            dist.status,
            dist.distType,
            dist.description,
            dist.paymentToken,
            _totalWithdrawn[_distributionId]
        );
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
     * @dev 获取用户在特定分配中应得的金额
     */
    function calculateUserShare(uint256 _distributionId, address _user) 
        external 
        view 
        returns (uint256 share, bool withdrawn) 
    {
        require(_distributionId < _nextDistributionId, "Distribution does not exist");
        Distribution storage dist = _distributions[_distributionId];
        
        PropertyToken token = PropertyToken(dist.tokenAddress);
        uint256 balance = token.balanceOfAt(_user, dist.snapshotId);
        
        if (balance == 0) {
            return (0, false);
        }
        
        uint256 totalSupply = token.totalSupplyAt(dist.snapshotId);
        share = dist.netAmount.mul(balance).div(totalSupply);
        withdrawn = _withdrawals[_distributionId][_user];
        
        return (share, withdrawn);
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyPauser {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyPauser {
        _unpause();
    }
    
    /**
     * @dev 获取版本
     */
    function getVersion() external pure returns (uint8) {
        return VERSION;
    }
    
    /**
     * @dev 授权升级合约
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyUpgrader
    {
        require(!system.emergencyMode(), "Emergency mode active");
    }
    
    // 接收ETH
    receive() external payable {}
} 