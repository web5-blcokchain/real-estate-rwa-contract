// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./RoleManager.sol";
import "./FeeManager.sol";
import "./KYCManager.sol";
import "./PropertyRegistry.sol";
import "./TokenFactory.sol";
import "./RedemptionManager.sol";
import "./RentDistributor.sol";
import "./Marketplace.sol";

/**
 * @title RealEstateSystem
 * @dev 房产通证化系统主合约（可升级版本）
 */
contract RealEstateSystem is Initializable, UUPSUpgradeable {
    // 系统合约
    RoleManager public roleManager;
    FeeManager public feeManager;
    KYCManager public kycManager;
    PropertyRegistry public propertyRegistry;
    TokenFactory public tokenFactory;
    RedemptionManager public redemptionManager;
    RentDistributor public rentDistributor;
    Marketplace public marketplace;
    
    // 系统状态
    bool public systemActive;
    
    // 事件
    event SystemDeployed(address deployer);
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
        
        // 部署KYC管理合约
        KYCManager kycManagerImpl = new KYCManager();
        ERC1967Proxy kycManagerProxy = new ERC1967Proxy(
            address(kycManagerImpl),
            abi.encodeWithSelector(KYCManager(address(0)).initialize.selector, address(roleManager))
        );
        kycManager = KYCManager(address(kycManagerProxy));
        
        // 部署房产注册合约
        PropertyRegistry propertyRegistryImpl = new PropertyRegistry();
        ERC1967Proxy propertyRegistryProxy = new ERC1967Proxy(
            address(propertyRegistryImpl),
            abi.encodeWithSelector(PropertyRegistry(address(0)).initialize.selector, address(roleManager))
        );
        propertyRegistry = PropertyRegistry(address(propertyRegistryProxy));
        
        // 部署代币工厂合约
        TokenFactory tokenFactoryImpl = new TokenFactory();
        ERC1967Proxy tokenFactoryProxy = new ERC1967Proxy(
            address(tokenFactoryImpl),
            abi.encodeWithSelector(
                TokenFactory(address(0)).initialize.selector,
                address(roleManager),
                address(propertyRegistry),
                address(kycManager),
                address(feeManager)
            )
        );
        tokenFactory = TokenFactory(address(tokenFactoryProxy));
        
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
        RentDistributor rentDistributorImpl = new RentDistributor();
        ERC1967Proxy rentDistributorProxy = new ERC1967Proxy(
            address(rentDistributorImpl),
            abi.encodeWithSelector(
                RentDistributor(address(0)).initialize.selector,
                address(roleManager),
                address(feeManager)
            )
        );
        rentDistributor = RentDistributor(address(rentDistributorProxy));
        
        // 部署市场合约
        Marketplace marketplaceImpl = new Marketplace();
        ERC1967Proxy marketplaceProxy = new ERC1967Proxy(
            address(marketplaceImpl),
            abi.encodeWithSelector(
                Marketplace(address(0)).initialize.selector,
                address(roleManager),
                address(feeManager),
                address(kycManager)
            )
        );
        marketplace = Marketplace(address(marketplaceProxy));
        
        systemActive = true;
        
        emit SystemDeployed(msg.sender);
    }

    /**
     * @dev 修饰器：只有超级管理员可以调用
     */
    modifier onlySuperAdmin() {
        require(roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), "Caller is not a super admin");
        _;
    }

    /**
     * @dev 修饰器：系统必须激活
     */
    modifier whenSystemActive() {
        require(systemActive, "System not active");
        _;
    }

    /**
     * @dev 设置系统状态
     * @param _active 是否激活
     */
    function setSystemStatus(bool _active) external onlySuperAdmin {
        systemActive = _active;
        emit SystemStatusChanged(_active);
    }

    /**
     * @dev 升级系统合约
     * @param contractName 合约名称
     * @param newImplementation 新实现地址
     */
    function upgradeContract(string memory contractName, address newImplementation) external onlySuperAdmin {
        require(newImplementation != address(0), "Invalid implementation address");
        
        bytes32 nameHash = keccak256(abi.encodePacked(contractName));
        
        if (nameHash == keccak256(abi.encodePacked("RoleManager"))) {
            UUPSUpgradeable(address(roleManager)).upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("FeeManager"))) {
            UUPSUpgradeable(address(feeManager)).upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("KYCManager"))) {
            UUPSUpgradeable(address(kycManager)).upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("PropertyRegistry"))) {
            UUPSUpgradeable(address(propertyRegistry)).upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("TokenFactory"))) {
            UUPSUpgradeable(address(tokenFactory)).upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("RedemptionManager"))) {
            UUPSUpgradeable(address(redemptionManager)).upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("RentDistributor"))) {
            UUPSUpgradeable(address(rentDistributor)).upgradeTo(newImplementation);
        } else if (nameHash == keccak256(abi.encodePacked("Marketplace"))) {
            UUPSUpgradeable(address(marketplace)).upgradeTo(newImplementation);
        } else {
            revert("Unknown contract name");
        }
        
        emit ContractUpgraded(contractName, newImplementation);
    }

    /**
     * @dev 获取系统合约地址
     * @return 所有系统合约地址
     */
    function getSystemContracts() external view returns (
        address, address, address, address, address, address, address, address
    ) {
        return (
            address(roleManager),
            address(feeManager),
            address(kycManager),
            address(propertyRegistry),
            address(tokenFactory),
            address(redemptionManager),
            address(rentDistributor),
            address(marketplace)
        );
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}