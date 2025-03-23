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

    // 租金分配信息
    struct RentDistribution {
        string propertyId;
        address tokenAddress;
        address stablecoinAddress;  // 稳定币地址
        uint256 totalAmount;
        uint256 distributionTime;
        uint256 platformFee;
        uint256 maintenanceFee;
        uint256 netAmount;
        bool isProcessed;
    }
    
    // 添加分配ID计数器
    uint256 public distributionCount;
    
     // 分配映射：分配ID => 分配信息
    mapping(uint256 => RentDistribution) public rentDistributions;
    
    // 添加支持的稳定币映射
    mapping(address => bool) public supportedStablecoins;
    
    // 事件
    event RentReceived(uint256 distributionId, string propertyId, address stablecoin, uint256 amount);
    event RentProcessed(uint256 distributionId, uint256 platformFee, uint256 maintenanceFee, uint256 netAmount);
    event RentClaimed(uint256 distributionId, address user, uint256 amount);
    event StablecoinStatusUpdated(address indexed token, bool status);

    // 分配快照ID映射
    mapping(uint256 => uint256) public distributionSnapshots;

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

    
    
    // 已领取映射：分配ID => 用户地址 => 是否已领取
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    
    // 添加管理稳定币的函数
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
     */
    function receiveStablecoinRent(
        string memory propertyId, 
        address tokenAddress, 
        address stablecoinAddress, 
        uint256 amount
    ) external onlyPropertyManager {
        require(supportedStablecoins[stablecoinAddress], "Unsupported stablecoin");
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20 stablecoin = IERC20(stablecoinAddress);
        require(stablecoin.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        distributionCount++;
        rentDistributions[distributionCount] = RentDistribution({
            propertyId: propertyId,
            tokenAddress: tokenAddress,
            stablecoinAddress: stablecoinAddress,
            totalAmount: amount,
            distributionTime: block.timestamp,
            platformFee: 0,
            maintenanceFee: 0,
            netAmount: 0,
            isProcessed: false
        });
        
        emit RentReceived(distributionCount, propertyId, stablecoinAddress, amount);
    }

    /**
     * @dev 处理租金分配
     * @param distributionId 分配ID
     */
    function processRentDistribution(uint256 distributionId) external onlyPropertyManager {
        RentDistribution storage distribution = rentDistributions[distributionId];
        require(!distribution.isProcessed, "Already processed");
        
        // 计算平台费用
        uint256 platformFeeAmount = feeManager.calculateFee(distribution.totalAmount, feeManager.platformFee());
        
        // 计算维护费用 - 从FeeManager获取
        uint256 maintenanceFeeAmount = feeManager.calculateFee(distribution.totalAmount, feeManager.maintenanceFee());
        
        // 确保费用合理
        require(maintenanceFeeAmount + platformFeeAmount < distribution.totalAmount, "Fees too high");
        
        // 计算净额
        uint256 netAmount = distribution.totalAmount - platformFeeAmount - maintenanceFeeAmount;
        
        // 获取稳定币合约
        IERC20 stablecoin = IERC20(distribution.stablecoinAddress);
        
        // 支付平台费用
        require(stablecoin.transfer(feeManager.feeCollector(), platformFeeAmount), "Platform fee transfer failed");
        
        // 创建快照并记录快照ID
        RealEstateToken token = RealEstateToken(distribution.tokenAddress);
        uint256 snapshotId = token.snapshot();
        distributionSnapshots[distributionId] = snapshotId;
        
        // 更新分配信息
        distribution.platformFee = platformFeeAmount;
        distribution.maintenanceFee = maintenanceFeeAmount;
        distribution.netAmount = netAmount;
        distribution.isProcessed = true;
        
        emit RentProcessed(distributionId, platformFeeAmount, maintenanceFeeAmount, netAmount);
    }

    /**
     * @dev 领取租金
     * @param distributionId 分配ID
     */
    function claimRent(uint256 distributionId) external nonReentrant {
        RentDistribution storage distribution = rentDistributions[distributionId];
        require(distribution.isProcessed, "Distribution not processed");
        require(!hasClaimed[distributionId][msg.sender], "Already claimed");
        
        uint256 snapshotId = distributionSnapshots[distributionId];
        require(snapshotId > 0, "No snapshot for this distribution");
        
        RealEstateToken token = RealEstateToken(distribution.tokenAddress);
        uint256 userBalance = token.balanceOfAt(msg.sender, snapshotId);
        require(userBalance > 0, "No tokens owned at distribution time");
        
        uint256 totalSupply = token.totalSupplyAt(snapshotId);
        uint256 userShare = (distribution.netAmount * userBalance) / totalSupply;
        require(userShare > 0, "Share too small");
        
        hasClaimed[distributionId][msg.sender] = true;
        
        // 转账稳定币给用户
        IERC20 stablecoin = IERC20(distribution.stablecoinAddress);
        require(stablecoin.transfer(msg.sender, userShare), "Rent transfer failed");
        
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
        
        uint256 snapshotId = distributionSnapshots[distributionId];
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
        return distributionSnapshots[distributionId];
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
     * @dev 获取分配信息
     * @param distributionId 分配ID
     * @return 房产ID, 代币地址, 稳定币地址, 总金额, 分配时间, 平台费用, 维护费用, 净额, 是否已处理
     */
    function getDistributionInfo(uint256 distributionId) external view returns (
        string memory, address, address, uint256, uint256, uint256, uint256, uint256, bool
    ) {
        RentDistribution storage dist = rentDistributions[distributionId];
        return (
            dist.propertyId,
            dist.tokenAddress,
            dist.stablecoinAddress,
            dist.totalAmount,
            dist.distributionTime,
            dist.platformFee,
            dist.maintenanceFee,
            dist.netAmount,
            dist.isProcessed
        );
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}