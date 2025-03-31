// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";
import "./TradingManager.sol";
import "./RewardManager.sol";
import "./SimpleRealEstateSystem.sol";

/**
 * @title SimpleSystemDeployer
 * @dev 简化版系统部署合约
 */
contract SimpleSystemDeployer {
    // 部署版本
    string public constant DEPLOYMENT_VERSION = "1.0.0";
    
    // 部署者地址
    address public deployer;
    
    // 已部署的合约地址
    address public roleManagerAddress;
    address public propertyManagerAddress;
    address public propertyTokenAddress;
    address public tradingManagerAddress;
    address public rewardManagerAddress;
    address public systemAddress;
    
    // 部署状态
    enum DeploymentStatus { NotDeployed, Deployed }
    mapping(string => DeploymentStatus) public deploymentStatus;
    
    // 事件
    event ContractDeployed(string name, address contractAddress);
    event SystemDeployed(
        address roleManager,
        address propertyManager,
        address propertyToken,
        address tradingManager,
        address rewardManager,
        address system
    );
    
    constructor() {
        deployer = msg.sender;
    }
    
    /**
     * @dev 部署所有合约
     */
    function deploySystem() external {
        require(msg.sender == deployer, "Only deployer can deploy the system");
        
        // 1. 部署RoleManager
        deployRoleManager();
        
        // 2. 部署PropertyManager
        deployPropertyManager();
        
        // 3. 部署PropertyToken
        deployPropertyToken();
        
        // 4. 部署TradingManager
        deployTradingManager();
        
        // 5. 部署RewardManager
        deployRewardManager();
        
        // 6. 部署SimpleRealEstateSystem
        deployRealEstateSystem();
        
        emit SystemDeployed(
            roleManagerAddress,
            propertyManagerAddress,
            propertyTokenAddress,
            tradingManagerAddress,
            rewardManagerAddress,
            systemAddress
        );
    }
    
    /**
     * @dev 部署RoleManager
     */
    function deployRoleManager() public {
        require(roleManagerAddress == address(0), "RoleManager already deployed");
        
        // 部署实现合约
        SimpleRoleManager roleManagerImpl = new SimpleRoleManager();
        
        // 创建初始化数据
        bytes memory initData = abi.encodeWithSelector(
            SimpleRoleManager(address(0)).initialize.selector
        );
        
        // 部署代理合约
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(roleManagerImpl),
            deployer,
            initData
        );
        
        roleManagerAddress = address(proxy);
        deploymentStatus["RoleManager"] = DeploymentStatus.Deployed;
        
        emit ContractDeployed("RoleManager", roleManagerAddress);
    }
    
    /**
     * @dev 部署PropertyManager
     */
    function deployPropertyManager() public {
        require(propertyManagerAddress == address(0), "PropertyManager already deployed");
        require(roleManagerAddress != address(0), "RoleManager must be deployed first");
        
        // 部署实现合约
        PropertyManager propertyManagerImpl = new PropertyManager();
        
        // 创建初始化数据
        bytes memory initData = abi.encodeWithSelector(
            PropertyManager(address(0)).initialize.selector,
            roleManagerAddress
        );
        
        // 部署代理合约
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(propertyManagerImpl),
            deployer,
            initData
        );
        
        propertyManagerAddress = address(proxy);
        deploymentStatus["PropertyManager"] = DeploymentStatus.Deployed;
        
        emit ContractDeployed("PropertyManager", propertyManagerAddress);
    }
    
    /**
     * @dev 部署PropertyToken
     */
    function deployPropertyToken() public {
        require(propertyTokenAddress == address(0), "PropertyToken already deployed");
        require(roleManagerAddress != address(0), "RoleManager must be deployed first");
        require(propertyManagerAddress != address(0), "PropertyManager must be deployed first");
        
        // 部署实现合约
        PropertyToken propertyTokenImpl = new PropertyToken();
        
        // 部署代理合约 - 注意PropertyToken的初始化不同于其他合约
        // 它将作为工厂，需要单独调用createToken来创建代币实例
        propertyTokenAddress = address(propertyTokenImpl);
        deploymentStatus["PropertyToken"] = DeploymentStatus.Deployed;
        
        emit ContractDeployed("PropertyToken", propertyTokenAddress);
    }
    
    /**
     * @dev 部署TradingManager
     */
    function deployTradingManager() public {
        require(tradingManagerAddress == address(0), "TradingManager already deployed");
        require(roleManagerAddress != address(0), "RoleManager must be deployed first");
        require(propertyManagerAddress != address(0), "PropertyManager must be deployed first");
        
        // 部署实现合约
        TradingManager tradingManagerImpl = new TradingManager();
        
        // 创建初始化数据
        bytes memory initData = abi.encodeWithSelector(
            TradingManager(address(0)).initialize.selector,
            roleManagerAddress,
            propertyManagerAddress
        );
        
        // 部署代理合约
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(tradingManagerImpl),
            deployer,
            initData
        );
        
        tradingManagerAddress = address(proxy);
        deploymentStatus["TradingManager"] = DeploymentStatus.Deployed;
        
        emit ContractDeployed("TradingManager", tradingManagerAddress);
    }
    
    /**
     * @dev 部署RewardManager
     */
    function deployRewardManager() public {
        require(rewardManagerAddress == address(0), "RewardManager already deployed");
        require(roleManagerAddress != address(0), "RoleManager must be deployed first");
        require(propertyManagerAddress != address(0), "PropertyManager must be deployed first");
        
        // 部署实现合约
        RewardManager rewardManagerImpl = new RewardManager();
        
        // 创建初始化数据
        bytes memory initData = abi.encodeWithSelector(
            RewardManager(address(0)).initialize.selector,
            roleManagerAddress,
            propertyManagerAddress
        );
        
        // 部署代理合约
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(rewardManagerImpl),
            deployer,
            initData
        );
        
        rewardManagerAddress = address(proxy);
        deploymentStatus["RewardManager"] = DeploymentStatus.Deployed;
        
        emit ContractDeployed("RewardManager", rewardManagerAddress);
    }
    
    /**
     * @dev 部署SimpleRealEstateSystem
     */
    function deployRealEstateSystem() public {
        require(systemAddress == address(0), "System already deployed");
        require(roleManagerAddress != address(0), "RoleManager must be deployed first");
        require(propertyManagerAddress != address(0), "PropertyManager must be deployed first");
        require(propertyTokenAddress != address(0), "PropertyToken must be deployed first");
        require(tradingManagerAddress != address(0), "TradingManager must be deployed first");
        require(rewardManagerAddress != address(0), "RewardManager must be deployed first");
        
        // 部署实现合约
        SimpleRealEstateSystem systemImpl = new SimpleRealEstateSystem();
        
        // 创建初始化数据
        bytes memory initData = abi.encodeWithSelector(
            SimpleRealEstateSystem(address(0)).initialize.selector,
            roleManagerAddress,
            propertyManagerAddress,
            propertyTokenAddress,
            tradingManagerAddress,
            rewardManagerAddress
        );
        
        // 部署代理合约
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(systemImpl),
            deployer,
            initData
        );
        
        systemAddress = address(proxy);
        deploymentStatus["SimpleRealEstateSystem"] = DeploymentStatus.Deployed;
        
        emit ContractDeployed("SimpleRealEstateSystem", systemAddress);
    }
    
    /**
     * @dev 获取所有已部署的合约地址
     */
    function getDeployedContracts() external view returns (
        address, address, address, address, address, address
    ) {
        return (
            roleManagerAddress,
            propertyManagerAddress,
            propertyTokenAddress,
            tradingManagerAddress,
            rewardManagerAddress,
            systemAddress
        );
    }
} 