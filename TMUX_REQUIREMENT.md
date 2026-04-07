# macOS 上发话功能的 tmux 要求

## ❌ 问题

在 macOS 上，如果 droid 不在 tmux 中运行，发话功能会失败，错误信息：

```
macOS: agent must run inside tmux (TMUX_PANE not found)
```

## 🔍 原因

macOS 不支持 `TIOCSTI` ioctl，这意味着无法直接向终端注入按键。Agent Foreman 依赖 `tmux send-keys` 来实现发话功能。

### 技术细节

在 `monitor_server.py` 中的 `send_agent_message()` 函数：

```python
if _IS_MACOS:
    # macOS: tmux send-keys only (ptrace/TIOCSTI not available)
    pane_id = _get_tmux_pane(pid)
    if pane_id:
        return _send_via_tmux(pane_id, message)
    else:
        return {"agent_id": agent_id, "message": message, "returncode": 1,
                "stdout": "", 
                "stderr": "macOS: agent must run inside tmux (TMUX_PANE not found)"}
```

## ✅ 解决方案

### 1. 安装 tmux

```bash
brew install tmux
```

### 2. 在 tmux 中启动 droid

#### 方法 A：创建新会话

```bash
# 创建名为 "droid-project1" 的会话
tmux new -s droid-project1

# 在会话中启动 droid
cd /path/to/your/project
droid

# 分离会话（保持后台运行）
# 按 Ctrl+B，然后按 D
```

#### 方法 B：在现有会话中启动

```bash
# 连接到现有会话
tmux attach -t existing-session

# 创建新窗口
# Ctrl+B, C

# 启动 droid
cd /path/to/project
droid
```

### 3. 管理 tmux 会话

```bash
# 列出所有会话
tmux ls

# 连接到特定会话
tmux attach -t session-name

# 杀死会话
tmux kill-session -t session-name

# 重命名会话
# 在会话内按 Ctrl+B, $
```

## 📋 最佳实践

### 为每个项目创建独立会话

```bash
# 项目 1
tmux new -s spot-asset-server
cd ~/edgex-spot/spot-asset-server
droid
# Ctrl+B, D

# 项目 2
tmux new -s spot-http-gateway
cd ~/edgex-spot/spot-http-gateway
droid
# Ctrl+B, D

# 项目 3
tmux new -s personal
cd ~
droid
# Ctrl+B, D
```

### 优点

- ✅ 每个项目独立管理
- ✅ 可以随时重新连接查看
- ✅ 所有 droid 都支持发话功能
- ✅ 会话持久化（即使关闭终端窗口）

## 🧪 验证

### 检查 droid 是否在 tmux 中

```bash
# 方法 1：检查环境变量
ps -p <PID> e | grep TMUX_PANE

# 方法 2：使用 pstree（如果安装了）
pstree -p <PID>

# 方法 3：检查父进程链
ps -o pid,ppid,command -p <PID>
```

### 测试发话功能

1. 确保 droid 在 tmux 中运行
2. 访问监工台：http://localhost:8787/
3. 找到对应的 droid 卡片
4. 在发话框中输入消息
5. 点击"发话"按钮
6. 应该看到成功反馈

## 🔧 常见问题

### Q: 我已经在运行 droid，不想重启怎么办？

A: 你需要重新启动 droid：

```bash
# 1. 找到当前 droid 的进程
ps aux | grep droid

# 2. 停止 droid（在 droid 会话中按 Ctrl+C 或 Ctrl+D）

# 3. 启动 tmux
tmux new -s my-droid

# 4. 重新启动 droid
droid

# 5. 分离 tmux
# Ctrl+B, D
```

### Q: 可以在一个 tmux 会话中运行多个 droid 吗？

A: 可以，使用 tmux 窗口：

```bash
# 在 tmux 会话中
# Ctrl+B, C 创建新窗口
cd /path/to/project1
droid

# Ctrl+B, C 再创建一个窗口
cd /path/to/project2
droid

# Ctrl+B, N 切换到下一个窗口
# Ctrl+B, P 切换到上一个窗口
# Ctrl+B, 0-9 切换到指定窗口
```

### Q: tmux 会话意外断开了怎么办？

A: 重新连接即可：

```bash
# 查看可用会话
tmux ls

# 连接到会话
tmux attach -t session-name
```

### Q: 如何在启动时自动创建 tmux 会话？

A: 创建启动脚本：

```bash
#!/bin/bash
# start-droids.sh

tmux new -d -s project1 'cd ~/projects/project1 && droid'
tmux new -d -s project2 'cd ~/projects/project2 && droid'
tmux new -d -s project3 'cd ~/projects/project3 && droid'

echo "All droid sessions started!"
tmux ls
```

```bash
chmod +x start-droids.sh
./start-droids.sh
```

## 📖 tmux 快速参考

### 基本命令

| 命令 | 描述 |
|------|------|
| `tmux` | 启动新会话 |
| `tmux new -s name` | 创建命名会话 |
| `tmux ls` | 列出会话 |
| `tmux attach -t name` | 连接到会话 |
| `tmux kill-session -t name` | 杀死会话 |

### 快捷键（按 Ctrl+B 后）

| 快捷键 | 描述 |
|--------|------|
| `D` | 分离会话 |
| `C` | 创建新窗口 |
| `N` | 下一个窗口 |
| `P` | 上一个窗口 |
| `0-9` | 切换到窗口 N |
| `%` | 垂直分割 |
| `"` | 水平分割 |
| `方向键` | 切换分割窗格 |
| `?` | 帮助 |

## 🎯 总结

- ✅ macOS 上必须在 tmux 中运行 droid 才能使用发话功能
- ✅ 为每个项目创建独立的 tmux 会话是最佳实践
- ✅ tmux 提供了会话持久化和多窗口管理
- ✅ 学习基本的 tmux 命令可以大大提高效率

## 📚 更多资源

- [tmux 官方文档](https://github.com/tmux/tmux/wiki)
- [tmux 速查表](https://tmuxcheatsheet.com/)
- [The Tao of tmux](https://leanpub.com/the-tao-of-tmux)
