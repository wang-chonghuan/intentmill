# Plan 4: 完整行级 Run 控制

## 目标

一次性补齐行级 `Generate Plan` 的完整运行控制能力：

- 运行期间对应行显示 `Generating MM:SS`
- 支持多个 issue 并行生成
- 同一 issue 防重复启动
- 页面刷新后恢复仍在运行的行级状态
- 前端轮询 `run.json` 并自动恢复按钮
- 20 分钟超时
- 后端 active-run 防重复
- runner 快速返回
- `run.json` 原子写入
- cap1 每次基于最新远程 default branch 准备 worktree
- 重复点击同一 issue 时重新生成并覆盖当前 issue planning artifacts
- 成功、失败、超时 notice

状态来源使用现有 `tmp/codex-runs/<run-id>/run.json`。

## 并行运行模型

必须支持多个 issue 同时生成。

前端不要用单个 `isGenerating` boolean，而是维护一个按 issue id 索引的运行 map：

```ts
type RowRunState = {
  issueId: string
  project: string
  runId?: string
  status: 'starting' | 'running' | 'succeeded' | 'failed' | 'failed-to-start' | 'timed-out'
  startedAt: string
  finishedAt?: string
  timeoutAt?: string
  stdoutPath?: string
  stderrPath?: string
  metadataPath?: string
  outputLastMessagePath?: string
  finalGateDecision?: 'ready' | 'revise' | 'unknown'
  pid?: number | null
  exitCode?: number | null
  signal?: string | null
  error?: string
}

type RowRunsByIssueId = Record<string, RowRunState>
```

说明：

- 前端点击后可以先创建一个临时 `starting` 状态，此时还没有真实 `runId` 和日志路径。
- server function 返回后必须用真实 `runId`、`metadataPath`、`stdoutPath`、`stderrPath` 替换临时状态。
- 只有带真实 `runId` 的 active run 才参与 3 秒轮询。

架构边界：

- 每个 issue 行最多显示一个 active run。
- 不同 issue 可以同时运行。
- 同一 issue 正在运行时，`Generate Plan` 禁用，避免同一 worktree 被并发写入。
- 后端做 per issue 启动锁和 active-run 检查，防止两个浏览器窗口同时启动同一个 issue。
- 后端 `runId` 本身仍然唯一，因此未来可以支持同一 issue 的历史 runs。

## 重复点击与幂等

用户可能在一次 `Generate Plan` 完成后，对同一个 issue 再点一次。

期望行为：

- 如果同一 issue 仍在运行，按钮禁用，不允许重复启动。
- 如果上一轮已经 `succeeded`、`failed`、`failed-to-start` 或 `timed-out`，再次点击会启动一个新的 run。
- 新 run 会复用同一个 issue worktree：`.workspace/<project-key>--<ISSUE-ID>`。
- 新 run 默认重新生成 cap3-cap6 artifacts，而不是跳过旧文件。
- 旧 run 目录保留在 `tmp/codex-runs/<old-run-id>/`，新 run 使用新 `runId`。
- 旧 artifacts 会被新 cap7 刷新覆盖，因此 `.t2p/tickets/<ISSUE-ID>/refs/im-*.md` 只表示当前最新 planning artifacts。

实现要求：

1. 前端防止同页重复点击。
2. 后端启动前先获取 per issue 启动锁，锁 key 为 `<project>-<issueId>`。
3. 拿到锁后做 active-run 检查：扫描 `tmp/codex-runs/*/run.json`，如果同 project + issueId 存在 `starting` 或 `running` 且未超过 20 分钟，则拒绝启动并返回清晰错误。
4. 如果同 project + issueId 的 active run 已超过 20 分钟，先按“超时策略”终止旧 run，再把旧 run 标记为 `timed-out`，然后允许新 run 启动。
5. 新 run 写入 `running` metadata 后释放启动锁。
6. 如果启动过程失败，也必须释放启动锁。
7. `timed-out` 是 UI 终态，按钮恢复。
8. cap7 仍按技能规则重新生成 artifacts；不因为旧 artifacts 存在而跳过。

启动锁实现要求：

- 使用文件系统原子操作，推荐 `fs.mkdir(tmp/codex-runs/locks/<project>-<issueId>)`。
- 如果 lock dir 已存在且 mtime 未超过 60 秒，说明另一个启动请求正在进行，直接拒绝。
- 如果 lock dir 已存在且超过 60 秒，视为 stale lock，可以删除后重试一次。
- lock 只保护“检查 active runs -> 创建新 run metadata”这段临界区，不覆盖整个 Codex run 生命周期。

## 后端状态 API

新增两个轻量 server function。

### `getCodexRunStatus`

```ts
getCodexRunStatus({ runId })
```

它只做这些事：

1. 校验 `runId` 格式，只允许 run id 安全字符，例如 `^[a-z0-9._-]+$`。
2. 拼出 `tmp/codex-runs/<run-id>/run.json`。
3. 确保 resolved path 仍在 `tmp/codex-runs` 目录下，防止路径穿越。
4. 读取并解析 `run.json`。
5. 如果 `outputLastMessagePath` 存在且文件大小不超过 64KB，可以读取它并提取最终 gate 结果，只允许返回结构化摘要，不返回完整内容：
   - `Final im-gate.md decision: all / ready` -> `finalGateDecision: 'ready'`
   - `Final im-gate.md decision: revise` 或明确要求返工 -> `finalGateDecision: 'revise'`
   - 未识别 -> `finalGateDecision: 'unknown'`
6. 返回前端需要的字段：
   - `runId`
   - `project`
   - `issueId`
   - `status`
   - `startedAt`
   - `finishedAt`
   - `pid`
   - `exitCode`
   - `signal`
   - `timeoutAt`
   - `stdoutPath`
   - `stderrPath`
   - `metadataPath`
   - `outputLastMessagePath`
   - `finalGateDecision`
   - `error`

不读取大日志，不返回 stdout/stderr 内容。`last-message.md` 是小型最终摘要，允许做有大小上限的结构化读取。

### `listActiveCodexRuns`

```ts
listActiveCodexRuns({ project, issueIds })
```

用于页面刷新后恢复行级运行态。

它只做这些事：

1. 校验 `project` 能匹配 `ssot-config.json` 的 project key 或 alias。
2. 校验 `issueIds` 都是 `^[A-Z]+-\d+$`。
3. 扫描 `tmp/codex-runs/*/run.json`。
4. 只保留同 project、issueId 在当前页面 rows 内、状态为 `starting` 或 `running` 的 runs。
5. 对超过 20 分钟的 run 执行 timeout finalization，写回 `timed-out`，不返回为 active。
6. 如果同一个 issue 有多个未超时 active metadata，这是异常状态。后端应保留最新 `startedAt` 的一个用于 UI 恢复；其他 active run 必须执行安全收敛：
   - 如果有 `pid` 且进程仍存在，按 timeout finalization 的方式先 `SIGTERM` 后必要时 `SIGKILL`。
   - 写回 `status: 'failed'` 和清晰 `error: 'duplicate active run superseded by <runId>'`。
   - 记录 duplicate-active warning，不能静默忽略，也不能让两个 Codex 继续写同一个 issue worktree。
7. 返回 `RowRunState[]`。

不按 cycle 扫描 run。run metadata 当前没有 cycle，恢复时用当前页面可见 `issueIds` 过滤即可，避免恢复其他页面不可见 issue。

## 前端状态管理

在页面组件里维护三个状态：

```ts
const [rowRuns, setRowRuns] = useState<RowRunsByIssueId>({})
const [nowTick, setNowTick] = useState(() => Date.now())
const [lastFinishedRun, setLastFinishedRun] = useState<RowRunState | null>(null)
```

职责：

- `rowRuns`：当前页面生命周期内的行级运行态。
- `nowTick`：每秒更新，用于渲染 elapsed time。
- `lastFinishedRun`：显示最近一次完成/失败的 notice。

点击 `Generate Plan` 后：

1. 立即把该 issue 置为临时 starting 状态，防止重复点击。
2. 调用现有 `generateIssuePlanForIssue`。
3. 返回 run 后，把该 issue 的状态写入 `rowRuns[issueId]`。
4. 如果启动失败，从 `rowRuns` 移除该 issue，并显示错误。

页面加载或刷新后：

1. loader 正常加载当前 project/cycle 的 issue rows。
2. 页面 mounted 后，拿当前 rows 的 `issue_id` 列表调用 `listActiveCodexRuns({ project: selectedProject, issueIds })`。
3. 把返回的 active runs 合并进 `rowRuns`。
4. 这些行立即显示 `Generating MM:SS`，计时从 run 的原始 `startedAt` 继续。
5. 随后的 3 秒轮询继续接管状态更新。

当切换 project 或 cycle：

- 清空当前 `rowRuns`。
- 新 rows 加载完成后重新调用 `listActiveCodexRuns`。
- 只恢复新页面 rows 对应的 active runs。

## 计时显示

运行中的行不再显示普通下拉按钮，而是显示禁用态：

```text
Generating 03:12
```

计时只在前端计算：

```ts
elapsed = Date.now() - Date.parse(startedAt)
```

显示格式：

- `< 1h`: `MM:SS`
- `>= 1h`: `H:MM:SS`

每秒 tick 一次即可，不需要后端参与。

## 状态轮询

前端每 3 秒轮询所有 active run。

active 状态定义：

- `running`
- `starting`

终态定义：

- `succeeded`
- `failed`
- `failed-to-start`
- `timed-out`

轮询策略：

1. 从 `rowRuns` 里取 active runs，并过滤掉还没有真实 `runId` 的前端临时 starting 状态。
2. 并行调用 `getCodexRunStatus({ runId })`。
3. 对每个返回结果：
   - `running` / `starting`：更新状态，继续显示计时。
   - `succeeded`：从 active map 移除该 issue，恢复 `Action` 按钮，显示成功 notice。
   - `failed` / `failed-to-start` / `timed-out`：从 active map 移除该 issue，恢复 `Action` 按钮，显示失败 notice 和日志路径。
4. 单个 run 状态读取失败，不影响其他 runs；该行显示错误并恢复按钮。

超时策略：

- 最大运行时间固定为 20 分钟。
- runner 启动子进程后必须注册一个 20 分钟的 in-process timer，到点调用同一个 timeout finalization helper。这样即使页面关闭，server 进程仍会尽力终止超时 run。
- 前端可以用 elapsed time 判断已超过 20 分钟，但不要只在本地最终定性。超过 20 分钟时仍调用 `getCodexRunStatus`，由后端执行 timeout finalization 后返回 `timed-out`。
- 后端状态 API 也必须执行同样判断；如果 server 重启导致 in-process timer 丢失，或者页面刷新后才发现 `run.json` 仍是 `running/starting` 且超过 20 分钟，则进入 timeout finalization。
- Timeout finalization 必须尽力终止旧 Codex 子进程，避免旧 run 继续写同一个 issue worktree：
  1. 如果 `run.json.pid` 存在且进程仍存在，先发 `SIGTERM`。
  2. 等短暂 grace period 后仍存在，再发 `SIGKILL`。
  3. 写回 `status: 'timed-out'`、`finishedAt`、`error`。
  4. 返回 `timed-out`。
- 子进程 `close` 事件不得把已是 `timed-out` 的 run 覆盖成 `succeeded` 或 `failed`。如果 late close 需要记录，只能写 `lateExitCode` / `lateSignal` 这类附加字段。
- 子进程正常 `close` 时要清理对应 timer。
- 超时后同一 issue 可以重新启动新 run，因为旧 run 已被 timeout finalization 终止或确认不再 active。

简单实现可以用两个 effect：

- `setInterval` 每秒更新 `nowTick`
- `setInterval` 每 3 秒 poll active runs
- `useEffect` 在 rows/project/cycle 变化后调用 `listActiveCodexRuns`

注意 effect 要避免闭包拿到旧 `rowRuns`。可选做法：

- 用 `useRef` 保存最新 `rowRuns`
- 或让 effect 依赖 active run ids，变更时重建 interval

为了简单和可读，推荐把逻辑拆成小 helper：

```ts
function activeRuns(rowRuns: RowRunsByIssueId): RowRunState[]
function isActiveRun(status: string): boolean
function formatElapsed(startedAt: string, now: number): string
function mergeRunStatus(...)
function restoreActiveRuns(...)
```

## UI 行为

`ActionMenu` 接收当前行的 run：

```ts
type ActionMenuProps = {
  issueId: string
  run?: RowRunState
  now: number
  onGeneratePlan: (issueId: string) => void
}
```

渲染规则：

- 没有 active run：显示普通 `Action` 下拉。
- 有 active run：显示不可点击按钮 `Generating MM:SS`。
- 启动中但还没有真实 runId：显示 `Starting...`。

示例：

```text
Action
Generating 00:42
Generating 7:13
```

完成 notice：

```text
Generate Plan ready for nsdk / ENG-536 in 07:51.
```

如果最终 gate 不是 ready：

```text
Generate Plan finished with revise for nsdk / ENG-536 in 07:51.
```

失败 notice：

```text
Generate Plan failed for nsdk / ENG-536 after 02:10. See stderr.log: <path>
```

超时 notice：

```text
Generate Plan timed out for nsdk / ENG-536 after 20:00. See logs.
```

UI 默认只显示简短路径：

- 成功：不默认显示 refs 路径。
- 失败/超时：显示或可展开显示 `tmp/codex-runs/<run-id>/stderr.log`。
- refs 路径不放进本计划的主 notice。

## 后端 runner 小修

当前 runner 已经能写 `run.json`，但需要修正并保证几个字段稳定：

- 初次写入 `startedAt` 后，后续更新不要重新生成。
- `paths` 中包含 `stdoutPath`、`stderrPath`、`metadataPath`、`outputLastMessagePath`。
- 顶层返回和 metadata 中都要包含 `project`、`issueId`、`pid`、`timeoutAt`，方便恢复、超时和 notice。
- `outputLastMessagePath` 必须稳定写入 metadata，供状态 API 提取最终 gate 摘要。
- 子进程 `error` 和 `close` 都会最终写入 terminal status。
- terminal status 写入必须遵守优先级：`timed-out` 一旦写入，不允许后续 `close` 覆盖为成功或失败。
- 子进程启动后要注册 20 分钟 timeout timer；`close/error` 时清理 timer；timer、状态 API、active-run 检查共用同一个 timeout finalization helper，保证幂等。
- `startGenerateIssuePlanRun` 必须真正快速返回。实测用 CLI 直接调用 runner 时，父 `tsx` 进程会等到 Codex 子进程结束才退出，说明当前 stream/child lifecycle 对测试形态不够干净。本计划实现时要修正：
  - 创建 stdout/stderr write stream 后，不要让调用方等待子进程生命周期。
  - 子进程启动成功并写入 `running` metadata 后立即 resolve。
  - 子进程的 `close/error` 只通过事件异步更新 `run.json`。
  - 如有必要，抽出 `spawnCodexRun(...)`，让 server function 返回和子进程收尾完全解耦。
- `run.json` 写入应尽量原子化，避免轮询时读到半截 JSON。简单做法是先写 `run.json.tmp`，再 `rename` 成 `run.json`。
- `stderr.log` 实测会很大，ENG-536 一次 run 约 1.5MB。状态 API 绝不能读取或返回日志内容，只返回路径和少量 metadata。
- 增加 `timeoutAt` 或用 `startedAt + 20min` 计算超时。`run.json` 最终状态允许 `timed-out`。
- `run.json` 必须记录 pid，供 timeout finalization 使用。
- 增加启动锁 helper，例如 `withIssueRunStartLock(project, issueId, fn)`，避免 active-run check 的并发竞态。

如果前端需要更快得到启动结果，server function 可以继续返回当前启动结果，不等待子进程结束。

## cap1 worktree 更新策略

每次 `Generate Plan` 都应该基于最新远程 `staging` 生成计划。这个逻辑放在 `intentmill-ops cap1`，因为 cap1 负责准备 issue worktree，后续 cap2-cap6 都依赖它提供的代码上下文。

cap1 应补充为：

1. 在 `.workspace/<project-key>` 执行 `git fetch origin`。
2. 确保 base branch 是配置里的 `default_branch`，当前 `nsdk` 是 `staging`。
3. 如果 base worktree dirty，停止并报告，不自动覆盖。
4. 更新 base branch 到 `origin/<default_branch>`；建议使用 `git switch <default_branch>` 后 `git pull --ff-only origin <default_branch>`，或者等价的 `fetch + merge --ff-only`。
5. 创建或复用 `.workspace/<project-key>--<ISSUE-ID>`。
6. 进入 issue worktree 后先检查 dirty：
   - 如果 dirty 只包含当前 issue 的 `.t2p/tickets/<ISSUE-ID>/` planning artifacts，可以允许继续并由 cap7 刷新覆盖。
   - 如果有源码改动、其他 ticket 改动、未跟踪非当前 issue 文件，则停止并报告，避免覆盖人工工作。
7. 在 issue worktree 执行 `git fetch origin`。
8. 执行 `git rebase origin/<default_branch>`，让 issue branch 基于最新远程 default branch。
9. 如果 rebase 冲突，停止并报告，不自动解决。

不建议在 cap3-cap6 里做 pull/rebase，因为那会让生成过程中的代码上下文发生变化。更新必须发生在 cap1。

## 实测问题与修复项

基于 ENG-536 的一次真实 `Generate Plan` run：

- Run id: `20260607t192053090z-nsdk-eng-536-c0c33z`
- 结果: `succeeded`
- 耗时: 约 `7m51s`
- stderr log: 约 `1.5MB`
- 生成 artifacts: `im-req-engineered.md`, `im-req-summarized.md`, `im-ac.md`, `im-solution.md`, `im-estimation.md`, `im-gate.md`
- 最终 gate: `all / ready`

必须纳入本计划的修复：

1. **UI 不能只显示“已启动”**  
   真实 run 将近 8 分钟。行级 `Generating MM:SS` 和状态轮询是必要功能，不是锦上添花。

2. **runner 要快速返回**  
   CLI 直接调用 runner 时，父进程等到 Codex 结束才退出。虽然 Web server 场景可以拿到返回值，但实现上仍应把“启动 run”和“等待 run 结束”彻底解耦，避免 server action 被长任务生命周期拖住。

3. **日志不要直接进 UI**  
   Codex exec 的主要 transcript 写在 `stderr.log`，而且很大。本计划只展示日志路径。日志内容 UI 属于 plan5，必须做分页、tail 或摘要，不要一次性读取完整文件。

4. **提示词要禁止无意义探测命令**  
   实测 Codex 中途执行了一次无效 Python relative import 探测命令，失败但未改文件。应在 generated prompt 或 `intentmill-ops` 里补一句：不要执行无意义、占位、试探性命令；需要检查能力时读取真实文件或运行明确的项目命令。

5. **t2p 文件扫描要聚焦当前 issue**  
   实测 `.workspace/nsdk--ENG-536/.t2p` 下已有大量历史 ticket，宽泛 `find .t2p` 会产生日志噪声。cap2/cap7 的提示应要求只列当前 issue 路径，例如 `.t2p/tickets/<ISSUE-ID>/`，除非确实需要全局 t2p 索引。

6. **状态 notice 要包含最终 gate 和必要日志信息**  
   成功不只代表进程 exit 0。UI notice 应优先表达最终结果：
   - `Generate Plan ready for nsdk / ENG-536 in 07:51`
   - 如果无法识别最终 gate，则显示 `Generate Plan finished for nsdk / ENG-536 in 07:51`
   - 失败或超时时才显示 `Logs: tmp/codex-runs/<run-id>/stderr.log`
   - refs 路径不默认展示，artifact 入口属于 plan5

7. **失败态要区分启动失败和运行失败**  
   `failed-to-start` 是本机环境/命令问题；`failed` 是 Codex run 运行后失败。UI 可以都恢复 Action，但 notice 要写清楚不同类型，便于排查。

8. **重复生成要明确幂等边界**  
   再次点击同一个 issue 应该重新生成最新 artifacts，而不是创建第二个 worktree或混用旧 run 状态。当前 issue 的 `.t2p/tickets/<ISSUE-ID>/refs/im-*.md` 可以被覆盖；源码和其他 ticket 文件不应被覆盖。

9. **超时必须终止 UI 等待**  
   超时时间固定为 20 分钟。超过后 UI 恢复 Action，run 标为 `timed-out`，用户可以再次启动新 run。

10. **超时必须处理旧进程，不能只改 UI**  
    如果旧 Codex 进程还活着，只把 metadata 标成 `timed-out` 会导致下一次 run 和旧 run 同时写同一个 worktree。timeout finalization 必须尽力终止旧进程，并防止 late close 覆盖 `timed-out` 状态。

## 简洁架构原则

- `codex-runs/service.ts` 只负责 run 创建、prompt 写入、spawn、metadata 读写。
- `codex-runs/service.ts` 同时提供 `getCodexRunStatus` 和 `listActiveCodexRuns`，但不读取大日志内容。
- `codex-runs/service.ts` 内部提供启动锁、active-run 检查、timeout finalization、原子 metadata 写入这些通用 helper，避免 route 和 UI 复制状态规则。
- route 只负责调用 server function，不拼命令、不直接读文件系统细节。
- UI 只保存页面生命周期内的运行态，不把 workflow 状态塞进 issue row 数据。
- 每行显示逻辑封装在 `ActionMenu`，表格列定义不直接处理计时细节。
- 多 run 轮询由一个页面级 effect 管理，不让每个 row 自己起 interval。
- 页面刷新恢复也由页面级 effect 管理，基于当前 rows 的 issue ids 恢复，不做全局 run 历史展示。
