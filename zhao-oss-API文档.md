# Zhao OSS 插件 API 文档与使用手册

## 1. 插件概述

**Zhao OSS** 是基于 Strapi v5 的对象存储服务备份插件，支持将上传文件自动同步到阿里云 OSS 等云存储服务。

### 核心功能

- 文件自动备份到云端 OSS
- 多云存储提供者支持（阿里云 OSS）
- 同步状态追踪与统计
- 健康检查与故障恢复
- 基于角色的权限控制

### 技术栈

- Strapi v5.x
- TypeScript
- 阿里云 OSS SDK (ali-oss)

---

## 2. 安装与配置

### 2.1 安装

```bash
cd e:/code/plugins/zhao-oss
npm install
npm run build
```

### 2.2 插件配置

在 Strapi 配置文件中添加插件配置 (config/plugins.js 或 .ts):

```javascript
module.exports = ({ env }) => ({
  // ...
  "zhao-oss": {
    enabled: true,
    uploadTimeoutMs: 30000,
    maxRetries: 3,
    healthCheckIntervalMs: 60000,
    syncDelete: true,
    fallbackToLocal: true,
    providers: [
      {
        name: "aliyun",
        displayName: "阿里云 OSS",
        enabled: true,
        primary: true,
        options: {
          region: "oss-cn-hangzhou",
          accessKeyId: env("ALIYUN_ACCESS_KEY_ID"),
          accessKeySecret: env("ALIYUN_ACCESS_KEY_SECRET"),
          bucket: "your-bucket-name",
          cname: "",
          basePath: "uploads",
          secure: true,
          internalEndpoint: "",
        },
      },
    ],
  },
});
```

---

## 3. API 接口

### 3.1 同步管理 API

#### 获取仪表盘数据

```
GET /admin/plugins/zhao-oss/sync/dashboard
```

**权限**: `oss.sync.read`

**响应示例**:
```json
{
  "isHealthy": true,
  "stats": {
    "total": 150,
    "synced": 145,
    "failed": 3,
    "pending": 2
  },
  "activeProviders": ["aliyun"],
  "availableProviderTypes": ["aliyun"]
}
```

---

#### 获取同步记录列表

```
GET /admin/plugins/zhao-oss/sync/records
```

**权限**: `oss.sync.read`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码（默认 1） |
| pageSize | number | 每页数量（默认 20） |
| status | string | 筛选状态 |

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "fileId": 123,
      "fileHash": "d41d8cd98f00b204e9800998ecf8427e",
      "status": "success",
      "provider": "aliyun",
      "remoteUrl": "https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/...",
      "remoteEtag": "\"D41D8CD98F00B204E9800998ECF8427E\"",
      "retryCount": 0,
      "lastSyncedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "pageCount": 8
  }
}
```

---

#### 手动触发同步

```
POST /admin/plugins/zhao-oss/sync/trigger
```

**权限**: `oss.sync.trigger`

**请求体**:
```json
{
  "fileId": 123
}
```

---

#### 批量同步

```
POST /admin/plugins/zhao-oss/sync/batch
```

**权限**: `oss.sync.trigger`

**响应示例**:
```json
{
  "total": 50,
  "success": 48,
  "failed": 2
}
```

---

#### 删除云端备份

```
DELETE /admin/plugins/zhao-oss/sync/remote/:recordId
```

**权限**: `oss.sync.trigger`

---

#### 健康检查

```
GET /admin/plugins/zhao-oss/sync/health
```

**权限**: `oss.sync.read`

---

### 3.2 配置管理 API

#### 获取配置

```
GET /admin/plugins/zhao-oss/settings
```

**权限**: `oss.settings.read`

---

#### 更新配置

```
PUT /admin/plugins/zhao-oss/settings
```

**权限**: `oss.settings.update`

---

#### 测试提供者连接

```
POST /admin/plugins/zhao-oss/settings/test-provider
```

**权限**: `oss.settings.update`

**请求体**:
```json
{
  "name": "aliyun",
  "options": {
    "region": "oss-cn-hangzhou",
    "accessKeyId": "your-access-key-id",
    "accessKeySecret": "your-access-key-secret",
    "bucket": "your-bucket-name"
  }
}
```

---

## 4. 服务接口

### 4.1 SyncService

```typescript
const syncService = strapi.plugin("zhao-oss").service("sync-service");

// 上传文件到云端备份
await syncService.backupFile(fileId: number): Promise<void>

// 批量同步已有文件
await syncService.batchSync(limit?: number, offset?: number): Promise<{
  total: number;
  success: number;
  failed: number;
}>

// 删除云端文件
await syncService.deleteRemote(recordId: number): Promise<void>

// 检查文件同步状态
await syncService.checkSyncStatus(fileId: number): Promise<{
  synced: boolean;
  provider?: string;
  remoteUrl?: string;
}>

// 获取同步统计
await syncService.getSyncStats(): Promise<{
  total: number;
  synced: number;
  failed: number;
  pending: number;
}>
```

---

### 4.2 ProviderRegistry

```typescript
const registry = strapi.plugin("zhao-oss").service("provider-registry");

// 获取指定提供者实例
registry.getProvider(name: string): OssProvider | undefined

// 获取当前主提供者
registry.getPrimaryProvider(): OssProvider | undefined

// 检查主提供者健康状态
await registry.isPrimaryHealthy(): Promise<boolean>

// 重新加载所有提供者
await registry.reloadProviders(config: PluginConfig): Promise<void>

// 获取当前可用提供者列表
registry.getActiveProviders(): string[]

// 获取所有已注册提供者类型
registry.getProviderTypes(): string[]
```

---

### 4.3 OssProvider 接口

```typescript
interface OssProvider {
  readonly name: string;

  initialize(options: Record<string, unknown>): Promise<void>;

  upload(params: FileUploadParams): Promise<UploadResult>;

  delete(key: string): Promise<void>;

  checkHealth(): Promise<boolean>;

  getUrl(key: string): string;
}

interface FileUploadParams {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  fileSize: number;
  path?: string;
}

interface UploadResult {
  url: string;
  etag?: string;
  provider: string;
}
```

---

## 5. 数据模型

### 5.1 SyncRecord 同步记录

| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 主键 ID |
| fileId | integer | 关联的 upload file ID |
| fileHash | string | 文件 MD5 哈希 |
| status | enum | pending/syncing/success/failed/skipped/deleted |
| provider | string | 使用的提供者名称 |
| remoteUrl | string | 云端文件 URL |
| remoteEtag | string | 云端 ETag |
| errorMessage | text | 错误信息 |
| retryCount | integer | 重试次数 |
| lastSyncedAt | datetime | 最后同步时间 |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

---

## 6. 权限系统

| 权限键 | 说明 | 默认角色 |
|--------|------|----------|
| oss.bucket.create | 创建存储桶 | admin, channel-admin |
| oss.bucket.read | 读取存储桶 | admin, channel-admin, plugin-manager |
| oss.bucket.delete | 删除存储桶 | admin, channel-admin |
| oss.file.upload | 上传文件 | admin, channel-admin, plugin-manager, instructor |
| oss.file.read | 读取文件 | admin, channel-admin, plugin-manager, instructor, user |
| oss.file.delete | 删除文件 | admin, channel-admin, plugin-manager |
| oss.sync.trigger | 触发同步 | admin, channel-admin, plugin-manager |
| oss.sync.read | 读取同步状态 | admin, channel-admin, plugin-manager |
| oss.settings.read | 读取设置 | admin, channel-admin |
| oss.settings.update | 更新设置 | admin, channel-admin |

---

## 7. 阿里云 OSS 配置

### 7.1 配置选项

| 选项 | 必填 | 说明 |
|------|------|------|
| region | 是 | OSS 区域，如 `oss-cn-hangzhou` |
| accessKeyId | 是 | 阿里云 AccessKey ID |
| accessKeySecret | 是 | 阿里云 AccessKey Secret |
| bucket | 是 | OSS Bucket 名称 |
| cname | 否 | 自定义域名 |
| basePath | 否 | 存储路径前缀，默认 `uploads` |
| secure | 否 | 是否使用 HTTPS，默认 `true` |
| internalEndpoint | 否 | 内网 Endpoint |

### 7.2 Bucket CORS 配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>
```

---

## 8. 使用示例

### 8.1 前端调用

```typescript
const { get, post, del } = useFetchClient();
const pluginId = "zhao-oss";

// 获取仪表盘
const { data } = await get(`/admin/plugins/${pluginId}/sync/dashboard`);

// 触发单个文件同步
await post(`/admin/plugins/${pluginId}/sync/trigger`, { fileId: 123 });

// 批量同步
await post(`/admin/plugins/${pluginId}/sync/batch`);

// 删除云端备份
await del(`/admin/plugins/${pluginId}/sync/remote/1`);
```

### 8.2 后端服务调用

```typescript
const syncService = strapi.plugin("zhao-oss").service("sync-service");
const registry = strapi.plugin("zhao-oss").service("provider-registry");

// 检查健康状态
const isHealthy = await registry.isPrimaryHealthy();

// 获取同步统计
const stats = await syncService.getSyncStats();
console.log(`已同步 ${stats.synced}/${stats.total} 个文件`);
```

---

## 9. 错误处理

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 参数错误 | 检查请求参数 |
| 401 | 未认证 | 确保已登录 |
| 403 | 权限不足 | 检查用户角色权限 |
| 404 | 资源不存在 | 检查 ID 是否正确 |
| 500 | 服务器错误 | 检查 OSS 配置 |

### 9.1 重试策略

- 最大重试次数：3 次（可配置）
- 重试间隔：指数退避（1s, 2s, 4s）
- 上传超时：30s（可配置）

---

## 10. 最佳实践

1. **安全配置**: 使用环境变量存储 AccessKey
2. **监控告警**: 定期检查同步失败记录
3. **增量同步**: 首次全量后仅同步新增文件
4. **错峰执行**: 大规模同步建议错开业务高峰期
5. **数据校验**: 利用 fileHash 进行完整性校验

---

*文档版本: 1.0.0*
