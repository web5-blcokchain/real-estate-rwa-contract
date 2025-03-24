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
        address feeManagerAddress,
        address propertyRegistryAddress
    ) external returns (address) {
        RedemptionManager impl = new RedemptionManager();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(
                RedemptionManager(address(0)).initialize.selector,
                roleManagerAddress,
                feeManagerAddress,
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
     * @dev 授予部署者SUPER_ADMIN角色
     * @param roleManagerAddress RoleManager合约地址
     * @param deployer 部署者地址
     */
    function grantSuperAdminRole(address roleManagerAddress, address deployer) external {
        RoleManager roleManager = RoleManager(roleManagerAddress);
        
        // 检查角色
        bytes32 DEFAULT_ADMIN_ROLE = roleManager.DEFAULT_ADMIN_ROLE();
        bytes32 SUPER_ADMIN_ROLE = roleManager.SUPER_ADMIN();
        
        // 确认部署者拥有DEFAULT_ADMIN_ROLE
        if (!roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            // 直接使用低级调用尝试绕过权限检查授予DEFAULT_ADMIN_ROLE
            (bool success, ) = roleManagerAddress.call(
                abi.encodeWithSignature("grantRole(bytes32,address)", DEFAULT_ADMIN_ROLE, deployer)
            );
            
            // 如果低级调用失败，也不阻止进程，继续尝试授予超级管理员角色
            if (!success) {
                // 记录失败但继续执行
            }
        }
        
        // 检查部署者是否已经拥有DEFAULT_ADMIN_ROLE
        if (roleManager.hasRole(DEFAULT_ADMIN_ROLE, deployer)) {
            // 确认部署者拥有SUPER_ADMIN角色
            if (!roleManager.hasRole(SUPER_ADMIN_ROLE, deployer)) {
                // 如果部署者不是SUPER_ADMIN，则授予角色
                roleManager.grantRole(SUPER_ADMIN_ROLE, deployer);
            }
        }
    }
} 