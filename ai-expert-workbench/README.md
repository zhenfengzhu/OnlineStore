# 小红书内容生成工作台

这是一个聚焦内容生成的小红书 AI 工作台，面向宠物玩具等消费品内容创作场景。

当前版本保留 5 类核心能力：

- AI 生成：支持 `1篇笔记`、`30天内容日历`、`短视频脚本`
- 图文提取：输入小红书公开链接，独立保存提取到的正文和图片，支持搜索、标签、收藏、导出和 AI 爆文结构拆解
- 内容日历：保存选题、形式、角度、目标和状态
- 内容资产库：沉淀生成好的笔记和脚本，支持 Markdown/CSV 导出
- 模型配置：支持切换 OpenAI、DeepSeek、通义、智谱、豆包和自定义兼容接口

## 本地启动

如果要在另一台电脑启动，请先看 [另一台电脑启动指南](./另一台电脑启动指南.md)。

### 点击启动

Windows 下可以直接双击项目根目录的 `Start-Workbench.bat`。

启动器会自动完成数据库初始化，并在项目启动后打开 `http://localhost:3001`。

### 命令行启动

```bash
cd ai-expert-workbench
copy .env.example .env
npm install
npm run db:init
npm run dev -- -p 3001
```

然后打开 `http://localhost:3001`。

## 环境变量

```text
MODEL_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.2
DATABASE_URL=file:./dev.db
```

## 模型配置

推荐直接在页面的“模型设置”里填写 API Key 和模型名。

页面支持：

- `openai`：`OPENAI_API_KEY` / `OPENAI_MODEL`
- `deepseek`：`DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`
- `tongyi`：`TONGYI_API_KEY` / `TONGYI_MODEL`
- `zhipu`：`ZHIPU_API_KEY` / `ZHIPU_MODEL`
- `doubao`：`DOUBAO_API_KEY` / `DOUBAO_MODEL`
- `custom`：`CUSTOM_MODEL_BASE_URL` / `CUSTOM_MODEL_API_KEY` / `CUSTOM_MODEL_NAME`

页面保存后的配置会写入本地 `.model-config.json`，优先级高于 `.env`。

OpenAI 使用 Responses API，其他 provider 默认按 OpenAI-compatible Chat Completions 调用，并要求模型返回 JSON。
