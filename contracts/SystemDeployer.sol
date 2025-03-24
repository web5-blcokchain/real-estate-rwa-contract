// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SystemDeployerLib1.sol";
import "./SystemDeployerLib2.sol";

/**
 * @title SystemDeployerBase
 * @dev 基础部署器合约，存储状态和基础功能
 */
contract SystemDeployerBase {
    // 部署版本
    string public constant DEPLOYMENT_VERSION = "1.0.0";
    
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
    
    // 部署步骤描述
    mapping(uint8 => string) public stepDescriptions;
    
    // 步骤状态
    enum DeploymentStatus { NotStarted, Completed, Failed }
    mapping(uint8 => DeploymentStatus) public stepStatus;
    
    // 错误
    error OnlyDeployer();
    error StepAlreadyDeployed(uint8 step);
    error InvalidStepNumber(uint8 step);
    error StepsMustBeSequential(uint8 step, uint8 currentProgress);
    error DeploymentFailed(uint8 step, string reason);
    error PreviousStepFailed(uint8 failedStep);
    
    // 事件
    event SystemDeployed(
        string version,
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
    
    event DeploymentProgress(uint8 step, string description, string contractName, address contractAddress);
    event DeploymentError(uint8 step, string description, string reason);

    constructor() {
        deploymentProgress = 0;
        deployer = msg.sender;
        
        // 初始化步骤描述
        stepDescriptions[1] = "Deploy Role Manager";
        stepDescriptions[2] = "Deploy Fee Manager";
        stepDescriptions[3] = "Deploy Property Registry";
        stepDescriptions[4] = "Deploy Rent Distributor";
        stepDescriptions[5] = "Deploy Token Implementation";
        stepDescriptions[6] = "Deploy Token Factory";
        stepDescriptions[7] = "Deploy Redemption Manager";
        stepDescriptions[8] = "Deploy Marketplace";
        stepDescriptions[9] = "Deploy Token Holder Query";
        stepDescriptions[10] = "Deploy Real Estate System";
        stepDescriptions[11] = "Grant Admin Roles";
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
    
    /**
     * @dev 检查是否完成部署
     */
    function isDeploymentComplete() external view returns (bool) {
        return deploymentProgress == 11 && stepStatus[11] == DeploymentStatus.Completed;
    }
    
    /**
     * @dev 获取步骤状态
     */
    function getStepStatus(uint8 step) external view returns (DeploymentStatus) {
        require(step > 0 && step <= 11, "Invalid step");
        return stepStatus[step];
    }
}

/**
 * @title SystemDeployer
 * @dev 负责部署整个房产通证化系统的所有合约
 */
contract SystemDeployer is SystemDeployerBase {
    /**
     * @dev 部署单个步骤
     * @param step 要部署的步骤编号
     */
    function deployStep(uint8 step) external {
        if(msg.sender != deployer) {
            revert OnlyDeployer();
        }
        if(step <= deploymentProgress && stepStatus[step] == DeploymentStatus.Completed) {
            revert StepAlreadyDeployed(step);
        }
        if(step > 11) {
            revert InvalidStepNumber(step);
        }
        if(step != deploymentProgress + 1 && deploymentProgress > 0) {
            revert StepsMustBeSequential(step, deploymentProgress);
        }
        
        // 检查前一步是否失败
        if(step > 1 && stepStatus[step-1] == DeploymentStatus.Failed) {
            revert PreviousStepFailed(step-1);
        }
        
        try this._executeDeployStep(step) {
            stepStatus[step] = DeploymentStatus.Completed;
            deploymentProgress = step;
            
            // 如果所有步骤都已部署，发出完成事件
            if (step == 11) {
                emit SystemDeployed(
                    DEPLOYMENT_VERSION,
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
        } catch Error(string memory reason) {
            stepStatus[step] = DeploymentStatus.Failed;
            emit DeploymentError(step, stepDescriptions[step], reason);
            revert DeploymentFailed(step, reason);
        } catch (bytes memory) {
            stepStatus[step] = DeploymentStatus.Failed;
            emit DeploymentError(step, stepDescriptions[step], "Unknown error");
            revert DeploymentFailed(step, "Unknown error");
        }
    }
    
    /**
     * @dev 执行部署步骤
     * @param step 要部署的步骤编号
     */
    function _executeDeployStep(uint8 step) external {
        require(msg.sender == address(this), "Only self-call");
        
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
    }
    
    /**
     * @dev 部署角色管理合约
     */
    function _deployStep1_RoleManager() private {
        roleManagerAddress = SystemDeployerLib1.deployStep1_RoleManager();
        deploymentProgress = 1;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[1], "RoleManager", roleManagerAddress);
    }
    
    /**
     * @dev 部署费用管理合约
     */
    function _deployStep2_FeeManager() private {
        feeManagerAddress = SystemDeployerLib1.deployStep2_FeeManager(roleManagerAddress);
        deploymentProgress = 2;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[2], "FeeManager", feeManagerAddress);
    }
    
    /**
     * @dev 部署房产注册合约
     */
    function _deployStep3_PropertyRegistry() private {
        propertyRegistryAddress = SystemDeployerLib1.deployStep3_PropertyRegistry(roleManagerAddress);
        deploymentProgress = 3;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[3], "PropertyRegistry", propertyRegistryAddress);
    }
    
    /**
     * @dev 部署租金分发合约
     */
    function _deployStep4_RentDistributor() private {
        rentDistributorAddress = SystemDeployerLib1.deployStep4_RentDistributor(roleManagerAddress, feeManagerAddress);
        deploymentProgress = 4;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[4], "RentDistributor", rentDistributorAddress);
    }
    
    /**
     * @dev 部署代币实现合约
     */
    function _deployStep5_TokenImplementation() private {
        tokenImplementationAddress = SystemDeployerLib1.deployStep5_TokenImplementation();
        deploymentProgress = 5;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[5], "TokenImplementation", tokenImplementationAddress);
    }
    
    /**
     * @dev 部署代币工厂合约
     */
    function _deployStep6_TokenFactory() private {
        tokenFactoryAddress = SystemDeployerLib2.deployStep6_TokenFactory(
            roleManagerAddress,
            propertyRegistryAddress,
            tokenImplementationAddress,
            rentDistributorAddress
        );
        deploymentProgress = 6;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[6], "TokenFactory", tokenFactoryAddress);
    }
    
    /**
     * @dev 部署赎回管理合约
     */
    function _deployStep7_RedemptionManager() private {
        redemptionManagerAddress = SystemDeployerLib2.deployStep7_RedemptionManager(
            roleManagerAddress,
            propertyRegistryAddress
        );
        deploymentProgress = 7;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[7], "RedemptionManager", redemptionManagerAddress);
    }
    
    /**
     * @dev 部署市场合约
     */
    function _deployStep8_Marketplace() private {
        marketplaceAddress = SystemDeployerLib2.deployStep8_Marketplace(
            roleManagerAddress,
            feeManagerAddress
        );
        deploymentProgress = 8;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[8], "Marketplace", marketplaceAddress);
    }
    
    /**
     * @dev 部署代币持有者查询合约
     */
    function _deployStep9_TokenHolderQuery() private {
        tokenHolderQueryAddress = SystemDeployerLib2.deployStep9_TokenHolderQuery(roleManagerAddress);
        deploymentProgress = 9;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[9], "TokenHolderQuery", tokenHolderQueryAddress);
    }
    
    /**
     * @dev 部署房地产系统合约
     */
    function _deployStep10_RealEstateSystem() private {
        systemAddress = SystemDeployerLib2.deployStep10_RealEstateSystem(
            roleManagerAddress,
            feeManagerAddress,
            propertyRegistryAddress,
            tokenFactoryAddress,
            redemptionManagerAddress,
            rentDistributorAddress,
            marketplaceAddress,
            tokenHolderQueryAddress
        );
        deploymentProgress = 10;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[10], "RealEstateSystem", systemAddress);
    }
    
    /**
     * @dev 授予角色
     */
    function _deployStep11_GrantRoles() private {
        SystemDeployerLib2.grantSuperAdminRole(roleManagerAddress, deployer);
        deploymentProgress = 11;
        emit DeploymentProgress(deploymentProgress, stepDescriptions[11], "GrantRoles", deployer);
    }
} 