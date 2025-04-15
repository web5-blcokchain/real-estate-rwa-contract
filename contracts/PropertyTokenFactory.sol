// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./PropertyToken.sol";
import "./RealEstateSystem.sol";
import "./utils/RoleConstants.sol";

/**
 * @title PropertyTokenFactory - 日本房地产代币工厂合约
 * @author Fashi Shijian团队
 * @notice 本合约负责创建和管理房产代币，提供标准化的代币创建流程
 * 
 * @dev 合约功能描述：
 * 1. 代币创建：提供标准化的代币创建接口，确保所有代币符合系统规范
 * 2. 代币注册：跟踪系统中所有创建的代币，维护代币到房产的映射关系
 * 3. 实现管理：管理代币实现合约地址，支持未来升级
 * 4. 元数据存储：保存代币相关信息，如名称、符号、初始供应量等
 * 
 * @dev 工厂模式说明：
 * - 采用工厂模式标准化代币创建流程
 * - 确保所有代币遵循相同的初始化逻辑和配置
 * - 简化代币部署和管理过程
 * - 支持代币实现的版本控制和升级
 * 
 * @dev 与其他模块的关联：
 * - RealEstateSystem：依赖核心系统合约进行权限验证
 * - PropertyToken：创建此类型的代币实例
 * - PropertyManager：为房产管理合约提供代币创建服务
 * 
 * @dev 权限控制：
 * - ADMIN：可更新系统引用、暂停/恢复工厂功能、升级合约
 * - OPERATOR：可创建新代币，管理代币信息
 * 
 * @dev 安全考虑：
 * - 可暂停功能，应对紧急情况
 * - 权限验证确保只有授权角色可以创建代币
 * - 代币创建事件记录，便于审计和追踪
 * 
 * @dev 使用流程：
 * 1. 通过PropertyManager注册房产
 * 2. PropertyManager调用本合约创建对应代币
 * 3. 代币初始化并与房产ID关联
 * 4. 代币信息记录在工厂合约中
 */
contract PropertyTokenFactory is Initializable, UUPSUpgradeable, PausableUpgradeable, AccessControlUpgradeable {
    using RoleConstants for bytes32;
    
    RealEstateSystem public system;
    address public implementation;
    mapping(address => PropertyToken.TokenInfo) public tokenInfos;

    function initialize(address _implementation) public initializer {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __AccessControl_init();
        implementation = _implementation;
    }

    function setSystem(address _systemAddress) external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        system = RealEstateSystem(_systemAddress);
    }

    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _pause();
    }

    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override {
        system.validateRole(RoleConstants.ADMIN_ROLE(), msg.sender, "Caller is not an admin");
    }

    function createToken(
        string memory propertyId,
        uint256 initialSupply,
        string memory name,
        string memory symbol
    ) external whenNotPaused returns (address) {
        system.validateRole(RoleConstants.OPERATOR_ROLE(), msg.sender, "Caller is not an operator");
        PropertyToken token = new PropertyToken();
        token.initialize(
            system,
            propertyId,
            initialSupply,
            name,
            symbol
        );
        tokenInfos[address(token)] = PropertyToken.TokenInfo(
            name,
            symbol,
            initialSupply,
            0,  // price
            0,  // minInvestment
            0,  // maxInvestment
            0   // lockupPeriod
        );
        return address(token);
    }

    function getTokenInfo(address tokenAddress) external view returns (PropertyToken.TokenInfo memory) {
        return tokenInfos[tokenAddress];
    }
} 