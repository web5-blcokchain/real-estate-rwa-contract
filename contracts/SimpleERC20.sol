// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleERC20
 * @dev 用于测试的简单ERC20代币
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