// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./RoleManager.sol";
import "./FeeManager.sol";
import "./PropertyRegistry.sol";
import "./TokenFactory.sol";
import "./RedemptionManager.sol";
import "./RentDistributor.sol";
import "./Marketplace.sol";
import "./TokenHolderQuery.sol";
import "./RealEstateToken.sol";

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
    
    // 合约升级映射
    mapping(bytes32 => address) private _contractNameToAddress;
    
    // 事件
    event SystemStatusChanged(bool active);
    event ContractUpgraded(string contractName, address newImplementation);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数 - 使用已部署的合约地址而不是在初始化时部署
     */
    function initialize(
        address _roleManager,
        address _feeManager,
        address _propertyRegistry,
        address _tokenFactory,
        address _redemptionManager,
        address _rentDistributor,
        address _marketplace,
        address _tokenHolderQuery
    ) public initializer {
        __UUPSUpgradeable_init();
        
        systemActive = true;
        
        // 设置合约引用
        roleManager = RoleManager(_roleManager);
        feeManager = FeeManager(_feeManager);
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        tokenFactory = TokenFactory(_tokenFactory);
        redemptionManager = RedemptionManager(_redemptionManager);
        rentDistributor = RentDistributor(_rentDistributor);
        marketplace = Marketplace(_marketplace);
        tokenHolderQuery = TokenHolderQuery(_tokenHolderQuery);
        
        // 初始化合约升级映射
        _contractNameToAddress[keccak256(abi.encodePacked("RoleManager"))] = _roleManager;
        _contractNameToAddress[keccak256(abi.encodePacked("FeeManager"))] = _feeManager;
        _contractNameToAddress[keccak256(abi.encodePacked("PropertyRegistry"))] = _propertyRegistry;
        _contractNameToAddress[keccak256(abi.encodePacked("TokenFactory"))] = _tokenFactory;
        _contractNameToAddress[keccak256(abi.encodePacked("RedemptionManager"))] = _redemptionManager;
        _contractNameToAddress[keccak256(abi.encodePacked("RentDistributor"))] = _rentDistributor;
        _contractNameToAddress[keccak256(abi.encodePacked("Marketplace"))] = _marketplace;
        _contractNameToAddress[keccak256(abi.encodePacked("TokenHolderQuery"))] = _tokenHolderQuery;
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
     * @dev 紧急暂停所有系统组件
     * 暂停代币转移、市场交易等所有操作
     */
    function emergencyPause() external onlySuperAdmin {
        // 设置系统状态为不活动
        systemActive = false;
        emit SystemStatusChanged(false);
        
        // 暂停所有代币
        address[] memory allTokenAddresses = tokenFactory.getAllTokens();
        for (uint256 i = 0; i < allTokenAddresses.length; i++) {
            RealEstateToken token = RealEstateToken(allTokenAddresses[i]);
            if (!token.paused()) {
                token.pause();
            }
        }
    }
    
    /**
     * @dev 紧急恢复系统组件
     */
    function emergencyUnpause() external onlySuperAdmin {
        // 设置系统状态为活动
        systemActive = true;
        emit SystemStatusChanged(true);
        
        // 恢复所有代币
        address[] memory allTokenAddresses = tokenFactory.getAllTokens();
        for (uint256 i = 0; i < allTokenAddresses.length; i++) {
            RealEstateToken token = RealEstateToken(allTokenAddresses[i]);
            if (token.paused()) {
                token.unpause();
            }
        }
    }

    /**
     * @dev 获取系统合约地址
     * @return 合约地址数组
     */
    function getSystemContracts() external view returns (address[] memory) {
        address[] memory contracts = new address[](8);
        contracts[0] = address(roleManager);
        contracts[1] = address(feeManager);
        contracts[2] = address(propertyRegistry);
        contracts[3] = address(tokenFactory);
        contracts[4] = address(redemptionManager);
        contracts[5] = address(rentDistributor);
        contracts[6] = address(marketplace);
        contracts[7] = address(tokenHolderQuery);
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
        address contractAddress = _contractNameToAddress[nameHash];
        
        require(contractAddress != address(0), "Unknown contract name");
        
        UUPSUpgradeable upgradeableContract = UUPSUpgradeable(contractAddress);
        upgradeableContract.upgradeTo(newImplementation);
        
        emit ContractUpgraded(contractName, newImplementation);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}