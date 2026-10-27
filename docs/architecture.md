# 架构与生成机制

## 一次角色生成发生了什么

1. 用户在六步流程里选择照片、声音、故事、MBTI、代表歌曲与目标。素材可以部分缺省。
2. 浏览器按需加载本地 MediaPipe 模型定位主要人脸，从照片及相关区域提取色板与色彩信号。检测失败时回退到整图色彩分析。
3. 音频在本地解码，提取时长、能量和节奏信号；这里没有自动语音转写或声音克隆。
4. `buildCharacterProfile` 结合用户填写的语义线索、原型权重与稳定种子，输出配色、发型、服装、表情、道具及解释来源。
5. `CharacterAvatar` / `AvatarIllustration` 用 SVG 与样式令牌绘制角色，而不是调用云端图像生成服务。
6. 登录后保存角色和派生特征到 Express API。原始照片不由当前应用上传到后端。

这是一套可复现的风格化角色引擎。相同输入会得到稳定结果，换故事或变体种子可得到不同组合；它不证明用户的身份、真实外貌或心理人格。部分外观令牌并不一定都在当前 SVG 绘制器中产生独立视觉差异，欢迎补充对应测试与绘制分支。

## 模块连接

```text
React / Vite
├─ 素材输入 → MediaPipe / Canvas / Web Audio → 本地角色引擎 → SVG
├─ 页面路由 → Express REST API → JSON-file store
├─ 音乐广场 ← WebSocket：人物位置、社区事件、房间更新广播
└─ 全局播放器 → 原生 Audio → 内置录音 / 自有文件 / 授权适配器
```

## 前端

- `client/src/main.jsx`：应用壳、账号、创建流程、广场、社区和音乐社交页面。
- `client/src/character/generation.js`：原型、MBTI 权重、语义线索与角色生成。
- `client/src/character/schema.js`：外观令牌、默认值与输入规范化。
- `client/src/character/photoVision.js`：浏览器本地人脸检测。
- `client/src/character/AvatarIllustration.jsx`：单一 SVG 轮廓绘制，保持跨页面比例稳定。
- `client/src/music/playerStore.js`：单例音频状态机、异步取消、完整时长、切歌与循环模式。
- `client/src/Planet3D.jsx`：Three.js 球体网格、星环、着色器与拖动交互。

## 后端与数据

Express 提供认证、角色、送歌、明信片、共听房间、关系、通知、社区、活动与演示收藏 API。WebSocket 广播事件。数据默认保存在 `server/data/lesheng.json`，首次启动会初始化虚构种子角色。

密码采用 salt + scrypt 哈希；会话保存在原型数据文件中。现有会话管理、权限隔离和防滥用措施不能等同于生产级认证基础设施，见 [安全说明](../SECURITY.md)。

文件存储采用同步读写，不支持高并发事务。迁移到 SQLite/PostgreSQL 时，应先提取数据访问层，再设计用户、角色、互动、房间、关系、事件与会话表，并加入事务和约束。

## 音乐与共听边界

内置 SoundHelix 完整曲目通过后端播放解析或静态资源提供；没有完整音源的商业歌曲仅为目录元数据。播放器不会伪造授权结果。

共听页已包含房间创建、播放状态记录、反应与结束后的关系记忆。后端会广播房间更新，但当前页面尚不是完整的双端时钟对齐实现；远端订阅、房间隔离、时钟偏差修正与断线重连仍需要实现和双端测试。
