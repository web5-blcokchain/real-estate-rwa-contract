import { ethers } from 'ethers';
import { AppError } from '../utils/error';

interface Property {
  id: string;
  country: string;
  metadataURI: string;
  owner: string;
  value: string;
  location: {
    address: string;
    city: string;
    prefecture: string;
  };
  status?: string;
  token?: {
    address: string;
    name: string;
    symbol: string;
    totalSupply: string;
  };
}

interface GetPropertiesParams {
  page: number;
  limit: number;
  status?: string;
  owner?: string;
}

export class PropertyService {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const contractAddress = JSON.parse(process.env.CONTRACT_ADDRESSES || '{}').PropertyRegistry;
    if (!contractAddress) {
      throw new AppError('Contract address not configured', 500, 'CONFIG_001');
    }
    // 这里需要添加合约ABI
    this.contract = new ethers.Contract(contractAddress, [], this.provider);
  }

  async registerProperty(data: Omit<Property, 'status' | 'token'>): Promise<Property> {
    try {
      // 调用智能合约注册房产
      const tx = await this.contract.registerProperty(
        data.id,
        data.country,
        data.metadataURI,
        data.owner,
        data.value,
        data.location
      );
      await tx.wait();

      return {
        ...data,
        status: 'pending'
      };
    } catch (error: any) {
      throw new AppError('Failed to register property', 500, 'PROP_002', error.message);
    }
  }

  async getProperties(params: GetPropertiesParams): Promise<{
    items: Property[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // 从智能合约获取房产列表
      const properties = await this.contract.getProperties(
        params.page,
        params.limit,
        params.status,
        params.owner
      );

      return {
        items: properties,
        total: await this.contract.getPropertyCount(),
        page: params.page,
        limit: params.limit
      };
    } catch (error: any) {
      throw new AppError('Failed to get properties', 500, 'PROP_003', error.message);
    }
  }

  async getProperty(id: string): Promise<Property | null> {
    try {
      const property = await this.contract.getProperty(id);
      if (!property) {
        return null;
      }
      return property;
    } catch (error: any) {
      throw new AppError('Failed to get property', 500, 'PROP_004', error.message);
    }
  }

  async updatePropertyStatus(id: string, status: string, reason: string): Promise<Property> {
    try {
      const tx = await this.contract.updatePropertyStatus(id, status, reason);
      await tx.wait();

      const property = await this.getProperty(id);
      if (!property) {
        throw new AppError('Property not found after update', 404, 'PROP_001');
      }
      return property;
    } catch (error: any) {
      throw new AppError('Failed to update property status', 500, 'PROP_005', error.message);
    }
  }
} 