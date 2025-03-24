// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./TokenFactory.sol";
import "./RedemptionManager.sol";
import "./Marketplace.sol";
import "./TokenHolderQuery.sol";
import "./RealEstateSystem.sol";
import "./RoleManager.sol";

/**
 * @title SystemDeployerLib2
 * @dev 包含部署步骤6-11的库合约
 */
library SystemDeployerLib2 {
    /**
     * @dev 创建代理并初始化
     * @param _logic 实现合约地址
     * @param _data 初始化数据
     */
    function _deployProxy(address _logic, bytes memory _data) private returns (address) {
        return address(new ERC1967Proxy(_logic, _data));
    }

    /**
     * @dev 部署代币工厂合约
     */
    function deployStep6_TokenFactory(
        address roleManagerAddress,
        address propertyRegistryAddress,
        address tokenImplementationAddress,
        address rentDistributorAddress
    ) external returns (address) {
        TokenFactory impl = new TokenFactory();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(
                TokenFactory(address(0)).initialize.selector,
                roleManagerAddress,
                propertyRegistryAddress,
                tokenImplementationAddress,
                rentDistributorAddress
            )
        );
    }
    
    /**
     * @dev 部署赎回管理合约
     */
    function deployStep7_RedemptionManager(
        address roleManagerAddress,
        address propertyRegistryAddress
    ) external returns (address) {
        RedemptionManager impl = new RedemptionManager();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(
                RedemptionManager(address(0)).initialize.selector,
                roleManagerAddress,
                propertyRegistryAddress
            )
        );
    }
    
    /**
     * @dev 部署市场合约
     */
    function deployStep8_Marketplace(
        address roleManagerAddress,
        address feeManagerAddress
    ) external returns (address) {
        Marketplace impl = new Marketplace();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(
                Marketplace(address(0)).initialize.selector,
                roleManagerAddress,
                feeManagerAddress
            )
        );
    }
    
    /**
     * @dev 部署代币持有者查询合约
     */
    function deployStep9_TokenHolderQuery(address roleManagerAddress) external returns (address) {
        TokenHolderQuery impl = new TokenHolderQuery();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(TokenHolderQuery(address(0)).initialize.selector, roleManagerAddress)
        );
    }
    
    /**
     * @dev 部署房地产系统合约
     */
    function deployStep10_RealEstateSystem(
        address roleManagerAddress,
        address feeManagerAddress,
        address propertyRegistryAddress,
        address tokenFactoryAddress,
        address redemptionManagerAddress,
        address rentDistributorAddress,
        address marketplaceAddress,
        address tokenHolderQueryAddress
    ) external returns (address) {
        RealEstateSystem impl = new RealEstateSystem();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(
                RealEstateSystem(address(0)).initialize.selector,
                roleManagerAddress,
                feeManagerAddress,
                propertyRegistryAddress,
                tokenFactoryAddress,
                redemptionManagerAddress,
                rentDistributorAddress,
                marketplaceAddress,
                tokenHolderQueryAddress
            )
        );
    }
    
    /**
     * @dev 授予角色
     */
    function grantSuperAdminRole(address roleManagerAddress, address deployer) external {
        // 获取RoleManager实例
        RoleManager roleManager = RoleManager(roleManagerAddress);
        
        // 获取超级管理员角色ID
        bytes32 superAdminRole = roleManager.SUPER_ADMIN();
        
        // 确保deployer已经有DEFAULT_ADMIN_ROLE
        require(roleManager.hasRole(roleManager.DEFAULT_ADMIN_ROLE(), deployer), "Deployer must have DEFAULT_ADMIN_ROLE");
        
        // 使用try-catch来处理可能的错误
        try roleManager.grantRole(superAdminRole, deployer) {
            // 角色授予成功，什么都不做
        } catch {
            // 如果直接授予失败，尝试创建一个新实现并初始化
            RoleManager newImpl = new RoleManager();
            newImpl.initialize();
            
            // 授予SUPER_ADMIN角色
            newImpl.grantRole(superAdminRole, deployer);
            
            // 这种方法可能会失败，因为UUPS升级是受保护的，但这是一个后备措施
            try roleManager.grantRole(superAdminRole, deployer) {
                // 第二次尝试成功
            } catch {
                // 所有尝试都失败了，至少我们尝试了
                revert("Failed to grant SUPER_ADMIN role");
            }
        }
    }
} 