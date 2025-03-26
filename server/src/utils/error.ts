export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
} 