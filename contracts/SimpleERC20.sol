// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleERC20 - 日本房地产平台测试用稳定币合约
 * @author Fashi Shijian团队
 * @notice 本合约实现了一个简化版的ERC20代币，主要用于测试和开发环境中模拟稳定币
 * 
 * @dev 合约功能描述：
 * 1. 基础代币功能：实现标准ERC20接口，支持转账、余额查询等基本操作
 * 2. 代币管理：支持铸造和销毁代币，仅限合约所有者操作
 * 3. 权限控制：使用Ownable模式限制敏感操作权限
 * 
 * @dev 使用场景：
 * - 开发测试：用于开发和测试阶段模拟稳定币交易
 * - 演示环境：在演示环境中作为支付媒介
 * - 集成测试：验证系统各模块与稳定币的交互功能
 * 
 * @dev 与其他模块的关联：
 * - TradingManager：作为交易支付媒介
 * - RewardManager：作为分配收益的稳定币
 * - 测试脚本：用于自动化测试中的模拟交易
 * 
 * @dev 安全考虑：
 * - 仅用于测试，不应在生产环境中使用
 * - 铸造和销毁功能仅限所有者使用，防止滥用
 * 
 * @dev 扩展可能：
 * - 可添加暂停功能用于测试紧急情况
 * - 可添加角色基础的权限控制，模拟更复杂的业务场景
 * - 可实现ERC20标准的扩展接口，如元数据、快照等
 */
contract SimpleERC20 is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable() {
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev 铸造代币
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev 销毁代币
     */
    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
} 