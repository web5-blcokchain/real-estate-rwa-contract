# 日本房产通证化系统API文档

本文档详细描述了系统中各个合约提供的主要函数接口，供开发者集成和调用。

## 1. RealEstateSystem

系统的主合约，负责管理和协调其他合约。

### 1.1 查询函数

#### getSystemContracts
获取系统中所有合约的地址。

```solidity
function getSystemContracts() external view returns (address[] memory)
```

### `initialize()`
初始化系统合约。

### `setSystemStatus(bool _active)`
设置系统状态。

### `getSystemContracts()`
获取系统中所有合约的地址。

### `upgradeContract(string memory contractName, address newImplementation)`
升级指定合约的实现。

## PropertyRegistry

### `registerProperty(string memory _propertyId, string memory _country, string memory _metadataURI)`
注册新房产。

### `approveProperty(string memory _propertyId)`
审核通过房产。

### `rejectProperty(string memory _propertyId)`
拒绝房产注册。

### `updatePropertyStatus(string memory _propertyId, PropertyStatus _status)`
更新房产状态。

## TokenFactory

### `createToken(string memory _name, string memory _symbol, string memory _propertyId, uint256 _initialSupply)`
为房产创建代币。

## Marketplace

### `createOrder(address tokenAddress, uint256 tokenAmount, uint256 price, address stablecoinAddress)`
创建销售订单。

### `fulfillOrder(uint256 orderId)`
完成订单交易。

### `cancelOrder(uint256 orderId)`
取消销售订单。

## RentDistributor

### `createDistribution(string memory _propertyId, address _tokenAddress, address _stablecoinAddress, uint256 _totalAmount)`
创建租金分配。

### `claimRent(uint256 distributionId)`
领取租金。

## RedemptionManager

### `initiateRedemption(string memory _propertyId, address _tokenAddress, address _stablecoinAddress, uint256 _redemptionAmount)`
发起赎回流程。

### `requestRedemption(string memory _propertyId, uint256 _tokenAmount)`
请求赎回代币。