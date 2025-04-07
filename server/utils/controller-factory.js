/**
 * 控制器工厂类
 * 用于管理控制器实例，确保每个控制器类只创建一个实例
 */
class ControllerFactory {
  // 控制器实例缓存
  static #instances = new Map();
  
  /**
   * 获取控制器实例
   * @param {Class} ControllerClass - 控制器类
   * @returns {Object} 控制器实例
   */
  static getController(ControllerClass) {
    const className = ControllerClass.name;
    
    // 检查缓存中是否已存在该实例
    if (!this.#instances.has(className)) {
      // 创建新实例并缓存
      this.#instances.set(className, new ControllerClass());
    }
    
    return this.#instances.get(className);
  }
  
  /**
   * 获取路由处理器
   * 返回已绑定this的方法，适用于路由中间件
   * @param {Class} ControllerClass - 控制器类
   * @param {string} methodName - 方法名
   * @returns {Function} 路由处理器函数
   */
  static getHandler(ControllerClass, methodName) {
    const controller = this.getController(ControllerClass);
    
    if (typeof controller[methodName] !== 'function') {
      throw new Error(`方法 ${methodName} 在控制器 ${ControllerClass.name} 中不存在`);
    }
    
    return controller[methodName].bind(controller);
  }
  
  /**
   * 清除控制器实例缓存
   * 主要用于测试环境
   * @param {string} [className] - 控制器类名，不传则清除所有缓存
   */
  static clearCache(className) {
    if (className) {
      this.#instances.delete(className);
    } else {
      this.#instances.clear();
    }
  }
}

module.exports = ControllerFactory; 