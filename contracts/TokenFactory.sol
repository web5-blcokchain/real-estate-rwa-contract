// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./RoleManager.sol";
import "./PropertyRegistry.sol";
import "./RealEstateToken.sol";
import "./FeeManager.sol";

/**
 * @title TokenFactory
 * @dev 创建和管理房产代币（可升级版本）
 */
contract TokenFactory is Initializable, UUPSUpgradeable {
    RoleManager public roleManager;
    PropertyRegistry public propertyRegistry;
    FeeManager public feeManager;
    
    // 代币实现合约地址
    address public tokenImplementation;
    
    // 房产ID到代币地址的映射
    mapping(string => address) public propertyTokens;
    
    // 所有代币地址数组
    address[] public allTokens;
    
    // 事件
    event TokenCreated(string propertyId, address tokenAddress, string name, string symbol, uint256 totalSupply);

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
        address _feeManager
    ) public initializer {
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        feeManager = FeeManager(_feeManager);
        
        // 部署代币实现合约
        tokenImplementation = address(new RealEstateToken());
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
     * @param totalSupply 代币总供应量
     * @return tokenAddress 代币合约地址
     */
    function createToken(
        string memory propertyId,
        string memory name,
        string memory symbol,
        uint256 totalSupply
    ) external onlySuperAdmin returns (address tokenAddress) {
        // 检查房产是否已审核
        require(propertyRegistry.isPropertyApproved(propertyId), "Property not approved");
        
        // 检查是否已经为该房产创建了代币
        require(propertyTokens[propertyId] == address(0), "Token already exists for this property");
        
        // 创建代理合约
        bytes memory initData = abi.encodeWithSelector(
            RealEstateToken(address(0)).initialize.selector,
            propertyId,
            name,
            symbol,
            msg.sender
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(tokenImplementation, initData);
        tokenAddress = address(proxy);
        
        // 更新映射和数组
        propertyTokens[propertyId] = tokenAddress;
        allTokens.push(tokenAddress);
        
        // 铸造代币
        RealEstateToken token = RealEstateToken(tokenAddress);
        token.mint(msg.sender, totalSupply);
        
        emit TokenCreated(propertyId, tokenAddress, name, symbol, totalSupply);
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
     * @dev 获取房产代币地址
     * @param propertyId 房产ID
     * @return 代币地址
     */
    function getTokenAddress(string memory propertyId) external view returns (address) {
        return propertyTokens[propertyId];
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}