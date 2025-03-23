// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 修改导入
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./RoleManager.sol";

/**
 * @title FeeManager
 * @dev 管理系统中的各种费用
 */
contract FeeManager is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    RoleManager public roleManager;

    // 费用类型
    uint256 public tokenizationFee = 100;     // 通证化费用，万分之一 (0.01%)
    uint256 public tradingFee = 100;          // 交易费用，万分之一 (0.01%)
    uint256 public redemptionFee = 100;       // 赎回费用，万分之一 (0.01%)
    uint256 public maintenanceFee = 100;      // 维护费用，万分之一 (0.01%)
    uint256 public platformFee = 100;         // 平台费用，万分之一 (0.01%)

    address public feeCollector;              // 费用收集地址

    // 事件
    event FeeUpdated(string feeType, uint256 oldValue, uint256 newValue);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event FeeCollected(string feeType, uint256 amount, address from);

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
        
        roleManager = RoleManager(_roleManager);
        feeCollector = msg.sender;
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
        require(roleManager.hasRole(roleManager.FEE_COLLECTOR(), msg.sender), "Caller is not a fee collector");
        _;
    }

    /**
     * @dev 更新费用
     * @param feeType 费用类型
     * @param newValue 新费用值
     */
    function updateFee(string memory feeType, uint256 newValue) external onlySuperAdmin {
        require(newValue <= 1000, "Fee too high"); // 最高不超过10%

        uint256 oldValue;
        if (keccak256(bytes(feeType)) == keccak256(bytes("tokenization"))) {
            oldValue = tokenizationFee;
            tokenizationFee = newValue;
        } else if (keccak256(bytes(feeType)) == keccak256(bytes("trading"))) {
            oldValue = tradingFee;
            tradingFee = newValue;
        } else if (keccak256(bytes(feeType)) == keccak256(bytes("redemption"))) {
            oldValue = redemptionFee;
            redemptionFee = newValue;
        } else if (keccak256(bytes(feeType)) == keccak256(bytes("maintenance"))) {
            oldValue = maintenanceFee;
            maintenanceFee = newValue;
        } else if (keccak256(bytes(feeType)) == keccak256(bytes("platform"))) {
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
     * @param feeRate 费率
     * @return 费用金额
     */
    function calculateFee(uint256 amount, uint256 feeRate) public pure returns (uint256) {
        return (amount * feeRate) / 10000;
    }

    /**
     * @dev 收集费用
     * @param feeType 费用类型
     * @param amount 金额
     * @param from 费用来源
     */
    function collectFee(string memory feeType, uint256 amount, address from) external payable {
        require(msg.value == amount, "Incorrect fee amount");
        
        payable(feeCollector).transfer(amount);
        emit FeeCollected(feeType, amount, from);
    }

    /**
     * @dev 提取合约中的ETH
     */
    function withdrawETH() external onlyFeeCollector {
        payable(feeCollector).transfer(address(this).balance);
    }

    /**
     * @dev 计算平台费用
     * @param amount 金额
     * @return 平台费用金额
     */
    function calculatePlatformFee(uint256 amount) public view returns (uint256) {
        return calculateFee(amount, platformFee);
    }
    
    /**
     * @dev 计算维护费用
     * @param amount 金额
     * @return 维护费用金额
     */
    function calculateMaintenanceFee(uint256 amount) public view returns (uint256) {
        return calculateFee(amount, maintenanceFee);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}