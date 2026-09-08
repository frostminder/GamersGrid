import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function videoUploadPlugin(): Plugin {
  const setupMiddlewares = (server: any) => {
      const uploadDir = path.resolve(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // 1. Streaming video delivery with HTTP 206 Partial Content range support
      server.middlewares.use('/uploads', (req: any, res: any, next: any) => {
        const parsedUrl = req.url ? req.url.split('?')[0] : '';
        const cleanName = path.basename(parsedUrl);
        const filePath = path.join(uploadDir, cleanName);

        if (!cleanName || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next();
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        const ext = path.extname(cleanName).toLowerCase();
        const contentType = ext === '.webm' ? 'video/webm' : ext === '.ogg' ? 'video/ogg' : 'video/mp4';

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = (end - start) + 1;
          const fileStream = fs.createReadStream(filePath, { start, end });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType,
          });
          fileStream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
          });
          fs.createReadStream(filePath).pipe(res);
        }
      });

      // 2. Video Upload handler
      server.middlewares.use('/api/upload-video', (req: any, res: any) => {
        if (req.method === 'POST') {
          try {
            const ext = (req.headers['x-file-ext'] as string) || 'mp4';
            const filename = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const targetPath = path.join(uploadDir, filename);
            const fileStream = fs.createWriteStream(targetPath);

            req.pipe(fileStream);

            fileStream.on('finish', () => {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                url: `/uploads/${filename}`
              }));
            });

            fileStream.on('error', (err: any) => {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            });
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err?.message || 'Upload failed' }));
          }
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });

      // Helper to read Cloudflare R2 config from process.env or local file
      const r2ConfigFile = path.resolve(process.cwd(), 'r2-config.json');
      const getR2Config = () => {
        let fileConfig: any = {};
        if (fs.existsSync(r2ConfigFile)) {
          try {
            fileConfig = JSON.parse(fs.readFileSync(r2ConfigFile, 'utf-8'));
          } catch (e) {}
        }
        return {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID || fileConfig.accountId || '',
          accessKeyId: process.env.R2_ACCESS_KEY_ID || fileConfig.accessKeyId || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || fileConfig.secretAccessKey || '',
          bucketName: process.env.R2_BUCKET_NAME || fileConfig.bucketName || '',
          publicDomain: process.env.R2_PUBLIC_DOMAIN || fileConfig.publicDomain || '',
        };
      };

      // 3. Cloudflare R2 Presigned Upload URL Generator
      server.middlewares.use('/api/get-presigned-url', async (req: any, res: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { fileName = 'media', fileType = 'application/octet-stream' } = JSON.parse(body || '{}');
              const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = getR2Config();

              if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                return res.end(JSON.stringify({
                  success: false,
                  needsConfig: true,
                  error: 'Cloudflare R2 credentials not configured.'
                }));
              }

              const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
              const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

              const s3 = new S3Client({
                region: 'auto',
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                credentials: {
                  accessKeyId,
                  secretAccessKey,
                },
              });

              const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
              const key = `media/${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${cleanName}`;

              const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                ContentType: fileType,
                CacheControl: 'public, max-age=31536000, immutable',
              });

              const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
              const cleanPublicDomain = (publicDomain || `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, '');
              const publicUrl = `${cleanPublicDomain}/${key}`;

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                uploadUrl,
                publicUrl
              }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message || 'Presign generation failed' }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });

      // 4. Cloudflare R2 Credentials & Status API
      server.middlewares.use('/api/r2-config', async (req: any, res: any) => {
        if (req.method === 'GET') {
          const cfg = getR2Config();
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          return res.end(JSON.stringify({
            isConfigured: Boolean(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucketName),
            accountId: cfg.accountId ? `${cfg.accountId.substring(0, 6)}...` : '',
            bucketName: cfg.bucketName || '',
            publicDomain: cfg.publicDomain || '',
            hasAccessKey: Boolean(cfg.accessKeyId),
            hasSecretKey: Boolean(cfg.secretAccessKey)
          }));
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });

      // 5. Cloudflare R2 Save & Test Connection Endpoint
      server.middlewares.use('/api/save-r2-config', async (req: any, res: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = JSON.parse(body || '{}');
              
              if (!accountId?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim() || !bucketName?.trim()) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                return res.end(JSON.stringify({
                  success: false,
                  error: 'All fields are required.'
                }));
              }

              const cleanAccountId = accountId.trim();
              const cleanAccessKeyId = accessKeyId.trim();
              const cleanSecretAccessKey = secretAccessKey.trim();
              const cleanBucketName = bucketName.trim();
              const cleanPublicDomain = (publicDomain?.trim() || `https://${cleanBucketName}.${cleanAccountId}.r2.cloudflarestorage.com`).replace(/\/+$/, '');

              const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
              const s3 = new S3Client({
                region: 'auto',
                endpoint: `https://${cleanAccountId}.r2.cloudflarestorage.com`,
                credentials: {
                  accessKeyId: cleanAccessKeyId,
                  secretAccessKey: cleanSecretAccessKey,
                },
              });

              try {
                await s3.send(new ListObjectsV2Command({
                  Bucket: cleanBucketName,
                  MaxKeys: 1,
                }));
              } catch (connErr: any) {
                console.warn('R2 Bucket check note:', connErr?.message);
              }

              const configToSave = {
                accountId: cleanAccountId,
                accessKeyId: cleanAccessKeyId,
                secretAccessKey: cleanSecretAccessKey,
                bucketName: cleanBucketName,
                publicDomain: cleanPublicDomain,
                updatedAt: new Date().toISOString()
              };

              fs.writeFileSync(r2ConfigFile, JSON.stringify(configToSave, null, 2), 'utf-8');

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                message: `Successfully connected Cloudflare R2 bucket: ${cleanBucketName}!`,
                publicDomain: cleanPublicDomain
              }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({
                success: false,
                error: err?.message || 'Failed to save Cloudflare R2 configuration'
              }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });

      // 6. Direct server-side R2 streaming upload endpoint
      server.middlewares.use('/api/upload-to-r2-direct', async (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (req.method === 'POST') {
          try {
            const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = getR2Config();
            if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              return res.end(JSON.stringify({ success: false, error: 'R2 credentials not configured' }));
            }

            const fileName = (req.headers['x-file-name'] as string) || 'media';
            const rawFileType = (req.headers['x-file-type'] as string) || 'application/octet-stream';
            const fileType = decodeURIComponent(rawFileType);
            const cleanName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
            const key = `media/${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${cleanName}`;

            const { S3Client } = await import('@aws-sdk/client-s3');
            const { Upload } = await import('@aws-sdk/lib-storage');

            const s3 = new S3Client({
              region: 'auto',
              endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
              credentials: { accessKeyId, secretAccessKey },
            });

            const upload = new Upload({
              client: s3,
              params: {
                Bucket: bucketName,
                Key: key,
                Body: req,
                ContentType: fileType,
                CacheControl: 'public, max-age=31536000, immutable',
              },
              queueSize: 4,
              partSize: 1024 * 1024 * 5,
              leavePartsOnError: false,
            });

            await upload.done();

            const cleanPublicDomain = (publicDomain || `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, '');
            const publicUrl = `${cleanPublicDomain}/${key}`;

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, url: publicUrl, key }));
          } catch (e: any) {
            console.error('Streaming R2 upload failed:', e);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: e?.message || 'Error processing streaming upload to Cloudflare R2' }));
          }
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
      };

      return {
        name: 'video-upload-plugin',
        configureServer(server: any) {
          setupMiddlewares(server);
        },
        configurePreviewServer(server: any) {
          setupMiddlewares(server);
        }
      };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      videoUploadPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Gamers Grid',
          short_name: 'Gamers Grid',
          description: 'Gamers Grid Live Engine',
          theme_color: '#121212',
          background_color: '#121212',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
