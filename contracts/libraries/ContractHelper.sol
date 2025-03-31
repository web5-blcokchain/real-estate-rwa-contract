// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IFixedRoleManager.sol";
import "../interfaces/IFixedPropertyRegistry.sol";
import "../interfaces/IFixedTokenFactory.sol";

/**
 * @title ContractHelper
 * @dev 提供安全访问合约的辅助方法，避免直接调用可能失败的函数
 */
library ContractHelper {
    // 角色常量哈希值（硬编码以避免调用可能失败的方法）
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes32 internal constant SUPER_ADMIN_ROLE = 0xd980155b32cf66e6af51e0972d64b9d5efe0e6f237dfaa4bdc83f990dd79e9c8;
    bytes32 internal constant PROPERTY_MANAGER_ROLE = 0x5cefc88e2d50f91b66109b6bb76803f11168ca3d1cee10cbafe864e4749970c7;
    bytes32 internal constant TOKEN_MANAGER_ROLE = 0x593fb413ec9f9ad9f53f309300b515310ff474591268ca3cbe9752fd88eb76a0;
    bytes32 internal constant MINTER_ROLE = 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6;
    bytes32 internal constant SNAPSHOT_ROLE = 0x5fdbd35e8da83ee755d5e62a539e5ed7f47126abede0b8b10f9ea43dc6eed07f;
    
    /**
     * @dev 安全地检查账户是否有指定角色，避免调用失败
     */
    function safeHasRole(address roleManager, bytes32 role, address account) internal view returns (bool) {
        try IFixedRoleManager(roleManager).hasRole(role, account) returns (bool hasRole) {
            return hasRole;
        } catch {
            // 如果调用失败，则假设没有角色
            return false;
        }
    }
    
    /**
     * @dev 安全地授予角色，如果调用失败则使用低级调用
     */
    function safeGrantRole(address roleManager, bytes32 role, address account) internal returns (bool) {
        try IFixedRoleManager(roleManager).grantRole(role, account) {
            return true;
        } catch {
            // 如果高级调用失败，尝试低级调用
            (bool success,) = roleManager.call(
                abi.encodeWithSignature("grantRole(bytes32,address)", role, account)
            );
            return success;
        }
    }
    
    /**
     * @dev 安全地检查房产是否已批准
     */
    function safeIsPropertyApproved(address propertyRegistry, string memory propertyId) internal view returns (bool) {
        try IFixedPropertyRegistry(propertyRegistry).isPropertyApproved(propertyId) returns (bool approved) {
            return approved;
        } catch {
            // 如果调用失败，则返回false
            return false;
        }
    }
    
    /**
     * @dev 安全地注册房产
     */
    function safeRegisterProperty(
        address propertyRegistry, 
        string memory propertyId, 
        string memory country, 
        string memory metadataURI
    ) internal returns (bool) {
        try IFixedPropertyRegistry(propertyRegistry).registerProperty(propertyId, country, metadataURI) {
            return true;
        } catch {
            // 如果高级调用失败，尝试低级调用
            (bool success,) = propertyRegistry.call(
                abi.encodeWithSignature(
                    "registerProperty(string,string,string)", 
                    propertyId, 
                    country, 
                    metadataURI
                )
            );
            return success;
        }
    }
    
    /**
     * @dev 安全地创建代币
     */
    function safeCreateToken(
        address tokenFactory,
        string memory name,
        string memory symbol,
        string memory propertyId,
        uint256 initialSupply
    ) internal returns (address tokenAddress) {
        try IFixedTokenFactory(tokenFactory).createSingleToken(name, symbol, propertyId, initialSupply) returns (address addr) {
            return addr;
        } catch {
            // 如果高级调用失败，尝试低级调用
            (bool success, bytes memory data) = tokenFactory.call(
                abi.encodeWithSignature(
                    "createSingleToken(string,string,string,uint256)",
                    name,
                    symbol,
                    propertyId,
                    initialSupply
                )
            );
            
            // 尝试从返回数据中解析地址
            if (success && data.length >= 32) {
                assembly {
                    tokenAddress := mload(add(data, 32))
                }
            }
            
            return tokenAddress;
        }
    }
}
