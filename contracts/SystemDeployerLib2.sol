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
        address tokenImplementationAddress
    ) external returns (address) {
        TokenFactory impl = new TokenFactory();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(
                TokenFactory(address(0)).initialize.selector,
                roleManagerAddress,
                propertyRegistryAddress,
                tokenImplementationAddress
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
    function deployStep9_TokenHolderQuery() external returns (address) {
        TokenHolderQuery impl = new TokenHolderQuery();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(TokenHolderQuery(address(0)).initialize.selector)
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