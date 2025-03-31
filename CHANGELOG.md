# Changelog

所有重要的更改都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- 初始化项目结构
- 创建基础合约架构
  - SimpleSystemDeployer
  - SimpleRoleManager
  - PropertyManager
  - PropertyToken
  - TradingManager
  - RewardManager
  - SimpleRealEstateSystem
  - RealEstateFacade
- 添加部署脚本
- 添加基础测试
- 添加日志系统
- 添加网络配置
- 添加环境变量配置
- 添加代码质量工具
  - ESLint 配置
  - Prettier 配置
  - Git hooks
- 添加部署验证脚本
- 添加多环境配置
  - 本地网络配置
  - 测试网配置
  - 主网配置
- 添加代码分析工具
  - 复杂度检查
  - 依赖分析
  - 静态分析

### Changed
- 升级到 ethers V6
- 优化部署流程
- 改进错误处理
- 统一日志管理
- 优化环境配置管理
- 改进代码质量检查流程

### Fixed
- 修复合约部署顺序问题
- 修复权限检查问题
- 修复事件触发问题
- 修复环境变量加载问题

### Security
- 添加重入攻击防护
- 添加溢出检查
- 添加状态验证
- 添加紧急暂停机制
- 添加合约验证机制

## [0.1.0] - 2024-03-21

### Added
- 初始版本发布
- 基础功能实现
  - 房产管理
  - 代币发行
  - 交易功能
  - 奖励分配
  - 系统管理 