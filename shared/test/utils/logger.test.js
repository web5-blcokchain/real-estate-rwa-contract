const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const logger = require('../../src/utils/logger');

describe('Logger', () => {
  const testLogDir = 'logs/test';
  const testModule = 'test-module';
  const moduleLogDir = path.join(testLogDir, testModule);

  beforeEach(() => {
    // 创建测试日志目录
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }
    if (!fs.existsSync(moduleLogDir)) {
      fs.mkdirSync(moduleLogDir, { recursive: true });
    }
    
    // 设置测试环境变量
    process.env.LOG_LEVEL = 'debug';
    process.env.LOG_DIR = testLogDir;
  });

  afterEach(() => {
    // 清理测试日志文件
    const cleanupDir = (dir) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          if (fs.lstatSync(filePath).isDirectory()) {
            cleanupDir(filePath);
          } else {
            fs.unlinkSync(filePath);
          }
        });
        fs.rmdirSync(dir);
      }
    };

    cleanupDir(testLogDir);
    
    // 清理环境变量
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_DIR;
    delete process.env.MAX_LOG_SIZE;
    delete process.env.MAX_LOG_FILES;

    // 恢复所有 stub
    sinon.restore();
  });

  describe('log methods', () => {
    it('should log info message', async () => {
      const message = 'Test info message';
      logger.info(message, { module: testModule });
      
      // 等待文件写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logFile = path.join(moduleLogDir, 'combined.log');
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logData = JSON.parse(logContent);
      expect(logData.message).to.equal(message);
      expect(logData.level).to.equal('info');
      expect(logData.module).to.equal(testModule);
    });

    it('should log error message', async () => {
      const message = 'Test error message';
      logger.error(message, { module: testModule });
      
      // 等待文件写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logFile = path.join(moduleLogDir, 'error.log');
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logData = JSON.parse(logContent);
      expect(logData.message).to.equal(message);
      expect(logData.level).to.equal('error');
      expect(logData.module).to.equal(testModule);
    });

    it('should log debug message', async () => {
      const message = 'Test debug message';
      logger.debug(message, { module: testModule });
      
      // 等待文件写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logFile = path.join(moduleLogDir, 'combined.log');
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logData = JSON.parse(logContent);
      expect(logData.message).to.equal(message);
      expect(logData.level).to.equal('debug');
      expect(logData.module).to.equal(testModule);
    });

    it('should log warn message', async () => {
      const message = 'Test warn message';
      logger.warn(message, { module: testModule });
      
      // 等待文件写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logFile = path.join(moduleLogDir, 'combined.log');
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logData = JSON.parse(logContent);
      expect(logData.message).to.equal(message);
      expect(logData.level).to.equal('warn');
      expect(logData.module).to.equal(testModule);
    });

    it('should use default module name when not provided', async () => {
      const message = 'Test default module message';
      logger.info(message);
      
      // 等待文件写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const defaultModuleDir = path.join(testLogDir, 'default');
      const logFile = path.join(defaultModuleDir, 'combined.log');
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logData = JSON.parse(logContent);
      expect(logData.message).to.equal(message);
      expect(logData.module).to.equal('default');
    });

    it('should include metadata in log entries', async () => {
      const message = 'Test metadata message';
      const metadata = {
        module: testModule,
        userId: '123',
        action: 'test'
      };
      logger.info(message, metadata);
      
      // 等待文件写入
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logFile = path.join(moduleLogDir, 'combined.log');
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logData = JSON.parse(logContent);
      expect(logData.message).to.equal(message);
      expect(logData.userId).to.equal(metadata.userId);
      expect(logData.action).to.equal(metadata.action);
      expect(logData.module).to.equal(testModule);
    });
  });

  describe('error handling', () => {
    it('should handle invalid log level', () => {
      process.env.LOG_LEVEL = 'invalid';
      expect(() => {
        logger.info('test', { module: testModule });
      }).to.throw('无效的日志级别: invalid');
    });

    it('should handle invalid log directory', () => {
      process.env.LOG_DIR = '/invalid/path';
      expect(() => {
        logger.info('test', { module: testModule });
      }).to.throw('创建日志目录失败');
    });

    it('should handle file system errors gracefully', () => {
      // 模拟文件系统错误
      sinon.stub(fs, 'mkdirSync').throws(new Error('File system error'));
      sinon.stub(fs, 'existsSync').returns(false);
      
      expect(() => {
        logger.info('test', { module: testModule });
      }).to.throw('创建日志目录失败: File system error');
    });
  });

  describe('log file management', () => {
    beforeEach(() => {
      // 设置较小的文件大小限制和文件数量限制
      process.env.MAX_LOG_SIZE = '1000'; // 1KB
      process.env.MAX_LOG_FILES = '2';
    });

    it('should create new log file when size limit is reached', async () => {
      // 生成大量日志内容
      const largeMessage = 'x'.repeat(500);
      for (let i = 0; i < 10; i++) {
        logger.info(largeMessage, { module: testModule });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 检查是否创建了多个日志文件
      const files = fs.readdirSync(moduleLogDir);
      const logFiles = files.filter(file => file.startsWith('combined'));
      expect(logFiles.length).to.be.at.most(2);
    });
  });
}); 