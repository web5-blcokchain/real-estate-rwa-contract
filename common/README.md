# 通用工具模块 (Common Utilities)

本目录包含日本房地产代币化平台的通用工具模块，为整个系统提供基础设施支持，包括区块链交互、环境变量管理、日志记录、路径管理等功能。这些模块设计为高内聚、低耦合的工具类，可被项目中的任何组件使用。

## 目录结构

```
common/
├── blockchain/               # 区块链交互工具
│   ├── address.js           # 以太坊地址工具
│   ├── abi.js               # ABI相关工具
│   ├── contract.js          # 智能合约交互工具
│   ├── provider.js          # 网络提供者管理
│   ├── wallet.js            # 钱包管理工具
│   ├── utils.js             # 区块链辅助工具
│   ├── constants.js         # 区块链常量定义
│   └── index.js             # 区块链工具入口
├── env.js                    # 环境变量管理工具
├── logger.js                 # 日志记录工具
├── paths.js                  # 路径管理工具
├── utils.js                  # 通用辅助工具
└── index.js                  # 入口文件，聚合导出所有工具
```

## 核心模块

### 入口模块 (index.js)

入口文件负责聚合导出所有通用工具，使其他组件可以通过统一的入口访问所有功能。

```javascript
// 示例用法
const { Logger, EnvUtils, ContractUtils } = require('../common');

// 记录日志
Logger.info('系统启动成功');

// 获取环境变量
const apiKey = EnvUtils.getString('API_KEY');

// 使用合约工具
const contract = ContractUtils.getContractInstance('RealEstateFacade');
```

### 区块链工具模块 (blockchain/)

提供与以太坊区块链交互的完整工具集，包括地址校验、ABI处理、合约交互、钱包管理等功能。

#### 主要组件

- **AddressUtils**: 提供以太坊地址的验证、格式化和处理功能
- **AbiUtils**: 处理智能合约ABI的加载、解析和使用
- **ContractUtils**: 负责智能合约的实例化、交互和事件处理
- **ProviderManager**: 管理不同网络的RPC提供者
- **WalletManager**: 管理不同角色的钱包和签名者
- **BlockchainUtils**: 提供哈希计算、交易解析等辅助功能

#### 关键功能

1. **合约交互**
   ```javascript
   // 获取合约实例
   const contract = ContractUtils.getContractForController('RealEstateFacade', 'admin');
   
   // 调用合约方法
   const tx = await contract.registerProperty('12345', 'JP', ...);
   
   // 等待交易确认
   const receipt = await ContractUtils.waitForTransaction(tx);
   ```

2. **钱包管理**
   ```javascript
   // 获取不同角色的钱包
   const adminWallet = WalletManager.getRoleWallet('admin');
   const managerWallet = WalletManager.getRoleWallet('manager');
   
   // 签名消息
   const signature = await WalletManager.signMessage(message, 'admin');
   ```

3. **地址处理**
   ```javascript
   // 验证地址
   const isValid = AddressUtils.isValid(address);
   
   // 格式化地址为校验和格式
   const checksumAddress = AddressUtils.toChecksum(address);
   ```

### 环境变量管理 (env.js)

`EnvUtils` 类提供统一的环境变量访问接口，支持不同类型的环境变量读取，以及默认值设置。

#### 主要功能

- 统一管理所有系统环境变量键名（`ENV_KEYS`）
- 支持字符串、数字、布尔值、数组和JSON类型的环境变量
- 为不同区块链网络提供配置

#### 关键方法

- `getString(key, defaultValue)`: 获取字符串类型环境变量
- `getNumber(key, defaultValue)`: 获取数字类型环境变量
- `getBoolean(key, defaultValue)`: 获取布尔类型环境变量
- `getArray(key, defaultValue)`: 获取数组类型环境变量
- `getJson(key, defaultValue)`: 获取JSON类型环境变量
- `getCurrentNetwork()`: 获取当前区块链网络名称
- `getNetworkConfig(network)`: 获取指定网络的配置
- `getContractAddress(contractName)`: 获取合约地址

#### 使用示例

```javascript
// 获取API密钥
const apiKey = EnvUtils.getString('API_KEY', '默认密钥');

// 获取端口号
const port = EnvUtils.getNumber('PORT', 3000);

// 获取当前网络信息
const network = EnvUtils.getCurrentNetwork();
const networkConfig = EnvUtils.getNetworkConfig();

// 获取合约地址
const facadeAddress = EnvUtils.getContractAddress('RealEstateFacade');
```

### 日志工具 (logger.js)

`Logger` 类提供统一的日志记录接口，基于 winston 库实现，支持多级别日志和多目标输出。

#### 日志级别

- **ERROR**: 错误信息，表示应用程序遇到了严重问题
- **WARN**: 警告信息，表示潜在问题或不正常情况
- **INFO**: 一般信息，记录应用程序的正常运行状态
- **HTTP**: HTTP请求相关日志
- **VERBOSE**: 详细信息，比INFO更详细的状态信息
- **DEBUG**: 调试信息，用于开发和故障排查
- **SILLY**: 最详细的调试信息

#### 日志输出

- **控制台**: 彩色格式化输出，适合开发环境
- **错误日志文件**: 仅记录错误级别的日志，位于 `logs/error.log`
- **综合日志文件**: 记录所有级别的日志，位于 `logs/combined.log`

#### 使用示例

```javascript
// 记录不同级别的日志
Logger.error('发生错误', { error: err.message, stack: err.stack });
Logger.warn('警告信息', { component: 'PropertyManager' });
Logger.info('操作成功', { userId: '12345', action: 'registerProperty' });
Logger.debug('调试信息', { params: req.body });

// 带附加元数据的日志
Logger.info('用户登录', {
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### 路径管理 (paths.js)

`Paths` 类提供统一的项目路径管理，确保在不同环境下路径的一致性。

#### 主要路径常量

- **ROOT**: 项目根目录
- **COMMON**: common目录
- **SERVER**: server目录
- **CONTROLLERS**: controllers目录
- **MIDDLEWARE**: middleware目录
- **ROUTES**: routes目录
- **CONTRACTS**: contracts目录
- **ARTIFACTS**: artifacts目录
- **LOGS**: logs目录

#### 路径工具方法

- `getModulePath(basePath, modulePath)`: 获取模块的绝对路径
- `getCommonModule(modulePath)`: 获取common目录中模块的绝对路径
- `getControllerModule(modulePath)`: 获取controller目录中模块的绝对路径
- `getMiddlewareModule(modulePath)`: 获取middleware目录中模块的绝对路径

#### 使用示例

```javascript
// 获取项目中的文件路径
const configPath = path.join(Paths.ROOT, 'config.json');
const logPath = path.join(Paths.LOGS, 'app.log');

// 获取模块路径
const middlewarePath = Paths.getMiddlewareModule('auth.js');
```

## 集成与使用

### 初始化流程

系统启动时的通用工具初始化流程：

1. 首先加载环境变量（通过EnvUtils）
2. 初始化日志系统（Logger）
3. 建立与区块链网络的连接（Blockchain模块）
4. 准备好其他工具的运行环境

### 在HTTP服务器中使用

```javascript
const express = require('express');
const { Logger, EnvUtils, ContractUtils } = require('../common');

const app = express();

// 使用环境变量
const port = EnvUtils.getNumber('PORT', 3000);

// 添加中间件
app.use((req, res, next) => {
  Logger.http(`${req.method} ${req.url}`, { ip: req.ip });
  next();
});

// 使用合约工具
app.post('/api/property/register', async (req, res) => {
  try {
    const contract = ContractUtils.getContractForController('RealEstateFacade', 'admin');
    const tx = await contract.registerProperty(req.body.propertyId, req.body.country, ...);
    const receipt = await ContractUtils.waitForTransaction(tx);
    
    res.json({ success: true, txHash: receipt.hash });
  } catch (error) {
    Logger.error('注册房产失败', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  Logger.info(`服务器已启动，端口: ${port}`);
});
```

### 在合约脚本中使用

```javascript
const { Blockchain, Logger, EnvUtils } = require('../common');

async function deployContracts() {
  try {
    // 获取部署钱包
    const wallet = Blockchain.WalletManager.getRoleWallet('admin');
    Logger.info(`使用地址 ${wallet.address} 部署合约`);
    
    // 部署RealEstateFacade合约
    const facadeFactory = await ethers.getContractFactory('RealEstateFacade', wallet);
    const facade = await facadeFactory.deploy();
    await facade.deployed();
    
    Logger.info(`RealEstateFacade部署成功: ${facade.address}`);
    
    // 将地址保存到.env文件或其他配置中
    // ...
    
    return { facadeAddress: facade.address };
  } catch (error) {
    Logger.error('部署合约失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

// 执行部署
deployContracts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

## 最佳实践

### 日志记录

1. **合理使用日志级别**
   - ERROR: 只用于真正的错误情况
   - INFO: 用于记录重要业务事件
   - DEBUG: 仅在开发环境使用

2. **包含上下文信息**
   - 在日志中包含相关的元数据
   - 记录可用于故障排查的信息

3. **敏感信息处理**
   - 不要记录私钥、密码等敏感信息
   - 对长字符串和大对象进行截断

### 环境变量管理

1. **使用类型化的getter方法**
   - 根据变量类型选择对应的方法
   - 总是提供合理的默认值

2. **中心化定义键名**
   - 所有键名都在ENV_KEYS中定义
   - 避免直接使用字符串键名

3. **网络配置分离**
   - 不同网络的配置相互独立
   - 配置相关功能集中在env.js

### 区块链交互

1. **错误处理与重试**
   - 捕获并适当处理区块链交互错误
   - 对可恢复的错误实现重试逻辑

2. **使用适当角色**
   - 选择操作所需的最小权限角色
   - 不同操作使用不同的钱包

3. **优化性能**
   - 适当缓存Provider和合约实例
   - 批量处理多个操作

## 扩展与定制

### 添加新工具

要添加新的通用工具，建议遵循以下步骤：

1. 在appropriate目录创建新的工具类文件
2. 实现为静态类或实例化类
3. 在index.js中导出新工具
4. 更新文档，描述工具的功能和用法

### 自定义日志格式

可以通过修改logger.js中的配置来自定义日志格式：

```javascript
// 自定义日志格式
const customFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`;
});

// 在创建logger时使用自定义格式
new winston.transports.Console({
  format: format.combine(
    format.colorize(),
    customFormat
  )
})
```

### 添加新的区块链网络

要添加对新区块链网络的支持：

1. 在env.js的getNetworkConfig方法中添加新网络配置
2. 确保提供所有必要的配置项（RPC URL、Chain ID等）
3. 在blockchain/provider.js中处理新网络的特殊要求

## 故障排除

### 常见问题

1. **环境变量未加载**
   - 检查.env文件是否存在于项目根目录
   - 确认dotenv已正确配置

2. **日志文件未创建**
   - 检查logs目录是否具有写入权限
   - 验证logger.js中的路径配置

3. **区块链连接失败**
   - 检查网络RPC URL是否正确
   - 确认网络是否可访问
   - 查看钱包私钥是否正确配置

### 调试技巧

1. **启用详细日志**
   - 设置环境变量 `LOG_LEVEL=debug`
   - 查看logs/combined.log获取详细信息

2. **区块链交互调试**
   - 使用ethers.js的Logger功能
   - 启用Provider的调试模式

## 安全考量

1. **私钥管理**
   - 生产环境不应在.env文件中存储私钥
   - 考虑使用密钥管理服务或硬件钱包

2. **环境变量保护**
   - 限制.env文件的访问权限
   - 不要将.env文件提交到版本控制系统

3. **日志敏感信息**
   - 过滤日志中的敏感信息
   - 对API密钥和私钥等内容进行遮蔽 