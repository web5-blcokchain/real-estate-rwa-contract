// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RoleManager.sol";
import "./KYCManager.sol";
import "./FeeManager.sol";

/**
 * @title RealEstateToken
 * @dev 房产代币，每个房产对应一个ERC20代币（可升级版本）
 */
contract RealEstateToken is ERC20Upgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    RoleManager public roleManager;
    KYCManager public kycManager;
    FeeManager public feeManager;

    // 房产信息
    struct PropertyInfo {
        string propertyId;
        string country;
        uint256 appraisalValue;
        uint256 totalSupply;
        uint256 creationTime;
        string metadataURI;
    }

    PropertyInfo public propertyInfo;
    
    // 白名单
    mapping(address => bool) public whitelist;
    
    // 支持的稳定币列表
    mapping(address => bool) public supportedStablecoins;
    
    // 累计租金（按稳定币类型）
    mapping(address => uint256) public accumulatedRent;
    
    // 最后一次租金分配时间
    uint256 public lastRentDistribution;
    
    // 用户已领取的租金（按稳定币类型）
    mapping(address => mapping(address => uint256)) public claimedRent;
    
    // 最小份额单位（默认为0.001，即0.1%）
    uint256 public constant MIN_SHARE_UNIT = 1e15; // 0.001 ether
    
    // 事件
    event WhitelistUpdated(address indexed user, bool status);
    event RentReceived(address indexed token, uint256 amount);
    event RentDistributed(address indexed token, uint256 amount, uint256 timestamp);
    event RentClaimed(address indexed user, address indexed token, uint256 amount);
    event StablecoinStatusUpdated(address indexed token, bool status);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize(
        string memory _propertyId,
        string memory _country,
        uint256 _appraisalValue,
        uint256 _totalSupply,
        string memory _name,
        string memory _symbol,
        string memory _metadataURI,
        address _roleManager,
        address _kycManager,
        address _feeManager
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        kycManager = KYCManager(_kycManager);
        feeManager = FeeManager(_feeManager);
        
        propertyInfo = PropertyInfo({
            propertyId: _propertyId,
            country: _country,
            appraisalValue: _appraisalValue,
            totalSupply: _totalSupply,
            creationTime: block.timestamp,
            metadataURI: _metadataURI
        });
        
        // 铸造所有代币给合约创建者
        _mint(msg.sender, _totalSupply);
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
     * @dev 修饰器：只有白名单用户可以调用
     */
    modifier onlyWhitelisted() {
        require(whitelist[msg.sender], "Not whitelisted");
        _;
    }

    /**
     * @dev 暂停合约
     */
    function pause() external onlySuperAdmin {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlySuperAdmin {
        _unpause();
    }

    /**
     * @dev 添加用户到白名单
     * @param _user 用户地址
     */
    function addToWhitelist(address _user) external onlySuperAdmin {
        require(kycManager.isKYCVerified(_user), "User not KYC verified");
        whitelist[_user] = true;
        emit WhitelistUpdated(_user, true);
    }

    /**
     * @dev 从白名单移除用户
     * @param _user 用户地址
     */
    function removeFromWhitelist(address _user) external onlySuperAdmin {
        whitelist[_user] = false;
        emit WhitelistUpdated(_user, false);
    }

    /**
     * @dev 添加支持的稳定币
     * @param _stablecoin 稳定币地址
     */
    function addSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        supportedStablecoins[_stablecoin] = true;
        emit StablecoinStatusUpdated(_stablecoin, true);
    }

    /**
     * @dev 移除支持的稳定币
     * @param _stablecoin 稳定币地址
     */
    function removeSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        supportedStablecoins[_stablecoin] = false;
        emit StablecoinStatusUpdated(_stablecoin, false);
    }

    /**
     * @dev 接收稳定币租金
     * @param _stablecoin 稳定币地址
     * @param _amount 金额
     */
    function receiveStablecoinRent(address _stablecoin, uint256 _amount) external onlyPropertyManager {
        require(supportedStablecoins[_stablecoin], "Unsupported stablecoin");
        require(_amount > 0, "Amount must be greater than 0");
        
        IERC20 stablecoin = IERC20(_stablecoin);
        require(stablecoin.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        accumulatedRent[_stablecoin] += _amount;
        emit RentReceived(_stablecoin, _amount);
    }

    /**
     * @dev 分配租金
     * @param _stablecoin 稳定币地址
     */
    function distributeRent(address _stablecoin) external onlyPropertyManager {
        require(supportedStablecoins[_stablecoin], "Unsupported stablecoin");
        require(accumulatedRent[_stablecoin] > 0, "No rent to distribute");
        
        lastRentDistribution = block.timestamp;
        emit RentDistributed(_stablecoin, accumulatedRent[_stablecoin], block.timestamp);
    }

    /**
     * @dev 领取稳定币租金
     * @param _stablecoin 稳定币地址
     */
    function claimStablecoinRent(address _stablecoin) external nonReentrant whenNotPaused {
        require(supportedStablecoins[_stablecoin], "Unsupported stablecoin");
        require(balanceOf(msg.sender) > 0, "No tokens owned");
        
        uint256 userShare = (accumulatedRent[_stablecoin] * balanceOf(msg.sender)) / totalSupply();
        uint256 alreadyClaimed = claimedRent[_stablecoin][msg.sender];
        uint256 claimable = userShare > alreadyClaimed ? userShare - alreadyClaimed : 0;
        
        require(claimable > 0, "No rent to claim");
        
        claimedRent[_stablecoin][msg.sender] = userShare;
        
        IERC20 stablecoin = IERC20(_stablecoin);
        require(stablecoin.transfer(msg.sender, claimable), "Transfer failed");
        
        emit RentClaimed(msg.sender, _stablecoin, claimable);
    }

    /**
     * @dev 转账前检查
     * @param from 发送方
     * @param to 接收方
     * @param amount 金额
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused {
        if (from != address(0) && to != address(0)) {
            // 不是铸造或销毁操作
            require(whitelist[from], "Sender not whitelisted");
            require(whitelist[to], "Recipient not whitelisted");
            
            // 检查最小份额单位
            if (from != address(0)) { // 非铸造操作
                require(amount % MIN_SHARE_UNIT == 0, "Amount must be multiple of minimum share unit");
                require(balanceOf(from) - amount >= MIN_SHARE_UNIT || balanceOf(from) - amount == 0, 
                    "Remaining balance must be at least minimum share unit or zero");
            }
            
            if (to != address(0)) { // 非销毁操作
                require(balanceOf(to) + amount >= MIN_SHARE_UNIT, 
                    "Resulting balance must be at least minimum share unit");
            }
        }
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev 转账
     * @param to 接收方
     * @param amount 金额
     * @return 是否成功
     */
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        // 计算交易费用
        uint256 fee = feeManager.calculateFee(amount, feeManager.tradingFee());
        uint256 netAmount = amount - fee;
        
        // 转账费用给费用收集者
        super.transfer(feeManager.feeCollector(), fee);
        
        // 转账净额给接收方
        return super.transfer(to, netAmount);
    }

    /**
     * @dev 授权转账
     * @param from 发送方
     * @param to 接收方
     * @param amount 金额
     * @return 是否成功
     */
    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        // 计算交易费用
        uint256 fee = feeManager.calculateFee(amount, feeManager.tradingFee());
        uint256 netAmount = amount - fee;
        
        // 转账费用给费用收集者
        super.transferFrom(from, feeManager.feeCollector(), fee);
        
        // 转账净额给接收方
        return super.transferFrom(from, to, netAmount);
    }

    /**
     * @dev 销毁代币
     * @param amount 金额
     */
    function burn(uint256 amount) public whenNotPaused {
        require(amount % MIN_SHARE_UNIT == 0, "Amount must be multiple of minimum share unit");
        _burn(msg.sender, amount);
    }

    /**
     * @dev 更新元数据URI
     * @param _metadataURI 新的元数据URI
     */
    function updateMetadataURI(string memory _metadataURI) external onlySuperAdmin {
        propertyInfo.metadataURI = _metadataURI;
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}