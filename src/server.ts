import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateImage, generateVideo } from "./api.js";

// 定义服务器返回类型接口
export interface ServerInstance {
  server: McpServer;
  transport: StdioServerTransport;
}

// 创建MCP服务器
export const createServer = (): McpServer => {
  const server = new McpServer({
    name: "Jimeng MCP Server",
    version: "1.0.0"
  });

  // 添加一个简单的问候工具
  server.tool(
    "hello",
    { name: z.string() },
    async ({ name }) => ({
      content: [{ type: "text", text: `你好，${name}！` }]
    })
  );

  // 添加即梦AI图像生成工具
  server.tool(
    "generateImage",
    {
      filePath: z.string().optional().describe("本地图片路径或图片URL（可选，若填写则为图片混合/参考图生成功能）"),
      prompt: z.string().describe("生成图像的文本描述"),
      model: z.string().optional().describe("模型名称，可选值: jimeng-5.0, jimeng-4.6, jimeng-4.5, jimeng-4.1, jimeng-4.0, jimeng-3.1, jimeng-3.0（旧版: jimeng-2.1, jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro）"),
      width: z.number().optional().default(1024).describe("图像宽度，默认值：1024"),
      height: z.number().optional().default(1024).describe("图像高度，默认值：1024"),
      sample_strength: z.number().optional().default(0.5).describe("精细度，默认值：0.5，范围0-1"),
      negative_prompt: z.string().optional().default("").describe("反向提示词，告诉模型不要生成什么内容"),
    },
    async (params) => {
      try {
        const imageUrls = await generateImage({
          filePath: params.filePath,
          prompt: params.prompt,
          model: params.model,
          width: params.width,
          height: params.height,
          sample_strength: params.sample_strength,
          negative_prompt: params.negative_prompt
        });

        // 如果没有返回URL数组，返回错误信息
        if (!imageUrls || (Array.isArray(imageUrls) && imageUrls.length === 0)) {
          return {
            content: [{ type: "text", text: "图像生成失败：未能获取图像URL" }],
            isError: true
          };
        }


        // 将返回的图像URL转换为MCP响应格式
        const responseContent: { type: "text", text: string }[] = []

        if (typeof imageUrls === 'string') {
          // 单个URL的情况
          responseContent.push({
            type: "text",
            text: imageUrls
          });
        } else if (Array.isArray(imageUrls)) {
          // URL数组的情况
          for (const url of imageUrls) {
            responseContent.push({
              type: "text",
              text: url
            });
          }
        }

        return {
          content: responseContent
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `图像生成失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  // 添加即梦AI视频生成工具
  server.tool(
    "generateVideo",
    {
      filePath: z.array(z.string()).optional().describe("首帧和尾帧图片路径，支持数组，最多2个元素，分别为首帧和尾帧"),
      resolution: z.string().optional().describe("分辨率，可选720p或1080p，默认720p"),
      model: z.string().optional().describe("模型名称，可选值: jimeng-video-seedance-2.0, jimeng-video-seedance-2.0-fast, jimeng-video-3.5-pro, jimeng-video-3.0-pro, jimeng-video-3.0-fast, jimeng-video-3.0，默认jimeng-video-3.0-fast"),
      prompt: z.string().describe("生成视频的文本描述"),
      width: z.number().optional().default(1024).describe("视频宽度，默认1024"),
      height: z.number().optional().default(1024).describe("视频高度，默认1024"),
      refresh_token: z.string().optional().describe("即梦API令牌（可选，通常从环境变量读取）"),
      req_key: z.string().optional().describe("自定义参数，兼容旧接口")
    },
    async (params) => {
      try {
        const videoUrl = await generateVideo({
          filePath: params.filePath,
          resolution: params.resolution,
          model: params.model,
          prompt: params.prompt,
          width: params.width,
          height: params.height,
          refresh_token: params.refresh_token,
          req_key: params.req_key
        });
        if (!videoUrl) {
          return {
            content: [{ type: "text", text: "视频生成失败：未能获取视频URL" }],
            isError: true
          };
        }
        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `视频生成失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  // 添加一个问候资源
  server.resource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    async (uri, { name }) => ({
      contents: [{
        uri: uri.href,
        text: `欢迎使用Jimeng MCP服务器，${name}！`
      }]
    })
  );

  // 添加一个静态信息资源
  server.resource(
    "info",
    "info://server",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
            Jimeng MCP 服务器
            版本: 1.0.0
            运行于: ${process.platform}
            Node版本: ${process.version}
        `
      }]
    })
  );

  // 添加即梦AI图像生成服务信息资源
  server.resource(
    "jimeng-ai",
    "jimeng-ai://info",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
          即梦AI图像生成服务
          -----------------
          通过使用 generateImage 工具提交图像生成请求

          需要在环境变量中设置:
          JIMENG_API_TOKEN - 即梦API令牌（从即梦网站获取的sessionid）

          参数说明:
          - filePath: 本地图片路径或图片URL（可选，若填写则为图片混合/参考图生成功能）
          - prompt: 生成图像的文本描述（必填）
          - model: 模型名称，可选值: jimeng-5.0, jimeng-4.6, jimeng-4.5, jimeng-4.1, jimeng-4.0, jimeng-3.1, jimeng-3.0（可选）
          - width: 图像宽度，默认值：1024（可选）
          - height: 图像高度，默认值：1024（可选）
          - sample_strength: 精细度，默认值：0.5，范围0-1（可选）
          - negative_prompt: 反向提示词，告诉模型不要生成什么内容（可选）

          示例:
          generateImage({
            "filePath": "./test.png",
            "prompt": "一只可爱的猫咪",
            "model": "jimeng-5.0",
            "width": 1024,
            "height": 1024,
            "sample_strength": 0.7,
            "negative_prompt": "模糊，扭曲，低质量"
          })
        `
      }]
    })
  );

  // 添加即梦AI视频生成服务信息资源
  server.resource(
    "jimeng-ai-video",
    "jimeng-ai-video://info",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
          即梦AI视频生成服务
          -----------------
          通过使用 generateVideo 工具提交视频生成请求

          需要在环境变量中设置:
          JIMENG_API_TOKEN - 即梦API令牌（从即梦网站获取的sessionid）

          参数说明:
          - filePath: 首帧和尾帧图片路径，支持数组，最多2个元素，分别为首帧和尾帧（可选）
          - prompt: 生成视频的文本描述（必填）
          - model: 模型名称，可选值: jimeng-video-seedance-2.0, jimeng-video-seedance-2.0-fast, jimeng-video-3.5-pro, jimeng-video-3.0-pro, jimeng-video-3.0-fast, jimeng-video-3.0，默认jimeng-video-3.0-fast（可选）
          - resolution: 分辨率，可选720p或1080p，默认720p（可选）
          - width: 视频宽度，默认1024（可选）
          - height: 视频高度，默认1024（可选）
          - refresh_token: 即梦API令牌（可选，通常从环境变量读取）
          - req_key: 自定义参数，兼容旧接口（可选）

          示例:
          generateVideo({
            "filePath": ["./first.png", "./last.png"],
            "prompt": "一只小狗在草地上奔跑，阳光明媚，高清",
            "model": "jimeng-video-3.0-fast",
            "resolution": "720p",
            "width": 1024,
            "height": 1024
          })
        `
      }]
    })
  );

  return server;
};

// 启动服务器
export const startServer = async (): Promise<ServerInstance> => {
  const server = createServer();
  const transport = new StdioServerTransport();

  console.log("Jimeng MCP Server 正在启动...");

  await server.connect(transport);

  console.log("Jimeng MCP Server 已启动");

  return { server, transport };
}; 