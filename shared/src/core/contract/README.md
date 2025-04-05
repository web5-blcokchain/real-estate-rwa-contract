# 合约模块设计文档

本文档详细介绍了合约模块的设计理念、架构和实现细节。

## 设计理念

新版合约模块基于以下设计理念：

1. **单一职责原则**：每个子模块只负责一类功能，避免大而全的复杂类
2. **关注点分离**：将合约创建、方法调用、交易发送、事件监听等功能分离
3. **可测试性**：每个子模块都可以独立测试
4. **可扩展性**：每个子模块都可以独立扩展，不影响其他功能
5. **一致的错误处理**：统一的错误捕获和处理机制
6. **全面的日志记录**：关键操作都有日志记录

## 模块架构

```
Contract
   ↑
   ├── ContractFactory  # 合约实例创建
   ├── ContractCaller   # 合约只读方法调用
   ├── ContractSender   # 合约交易发送
   ├── ContractTransaction  # 高级交易管理
   └── ContractEvent    # 事件管理
```

## 模块详解

### 1. 合约工厂 (ContractFactory)

负责创建和初始化合约实例。

#### 主要方法：

- `create(signer, address, abi)`: 使用签名者创建合约实例
- `createReadOnly(provider, address, abi)`: 创建只读合约实例
- `createFromName(contractName, networkType, options)`: 根据合约名称创建实例
- `loadContractAbi(contractName)`: 加载合约ABI

### 2. 合约调用者 (ContractCaller)

负责处理合约的只读方法调用。

#### 主要方法：

- `call(contract, method, args)`: 调用合约只读方法
- `multiCall(contract, calls)`: 批量调用多个合约方法

### 3. 合约发送者 (ContractSender)

负责处理合约的写入方法调用和交易发送。

#### 主要方法：

- `send(contract, method, args, options)`: 发送合约交易
- `waitForTransaction(tx, confirmations)`: 等待交易确认

#### 交易选项：

- `autoGasEstimation`: 是否自动估算gas
- `useEIP1559`: 是否使用EIP-1559交易
- `maxFeePerGasMultiplier`: 最大gas费用倍数
- `maxPriorityFeePerGasMultiplier`: 最大优先费用倍数

### 4. 交易管理 (ContractTransaction)

提供高级交易处理功能，包括状态跟踪、事件解析等。

#### 主要方法：

- `execute(contract, method, args, options)`: 执行交易并跟踪状态
- `batchExecute(transactions, options)`: 批量执行多个交易

#### 交易状态：

- `PENDING`: 交易等待中
- `CONFIRMED`: 交易已确认
- `FAILED`: 交易失败
- `TIMEOUT`: 交易超时
- `REVERTED`: 交易被还原

### 5. 事件管理 (ContractEvent)

负责处理合约事件的监听和查询。

#### 主要方法：

- `listen(contract, event, callback, options)`: 监听合约事件
- `removeListener(listenerId)`: 移除事件监听器
- `pauseListener(listenerId)`: 暂停事件监听
- `resumeListener(listenerId)`: 恢复事件监听
- `query(contract, event, options)`: 查询历史事件
- `getActiveListeners()`: 获取所有活跃的监听器
- `parseReceiptEvents(receipt, contract, options)`: 解析交易收据中的事件

#### 监听器状态：

- `ACTIVE`: 活跃状态
- `PAUSED`: 暂停状态
- `STOPPED`: 已停止
- `ERROR`: 错误状态

#### 事件数据字段：

监听和查询的事件数据包含以下字段：

- `name`: 事件名称
- `signature`: 事件签名
- `address`: 合约地址
- `blockNumber`: 区块号
- `transactionHash`: 交易哈希
- `params`: 事件参数对象
- `sender`: 交易发起者地址（如果启用了 `includeSender` 选项）
- `transaction`: 交易详情（如果启用了 `includeTransactionData` 选项）
- `timestamp`: 事件处理时间戳（仅监听时有效）

#### 事件监听选项：

- `includeTimestamp`: 是否包含时间戳（默认 `true`）
- `formatValues`: 是否格式化大数值为字符串（默认 `true`）
- `includeTransactionData`: 是否包含交易详情（默认 `true`）
- `includeSender`: 是否包含交易发起者地址（默认 `true`）

#### 事件查询选项：

- `fromBlock`: 起始区块号（默认 `0`）
- `toBlock`: 结束区块号（默认 `'latest'`）
- `filter`: 事件过滤条件（默认 `{}`）
- `formatValues`: 是否格式化大数值为字符串（默认 `true`）
- `includeSender`: 是否包含交易发起者地址（默认 `false`，因为会增加查询时间）

## 优势与特点

1. **更好的代码组织**：避免了单一大文件的复杂性
2. **更细粒度的功能控制**：可以单独使用所需功能
3. **更全面的错误处理**：每个操作都有专门的错误处理机制
4. **更丰富的日志信息**：记录合约交互的详细过程
5. **更灵活的配置选项**：针对不同场景提供多种配置
6. **更强的可扩展性**：可以方便地添加新功能而不影响现有代码

## 使用场景示例

### 场景一：DEX交易

```javascript
// 创建交易对象
const transaction = {
  contract: dexContract,
  method: 'swapExactTokensForTokens',
  args: [
    amountIn,
    amountOutMin,
    path,
    wallet.address,
    deadline
  ],
  options: {
    confirmations: 1,
    timeout: 60000
  }
};

// 执行交易并获取状态更新
const result = await Contract.execute(transaction.contract, transaction.method, transaction.args, {
  ...transaction.options,
  onStatus: (status) => {
    if (status.status === Contract.TransactionStatus.PENDING) {
      console.log(`等待交易确认: ${status.txHash}`);
    } else if (status.status === Contract.TransactionStatus.CONFIRMED) {
      console.log(`交易已确认: ${status.txHash}`);
    }
  }
});

// 解析交易结果中的事件
if (result.status === Contract.TransactionStatus.CONFIRMED) {
  const swapEvent = result.events.find(e => e.name === 'Swap');
  if (swapEvent) {
    console.log(`交换成功: 输入${swapEvent.params.amountIn}，输出${swapEvent.params.amountOut}`);
  }
}
```

### 场景二：代币监控

```javascript
// 监听Transfer事件，包含发送者信息
const listener = await Contract.listenToEvent(tokenContract, 'Transfer', (eventData) => {
  const { from, to, value } = eventData.params;
  const sender = eventData.sender; // 交易发起者地址
  
  // 检测大额转账，并记录发起者
  if (ethers.utils.formatEther(value) > 1000) {
    console.log(`检测到大额转账: ${from} -> ${to}, 金额: ${ethers.utils.formatEther(value)} TOKEN`);
    console.log(`交易发起者: ${sender}`);
    
    // 触发通知或其他操作
    notifyLargeTransfer(from, to, value, sender);
  }
});

// 查询历史转账记录，包含发送者
const events = await Contract.queryEvents(tokenContract, 'Transfer', {
  fromBlock: lastBlock - 1000,
  toBlock: 'latest',
  formatValues: true,
  includeSender: true // 启用发送者信息
});

console.log(`查询到${events.length}条历史转账记录`);
events.forEach(event => {
  console.log(`转账: ${event.params.from} -> ${event.params.to}, 金额: ${event.params.value}`);
  console.log(`发起者: ${event.sender}`);
});
```

## 最佳实践

1. **优先使用高级接口**：优先使用 `execute` 而不是 `send` + `waitForTransaction`
2. **批量操作**：对于多个调用，使用 `multiCall` 或 `batchExecute`
3. **错误处理**：始终处理可能的错误，特别是交易执行和事件监听
4. **资源清理**：不再需要事件监听时，记得调用 `removeListener`
5. **超时设置**：根据不同网络状况设置合理的交易超时时间
6. **参数验证**：虽然模块内部会验证参数，但仍建议在调用前检查关键参数

## 使用示例

### 创建合约实例

```javascript
const { Provider, Wallet, Contract } = require('../shared/src');

// 创建Provider
const provider = await Provider.create();

// 创建带签名者的合约实例
const adminWallet = await Wallet.createAdmin(provider);
const tokenContract = await Contract.create(adminWallet, '0x1234...', tokenAbi);

// 创建只读合约实例
const tokenContractReadOnly = await Contract.createReadOnly(provider, '0x1234...', tokenAbi);

// 通过合约名称创建实例（自动加载地址和ABI）
const rewardContract = await Contract.createFromName('RewardManager', 'testnet', {
  signer: adminWallet
});

// 创建只读合约实例
const rewardContractReadOnly = await Contract.createFromName('RewardManager', 'testnet', {
  provider,
  readOnly: true
});
```

### 调用合约只读方法

```javascript
// 使用只读合约实例调用方法（只需provider，无需wallet）
const tokenContractReadOnly = await Contract.createReadOnly(provider, tokenAddress, tokenAbi);
const balance = await Contract.call(tokenContractReadOnly, 'balanceOf', [userAddress]);
console.log(`用户余额: ${balance.toString()}`);

// 批量调用多个方法
const results = await Contract.multiCall(tokenContractReadOnly, [
  { method: 'name' },
  { method: 'symbol' },
  { method: 'decimals' },
  { method: 'totalSupply' }
]);

console.log(`代币名称: ${results[0].result}`);
console.log(`代币符号: ${results[1].result}`);
console.log(`小数位数: ${results[2].result}`);
console.log(`总供应量: ${results[3].result.toString()}`);
```

### 发送合约交易（写入操作）

```javascript
// 需要使用带签名者的合约实例（需要provider和wallet）
const adminWallet = await Wallet.createAdmin(provider);
const tokenContract = await Contract.create(adminWallet, tokenAddress, tokenAbi);

// 发送交易
const tx = await Contract.send(tokenContract, 'transfer', [recipientAddress, ethers.utils.parseEther('1.0')], {
  autoGasEstimation: true,
  useEIP1559: true
});

console.log(`交易已发送，等待确认，交易哈希: ${tx.hash}`);

// 等待交易确认
const receipt = await Contract.waitForTransaction(tx, 2); // 等待2个区块确认
console.log(`交易已确认，区块号: ${receipt.blockNumber}`);

// 打印gas使用情况
console.log(`Gas使用量: ${receipt.gasUsed.toString()}`);
```

### 监听合约事件

```javascript
// 监听Transfer事件
const listenerId = await Contract.listenToEvent(tokenContract, 'Transfer', {
  filter: { from: adminWallet.address }, // 只监听from为adminWallet的事件
  fromBlock: 'latest',
  callback: (event) => {
    console.log('检测到转账事件:');
    console.log(`  发送方: ${event.args.from}`);
    console.log(`  接收方: ${event.args.to}`);
    console.log(`  金额: ${ethers.utils.formatEther(event.args.value)} ETH`);
  }
});

// 暂停事件监听
await Contract.pauseEventListener(listenerId);

// 恢复事件监听
await Contract.resumeEventListener(listenerId);

// 移除事件监听
await Contract.removeEventListener(listenerId);

// 查询历史事件
const events = await Contract.queryEvents(tokenContract, 'Transfer', {
  filter: { to: recipientAddress },
  fromBlock: receipt.blockNumber - 1000,
  toBlock: 'latest'
});

console.log(`查询到${events.length}个转账事件`);
```

### 高级交易管理

```javascript
// 执行合约交易并自动处理确认和错误
const result = await Contract.execute(tokenContract, 'approve', [spenderAddress, ethers.utils.parseEther('10.0')], {
  confirmations: 1,
  onConfirmed: (receipt) => {
    console.log(`交易已确认: ${receipt.transactionHash}`);
  },
  onError: (error) => {
    console.error(`交易失败: ${error.message}`);
  }
});

// 批量执行多个交易
const batchResults = await Contract.batchExecute(tokenContract, [
  { 
    method: 'transfer',
    args: [recipient1, ethers.utils.parseEther('1.0')],
    options: { gasLimit: 100000 }
  },
  {
    method: 'transfer',
    args: [recipient2, ethers.utils.parseEther('2.0')]
  }
]);

console.log(`批量交易结果: ${batchResults.length}个执行完成，${batchResults.filter(r => r.success).length}个成功`);
```

## 架构设计

合约模块由以下主要组件组成:

1. `factory.js` - 负责创建合约实例
2. `caller.js` - 处理合约只读方法调用
3. `sender.js` - 处理合约写入方法交易发送
4. `event.js` - 提供合约事件监听和处理功能
5. `transaction.js` - 提供高级交易管理功能

## 最佳实践

1. **读取操作**：对于只读操作，应当使用`createReadOnly`创建只读合约实例，无需提供签名者
2. **写入操作**：对于修改状态的操作，必须使用带有签名者的合约实例
3. **错误处理**：使用try/catch块捕获合约交互过程中的异常，区分不同类型的错误
4. **交易确认**：对于重要交易，等待多个确认（至少2个）以确保交易不会被回滚
5. **燃料估算**：启用自动燃料估算，避免交易因燃料不足而失败
6. **交易类型**：在支持的网络上使用EIP-1559交易类型，以提高交易确认速度并优化燃料费用 