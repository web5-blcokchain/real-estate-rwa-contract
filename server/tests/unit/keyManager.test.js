const { ethers } = require('ethers');
const keyManager = require('../../src/config/keyManager');

describe('Key Manager', () => {
  it('should initialize with predefined keys', () => {
    // 测试基本初始化
    expect(keyManager).toBeDefined();
    expect(typeof keyManager.getPrivateKey).toBe('function');
  });

  it('should return admin private key by default', () => {
    const adminKey = keyManager.getPrivateKey('admin');
    const defaultKey = keyManager.getPrivateKey();
    
    expect(adminKey).toBeDefined();
    expect(defaultKey).toBe(adminKey);
  });
  
  it('should return correct private key for each role', () => {
    const adminKey = keyManager.getPrivateKey('admin');
    const operatorKey = keyManager.getPrivateKey('operator');
    const financeKey = keyManager.getPrivateKey('finance');
    const emergencyKey = keyManager.getPrivateKey('emergency');
    
    // 确认所有角色都返回有效的私钥
    expect(adminKey).toBeDefined();
    expect(operatorKey).toBeDefined();
    expect(financeKey).toBeDefined();
    expect(emergencyKey).toBeDefined();
    
    // 验证返回的是有效的私钥格式
    expect(adminKey.startsWith('0x')).toBe(true);
    expect(adminKey.length).toBe(66); // 0x + 64个字符
  });
  
  it('should return admin key for unknown role', () => {
    const adminKey = keyManager.getPrivateKey('admin');
    const unknownRoleKey = keyManager.getPrivateKey('unknown_role');
    
    expect(unknownRoleKey).toBe(adminKey);
  });
  
  it('should return valid signer for each role', () => {
    const provider = new ethers.JsonRpcProvider();
    
    const adminSigner = keyManager.getSigner('admin', provider);
    const operatorSigner = keyManager.getSigner('operator', provider);
    
    expect(adminSigner).toBeInstanceOf(ethers.Wallet);
    expect(operatorSigner).toBeInstanceOf(ethers.Wallet);
    
    // 确认签名者连接到了provider
    expect(adminSigner.provider).toBe(provider);
  });
  
  it('should return correct address for each role', () => {
    const adminAddress = keyManager.getAddress('admin');
    const operatorAddress = keyManager.getAddress('operator');
    
    expect(ethers.isAddress(adminAddress)).toBe(true);
    expect(ethers.isAddress(operatorAddress)).toBe(true);
    
    // 检查缓存是否工作
    const cachedAdminAddress = keyManager.getAddress('admin');
    expect(cachedAdminAddress).toBe(adminAddress);
  });
  
  it('should validate private keys correctly', () => {
    const validKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const invalidKey = 'invalid-key';
    
    expect(keyManager.constructor.isValidPrivateKey(validKey)).toBe(true);
    expect(keyManager.constructor.isValidPrivateKey(invalidKey)).toBe(false);
  });
  
  it('should provide list of available roles', () => {
    const roles = keyManager.getAvailableRoles();
    
    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);
    expect(roles).toContain('admin');
    expect(roles).toContain('operator');
    expect(roles).toContain('finance');
    expect(roles).toContain('emergency');
  });
}); 