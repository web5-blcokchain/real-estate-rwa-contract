# Japan RWA 项目文档

## 目录

1. [项目概述](./overview.md)
2. [架构设计](./architecture.md)
3. [API文档](./api/README.md)
4. [测试文档](./testing/README.md)
5. [部署指南](./deployment.md)
6. [错误处理](./error-handling.md)
7. [配置说明](./configuration.md)

## 快速开始

1. 安装依赖
```bash
npm install
```

2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件,填入必要的配置信息
```

3. 运行测试
```bash
npm run test
```

4. 部署合约
```bash
npm run deploy
```

## 项目结构

```
japan-rwa/
├── contracts/           # 智能合约
├── frontend-tests/      # 前端测试
├── shared/             # 共享代码
│   ├── config/        # 配置文件
│   ├── services/      # 服务类
│   └── utils/         # 工具类
├── docs/              # 文档
└── scripts/           # 脚本
```

## 开发指南

1. 代码规范
   - 使用 ESLint 进行代码检查
   - 遵循项目定义的代码风格
   - 编写完整的 JSDoc 注释

2. 测试规范
   - 编写单元测试和集成测试
   - 保持测试覆盖率
   - 使用测试工具类

3. 文档规范
   - 及时更新文档
   - 编写清晰的注释
   - 记录重要的设计决策

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT 