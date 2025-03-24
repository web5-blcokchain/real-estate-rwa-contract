// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./RoleManager.sol";
import "./FeeManager.sol";
import "./PropertyRegistry.sol";
import "./TokenFactory.sol";
import "./RedemptionManager.sol";
import "./RentDistributor.sol";
import "./Marketplace.sol";
import "./TokenHolderQuery.sol";
import "./RealEstateToken.sol";
import "./RealEstateSystem.sol";

/**
 * @title SystemDeployer
 * @dev 负责部署整个房产通证化系统的所有合约
 */
contract SystemDeployer {
    // 部署后的系统合约地址
    address public systemAddress;
    
    // 部署的合约地址
    address public roleManagerAddress;
    address public feeManagerAddress;
    address public propertyRegistryAddress;
    address public tokenFactoryAddress;
    address public redemptionManagerAddress;
    address public rentDistributorAddress;
    address public marketplaceAddress;
    address public tokenHolderQueryAddress;
    address public tokenImplementationAddress;
    
    // 部署进度
    uint8 public deploymentProgress;
    
    // 部署者地址
    address public deployer;
    
    // 事件
    event SystemDeployed(
        address systemAddress,
        address roleManagerAddress,
        address feeManagerAddress,
        address propertyRegistryAddress,
        address tokenFactoryAddress,
        address redemptionManagerAddress,
        address rentDistributorAddress,
        address marketplaceAddress,
        address tokenHolderQueryAddress
    );
    
    event DeploymentProgress(uint8 step, string contractName, address contractAddress);

    constructor() {
        deploymentProgress = 0;
        deployer = msg.sender;
    }

    /**
     * @dev 部署单个步骤
     * @param step 要部署的步骤编号
     */
    function deployStep(uint8 step) external {
        require(msg.sender == deployer, "Only deployer can call");
        require(step > deploymentProgress, "Step already deployed");
        require(step <= 11, "Invalid step number");
        
        // 确保步骤按顺序进行
        require(step == deploymentProgress + 1, "Steps must be sequential");
        
        if (step == 1) _deployStep1_RoleManager();
        else if (step == 2) _deployStep2_FeeManager();
        else if (step == 3) _deployStep3_PropertyRegistry();
        else if (step == 4) _deployStep4_RentDistributor();
        else if (step == 5) _deployStep5_TokenImplementation();
        else if (step == 6) _deployStep6_TokenFactory();
        else if (step == 7) _deployStep7_RedemptionManager();
        else if (step == 8) _deployStep8_Marketplace();
        else if (step == 9) _deployStep9_TokenHolderQuery();
        else if (step == 10) _deployStep10_RealEstateSystem();
        else if (step == 11) _deployStep11_GrantRoles();
        
        // 如果所有步骤都已部署，发出完成事件
        if (step == 11) {
            emit SystemDeployed(
                systemAddress,
                roleManagerAddress,
                feeManagerAddress,
                propertyRegistryAddress,
                tokenFactoryAddress,
                redemptionManagerAddress,
                rentDistributorAddress,
                marketplaceAddress,
                tokenHolderQueryAddress
            );
        }
    }
    
    /**
     * @dev 部署角色管理合约
     */
    function _deployStep1_RoleManager() private {
        RoleManager roleManagerImpl = new RoleManager();
        ERC1967Proxy roleManagerProxy = new ERC1967Proxy(
            address(roleManagerImpl),
            abi.encodeWithSelector(RoleManager(address(0)).initialize.selector)
        );
        roleManagerAddress = address(roleManagerProxy);
        
        deploymentProgress = 1;
        emit DeploymentProgress(deploymentProgress, "RoleManager", roleManagerAddress);
    }
    
    /**
     * @dev 部署费用管理合约
     */
    function _deployStep2_FeeManager() private {
        FeeManager feeManagerImpl = new FeeManager();
        ERC1967Proxy feeManagerProxy = new ERC1967Proxy(
            address(feeManagerImpl),
            abi.encodeWithSelector(FeeManager(address(0)).initialize.selector, roleManagerAddress)
        );
        feeManagerAddress = address(feeManagerProxy);
        
        deploymentProgress = 2;
        emit DeploymentProgress(deploymentProgress, "FeeManager", feeManagerAddress);
    }
    
    /**
     * @dev 部署房产注册合约
     */
    function _deployStep3_PropertyRegistry() private {
        PropertyRegistry propertyRegistryImpl = new PropertyRegistry();
        ERC1967Proxy propertyRegistryProxy = new ERC1967Proxy(
            address(propertyRegistryImpl),
            abi.encodeWithSelector(PropertyRegistry(address(0)).initialize.selector, roleManagerAddress)
        );
        propertyRegistryAddress = address(propertyRegistryProxy);
        
        deploymentProgress = 3;
        emit DeploymentProgress(deploymentProgress, "PropertyRegistry", propertyRegistryAddress);
    }
    
    /**
     * @dev 部署租金分配合约
     */
    function _deployStep4_RentDistributor() private {
        RentDistributor rentDistributorImpl = new RentDistributor();
        ERC1967Proxy rentDistributorProxy = new ERC1967Proxy(
            address(rentDistributorImpl),
            abi.encodeWithSelector(RentDistributor(address(0)).initialize.selector, roleManagerAddress, feeManagerAddress)
        );
        rentDistributorAddress = address(rentDistributorProxy);
        
        deploymentProgress = 4;
        emit DeploymentProgress(deploymentProgress, "RentDistributor", rentDistributorAddress);
    }
    
    /**
     * @dev 部署代币实现
     */
    function _deployStep5_TokenImplementation() private {
        RealEstateToken tokenImpl = new RealEstateToken();
        tokenImplementationAddress = address(tokenImpl);
        
        deploymentProgress = 5;
        emit DeploymentProgress(deploymentProgress, "TokenImplementation", tokenImplementationAddress);
    }
    
    /**
     * @dev 部署代币工厂合约
     */
    function _deployStep6_TokenFactory() private {
        TokenFactory tokenFactoryImpl = new TokenFactory();
        ERC1967Proxy tokenFactoryProxy = new ERC1967Proxy(
            address(tokenFactoryImpl),
            abi.encodeWithSelector(
                TokenFactory(address(0)).initialize.selector, 
                roleManagerAddress, 
                propertyRegistryAddress, 
                tokenImplementationAddress,
                rentDistributorAddress
            )
        );
        tokenFactoryAddress = address(tokenFactoryProxy);
        
        deploymentProgress = 6;
        emit DeploymentProgress(deploymentProgress, "TokenFactory", tokenFactoryAddress);
    }
    
    /**
     * @dev 部署赎回管理合约
     */
    function _deployStep7_RedemptionManager() private {
        RedemptionManager redemptionManagerImpl = new RedemptionManager();
        ERC1967Proxy redemptionManagerProxy = new ERC1967Proxy(
            address(redemptionManagerImpl),
            abi.encodeWithSelector(
                RedemptionManager(address(0)).initialize.selector,
                roleManagerAddress,
                feeManagerAddress
            )
        );
        redemptionManagerAddress = address(redemptionManagerProxy);
        
        deploymentProgress = 7;
        emit DeploymentProgress(deploymentProgress, "RedemptionManager", redemptionManagerAddress);
    }
    
    /**
     * @dev 部署市场合约
     */
    function _deployStep8_Marketplace() private {
        Marketplace marketplaceImpl = new Marketplace();
        ERC1967Proxy marketplaceProxy = new ERC1967Proxy(
            address(marketplaceImpl),
            abi.encodeWithSelector(
                Marketplace(address(0)).initialize.selector,
                roleManagerAddress,
                feeManagerAddress
            )
        );
        marketplaceAddress = address(marketplaceProxy);
        
        deploymentProgress = 8;
        emit DeploymentProgress(deploymentProgress, "Marketplace", marketplaceAddress);
    }
    
    /**
     * @dev 部署TokenHolderQuery合约
     */
    function _deployStep9_TokenHolderQuery() private {
        TokenHolderQuery tokenHolderQueryImpl = new TokenHolderQuery();
        ERC1967Proxy tokenHolderQueryProxy = new ERC1967Proxy(
            address(tokenHolderQueryImpl),
            abi.encodeWithSelector(
                TokenHolderQuery(address(0)).initialize.selector,
                roleManagerAddress
            )
        );
        tokenHolderQueryAddress = address(tokenHolderQueryProxy);
        
        deploymentProgress = 9;
        emit DeploymentProgress(deploymentProgress, "TokenHolderQuery", tokenHolderQueryAddress);
    }
    
    /**
     * @dev 部署RealEstateSystem合约
     */
    function _deployStep10_RealEstateSystem() private {
        RealEstateSystem systemImpl = new RealEstateSystem();
        ERC1967Proxy systemProxy = new ERC1967Proxy(
            address(systemImpl),
            abi.encodeWithSelector(
                RealEstateSystem(address(0)).initialize.selector,
                roleManagerAddress,
                feeManagerAddress,
                propertyRegistryAddress,
                tokenFactoryAddress,
                redemptionManagerAddress,
                rentDistributorAddress,
                marketplaceAddress,
                tokenHolderQueryAddress
            )
        );
        systemAddress = address(systemProxy);
        
        deploymentProgress = 10;
        emit DeploymentProgress(deploymentProgress, "RealEstateSystem", systemAddress);
    }
    
    /**
     * @dev 授予角色
     */
    function _deployStep11_GrantRoles() private {
        // 我们需要添加代码来手动设置超级管理员角色
        
        // 创建一个具有默认管理员角色的新的RoleManager (因为RoleManager是可升级的代理)
        RoleManager roleManagerImpl = new RoleManager();
        // 初始化一个新的实现以获取_setupRole方法
        roleManagerImpl.initialize();
        // 使用grantRole为部署者分配SUPER_ADMIN角色
        roleManagerImpl.grantRole(roleManagerImpl.SUPER_ADMIN(), deployer);
        
        // 用这个实现更新代理
        RoleManager(roleManagerAddress).upgradeTo(address(roleManagerImpl));
        
        deploymentProgress = 11;
        emit DeploymentProgress(deploymentProgress, "GrantRoles", deployer);
    }
    
    /**
     * @dev 获取所有已部署的合约地址
     */
    function getDeployedContracts() external view returns (
        address, address, address, address, address, address, address, address, address
    ) {
        return (
            systemAddress,
            roleManagerAddress,
            feeManagerAddress,
            propertyRegistryAddress,
            tokenFactoryAddress,
            redemptionManagerAddress,
            rentDistributorAddress,
            marketplaceAddress,
            tokenHolderQueryAddress
        );
    }
    
    /**
     * @dev 获取当前的部署进度 (0-11)
     */
    function getDeploymentProgress() external view returns (uint8) {
        return deploymentProgress;
    }
} 