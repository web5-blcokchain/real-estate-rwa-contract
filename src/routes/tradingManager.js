import { Router } from 'express';
import { 
  createOrder, 
  executeOrder, 
  cancelOrder, 
  getAllOrders,
  getOrderById
} from '../controllers/tradingManagerController.js';

// ... existing code ... 