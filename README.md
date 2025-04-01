# 日本房地产代币化平台 (Japan Real Estate Tokenization Platform)

## 项目背景
本项目旨在通过区块链技术实现日本房地产的代币化，使投资者能够以更灵活的方式参与日本房地产市场。通过智能合约实现房地产所有权的数字化表示，并提供安全、透明的交易平台。

## 核心功能
- 房地产代币化：将实体房地产转换为可交易的代币
- 智能合约管理：自动化的所有权转移和收益分配
- 交易平台：支持代币的买卖和转让
- 收益分配：自动化的租金和收益分配机制
- 权限管理：多级权限控制系统
- 监控系统：实时监控区块链数据和系统状态

## 技术栈
- 智能合约：Solidity 0.8.20
- 开发框架：Hardhat
- 网络库：ethers.js V6
- 测试框架：Mocha, Chai
- 代码质量：ESLint, Prettier
- 监控工具：Winston
- 部署工具：Hardhat Ignition
- 验证工具：Etherscan

## 项目结构
```
├── contracts/                 # 智能合约源码
│   ├── core/                 # 核心合约
│   ├── interfaces/           # 接口定义
│   ├── libraries/           # 库合约
│   └── SimpleSystemDeployer.sol  # 系统部署器
├── shared/                   # 共享代码
│   └── src/
│       ├── config/          # 配置管理
│       ├── logger/          # 日志系统
│       └── utils/           # 工具函数
├── server/                   # 服务器代码
│   └── src/
│       ├── config/          # 服务器配置
│       ├── controllers/     # 控制器
│       ├── middleware/      # 中间件
│       ├── models/          # 数据模型
│       ├── routes/          # 路由
│       └── services/        # 业务逻辑
├── monitor/                  # 监控系统
│   └── src/
│       ├── config/          # 监控配置
│       ├── services/        # 监控服务
│       └── utils/           # 工具函数
├── scripts/                  # 部署和测试脚本
├── test/                     # 测试文件
├── config/                   # 配置文件
│   └── env/                 # 环境配置
├── docs/                     # 文档
│   ├── dev/                 # 开发文档
│   └── deploy/              # 部署文档
└── logs/                     # 日志文件
```

## 开发环境配置

### 前置要求
- Node.js >= 18.0.0
- Yarn >= 1.22.0
- Git

### 安装依赖
```bash
# 安装项目依赖
yarn install

# 安装全局依赖（可选）
yarn global add hardhat
```

### 环境配置
1. 复制环境配置模板：
```bash
cp config/env/.env.example config/env/.env
```

2. 配置环境变量：
- 在 `config/env/.env` 中设置必要的环境变量
- 支持多环境配置：development、testnet、mainnet

### 配置说明
- `NODE_ENV`: 运行环境（development/testnet/mainnet）
- `LOG_LEVEL`: 日志级别（debug/info/warn/error）
- `LOG_DIR`: 日志目录
- `DEPLOYER_PRIVATE_KEY`: 部署者私钥
- `ADMIN_PRIVATE_KEY`, `MANAGER_PRIVATE_KEY`, `OPERATOR_PRIVATE_KEY`: 各角色私钥
- `ADMIN_ADDRESSES`, `MANAGER_ADDRESSES`, `OPERATOR_ADDRESSES`: 各角色地址列表
- `ETHERSCAN_API_KEY`: Etherscan API密钥
- 网络配置：RPC URL、Chain ID等
- Gas配置：Gas Limit、Gas Price等

### 开发工具配置
1. ESLint 配置
```bash
# 运行代码检查
yarn lint

# 自动修复代码问题
yarn lint:fix
```

2. Prettier 配置
```bash
# 格式化代码
yarn format
```

3. TypeScript 配置
- 项目使用 TypeScript 进行开发
- 配置文件位于 `tsconfig.json`

## 合约开发命令

### 编译合约
```bash
# 编译所有合约
yarn hardhat compile

# 清理缓存并重新编译
yarn hardhat clean && yarn hardhat compile

# 编译指定合约
yarn hardhat compile --config hardhat.config.ts
```

### 部署合约
```bash
# 部署到本地网络
yarn hardhat run scripts/deploy.ts --network localhost

# 部署到测试网
yarn hardhat run scripts/deploy.ts --network sepolia

# 部署到主网
yarn hardhat run scripts/deploy.ts --network mainnet

# 使用Ignition部署
yarn hardhat ignition deploy ./ignition/modules/PropertySystem.js --network sepolia
```

### 合约验证
```bash
# 验证单个合约
yarn hardhat verify --network sepolia 0xContractAddress "Constructor Arg 1" "Constructor Arg 2"

# 验证代理合约
yarn hardhat verify:proxy --network sepolia 0xProxyAddress

# 批量验证合约
yarn hardhat run scripts/verify.ts --network sepolia
```

### 合约测试
```bash
# 运行所有测试
yarn hardhat test

# 运行特定测试文件
yarn hardhat test test/PropertyManager.test.js

# 运行带标签的测试
yarn hardhat test --grep "PropertyManager"

# 测试覆盖率报告
yarn hardhat coverage

# 生成测试覆盖率报告并在浏览器中查看
yarn hardhat coverage && open coverage/index.html
```

### 调试与分析
```bash
# 本地节点（开发模式）
yarn hardhat node

# 运行控制台（交互模式）
yarn hardhat console --network localhost

# 运行脚本
yarn hardhat run scripts/debug.js --network localhost

# 调试特定交易
yarn hardhat debug 0xTransactionHash --network sepolia

# Gas 报告
REPORT_GAS=true yarn hardhat test

# Size 报告
yarn hardhat size-contracts
```

### 脚本执行
```bash
# 执行合约交互脚本
yarn hardhat run scripts/interact.js --network localhost

# 执行数据查询脚本
yarn hardhat run scripts/query.js --network sepolia

# 执行管理员操作
yarn hardhat run scripts/admin/setFees.js --network mainnet
```

### 其他实用命令
```bash
# 查看可用任务
yarn hardhat help

# 查看账户信息
yarn hardhat accounts

# 检查ABI是否缺少函数
yarn hardhat check-abi

# 估算部署成本
yarn hardhat estimate-deploy-cost

# 生成typechain类型
yarn hardhat typechain
```

## 快速启动

### 本地开发
```bash
# 启动本地节点
yarn hardhat node

# 编译合约
yarn hardhat compile

# 运行测试
yarn test

# 启动开发服务器
yarn dev:server

# 启动监控系统
yarn dev:monitor
```

### 部署
```bash
# 部署到测试网
yarn deploy:testnet

# 部署到主网
yarn deploy:mainnet

# 验证合约
yarn verify:testnet
yarn verify:mainnet
```

## 开发指南

### 代码规范
- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 遵循 Solidity 0.8.20 最佳实践
- 使用 TypeScript 进行类型检查

### 测试
- 编写单元测试和集成测试
- 使用 Hardhat 测试框架
- 运行测试覆盖率报告

### 文档
- 更新开发文档（docs/dev/）
- 记录部署信息（docs/deploy/）
- 维护 CHANGELOG.md

## 部署流程
1. 环境准备
   - 配置环境变量
   - 准备部署账户
   - 确保足够的原生代币

2. 合约部署
   - 编译合约
   - 部署系统
   - 初始化参数
   - 验证合约

3. 系统配置
   - 设置权限
   - 配置参数
   - 启动监控

4. 验证部署
   - 检查合约状态
   - 验证系统功能
   - 生成部署报告

## 监控和维护
- 实时监控区块链数据
- 系统状态检查
- 异常告警
- 定期维护

## 贡献指南
1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 常见问题解决方案

### 合约部署失败
- 检查网络连接和RPC URL
- 确保部署账户有足够的ETH
- 验证环境变量配置正确
- 检查合约代码中的初始化参数

### 测试失败
- 使用 `--verbose` 查看详细日志
- 检查测试用例中的环境依赖
- 使用 `console.log` 调试合约状态
- 隔离失败的测试用例单独运行

### Gas优化
- 使用 `hardhat-gas-reporter` 分析gas消耗
- 优化循环和存储结构
- 使用库合约复用代码
- 减少状态变量数量

### 权限问题
- 检查角色地址配置是否正确
- 确认交易签名者有相应权限
- 通过`getRoleAddresses`函数验证角色配置
- 使用console调试模式检查权限校验过程

## 许可证
MIT License

## 联系方式
- 项目负责人：[联系方式]
- 技术支持：[联系方式] 