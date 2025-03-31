// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";
import "./PropertyToken.sol";
import "./TradingManager.sol";
import "./RewardManager.sol";

/**
 * @title SimpleRealEstateSystem
 * @dev 简化版房产通证化系统主合约
 */
contract SimpleRealEstateSystem is Initializable, UUPSUpgradeable, PausableUpgradeable {
    // 系统状态
    bool public systemActive;
    
    // 版本控制
    uint256 public version;
    
    // 系统合约
    SimpleRoleManager public roleManager;
    PropertyManager public propertyManager;
    PropertyToken public propertyToken;
    TradingManager public tradingManager;
    RewardManager public rewardManager;
    
    // 合约升级映射
    mapping(bytes32 => address) private _contractNameToAddress;
    
    // 事件
    event SystemStatusChanged(bool active);
    event ContractUpgraded(string contractName, address newImplementation);
    event SystemInitialized(
        address deployer,
        address roleManager,
        address propertyManager,
        address propertyToken,
        address tradingManager,
        address rewardManager,
        uint256 version
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(
        address _roleManager,
        address _propertyManager,
        address _propertyToken,
        address _tradingManager,
        address _rewardManager
    ) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        systemActive = true;
        roleManager = SimpleRoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        propertyToken = PropertyToken(_propertyToken);
        tradingManager = TradingManager(_tradingManager);
        rewardManager = RewardManager(_rewardManager);
        version = 1;
        
        // 存储合约地址到映射
        _contractNameToAddress[keccak256(abi.encodePacked("RoleManager"))] = _roleManager;
        _contractNameToAddress[keccak256(abi.encodePacked("PropertyManager"))] = _propertyManager;
        _contractNameToAddress[keccak256(abi.encodePacked("PropertyToken"))] = _propertyToken;
        _contractNameToAddress[keccak256(abi.encodePacked("TradingManager"))] = _tradingManager;
        _contractNameToAddress[keccak256(abi.encodePacked("RewardManager"))] = _rewardManager;
        
        emit SystemInitialized(
            msg.sender,
            _roleManager,
            _propertyManager,
            _propertyToken,
            _tradingManager,
            _rewardManager,
            version
        );
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Caller is not an admin");
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
     */
    function setSystemStatus(bool _active) external onlyAdmin {
        systemActive = _active;
        emit SystemStatusChanged(_active);
    }
    
    /**
     * @dev 紧急暂停所有系统组件
     */
    function emergencyPause() external onlyAdmin {
        systemActive = false;
        _pause();
        
        // 暂停各个组件
        address[] memory allTokens = propertyToken.getAllTokens();
        for (uint256 i = 0; i < allTokens.length; i++) {
            PropertyToken(allTokens[i]).pause();
        }
        
        emit SystemStatusChanged(false);
    }
    
    /**
     * @dev 紧急恢复系统组件
     */
    function emergencyUnpause() external onlyAdmin {
        systemActive = true;
        _unpause();
        
        // 恢复各个组件
        address[] memory allTokens = propertyToken.getAllTokens();
        for (uint256 i = 0; i < allTokens.length; i++) {
            PropertyToken(allTokens[i]).unpause();
        }
        
        emit SystemStatusChanged(true);
    }
    
    /**
     * @dev 获取系统合约地址
     */
    function getSystemContracts() external view returns (address[] memory) {
        address[] memory contracts = new address[](5);
        contracts[0] = address(roleManager);
        contracts[1] = address(propertyManager);
        contracts[2] = address(propertyToken);
        contracts[3] = address(tradingManager);
        contracts[4] = address(rewardManager);
        return contracts;
    }
    
    /**
     * @dev 升级合约实现
     */
    function upgradeContract(string memory contractName, address newImplementation) external onlyAdmin {
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
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
} 