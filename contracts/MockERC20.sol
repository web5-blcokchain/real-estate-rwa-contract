// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev 一个用于测试的简单ERC20代币合约
 */
contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
    }

    /**
     * @dev 覆盖小数位数方法
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev 铸造新代币，只有合约拥有者可以调用
     * @param to 接收代币的地址
     * @param amount 铸造的代币数量
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev 销毁代币，只有合约拥有者可以调用
     * @param from 被销毁代币的地址
     * @param amount 销毁的代币数量
     */
    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
} 