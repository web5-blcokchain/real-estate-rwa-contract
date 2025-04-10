// ADMIN_ROLE 权限
function setSystem(address _systemAddress) external {
    system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
    require(_systemAddress != address(0), "System address cannot be zero");
    system = RealEstateSystem(_systemAddress);
}

function pause() external {
    system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
    _pause();
}

function unpause() external {
    system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
    _unpause();
}

function _authorizeUpgrade(address newImplementation) internal override {
    system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
}

// OPERATOR_ROLE 权限
function createToken(
    string calldata name,
    string calldata symbol,
    uint256 initialSupply
) external returns (address) {
    system.validateRole(RoleConstants.OPERATOR_ROLE, msg.sender);
    // ... existing implementation ...
}

// 用户操作（不需要角色权限）
function getTokenInfo(address tokenAddress) external view returns (PropertyToken.TokenInfo memory) {
    require(tokenAddress != address(0), "Invalid token address");
    return PropertyToken(tokenAddress).getTokenInfo();
} 