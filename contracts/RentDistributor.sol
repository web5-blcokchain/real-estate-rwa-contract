// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RoleManager.sol";
import "./RealEstateToken.sol";
import "./FeeManager.sol";

/**
 * @title RentDistributor
 * @dev 管理租金收集和分配（可升级版本）
 */
contract RentDistributor is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    RoleManager public roleManager;
    FeeManager public feeManager;
    
    // 合约版本，用于追踪升级
    uint256 public version;

    // 租金分配信息
    struct RentDistribution {
        string propertyId;
        address tokenAddress;
        address stablecoinAddress;
        string rentalPeriod;
        uint256 totalAmount;
        uint256 platformFee;
        uint256 maintenanceFee;
        uint256 netAmount;
        bool isProcessed;
        uint256 snapshotId;
        uint256 totalClaimed;
    }
    
    // 添加分配ID计数器
    uint256 public distributionCount;
    
    // 分配映射：分配ID => 分配信息
    mapping(uint256 => RentDistribution) public rentDistributions;
    
    // 添加支持的稳定币映射
    mapping(address => bool) public supportedStablecoins;
    
    // 事件
    event RentReceived(uint256 distributionId, string propertyId, address stablecoin, uint256 amount, string rentalPeriod);
    event RentProcessed(uint256 distributionId, uint256 platformFee, uint256 maintenanceFee, uint256 netAmount);
    event RentClaimed(uint256 distributionId, address user, uint256 amount);
    event StablecoinStatusUpdated(address indexed token, bool status);

    // 分配快照ID映射
    mapping(uint256 => uint256) public distributionSnapshots;

    // 已领取映射：分配ID => 用户地址 => 是否已领取
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize(address _roleManager, address _feeManager) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        feeManager = FeeManager(_feeManager);
        version = 1;
        
        emit RentDistributorInitialized(msg.sender, _roleManager, _feeManager, version);
    }

    // 初始化事件
    event RentDistributorInitialized(address deployer, address roleManager, address feeManager, uint256 version);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);

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
     * @dev 添加管理稳定币的函数
     */
    function addSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        supportedStablecoins[_stablecoin] = true;
        emit StablecoinStatusUpdated(_stablecoin, true);
    }

    function removeSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        supportedStablecoins[_stablecoin] = false;
        emit StablecoinStatusUpdated(_stablecoin, false);
    }

    /**
     * @dev 接收稳定币租金
     * @param propertyId 房产ID
     * @param tokenAddress 代币地址
     * @param stablecoinAddress 稳定币地址
     * @param amount 金额
     * @param rentalPeriod 租期标识（例如：2023Q1）
     */
    function receiveStablecoinRent(
        string memory propertyId, 
        address tokenAddress, 
        address stablecoinAddress, 
        uint256 amount,
        string memory rentalPeriod
    ) external onlyPropertyManager nonReentrant {
        require(bytes(propertyId).length > 0, "Property ID cannot be empty");
        require(tokenAddress != address(0), "Invalid token address");
        require(supportedStablecoins[stablecoinAddress], "Unsupported stablecoin");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(rentalPeriod).length > 0, "Rental period cannot be empty");
        
        // 验证代币合约
        RealEstateToken token = RealEstateToken(tokenAddress);
        require(token.totalSupply() > 0, "Invalid token contract");
        
        // 安全地转移稳定币
        IERC20 stablecoin = IERC20(stablecoinAddress);
        uint256 balanceBefore = stablecoin.balanceOf(address(this));
        require(stablecoin.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        uint256 balanceAfter = stablecoin.balanceOf(address(this));
        require(balanceAfter >= balanceBefore + amount, "Transfer amount mismatch");
        
        // 创建分配记录
        distributionCount++;
        rentDistributions[distributionCount] = RentDistribution({
            propertyId: propertyId,
            tokenAddress: tokenAddress,
            stablecoinAddress: stablecoinAddress,
            rentalPeriod: rentalPeriod,
            totalAmount: amount,
            platformFee: 0,
            maintenanceFee: 0,
            netAmount: 0,
            isProcessed: false,
            snapshotId: 0,
            totalClaimed: 0
        });
        
        emit RentReceived(distributionCount, propertyId, stablecoinAddress, amount, rentalPeriod);
    }

    /**
     * @dev 处理租金分配
     * @param distributionId 分配ID
     */
    function processRentDistribution(uint256 distributionId) external nonReentrant onlyPropertyManager() {
        RentDistribution storage distribution = rentDistributions[distributionId];
        require(!distribution.isProcessed, "Already processed");
        
        // 计算平台费用
        uint256 platformFeeAmount = calculatePlatformFee(distribution.totalAmount);
        
        // 计算维护费用
        uint256 maintenanceFeeAmount = calculateMaintenanceFee(distribution.totalAmount);
        
        // 确保费用合理
        require(maintenanceFeeAmount + platformFeeAmount < distribution.totalAmount, "Fees too high");
        
        // 计算净额
        uint256 netAmount = distribution.totalAmount - platformFeeAmount - maintenanceFeeAmount;
        
        // 获取稳定币合约
        IERC20 stablecoin = IERC20(distribution.stablecoinAddress);
        
        // 支付平台费用
        bool platformFeeSuccess = stablecoin.transfer(feeManager.feeCollector(), platformFeeAmount);
        require(platformFeeSuccess, "Platform fee transfer failed");
        
        // 创建快照并记录快照ID
        RealEstateToken token = RealEstateToken(distribution.tokenAddress);
        uint256 snapshotId = token.snapshot();
        
        // 更新分配信息 - 最后更新状态
        distribution.platformFee = platformFeeAmount;
        distribution.maintenanceFee = maintenanceFeeAmount;
        distribution.netAmount = netAmount;
        distribution.snapshotId = snapshotId;
        distribution.isProcessed = true;
        
        emit RentProcessed(distributionId, platformFeeAmount, maintenanceFeeAmount, netAmount);
    }

    /**
     * @dev 计算平台费用
     * @param amount 总金额
     * @return 平台费用
     */
    function calculatePlatformFee(uint256 amount) internal view returns (uint256) {
        uint256 fee = feeManager.calculateFee(amount, FeeManager.FeeType.PLATFORM);
        // 确保费用不超过总金额的50%，这是一个合理的上限
        if (fee > amount / 2) {
            return amount / 2;
        }
        return fee;
    }
    
    /**
     * @dev 计算维护费用
     * @param amount 总金额
     * @return 维护费用
     */
    function calculateMaintenanceFee(uint256 amount) internal view returns (uint256) {
        uint256 fee = feeManager.calculateFee(amount, FeeManager.FeeType.MAINTENANCE);
        // 确保费用不超过总金额的30%，这是一个合理的上限
        if (fee > amount * 3 / 10) {
            return amount * 3 / 10;
        }
        return fee;
    }

    /**
     * @dev 领取租金
     * @param distributionId 分配ID
     */
    function claimRent(uint256 distributionId) external nonReentrant {
        require(distributionId > 0 && distributionId <= distributionCount, "Invalid distribution ID");
        RentDistribution storage distribution = rentDistributions[distributionId];
        require(distribution.isProcessed, "Distribution not processed");
        
        // 检查该用户是否已经领取
        require(!hasClaimed[distributionId][msg.sender], "Already claimed");
        
        // 获取快照ID
        uint256 snapshotId = distribution.snapshotId;
        require(snapshotId > 0, "Invalid snapshot ID");
        
        // 获取用户在快照时的余额
        RealEstateToken token = RealEstateToken(distribution.tokenAddress);
        uint256 userBalance = token.balanceOfAt(msg.sender, snapshotId);
        require(userBalance > 0, "No balance at snapshot");
        
        // 计算用户份额
        uint256 totalSupply = token.totalSupplyAt(snapshotId);
        require(totalSupply > 0, "Invalid total supply");
        
        // 安全计算份额
        uint256 userShare;
        if (userBalance == totalSupply) {
            // 如果用户拥有全部代币，直接给予全部净额减去已领取的部分
            userShare = distribution.netAmount - distribution.totalClaimed;
        } else {
            // 常规计算：按比例分配
            userShare = (distribution.netAmount * userBalance) / totalSupply;
        }
        require(userShare > 0, "Share too small");
        
        // 确保剩余可分配金额足够
        uint256 remainingAmount = distribution.netAmount - distribution.totalClaimed;
        require(remainingAmount >= userShare, "Not enough remaining funds");
        
        // 标记为已领取并更新总领取量
        hasClaimed[distributionId][msg.sender] = true;
        distribution.totalClaimed += userShare;
        
        // 转账
        IERC20 stablecoin = IERC20(distribution.stablecoinAddress);
        bool transferSuccess = stablecoin.transfer(msg.sender, userShare);
        require(transferSuccess, "Rent transfer failed");
        
        emit RentClaimed(distributionId, msg.sender, userShare);
    }

    /**
     * @dev 获取用户可领取的租金
     * @param distributionId 分配ID
     * @param user 用户地址
     * @return 可领取金额
     */
    function getClaimableRent(uint256 distributionId, address user) external view returns (uint256) {
        RentDistribution storage distribution = rentDistributions[distributionId];
        if (!distribution.isProcessed || hasClaimed[distributionId][user]) {
            return 0;
        }
        
        uint256 snapshotId = distribution.snapshotId;
        if (snapshotId == 0) {
            return 0;
        }
        
        RealEstateToken token = RealEstateToken(distribution.tokenAddress);
        uint256 userBalance = token.balanceOfAt(user, snapshotId);
        if (userBalance == 0) {
            return 0;
        }
        
        uint256 totalSupply = token.totalSupplyAt(snapshotId);
        return (distribution.netAmount * userBalance) / totalSupply;
    }

    /**
     * @dev 获取分配的快照ID
     * @param distributionId 分配ID
     * @return 快照ID
     */
    function getDistributionSnapshotId(uint256 distributionId) external view returns (uint256) {
        return rentDistributions[distributionId].snapshotId;
    }

    /**
     * @dev 提取维护费用
     * @param distributionId 分配ID
     */
    function withdrawMaintenanceFee(uint256 distributionId) external onlyPropertyManager nonReentrant {
        RentDistribution storage distribution = rentDistributions[distributionId];
        require(distribution.isProcessed, "Distribution not processed");
        require(distribution.maintenanceFee > 0, "No maintenance fee");
        
        uint256 amount = distribution.maintenanceFee;
        distribution.maintenanceFee = 0;
        
        // 转账稳定币给房产管理员
        IERC20 stablecoin = IERC20(distribution.stablecoinAddress);
        require(stablecoin.transfer(msg.sender, amount), "Maintenance fee transfer failed");
    }

    /**
     * @dev 获取分发详情
     * @param distributionId 分发ID
     * @return propertyId 房产ID
     * @return tokenAddress 代币地址
     * @return stablecoinAddress 稳定币地址
     * @return totalAmount 总金额
     * @return distributionTime 分配时间
     * @return platformFee 平台费用
     * @return maintenanceFee 维护费用
     * @return netAmount 净额
     * @return isProcessed 是否已处理
     */
    function getDistributionDetails(uint256 distributionId) external view returns (
        string memory propertyId,
        address tokenAddress,
        address stablecoinAddress,
        uint256 totalAmount,
        uint256 distributionTime,
        uint256 platformFee,
        uint256 maintenanceFee,
        uint256 netAmount,
        bool isProcessed
    ) {
        RentDistribution storage dist = rentDistributions[distributionId];
        
        return (
            dist.propertyId,
            dist.tokenAddress,
            dist.stablecoinAddress,
            dist.totalAmount,
            bytes(dist.rentalPeriod).length > 0 ? block.timestamp : 0,
            dist.platformFee,
            dist.maintenanceFee,
            dist.netAmount,
            dist.isProcessed
        );
    }

    /**
     * @dev 清算未领取的租金
     * @param distributionId 分配ID
     * @param recipient 接收者地址
     * @notice 只有在分配完成后一定时间（例如6个月）后才能调用
     */
    function liquidateUnclaimedRent(uint256 distributionId, address recipient) external onlySuperAdmin nonReentrant {
        RentDistribution storage distribution = rentDistributions[distributionId];
        require(distribution.isProcessed, "Distribution not processed");
        
        // 检查分配是否已经超过6个月
        require(block.timestamp >= distribution.snapshotId + 180 days, "Liquidation period not reached");
        
        // 计算未领取的金额
        uint256 unclaimedAmount = distribution.netAmount - distribution.totalClaimed;
        require(unclaimedAmount > 0, "No unclaimed rent");
        
        // 重置未领取金额，防止重入
        distribution.netAmount = distribution.totalClaimed;
        
        // 转账未领取的租金
        IERC20 stablecoin = IERC20(distribution.stablecoinAddress);
        require(stablecoin.transfer(recipient, unclaimedAmount), "Transfer failed");
        
        emit UnclaimedRentLiquidated(distributionId, recipient, unclaimedAmount);
    }
    
    // 添加新事件
    event UnclaimedRentLiquidated(uint256 indexed distributionId, address indexed recipient, uint256 amount);

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {
        // 更新版本号
        uint256 oldVersion = version;
        version += 1;
        emit VersionUpdated(oldVersion, version);
    }
}