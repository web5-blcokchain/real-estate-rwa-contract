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
    RentDistributor public rentDistributor;
    
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
        rentDistributor = RentDistributor(_rentDistributor);
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
     * @dev 创建新的房产代币
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _propertyId 房产ID
     * @param _initialSupply 初始供应量
     * @return 新创建的代币地址
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _propertyId,
        uint256 _initialSupply
    ) internal returns (address) {  // 内部函数
        // 检查propertyId非空
        require(bytes(_propertyId).length > 0, "Property ID cannot be empty");
        
        // 检查房产是否已审核
        require(propertyRegistry.isPropertyApproved(_propertyId), "Property not approved");
        
        // 检查该房产是否已经创建了代币
        require(tokens[_propertyId] == address(0), "Token already exists for this property");
        
        bytes memory initData = abi.encodeWithSelector(
            RealEstateToken(address(0)).initialize.selector,
            _propertyId,
            _name,
            _symbol,
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
        tokens[_propertyId] = tokenAddress;
        tokenToProperty[tokenAddress] = _propertyId; // 添加反向映射
        allTokens.push(tokenAddress);
        
        // 设置代币权限和初始供应量
        RealEstateToken token = RealEstateToken(tokenAddress);
        
        // 统一授权逻辑：确保rent distributor有SNAPSHOT_ROLE
        token.grantRole(token.SNAPSHOT_ROLE(), address(rentDistributor));
        
        // 确保propertyRegistry有必要的权限以检查房产状态
        // 注意：RealEstateToken合约使用DEFAULT_ADMIN_ROLE而非PROPERTY_STATUS_CHECKER_ROLE
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), address(propertyRegistry));
        
        // 只有在指定初始供应量时才铸造
        if (_initialSupply > 0) {
            token.mint(msg.sender, _initialSupply);
        }
        
        emit TokenCreated(_propertyId, tokenAddress, _name, _symbol);
        
        return tokenAddress;
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
        
        return createToken(_name, _symbol, _propertyId, _initialSupply);
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
            newTokens[i] = createToken(names[i], symbols[i], propertyIds[i], initialSupplies[i]);
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