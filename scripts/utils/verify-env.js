/**
 * 验证环境变量
 */

function verifyEnv() {
  // 检查必要的环境变量
  const requiredEnvVars = ['PRIVATE_KEY'];
  const missingVars = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.warn(`警告: 以下环境变量未设置: ${missingVars.join(', ')}`);
    console.warn('建议设置这些环境变量以确保部署正常进行');
  }

  return true;
}

module.exports = { verifyEnv }; 