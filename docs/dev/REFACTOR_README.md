# 项目重构 (RW0001)

## 重构内容

本次重构主要是将子文件夹项目（server、frontend-tests等）的依赖统一到根目录的 package.json 中，以便更好地管理依赖版本并避免重复安装相同的依赖。

## 重构步骤

1. 将 server/package.json 和 frontend-tests 所需的依赖合并到根目录的 package.json 中
2. 更新根目录 package.json 中的脚本，为它们添加前缀（server:、frontend:、contracts:）以便于区分不同模块的命令
3. 创建全局配置文件：
   - nodemon.json
   - jest.config.js
   - .eslintrc.js
4. 删除子文件夹中的冗余配置文件和 package.json
5. 确保所有模块使用根目录的 .env 文件

## 如何使用

### 安装依赖

所有依赖现在都在根目录的 package.json 中管理，可以通过以下命令安装：

```bash
npm install
# 或
yarn
# 或
pnpm install
```

### 运行服务器

```bash
npm run server:dev     # 使用 nodemon 运行开发服务器
npm run server:start   # 直接运行服务器
```

### 运行测试

```bash
npm run server:test       # 运行服务器测试
npm run server:test:api   # 运行 API 测试
npm run server:test:flow  # 运行流程测试
npm run frontend:test     # 运行前端测试
npm run contracts:test    # 运行合约测试
```

### 合约相关命令

```bash
npm run contracts:compile           # 编译合约
npm run contracts:update-abis       # 更新ABI
npm run contracts:deploy            # 部署合约
npm run contracts:deploy:testnet    # 在测试网部署合约
npm run contracts:deploy:mainnet    # 在主网部署合约
npm run contracts:verify            # 验证合约
npm run contracts:verify:testnet    # 在测试网验证合约
npm run contracts:verify:mainnet    # 在主网验证合约
```

## 注意事项

1. 所有的路径引用已经更新，以适应新的项目结构
2. 环境变量通过根目录的单一.env文件加载
3. 代码风格和测试配置现在在根目录统一管理
4. 所有命令都添加了模块前缀（server:、frontend:、contracts:）以区分不同模块 