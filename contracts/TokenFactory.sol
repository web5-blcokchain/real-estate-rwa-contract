// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ERC1967/ERC1967UpgradeUpgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "./RealEstateToken.sol";
import "./PropertyRegistry.sol";
import "./RoleManager.sol";

/**
 * @title TokenFactory
 * @dev 用于创建和管理房产代币的工厂合约
 */
contract TokenFactory is Initializable, UUPSUpgradeable {
    // 角色管理器
    RoleManager public roleManager;
    
    // 房产注册表
    PropertyRegistry public propertyRegistry;
    
    // 代币实现合约地址
    address public tokenImplementation;
    
    // 代币映射：房产ID => 代币地址
    mapping(string => address) public tokens;
    
    // 所有代币地址数组
    address[] public allTokens;
    
    // 事件
    event TokenCreated(string propertyId, address tokenAddress, string name, string symbol);
    event TokenImplementationUpdated(address oldImplementation, address newImplementation);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize(
        address _roleManager,
        address _propertyRegistry,
        address _tokenImplementation
    ) public initializer {
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        tokenImplementation = _tokenImplementation;
    }
    
    /**
     * @dev 修饰器：只有超级管理员可以调用
     */
    modifier onlySuperAdmin() {
        require(roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), "Caller is not a super admin");
        _;
    }
    
    /**
     * @dev 创建新的房产代币
     * @param propertyId 房产ID
     * @param name 代币名称
     * @param symbol 代币符号
     * @return 新创建的代币地址
     */
    function createToken(
        string memory propertyId,
        string memory name,
        string memory symbol
    ) external onlySuperAdmin returns (address) {
        // 检查房产是否已审核
        require(propertyRegistry.isPropertyApproved(propertyId), "Property not approved");
        
        // 检查该房产是否已经创建了代币
        require(tokens[propertyId] == address(0), "Token already exists for this property");
        
        // 创建代理合约
        bytes memory initData = abi.encodeWithSelector(
            RealEstateToken(address(0)).initialize.selector,
            propertyId,
            name,
            symbol,
            msg.sender,
            address(propertyRegistry)
        );
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            tokenImplementation,
            address(roleManager),  // 使用角色管理器作为管理员
            initData
        );
        
        address tokenAddress = address(proxy);
        
        // 保存代币地址
        tokens[propertyId] = tokenAddress;
        allTokens.push(tokenAddress);
        
        emit TokenCreated(propertyId, tokenAddress, name, symbol);
        
        return tokenAddress;
    }
    
    /**
     * @dev 更新代币实现合约
     * @param newImplementation 新的实现合约地址
     */
    function updateTokenImplementation(address newImplementation) external onlySuperAdmin {
        address oldImplementation = tokenImplementation;
        tokenImplementation = newImplementation;
        
        emit TokenImplementationUpdated(oldImplementation, newImplementation);
    }
    
    /**
     * @dev 获取代币地址
     * @param propertyId 房产ID
     * @return 代币地址
     */
    function getTokenAddress(string memory propertyId) external view returns (address) {
        return tokens[propertyId];
    }
    
    /**
     * @dev 获取所有代币地址
     * @return 代币地址数组
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    /**
     * @dev 获取代币总数
     * @return 代币总数
     */
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}