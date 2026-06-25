import { Router, Request, Response } from 'express';
import { getApp } from '../services/storage';
import { getPublicUrl, isR2Configured } from '../services/r2';

const router = Router();

router.get('/install/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const app = getApp(id);

  if (!app) {
    res.status(404).send(generateNotFoundPage());
    return;
  }

  if (app.status !== 'signed') {
    res.status(400).send(generateErrorPage('App is not signed yet'));
    return;
  }

  if (!app.manifestR2Key || !isR2Configured()) {
    res.status(404).send(generateNotFoundPage());
    return;
  }

  const url = getPublicUrl(app.manifestR2Key);
  res.redirect(url);
});

function generateNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Not Found</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #000; color: #fff;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; text-align: center;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        p { color: #8e8e93; font-size: 15px; }
    </style>
</head>
<body>
    <div>
        <h1>App Not Found</h1>
        <p>This installation link has expired or is invalid.</p>
    </div>
</body>
</html>`;
}

function generateErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #000; color: #fff;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; text-align: center;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        p { color: #8e8e93; font-size: 15px; }
    </style>
</head>
<body>
    <div>
        <h1>Error</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;
}

export { router as installRouter };
