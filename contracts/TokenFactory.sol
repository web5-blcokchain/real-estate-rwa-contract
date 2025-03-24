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
import "./RentDistributor.sol";

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
    
    // 租金分配合约
    address public rentDistributorAddress;
    
    // 代币映射：房产ID => 代币地址
    mapping(string => address) public tokens;
    
    // 添加逆向映射：代币地址 => 房产ID，方便查询
    mapping(address => string) public tokenToProperty;
    
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
        address _tokenImplementation,
        address _rentDistributor
    ) public initializer {
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        tokenImplementation = _tokenImplementation;
        rentDistributorAddress = _rentDistributor;
    }
    
    /**
     * @dev 修饰器：只有超级管理员可以调用
     */
    modifier onlySuperAdmin() {
        require(roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), "Caller is not a super admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有房产管理员可以调用
     */
    modifier onlyPropertyManager() {
        require(roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender), "Caller is not a property manager");
        _;
    }
    
    /**
     * @dev 部署代理合约的内部辅助函数
     * @param logicAddress 实现合约地址
     * @param data 初始化数据
     * @return 代理合约地址
     */
    function _deployProxy(address logicAddress, bytes memory data) internal returns (address) {
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            logicAddress,
            address(roleManager),  // 使用角色管理器作为管理员
            data
        );
        return address(proxy);
    }
    
    /**
     * @dev 根据房产信息创建新代币（内部函数）
     * @param propertyId 房产ID
     * @param tokenName 代币名称
     * @param tokenSymbol 代币简称
     * @param initialSupply 初始供应量
     * @param maxSupply 最大供应量
     * @return 代币合约地址
     */
    function createToken(
        string memory propertyId,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        uint256 maxSupply
    ) internal returns (address) {
        require(propertyRegistry.propertyExists(propertyId), "Property does not exist");
        require(propertyRegistry.isPropertyApproved(propertyId), "Property not approved");
        require(tokens[propertyId] == address(0), "Token already created for this property");
        
        // 创建代理合约
        address tokenProxy = _deployProxy(
            tokenImplementation,
            abi.encodeWithSelector(
                RealEstateToken(address(0)).initialize.selector,
                propertyId,
                tokenName,
                tokenSymbol,
                msg.sender,
                address(propertyRegistry)
            )
        );
        
        // 记录对应关系
        tokens[propertyId] = tokenProxy;
        tokenToProperty[tokenProxy] = propertyId;
        allTokens.push(tokenProxy);
        
        // 向PropertyRegistry注册代币地址
        try PropertyRegistry(address(propertyRegistry)).registerTokenForProperty(propertyId, tokenProxy) {
            // 注册成功
        } catch {
            // 注册失败，但不影响代币创建
            // 可以考虑记录错误日志
        }
        
        // 如果初始供应量大于0，铸造代币
        if (initialSupply > 0) {
            RealEstateToken(tokenProxy).mint(msg.sender, initialSupply);
        }
        
        // 设置最大供应量（如果需要）
        if (maxSupply > 0 && maxSupply != 1000000000 * 10**18) { // 检查是否和默认值不同
            RealEstateToken(tokenProxy).setMaxSupply(maxSupply);
        }
        
        // 为租金分发器授予权限
        if (rentDistributorAddress != address(0)) {
            RealEstateToken(tokenProxy).grantRole(
                RealEstateToken(tokenProxy).SNAPSHOT_ROLE(),
                rentDistributorAddress
            );
        }
        
        emit TokenCreated(propertyId, tokenProxy, tokenName, tokenSymbol);
        return tokenProxy;
    }
    
    /**
     * @dev 根据房产信息创建新代币（公共接口）
     * @param propertyId 房产ID
     * @param tokenName 代币名称
     * @param tokenSymbol 代币简称
     * @param initialSupply 初始供应量
     * @param maxSupply 最大供应量
     * @return 代币合约地址
     */
    function createTokenPublic(
        string memory propertyId,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        uint256 maxSupply
    ) external onlySuperAdmin returns (address) {
        return createToken(propertyId, tokenName, tokenSymbol, initialSupply, maxSupply);
    }
    
    /**
     * @dev 创建单个代币（公共接口）
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _propertyId 房产ID
     * @param _initialSupply 初始供应量
     * @return 新创建的代币地址
     */
    function createSingleToken(
        string memory _name,
        string memory _symbol,
        string memory _propertyId,
        uint256 _initialSupply
    ) external returns (address) {
        // 检查调用者是否有权限 - 允许SUPER_ADMIN或PROPERTY_MANAGER
        require(
            roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender) || 
            roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender),
            "Caller is not authorized to create tokens"
        );
        
        return createToken(_propertyId, _name, _symbol, _initialSupply, 0);
    }
    
    /**
     * @dev 更新代币实现合约
     * @param newImplementation 新的实现合约地址
     */
    function updateTokenImplementation(address newImplementation) external onlySuperAdmin {
        require(newImplementation != address(0), "Implementation cannot be zero address");
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
    
    /**
     * @dev 批量创建代币
     * @param propertyIds 房产ID数组
     * @param names 代币名称数组
     * @param symbols 代币符号数组
     * @param initialSupplies 初始供应量数组
     * @return 新创建的代币地址数组
     */
    function batchCreateTokens(
        string[] memory propertyIds,
        string[] memory names,
        string[] memory symbols,
        uint256[] memory initialSupplies
    ) external returns (address[] memory) {
        // 检查调用者是否有权限 - 允许SUPER_ADMIN或PROPERTY_MANAGER
        require(
            roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender) || 
            roleManager.hasRole(roleManager.PROPERTY_MANAGER(), msg.sender),
            "Caller is not authorized to create tokens"
        );
        
        require(propertyIds.length == names.length && 
                names.length == symbols.length && 
                symbols.length == initialSupplies.length, 
                "Array lengths must match");
        
        address[] memory newTokens = new address[](propertyIds.length);
        
        for (uint256 i = 0; i < propertyIds.length; i++) {
            newTokens[i] = createToken(propertyIds[i], names[i], symbols[i], initialSupplies[i], 0);
        }
        
        return newTokens;
    }
    
    /**
     * @dev 根据代币地址获取房产ID
     * @param tokenAddress 代币地址
     * @return 房产ID
     */
    function getPropertyIdFromToken(address tokenAddress) external view returns (string memory) {
        string memory propId = tokenToProperty[tokenAddress];
        require(bytes(propId).length > 0, "Token not found");
        return propId;
    }
}