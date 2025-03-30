# 智能合约部署流程

本文档提供关于使用`deploy-flow.js`脚本进行智能合约部署的说明。该脚本是一个完整的合约部署流程工具，包括合约部署、代币实现设置、角色配置以及测试验证。

## 基本用法

```bash
# 基本用法:
node scripts/deploy-flow.js <network> [options]

# 或使用package.json中的命令:
npm run contracts:deploy:flow <options>
```

### 命令示例

```bash
# 部署到本地网络
npm run contracts:deploy:flow

# 强制重新部署到本地网络
npm run contracts:deploy:flow:force

# 部署到测试网并验证合约
npm run contracts:deploy:flow:testnet

# 部署到主网并验证合约（需要确认）
npm run contracts:deploy:flow:mainnet
```

## 命令行参数

部署脚本支持以下参数:

| 参数 | 短格式 | 描述 | 默认值 |
|------|-------|------|--------|
| `--strategy` | `-s` | 部署策略 (direct, upgradeable, minimal) | upgradeable |
| `--force` | `-f` | 强制重新部署 | false |
| `--verify` | `-v` | 验证合约代码 | false |
| `--roles` | `-r` | 设置角色 | true |
| `--token-impl` | `-t` | 部署代币实现 | true |
| `--confirm` | | 确认主网部署 | false |
| `--help` | `-h` | 显示帮助信息 | |

## 部署网络

脚本支持以下部署网络:

- `local`: 本地开发网络 (映射到Hardhat的localhost网络)
- `testnet`: 测试网络 (映射到Hardhat的sepolia网络)
- `mainnet`: 主网 (需要使用--confirm参数确认)

## 部署流程

部署脚本会执行以下步骤:

1. 部署合约 - 使用选定的策略部署所有合约
2. 部署代币实现 - 部署RealEstateToken实现合约并设置TokenFactory
3. 设置角色 - 为部署者账户设置必要的系统角色
4. 验证部署 - 运行部署验证测试和基础业务流程测试
5. 验证合约代码 - 在非本地网络上验证合约代码

## 注意事项

- 如果在测试网或主网上部署，请确保账户有足够的ETH支付Gas费用
- 主网部署需要使用`--confirm`参数显式确认
- 如果部署中的某一步骤失败，脚本会尝试继续执行后续步骤，并在日志中标记警告 