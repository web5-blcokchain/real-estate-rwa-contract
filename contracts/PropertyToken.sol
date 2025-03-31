// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "./SimpleRoleManager.sol";
import "./PropertyManager.sol";

/**
 * @title PropertyToken
 * @dev 优化的房产代币合约，整合代币工厂功能并增强安全性
 */
contract PropertyToken is 
    Initializable, 
    ERC20Upgradeable, 
    ERC20SnapshotUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable {
    
    // 版本控制 - 使用uint8节省gas
    uint8 public version;
    
    // 角色管理器
    SimpleRoleManager public roleManager;
    
    // 房产管理器
    PropertyManager public propertyManager;
    
    // 房产ID哈希 - 使用bytes32代替string节省gas
    bytes32 public propertyIdHash;
    
    // 最大供应量
    uint256 public maxSupply;
    
    // 最小转账额度
    uint256 public minTransferAmount;
    
    // 代币列表 - 仅工厂实例使用
    mapping(address => bool) private _registeredTokens;
    address[] private _allTokens;
    
    // 黑名单地址
    mapping(address => bool) public blacklisted;
    
    // 事件
    event TokenCreated(bytes32 indexed propertyIdHash, address indexed tokenAddress, string name, string symbol);
    event TokenMinted(address indexed to, uint256 amount);
    event TokenBurned(address indexed from, uint256 amount);
    event MaxSupplyUpdated(uint256 oldMaxSupply, uint256 newMaxSupply);
    event MinTransferAmountUpdated(uint256 oldMinAmount, uint256 newMinAmount);
    event SnapshotCreated(uint256 indexed snapshotId);
    event AddressBlacklisted(address indexed account, bool status);
    event TokenFactoryInitialized(address indexed deployer);
    event TokenInstanceInitialized(bytes32 indexed propertyIdHash, string propertyId, string name, string symbol);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 修饰器：只有ADMIN角色可以调用
     */
    modifier onlyAdmin() {
        require(roleManager.hasRole(roleManager.ADMIN_ROLE(), msg.sender), "Not admin");
        _;
    }
    
    /**
     * @dev 修饰器：只有MANAGER角色可以调用
     */
    modifier onlyManager() {
        require(roleManager.hasRole(roleManager.MANAGER_ROLE(), msg.sender), "Not manager");
        _;
    }
    
    /**
     * @dev 修饰器：只有OPERATOR角色可以调用
     */
    modifier onlyOperator() {
        require(roleManager.hasRole(roleManager.OPERATOR_ROLE(), msg.sender), "Not operator");
        _;
    }
    
    /**
     * @dev 修饰器：确保地址没有被列入黑名单
     */
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "Address blacklisted");
        _;
    }
    
    /**
     * @dev 初始化函数 - 代币实例
     */
    function initialize(
        bytes32 _propertyIdHash,
        string memory _propertyId,
        string memory _name,
        string memory _symbol,
        address _roleManager,
        address _propertyManager
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Snapshot_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = SimpleRoleManager(_roleManager);
        propertyManager = PropertyManager(_propertyManager);
        propertyIdHash = _propertyIdHash;
        maxSupply = 1000000000 * 10**decimals(); // 默认10亿代币
        minTransferAmount = 0; // 默认无最小转账额度
        version = 1;
        
        emit TokenInstanceInitialized(_propertyIdHash, _propertyId, _name, _symbol);
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
    function setBlacklistStatus(address account, bool status) external onlyAdmin {
        blacklisted[account] = status;
        emit AddressBlacklisted(account, status);
    }
    
    /**
     * @dev 设置最小转账额度
     */
    function setMinTransferAmount(uint256 _minAmount) external onlyAdmin {
        uint256 oldMinAmount = minTransferAmount;
        minTransferAmount = _minAmount;
        emit MinTransferAmountUpdated(oldMinAmount, _minAmount);
    }
    
    /**
     * @dev 铸造代币
     */
    function mint(address to, uint256 amount) 
        external 
        onlyManager 
        whenNotPaused 
        nonReentrant
        notBlacklisted(to)
    {
        require(totalSupply() + amount <= maxSupply, "Exceeds maximum supply");
        _mint(to, amount);
        emit TokenMinted(to, amount);
    }
    
    /**
     * @dev 批量铸造代币
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyManager 
        whenNotPaused 
        nonReentrant
    {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= maxSupply, "Exceeds maximum supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(!blacklisted[recipients[i]], "Recipient blacklisted");
            _mint(recipients[i], amounts[i]);
            emit TokenMinted(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev 销毁代币
     */
    function burn(uint256 amount) 
        external 
        whenNotPaused 
        nonReentrant
        notBlacklisted(msg.sender)
    {
        _burn(msg.sender, amount);
        emit TokenBurned(msg.sender, amount);
    }
    
    /**
     * @dev 代币持有者为他们的代币创建快照
     */
    function burnFrom(address account, uint256 amount)
        external
        whenNotPaused
        nonReentrant
    {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        require(!blacklisted[account], "Account blacklisted");
        require(!blacklisted[msg.sender], "Sender blacklisted");
        
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
        emit TokenBurned(account, amount);
    }
    
    /**
     * @dev 创建快照
     */
    function snapshot() 
        external 
        onlyOperator 
        whenNotPaused 
        nonReentrant
        returns (uint256) 
    {
        uint256 snapshotId = _snapshot();
        emit SnapshotCreated(snapshotId);
        return snapshotId;
    }
    
    /**
     * @dev 设置最大供应量
     */
    function setMaxSupply(uint256 _maxSupply) 
        external 
        onlyAdmin
        whenNotPaused
    {
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
     * @dev 覆盖transfer，添加黑名单和最小转账额度检查
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        notBlacklisted(msg.sender) 
        notBlacklisted(to) 
        returns (bool) 
    {
        require(amount >= minTransferAmount, "Below min transfer amount");
        return super.transfer(to, amount);
    }
    
    /**
     * @dev 覆盖transferFrom，添加黑名单和最小转账额度检查
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        notBlacklisted(from) 
        notBlacklisted(to) 
        notBlacklisted(msg.sender) 
        returns (bool) 
    {
        require(amount >= minTransferAmount, "Below min transfer amount");
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev 覆盖approve，添加黑名单检查
     */
    function approve(address spender, uint256 amount) 
        public 
        override 
        whenNotPaused 
        notBlacklisted(msg.sender) 
        notBlacklisted(spender) 
        returns (bool) 
    {
        return super.approve(spender, amount);
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
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyAdmin 
    {
        require(!SimpleRoleManager(roleManager).emergencyMode(), "Emergency mode active");
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
        uint256 initialSupply
    ) 
        external 
        onlyAdmin 
        nonReentrant 
        returns (address) 
    {
        // 将字符串ID转为bytes32哈希
        bytes32 propertyIdHash = keccak256(abi.encodePacked(_propertyId));
        
        // 检查房产是否已批准
        require(PropertyManager(propertyManager).isPropertyApproved(propertyIdHash), "Property not approved");
        
        // 创建初始化数据
        bytes memory initData = abi.encodeWithSelector(
            PropertyToken(address(0)).initialize.selector,
            propertyIdHash,
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
        _registeredTokens[tokenAddress] = true;
        _allTokens.push(tokenAddress);
        
        // 铸造初始供应量
        if (initialSupply > 0) {
            PropertyToken(tokenAddress).mint(msg.sender, initialSupply);
        }
        
        emit TokenCreated(propertyIdHash, tokenAddress, _name, _symbol);
        return tokenAddress;
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
        return _registeredTokens[tokenAddress];
    }
    
    /**
     * @dev 获取代币数量
     */
    function getTokenCount() external view returns (uint256) {
        return _allTokens.length;
    }
} 