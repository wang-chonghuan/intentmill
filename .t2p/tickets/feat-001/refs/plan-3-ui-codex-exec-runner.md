# Plan 3: UI 触发 Codex Exec

## 目标

让 UI 里的动作可以触发一个后台 Codex 任务。

第一版只保留行级动作边界：

- 每个 issue 的 `Action -> Generate Plan` 启动一个后台 `codex exec`
- 该 Codex 任务只处理当前 issue
- Prompt 内执行 `intentmill-ops cap7`
- cap7 会按顺序完成 cap1-cap6，并在每个生成阶段通过 cap11 语义 gate
- 输出目标是目标项目 issue worktree 下的本地 planning artifacts，不是直接写 `im_*` 字段

## UI 入口

只需要一个入口。

行级入口：

- issue 表每一行最左侧增加 `Action` 下拉按钮
- 下拉菜单包含一项：`Generate Plan`
- 点击后为当前 issue 生成完整本地 planning 内容

`Generate Plan` 只作用于当前这一条 issue。

## 核心决策

后端直接执行 `codex exec`。

行级 `Generate Plan` 必须以 yolo 模式运行：

```bash
--dangerously-bypass-approvals-and-sandbox
```

这个参数等价于 Codex CLI 文档中的 `--yolo` 行为：跳过审批并禁用 sandbox。计划里使用长参数，避免不同本地版本是否展示 `--yolo` alias 的差异。

不加 `--sandbox`。
不加 `--ephemeral`。

也就是说，Codex 使用这台机器已有的 Codex 配置、登录状态、权限、模型和 session 行为。

风险边界：

- yolo 模式只允许用于后端白名单动作生成的固定命令
- 浏览器不能传任意 prompt、任意命令、任意 cwd
- 第一版只允许 `generate-issue-plan` 使用 yolo
- 批量生成 `im_*` 字段不在 plan3 第一版范围内

## 执行方式

浏览器不能传任意 shell 命令。

UI 只传一个白名单行级动作，例如：

```json
{
  "action": "generate-issue-plan",
  "project": "nsdk",
  "issueId": "ENG-506"
}
```

`project` 必须能匹配 `ssot-config.json` 里的项目 key 或 alias。第一版可以默认传 `nsdk`，但后端仍必须校验，不能从 issue id 猜项目。

后端把这个动作映射成固定命令：

```bash
codex exec \
  --dangerously-bypass-approvals-and-sandbox \
  --cd /Users/yong/work/intentmill \
  -
```

实现时用 `spawn` 传 argv，不拼 shell 字符串。

Prompt 从后端生成的 `prompt.md` 通过 stdin 传入，避免超长命令行和 shell quoting 问题。

推荐 argv 形态：

```ts
[
  "exec",
  "--dangerously-bypass-approvals-and-sandbox",
  "--cd",
  intentmillRoot,
  "-"
]
```

## 固定 Prompt 要求

行级 `Generate Plan` Prompt 需要明确告诉 Codex：

- 当前动作是 `generate-issue-plan`
- `project` 是后端白名单校验后的项目名，例如 `nsdk`
- `issue-id` 是当前行的 issue id，例如 `ENG-506`
- 从 IntentMill repo root 开始工作
- 加载并使用 `.agents/skills/intentmill-ops`
- 执行 `intentmill-ops cap7`，输入为当前 `project` 和 `issue-id`
- cap7 内部必须按顺序走 cap1、cap2、cap3、cap4、cap5、cap6
- 每个生成阶段必须按技能要求经过 targeted cap11 语义检查
- 最后必须再运行 cap11 的 `all` 检查
- 不实现目标项目代码
- 不创建 PR
- 不 commit、不 push
- 不修改 Linear
- 最终只报告 worktree 路径、refs 目录、生成的 artifacts、最终 `im-gate.md` 决策和阻塞问题

行级 Generate Plan 的核心产物位于目标项目 issue worktree 内：

```text
.workspace/<project-key>--<ISSUE-ID>/.t2p/tickets/<ISSUE-ID>/refs/
```

预期至少包含：

```text
im-req-engineered.md
im-req-summarized.md
im-ac.md
im-solution.md
im-estimation.md
im-gate.md
```

## Subagent 边界

可以用 subagents，但只作为助手。

适合：

- 按 assignee 或 issue 分组并行分析
- 并行生成草稿
- 返回结构化结果给父任务

不适合：

- 多个 subagent 同时写数据库
- subagent 修改源码
- 无限递归拆任务

父任务负责最终汇总、校验、写入和验证。

## 第一版实现

先保持很轻：

- 后端生成一个 run id
- 创建 `tmp/codex-runs/<run-id>/`
- 写入 `prompt.md`
- 启动 `codex exec`
- stdout/stderr 写日志文件
- UI 显示任务已启动、run id 和日志路径

第一版不做：

- 实时日志
- 取消任务
- 重试
- workflow_runs 表
- 复杂队列

## 行级 Generate Plan 实现细节

后端处理 `generate-issue-plan` 时：

1. 校验 `action === "generate-issue-plan"`。
2. 校验 `project` 存在于 `ssot-config.json` 的 `projects` key 或 alias。
3. 校验 `issueId` 格式，例如 `^[A-Z]+-\d+$`。
4. 生成 run id。
5. 创建 `tmp/codex-runs/<run-id>/`。
6. 写入固定模板生成的 `prompt.md`。
7. 使用 `spawn` 启动：
   ```bash
   codex exec --dangerously-bypass-approvals-and-sandbox --cd /Users/yong/work/intentmill -
   ```
8. 将 `prompt.md` 内容写入 stdin。
9. 将 stdout/stderr 写入日志文件。
10. UI 显示任务已启动、run id、日志路径。

第一版可以只返回“已启动”。任务完成状态先通过日志查看。

后续再决定是否增加：

- 任务状态轮询
- 最新 run 结果展示
- 打开 artifact 路径
- 重新运行失败 cap
- 将 run 记录写入数据库

## 待定问题

- 行级 `Generate Plan` 是否需要把最终 artifact 摘要回写到当前 IntentMill 数据库字段？
- 行级任务完成后 UI 是否需要显示 artifact 路径？
- UI 是否需要轮询任务状态？
- 最终是否需要把 run 记录放进数据库？
- 任务完成后由 UI 自动刷新，还是用户手动刷新？

## 当前计划检查结论

已修正的计划漂移：

- 原计划把行级 `Generate Plan` 描述成生成 `im_*` 字段；现在改为执行 `intentmill-ops cap7` 并生成本地 planning artifacts。
- 原计划的行级 action 缺少 `project`；现在补充为后端必须校验 `project + issueId`，因为 `intentmill-ops` 每个 capability 都需要这两个输入。
- 原计划的命令把 prompt 放在命令行参数里；现在改成 stdin 传入 `prompt.md`，更适合长 prompt。
- 原计划没有明确 yolo 参数；现在固定使用 `--dangerously-bypass-approvals-and-sandbox`。
- 原计划没有明确 cap11 质量 gate；现在行级 prompt 要求 cap7 内部每阶段 targeted cap11，最后再做 cap11 all。
- 原计划包含顶部 `More actions` 和 cycle 级批量动作；现在第一版只保留每行 `Generate Plan`。
