# 稳字经 · 李长寿 Demo

这是独立的 Vercel 项目包，根链接会进入李长寿「稳字经」故事。

## Vercel

1. 解压并上传到一个独立 GitHub 仓库。
2. 在 Vercel 导入仓库，Framework Preset 选择 `Next.js`。
3. 添加环境变量：
   - `DEEPSEEK_API_KEY`：Kaon Router API Key
   - `STORY_MODEL`：`kaon/gemini-3.7-flash`
   - `STORY_FALLBACK_MODEL`：`kaon/deepseek-v4-flash`
4. 使用默认构建命令部署，不填写静态输出目录。

API Key 不在压缩包内，也不要提交到 GitHub。

当前包使用 V4.3 开放引导链路：剧情材料按语义触发，未触发时可持续自由互动；章末成立后等待 10 秒显示结算卡；下一章承接上一章真实结果。
