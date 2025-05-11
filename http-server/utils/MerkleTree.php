<?php

class MerkleTree {
    private $elements;
    private $leaves;
    private $layers;
    private $isSingleNode;

    public function __construct(array $elements) {
        $this->elements = $elements;
        $this->leaves = array_map([$this, 'hashLeaf'], $elements);
        $this->isSingleNode = count($this->leaves) === 1;
        $this->layers = $this->buildLayers($this->leaves);
    }

    /**
     * 生成叶子节点的哈希值
     * @param array $element 包含address和totalEligible的数组
     * @return string 哈希值
     */
    private function hashLeaf($element) {
        // 确保地址是20字节（40个十六进制字符）
        $address = str_pad(substr($element['address'], 2), 40, '0', STR_PAD_LEFT);
        
        // 将金额转换为32字节的十六进制字符串
        $amount = str_pad(dechex($element['totalEligible']), 64, '0', STR_PAD_LEFT);
        
        // 连接地址和金额
        $data = hex2bin($address . $amount);
        
        // 计算keccak256哈希
        return '0x' . hash('keccak256', $data);
    }

    /**
     * 构建默克尔树的层级
     * @param array $elements 叶子节点数组
     * @return array 树的所有层级
     */
    private function buildLayers(array $elements) {
        // 如果只有一个节点，直接返回该节点作为根
        if ($this->isSingleNode) {
            return [$elements];
        }
        
        $layers = [$elements];
        
        while (count($layers[count($layers) - 1]) > 1) {
            $layer = [];
            $currentLayer = $layers[count($layers) - 1];
            
            for ($i = 0; $i < count($currentLayer); $i += 2) {
                $left = $currentLayer[$i];
                $right = ($i + 1 < count($currentLayer)) ? $currentLayer[$i + 1] : $left;
                $layer[] = $this->hashPair($left, $right);
            }
            
            $layers[] = $layer;
        }
        
        return $layers;
    }

    /**
     * 计算两个节点的哈希值
     * @param string $left 左节点哈希
     * @param string $right 右节点哈希
     * @return string 哈希值
     */
    private function hashPair($left, $right) {
        // 如果只有一个节点，直接返回该节点的哈希值
        if ($this->isSingleNode) {
            return $left;
        }
        
        // 确保输入是32字节的十六进制字符串
        $left = str_pad(substr($left, 2), 64, '0', STR_PAD_LEFT);
        $right = str_pad(substr($right, 2), 64, '0', STR_PAD_LEFT);
        
        // 按字典序排序
        if (strcmp($left, $right) > 0) {
            list($left, $right) = [$right, $left];
        }
        
        // 连接并计算哈希
        $data = hex2bin($left . $right);
        return '0x' . hash('keccak256', $data);
    }

    /**
     * 获取默克尔根
     * @return string 默克尔根哈希值
     */
    public function getRoot() {
        // 如果只有一个节点，直接返回该节点的哈希值
        if ($this->isSingleNode) {
            return $this->leaves[0];
        }
        return $this->layers[count($this->layers) - 1][0];
    }

    /**
     * 获取指定元素的默克尔证明
     * @param array $element 要证明的元素
     * @return array 默克尔证明数组
     */
    public function getProof($element) {
        // 如果只有一个节点，返回空数组
        if ($this->isSingleNode) {
            return [];
        }
        
        $leaf = $this->hashLeaf($element);
        $index = array_search($leaf, $this->leaves);
        
        if ($index === false) {
            throw new Exception('Element not found in tree');
        }
        
        $proof = [];
        $currentIndex = $index;
        
        for ($i = 0; $i < count($this->layers) - 1; $i++) {
            $layer = $this->layers[$i];
            $isRight = $currentIndex % 2 === 1;
            $siblingIndex = $isRight ? $currentIndex - 1 : $currentIndex + 1;
            
            if ($siblingIndex < count($layer)) {
                $proof[] = $layer[$siblingIndex];
            }
            
            $currentIndex = floor($currentIndex / 2);
        }
        
        return $proof;
    }

    /**
     * 检查是否为单节点树
     * @return bool 是否为单节点树
     */
    public function isSingleNodeTree() {
        return $this->isSingleNode;
    }
} 