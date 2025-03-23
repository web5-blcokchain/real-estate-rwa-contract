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
        string memory _name,
        string memory _symbol,
        string memory _propertyId,
        uint256 _initialSupply
    ) external onlyPropertyManager returns (address) {
        // 检查房产是否已审核
        require(propertyRegistry.isPropertyApproved(propertyId), "Property not approved");
        
        // 检查该房产是否已经创建了代币
        require(tokens[propertyId] == address(0), "Token already exists for this property");
        
        /**
         *  创建代理合约
         *  这段代码的目的是准备调用 RealEstateToken 合约的 initialize 函数所需的数据，这样当代理合约被创建时，它就能正确地初始化。这是可升级合约模式中的标准做法，因为代理合约需要知道如何初始化实现合约
         * @param newImplementation 
         *  解释：
            1. abi.encodeWithSelector 是 Solidity 提供的函数，用于将函数选择器和参数编码为字节数组，这个字节数组将作为代理合约的初始化数据。
            2. RealEstateToken(address(0)).initialize.selector 获取 RealEstateToken 合约中 initialize 函数的选择器（函数签名的哈希值的前 4 个字节）。这里使用 address(0) 是因为我们只需要获取函数选择器，不需要实际调用函数。
            3. 后面的参数 propertyId , name , symbol , msg.sender , address(propertyRegistry) 是传递给 initialize 函数的实际参数，它们将被编码到 initData 中。
            4. 这个 initData 将在创建代理合约时使用，当代理合约被部署后，它会立即调用实现合约的 initialize 函数，并传入这些参数。
         */
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
        
        // 授予RentDistributor快照角色
        token.grantRole(token.SNAPSHOT_ROLE(), address(rentDistributor));
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
    
    /**
     * @dev 批量创建代币
     * @param propertyIds 房产ID数组
     * @param names 代币名称数组
     * @param symbols 代币符号数组
     * @return 新创建的代币地址数组
     */
    function batchCreateTokens(
        string[] memory propertyIds,
        string[] memory names,
        string[] memory symbols
    ) external onlySuperAdmin returns (address[] memory) {
        require(propertyIds.length == names.length && names.length == symbols.length, "Array lengths must match");
        
        address[] memory newTokens = new address[](propertyIds.length);
        
        for (uint256 i = 0; i < propertyIds.length; i++) {
            newTokens[i] = createToken(propertyIds[i], names[i], symbols[i]);
        }
        
        return newTokens;
    }
}