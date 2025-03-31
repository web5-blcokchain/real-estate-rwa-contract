// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";

/**
 * @title RewardManager
 * @dev 简化版奖励管理合约，整合租金分配和费用管理功能
 */
contract RewardManager is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    // 版本控制
    uint256 public version;
    
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
    
    // 租金分配信息
    struct RentDistribution {
        uint256 distributionId;
        string propertyId;
        address tokenAddress;
        address stablecoinAddress;
        string rentalPeriod;
        uint256 totalAmount;
        uint256 platformFeeAmount;
        uint256 maintenanceFeeAmount;
        uint256 netAmount;
        bool isProcessed;
        uint256 snapshotId;
        uint256 totalClaimed;
        uint256 distributionTime;
    }
    
    // 分配映射
    mapping(uint256 => RentDistribution) public rentDistributions;
    uint256 public distributionCount;
    
    // 领取记录
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    
    // 事件
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
     * @dev 初始化函数
     */
    function initialize(
        address _roleManager,
        address _propertyManager
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        
        // 设置默认费用
        platformFee = 500;     // 5%
        maintenanceFee = 200;  // 2%
        feeCollector = msg.sender;
        version = 1;
        
        emit RewardManagerInitialized(msg.sender, _roleManager, _propertyManager, version);
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Caller is not an admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender), "Caller is not a manager");
        _;
    }
    
    /**
     * @dev 修饰器：只有OPERATOR角色可以调用
     */
    modifier onlyOperator() {
        require(roleManager.hasRole(roleManager.OPERATOR_ROLE(), msg.sender), "Caller is not an operator");
        _;
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
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
} 