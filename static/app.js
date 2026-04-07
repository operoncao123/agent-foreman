const state = {
  hosts: new Set(),
  search: "",
  snapshot: null,
  managedHosts: [],
};

const toolOrder = ["codex", "claude", "droid"];
const laneGroups = [
  { key: "working", label: "开工", statuses: ["busy", "active"] },
  { key: "slacking", label: "摸鱼", statuses: ["idle", "stale"] },
  { key: "needs-input", label: "等回话", statuses: ["needs-input"] },
];

function $(id) {
  return document.getElementById(id);
}

function fmtAge(sec) {
  if (sec === null || sec === undefined) return "n/a";
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
}

function fmtTs(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || data.result?.error || `HTTP ${res.status}`);
  }
  return data;
}

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function avatarCaption(status) {
  const labels = {
    "needs-input": "等回话",
    "busy": "开工",
    "active": "开工",
    "idle": "摸鱼",
    "stale": "摸鱼",
  };
  return labels[status] || "开工";
}

function avatarMarkup(status, agentType) {
  // 安全帽颜色：agentType × status 双维度
  // 安全帽颜色：三状态 × agentType
  const hatPalette = {
    claude: {
      "needs-input": { h: "#f0b0a0", h2: "#c87060" },  // 珊瑚红——等回话
      "busy":        { h: "#f5d060", h2: "#c8a020" },  // 金黄——开工
      "active":      { h: "#f5d060", h2: "#c8a020" },  // 金黄——开工
      "idle":        { h: "#d0d0d0", h2: "#a8a8a8" },  // 浅灰——摸鱼
      "stale":       { h: "#c0c0c0", h2: "#989898" },  // 银灰——失联
    },
    codex: {
      "needs-input": { h: "#f5a050", h2: "#c87020" },  // 橙帽——等回话
      "busy":        { h: "#7bc67e", h2: "#4a9a5a" },  // 品牌绿——开工
      "active":      { h: "#7bc67e", h2: "#4a9a5a" },  // 品牌绿——开工
      "idle":        { h: "#a0b8a0", h2: "#708870" },  // 灰绿——摸鱼
      "stale":       { h: "#b0b8b0", h2: "#808880" },  // 灰——失联
    },
  };
  const hat = (hatPalette[agentType] || hatPalette.codex)[status] || { h: "#d0d0d0", h2: "#a0a0a0" };
  const hardhat  = hat.h;
  const hardhat2 = hat.h2;
  const palette = {
    // 牛身统一暖棕/黄褐系，帽子承担品牌色区分
    "needs-input": { stroke: "#943020", cow: "#b84030", muzzle: "#e8a888", whip: "#1a0c04", whip2: "#0a0401" },
    "busy":        { stroke: "#a07020", cow: "#c8922a", muzzle: "#e8d090", whip: "#1a0c04", whip2: "#0a0401" },
    "active":      { stroke: "#a07020", cow: "#c8922a", muzzle: "#e8d090", whip: "#1a0c04", whip2: "#0a0401" },
    "idle":        { stroke: "#6a5a48", cow: "#8a7860", muzzle: "#c8b898", whip: "#1a0c04", whip2: "#0a0401" },
    "stale":       { stroke: "#787060", cow: "#a89888", muzzle: "#ccc0b0", whip: "#1a0c04", whip2: "#0a0401" },
  }[status] || { stroke: "#7a7060", cow: "#9e8e7a", muzzle: "#d4c4b0", whip: "#8e8e8e", whip2: "#666666" };
  const shortType = agentType === "claude" ? "CL" : "CX";
  return `
    <svg class="avatar-glyph" viewBox="0 0 220 220" aria-hidden="true">
      <g transform="translate(36 38) scale(4.2)">
        <path fill="${palette.cow}" d="M33.912 14.37C33.588 12.602 31.976 11 30 11H9c-1 0-5.325.035-6 2L.691 19.305C.016 21.27 1 24.087 3.027 24.087c1.15 0 2.596-.028 3.998-.052C10.016 28.046 12.898 36 14 36c.849 0 1.572-3.414 1.862-6h11.25c.234 2.528.843 6 1.888 6 .954 0 2.977-4.301 4.136-10.917.431-1.901.726-4.418.824-7.647.024.172.04.356.04.564v9c0 .553.447 1 1 1s1-.447 1-1v-9c0-1.807-.749-3.053-2.088-3.63z"/>
        <path fill="${palette.muzzle}" d="M10 12c-2 2-4.791-1-7-1-2.209 0-3-.434-3-.969 0-.535 1.791-.969 4-.969S12 10 10 12z"/>
        <circle fill="#292F33" cx="6" cy="16" r="1"/>
      </g>
      <g transform="translate(30 43) scale(0.65) rotate(45, 54, 32)">
        <path d="M12 32 Q18 10 54 10 Q90 10 96 32" fill="${hardhat}" stroke="#2d2219" stroke-width="4"/>
        <path d="M6 32 H102 Q104 32 104 36 Q104 40 100 40 H8 Q4 40 4 36 Q4 32 6 32 Z" fill="${hardhat}" stroke="#2d2219" stroke-width="4"/>
        <path d="M50 14 H58 V31 H50 Z" fill="${hardhat2}" stroke="#2d2219" stroke-width="3"/>
      </g>
      <g class="whip-anim whip-${status}" style="transform-origin: 214px 210px; transform-box: fill-box;">
        <path d="M222 220 L206 200" fill="none" stroke="${palette.whip}" stroke-width="4" stroke-linecap="round"/>
        <path d="M206 200 Q192 180 178 160 Q168 144 162 128" fill="none" stroke="${palette.whip}" stroke-width="2" stroke-linecap="round"/>
        <path d="M162 128 Q157 116 154 104 Q152 94 156 86" fill="none" stroke="${palette.whip2}" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M156 86 Q157 71 165 68" fill="none" stroke="${palette.whip2}" stroke-width="0.6" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

let _activeFilter = null;

function summaryCard(label, value, slug, filterStatuses) {
  const div = document.createElement("div");
  const isActive = _activeFilter === slug;
  div.className = `summary-card ${slug}${filterStatuses ? " clickable" : ""}${isActive ? " active-filter" : ""}`;
  div.innerHTML = `<div class="k">${label}</div><div class="v">${value}</div>`;
  if (filterStatuses) {
    div.title = "点击筛选";
    div.onclick = () => {
      _activeFilter = _activeFilter === slug ? null : slug;
      if (state.snapshot) render(state.snapshot);
    };
  }
  return div;
}

function renderSummary(snapshot) {
  const el = $("summary");
  el.innerHTML = "";
  el.appendChild(summaryCard("牛马总数", snapshot.agent_count ?? 0, "agents", ["needs-input","busy","active","idle","stale"]));
  el.appendChild(summaryCard("等回话", snapshot.totals?.["needs-input"] ?? 0, "needs-input", ["needs-input"]));
  el.appendChild(summaryCard("开工", (snapshot.totals?.busy ?? 0) + (snapshot.totals?.active ?? 0), "busy", ["busy","active"]));
  el.appendChild(summaryCard("摸鱼", (snapshot.totals?.idle ?? 0) + (snapshot.totals?.stale ?? 0), "idle", ["idle","stale"]));
}

function _saveHostFilter() {
  try { localStorage.setItem("af_hosts", JSON.stringify([...state.hosts])); } catch {}
}

function _loadHostFilter(hostNames) {
  try {
    const saved = JSON.parse(localStorage.getItem("af_hosts") || "null");
    if (saved && Array.isArray(saved)) {
      // keep only hosts that still exist
      const valid = saved.filter((h) => hostNames.includes(h));
      if (valid.length) { state.hosts = new Set(valid); return; }
    }
  } catch {}
  // default: all hosts selected
  hostNames.forEach((h) => state.hosts.add(h));
}

function renderHostFilters(snapshot) {
  const hostNames = snapshot.hosts.map((h) => h.host);
  if (!state.hosts.size) _loadHostFilter(hostNames);
  const wrap = $("hostFilters");
  wrap.innerHTML = "";
  hostNames.forEach((host) => {
    const chip = document.createElement("button");
    chip.className = `host-chip ${state.hosts.has(host) ? "active" : ""}`;
    chip.textContent = host;
    chip.onclick = () => {
      if (state.hosts.has(host)) {
        state.hosts.delete(host);
      } else {
        state.hosts.add(host);
      }
      _saveHostFilter();
      render(state.snapshot);
    };
    wrap.appendChild(chip);
  });
}

function renderErrors(snapshot) {
  const box = $("hostErrors");
  box.innerHTML = "";
  snapshot.hosts
    .filter((h) => h.error)
    .forEach((h) => {
      const div = document.createElement("div");
      div.className = "host-error";
      div.textContent = `${h.host}: ${h.error}`;
      box.appendChild(div);
    });
}

function agentMatches(agent) {
  if (state.hosts.size && !state.hosts.has(agent.host)) return false;
  if (_activeFilter && _activeFilter !== "agents") {
    const filterMap = { "needs-input": ["needs-input"], "busy": ["busy","active"], "idle": ["idle","stale"] };
    const allowed = filterMap[_activeFilter];
    if (allowed && !allowed.includes(agent.status)) return false;
  }
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    agent.host,
    agent.project,
    agent.branch,
    agent.cwd,
    agent.command,
    agent.recent_output,
    ...(agent.pending_items || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function makeCard(agent) {
  const tpl = $("agentCardTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.classList.add(`status-${agent.status}`);
  node.dataset.agentId = agent.id;
  node.querySelector(".status-pill").textContent = avatarCaption(agent.status);
  node.querySelector(".status-pill").classList.add(`status-${agent.status}`);
  const typePill = node.querySelector(".type-pill");
  typePill.textContent = 
    agent.agent_type === "claude" ? "Claude 班组" : 
    agent.agent_type === "droid" ? "Droid 班组" : "Codex 班组";
  typePill.classList.add(`type-${agent.agent_type}`);
  node.classList.add(`agent-type-${agent.agent_type}`);
  const hostPill = node.querySelector(".host-pill");
  hostPill.textContent = agent.host === "local" ? "Local" : agent.host;
  hostPill.style.display = "";
  if (agent.host === "local") {
    hostPill.style.background = "#eef0f8";
    hostPill.style.color = "#4a5270";
    hostPill.style.borderColor = "rgba(74,82,112,0.22)";
  }
  node.querySelector(".agent-avatar").innerHTML = avatarMarkup(agent.status, agent.agent_type);
  node.querySelector(".agent-caption").textContent = avatarCaption(agent.status);
  node.querySelector(".project").textContent = agent.display_name || agent.project || "(unknown project)";
  node.querySelector(".branch").textContent = agent.branch ? `分支 · ${agent.branch}` : "分支 · 暂无";
  node.querySelector(".hostline").textContent = `${agent.host} · pid ${agent.pid} · ${agent.stat}`;
  node.querySelector(".metrics").textContent =
    `cpu ${agent.cpu?.toFixed?.(1) ?? agent.cpu}% · mem ${agent.mem?.toFixed?.(1) ?? agent.mem}% · 在跑 ${fmtAge(agent.uptime_sec)} · 心跳 ${fmtAge(agent.heartbeat_age_sec)} 前`;
  node.querySelector(".recent-output").textContent = agent.recent_output || agent.last_user_message || "暂时没抓到动静";
  const list = node.querySelector(".pending-list");
  const items = agent.pending_items?.length ? agent.pending_items : ["（暂时没翻到明确待办）"];
  items.slice(0, 6).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  node.querySelector(".cwd").textContent = `工地目录: ${agent.cwd || "n/a"}`;
  node.querySelector(".cmd").textContent = `跑的命令: ${agent.command || "n/a"}`;
  node.querySelector(".session").textContent = `工位档案: ${agent.session_id || "n/a"} · 刚更新于 ${fmtTs(agent.updated_at)}`;

  const feedback = node.querySelector(".action-feedback");
  const setFeedback = (msg, cls = "") => {
    feedback.textContent = msg || "";
    feedback.className = `action-feedback ${cls}`.trim();
  };

  const renameBtn = node.querySelector(".rename-btn");
  renameBtn.onclick = async () => {
    const current = agent.display_name || "";
    const next = window.prompt("给这个牛马改个花名", current);
    if (next === null) return;
    try {
      await postJson("/api/rename", { rename_key: agent.rename_key, alias: next.trim() });
      setFeedback("花名记上了", "ok");
      await loadDashboard();
    } catch (err) {
      setFeedback(String(err.message || err), "err");
    }
  };

  const sendBtn = node.querySelector(".send-btn");
  const input = node.querySelector(".quick-input");
  if (!agent.interactive_supported) {
    sendBtn.disabled = true;
    input.disabled = true;
    input.placeholder = "这工位现在没法发话";
  } else {
    const doSend = async () => {
      if (sendBtn.disabled) return;
      const message = input.value.trim() || "继续";
      const isContinue = !input.value.trim();
      sendBtn.disabled = true;
      const origText = sendBtn.textContent;
      sendBtn.textContent = "发话中…";
      try {
        const res = await postJson("/api/action", { agent_id: agent.id, message });
        const ok = res.result?.returncode === 0;
        setFeedback(ok ? (isContinue ? "已催它继续干活" : `已发话: ${message}`) : (res.result?.stderr || "发不出去"), ok ? "ok" : "err");
        if (ok && !isContinue) input.value = "";
      } catch (err) {
        setFeedback(String(err.message || err), "err");
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = origText;
      }
    };
    sendBtn.onclick = doSend;
    input.addEventListener("keydown", (e) => {
      // Enter = send; Ctrl+Enter or Shift+Enter = newline
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });
  }
  
  // Focus button - only show for local hosts with detected parent app
  const focusBtn = node.querySelector(".focus-btn");
  if (agent.host_mode === "local" && agent.parent_app) {
    focusBtn.textContent = agent.parent_app;
    focusBtn.style.display = "inline-block";
    
    // Add appropriate class based on app type
    if (agent.parent_app_type === "terminal") {
      focusBtn.classList.add("app-terminal");
    } else if (agent.parent_app_type === "ide") {
      focusBtn.classList.add("app-ide");
    }
    
    focusBtn.onclick = async () => {
      if (focusBtn.disabled) return;
      focusBtn.disabled = true;
      const origText = focusBtn.textContent;
      focusBtn.textContent = "跳转中...";
      
      try {
        const res = await fetch(`/api/focus?pid=${agent.pid}`);
        const data = await res.json();
        
        if (data.success) {
          focusBtn.textContent = "✓ 已跳转";
          setTimeout(() => {
            focusBtn.textContent = origText;
          }, 2000);
        } else {
          setFeedback(`跳转失败: ${data.error || '未知错误'}`, "err");
          focusBtn.textContent = origText;
        }
      } catch (err) {
        setFeedback(`跳转失败: ${err.message}`, "err");
        focusBtn.textContent = origText;
      } finally {
        focusBtn.disabled = false;
      }
    };
  }
  
  return node;
}

function buildToolSection(tool, agents) {
  const section = document.createElement("section");
  section.className = `tool-section ${tool}`;
  section.dataset.tool = tool;
  section.dataset.collapsed = "false";
  
  // Tool-specific labels
  const toolConfig = {
    codex: { title: "Codex 班组", kicker: "写码工地", subtitle: "写代码这队牛马，谁卡住了、谁摸鱼了、谁该催，一眼翻出来。" },
    claude: { title: "Claude 班组", kicker: "跑活工地", subtitle: "做任务这队牛马，谁还在装忙、谁停工了，工头都盯着。" },
    droid: { title: "Droid 班组", kicker: "AI 工地", subtitle: "Factory Droid 牛马们的工作状态，实时监控，一目了然。" },
  };
  const config = toolConfig[tool] || { title: `${tool} 班组`, kicker: "工地", subtitle: "牛马工作状态监控" };
  
  section.innerHTML = `
    <div class="tool-head">
      <div class="tool-title-wrap">
        <div class="tool-kicker">${config.kicker}</div>
        <h2 class="tool-title">${config.title}</h2>
        <p class="tool-subtitle">${config.subtitle}</p>
      </div>
      <div class="tool-controls">
        <div class="tool-badge ${tool}">${agents.length} 个牛马</div>
        <button class="collapse-btn" data-tool="${tool}" title="展开/收起">
          <span class="collapse-icon">▼</span>
        </button>
      </div>
    </div>
    <div class="tool-grid"></div>
  `;
  const grid = section.querySelector(".tool-grid");
  laneGroups.forEach((group) => {
    const lane = document.createElement("div");
    lane.className = "lane";
    const groupedAgents = agents
      .filter((agent) => group.statuses.includes(agent.status))
      .sort((a, b) => (a.heartbeat_age_sec ?? 1e12) - (b.heartbeat_age_sec ?? 1e12));
    lane.innerHTML = `
      <div class="lane-head ${group.key}">
        <span>${group.label}</span>
        <span class="count">${groupedAgents.length}</span>
      </div>
      <div class="lane-body"></div>
    `;
    const body = lane.querySelector(".lane-body");
    groupedAgents.forEach((agent) => body.appendChild(makeCard(agent)));
    grid.appendChild(lane);
  });
  return section;
}

function renderBoard(snapshot) {
  const board = $("board");
  // preserve text and focus state before tearing down DOM
  const savedInputs = {};
  let focusedAgentId = null;
  let focusedSel = null; // selectionStart
  let focusedSelEnd = null;
  board.querySelectorAll(".agent-card[data-agent-id]").forEach((card) => {
    const inp = card.querySelector(".quick-input");
    if (!inp) return;
    if (inp.value) savedInputs[card.dataset.agentId] = inp.value;
    if (document.activeElement === inp) {
      focusedAgentId = card.dataset.agentId;
      focusedSel = inp.selectionStart;
      focusedSelEnd = inp.selectionEnd;
    }
  });
  board.innerHTML = "";
  const agents = snapshot.hosts.flatMap((h) => h.agents || []).filter(agentMatches);
  const byTool = {
    codex: agents.filter((a) => a.agent_type === "codex"),
    claude: agents.filter((a) => a.agent_type === "claude"),
    droid: agents.filter((a) => a.agent_type === "droid"),
  };
  
  // Sort tools by agent count (descending)
  const sortedTools = toolOrder.slice().sort((a, b) => {
    return (byTool[b] || []).length - (byTool[a] || []).length;
  });
  
  sortedTools.forEach((tool) => {
    const section = buildToolSection(tool, byTool[tool] || []);
    board.appendChild(section);
    
    // Restore collapsed state if previously set
    const wasCollapsed = localStorage.getItem(`section-collapsed-${tool}`) === "true";
    if (wasCollapsed) {
      section.dataset.collapsed = "true";
      section.querySelector(".tool-grid").style.display = "none";
      section.querySelector(".collapse-icon").textContent = "▶";
    }
  });
  // restore saved inputs and focus
  board.querySelectorAll(".agent-card[data-agent-id]").forEach((card) => {
    const v = savedInputs[card.dataset.agentId];
    const inp = card.querySelector(".quick-input");
    if (!inp) return;
    if (v) inp.value = v;
    if (card.dataset.agentId === focusedAgentId) {
      inp.focus();
      try { inp.setSelectionRange(focusedSel, focusedSelEnd ?? focusedSel); } catch {}
    }
  });
}

function setHostFormFeedback(message, cls = "") {
  const el = $("hostFormFeedback");
  el.textContent = message || "";
  el.className = `form-feedback ${cls}`.trim();
}

function _updatePasswordRowVisibility() {
  const isSshKey = $("hostModeInput").value === "ssh";
  $("hostPasswordRow").style.display = isSshKey ? "none" : "";
  $("hostPasswordInput").required = !isSshKey;
}

function readHostForm() {
  return {
    id: $("hostIdInput").value.trim(),
    name: $("hostNameInput").value.trim(),
    ssh_target: $("hostTargetInput").value.trim(),
    port: Number($("hostPortInput").value || 22),
    mode: $("hostModeInput").value,
    username: $("hostUsernameInput").value.trim(),
    password: $("hostPasswordInput").value,
    enabled: $("hostEnabledInput").checked,
    send_mode: $("hostSendModeInput").value,
  };
}

function resetHostForm() {
  $("hostFormTitle").textContent = "登记新工地";
  $("hostIdInput").value = "";
  $("hostNameInput").value = "";
  $("hostTargetInput").value = "";
  $("hostPortInput").value = "22";
  $("hostModeInput").value = "ssh";
  $("hostUsernameInput").value = "";
  $("hostPasswordInput").value = "";
  $("hostEnabledInput").checked = true;
  $("hostSendModeInput").value = "stdin";
  $("cancelHostBtn").hidden = true;
  setHostFormFeedback("");
  _updatePasswordRowVisibility();
}

function populateHostForm(host) {
  $("hostFormTitle").textContent = `改 ${host.name} 的资料`;
  $("hostIdInput").value = host.id || "";
  $("hostNameInput").value = host.name || "";
  $("hostTargetInput").value = host.ssh_target || "";
  $("hostPortInput").value = host.port || 22;
  $("hostModeInput").value = host.mode === "ssh_password" ? "ssh_password" : "ssh";
  $("hostUsernameInput").value = host.username || "";
  $("hostPasswordInput").value = "";
  $("hostEnabledInput").checked = !!host.enabled;
  $("hostSendModeInput").value = host.send_mode || "stdin";
  $("cancelHostBtn").hidden = false;
  setHostFormFeedback(host.mode === "ssh_password" ? "口令不给你看。留空就沿用旧的。" : "");
  _updatePasswordRowVisibility();
}

function renderManagedHosts(hosts) {
  state.managedHosts = hosts || [];
  $("managedHostCount").textContent = String(state.managedHosts.length);
  const wrap = $("managedHosts");
  wrap.innerHTML = "";
  if (!state.managedHosts.length) {
    const empty = document.createElement("div");
    empty.className = "managed-host-empty";
    empty.textContent = "还没登记工地。包工头现在只能盯本地牛马。";
    wrap.appendChild(empty);
    return;
  }

  state.managedHosts.forEach((host) => {
    const card = document.createElement("article");
    card.className = `managed-host ${host.enabled ? "" : "disabled"}`.trim();

    const head = document.createElement("div");
    head.className = "managed-host-head";

    const titleWrap = document.createElement("div");
    titleWrap.className = "managed-host-title-wrap";
    const title = document.createElement("h4");
    title.textContent = host.name;
    const meta = document.createElement("div");
    meta.className = "managed-host-meta";
    meta.textContent = `${host.username || "unknown"} @ ${host.ssh_target}:${host.port} · ${host.enabled ? "巡场中" : "停巡"}`;
    titleWrap.appendChild(title);
    titleWrap.appendChild(meta);

    const badge = document.createElement("div");
    badge.className = `managed-host-badge ${host.enabled ? "enabled" : "disabled"}`;
    badge.textContent = host.enabled ? "在巡" : "停巡";

    head.appendChild(titleWrap);
    head.appendChild(badge);
    card.appendChild(head);

    const error = document.createElement("div");
    error.className = host.last_error ? "managed-host-error" : "managed-host-note";
    error.textContent = host.last_error || "工地口令已经锁柜子里了。改资料时留空就沿用旧口令。";
    card.appendChild(error);

    const actions = document.createElement("div");
    actions.className = "managed-host-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-btn";
    editBtn.textContent = "改资料";
    editBtn.onclick = () => populateHostForm(host);

    const testBtn = document.createElement("button");
    testBtn.type = "button";
    testBtn.className = "ghost-btn";
    testBtn.textContent = "试通";
    testBtn.onclick = async () => {
      try {
        const payload = {
          id: host.id,
          name: host.name,
          ssh_target: host.ssh_target,
          port: host.port,
          username: host.username,
          password: "",
          enabled: host.enabled,
          send_mode: host.send_mode,
        };
        const res = await postJson("/api/hosts/test", payload);
        setHostFormFeedback(`试通了，抓到 ${res.result?.agent_count ?? 0} 个牛马`, "ok");
        await loadDashboard();
      } catch (err) {
        setHostFormFeedback(String(err.message || err), "err");
        await loadDashboard();
      }
    };

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "ghost-btn";
    toggleBtn.textContent = host.enabled ? "停巡" : "开巡";
    toggleBtn.onclick = async () => {
      try {
        await postJson("/api/hosts/toggle", { id: host.id, enabled: !host.enabled });
        setHostFormFeedback(host.enabled ? "这工地先不盯了" : "这工地重新纳入巡场", "ok");
        await loadDashboard();
      } catch (err) {
        setHostFormFeedback(String(err.message || err), "err");
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger-btn";
    deleteBtn.textContent = "除名";
    deleteBtn.onclick = async () => {
      if (!window.confirm(`真把工地 "${host.name}" 除名？`)) return;
      try {
        await postJson("/api/hosts/delete", { id: host.id });
        if ($("hostIdInput").value === host.id) resetHostForm();
        setHostFormFeedback("工地已经除名", "ok");
        await loadDashboard();
      } catch (err) {
        setHostFormFeedback(String(err.message || err), "err");
      }
    };

    actions.appendChild(editBtn);
    actions.appendChild(testBtn);
    actions.appendChild(toggleBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    wrap.appendChild(card);
  });
}

function render(snapshot) {
  state.snapshot = snapshot;
  $("generatedAt").textContent = fmtTs(snapshot.generated_at);
  $("pollInterval").textContent = `1s（后台静默）`;
  renderSummary(snapshot);
  renderHostFilters(snapshot);
  renderErrors(snapshot);
  renderBoard(snapshot);
}

async function loadDashboard() {
  const [snapshot, hostData] = await Promise.all([getJson("/api/snapshot"), getJson("/api/hosts")]);
  render(snapshot);
  renderManagedHosts(hostData.hosts || []);
}

async function triggerRefresh() {
  await fetch("/api/refresh");
  setTimeout(loadDashboard, 300);
}

$("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value;
  if (state.snapshot) render(state.snapshot);
});

$("refreshBtn").addEventListener("click", triggerRefresh);

$("toggleHostsBtn").addEventListener("click", () => {
  const panel = $("remotePanel");
  const btn = $("toggleHostsBtn");
  const hidden = panel.hasAttribute("hidden");
  if (hidden) {
    panel.removeAttribute("hidden");
    btn.textContent = "收起工地";
  } else {
    panel.setAttribute("hidden", "");
    btn.textContent = "管工地";
  }
});

$("newHostBtn").addEventListener("click", () => {
  resetHostForm();
  $("hostNameInput").focus();
});

$("cancelHostBtn").addEventListener("click", resetHostForm);

$("hostForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const payload = readHostForm();
    const res = await postJson("/api/hosts/save", payload);
    resetHostForm();
    setHostFormFeedback(`工地已记档：${res.host?.name || "unnamed"}`, "ok");
    await loadDashboard();
  } catch (err) {
    setHostFormFeedback(String(err.message || err), "err");
  }
});

$("testHostBtn").addEventListener("click", async () => {
  try {
    const payload = readHostForm();
    const res = await postJson("/api/hosts/test", payload);
    setHostFormFeedback(`试通了，抓到 ${res.result?.agent_count ?? 0} 个牛马`, "ok");
    await loadDashboard();
  } catch (err) {
    setHostFormFeedback(String(err.message || err), "err");
  }
});

// Collapse/expand section toggle
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".collapse-btn");
  if (!btn) return;
  
  const tool = btn.dataset.tool;
  const section = btn.closest(".tool-section");
  const grid = section.querySelector(".tool-grid");
  const icon = btn.querySelector(".collapse-icon");
  
  const isCollapsed = section.dataset.collapsed === "true";
  section.dataset.collapsed = isCollapsed ? "false" : "true";
  
  if (isCollapsed) {
    grid.style.display = "";
    icon.textContent = "▼";
    localStorage.setItem(`section-collapsed-${tool}`, "false");
  } else {
    grid.style.display = "none";
    icon.textContent = "▶";
    localStorage.setItem(`section-collapsed-${tool}`, "true");
  }
});

$("hostModeInput").addEventListener("change", _updatePasswordRowVisibility);
$("hostTargetInput").addEventListener("input", () => {
  const val = $("hostTargetInput").value.trim();
  // parse user@host or ssh user@host or ssh -p port user@host
  const match = val.match(/(?:ssh\s+)?(?:-p\s*(\d+)\s+)?([\w.\-]+)@([\w.\-:]+)/);
  if (match) {
    if (match[1]) $("hostPortInput").value = match[1];
    $("hostUsernameInput").value = match[2];
    $("hostTargetInput").value = match[3];
  }
});
resetHostForm();
// Silent background refresh — only re-render when data actually changes
let _lastSnapshotJson = "";
async function silentRefresh() {
  try {
    const [snapshot, hostData] = await Promise.all([getJson("/api/snapshot"), getJson("/api/hosts")]);
    const newJson = JSON.stringify(snapshot);
    if (newJson !== _lastSnapshotJson) {
      _lastSnapshotJson = newJson;
      render(snapshot);
    }
    renderManagedHosts(hostData.hosts || []);
  } catch (err) {
    console.warn("refresh error", err);
  }
}

loadDashboard().catch((err) => {
  console.error(err);
  setHostFormFeedback(String(err.message || err), "err");
});
setInterval(silentRefresh, 1000);
