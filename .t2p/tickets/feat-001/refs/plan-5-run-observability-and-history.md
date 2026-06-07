# Plan 5: Run 可观测性与历史

## 目标

承接 plan4 明确不做的增强项。plan4 负责一次性补齐行级运行控制，并已经包含页面刷新后恢复当前可见 issue 的 active run；plan5 再考虑更完整的 run 可观测性、历史和人工操作能力。

## 范围

plan5 关注：

- 跨页面/全局 active run 视图
- 最新 run 历史列表
- 日志内容 UI 展示
- 取消任务
- 数据库 run history
- 同一 issue 的运行历史和重跑策略
- 更丰富的 artifact 入口

## 跨页面 Active Run 视图

plan4 已经处理页面刷新后恢复当前表格可见 issue 的 active run。

plan5 可以进一步提供一个不依赖当前表格 rows 的全局 active run 视图：

```ts
listAllActiveCodexRuns({ project })
```

行为：

1. 扫描 `tmp/codex-runs/*/run.json`。
2. 返回当前 project 下仍处于 `starting` 或 `running` 的所有 runs。
3. 不要求 issue 当前在表格 rows 中可见。
4. 对超过 20 分钟的 run 标记为 `timed-out`，不返回为 running。

这个视图适合后续做全局 run drawer、运行中心或调试页面。

## Run 历史列表

后续可以在行级 Action 或页面侧边信息里显示最近 runs：

- run id
- issue id
- status
- startedAt
- finishedAt
- duration
- stderr/stdout path
- last-message path
- final gate decision

历史列表可以继续先依赖文件系统扫描；如果历史查询变慢或需要跨进程持久检索，再加数据库。

## 日志 UI

不要一次性读取完整日志。实测一次 run 的 `stderr.log` 可到 1.5MB 以上。

后续日志 UI 应该使用：

- tail 模式：只读最后 N KB 或最后 N 行
- 分页模式：按 byte offset 读取
- 摘要模式：从 `last-message.md` 和 `run.json` 展示关键状态

建议日志 UI 先做 `tail stderr.log`：

```ts
getCodexRunLogTail({ runId, stream: 'stderr', maxBytes: 65536 })
```

返回时限制大小，避免把完整 transcript 塞进 React state。

## 用户主动取消任务

plan4 已经包含 20 分钟自动超时，并会在 timeout finalization 中尽力终止旧 Codex 子进程。plan5 只讨论用户主动点击取消。

后续如果要支持用户主动取消：

1. `run.json` 必须记录 pid。
2. 新增 `cancelCodexRun({ runId })`。
3. 校验 run 属于当前工作区并仍 active。
4. 给 pid 发 `SIGTERM`。
5. 等短时间后仍存在再考虑 `SIGKILL`。
6. 写入 `status: 'cancelled'`。

取消必须谨慎，因为 Codex 可能正在写 target worktree artifacts。

## 数据库 Run History

如果文件扫描不够用，再新增数据库表。

候选字段：

- `run_id`
- `action`
- `project`
- `issue_id`
- `status`
- `started_at`
- `finished_at`
- `exit_code`
- `signal`
- `run_dir`
- `stdout_path`
- `stderr_path`
- `metadata_path`
- `last_message_path`
- `final_gate_decision`
- `error`

数据库表不是 plan4 的前置条件。

## 同一 Issue 历史和重跑策略

后续可以让用户在同一 issue 上看到：

- 最近一次成功 run
- 最近一次失败 run
- 所有历史 runs
- 重新运行
- 从某个失败 cap 继续

但当前 `intentmill-ops cap7` 是完整刷新流程，plan4 保持每次从 cap1-cap6 全量重跑。

## Artifact 入口

成功后可以提供：

- 打开 refs 目录
- 查看 `im-gate.md`
- 查看 `im-solution.md`
- 查看 `last-message.md`

这需要 UI 有合适的详情区域。plan4 只显示简短成功/失败 notice，不默认展示 refs 路径。
