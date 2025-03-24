// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./RoleManager.sol";
import "./FeeManager.sol";
import "./PropertyRegistry.sol";
import "./RentDistributor.sol";
import "./RealEstateToken.sol";

/**
 * @title SystemDeployerLib1
 * @dev 包含部署步骤1-5的库合约
 */
library SystemDeployerLib1 {
    /**
     * @dev 部署角色管理合约
     */
    function deployStep1_RoleManager() external returns (address) {
        RoleManager roleManagerImpl = new RoleManager();
        ERC1967Proxy roleManagerProxy = new ERC1967Proxy(
            address(roleManagerImpl),
            abi.encodeWithSelector(RoleManager(address(0)).initialize.selector)
        );
        return address(roleManagerProxy);
    }
    
    /**
     * @dev 部署费用管理合约
     */
    function deployStep2_FeeManager(address roleManagerAddress) external returns (address) {
        FeeManager feeManagerImpl = new FeeManager();
        ERC1967Proxy feeManagerProxy = new ERC1967Proxy(
            address(feeManagerImpl),
            abi.encodeWithSelector(FeeManager(address(0)).initialize.selector, roleManagerAddress)
        );
        return address(feeManagerProxy);
    }
    
    /**
     * @dev 部署房产注册合约
     */
    function deployStep3_PropertyRegistry(address roleManagerAddress) external returns (address) {
        PropertyRegistry propertyRegistryImpl = new PropertyRegistry();
        ERC1967Proxy propertyRegistryProxy = new ERC1967Proxy(
            address(propertyRegistryImpl),
            abi.encodeWithSelector(PropertyRegistry(address(0)).initialize.selector, roleManagerAddress)
        );
        return address(propertyRegistryProxy);
    }
    
    /**
     * @dev 部署租金分发合约
     */
    function deployStep4_RentDistributor(address roleManagerAddress) external returns (address) {
        RentDistributor rentDistributorImpl = new RentDistributor();
        ERC1967Proxy rentDistributorProxy = new ERC1967Proxy(
            address(rentDistributorImpl),
            abi.encodeWithSelector(RentDistributor(address(0)).initialize.selector, roleManagerAddress)
        );
        return address(rentDistributorProxy);
    }
    
    /**
     * @dev 部署代币实现合约
     */
    function deployStep5_TokenImplementation() external returns (address) {
        RealEstateToken tokenImpl = new RealEstateToken();
        return address(tokenImpl);
    }
} 