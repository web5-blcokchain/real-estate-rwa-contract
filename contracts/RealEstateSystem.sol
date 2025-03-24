// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./RoleManager.sol";
import "./FeeManager.sol";
import "./PropertyRegistry.sol";
import "./TokenFactory.sol";
import "./RedemptionManager.sol";
import "./RentDistributor.sol";
import "./Marketplace.sol";
import "./TokenHolderQuery.sol";

/**
 * @title RealEstateSystem
 * @dev 房产通证化系统主合约（可升级版本）
 */
contract RealEstateSystem is Initializable, UUPSUpgradeable {
    // 系统状态
    bool public systemActive;
    
    // 系统合约
    RoleManager public roleManager;
    FeeManager public feeManager;
    PropertyRegistry public propertyRegistry;
    TokenFactory public tokenFactory;
    RedemptionManager public redemptionManager;
    RentDistributor public rentDistributor;
    Marketplace public marketplace;
    TokenHolderQuery public tokenHolderQuery;
    
    // 事件
    event SystemStatusChanged(bool active);
    event ContractUpgraded(string contractName, address newImplementation);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize() public initializer {
        __UUPSUpgradeable_init();
        
        systemActive = true;
        
        // 部署角色管理合约
        RoleManager roleManagerImpl = new RoleManager();
        ERC1967Proxy roleManagerProxy = new ERC1967Proxy(
            address(roleManagerImpl),
            abi.encodeWithSelector(RoleManager(address(0)).initialize.selector)
        );
        roleManager = RoleManager(address(roleManagerProxy));
        
        // 部署费用管理合约
        FeeManager feeManagerImpl = new FeeManager();
        ERC1967Proxy feeManagerProxy = new ERC1967Proxy(
            address(feeManagerImpl),
            abi.encodeWithSelector(FeeManager(address(0)).initialize.selector, address(roleManager))
        );
        feeManager = FeeManager(address(feeManagerProxy));
        
        // 部署房产注册合约
        PropertyRegistry propertyRegistryImpl = new PropertyRegistry();
        ERC1967Proxy propertyRegistryProxy = new ERC1967Proxy(
            address(propertyRegistryImpl),
            abi.encodeWithSelector(PropertyRegistry(address(0)).initialize.selector, address(roleManager))
        );
        propertyRegistry = PropertyRegistry(address(propertyRegistryProxy));
        
        // 部署代币工厂合约
        // 移除第一次部署的 TokenFactory 代码
        /*
        TokenFactory tokenFactoryImpl = new TokenFactory();
        ERC1967Proxy tokenFactoryProxy = new ERC1967Proxy(
            address(tokenFactoryImpl),
            abi.encodeWithSelector(
                TokenFactory(address(0)).initialize.selector,
                address(roleManager),
                address(propertyRegistry),
                address(feeManager) // 这里应该是 tokenImplementation
            )
        );
        tokenFactory = TokenFactory(address(tokenFactoryProxy));
        */
        
        // 部署赎回管理合约
        RedemptionManager redemptionManagerImpl = new RedemptionManager();
        ERC1967Proxy redemptionManagerProxy = new ERC1967Proxy(
            address(redemptionManagerImpl),
            abi.encodeWithSelector(
                RedemptionManager(address(0)).initialize.selector,
                address(roleManager),
                address(feeManager)
            )
        );
        redemptionManager = RedemptionManager(address(redemptionManagerProxy));
        
        // 部署租金分配合约
        // 保留第二次部署的代码，但调整部署顺序
        // 先部署 RentDistributor
        RentDistributor rentDistributorImpl = new RentDistributor();
        ERC1967Proxy rentDistributorProxy = new ERC1967Proxy(
            address(rentDistributorImpl),
            abi.encodeWithSelector(RentDistributor(address(0)).initialize.selector, address(roleManager), address(feeManager))
        );
        rentDistributor = RentDistributor(address(rentDistributorProxy));
        
        // 再部署 TokenFactory
        RealEstateToken tokenImpl = new RealEstateToken();
        TokenFactory tokenFactoryImpl = new TokenFactory();
        ERC1967Proxy tokenFactoryProxy = new ERC1967Proxy(
            address(tokenFactoryImpl),
            abi.encodeWithSelector(
                TokenFactory(address(0)).initialize.selector, 
                address(roleManager), 
                address(propertyRegistry), 
                address(tokenImpl),
                address(rentDistributor)
            )
        );
        tokenFactory = TokenFactory(address(tokenFactoryProxy));
        
        // 部署市场合约
        // 修改 Marketplace 初始化部分
        Marketplace marketplaceImpl = new Marketplace();
        ERC1967Proxy marketplaceProxy = new ERC1967Proxy(
            address(marketplaceImpl),
            abi.encodeWithSelector(
                bytes4(keccak256("initialize(address,address)")), // 使用明确的函数签名
                address(roleManager),
                address(feeManager)
            )
        );
        marketplace = Marketplace(address(marketplaceProxy));
        
        // 授予当前部署者超级管理员角色
        roleManager.grantRole(roleManager.SUPER_ADMIN(), msg.sender);
        
        // 部署TokenHolderQuery
        TokenHolderQuery tokenHolderQueryImpl = new TokenHolderQuery();
        ERC1967Proxy tokenHolderQueryProxy = new ERC1967Proxy(
            address(tokenHolderQueryImpl),
            abi.encodeWithSelector(
                TokenHolderQuery(address(0)).initialize.selector,
                address(roleManager)
            )
        );
        tokenHolderQuery = TokenHolderQuery(address(tokenHolderQueryProxy));
    }

    /**
     * @dev 修饰器：只有超级管理员可以调用
     */
    modifier onlySuperAdmin() {
        require(roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), "Caller is not a super admin");
        _;
    }

    /**
     * @dev 修饰器：系统必须处于活动状态
     */
    modifier whenSystemActive() {
        require(systemActive, "System is not active");
        _;
    }

    /**
     * @dev 设置系统状态
     * @param _active 是否活动
     */
    function setSystemStatus(bool _active) external onlySuperAdmin {
        systemActive = _active;
        emit SystemStatusChanged(_active);
    }

    /**
     * @dev 获取系统合约地址
     * @return 合约地址数组
     */
    function getSystemContracts() external view returns (address[] memory) {
        address[] memory contracts = new address[](7);
        contracts[0] = address(roleManager);
        contracts[1] = address(feeManager);
        contracts[2] = address(propertyRegistry);
        contracts[3] = address(tokenFactory);
        contracts[4] = address(redemptionManager);
        contracts[5] = address(rentDistributor);
        contracts[6] = address(marketplace);
        return contracts;
    }

    /**
     * @dev 升级合约实现
     * @param contractName 合约名称
     * @param newImplementation 新实现地址
     */
    function upgradeContract(string memory contractName, address newImplementation) external onlySuperAdmin {
        require(newImplementation != address(0), "Invalid implementation address");
        
        bytes32 nameHash = keccak256(abi.encodePacked(contractName));
        
        if (nameHash == keccak256(abi.encodePacked("RoleManager"))) {
            roleManager.upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("FeeManager"))) {
            feeManager.upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("PropertyRegistry"))) {
            propertyRegistry.upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("TokenFactory"))) {
            tokenFactory.upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("RedemptionManager"))) {
            redemptionManager.upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("RentDistributor"))) {
            rentDistributor.upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("Marketplace"))) {
            marketplace.upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("TokenHolderQuery"))) {
            tokenHolderQuery.upgradeTo(newImplementation);
        } else {
            revert("Unknown contract name");
        }
        
        emit ContractUpgraded(contractName, newImplementation);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}