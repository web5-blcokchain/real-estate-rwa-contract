# Japanese Real Estate Tokenization System

基于区块链的日本房地产代币化系统，支持房产代币的发行、交易和收益分配。

## 项目结构

```
.
├── contracts/           # 智能合约代码
│   ├── SimpleSystemDeployer.sol    # 系统部署器
│   ├── SimpleRoleManager.sol       # 角色管理
│   ├── PropertyManager.sol         # 房产管理
│   ├── PropertyToken.sol           # 房产代币
│   ├── TradingManager.sol          # 交易管理
│   ├── RewardManager.sol           # 奖励管理
│   ├── SimpleRealEstateSystem.sol  # 系统核心
│   └── RealEstateFacade.sol        # 系统门面
├── server/             # 服务器代码
├── monitor/            # 区块链监控
├── shared/             # 共享代码
├── scripts/            # 部署脚本
├── test/               # 测试文件
├── config/             # 配置文件
├── logs/               # 日志文件
└── docs/               # 文档
    ├── dev/            # 开发文档
    └── deploy/         # 部署报告
```

## 环境要求

- Node.js >= 18.0.0
- Yarn >= 4.0.0
- Hardhat

## 安装

```bash
# 安装依赖
yarn install

# 编译合约
yarn compile
```

## 配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 配置环境变量：
- 网络配置（NETWORK_TYPE, RPC_URL等）
- 账户配置（DEPLOYER_PRIVATE_KEY等）
- API密钥（ETHERSCAN_API_KEY等）
- 系统配置（LOG_LEVEL等）

## 部署

### 本地网络

```bash
# 启动本地节点
yarn hardhat node

# 部署合约
yarn deploy:local
```

### 测试网

```bash
# 部署合约
yarn deploy:testnet

# 验证合约
yarn verify:testnet
```

### 主网

```bash
# 部署合约
yarn deploy:mainnet

# 验证合约
yarn verify:mainnet
```

## 部署产物

部署完成后，系统会在以下位置生成文件：

- `config/deployment.json`: 部署信息
- `config/abi/*.json`: 合约 ABI 文件
- `docs/deploy/*.md`: 部署报告

## 测试

```bash
# 运行测试
yarn test
```

## 开发

```bash
# 启动开发服务器
yarn server:dev

# 启动监控
yarn monitor:dev
```

## 日志

所有日志文件保存在 `logs/` 目录下：
- `logs/error.log`: 错误日志
- `logs/combined.log`: 所有日志

## 文档

- 开发文档：`docs/dev/`
- 部署报告：`docs/deploy/`
- 修改记录：`CHANGELOG.md`

## 贡献

请查看 `CONTRIBUTING.md` 了解如何参与项目开发。 