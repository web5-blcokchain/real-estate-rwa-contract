// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RoleManager.sol";
import "./RealEstateToken.sol";
import "./FeeManager.sol";
import "./PropertyRegistry.sol";

/**
 * @title RedemptionManager
 * @dev 管理房产代币的赎回流程（可升级版本）
 */
contract RedemptionManager is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    RoleManager public roleManager;
    FeeManager public feeManager;
    PropertyRegistry public propertyRegistry;

    // 合约版本，用于追踪升级
    uint256 public version;

    // 赎回状态
    enum RedemptionStatus {
        Pending,
        Approved,
        Rejected,
        Completed,
        Cancelled
    }

    // 赎回请求
    struct RedemptionRequest {
        uint256 requestId;
        uint256 propertyId;
        address requester;
        address tokenAddress;
        uint256 tokenAmount;
        address stablecoinAddress;
        uint256 requestTime;
        uint256 approvalTime;
        uint256 completionTime;
        uint256 stablecoinAmount;
        RedemptionStatus status;
        string rejectReason;
    }

    // 赎回请求映射
    mapping(uint256 => RedemptionRequest) public redemptionRequests;
    
    // 赎回请求计数
    uint256 public requestCount;
    
    // 赎回期限（默认30天）
    uint256 public redemptionPeriod = 30 days;
    
    // 支持的稳定币列表
    mapping(address => bool) public supportedStablecoins;
    
    // 用户赎回请求映射
    mapping(address => uint256[]) public userRequests;
    
    // 房产赎回请求映射
    mapping(uint256 => uint256[]) public propertyRequests;
    
    // 错误定义
    error InvalidRequestStatus(uint256 requestId, RedemptionStatus currentStatus);
    error NotRequestOwner(uint256 requestId, address caller);
    error InsufficientTokenAmount(uint256 requestId, uint256 required, uint256 actual);
    error InvalidPropertyStatus(uint256 propertyId);
    error InsufficientStablecoinBalance(address stablecoin, uint256 required, uint256 actual);
    error TransferFailed();
    
    // 事件
    event RedemptionRequested(uint256 indexed requestId, address indexed requester, uint256 indexed propertyId, address tokenAddress, uint256 tokenAmount);
    event RedemptionApproved(uint256 indexed requestId, address indexed approver, uint256 stablecoinAmount);
    event RedemptionRejected(uint256 indexed requestId, address indexed rejecter, string reason);
    event RedemptionCompleted(uint256 indexed requestId, address indexed completer);
    event RedemptionCancelled(uint256 indexed requestId, address indexed canceller);
    event RedemptionFeeCollected(uint256 requestId, uint256 feeAmount, address feeToken);
    event VersionUpdated(uint256 oldVersion, uint256 newVersion);
    event RedemptionManagerInitialized(address deployer, address roleManager, address feeManager, address propertyRegistry, uint256 version);
    event RedemptionPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize(address _roleManager, address _feeManager, address _propertyRegistry) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        feeManager = FeeManager(_feeManager);
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        version = 1;
        
        // 请求PropertyRegistry授权此合约为授权合约
        // 注意：这需要admin权限，通常部署脚本会处理
        // 如果部署脚本没有处理，则需要在部署后手动调用PropertyRegistry的addAuthorizedContract函数
        
        emit RedemptionManagerInitialized(msg.sender, _roleManager, _feeManager, _propertyRegistry, version);
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
     * @dev 添加支持的稳定币
     * @param _stablecoin 稳定币地址
     */
    function addSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        supportedStablecoins[_stablecoin] = true;
    }

    /**
     * @dev 移除支持的稳定币
     * @param _stablecoin 稳定币地址
     */
    function removeSupportedStablecoin(address _stablecoin) external onlySuperAdmin {
        supportedStablecoins[_stablecoin] = false;
    }

    /**
     * @dev 提交赎回请求
     * @param propertyId 房产ID
     * @param tokenAddress 代币地址
     * @param tokenAmount 代币数量
     * @param stablecoinAddress 稳定币地址
     */
    function requestRedemption(
        uint256 propertyId,
        address tokenAddress,
        uint256 tokenAmount,
        address stablecoinAddress
    ) external nonReentrant returns (uint256) {
        // 检查propertyId有效性
        require(propertyId > 0, "Property ID must be greater than zero");
        
        // 检查房产状态 - 注意PropertyRegistry同时支持string和uint256参数的getPropertyStatus
        PropertyRegistry.PropertyStatus propertyStatus = propertyRegistry.getPropertyStatus(propertyId);
        if (propertyStatus != PropertyRegistry.PropertyStatus.Approved) {
            revert InvalidPropertyStatus(propertyId);
        }
        
        // 检查代币余额和授权
        RealEstateToken token = RealEstateToken(tokenAddress);
        uint256 balance = token.balanceOf(msg.sender);
        if (balance < tokenAmount) {
            revert InsufficientTokenAmount(0, tokenAmount, balance);
        }
        
        uint256 allowance = token.allowance(msg.sender, address(this));
        if (allowance < tokenAmount) {
            revert InsufficientTokenAmount(0, tokenAmount, allowance);
        }
        
        // 转移代币到合约
        bool transferSuccess = token.transferFrom(msg.sender, address(this), tokenAmount);
        if (!transferSuccess) {
            revert TransferFailed();
        }
        
        // 创建赎回请求
        uint256 requestId = ++requestCount;
        redemptionRequests[requestId] = RedemptionRequest({
            requestId: requestId,
            propertyId: propertyId,
            requester: msg.sender,
            tokenAddress: tokenAddress,
            tokenAmount: tokenAmount,
            stablecoinAddress: stablecoinAddress,
            requestTime: block.timestamp,
            approvalTime: 0,
            completionTime: 0,
            stablecoinAmount: 0,
            status: RedemptionStatus.Pending,
            rejectReason: ""
        });
        
        // 更新用户请求映射
        userRequests[msg.sender].push(requestId);
        
        // 更新房产请求映射
        propertyRequests[propertyId].push(requestId);
        
        // 通知房产合约有赎回请求 - 使用参数中传入的propertyId，确保状态一致性
        propertyRegistry.setPropertyStatus(propertyId, PropertyRegistry.PropertyStatus.Redemption);
        
        emit RedemptionRequested(requestId, msg.sender, propertyId, tokenAddress, tokenAmount);
        
        return requestId;
    }

    /**
     * @dev 批准赎回请求
     * @param requestId 请求ID
     * @param stablecoinAmount 稳定币数量
     */
    function approveRedemption(
        uint256 requestId,
        uint256 stablecoinAmount
    ) external onlyPropertyManager nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        
        // 检查请求状态
        if (request.status != RedemptionStatus.Pending) {
            revert InvalidRequestStatus(requestId, request.status);
        }
        
        // 验证stablecoinAmount的合理性
        require(stablecoinAmount > 0, "Stablecoin amount must be greater than zero");
        
        // 检查stablecoin是否被支持
        address stablecoinAddress = request.stablecoinAddress;
        require(supportedStablecoins[stablecoinAddress], "Stablecoin not supported");
        
        // 确保总体估值与代币价值合理对应（基本验证）
        // 实际实现中可能需要更复杂的价值评估逻辑
        uint256 tokenAmount = request.tokenAmount;
        require(stablecoinAmount >= tokenAmount / 100, "Stablecoin amount too low");
        
        // 更新请求信息
        request.status = RedemptionStatus.Approved;
        request.approvalTime = block.timestamp;
        request.stablecoinAmount = stablecoinAmount;
        
        emit RedemptionApproved(requestId, msg.sender, stablecoinAmount);
    }

    /**
     * @dev 拒绝赎回请求
     * @param requestId 请求ID
     * @param reason 拒绝原因
     */
    function rejectRedemption(
        uint256 requestId,
        string calldata reason
    ) external onlyPropertyManager nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        
        // 检查请求状态
        if (request.status != RedemptionStatus.Pending) {
            revert InvalidRequestStatus(requestId, request.status);
        }
        
        // 更新请求信息
        request.status = RedemptionStatus.Rejected;
        request.rejectReason = reason;
        
        // 返还代币给请求者
        address tokenAddress = request.tokenAddress;
        address requester = request.requester;
        uint256 tokenAmount = request.tokenAmount;
        
        IERC20 token = IERC20(tokenAddress);
        bool success = token.transfer(requester, tokenAmount);
        if (!success) {
            revert TransferFailed();
        }
        
        // 检查是否有其他待处理的赎回请求
        bool hasPendingRedemptions = false;
        uint256[] memory propRequests = propertyRequests[request.propertyId];
        for (uint256 i = 0; i < propRequests.length; i++) {
            if (redemptionRequests[propRequests[i]].status == RedemptionStatus.Pending) {
                hasPendingRedemptions = true;
                break;
            }
        }
        
        // 如果没有其他待处理的赎回请求，恢复房产状态
        if (!hasPendingRedemptions) {
            propertyRegistry.setPropertyStatus(request.propertyId, PropertyRegistry.PropertyStatus.Approved);
        }
        
        emit RedemptionRejected(requestId, msg.sender, reason);
    }

    /**
     * @dev 完成赎回请求
     * @param requestId 请求ID
     */
    function completeRedemption(uint256 requestId) external onlyPropertyManager nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        
        // 检查请求状态
        if (request.status != RedemptionStatus.Approved) {
            revert InvalidRequestStatus(requestId, request.status);
        }
        
        // 检查稳定币余额和授权
        address stablecoinAddress = request.stablecoinAddress;
        uint256 stablecoinAmount = request.stablecoinAmount;
        IERC20 stablecoin = IERC20(stablecoinAddress);
        
        // 检查管理员是否有足够的稳定币
        uint256 balance = stablecoin.balanceOf(msg.sender);
        if (balance < stablecoinAmount) {
            revert InsufficientStablecoinBalance(stablecoinAddress, stablecoinAmount, balance);
        }
        
        // 检查管理员是否授权了足够的稳定币
        uint256 allowance = stablecoin.allowance(msg.sender, address(this));
        if (allowance < stablecoinAmount) {
            revert InsufficientStablecoinBalance(stablecoinAddress, stablecoinAmount, allowance);
        }
        
        // 计算赎回费用（安全计算，防止溢出）
        uint256 fee = feeManager.redemptionFee();
        uint256 redemptionFee;
        
        // 检查费率是否合理，最大不超过25%
        if (fee > 2500) {
            fee = 2500; // 限制最大费率为25%
        }
        
        redemptionFee = (stablecoinAmount * fee) / 10000;
        
        // 确保费用不超过总金额的90%，保护用户
        uint256 maxFee = (stablecoinAmount * 9000) / 10000;
        if (redemptionFee > maxFee) {
            redemptionFee = maxFee;
        }
        
        uint256 requesterAmount = stablecoinAmount - redemptionFee;
        
        // 确保请求者至少能收到10%的金额
        require(requesterAmount >= (stablecoinAmount / 10), "Fee too high, requester amount too low");
        
        // 首先更新请求信息
        request.status = RedemptionStatus.Completed;
        request.completionTime = block.timestamp;
        
        // 检查是否有其他待处理或已批准的赎回请求
        bool hasActiveRedemptions = false;
        uint256[] memory propRequests = propertyRequests[request.propertyId];
        for (uint256 i = 0; i < propRequests.length; i++) {
            RedemptionStatus status = redemptionRequests[propRequests[i]].status;
            if (status == RedemptionStatus.Pending || status == RedemptionStatus.Approved) {
                hasActiveRedemptions = true;
                break;
            }
        }
        
        // 如果没有其他活跃的赎回请求，恢复房产状态
        if (!hasActiveRedemptions) {
            propertyRegistry.setPropertyStatus(request.propertyId, PropertyRegistry.PropertyStatus.Approved);
        }
        
        // 先触发事件
        emit RedemptionCompleted(requestId, msg.sender);
        
        // 转移稳定币给请求者
        bool success = stablecoin.transferFrom(msg.sender, request.requester, requesterAmount);
        if (!success) {
            revert TransferFailed();
        }
        
        // 如果有赎回费用，转移到费用收集者
        if (redemptionFee > 0) {
            address feeCollector = feeManager.feeCollector();
            bool feeSuccess = stablecoin.transferFrom(msg.sender, feeCollector, redemptionFee);
            if (!feeSuccess) {
                revert TransferFailed();
            }
            
            // 记录费用收集
            FeeManager.FeeType feeType = FeeManager.FeeType.REDEMPTION;
            feeManager.collectFee(redemptionFee, feeType, request.requester);
            emit RedemptionFeeCollected(requestId, redemptionFee, stablecoinAddress);
        }
        
        // 销毁代币
        RealEstateToken token = RealEstateToken(request.tokenAddress);
        token.burn(request.tokenAmount);
    }

    /**
     * @dev 取消赎回请求
     * @param requestId 请求ID
     */
    function cancelRedemption(uint256 requestId) external nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        
        // 检查请求状态
        if (request.status != RedemptionStatus.Pending) {
            revert InvalidRequestStatus(requestId, request.status);
        }
        
        // 检查是否是请求者或超级管理员
        if (request.requester != msg.sender && !roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender)) {
            revert NotRequestOwner(requestId, msg.sender);
        }
        
        // 首先更新请求信息
        request.status = RedemptionStatus.Cancelled;
        
        // 检查是否有其他待处理的赎回请求
        bool hasPendingRedemptions = false;
        uint256[] memory propRequests = propertyRequests[request.propertyId];
        for (uint256 i = 0; i < propRequests.length; i++) {
            if (redemptionRequests[propRequests[i]].status == RedemptionStatus.Pending) {
                hasPendingRedemptions = true;
                break;
            }
        }
        
        // 如果没有其他待处理的赎回请求，恢复房产状态
        if (!hasPendingRedemptions) {
            propertyRegistry.setPropertyStatus(request.propertyId, PropertyRegistry.PropertyStatus.Approved);
        }
        
        // 先触发事件
        emit RedemptionCancelled(requestId, msg.sender);
        
        // 最后返还代币给请求者
        IERC20 token = IERC20(request.tokenAddress);
        bool success = token.transfer(request.requester, request.tokenAmount);
        if (!success) {
            revert TransferFailed();
        }
    }

    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {
        // 更新版本号
        uint256 oldVersion = version;
        version += 1;
        emit VersionUpdated(oldVersion, version);
    }

    /**
     * @dev 设置赎回期限
     * @param _period 期限（秒）
     */
    function setRedemptionPeriod(uint256 _period) external onlySuperAdmin {
        uint256 oldPeriod = redemptionPeriod;
        redemptionPeriod = _period;
        emit RedemptionPeriodUpdated(oldPeriod, _period);
    }
}