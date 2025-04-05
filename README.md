# 日本房地产代币化平台 (Japan Real Estate Tokenization Platform)

## 项目概述

本项目实现了基于区块链的房地产代币化平台，专注于日本房地产市场，使投资者能够通过智能合约以更灵活、透明的方式参与房地产投资。系统支持房产代币化、交易、收益分配等全流程操作。

### 核心功能

- **房地产代币化**：将房产资产转换为区块链上可交易的代币
- **交易管理**：支持代币的买卖、转让和交易记录追踪
- **收益分配**：自动化的租金收益和分红发放系统
- **权限控制**：多级角色权限管理
- **可升级合约**：支持合约升级以适应未来需求变化
- **系统监控**：区块链交易监控和系统状态追踪

## 技术栈

- **智能合约**：Solidity 0.8.20
- **开发框架**：Hardhat
- **网络库**：ethers.js V6
- **测试框架**：Mocha, Chai
- **API服务器**：Express.js
- **日志系统**：Winston
- **文档工具**：Swagger

## 项目结构

```
├── contracts/             # 智能合约代码
│   ├── RealEstateFacade.sol    # 系统门面合约
│   ├── RealEstateSystem.sol    # 核心系统合约
│   ├── PropertyManager.sol     # 房产管理合约
│   ├── PropertyToken.sol       # 房产代币合约
│   ├── TradingManager.sol      # 交易管理合约
│   ├── RewardManager.sol       # 收益管理合约
│   ├── RoleManager.sol         # 角色权限管理合约
│   └── utils/                 # 工具合约和库
├── scripts/               # 部署和管理脚本
├── shared/                # 共享代码库
│   └── src/
│       ├── config/        # 配置管理
│       ├── utils/         # 工具函数
│       └── logger.js      # 日志系统
├── http-server/           # REST API服务器
├── config/                # 项目配置
│   └── abi/              # 合约ABI目录
├── test/                  # 测试代码
├── docs/                  # 项目文档
└── logs/                  # 日志文件
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- Yarn >= 1.22.0
- Git

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-org/japan-rwa.git
cd japan-rwa

# 安装依赖
yarn install
```

### 环境配置

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，设置必要的环境变量：
   - 区块链节点RPC URL
   - 部署私钥
   - 合约初始化参数
   - 其他配置项

### 合约编译

```bash
# 编译所有合约
yarn compile

# 清理缓存并重新编译
yarn hardhat clean && yarn compile
```

### 本地开发

```bash
# 启动本地测试节点
yarn start:node

# 部署到本地网络
yarn deploy:local

# 验证部署
yarn hardhat run scripts/verify-deployment.js --network localhost
```

### 测试

```bash
# 运行所有测试
yarn test

# 生成测试覆盖率报告
yarn test:coverage
```

### 部署

```bash
# 部署到测试网
yarn deploy:testnet

# 部署到主网
yarn deploy:mainnet

# 验证测试网部署
yarn verify:testnet

# 验证主网部署
yarn verify:mainnet
```

### API服务器

```bash
# 启动HTTP服务器
yarn dev:http
```

详细文档请参阅 [http-server/README.md](./http-server/README.md)

## 模块文档

- [合约架构设计](./docs/architecture.md)
- [共享模块文档](./shared/README.md)
- [配置说明](./config/README.md)
- [HTTP API服务器](./http-server/README.md)
- [部署指南](./docs/deployment.md)

## 合约架构

系统由以下主要合约组成：

1. **RealEstateFacade** - 统一入口，提供所有业务操作接口
2. **RealEstateSystem** - 核心系统合约，管理各组件状态
3. **PropertyManager** - 管理房产资产信息和状态
4. **PropertyToken** - 实现房产代币化功能
5. **TradingManager** - 管理代币交易和订单系统
6. **RewardManager** - 管理收益分配和分红
7. **RoleManager** - 管理系统角色和权限

## 部署流程

部署系统的完整步骤：

1. 部署 `RoleManager` 合约
2. 部署 `PropertyManager` 合约
3. 部署 `PropertyToken` 合约
4. 部署 `TradingManager` 合约
5. 部署 `RewardManager` 合约
6. 部署 `RealEstateSystem` 合约
7. 部署 `RealEstateFacade` 合约
8. 设置各合约之间的引用关系

详细的部署流程可在 [scripts/deploy-step.js](./scripts/deploy-step.js) 中查看。

## 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT © [Your Organization]

## 日志管理工具

项目包含以下日志管理和分析工具，位于`server/scripts`目录：

### 日志生成工具

用于生成测试日志数据，以便测试日志分析功能。

```bash
# 生成测试日志
node server/scripts/generate-test-logs.js [日志数量] [输出文件路径]

# 示例：生成500条日志记录
node server/scripts/generate-test-logs.js 500 
```

### 日志分析工具

用于分析API请求日志，提取性能指标并生成统计报告。

```bash
# 分析日志文件
node server/scripts/analyze-logs.js [日志文件路径]

# 示例：分析指定日志文件
node server/scripts/analyze-logs.js logs/server.log

# 生成API接口文档
node server/scripts/analyze-logs.js logs/server.log --api-docs
```

#### 分析报告内容

分析报告包含以下内容：

- **基本指标**：总请求数、总响应数、错误率、慢请求数
- **性能指标**：平均响应时间、最小/最大响应时间、内存消耗、响应大小
- **状态码分布**：按HTTP状态码分组的请求数量和百分比
- **路径分布**：按API路径分组的请求数量、响应时间和状态码分布
- **时间分布**：24小时内各时段的请求数量分布

### 使用建议

1. 在开发环境中使用生成工具创建测试日志
2. 使用分析工具评估API性能和错误率
3. 定期分析生产环境日志，监控系统健康状况
4. 关注慢请求和错误请求，进行性能优化

更多详细信息请参阅 [server/README.md](./server/README.md#日志管理工具)。

# 区块链项目核心模块

本项目提供了一套完整的区块链交互工具，用于简化与以太坊兼容区块链的接口交互。

## 核心模块结构

项目的核心模块包含以下组件：

- `Provider`: 管理区块链网络连接
- `Wallet`: 管理区块链钱包和账户
- `Contract`: 管理智能合约交互（新版模块化设计）

## 新版合约模块设计

新版合约模块采用了模块化设计，将不同功能分解到专门的子模块中：

### 合约模块结构

```
shared/src/core/contract/
├── index.js      # 统一导出入口
├── factory.js    # 合约工厂，负责创建合约实例
├── caller.js     # 合约调用者，负责只读方法调用
├── sender.js     # 合约发送者，负责发送交易
├── transaction.js # 交易管理，提供高级交易处理
└── event.js      # 事件管理，处理事件监听和查询
```

### 功能说明

1. **合约工厂 (ContractFactory)**
   - 创建合约实例
   - 加载合约ABI
   - 根据合约名称创建实例

2. **合约调用者 (ContractCaller)**
   - 调用合约只读方法
   - 批量调用多个方法
   - 参数验证和错误处理

3. **合约发送者 (ContractSender)**
   - 发送合约交易
   - 自动gas估算
   - 支持EIP-1559交易
   - 等待交易确认

4. **交易管理 (ContractTransaction)**
   - 执行合约交易并监控状态
   - 批量执行多个交易
   - 交易事件解析
   - 超时处理

5. **事件管理 (ContractEvent)**
   - 监听合约事件
   - 查询历史事件
   - 暂停/恢复事件监听
   - 事件参数解析

## 使用示例

### 创建合约实例

```javascript
const { Contract } = require('../shared/src/core');

// 创建合约实例
const contract = await Contract.createFromName('MyToken', 'testnet', {
  readOnly: false,
  keyType: 'admin'
});
```

### 调用合约只读方法

```javascript
// 调用单个方法
const balance = await Contract.call(contract, 'balanceOf', ['0x123...']);

// 批量调用
const results = await Contract.multiCall(contract, [
  { method: 'name' },
  { method: 'symbol' },
  { method: 'totalSupply' }
]);
```

### 发送合约交易

```javascript
// 简单发送交易
const tx = await Contract.send(contract, 'transfer', ['0x123...', '1000000000000000000']);
const receipt = await Contract.waitForTransaction(tx);

// 高级交易执行
const result = await Contract.execute(contract, 'transfer', ['0x123...', '1000000000000000000'], {
  confirmations: 2,
  timeout: 60000,
  onStatus: (status) => console.log(`交易状态: ${status.status}`)
});
```

### 监听合约事件

```javascript
// 监听事件
const listener = await Contract.listenToEvent(contract, 'Transfer', (eventData) => {
  console.log(`检测到转账: ${eventData.params.from} -> ${eventData.params.to}, 金额: ${eventData.params.value}`);
});

// 暂停监听
await Contract.pauseEventListener(listener.listenerId);

// 恢复监听
await Contract.resumeEventListener(listener.listenerId);

// 停止监听
await Contract.removeEventListener(listener.listenerId);
```

### 查询历史事件

```javascript
// 查询过去的Transfer事件
const events = await Contract.queryEvents(contract, 'Transfer', {
  fromBlock: 1000000,
  toBlock: 'latest',
  filter: { from: '0x123...' }
});
```

## 向后兼容性

为了保持向后兼容，旧版合约模块仍然可以通过 `OldContract` 访问，但建议使用新版模块化合约工具。