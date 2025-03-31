// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFixedTokenFactory {
    // 查询方法
    function getTokenAddress(string calldata propertyId) external view returns (address);
    function getPropertyIdFromToken(address tokenAddress) external view returns (string memory);
    function tokenImplementation() external view returns (address);
    
    // 代币创建方法
    function createSingleToken(
        string calldata _name, 
        string calldata _symbol, 
        string calldata _propertyId, 
        uint256 _initialSupply
    ) external returns (address);
    
    function createTokenPublic(
        string calldata propertyId,
        string calldata tokenName,
        string calldata tokenSymbol,
        uint256 initialSupply,
        uint256 maxSupply
    ) external returns (address);
    
    // 管理方法
    function roleManager() external view returns (address);
    function propertyRegistry() external view returns (address);
    function rentDistributorAddress() external view returns (address);
}
