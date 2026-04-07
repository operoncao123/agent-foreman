# Factory Droid Integration for Agent Foreman

## 概述

Agent Foreman 现已支持监控 **Factory Droid** 会话！本文档介绍了适配的功能和使用方法。

## 功能特性

### 🎯 支持的 Agent 类型

- ✅ **Codex** (原生支持)
- ✅ **Claude** (原生支持)
- ✅ **Droid** (新增支持)

### 🔍 Droid 会话状态检测

Agent Foreman 可以准确识别 Droid 的以下状态：

| 状态 | 说明 | 判断依据 |
|------|------|----------|
| 🔵 **busy** | 进行中 | CPU ≥ 20% 或正在使用工具 |
| 🟢 **active** | 活跃 | 心跳时间 ≤ 2分钟 |
| 🟡 **needs-input** | 等待输入 | 输出包含问题或 AskUser |
| ⚪ **idle** | 闲置 | 2-15分钟无活动 |
| ⚫ **stale** | 过时/关闭 | 超过15分钟无活动 |

### 📊 监控功能

- **实时进程监控**: 检测运行中的 droid 进程
- **会话文件解析**: 读取 `~/.factory/sessions/` 下的会话记录
- **状态推断**: 根据 CPU、心跳时间、输出内容判断状态
- **CWD 匹配**: 将进程与会话文件通过工作目录关联
- **Git 分支检测**: 显示当前工作分支

## 配置说明

### 1. 更新配置文件

编辑 `config.json` 添加 Droid 会话路径：

```json
{
  "paths": {
    "codex_sessions": "~/.codex/sessions",
    "claude_projects": "~/.claude/projects",
    "claude_todos": "~/.claude/todos",
    "claude_tasks": "~/.claude/tasks",
    "droid_sessions": "~/.factory/sessions"
  }
}
```

### 2. 状态判断规则（可选）

默认配置已包含 Droid 状态判断规则，可根据需要调整：

```json
{
  "status": {
    "busy_cpu_threshold": 20.0,        // CPU 阈值
    "active_heartbeat_sec": 120,       // 活跃时间窗口（秒）
    "stale_heartbeat_sec": 900,        // 过时时间阈值（秒）
    "needs_input_patterns": [          // 等待输入的正则模式
      "\\?$",
      "please provide",
      "would you like",
      "do you want",
      "shall i",
      "should i",
      "let me know"
    ]
  }
}
```

## 使用方法

### 启动监控服务

```bash
cd /Users/reuben/ai-space/agent-foreman
python3 monitor_server.py --host 0.0.0.0 --port 8787
```

访问 `http://localhost:8787` 查看监控面板。

### 运行测试

验证 Droid 集成是否正常工作：

```bash
python3 test_droid.py
```

预期输出：
```
🎉 All tests passed! Droid integration is ready.
```

## 技术实现

### 核心修改

#### 1. 进程识别 (`infer_agent_type`)

```python
if "droid" in basenames:
    # 跳过 droid exec 子进程
    if "exec" in lowered and "stream-jsonrpc" in lowered:
        return ""
    return "droid"
```

#### 2. 会话解析 (`parse_droid_session`)

```python
def parse_droid_session(path: Path) -> dict[str, Any] | None:
    """解析 Factory Droid 会话文件 (.jsonl 格式)"""
    # 1. 解析 session_start 获取基本信息
    # 2. 扫描所有消息更新心跳时间
    # 3. 从最近消息提取输出和用户输入
    # 4. 检测等待状态（AskUser、问题等）
    return {
        "session_id": ...,
        "cwd": ...,
        "recent_output": ...,
        "pending_items": ...,
        ...
    }
```

#### 3. 主机汇总 (`summarize_host`)

```python
# 收集 Droid 进程
droid_procs = [p for p in procs if p.agent_type == "droid"]

# 扫描 Droid 会话文件
droid_sessions = []
for path in get_recent_files(host_paths.get("droid_sessions"), ...):
    if not path.name.endswith(".settings.json"):
        session = parse_droid_session(path)
        if session:
            droid_sessions.append(session)

# 匹配进程与会话
droid_match = match_sessions(droid_procs, droid_sessions)
```

### 特殊处理

#### Droid 会话文件结构

```jsonl
{"type":"session_start","id":"xxx","cwd":"/path","timestamp":"..."}
{"type":"message","role":"user","content":[...]}
{"type":"message","role":"assistant","content":[{"type":"tool_use",...}]}
```

#### 跳过文件

- `*.settings.json` - 会话设置文件
- `droid exec` 子进程 - 内部工具进程

## 故障排除

### 问题 1: 未检测到 Droid 进程

**解决方法**:
```bash
# 检查 droid 是否运行
ps aux | grep droid

# 确认进程路径
which droid
```

### 问题 2: 会话文件无法读取

**解决方法**:
```bash
# 检查会话目录权限
ls -la ~/.factory/sessions

# 确认文件存在
find ~/.factory/sessions -name "*.jsonl" | head -5
```

### 问题 3: 状态判断不准确

**解决方法**: 调整 `config.json` 中的状态判断参数，特别是：
- `busy_cpu_threshold`: CPU 阈值过高/过低
- `active_heartbeat_sec`: 活跃时间窗口
- `needs_input_patterns`: 添加更多等待模式

## 示例输出

```
🤖 Droid Sessions:

  🔵 edgex-sign-server (PID 46907)
     Status: busy
     CWD: /Users/reuben/edgex-gitlab/edgex-sign-server
     Branch: main
     Recent: [Using tool: Execute]...

  ⚫ spot-http-gateway (PID 48810)
     Status: stale
     CWD: /Users/reuben/edgex-spot/spot-http-gateway
     Branch: feature/typeddata
     Recent: 实现已完成！接口路径为 `POST /api/v1/private/assets/...

  🟡 deer-flow (PID 17421)
     Status: needs-input
     CWD: /Users/reuben/ai-space/deer-flow
     Branch: main
     Recent: 是否需要我继续实现其他功能？...
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进 Droid 集成！

## 许可证

MIT License (与原 Agent Foreman 项目保持一致)
