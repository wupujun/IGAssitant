# Install IG Assistant v1.0 on macOS

This guide installs the published `v1.0` release from GitHub on macOS.

Repository:

```text
https://github.com/wupujun/IGAssitant
```

## English

### 1. Prerequisites

Install:

- Google Chrome
- Python 3.10 or newer
- Terminal access
- Git is optional

Check from Terminal:

```bash
python3 --version
```

If Python is missing, install Xcode Command Line Tools:

```bash
xcode-select --install
```

Or install Python from:

```text
https://www.python.org/downloads/macos/
```

### 2. Download v1.0

You do not need Git. Download the release ZIP:

```text
https://github.com/wupujun/IGAssitant/archive/refs/tags/v1.0.zip
```

Then:

1. Open the ZIP file from Downloads.
2. Rename the extracted folder from `IGAssitant-1.0` to `IGAssitant`.
3. Move it to `Documents`.

Your project folder should be:

```text
~/Documents/IGAssitant
```

Open Terminal and enter the project folder:

```bash
cd ~/Documents/IGAssitant
```

Optional Git method:

```bash
cd ~/Documents
git clone https://github.com/wupujun/IGAssitant.git
cd IGAssitant
git checkout v1.0
```

If you used Git, confirm the version:

```bash
git describe --tags
```

Expected:

```text
v1.0
```

### 3. Install Backend Dependencies

```bash
chmod +x install.sh
./install.sh
```

The installer creates:

- `.venv/`
- `server/.env`
- `run_server.sh`

### 4. Start the Backend

```bash
./run_server.sh
```

Keep this Terminal window open while using the extension.

Open the backend config page:

```text
http://127.0.0.1:8765/config
```

### 5. Configure LLM

For DeepSeek:

```text
Provider: DeepSeek
API mode: Chat Completions
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash
Thinking: disabled
```

Paste your API key into the config page and click `Save`.

Click `Test LLM` to verify the setup.

### 6. Load the Chrome Extension

1. Open Chrome.
2. Go to:

```text
chrome://extensions
```

3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this folder:

```text
~/Documents/IGAssitant/extension
```

6. Open Instagram Web and go to an Instagram Direct conversation.

The extension panel should appear and show the IG Assistant version.

### 7. Use It

- Type your draft in the IG Assistant panel.
- The suggestion appears in the highlighted suggestion box.
- Press `Enter` to send the suggested version.
- Press `Ctrl+Enter` to send your original draft.
- Press `Shift+Enter` to insert a new line.

### 8. Troubleshooting

Backend health:

```text
http://127.0.0.1:8765/health
```

Backend logs:

```text
http://127.0.0.1:8765/logs
```

LLM metrics:

```text
http://127.0.0.1:8765/metrics
```

Raw backend logs:

```bash
tail -f server/uvicorn.err.log
```

If Chrome does not show the panel:

- Reload the extension from `chrome://extensions`.
- Refresh Instagram.
- Open Chrome DevTools Console and look for logs prefixed with `[IGCA]`.

---

# 在 macOS 上安装 IG Assistant v1.0

本指南用于在 macOS 上从 GitHub 安装已发布的 `v1.0` 版本。

项目地址：

```text
https://github.com/wupujun/IGAssitant
```

## 中文

### 1. 准备环境

需要安装：

- Google Chrome
- Python 3.10 或更新版本
- 可以使用 Terminal
- Git 是可选的，不是必须

在 Terminal 中检查：

```bash
python3 --version
```

如果没有 Python，可以先安装 Xcode Command Line Tools：

```bash
xcode-select --install
```

也可以从 Python 官网下载安装：

```text
https://www.python.org/downloads/macos/
```

### 2. 下载 v1.0 版本

不需要安装 Git。直接下载 release ZIP：

```text
https://github.com/wupujun/IGAssitant/archive/refs/tags/v1.0.zip
```

然后：

1. 打开 Downloads 里的 ZIP 文件。
2. 把解压出来的文件夹从 `IGAssitant-1.0` 改名为 `IGAssitant`。
3. 把这个文件夹移动到 `Documents`。

最终项目目录应该是：

```text
~/Documents/IGAssitant
```

打开 Terminal，进入项目目录：

```bash
cd ~/Documents/IGAssitant
```

如果你想用 Git，也可以使用下面的方式：

```bash
cd ~/Documents
git clone https://github.com/wupujun/IGAssitant.git
cd IGAssitant
git checkout v1.0
```

如果使用 Git，可以确认当前版本：

```bash
git describe --tags
```

正常应该显示：

```text
v1.0
```

### 3. 安装后端依赖

```bash
chmod +x install.sh
./install.sh
```

安装脚本会创建：

- `.venv/`
- `server/.env`
- `run_server.sh`

### 4. 启动后端服务

```bash
./run_server.sh
```

使用插件时，请保持这个 Terminal 窗口不要关闭。

打开后端配置页面：

```text
http://127.0.0.1:8765/config
```

### 5. 配置 LLM

如果使用 DeepSeek，可以这样配置：

```text
Provider: DeepSeek
API mode: Chat Completions
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash
Thinking: disabled
```

在配置页面中填入你的 API Key，然后点击 `Save`。

点击 `Test LLM` 验证配置是否可用。

### 6. 加载 Chrome 插件

1. 打开 Chrome。
2. 进入：

```text
chrome://extensions
```

3. 打开 `Developer mode`。
4. 点击 `Load unpacked`。
5. 选择这个目录：

```text
~/Documents/IGAssitant/extension
```

6. 打开 Instagram Web，并进入一个 Instagram Direct 聊天窗口。

此时应该能看到 IG Assistant 插件面板。

### 7. 使用方式

- 在 IG Assistant 面板里输入草稿。
- AI 建议会显示在高亮的 suggestion 输入框中。
- 按 `Enter` 发送 AI 建议版本。
- 按 `Ctrl+Enter` 发送原始草稿。
- 按 `Shift+Enter` 在草稿框里换行。

### 8. 排查问题

检查后端是否正常：

```text
http://127.0.0.1:8765/health
```

查看后端日志：

```text
http://127.0.0.1:8765/logs
```

查看 LLM 请求和延迟指标：

```text
http://127.0.0.1:8765/metrics
```

查看原始后端日志：

```bash
tail -f server/uvicorn.err.log
```

如果 Chrome 中没有显示插件面板：

- 在 `chrome://extensions` 里重新加载插件。
- 刷新 Instagram 页面。
- 打开 Chrome DevTools Console，查看 `[IGCA]` 开头的日志。
