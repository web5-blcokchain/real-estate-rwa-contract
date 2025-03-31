// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";

/**
 * @title PropertyToken
 * @dev 表示特定房产的ERC20代币
 */
contract PropertyToken is 
    Initializable, 
    ERC20Upgradeable, 
    ERC20SnapshotUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    AccessControlUpgradeable {
    
    // 角色常量
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    // 版本控制
    uint8 public version;
    
    // 角色管理器
    SimpleRoleManager public roleManager;
    
    // 房产管理器
    PropertyManager public propertyManager;
    
    // 房产ID哈希
    bytes32 public propertyIdHash;
    
    // 最大供应量
    uint256 public maxSupply;
    
    // 最小转账金额
    uint256 public minTransferAmount;
    
    // 已注册的代币
    mapping(bytes32 => bool) private _registeredTokens;
    address[] private _allTokens;
    
    // 黑名单地址
    mapping(address => bool) public blacklisted;
    
    // 事件
    event TokenCreated(address tokenAddress, bytes32 propertyIdHash, string name, string symbol, uint256 initialSupply);
    event TokenMinted(address to, uint256 amount);
    event TokenBurned(address from, uint256 amount);
    event MaxSupplyUpdated(uint256 oldMaxSupply, uint256 newMaxSupply);
    event MinTransferAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event SnapshotCreated(uint256 indexed snapshotId);
    event AddressBlacklisted(address indexed account, bool status);
    event TokenFactoryInitialized(address indexed deployer);
    event TokenInstanceInitialized(bytes32 indexed propertyIdHash, string propertyId, string name, string symbol);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 修饰器：确保地址没有被列入黑名单
     */
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "Address blacklisted");
        _;
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(
        bytes32 _propertyIdHash,
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _admin
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Snapshot_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(ADMIN_ROLE, _admin);
        
        version = 1;
        propertyIdHash = _propertyIdHash;
        maxSupply = 1000000000 * 10**decimals(); // 默认10亿代币
        minTransferAmount = 0; // 默认无最小转账限制
        
        // 铸造初始代币供应
        if (_initialSupply > 0) {
            _mint(_admin, _initialSupply);
        }
        
        emit TokenCreated(address(this), _propertyIdHash, _name, _symbol, _initialSupply);
        emit TokenInstanceInitialized(_propertyIdHash, "", _name, _symbol);
    }
    
    /**
     * @dev 初始化函数 - 工厂合约
     */
    function initializeFactory(
        address _roleManager
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        version = 1;
        
        emit TokenFactoryInitialized(msg.sender);
    }
    
    /**
     * @dev 将地址加入黑名单或移除
     */
    function setBlacklistStatus(address account, bool status) external onlyRole(ADMIN_ROLE) {
        blacklisted[account] = status;
        emit AddressBlacklisted(account, status);
    }
    
    /**
     * @dev 设置最小转账金额
     */
    function setMinTransferAmount(uint256 _minAmount) external onlyRole(ADMIN_ROLE) {
        uint256 oldAmount = minTransferAmount;
        minTransferAmount = _minAmount;
        emit MinTransferAmountUpdated(oldAmount, _minAmount);
    }
    
    /**
     * @dev 铸造代币
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
        notBlacklisted(to)
    {
        require(totalSupply() + amount <= maxSupply, "Exceeds maximum supply");
        _mint(to, amount);
        emit TokenMinted(to, amount);
    }
    
    /**
     * @dev 销毁代币
     */
    function burn(uint256 amount) 
        external 
        whenNotPaused 
    {
        _burn(msg.sender, amount);
        emit TokenBurned(msg.sender, amount);
    }
    
    /**
     * @dev 创建快照
     */
    function snapshot() external onlyRole(OPERATOR_ROLE) returns (uint256) {
        uint256 snapshotId = _snapshot();
        emit SnapshotCreated(snapshotId);
        return snapshotId;
    }
    
    /**
     * @dev 设置最大供应量
     */
    function setMaxSupply(uint256 _maxSupply) 
        external 
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        require(_maxSupply >= totalSupply(), "New max supply must be >= current total supply");
        uint256 oldMaxSupply = maxSupply;
        maxSupply = _maxSupply;
        emit MaxSupplyUpdated(oldMaxSupply, _maxSupply);
    }
    
    /**
     * @dev 暂停所有转账
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev 恢复所有转账
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev 获取特定快照时的余额
     */
    function balanceOfAt(address account, uint256 snapshotId) 
        public 
        view 
        override 
        returns (uint256) 
    {
        return super.balanceOfAt(account, snapshotId);
    }
    
    /**
     * @dev 获取特定快照时的总供应量
     */
    function totalSupplyAt(uint256 snapshotId) 
        public 
        view 
        override 
        returns (uint256) 
    {
        return super.totalSupplyAt(snapshotId);
    }
    
    /**
     * @dev 重写beforeTokenTransfer钩子
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20SnapshotUpgradeable, ERC20Upgradeable) whenNotPaused {
        require(!blacklisted[from] && !blacklisted[to], "Blacklisted address");
        
        // 检查最小转账金额（除非是铸造或销毁操作）
        if (from != address(0) && to != address(0) && minTransferAmount > 0) {
            require(amount >= minTransferAmount, "Below minimum transfer amount");
        }
        
        super._beforeTokenTransfer(from, to, amount);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {
        uint8 oldVersion = version;
        version += 1;
    }
    
    /**
     * @dev 创建新代币 - 工厂功能
     */
    function createToken(
        string memory _propertyId,
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) external returns (address) {
        // 计算propertyId的哈希值
        bytes32 propertyIdHash = keccak256(abi.encodePacked(_propertyId));
        
        // 确保该房产尚未创建代币
        require(!_registeredTokens[propertyIdHash], "Token already created for property");
        
        // 创建新代币合约
        PropertyToken newToken = new PropertyToken();
        newToken.initialize(propertyIdHash, _name, _symbol, _initialSupply, msg.sender);
        
        // 注册代币
        _registeredTokens[propertyIdHash] = true;
        _allTokens.push(address(newToken));
        
        emit TokenCreated(address(newToken), propertyIdHash, _name, _symbol, _initialSupply);
        return address(newToken);
    }
    
    /**
     * @dev 获取所有代币地址
     */
    function getAllTokens() external view returns (address[] memory) {
        return _allTokens;
    }
    
    /**
     * @dev 检查代币地址是否已注册
     */
    function isRegisteredToken(address tokenAddress) external view returns (bool) {
        return _registeredTokens[keccak256(abi.encodePacked(tokenAddress))];
    }
    
    /**
     * @dev 获取代币数量
     */
    function getTokenCount() external view returns (uint256) {
        return _allTokens.length;
    }
    
    /**
     * @dev 获取代币信息
     */
    function getTokenInfo() external view returns (
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        bytes32 _propertyIdHash,
        uint8 _version
    ) {
        return (
            name(),
            symbol(),
            totalSupply(),
            propertyIdHash,
            version
        );
    }
    
    /**
     * @dev 覆盖supportsInterface确保合约支持所有接口
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 