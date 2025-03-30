# 部署系统清理计划

## 概述
随着新的三层部署架构的实施，我们需要清理旧的部署相关文件，保留新的架构文件和必要的实用工具。

## 需要保留的文件

### scripts 目录
- `deploy-with-new-architecture.js` - 使用新架构的主要部署脚本
- `verify-deployment.js` - 验证部署的合约
- `deploy-state.json` - 当前的部署状态记录
- `logging/` 目录 - 包含部署日志
- `README.md` - 更新后的主要文档

### shared/utils 目录
- `deployment-state.js` - 基础层：部署状态管理
- `deployment-core.js` - 核心层：核心部署功能
- `deployment-system.js` - 系统层：高级部署功能
- `DEPLOYMENT_ARCHITECTURE.md` - 新架构文档
- `DEPLOYMENT_CHANGELOG.md` - 架构变更日志
- `index.js` - 导出所有工具模块
- `logger.js` - 日志工具
- `getAbis.js` - ABI获取工具
- `web3Provider.js` - Web3提供者工具
- `contractService.js` - 合约服务工具
- `transaction.js` - 交易处理工具
- `ethers.js` - Ethers兼容层
- `eventListener.js` - 事件监听工具
- 其他通用工具模块（非部署相关）

## 需要移动到备份目录的文件

### scripts 目录
- `deploy.js` -> backup_old_files/scripts/
- `force-deploy.js` -> backup_old_files/scripts/
- `deploy-flow.js` -> backup_old_files/scripts/
- `deploy-token-implementation.js` -> backup_old_files/scripts/
- `migrate-to-new-architecture.js` -> backup_old_files/scripts/ (迁移完成后可备份)
- `migration-report.md` -> backup_old_files/scripts/ (迁移完成后可备份)
- `deploy-system.js` -> backup_old_files/scripts/ (被新架构替代)
- `README_DEPLOY.md` -> backup_old_files/scripts/ (替换为新文档)
- `fix-deploy-state.js` -> backup_old_files/scripts/ (一次性修复脚本)
- `verify.js` -> backup_old_files/scripts/ (被verify-deployment.js替代)
- `setup-roles.js` -> backup_old_files/scripts/ (角色设置已集成到新架构)
- `debug-token-creation.js` -> backup_old_files/scripts/ (调试脚本)

### shared/utils 目录
- `deployer.js` -> backup_old_files/shared/utils/ (被新架构替代)
- `deployUtils.js` -> backup_old_files/shared/utils/ (被新架构替代)
- `deployment.js` -> backup_old_files/shared/utils/ (被新架构替代)
- `DEPLOYMENT_REFACTOR_PLAN.md` -> backup_old_files/shared/utils/ (重构已完成)
- `ethers-v6.js` -> backup_old_files/shared/utils/ (已集成到ethers.js)

## 更新文档

1. 更新 `scripts/README.md` - 反映新的部署架构和流程
2. 更新 `shared/utils/README.md` - 更新工具模块文档

## 部署流程
新的部署架构已经考虑了完整的部署流程：
1. **部署前准备** - 环境配置与验证
2. **合约部署** - 支持多种部署策略（直接部署、可升级部署、最小化部署）
3. **合约初始化** - 自动设置初始化参数和角色分配
4. **部署验证** - 使用verify-deployment.js验证部署的合约
5. **部署记录** - 自动记录所有部署信息 