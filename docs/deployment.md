# 本地运行与部署

## 可复现安装

Node.js 22.12+；推荐 Node.js 24 LTS。仓库包含三个锁文件。

```bash
npm ci
npm ci --prefix client
npm ci --prefix server
npm test
npm run build
npm run test:smoke
```

开发时运行 `npm run dev`。Vite 默认使用 5173，后端默认使用 4000。如果 Vite 因端口占用自动换端口，请查看终端实际地址。

## 环境变量

客户端可用 `client/.env.local` 配置 `VITE_API_URL` 和 `VITE_WS_URL`。默认开发环境指向当前浏览器主机的 4000 端口，正式构建使用同域 `/api` 和 `/ws`。

所有 `VITE_*` 配置均可被浏览器读取，不能放服务端密钥。环境变量变化后需重启开发服务或重新构建。

后端读取 `PORT`、`MUSIC_PROVIDER_URL` 和 `MUSIC_PROVIDER_TOKEN`。Node 不会自动加载本项目的 `.env`；如果需要文件配置，可从 `server` 目录运行：

```bash
node --env-file=.env src/index.js
```

`.env` 文件必须留在本地，不得提交到 Git。

## 授权音源适配

默认无需配置音乐 API。示例完整录音是 SoundHelix Song 1/2，不是中文目录歌曲。

拿到合法音源服务后，设置服务端 `MUSIC_PROVIDER_URL`，例如：

```text
https://music.example.com/tracks/:id/playback
```

服务端替换 `:id`，使用可选 `MUSIC_PROVIDER_TOKEN` 发出 Bearer 授权请求。适配器识别 `url`、`playUrl` 或 `data.url`，并校验 URL、试听标记、错误和超时。只应返回你有权播放的完整音频。

本地导入的音频只存在当前浏览器页面，刷新后不会持久保留。服务端歌曲音频上传接口当前检查登录，但尚未实现严格的歌曲归属/管理权限隔离；正式使用前必须补齐权限、内容审查、配额及授权证明流程，不应直接向不可信用户开放。

## 服务器部署组成

1. 构建并托管 `client/dist`，前端路径使用 SPA 回退到 `index.html`。
2. 运行 `server/src/index.js`，建议进程守护并使用独立持久卷保留 `server/data`、`server/uploads`。
3. 把 `/api/`、`/media/audio/` 反向代理到后端 4000。
4. 把 `/ws` 转发到后端并配置 WebSocket Upgrade。
5. 静态音频目录需要可访问，并保留音源许可；后端内置录音路径依赖 `client/public/music`，不要只复制 `server` 就丢失素材。
6. 配置 HTTPS/WSS，支持媒体字节范围请求，给哈希静态资源设置缓存，给入口 HTML 设置合理的更新策略。

不要把 `server/data` 和 `server/uploads` 放入公共静态根目录；不要在发布静态站点时覆盖用户数据。

GitHub 仓库负责代码托管，GitHub Pages 仅能承载静态前端。账号、数据与社交接口仍需要运行 Node.js 的服务。

## 上线前必须补齐

见 [SECURITY.md](../SECURITY.md)：HTTPS、数据备份、并发存储、认证限流、会话治理、上传审核、WebSocket 消息校验与房间授权隔离。当前仓库适合原型研究与本地演示，不提供生产安全保证。
