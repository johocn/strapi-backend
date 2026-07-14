import os

base = os.path.join('e:', os.sep, 'code', 'plugins', 'zhao-oss', 'server', 'src')

# --- api-controller.ts ---
ctrl_path = os.path.join(base, 'controllers', 'api-controller.ts')
with open(ctrl_path, 'r', encoding='utf-8') as f:
    content = f.read()

delete_media = '''
  /** 删除媒体文件（本地+云端+记录） */
  async deleteMedia(ctx: any) {
    const { fileId } = ctx.params;
    if (!fileId) {
      ctx.status = 400;
      ctx.body = { error: "fileId is required" };
      return;
    }
    const syncService = strapi.plugin("zhao-oss").service("sync-service");
    await syncService.deleteFileCompletely(parseInt(fileId));
    ctx.body = { success: true, fileId: parseInt(fileId) };
  },
'''

content = content.rstrip()
if not content.endswith(','):
    content = content.rstrip().rstrip('}') 
    content = content.rstrip() + ',\n' + delete_media + '});\n'
else:
    content = content.rstrip().rstrip('}') 
    content = content.rstrip() + '\n' + delete_media + '});\n'

with open(ctrl_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('api-controller.ts updated')

# --- api.ts ---
routes_path = os.path.join(base, 'routes', 'api.ts')
with open(routes_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_route = '''    {
      method: "DELETE",
      path: "/media/:fileId",
      handler: "api-controller.deleteMedia",
      config: {
        auth: false,
      },
    },
'''

old_last_route_end = '      },\n    },\n  ],\n};'
new_last_route_end = '      },\n    },\n' + new_route + '  ],\n};'
content = content.replace(old_last_route_end, new_last_route_end)

with open(routes_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('api.ts updated')
