// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFixedPropertyRegistry {
    // 状态枚举
    enum PropertyStatus {
        NotRegistered,
        Pending,
        Approved,
        Rejected,
        Delisted,
        Redemption,
        Frozen
    }
    
    // 检查方法
    function isPropertyApproved(string calldata propertyId) external view returns (bool);
    function propertyExists(string calldata propertyId) external view returns (bool);
    function isAuthorizedContract(address contractAddress) external view returns (bool);
    
    // 添加授权合约
    function addAuthorizedContract(address contractAddress) external;
    
    // 房产登记和状态管理
    function registerProperty(string calldata propertyId, string calldata country, string calldata metadataURI) external;
    function approveProperty(string calldata propertyId) external;
    function rejectProperty(string calldata propertyId) external;
    function getPropertyStatus(string calldata propertyId) external view returns (PropertyStatus);
    
    // 代币相关
    function registerTokenForProperty(string calldata propertyId, address tokenAddress) external;
    function RealEstateTokens(string calldata) external view returns (address);
    
    // 管理方法
    function roleManager() external view returns (address);
    function version() external view returns (uint256);
}
