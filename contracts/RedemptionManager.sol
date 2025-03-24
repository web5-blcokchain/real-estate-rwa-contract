// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RoleManager.sol";
import "./RealEstateToken.sol";
import "./FeeManager.sol";

/**
 * @title RedemptionManager
 * @dev 管理房产代币的赎回流程（可升级版本）
 */
contract RedemptionManager is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    RoleManager public roleManager;
    FeeManager public feeManager;

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
        string propertyId;
        address requester;
        uint256 tokenAmount;
        uint256 requestTime;
        uint256 approvalTime;
        uint256 completionTime;
        RedemptionStatus status;
        address stablecoinAddress; // 用于赎回的稳定币地址
    }

    // 赎回请求映射
    mapping(uint256 => RedemptionRequest) public redemptionRequests;
    
    // 赎回请求计数
    uint256 public requestCount;
    
    // 赎回期限（默认30天）
    uint256 public redemptionPeriod = 30 days;
    
    // 支持的稳定币列表
    mapping(address => bool) public supportedStablecoins;
    
    // 事件
    event RedemptionRequested(uint256 requestId, string propertyId, address requester, uint256 tokenAmount, address stablecoin);
    event RedemptionApproved(uint256 requestId, address approver);
    event RedemptionRejected(uint256 requestId, address rejector);
    event RedemptionCompleted(uint256 requestId, uint256 amount, address stablecoin);
    event RedemptionCancelled(uint256 requestId);
    event StablecoinStatusUpdated(address indexed token, bool status);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数（替代构造函数）
     */
    function initialize(address _roleManager, address _feeManager) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
        feeManager = FeeManager(_feeManager);
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
     * @dev 请求赎回
     * @param propertyId 房产ID
     * @param tokenAddress 代币地址
     * @param tokenAmount 代币数量
     * @param stablecoinAddress 用于赎回的稳定币地址
     */
    function requestRedemption(
        string memory propertyId,
        address tokenAddress,
        uint256 tokenAmount,
        address stablecoinAddress
    ) external nonReentrant {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(supportedStablecoins[stablecoinAddress], "Unsupported stablecoin");
        
        RealEstateToken token = RealEstateToken(tokenAddress);
        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        
        // 锁定代币
        token.transferFrom(msg.sender, address(this), tokenAmount);
        
        // 创建赎回请求
        requestCount++;
        redemptionRequests[requestCount] = RedemptionRequest({
            propertyId: propertyId,
            requester: msg.sender,
            tokenAmount: tokenAmount,
            requestTime: block.timestamp,
            approvalTime: 0,
            completionTime: 0,
            status: RedemptionStatus.Pending,
            stablecoinAddress: stablecoinAddress
        });
        
        emit RedemptionRequested(requestCount, propertyId, msg.sender, tokenAmount, stablecoinAddress);
    }

    /**
     * @dev 批准赎回请求
     * @param requestId 请求ID
     */
    function approveRedemption(uint256 requestId) external onlySuperAdmin {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Pending, "Request not pending");
        
        request.status = RedemptionStatus.Approved;
        request.approvalTime = block.timestamp;
        
        emit RedemptionApproved(requestId, msg.sender);
    }

    /**
     * @dev 拒绝赎回请求
     * @param requestId 请求ID
     * @param tokenAddress 代币地址
     */
    function rejectRedemption(uint256 requestId, address tokenAddress) external onlySuperAdmin {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Pending, "Request not pending");
        
        // 返还代币
        RealEstateToken token = RealEstateToken(tokenAddress);
        token.transfer(request.requester, request.tokenAmount);
        
        request.status = RedemptionStatus.Rejected;
        
        emit RedemptionRejected(requestId, msg.sender);
    }

    /**
     * @dev 完成赎回
     * @param requestId 请求ID
     * @param tokenAddress 代币地址
     * @param redemptionAmount 赎回金额
     */
    function completeRedemption(
        uint256 requestId,
        address tokenAddress,
        uint256 redemptionAmount
    ) external onlySuperAdmin nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.status == RedemptionStatus.Approved, "Request not approved");
        
        // 先更新状态以防止重入攻击
        request.status = RedemptionStatus.Completed;
        request.completionTime = block.timestamp;
        
        // 验证代币地址
        RealEstateToken token = RealEstateToken(tokenAddress);
        require(redemptionAmount > 0, "Redemption amount must be greater than 0");
        
        // 计算赎回费用
        uint256 fee = feeManager.calculateFee(redemptionAmount, feeManager.redemptionFee());
        uint256 netAmount = redemptionAmount - fee;
        
        // 获取稳定币合约
        IERC20 stablecoin = IERC20(request.stablecoinAddress);
        
        // 确保管理员已经批准合约使用足够的稳定币
        require(stablecoin.allowance(msg.sender, address(this)) >= redemptionAmount, 
                "Insufficient stablecoin allowance");
        
        // 销毁代币
        token.burn(request.tokenAmount);
        
        // 转移稳定币给请求者
        require(stablecoin.transferFrom(msg.sender, request.requester, netAmount), 
                "Failed to transfer redemption amount");
        
        // 转移费用给费用收集者
        require(stablecoin.transferFrom(msg.sender, feeManager.feeCollector(), fee), 
                "Failed to transfer fee");
        
        emit RedemptionCompleted(requestId, netAmount, request.stablecoinAddress);
    }

    /**
     * @dev 取消赎回请求
     * @param requestId 请求ID
     * @param tokenAddress 代币地址
     */
    function cancelRedemption(uint256 requestId, address tokenAddress) external nonReentrant {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.requester == msg.sender, "Not requester");
        require(request.status == RedemptionStatus.Pending, "Request not pending");
        
        // 返还代币
        RealEstateToken token = RealEstateToken(tokenAddress);
        token.transfer(request.requester, request.tokenAmount);
        
        request.status = RedemptionStatus.Cancelled;
        
        emit RedemptionCancelled(requestId);
    }

    /**
     * @dev 设置赎回期限
     * @param _period 期限（秒）
     */
    function setRedemptionPeriod(uint256 _period) external onlySuperAdmin {
        redemptionPeriod = _period;
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}