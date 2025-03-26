# API 文档

## 服务类 API

### BaseContractService

基础合约服务类,提供通用的合约交互功能。

#### 构造函数

```javascript
constructor(config)
```

参数:
- `config`: 配置对象,包含网络、合约等信息

#### 方法

##### initialize()

初始化 provider 和 signer。

```javascript
async initialize()
```

返回值:
- Promise<void>

##### getContract(name, address, abi)

获取合约实例。

```javascript
async getContract(name, address, abi)
```

参数:
- `name`: 合约名称
- `address`: 合约地址
- `abi`: 合约 ABI

返回值:
- Promise<Contract>

##### waitForTransaction(tx)

等待交易确认。

```javascript
async waitForTransaction(tx)
```

参数:
- `tx`: 交易对象

返回值:
- Promise<TransactionReceipt>

### PropertyRegistryService

房产注册服务类,继承自 BaseContractService。

#### 方法

##### registerProperty(propertyData)

注册房产。

```javascript
async registerProperty(propertyData)
```

参数:
```javascript
{
    name: string,           // 房产名称
    location: string,       // 位置
    price: number,         // 价格
    size: number,          // 面积
    description: string,   // 描述
    features: string[],    // 特征
    images: string[],      // 图片
    documents: string[]    // 文档
}
```

返回值:
- Promise<TransactionReceipt>

##### approveProperty(propertyName)

审批房产。

```javascript
async approveProperty(propertyName)
```

参数:
- `propertyName`: 房产名称

返回值:
- Promise<TransactionReceipt>

##### getProperty(propertyName)

获取房产信息。

```javascript
async getProperty(propertyName)
```

参数:
- `propertyName`: 房产名称

返回值:
- Promise<Property>

### TokenFactoryService

代币工厂服务类,继承自 BaseContractService。

#### 方法

##### createToken(tokenData)

创建代币。

```javascript
async createToken(tokenData)
```

参数:
```javascript
{
    name: string,           // 代币名称
    symbol: string,         // 代币符号
    decimals: number,       // 精度
    totalSupply: number,    // 总供应量
    propertyId: string,     // 房产ID
    price: number          // 价格
}
```

返回值:
- Promise<TransactionReceipt>

##### getTokenAddress(propertyId)

获取代币地址。

```javascript
async getTokenAddress(propertyId)
```

参数:
- `propertyId`: 房产ID

返回值:
- Promise<string>

##### isToken(tokenAddress)

检查代币是否存在。

```javascript
async isToken(tokenAddress)
```

参数:
- `tokenAddress`: 代币地址

返回值:
- Promise<boolean>

### RealEstateTokenService

房地产代币服务类,继承自 BaseContractService。

#### 方法

##### addToWhitelist(address)

添加白名单。

```javascript
async addToWhitelist(address)
```

参数:
- `address`: 用户地址

返回值:
- Promise<TransactionReceipt>

##### removeFromWhitelist(address)

移除白名单。

```javascript
async removeFromWhitelist(address)
```

参数:
- `address`: 用户地址

返回值:
- Promise<TransactionReceipt>

##### isWhitelisted(address)

检查白名单。

```javascript
async isWhitelisted(address)
```

参数:
- `address`: 用户地址

返回值:
- Promise<boolean>

## 工具类 API

### ConfigManager

配置管理类。

#### 构造函数

```javascript
constructor()
```

#### 方法

##### initialize()

初始化配置。

```javascript
async initialize()
```

返回值:
- Promise<void>

##### getNetwork(name)

获取网络配置。

```javascript
getNetwork(name)
```

参数:
- `name`: 网络名称

返回值:
- NetworkConfig

##### getContract(name)

获取合约配置。

```javascript
getContract(name)
```

参数:
- `name`: 合约名称

返回值:
- ContractConfig

### EventManager

事件管理类。

#### 构造函数

```javascript
constructor()
```

#### 方法

##### on(event, callback)

注册事件监听器。

```javascript
on(event, callback)
```

参数:
- `event`: 事件名称
- `callback`: 回调函数

返回值:
- void

##### emit(event, data)

触发事件。

```javascript
emit(event, data)
```

参数:
- `event`: 事件名称
- `data`: 事件数据

返回值:
- void

##### removeListener(event, callback)

移除事件监听器。

```javascript
removeListener(event, callback)
```

参数:
- `event`: 事件名称
- `callback`: 回调函数

返回值:
- void

### CacheManager

缓存管理类。

#### 构造函数

```javascript
constructor()
```

#### 方法

##### set(key, value, ttl)

设置缓存。

```javascript
set(key, value, ttl)
```

参数:
- `key`: 缓存键
- `value`: 缓存值
- `ttl`: 过期时间(毫秒)

返回值:
- void

##### get(key)

获取缓存。

```javascript
get(key)
```

参数:
- `key`: 缓存键

返回值:
- any

##### delete(key)

删除缓存。

```javascript
delete(key)
```

参数:
- `key`: 缓存键

返回值:
- void

## 错误处理

### TestError

测试错误类。

#### 构造函数

```javascript
constructor(message, code)
```

参数:
- `message`: 错误信息
- `code`: 错误代码

#### 属性

- `message`: 错误信息
- `code`: 错误代码
- `stack`: 错误堆栈

## 事件

### 测试事件

- `TEST_COMPLETED`: 测试完成
- `TEST_FAILED`: 测试失败
- `TEST_STARTED`: 测试开始
- `TEST_PROGRESS`: 测试进度

### 合约事件

- `PROPERTY_REGISTERED`: 房产注册
- `PROPERTY_APPROVED`: 房产审批
- `TOKEN_CREATED`: 代币创建
- `TOKEN_TRANSFERRED`: 代币转账
- `WHITELIST_ADDED`: 添加白名单
- `WHITELIST_REMOVED`: 移除白名单

## 配置

### 网络配置

```javascript
{
    name: string,           // 网络名称
    chainId: number,        // 链ID
    rpcUrl: string,        // RPC URL
    explorerUrl: string,   // 区块浏览器URL
    gasLimit: number,      // Gas限制
    gasPrice: number       // Gas价格
}
```

### 合约配置

```javascript
{
    name: string,           // 合约名称
    address: string,        // 合约地址
    abi: any[],            // 合约ABI
    bytecode: string       // 合约字节码
}
```

### 环境配置

```javascript
{
    network: string,        // 网络名称
    privateKey: string,     // 私钥
    mnemonic: string,      // 助记词
    accounts: string[]     // 账户列表
}
``` 