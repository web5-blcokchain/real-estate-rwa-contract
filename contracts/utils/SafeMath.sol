// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title SafeMath
 * @dev 提供安全的数学操作，防止溢出
 * 虽然Solidity 0.8.0+已内置溢出检查，但这个库提供额外安全性和一致性
 */
library SafeMath {
    /**
     * @dev 安全的乘法运算，检查溢出
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    /**
     * @dev 安全的除法运算，检查除以零
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }

    /**
     * @dev 安全的减法运算，检查溢出
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    }

    /**
     * @dev 安全的加法运算，检查溢出
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    /**
     * @dev 安全的取模运算，检查除以零
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: modulo by zero");
        return a % b;
    }
} 