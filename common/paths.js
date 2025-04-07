const path = require('path');

/**
 * 项目路径工具类
 * 用于提供统一的路径引用
 */
class Paths {
  // 项目根目录
  static ROOT = process.cwd();
  
  // common目录
  static COMMON = path.join(Paths.ROOT, 'common');
  
  // server目录
  static SERVER = path.join(Paths.ROOT, 'server');
  
  // controllers目录
  static CONTROLLERS = path.join(Paths.SERVER, 'controllers');
  
  // middleware目录
  static MIDDLEWARE = path.join(Paths.SERVER, 'middleware');
  
  // routes目录
  static ROUTES = path.join(Paths.SERVER, 'routes');
  
  // contracts目录
  static CONTRACTS = path.join(Paths.ROOT, 'contracts');
  
  // artifacts目录
  static ARTIFACTS = path.join(Paths.ROOT, 'artifacts');
  
  // logs目录
  static LOGS = path.join(Paths.ROOT, 'logs');
  
  /**
   * 获取模块的绝对路径
   * @param {string} basePath - 基础路径
   * @param {string} modulePath - 模块相对路径
   * @returns {string} 模块的绝对路径
   */
  static getModulePath(basePath, modulePath) {
    return path.join(basePath, modulePath);
  }
  
  /**
   * 获取common目录中模块的绝对路径
   * @param {string} modulePath - 模块相对路径
   * @returns {string} 模块的绝对路径
   */
  static getCommonModule(modulePath) {
    return Paths.getModulePath(Paths.COMMON, modulePath);
  }
  
  /**
   * 获取controller目录中模块的绝对路径
   * @param {string} modulePath - 模块相对路径
   * @returns {string} 模块的绝对路径
   */
  static getControllerModule(modulePath) {
    return Paths.getModulePath(Paths.CONTROLLERS, modulePath);
  }
  
  /**
   * 获取middleware目录中模块的绝对路径
   * @param {string} modulePath - 模块相对路径
   * @returns {string} 模块的绝对路径
   */
  static getMiddlewareModule(modulePath) {
    return Paths.getModulePath(Paths.MIDDLEWARE, modulePath);
  }
}

module.exports = Paths; 