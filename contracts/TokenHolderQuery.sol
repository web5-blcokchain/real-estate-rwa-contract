// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./RealEstateToken.sol";
import "./RoleManager.sol";

/**
 * @title TokenHolderQuery
 * @dev 用于查询代币持有者信息的合约
 */
contract TokenHolderQuery is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    RoleManager public roleManager;
    
    // 事件
    event HolderBalanceQueried(address indexed token, uint256 snapshotId, address holder, uint256 balance);
    
    /**
     * @dev 初始化函数
     */
    function initialize(address _roleManager) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        roleManager = RoleManager(_roleManager);
    }
    
    /**
     * @dev 修饰器：只有超级管理员可以调用
     */
    modifier onlySuperAdmin() {
        require(roleManager.hasRole(roleManager.SUPER_ADMIN(), msg.sender), "Caller is not a super admin");
        _;
    }
    
    /**
     * @dev 批量查询特定快照时的代币余额
     * @param tokenAddress 代币地址
     * @param holders 持有者地址数组
     * @param snapshotId 快照ID
     * @return balances 余额数组
     * @return totalSupply 总供应量
     */
    function getBalancesAtSnapshot(
        address tokenAddress,
        address[] calldata holders,
        uint256 snapshotId
    ) external view returns (uint256[] memory balances, uint256 totalSupply) {
        RealEstateToken token = RealEstateToken(tokenAddress);
        
        balances = new uint256[](holders.length);
        for (uint256 i = 0; i < holders.length; i++) {
            balances[i] = token.balanceOfAt(holders[i], snapshotId);
        }
        
        totalSupply = token.totalSupplyAt(snapshotId);
        
        return (balances, totalSupply);
    }
    
    /**
     * @dev 授权升级合约的实现
     */
    function _authorizeUpgrade(address newImplementation) internal override onlySuperAdmin {}
}