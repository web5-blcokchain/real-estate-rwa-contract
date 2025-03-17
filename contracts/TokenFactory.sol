// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./RoleManager.sol";
import "./PropertyRegistry.sol";
import "./RealEstateToken.sol";
import "./KYCManager.sol";
import "./FeeManager.sol";

/**
 * @title TokenFactory
 * @dev 创建房产代币的工厂合约（可升级版本）
 */
contract TokenFactory is Initializable, UUPSUpgradeable {
    RoleManager public roleManager;
    PropertyRegistry public propertyRegistry;
    KYCManager public kycManager;
    FeeManager public feeManager;
    
    // 代币映射
    mapping(string => address) public propertyTokens;
    
    // 代币列表
    address[] public tokenList;
    
    // 代币实现合约
    address public tokenImplementation;
    
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
        address _kycManager,
        address _feeManager
    ) public initializer {
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        kycManager = KYCManager(_kycManager);
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
     * @dev 更新代币实现合约
     * @param _newImplementation 新的实现合约地址
     */
    function updateTokenImplementation(address _newImplementation) external onlySuperAdmin {
        require(_newImplementation != address(0), "Invalid implementation address");
        address oldImplementation = tokenImplementation;
        tokenImplementation = _newImplementation;
        emit TokenImplementationUpdated(oldImplementation, _newImplementation);
    }

    /**
     * @dev 创建房产代币
     * @param propertyId 房产ID
     * @param name 代币名称
     * @param symbol 代币符号
     * @param totalSupply 总供应量
     * @return 代币地址
     */
    function createToken(
        string memory propertyId,
        string memory name,
        string memory symbol,
        uint256 totalSupply
    ) external onlySuperAdmin returns (address) {
        require(propertyTokens[propertyId] == address(0), "Token already exists for property");
        
        // 获取房产信息
        (string memory country, PropertyRegistry.PropertyStatus status, , string memory metadataURI) = 
            propertyRegistry.getPropertyDetails(propertyId);
        
        require(status == PropertyRegistry.PropertyStatus.Approved, "Property not approved");
        
        // 获取房产评估价值（从元数据中获取，这里简化为固定值）
        uint256 appraisalValue = totalSupply; // 简化处理，实际应从元数据中获取
        
        // 创建代理合约
        ERC1967Proxy tokenProxy = new ERC1967Proxy(
            tokenImplementation,
            abi.encodeWithSelector(
                RealEstateToken(address(0)).initialize.selector,
                propertyId,
                country,
                appraisalValue,
                totalSupply,
                name,
                symbol,
                metadataURI,
                address(roleManager),
                address(kycManager),
                address(feeManager)
            )
        );
        
        address tokenAddress = address(tokenProxy);
        
        // 更新映射
        propertyTokens[propertyId] = tokenAddress;
        tokenList.push(tokenAddress);
        
        // 更新房产状态为已通证化
        propertyRegistry.setPropertyTokenized(propertyId, tokenAddress);
        
        emit TokenCreated(propertyId, tokenAddress, name, symbol);
        
        return tokenAddress;
    }

    /**
     * @dev 获取代币数量
     * @return 代币数量
     */
    function getTokenCount() external view returns (uint256) {
        return tokenList.length;
    }

    /**
     * @dev 获取房产代币地址
     * @param propertyId 房产ID
     * @return 代币地址
     */
    function getPropertyToken(string memory propertyId) external view returns (address) {
        return propertyTokens[propertyId];
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}