import { Request, Response, NextFunction } from 'express';
import { PropertyService } from '../services/property.service';
import { AppError } from '../utils/error';

export class PropertyController {
  private service: PropertyService;

  constructor() {
    this.service = new PropertyService();
  }

  registerProperty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const property = await this.service.registerProperty(req.body);
      res.json({
        success: true,
        data: property
      });
    } catch (error) {
      next(error);
    }
  };

  getProperties = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, status, owner } = req.query;
      const properties = await this.service.getProperties({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        owner: owner as string
      });
      res.json({
        success: true,
        data: properties
      });
    } catch (error) {
      next(error);
    }
  };

  getProperty = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const property = await this.service.getProperty(req.params.id);
      if (!property) {
        throw new AppError('Property not found', 404, 'PROP_001');
      }
      res.json({
        success: true,
        data: property
      });
    } catch (error) {
      next(error);
    }
  };

  updatePropertyStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const property = await this.service.updatePropertyStatus(
        req.params.id,
        req.body.status,
        req.body.reason
      );
      res.json({
        success: true,
        data: property
      });
    } catch (error) {
      next(error);
    }
  };
} 