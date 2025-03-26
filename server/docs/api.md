# API Documentation

## 概述

本文档详细说明了日本房地产代币化平台的后端API接口。所有API都遵循RESTful设计原则，使用JSON格式进行数据交换。

## 基础信息

- 基础URL: `http://localhost:3000/api/v1`
- 所有请求都需要在URL中包含API key: `?api_key=your_api_key`
- 示例: `http://localhost:3000/api/v1/properties?api_key=your_api_key`

## 认证

所有API请求都需要在URL中包含有效的API key。如果API key无效或缺失，将返回401错误。

错误响应示例:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid API key",
    "details": "Please provide a valid API key"
  }
}
```

## 房产管理

### 注册房产

```http
POST /properties?api_key=your_api_key
```

请求体:
```json
{
  "id": "string",
  "country": "JP",
  "metadataURI": "string",
  "owner": "string",
  "value": "string",
  "location": {
    "address": "string",
    "city": "string",
    "prefecture": "string"
  }
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "pending",
    "transactionHash": "string"
  }
}
```

### 获取房产列表

```http
GET /properties
```

查询参数:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)
- `status`: 状态过滤
- `owner`: 所有者过滤

响应:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "string",
        "status": "string",
        "owner": "string",
        "value": "string",
        "location": {
          "address": "string",
          "city": "string",
          "prefecture": "string"
        }
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

### 获取房产详情

```http
GET /properties/:id
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "owner": "string",
    "value": "string",
    "location": {
      "address": "string",
      "city": "string",
      "prefecture": "string"
    },
    "token": {
      "address": "string",
      "name": "string",
      "symbol": "string",
      "totalSupply": "string"
    }
  }
}
```

### 更新房产状态

```http
PATCH /properties/:id/status
```

请求体:
```json
{
  "status": "approved",
  "reason": "string"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "approved",
    "transactionHash": "string"
  }
}
```

## 代币管理

### 创建代币

```http
POST /tokens
```

请求体:
```json
{
  "propertyId": "string",
  "name": "string",
  "symbol": "string",
  "totalSupply": "string",
  "whitelist": ["string"]
}
```

响应:
```json
{
  "success": true,
  "data": {
    "address": "string",
    "propertyId": "string",
    "name": "string",
    "symbol": "string",
    "totalSupply": "string",
    "transactionHash": "string"
  }
}
```

### 获取代币列表

```http
GET /tokens
```

查询参数:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)
- `propertyId`: 房产ID过滤

响应:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "address": "string",
        "propertyId": "string",
        "name": "string",
        "symbol": "string",
        "totalSupply": "string"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

### 更新白名单

```http
PATCH /tokens/:address/whitelist
```

请求体:
```json
{
  "action": "add",
  "addresses": ["string"]
}
```

响应:
```json
{
  "success": true,
  "data": {
    "address": "string",
    "whitelist": ["string"],
    "transactionHash": "string"
  }
}
```

## 租金管理

### 分配租金

```http
POST /rents/distribute
```

请求体:
```json
{
  "tokenAddress": "string",
  "amount": "string",
  "period": "string"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "tokenAddress": "string",
    "amount": "string",
    "period": "string",
    "transactionHash": "string"
  }
}
```

### 获取租金分配记录

```http
GET /rents/distributions
```

查询参数:
- `tokenAddress`: 代币地址
- `startDate`: 开始日期
- `endDate`: 结束日期

响应:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "string",
        "tokenAddress": "string",
        "amount": "string",
        "period": "string",
        "timestamp": "string",
        "transactionHash": "string"
      }
    ],
    "total": 100
  }
}
```

### 领取租金

```http
POST /rents/claim
```

请求体:
```json
{
  "tokenAddress": "string",
  "period": "string"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "tokenAddress": "string",
    "amount": "string",
    "period": "string",
    "transactionHash": "string"
  }
}
```

## 赎回管理

### 请求赎回

```http
POST /redemptions
```

请求体:
```json
{
  "tokenAddress": "string",
  "amount": "string",
  "reason": "string"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "tokenAddress": "string",
    "amount": "string",
    "status": "pending",
    "transactionHash": "string"
  }
}
```

### 获取赎回请求列表

```http
GET /redemptions
```

查询参数:
- `tokenAddress`: 代币地址
- `status`: 状态过滤
- `requester`: 请求者地址

响应:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "string",
        "tokenAddress": "string",
        "amount": "string",
        "status": "string",
        "requester": "string",
        "timestamp": "string"
      }
    ],
    "total": 100
  }
}
```

### 处理赎回请求

```http
PATCH /redemptions/:id/status
```

请求体:
```json
{
  "status": "approved",
  "reason": "string"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "approved",
    "transactionHash": "string"
  }
}
```

## 错误响应

所有API在发生错误时会返回以下格式:

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "string"
  }
}
```

常见错误代码:
- `AUTH_001`: 认证失败
- `AUTH_002`: Token过期
- `AUTH_003`: 权限不足
- `PROP_001`: 房产不存在
- `PROP_002`: 房产状态错误
- `TOKEN_001`: 代币不存在
- `TOKEN_002`: 白名单错误
- `RENT_001`: 租金分配失败
- `RENT_002`: 租金领取失败
- `REDEM_001`: 赎回请求不存在
- `REDEM_002`: 赎回状态错误

## 使用示例

### 1. 注册房产

```javascript
const response = await fetch('http://localhost:3000/api/v1/properties?api_key=your_api_key', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 'PROP001',
    country: 'JP',
    metadataURI: 'ipfs://...',
    owner: '0x...',
    value: '1000000000000000000',
    location: {
      address: '1-1-1',
      city: 'Tokyo',
      prefecture: 'Tokyo'
    }
  })
});

const data = await response.json();
```

### 2. 创建代币

```javascript
const response = await fetch('http://localhost:3000/api/v1/tokens?api_key=your_api_key', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    propertyId: 'PROP001',
    name: 'Property Token',
    symbol: 'PT',
    totalSupply: '1000000000000000000',
    whitelist: ['0x...']
  })
});

const data = await response.json();
```

### 3. 分配租金

```javascript
const response = await fetch('http://localhost:3000/api/v1/rents/distribute?api_key=your_api_key', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tokenAddress: '0x...',
    amount: '100000000000000000',
    period: '2024-03'
  })
});

const data = await response.json();
```

## 注意事项

1. 所有金额相关的字段都使用字符串格式，以支持大数字
2. 时间戳使用ISO 8601格式
3. 地址使用小写格式
4. 所有API都需要认证，除了登录和刷新token接口
5. 建议在请求失败时实现重试机制
6. 注意处理网络超时情况
7. 建议实现请求限流机制 