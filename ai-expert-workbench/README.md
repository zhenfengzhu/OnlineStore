# 小红书电商 AI 专家工作台

小红书电商 AI 运营工作台，面向宠物玩具内容运营。当前版本支持产品资料库、AI 生成、内容日历、内容资产库、竞品拆解和数据复盘。

## 本地启动

### 点击启动

在 Windows 上可以直接双击项目根目录的 `Start-Workbench.bat`，打开启动器后点击“启动项目”。

启动器会自动执行数据库初始化，并在项目启动后打开 `http://127.0.0.1:3000`。

### 命令启动

```bash
cd ai-expert-workbench
copy .env.example .env
npm install
npm run db:init
npm run dev
```

然后打开 `http://localhost:3000`。

## 已实现模块

- 产品资料库：保存产品名、类目、适合对象、价格、材质、尺寸、卖点、注意事项和拍摄场景。
- AI 生成：支持 30 篇笔记、30 天内容日历、短视频脚本、客服话术、竞品拆解和数据复盘。
- 内容日历：保存每日选题、内容形式、主推角度和关联资产，支持 CSV 导出。
- 内容资产库：保存笔记、视频脚本和客服话术，支持 Markdown/CSV 导出。
- 竞品/复盘：保存竞品笔记拆解和数据复盘结果。

## 环境变量

```text
MODEL_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.2
DATABASE_URL=file:./dev.db
```

## 多模型配置

推荐在页面里打开“模型设置”，点击模型供应商卡片，填写 API Key 和模型名后保存。配置会写入本地 `.model-config.json`，该文件已被 `.gitignore` 忽略。

页面支持：

- `openai`：使用 `OPENAI_API_KEY` / `OPENAI_MODEL`
- `deepseek`：使用 `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`
- `tongyi`：使用 `TONGYI_API_KEY` / `TONGYI_MODEL`
- `zhipu`：使用 `ZHIPU_API_KEY` / `ZHIPU_MODEL`
- `doubao`：使用 `DOUBAO_API_KEY` / `DOUBAO_MODEL`
- `custom`：使用 `CUSTOM_MODEL_BASE_URL` / `CUSTOM_MODEL_API_KEY` / `CUSTOM_MODEL_NAME`

也可以继续用 `.env` 配置 `MODEL_PROVIDER` 和对应变量；页面保存的 `.model-config.json` 优先级更高。

OpenAI 使用 Responses API。其他 provider 默认按 OpenAI-compatible Chat Completions 调用，并要求模型返回 JSON。

当前版本不包含登录、支付、团队权限、联网搜索、图片生成和浏览器插件。
