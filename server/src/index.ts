import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './logger';
import { initStorage, cleanupOldApps } from './services/storage';
import { uploadRouter } from './routes/upload';
import { signRouter } from './routes/sign';
import { installRouter } from './routes/install';
import { downloadRouter } from './routes/download';
import { appRouter } from './routes/app';
import { historyRouter } from './routes/history';
import { manifestRouter } from './routes/manifest';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

app.use('/api', uploadRouter);
app.use('/api', signRouter);
app.use('/api', installRouter);
app.use('/api', downloadRouter);
app.use('/api', appRouter);
app.use('/api', historyRouter);
app.use('/api', manifestRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

initStorage();

setInterval(() => {
  cleanupOldApps();
}, config.cleanupIntervalMs);

app.listen(config.port, config.host, () => {
  logger.info(`AffSign server running on ${config.host}:${config.port}`);
  logger.info(`Domain: ${config.protocol}://${config.domain}`);
});
