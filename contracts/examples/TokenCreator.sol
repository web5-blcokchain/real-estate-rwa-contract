// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/ContractHelper.sol";
import "../interfaces/IFixedRoleManager.sol";
import "../interfaces/IFixedPropertyRegistry.sol";
import "../interfaces/IFixedTokenFactory.sol";

/**
 * @title TokenCreator
 * @dev 使用修复型接口和辅助库安全创建代币的示例合约
 */
contract TokenCreator {
    address public roleManager;
    address public propertyRegistry;
    address public tokenFactory;
    address public admin;
    
    event TokenCreationSucceeded(string propertyId, address tokenAddress);
    event TokenCreationFailed(string propertyId, string reason);
    
    constructor(
        address _roleManager,
        address _propertyRegistry,
        address _tokenFactory
    ) {
        roleManager = _roleManager;
        propertyRegistry = _propertyRegistry;
        tokenFactory = _tokenFactory;
        admin = msg.sender;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    /**
     * @dev 创建代币的安全方法，使用辅助库避免ABI不匹配问题
     */
    function createTokenSafely(
        string memory name,
        string memory symbol,
        string memory propertyId,
        uint256 initialSupply
    ) external onlyAdmin returns (address) {
        // 1. 确保TokenFactory拥有必要的角色
        bool hasGrantedRoles = 
            ContractHelper.safeGrantRole(roleManager, ContractHelper.MINTER_ROLE, tokenFactory) &&
            ContractHelper.safeGrantRole(roleManager, ContractHelper.SNAPSHOT_ROLE, tokenFactory) &&
            ContractHelper.safeGrantRole(roleManager, ContractHelper.TOKEN_MANAGER_ROLE, tokenFactory);
            
        if (!hasGrantedRoles) {
            emit TokenCreationFailed(propertyId, "Failed to grant roles");
            return address(0);
        }
        
        // 2. 注册和批准房产（如果需要）
        if (!ContractHelper.safeIsPropertyApproved(propertyRegistry, propertyId)) {
            // 注册一个新房产
            bool registered = ContractHelper.safeRegisterProperty(
                propertyRegistry, 
                propertyId, 
                "Test Country", 
                "https://example.com/metadata"
            );
            
            if (!registered) {
                emit TokenCreationFailed(propertyId, "Failed to register property");
                return address(0);
            }
            
            // 批准房产（低级调用，因为可能没有在接口中定义）
            (bool approved,) = propertyRegistry.call(
                abi.encodeWithSignature("approveProperty(string)", propertyId)
            );
            
            if (!approved) {
                emit TokenCreationFailed(propertyId, "Failed to approve property");
                return address(0);
            }
        }
        
        // 3. 创建代币
        address tokenAddress = ContractHelper.safeCreateToken(
            tokenFactory,
            name,
            symbol,
            propertyId,
            initialSupply
        );
        
        if (tokenAddress != address(0)) {
            emit TokenCreationSucceeded(propertyId, tokenAddress);
        } else {
            emit TokenCreationFailed(propertyId, "Failed to create token");
        }
        
        return tokenAddress;
    }
}
