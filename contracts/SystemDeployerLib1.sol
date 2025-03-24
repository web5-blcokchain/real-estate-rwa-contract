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
     * @dev 创建代理并初始化
     * @param _logic 实现合约地址
     * @param _data 初始化数据
     */
    function _deployProxy(address _logic, bytes memory _data) private returns (address) {
        return address(new ERC1967Proxy(_logic, _data));
    }

    /**
     * @dev 部署角色管理合约
     */
    function deployStep1_RoleManager() external returns (address) {
        RoleManager impl = new RoleManager();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(RoleManager(address(0)).initialize.selector)
        );
    }
    
    /**
     * @dev 部署费用管理合约
     */
    function deployStep2_FeeManager(address roleManagerAddress) external returns (address) {
        FeeManager impl = new FeeManager();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(FeeManager(address(0)).initialize.selector, roleManagerAddress)
        );
    }
    
    /**
     * @dev 部署房产注册合约
     */
    function deployStep3_PropertyRegistry(address roleManagerAddress) external returns (address) {
        PropertyRegistry impl = new PropertyRegistry();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(PropertyRegistry(address(0)).initialize.selector, roleManagerAddress)
        );
    }
    
    /**
     * @dev 部署租金分发合约
     */
    function deployStep4_RentDistributor(address roleManagerAddress) external returns (address) {
        RentDistributor impl = new RentDistributor();
        return _deployProxy(
            address(impl),
            abi.encodeWithSelector(RentDistributor(address(0)).initialize.selector, roleManagerAddress)
        );
    }
    
    /**
     * @dev 部署代币实现合约
     */
    function deployStep5_TokenImplementation() external returns (address) {
        return address(new RealEstateToken());
    }
} 