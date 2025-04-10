// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./PropertyToken.sol";
import "./RealEstateSystem.sol";
import "./utils/RoleConstants.sol";

contract PropertyTokenFactory is Initializable, UUPSUpgradeable, PausableUpgradeable, AccessControlUpgradeable {
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
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender, "Caller is not an admin");
        system = RealEstateSystem(_systemAddress);
    }

    function pause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender, "Caller is not an admin");
        _pause();
    }

    function unpause() external {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender, "Caller is not an admin");
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override {
        system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender, "Caller is not an admin");
    }

    function createToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 price,
        uint256 minInvestment,
        uint256 maxInvestment,
        uint256 lockupPeriod
    ) external whenNotPaused returns (address) {
        system.validateRole(RoleConstants.OPERATOR_ROLE, msg.sender, "Caller is not an operator");
        PropertyToken token = new PropertyToken();
        token.initialize(
            name,
            symbol,
            totalSupply,
            price,
            minInvestment,
            maxInvestment,
            lockupPeriod
        );
        tokenInfos[address(token)] = PropertyToken.TokenInfo(
            name,
            symbol,
            totalSupply,
            price,
            minInvestment,
            maxInvestment,
            lockupPeriod
        );
        return address(token);
    }

    function getTokenInfo(address tokenAddress) external view returns (PropertyToken.TokenInfo memory) {
        return tokenInfos[tokenAddress];
    }
} 