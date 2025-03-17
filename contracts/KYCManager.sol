// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./RoleManager.sol";

/**
 * @title KYCManager
 * @dev 管理用户KYC验证状态
 */
contract KYCManager {
    RoleManager public roleManager;

    // KYC状态
    enum KYCStatus { NotVerified, Pending, Verified, Rejected }

    // 用户KYC信息
    struct UserKYC {
        KYCStatus status;
        uint256 verificationTime;
        uint256 expiryTime;
        address verifier;
    }

    // 用户KYC映射
    mapping(address => UserKYC) public userKYC;

    // 事件
    event KYCRequested(address indexed user);
    event KYCVerified(address indexed user, address indexed verifier);
    event KYCRejected(address indexed user, address indexed verifier);
    event KYCExpired(address indexed user);

    /**
     * @dev 构造函数
     * @param _roleManager 角色管理合约地址
     */
    constructor(address _roleManager) {
        roleManager = RoleManager(_roleManager);
    }

    /**
     * @dev 修饰器：只有KYC验证员可以调用
     */
    modifier onlyKYCVerifier() {
        require(roleManager.hasRole(roleManager.KYC_VERIFIER(), msg.sender), "Caller is not a KYC verifier");
        _;
    }

    /**
     * @dev 用户请求KYC验证
     */
    function requestKYC() external {
        require(userKYC[msg.sender].status == KYCStatus.NotVerified || 
                userKYC[msg.sender].status == KYCStatus.Rejected, 
                "KYC already in process or verified");
        
        userKYC[msg.sender].status = KYCStatus.Pending;
        emit KYCRequested(msg.sender);
    }

    /**
     * @dev 验证用户KYC
     * @param user 用户地址
     * @param validityPeriod KYC有效期（秒）
     */
    function verifyKYC(address user, uint256 validityPeriod) external onlyKYCVerifier {
        require(userKYC[user].status == KYCStatus.Pending, "User not in pending status");
        
        userKYC[user] = UserKYC({
            status: KYCStatus.Verified,
            verificationTime: block.timestamp,
            expiryTime: block.timestamp + validityPeriod,
            verifier: msg.sender
        });
        
        emit KYCVerified(user, msg.sender);
    }

    /**
     * @dev 拒绝用户KYC
     * @param user 用户地址
     */
    function rejectKYC(address user) external onlyKYCVerifier {
        require(userKYC[user].status == KYCStatus.Pending, "User not in pending status");
        
        userKYC[user].status = KYCStatus.Rejected;
        userKYC[user].verifier = msg.sender;
        
        emit KYCRejected(user, msg.sender);
    }

    /**
     * @dev 检查用户KYC状态
     * @param user 用户地址
     * @return 是否已验证
     */
    function isKYCVerified(address user) public view returns (bool) {
        return userKYC[user].status == KYCStatus.Verified && 
               block.timestamp <= userKYC[user].expiryTime;
    }

    /**
     * @dev 检查KYC是否过期
     * @param user 用户地址
     */
    function checkKYCExpiry(address user) external {
        require(userKYC[user].status == KYCStatus.Verified, "User not verified");
        
        if (block.timestamp > userKYC[user].expiryTime) {
            userKYC[user].status = KYCStatus.NotVerified;
            emit KYCExpired(user);
        }
    }
}