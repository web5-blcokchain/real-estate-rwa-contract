<?php

require_once 'MerkleTree.php';

class MerkleTreeExample {
    /**
     * 创建收益分配并生成默克尔树
     * @param string $propertyId 房产ID
     * @param array $userBalances 用户余额数组，格式：[['address' => '0x...', 'balance' => 1000000], ...]
     * @param int $totalAmount 总分配金额
     * @param int $totalSupply 代币总供应量
     * @return array 包含默克尔根和证明的数组
     */
    public static function createDistribution($propertyId, $userBalances, $totalAmount, $totalSupply) {
        try {
            // 计算每个用户的可领取金额
            $merkleData = [];
            foreach ($userBalances as $user) {
                $eligibleAmount = ($totalAmount * $user['balance']) / $totalSupply;
                $merkleData[] = [
                    'address' => $user['address'],
                    'totalEligible' => $eligibleAmount
                ];
            }
            
            // 创建默克尔树
            $merkleTree = new MerkleTree($merkleData);
            
            // 获取默克尔根
            $merkleRoot = $merkleTree->getRoot();
            
            // 为每个用户生成默克尔证明
            $proofs = [];
            foreach ($merkleData as $userData) {
                $proofs[$userData['address']] = [
                    'proof' => $merkleTree->getProof($userData),
                    'amount' => $userData['totalEligible']
                ];
            }
            
            return [
                'merkleRoot' => $merkleRoot,
                'proofs' => $proofs,
                'isSingleNode' => $merkleTree->isSingleNodeTree()
            ];
        } catch (Exception $e) {
            throw new Exception('创建默克尔树失败: ' . $e->getMessage());
        }
    }

    /**
     * 验证默克尔证明
     * @param string $merkleRoot 默克尔根
     * @param string $userAddress 用户地址
     * @param int $amount 金额
     * @param array $merkleProof 默克尔证明
     * @return bool 验证结果
     */
    public static function verifyProof($merkleRoot, $userAddress, $amount, $merkleProof) {
        try {
            // 创建单个元素的默克尔树
            $merkleData = [
                [
                    'address' => $userAddress,
                    'totalEligible' => $amount
                ]
            ];
            
            $merkleTree = new MerkleTree($merkleData);
            
            // 如果是单节点树，直接比较根节点
            if ($merkleTree->isSingleNodeTree()) {
                return $merkleTree->getRoot() === $merkleRoot;
            }
            
            // 获取叶子节点的哈希值
            $leaf = $merkleTree->getRoot();
            
            // 验证证明
            $currentHash = $leaf;
            foreach ($merkleProof as $proofElement) {
                $currentHash = $merkleTree->hashPair($currentHash, $proofElement);
            }
            
            return $currentHash === $merkleRoot;
        } catch (Exception $e) {
            throw new Exception('验证默克尔证明失败: ' . $e->getMessage());
        }
    }
}

// 使用示例
try {
    // 示例参数
    $propertyId = 'PROP-123';
    $totalAmount = 1000000000000000000; // 1 ETH (18位精度)
    $totalSupply = 1000000000000000000; // 1 ETH (18位精度)
    
    // 多个用户的余额
    $userBalances = [
        [
            'address' => '0xA5922D51BfD5b9381f1FF32418FddFdE35582cAC',
            'balance' => 100000000000000000 // 0.1 ETH
        ],
        [
            'address' => '0xB5922D51BfD5b9381f1FF32418FddFdE35582cAD',
            'balance' => 200000000000000000 // 0.2 ETH
        ],
        [
            'address' => '0xC5922D51BfD5b9381f1FF32418FddFdE35582cAE',
            'balance' => 300000000000000000 // 0.3 ETH
        ]
    ];
    
    // 创建分配
    $result = MerkleTreeExample::createDistribution(
        $propertyId,
        $userBalances,
        $totalAmount,
        $totalSupply
    );
    
    echo "默克尔根: " . $result['merkleRoot'] . "\n";
    echo "是否为单节点: " . ($result['isSingleNode'] ? "是" : "否") . "\n";
    echo "\n用户证明信息:\n";
    
    foreach ($result['proofs'] as $address => $proofInfo) {
        echo "\n用户地址: " . $address . "\n";
        echo "可领取金额: " . $proofInfo['amount'] . "\n";
        echo "默克尔证明: " . json_encode($proofInfo['proof']) . "\n";
        
        // 验证证明
        $isValid = MerkleTreeExample::verifyProof(
            $result['merkleRoot'],
            $address,
            $proofInfo['amount'],
            $proofInfo['proof']
        );
        
        echo "验证结果: " . ($isValid ? "有效" : "无效") . "\n";
    }
    
} catch (Exception $e) {
    echo "错误: " . $e->getMessage() . "\n";
} 