const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

class EnvLoader {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = {};
  }

  load() {
    // 加载基础配置
    this.loadBaseConfig();

    // 加载环境特定配置
    this.loadEnvConfig();

    // 设置环境变量
    this.setEnvVars();

    return this.config;
  }

  loadBaseConfig() {
    const basePath = path.join(__dirname, '.env');
    if (fs.existsSync(basePath)) {
      const result = dotenv.config({ path: basePath });
      if (result.error) {
        throw new Error(`Error loading base config: ${result.error}`);
      }
      this.config = { ...process.env };
    }
  }

  loadEnvConfig() {
    const envPath = path.join(__dirname, `${this.env}.env`);
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        throw new Error(`Error loading ${this.env} config: ${result.error}`);
      }
      this.config = { ...this.config, ...process.env };
    }
  }

  setEnvVars() {
    Object.entries(this.config).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }

  getConfig() {
    return this.config;
  }

  getEnv() {
    return this.env;
  }
}

module.exports = new EnvLoader(); 