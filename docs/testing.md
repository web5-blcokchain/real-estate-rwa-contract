# 测试文档

## 测试概述

本项目包含以下类型的测试:

1. 单元测试
   - 服务类测试
   - 工具类测试
   - 合约测试

2. 集成测试
   - 合约交互测试
   - 服务类集成测试
   - 工具类集成测试

3. 端到端测试
   - 前端测试
   - 后端测试
   - 全流程测试

## 测试环境

### 开发环境

```bash
# 安装依赖
npm install

# 启动本地节点
npx hardhat node

# 部署合约
npx hardhat run scripts/deploy.js --network localhost

# 运行测试
npm test
```

### 测试网络

- 测试网: Sepolia
- 链ID: 11155111
- RPC URL: https://sepolia.infura.io/v3/YOUR-PROJECT-ID
- 区块浏览器: https://sepolia.etherscan.io

## 测试用例

### 1. 服务类测试

#### BaseContractService 测试

```javascript
describe('BaseContractService', () => {
    let service;
    let config;

    beforeEach(() => {
        config = {
            network: 'localhost',
            privateKey: '0x...'
        };
        service = new BaseContractService(config);
    });

    test('initialize', async () => {
        await service.initialize();
        expect(service.provider).toBeDefined();
        expect(service.signer).toBeDefined();
    });

    test('getContract', async () => {
        const contract = await service.getContract(
            'TestContract',
            '0x...',
            []
        );
        expect(contract).toBeDefined();
    });

    test('waitForTransaction', async () => {
        const tx = await service.waitForTransaction({
            hash: '0x...'
        });
        expect(tx).toBeDefined();
    });
});
```

#### PropertyRegistryService 测试

```javascript
describe('PropertyRegistryService', () => {
    let service;
    let propertyData;

    beforeEach(() => {
        service = new PropertyRegistryService(config);
        propertyData = {
            name: 'Test Property',
            location: 'Tokyo',
            price: 1000000,
            size: 100,
            description: 'Test Description',
            features: ['Feature 1', 'Feature 2'],
            images: ['image1.jpg', 'image2.jpg'],
            documents: ['doc1.pdf', 'doc2.pdf']
        };
    });

    test('registerProperty', async () => {
        const receipt = await service.registerProperty(propertyData);
        expect(receipt).toBeDefined();
    });

    test('approveProperty', async () => {
        const receipt = await service.approveProperty('Test Property');
        expect(receipt).toBeDefined();
    });

    test('getProperty', async () => {
        const property = await service.getProperty('Test Property');
        expect(property).toBeDefined();
    });
});
```

### 2. 工具类测试

#### ConfigManager 测试

```javascript
describe('ConfigManager', () => {
    let manager;

    beforeEach(() => {
        manager = new ConfigManager();
    });

    test('initialize', async () => {
        await manager.initialize();
        expect(manager.networks).toBeDefined();
        expect(manager.contracts).toBeDefined();
        expect(manager.environment).toBeDefined();
    });

    test('getNetwork', () => {
        const network = manager.getNetwork('localhost');
        expect(network).toBeDefined();
    });

    test('getContract', () => {
        const contract = manager.getContract('PropertyRegistry');
        expect(contract).toBeDefined();
    });
});
```

#### EventManager 测试

```javascript
describe('EventManager', () => {
    let manager;
    let callback;

    beforeEach(() => {
        manager = new EventManager();
        callback = jest.fn();
    });

    test('on', () => {
        manager.on('test', callback);
        expect(manager.listeners.has('test')).toBe(true);
    });

    test('emit', () => {
        manager.on('test', callback);
        manager.emit('test', { data: 'test' });
        expect(callback).toHaveBeenCalled();
    });

    test('removeListener', () => {
        manager.on('test', callback);
        manager.removeListener('test', callback);
        expect(manager.listeners.has('test')).toBe(false);
    });
});
```

### 3. 合约测试

#### PropertyRegistry 合约测试

```javascript
describe('PropertyRegistry', () => {
    let contract;
    let owner;
    let user;

    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();
        contract = await deployContract('PropertyRegistry');
    });

    test('registerProperty', async () => {
        const propertyData = {
            name: 'Test Property',
            location: 'Tokyo',
            price: 1000000,
            size: 100,
            description: 'Test Description',
            features: ['Feature 1', 'Feature 2'],
            images: ['image1.jpg', 'image2.jpg'],
            documents: ['doc1.pdf', 'doc2.pdf']
        };

        await contract.registerProperty(
            propertyData.name,
            propertyData.location,
            propertyData.price,
            propertyData.size,
            propertyData.description,
            propertyData.features,
            propertyData.images,
            propertyData.documents
        );

        const property = await contract.getProperty(propertyData.name);
        expect(property.name).toBe(propertyData.name);
    });

    test('approveProperty', async () => {
        await contract.approveProperty('Test Property');
        const property = await contract.getProperty('Test Property');
        expect(property.approved).toBe(true);
    });
});
```

## 测试覆盖率

### 覆盖率目标

- 语句覆盖率: > 80%
- 分支覆盖率: > 70%
- 函数覆盖率: > 90%
- 行覆盖率: > 80%

### 覆盖率报告

```bash
# 生成覆盖率报告
npm run coverage

# 查看覆盖率报告
open coverage/lcov-report/index.html
```

## 测试最佳实践

### 1. 测试结构

- 使用 describe 块组织测试
- 使用 beforeEach 设置测试环境
- 使用 afterEach 清理测试环境
- 使用 test 或 it 编写测试用例

### 2. 测试命名

- 描述性命名
- 使用 should 或 expect 开头
- 包含测试场景和预期结果

### 3. 测试隔离

- 每个测试用例独立
- 不依赖其他测试用例的状态
- 使用 mock 和 stub 隔离外部依赖

### 4. 断言

- 使用具体的断言
- 避免多重断言
- 使用有意义的错误消息

### 5. 异步测试

- 使用 async/await
- 正确处理 Promise
- 设置适当的超时时间

## 持续集成

### GitHub Actions

```yaml
name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests
      run: npm test
      
    - name: Run coverage
      run: npm run coverage
```

## 测试工具

### 1. Jest

- 测试框架
- 断言库
- 模拟功能
- 覆盖率报告

### 2. Hardhat

- 智能合约测试
- 网络管理
- 部署脚本
- 编译工具

### 3. Ethers.js

- 区块链交互
- 合约调用
- 事件监听
- 交易签名

## 常见问题

### 1. 测试失败

- 检查网络连接
- 验证合约地址
- 确认账户余额
- 检查 Gas 限制

### 2. 异步问题

- 使用 await
- 设置超时
- 处理错误
- 清理资源

### 3. 环境问题

- 检查配置文件
- 验证依赖版本
- 确认环境变量
- 检查文件权限 