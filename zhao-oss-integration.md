# Zhao-OSS 集成说明

## 1. 在 zhao-oss 插件中添加用户端 API

由于工作目录限制，请在 `e:\code\plugins\zhao-oss` 目录中手动添加以下文件：

### 1.1 添加新的控制器文件
新建文件：`server/src/controllers/api-controller.ts`

```typescript
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 直接上传文件到OSS（用户端） */
  async upload(ctx: any) {
    try {
      const { files } = ctx.request;
      if (!files || Object.keys(files).length === 0) {
        ctx.status = 400;
        ctx.body = { error: "No files provided" };
        return;
      }

      const file = Object.values(files)[0] as any;
      const registry = strapi.plugin("zhao-oss").service("provider-registry");
      const provider = registry.getPrimaryProvider();

      if (!provider) {
        ctx.status = 500;
        ctx.body = { error: "No OSS provider configured" };
        return;
      }

      const fs = require("fs/promises");
      const path = require("path");
      const crypto = require("crypto");
      const fileBuffer = await fs.readFile(file.path);
      const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");

      const result = await provider.upload({
        buffer: fileBuffer,
        filename: file.name || `file_${Date.now()}`,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size || fileBuffer.length,
      });

      ctx.body = {
        url: result.url,
        provider: result.provider,
        hash: fileHash,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: (err as Error).message };
    }
  },

  /** 获取文件的OSS同步状态（用户端） */
  async getSyncStatus(ctx: any) {
    const { fileId } = ctx.params;
    if (!fileId) {
      ctx.status = 400;
      ctx.body = { error: "fileId is required" };
      return;
    }

    const syncService = strapi.plugin("zhao-oss").service("sync-service");
    const status = await syncService.checkSyncStatus(parseInt(fileId));
    ctx.body = status;
  },

  /** 获取媒体列表，包含同步状态（用户端） */
  async getMediaList(ctx: any) {
    const { page = 1, pageSize = 20, status, mimeType } = ctx.query;
    const offset = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (mimeType) where.mime = { $contains: mimeType };

    const [files, total] = await Promise.all([
      strapi.db.query("plugin::upload.file").findMany({
        where,
        limit: parseInt(pageSize),
        offset,
        orderBy: { createdAt: "desc" },
      }),
      strapi.db.query("plugin::upload.file").count({ where }),
    ]);

    const fileIds = files.map((f: any) => f.id);
    const syncRecords = await strapi.db.query("plugin::zhao-oss.sync-record").findMany({
      where: { fileId: { $in: fileIds } },
    });

    const recordMap = new Map();
    syncRecords.forEach((record: any) => {
      recordMap.set(record.fileId, record);
    });

    const list = files.map((file: any) => ({
      ...file,
      originalName: file.name,
      filename: file.hash,
      provider: recordMap.get(file.id)?.provider || "local",
      status: recordMap.get(file.id)?.status || "pending",
      remoteUrl: recordMap.get(file.id)?.remoteUrl,
    }));

    ctx.body = {
      list,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        pageCount: Math.ceil(total / parseInt(pageSize)),
      },
    };
  },
});
```

### 1.2 添加新的路由文件
新建文件：`server/src/routes/api.ts`

```typescript
export default {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/upload",
      handler: "api-controller.upload",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/sync/status/:fileId",
      handler: "api-controller.getSyncStatus",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/media/list",
      handler: "api-controller.getMediaList",
      config: {
        auth: false,
      },
    },
  ],
};
```

### 1.3 更新 controllers/index.ts
编辑文件：`server/src/controllers/index.ts`

```typescript
import syncController from "./sync-controller";
import settingsController from "./settings-controller";
import apiController from "./api-controller";

export default {
  "sync-controller": syncController,
  "settings-controller": settingsController,
  "api-controller": apiController,
};
```

### 1.4 更新 routes/index.ts
编辑文件：`server/src/routes/index.ts`

```typescript
import adminRoutes from "./admin";
import apiRoutes from "./api";

export default {
  admin: adminRoutes.admin,
  "content-api": apiRoutes,
};
```

## 2. Web 项目已更新的文件

- [src/api/media.js](file:///e:/code/web/src/api/media.js) - 添加了 zhao-oss 相关 API
- [pages/media/list.vue](file:///e:/code/web/pages/media/list.vue) - 更新了媒体列表页面

## 3. API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /zhao-oss/upload | 上传文件到 OSS |
| GET | /zhao-oss/sync/status/:fileId | 获取文件同步状态 |
| GET | /zhao-oss/media/list | 获取媒体列表 |
