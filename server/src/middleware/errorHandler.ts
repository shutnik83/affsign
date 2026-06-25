import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logger } from '../logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`${req.method} ${req.path} - ${err.message}`, { stack: err.stack });

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 5GB.',
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
    return;
  }

  if (err.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
