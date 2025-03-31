// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";
import "./TradingManager.sol";
import "./RewardManager.sol";
import "./SimpleRealEstateSystem.sol";

/**
 * @title SimpleSystemDeployer
 * @dev 负责部署整个不动产系统及其组件的合约
 */
contract SimpleSystemDeployer {
    
    // 部署事件
    event SystemDeployed(
        address indexed system,
        address indexed roleManager,
        address indexed propertyManager,
        address tokenFactory,
        address tradingManager,
        address rewardManager,
        address deployer
    );
    
    // 初始化参数结构体 - 角色管理
    struct RoleInitParams {
        address[] adminAddresses;       // 管理员地址列表
        address[] managerAddresses;     // 经理地址列表
        address[] operatorAddresses;    // 操作员地址列表
    }
    
    // 初始化参数结构体 - 交易管理
    struct TradingInitParams {
        address tradingFeeReceiver;     // 交易费接收地址
        uint256 tradingFeeRate;         // 交易费率
        uint256 minTradeAmount;         // 最小交易金额
    }
    
    // 初始化参数结构体 - 奖励管理
    struct RewardInitParams {
        address rewardFeeReceiver;      // 奖励费接收地址
        uint256 platformFeeRate;        // 平台费率
        uint256 maintenanceFeeRate;     // 维护费率
        uint256 minDistributionThreshold; // 最小分配阈值
        address[] supportedPaymentTokens; // 支持的支付代币列表
    }
    
    // 初始化参数结构体 - 代币设置
    struct TokenInitParams {
        uint256 minTransferAmount;      // 最小转账金额
    }
    
    // 初始化参数结构体 - 系统设置
    struct SystemInitParams {
        bool startPaused;               // 系统启动时是否暂停
    }
    
    /**
     * @dev 部署整个系统及其组件
     * @param roleParams 角色初始化参数
     * @param tradingParams 交易初始化参数
     * @param rewardParams 奖励初始化参数
     * @param tokenParams 代币初始化参数
     * @param systemParams 系统初始化参数
     * @return systemAddress 部署的系统地址
     */
    function deploySystem(
        RoleInitParams calldata roleParams,
        TradingInitParams calldata tradingParams,
        RewardInitParams calldata rewardParams,
        TokenInitParams calldata tokenParams,
        SystemInitParams calldata systemParams
    ) external returns (address systemAddress) {
        
        // 1. 部署角色管理器
        SimpleRoleManager roleManager = new SimpleRoleManager();
        roleManager.initialize();
        
        // 2. 部署房产管理器
        PropertyManager propertyManager = new PropertyManager();
        propertyManager.initialize(address(roleManager));
        
        // 3. 部署代币工厂
        PropertyToken tokenFactory = new PropertyToken();
        tokenFactory.initialize(bytes32(0), "Token Factory", "TF", 0, msg.sender);
        
        // 4. 部署交易管理器
        TradingManager tradingManager = new TradingManager();
        tradingManager.initialize(address(roleManager));
        
        // 5. 部署奖励管理器
        RewardManager rewardManager = new RewardManager();
        rewardManager.initialize(address(roleManager));
        
        // 6. 部署主系统合约
        SimpleRealEstateSystem system = new SimpleRealEstateSystem();
        system.initialize(
            address(roleManager),
            address(propertyManager),
            address(tokenFactory),
            address(tradingManager),
            address(rewardManager)
        );
        
        // 7. 初始化角色管理
        // 批量添加管理员
        if (roleParams.adminAddresses.length > 0) {
            roleManager.batchGrantRole(roleManager.ADMIN_ROLE(), roleParams.adminAddresses);
        }
        
        // 批量添加经理
        if (roleParams.managerAddresses.length > 0) {
            roleManager.batchGrantRole(roleManager.MANAGER_ROLE(), roleParams.managerAddresses);
        }
        
        // 批量添加操作员
        if (roleParams.operatorAddresses.length > 0) {
            roleManager.batchGrantRole(roleManager.OPERATOR_ROLE(), roleParams.operatorAddresses);
        }
        
        // 8. 设置交易管理器参数
        if (tradingParams.tradingFeeRate > 0) {
            tradingManager.setFeeRate(tradingParams.tradingFeeRate);
        }
        
        if (tradingParams.tradingFeeReceiver != address(0)) {
            tradingManager.setFeeReceiver(tradingParams.tradingFeeReceiver);
        }
        
        if (tradingParams.minTradeAmount > 0) {
            tradingManager.setMinTradeAmount(tradingParams.minTradeAmount);
        }
        
        // 9. 设置奖励管理器参数
        if (rewardParams.platformFeeRate > 0 || rewardParams.maintenanceFeeRate > 0) {
            rewardManager.setFeeRates(rewardParams.platformFeeRate, rewardParams.maintenanceFeeRate);
        }
        
        if (rewardParams.rewardFeeReceiver != address(0)) {
            rewardManager.setFeeReceiver(rewardParams.rewardFeeReceiver);
        }
        
        if (rewardParams.minDistributionThreshold > 0) {
            rewardManager.setMinDistributionThreshold(rewardParams.minDistributionThreshold);
        }
        
        // 添加支持的支付代币
        for (uint256 i = 0; i < rewardParams.supportedPaymentTokens.length; i++) {
            if (rewardParams.supportedPaymentTokens[i] != address(0)) {
                rewardManager.addSupportedPaymentToken(rewardParams.supportedPaymentTokens[i]);
            }
        }
        
        // 10. 设置代币参数
        if (tokenParams.minTransferAmount > 0) {
            tokenFactory.setMinTransferAmount(tokenParams.minTransferAmount);
        }
        
        // 11. 设置系统状态
        if (systemParams.startPaused) {
            system.pause();
        }
        
        // 12. 发出部署事件
        emit SystemDeployed(
            address(system),
            address(roleManager),
            address(propertyManager),
            address(tokenFactory),
            address(tradingManager),
            address(rewardManager),
            msg.sender
        );
        
        return address(system);
    }
    
    /**
     * @dev 部署系统并将当前调用者设置为唯一管理员
     * @return systemAddress 部署的系统地址
     */
    function deploySingleAdminSystem() external returns (address systemAddress) {
        // 创建空的参数结构体
        RoleInitParams memory roleParams;
        TradingInitParams memory tradingParams;
        RewardInitParams memory rewardParams;
        TokenInitParams memory tokenParams;
        SystemInitParams memory systemParams;
        
        // 设置当前调用者为唯一管理员
        address[] memory admins = new address[](1);
        admins[0] = msg.sender;
        roleParams.adminAddresses = admins;
        
        // 设置默认交易和奖励参数
        tradingParams.tradingFeeRate = 100; // 1%
        tradingParams.tradingFeeReceiver = msg.sender;
        
        rewardParams.platformFeeRate = 500; // 5%
        rewardParams.maintenanceFeeRate = 200; // 2%
        rewardParams.rewardFeeReceiver = msg.sender;
        
        // 使用设置的参数部署系统
        return deploySystem(
            roleParams,
            tradingParams,
            rewardParams,
            tokenParams,
            systemParams
        );
    }
} 