// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 修改导入
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./RoleManager.sol";

/**
 * @title FeeManager
 * @dev 管理系统中的各种费用
 */
contract FeeManager is 
    Initializable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuardUpgradeable
{
    RoleManager public roleManager;
    
    // 合约版本，用于追踪升级
    uint256 public version;

    // 费用类型枚举
    enum FeeType {
        TOKENIZATION,
        TRADING,
        REDEMPTION,
        MAINTENANCE,
        PLATFORM
    }

    // 费用类型
    uint256 public tokenizationFee;
    uint256 public tradingFee;
    uint256 public redemptionFee;
    uint256 public maintenanceFee;
    
    // 平台费用
    uint256 public platformFee;

    // 费用上限，确保不超过10%
    uint256 public constant MAX_FEE = 1000;   // 最大为10%
    
    address public feeCollector;              // 费用收集地址

    // 事件
    event FeeUpdated(FeeType indexed feeType, uint256 oldValue, uint256 newValue);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event FeeCollected(FeeType indexed feeType, uint256 amount, address from);
    event FeeWithdrawn(address to, uint256 amount);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    event FeeManagerInitialized(address deployer, address roleManager, uint256 version);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     * @param _roleManager 角色管理合约地址
     */
    function initialize(address _roleManager) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        roleManager = RoleManager(_roleManager);
        
        // 初始时将部署者设为费用收集者
        feeCollector = msg.sender;
        
        // 设置初始版本
        version = 1;
        
        // 设置默认费用
        tokenizationFee = 20; // 2%
        tradingFee = 10;      // 1%
        redemptionFee = 10;   // 1%
        maintenanceFee = 5;   // 0.5%
        platformFee = 50;     // 5%
        
        // 角色将由RoleManager单独授予
        emit FeeManagerInitialized(msg.sender, _roleManager, version);
    }

    /**
     * @dev 修饰器：只有超级管理员可以调用
     */
    modifier onlySuperAdmin() {
        require(roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), "Caller is not a super admin");
        _;
    }

    /**
     * @dev 修饰器：只有费用收集者可以调用
     */
    modifier onlyFeeCollector() {
        require(roleManager.hasRole(roleManager.FEE_COLLECTOR(), msg.sender) || 
                msg.sender == feeCollector, "Caller is not a fee collector");
        _;
    }

    /**
     * @dev 更新费用，使用枚举类型代替字符串比较
     * @param feeType 费用类型枚举
     * @param newValue 新费用值
     */
    function updateFee(FeeType feeType, uint256 newValue) external onlySuperAdmin {
        require(newValue <= MAX_FEE, "Fee too high"); // 最高不超过10%

        uint256 oldValue;
        
        if (feeType == FeeType.TOKENIZATION) {
            oldValue = tokenizationFee;
            tokenizationFee = newValue;
        } else if (feeType == FeeType.TRADING) {
            oldValue = tradingFee;
            tradingFee = newValue;
        } else if (feeType == FeeType.REDEMPTION) {
            oldValue = redemptionFee;
            redemptionFee = newValue;
        } else if (feeType == FeeType.MAINTENANCE) {
            oldValue = maintenanceFee;
            maintenanceFee = newValue;
        } else if (feeType == FeeType.PLATFORM) {
            oldValue = platformFee;
            platformFee = newValue;
        } else {
            revert("Invalid fee type");
        }

        emit FeeUpdated(feeType, oldValue, newValue);
    }

    /**
     * @dev 更新费用收集地址
     * @param _feeCollector 新的费用收集地址
     */
    function updateFeeCollector(address _feeCollector) external onlySuperAdmin {
        require(_feeCollector != address(0), "Invalid address");
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }

    /**
     * @dev 计算费用
     * @param amount 金额
     * @param feeType 费用类型枚举
     * @return 费用金额
     */
    function calculateFee(uint256 amount, FeeType feeType) external view returns (uint256) {
        if (feeType == FeeType.TOKENIZATION) {
            return (amount * tokenizationFee) / 10000;
        } else if (feeType == FeeType.TRADING) {
            return (amount * tradingFee) / 10000;
        } else if (feeType == FeeType.REDEMPTION) {
            return (amount * redemptionFee) / 10000;
        } else if (feeType == FeeType.MAINTENANCE) {
            return (amount * maintenanceFee) / 10000;
        } else if (feeType == FeeType.PLATFORM) {
            return (amount * platformFee) / 10000;
        } else {
            revert("Invalid fee type");
        }
    }

    /**
     * @dev 收集费用
     * @param amount 费用金额
     * @param feeType 费用类型枚举
     * @param from 费用来源
     */
    function collectFee(uint256 amount, FeeType feeType, address from) external payable {
        // 确保调用者是有权限的合约或超级管理员
        require(
            roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender) || 
            roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender),
            "Caller not authorized to collect fees"
        );
        
        emit FeeCollected(feeType, amount, from);
    }

    /**
     * @dev 提取账户余额
     * @param to 接收地址
     */
    function withdrawBalance(address payable to) external onlyFeeCollector nonReentrant {
        require(to != address(0), "Invalid withdrawal address");
        uint256 amount = address(this).balance;
        require(amount > 0, "No balance to withdraw");
        
        // 记录事件并清零余额，防止重入攻击
        emit FeeWithdrawn(to, amount);
        
        // 使用low-level call转账
        (bool success, ) = to.call{value: amount}("");
        require(success, "Withdrawal failed");
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
    
    /**
     * @dev 获取所有费用类型
     * @return 费用类型和值数组
     */
    function getAllFees() external view returns (uint256[] memory) {
        uint256[] memory fees = new uint256[](5);
        fees[0] = tokenizationFee;
        fees[1] = tradingFee;
        fees[2] = redemptionFee;
        fees[3] = maintenanceFee;
        fees[4] = platformFee;
        return fees;
    }
}