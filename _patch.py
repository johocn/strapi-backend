import os

path = os.path.join('e:', os.sep, 'code', 'plugins', 'zhao-oss', 'server', 'src', 'services', 'sync-service.ts')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_iface = '  /** 删除云端文件 */\n  deleteRemote(recordId: number): Promise<void>;'
new_iface = '  /** 删除云端文件 */\n  deleteRemote(recordId: number): Promise<void>;\n  /** 完整删除文件（本地+云端+记录） */\n  deleteFileCompletely(fileId: number): Promise<void>;'
content = content.replace(old_iface, new_iface)

impl = """
    async deleteFileCompletely(fileId: number): Promise<void> {
      const file = await strapi.db.query("plugin::upload.file").findOne({
        where: { id: fileId },
      });

      if (!file) {
        logger.warn(`[zhao-oss] File not found for deletion: id=${fileId}`);
        return;
      }

      const fs = require("fs/promises");
      const path = require("path");

      try {
        const uploadDir = strapi.dirs.static.public;
        const filePath = path.join(uploadDir, file.url);
        await fs.unlink(filePath);
      } catch (err: any) {
        if (err?.code !== "ENOENT") {
          logger.warn(`[zhao-oss] Failed to delete local file: id=${fileId}`, { error: err?.message });
        }
      }

      try {
        const record = await strapi.db.query("plugin::zhao-oss.sync-record").findOne({
          where: { fileId },
        });

        if (record && record.status === "success" && record.remoteUrl) {
          const provider = strapi.plugin("zhao-oss").service("provider-registry").getProvider(record.provider);
          if (provider) {
            const url = new URL(record.remoteUrl);
            const key = url.pathname.replace(/^\\//, "");
            await provider.delete(key);
          }
        }
      } catch (err) {
        logger.warn(`[zhao-oss] Failed to delete remote file: id=${fileId}`, { error: (err as Error).message });
      }

      await strapi.db.query("plugin::zhao-oss.sync-record").delete({ where: { fileId } });
      await strapi.db.query("plugin::upload.file").delete({ where: { id: fileId } });

      logger.info(`[zhao-oss] File completely deleted: id=${fileId}`);
    },
"""

anchor = '    async checkSyncStatus(fileId: number)'
content = content.replace(anchor, impl + anchor)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('sync-service.ts updated')
