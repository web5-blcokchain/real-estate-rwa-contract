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
     * @dev 部署代币工厂合约
     */
    function deployStep6_TokenFactory(
        address roleManagerAddress,
        address propertyRegistryAddress,
        address tokenImplementationAddress
    ) external returns (address) {
        TokenFactory tokenFactoryImpl = new TokenFactory();
        ERC1967Proxy tokenFactoryProxy = new ERC1967Proxy(
            address(tokenFactoryImpl),
            abi.encodeWithSelector(
                TokenFactory(address(0)).initialize.selector,
                roleManagerAddress,
                propertyRegistryAddress,
                tokenImplementationAddress
            )
        );
        return address(tokenFactoryProxy);
    }
    
    /**
     * @dev 部署赎回管理合约
     */
    function deployStep7_RedemptionManager(
        address roleManagerAddress,
        address propertyRegistryAddress
    ) external returns (address) {
        RedemptionManager redemptionManagerImpl = new RedemptionManager();
        ERC1967Proxy redemptionManagerProxy = new ERC1967Proxy(
            address(redemptionManagerImpl),
            abi.encodeWithSelector(
                RedemptionManager(address(0)).initialize.selector,
                roleManagerAddress,
                propertyRegistryAddress
            )
        );
        return address(redemptionManagerProxy);
    }
    
    /**
     * @dev 部署市场合约
     */
    function deployStep8_Marketplace(
        address roleManagerAddress,
        address feeManagerAddress
    ) external returns (address) {
        Marketplace marketplaceImpl = new Marketplace();
        ERC1967Proxy marketplaceProxy = new ERC1967Proxy(
            address(marketplaceImpl),
            abi.encodeWithSelector(
                Marketplace(address(0)).initialize.selector,
                roleManagerAddress,
                feeManagerAddress
            )
        );
        return address(marketplaceProxy);
    }
    
    /**
     * @dev 部署代币持有者查询合约
     */
    function deployStep9_TokenHolderQuery() external returns (address) {
        TokenHolderQuery tokenHolderQueryImpl = new TokenHolderQuery();
        ERC1967Proxy tokenHolderQueryProxy = new ERC1967Proxy(
            address(tokenHolderQueryImpl),
            abi.encodeWithSelector(TokenHolderQuery(address(0)).initialize.selector)
        );
        return address(tokenHolderQueryProxy);
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
        RealEstateSystem systemImpl = new RealEstateSystem();
        ERC1967Proxy systemProxy = new ERC1967Proxy(
            address(systemImpl),
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
        return address(systemProxy);
    }
    
    /**
     * @dev 授予角色
     */
    function grantSuperAdminRole(address roleManagerAddress, address deployer) external {
        // 创建一个具有默认管理员角色的新的RoleManager实现
        RoleManager roleManagerImpl = new RoleManager();
        // 初始化新实现
        roleManagerImpl.initialize();
        
        // 首先确保部署者有DEFAULT_ADMIN_ROLE（在initialize中已经设置）
        // 然后为部署者授予SUPER_ADMIN角色
        bytes32 superAdminRole = roleManagerImpl.SUPER_ADMIN();
        roleManagerImpl.grantRole(superAdminRole, deployer);
        
        // 升级代理合约到新实现
        RoleManager(roleManagerAddress).upgradeTo(address(roleManagerImpl));
    }
} 