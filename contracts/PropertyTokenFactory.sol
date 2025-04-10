function setSystem(address _systemAddress) external {
    system.validateRole(RoleConstants.ADMIN_ROLE, msg.sender);
    require(_systemAddress != address(0), "System address cannot be zero");
    system = RealEstateSystem(_systemAddress);
} 