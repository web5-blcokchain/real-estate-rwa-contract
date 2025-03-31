// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";

/**
 * @title PropertyToken
 * @dev 简化版房产代币合约，整合代币工厂和ERC20代币功能
 */
contract PropertyToken is 
    Initializable, 
    ERC20Upgradeable, 
    ERC20SnapshotUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable {
    
    // 版本控制
    uint256 public version;
    
    // 角色管理器
    SimpleRoleManager public roleManager;
    
    // 房产管理器
    PropertyManager public propertyManager;
    
    // 房产ID
    string public propertyId;
    
    // 最大供应量
    uint256 public maxSupply;
    
    // 代币列表
    address[] private allTokens;
    
    // 事件
    event TokenCreated(string propertyId, address tokenAddress, string name, string symbol);
    event TokenMinted(address to, uint256 amount);
    event TokenBurned(address from, uint256 amount);
    event MaxSupplyUpdated(uint256 oldMaxSupply, uint256 newMaxSupply);
    event SnapshotCreated(uint256 snapshotId);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(
        string memory _propertyId,
        string memory _name,
        string memory _symbol,
        address _roleManager,
        address _propertyManager
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Snapshot_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        propertyId = _propertyId;
        maxSupply = 1000000000 * 10**decimals(); // 默认10亿代币
        version = 1;
        
        // 注册代币
        PropertyManager(propertyManager).registerTokenForProperty(_propertyId, address(this));
        
        emit TokenCreated(_propertyId, address(this), _name, _symbol);
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Caller is not an admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender), "Caller is not a manager");
        _;
    }
    
    /**
     * @dev 铸造代币
     */
    function mint(address to, uint256 amount) external onlyManager whenNotPaused {
        require(totalSupply() + amount <= maxSupply, "Exceeds maximum supply");
        _mint(to, amount);
        emit TokenMinted(to, amount);
    }
    
    /**
     * @dev 销毁代币
     */
    function burn(uint256 amount) external whenNotPaused {
        _burn(msg.sender, amount);
        emit TokenBurned(msg.sender, amount);
    }
    
    /**
     * @dev 创建快照
     */
    function snapshot() external onlyManager returns (uint256) {
        uint256 snapshotId = _snapshot();
        emit SnapshotCreated(snapshotId);
        return snapshotId;
    }
    
    /**
     * @dev 设置最大供应量
     */
    function setMaxSupply(uint256 _maxSupply) external onlyAdmin {
        require(_maxSupply >= totalSupply(), "New max supply must be >= current total supply");
        uint256 oldMaxSupply = maxSupply;
        maxSupply = _maxSupply;
        emit MaxSupplyUpdated(oldMaxSupply, _maxSupply);
    }
    
    /**
     * @dev 暂停代币
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev 恢复代币
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @dev 获取特定快照时的余额
     */
    function balanceOfAt(address account, uint256 snapshotId) public view override returns (uint256) {
        return super.balanceOfAt(account, snapshotId);
    }
    
    // 以下为必须实现的内部函数
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20SnapshotUpgradeable) whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        uint256 oldVersion = version;
        version += 1;
    }
    
    /**
     * @dev 创建新代币
     */
    function createToken(
        string memory _propertyId,
        string memory _name, 
        string memory _symbol,
        uint256 initialSupply
    ) external onlyAdmin returns (address) {
        require(PropertyManager(propertyManager).isPropertyApproved(_propertyId), "Property not approved");
        
        // 创建初始化数据
        bytes memory initData = abi.encodeWithSelector(
            PropertyToken(address(0)).initialize.selector,
            _propertyId,
            _name,
            _symbol,
            address(roleManager),
            address(propertyManager)
        );
        
        // 部署代理合约
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(this), // 使用当前合约作为实现
            msg.sender,    // 管理员
            initData
        );
        
        address tokenAddress = address(proxy);
        
        // 记录新代币
        allTokens.push(tokenAddress);
        
        // 铸造初始供应量
        if (initialSupply > 0) {
            PropertyToken(tokenAddress).mint(msg.sender, initialSupply);
        }
        
        return tokenAddress;
    }
    
    /**
     * @dev 获取所有代币地址
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
} 