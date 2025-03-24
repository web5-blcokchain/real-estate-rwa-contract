/**
 * 安全密钥管理工具
 * 提供更安全的私钥处理方式
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// 加密密钥文件路径
const KEY_FILE = path.join(__dirname, '../../.key');
// 加密的私钥文件路径
const ENCRYPTED_KEY_FILE = path.join(__dirname, '../../.encrypted_key');

/**
 * 生成随机加密密钥并保存
 */
function generateKey() {
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
  console.log(`加密密钥已生成并保存到 ${KEY_FILE}`);
  console.log('警告: 请妥善保管此文件，不要提交到版本控制系统');
}

/**
 * 从文件读取加密密钥
 */
function getKey() {
  if (!fs.existsSync(KEY_FILE)) {
    console.error(`错误: 加密密钥文件不存在 (${KEY_FILE})`);
    console.log('请先运行 generateKey() 生成密钥');
    return null;
  }
  return fs.readFileSync(KEY_FILE, 'utf8');
}

/**
 * 加密私钥
 * @param {string} privateKey - 要加密的私钥
 */
function encryptPrivateKey(privateKey) {
  const key = getKey();
  if (!key) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const data = {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
  
  fs.writeFileSync(ENCRYPTED_KEY_FILE, JSON.stringify(data), { mode: 0o600 });
  console.log(`私钥已加密并保存到 ${ENCRYPTED_KEY_FILE}`);
  return true;
}

/**
 * 解密私钥
 * @returns {string|null} - 解密后的私钥或null
 */
function decryptPrivateKey() {
  const key = getKey();
  if (!key) return null;
  
  if (!fs.existsSync(ENCRYPTED_KEY_FILE)) {
    console.error(`错误: 加密的私钥文件不存在 (${ENCRYPTED_KEY_FILE})`);
    return null;
  }
  
  const data = JSON.parse(fs.readFileSync(ENCRYPTED_KEY_FILE, 'utf8'));
  const iv = Buffer.from(data.iv, 'hex');
  const encryptedText = data.encryptedData;
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 交互式设置私钥
 */
async function setupPrivateKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // 生成加密密钥
  if (!fs.existsSync(KEY_FILE)) {
    generateKey();
  }
  
  // 获取私钥
  const privateKey = await new Promise(resolve => {
    rl.question('请输入您的私钥 (不会显示在屏幕上): ', (answer) => {
      resolve(answer);
    });
  });
  
  // 加密并保存私钥
  encryptPrivateKey(privateKey);
  
  rl.close();
  console.log('私钥设置完成');
}

/**
 * 获取私钥用于部署
 * 如果环境变量中有私钥，优先使用环境变量
 * 否则尝试从加密文件中解密
 */
function getPrivateKey() {
  // 优先使用环境变量
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY;
  }
  
  // 尝试从加密文件解密
  const decrypted = decryptPrivateKey();
  if (!decrypted) {
    console.error('错误: 无法获取私钥，请设置环境变量PRIVATE_KEY或运行setupPrivateKey()');
    return null;
  }
  
  return decrypted;
}

module.exports = {
  generateKey,
  encryptPrivateKey,
  decryptPrivateKey,
  setupPrivateKey,
  getPrivateKey
};

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'setup') {
    setupPrivateKey();
  } else if (command === 'generate') {
    generateKey();
  } else {
    console.log('用法:');
    console.log('  node secure-key.js setup    - 设置加密的私钥');
    console.log('  node secure-key.js generate - 仅生成加密密钥');
  }
}