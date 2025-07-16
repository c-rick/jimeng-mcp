// script/start.ts
import express from 'express'
import { generateImage } from '../src/api'

async function start() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  // 增加请求日志中间件
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] 收到请求: ${req.method} ${req.originalUrl}`);
    console.log('请求参数:', req.body); // 打印请求体参数
    next();
  });

  app.post('/generateImage', async (req, res) => {
    try {
      console.log('[生成图像] 开始处理请求...');
      const startTime = Date.now();

      const result = await generateImage(req.body);

      const endTime = Date.now();
      console.log(`[生成图像] 处理完成，耗时 ${endTime - startTime}ms`);
      console.log('[生成图像] 响应结果:', result);

      return res.json(result);
    } catch (err) {
      console.error('[生成图像] 失败:', err);
      return res.status(500).json({ error: '生成错误: ' + err });
    }
  });

  // 增加响应日志中间件
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(body) {
      console.log(`[${new Date().toISOString()}] 发送响应:`, body);
      return originalSend.call(this, body);
    };
    next();
  });

  app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
    console.log('等待接收请求...');
  });
}

start().catch((err) => {
  console.error('服务启动失败:', err);
})
