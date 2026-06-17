这是最新收敛后的 `imops` 最小 capability 规划。

核心链路：

`tech-issue -> init worktree -> init ticket context -> create draft -> draft-grill-loop -> finalize spec/plan -> dev/unit-test finish`

`imops` 停在“代码完成 + 单元测试完成”。后续 AutoQA、t2p-review、PR、人工审核、RG 仍交给 `n-autoqa` 和 `t2p`。

## cap-gate-loop 策略

按 `n-toaskill` 的 cap-gate-loop 模式，只有复杂语义产物、下游工作流输入、外部写入或容易“看起来合理但实际错误”的能力需要 gate。

本规划中：

- cap3 `create-draft`：需要 `gate-3-create-draft`。
- cap4 `draft-grill-loop`：不使用普通 cap-gate-loop；它本身就是 loop，需要内置 completion check。
- cap5 `finalize-spec-plan`：必须需要 `gate-5-finalize-spec-plan`。
- cap6 `dev-unit-test`：需要 `gate-6-dev-unit-test`，作为开发完成质量门。

## cap1 `init-worktree`

准备 issue worktree。

职责：

- 解析 `project` 和 `issue-id`。
- 更新项目 base clone。
- 创建或复用 `.workspace/<project>--<ISSUE-ID>`。
- 确保后续所有 issue-specific 操作都在 issue worktree 中运行。

产物：

- issue worktree path。
- worktree ready / blocked 状态。

## cap2 `init-ticket-context`

初始化或刷新 ticket context。

职责：

- 在 issue worktree 中运行。
- 使用项目自己的 `t2p` skill。
- 初始化或刷新 `.t2p/tickets/<ISSUE-ID>/`。
- 拿到 tech-issue requirement 作为 `imops` 的输入。

产物：

- `.t2p/tickets/<ISSUE-ID>/`。
- tech-issue requirement context。

## cap3 `create-draft`

创建粗糙但经过代码调查的 draft。

职责：

- 读取 tech-issue requirement。
- 读取 `.evodocs`。
- 调查相关代码。
- 形成初步理解和粗略改造方向。
- 找出需要 grill 的风险和决策点。

产物：

- `im-draft.md`

`im-draft.md` 应包含：

- draft spec：当前理解的“要什么”。
- draft plan：粗略改造方向，不是最终执行计划。
- code/evodocs findings：影响需求理解和改造边界的事实。
- assumptions：当前假设。
- risks：主要风险。
- grill decision points：需要用户确认的问题。

注意：

- `im-draft.md` 是草稿，不是最终需求合同。
- draft plan 可以写“看起来可能要改哪里”，但不能作为最终执行依据。

### gate-3 `create-draft`

需要 gate。

原因：

- `im-draft.md` 是复杂语义产物。
- 它会喂给 cap4 grill。
- 它很容易把实现猜测写成已确认需求。

gate 检查：

- 是否真的读取了 tech-issue requirement。
- 是否读取了 `.evodocs`。
- 是否调查了相关代码。
- draft spec 和 draft plan 是否明确标记为 draft。
- 是否识别了需要 grill 的决策点。
- 是否把实现猜测误写成已确认需求。
- 是否遗漏明显的 UI、DB/schema、prompt、state machine、external API、新依赖、新服务或 scope 风险。

gate 失败处理：

- 如果可以不问用户修复，带着 gate findings 重新运行 cap3。
- 如果缺失来自用户意图不清，停止并把问题交给 cap4。

## cap4 `draft-grill-loop`

围绕 `im-draft.md` 循环 grill 用户，直到决策完整。

职责：

- 基于 `im-draft.md` 向用户提出问题。
- 每次只推进当前最高价值的未决问题。
- 每轮用户回答后，更新 `im-grill.md` 和 `im-draft.md`。
- 如果回答引出新的 UI、DB/schema、prompt、state machine、external API、新依赖、新服务或 scope 决策，继续 grill。
- 直到没有阻塞性未决决策。

每轮更新：

- `im-grill.md`
  - 问了什么。
  - 用户怎么答。
  - 确认了什么决策。
  - 拒绝了什么选项。
  - 还剩什么未决问题。
- `im-draft.md`
  - 合并已确认决策。
  - 标记被推翻的旧假设。
  - 加入新暴露的风险和依赖。
  - 更新下一轮需要 grill 的问题。

完成条件：

- `im-grill.md` 明确记录 confirmed decisions。
- `im-grill.md` 明确记录 rejected options。
- `im-grill.md` 明确记录没有 blocking unresolved decisions。

注意：

- cap4 不生成 `im-spec.md`。
- cap4 不生成 `im-plan.md`。
- final artifacts 只能在 grill loop 完成后生成。

### cap4 completion check

cap4 不使用普通 cap-gate-loop，因为 cap4 自己就是 loop。

每轮回答后都必须检查：

- `im-grill.md` 是否记录了本轮问题和用户回答。
- `im-grill.md` 是否更新了 confirmed decisions。
- `im-grill.md` 是否更新了 rejected options。
- `im-grill.md` 是否记录了 remaining unresolved decisions。
- `im-draft.md` 是否同步了用户已确认决策。
- 用户回答是否引出了新的 UI、DB/schema、prompt、state machine、external API、新依赖、新服务或 scope 决策。

cap4 只有在没有 blocking unresolved decisions 时才完成。

## cap5 `finalize-spec-plan`

基于已完成的 draft/grill 生成最终 spec 和 plan。

输入：

- tech-issue requirement。
- final `im-draft.md`。
- `im-grill.md`。
- `.evodocs` 和相关代码事实。

产物：

- `im-spec.md`
- `im-plan.md`

`im-spec.md` 规则：

- 只写确认后的“要什么”。
- 包含已确认需求、范围、非范围、约束、兼容性要求和人工决策。
- 不写实现步骤。
- 不保留未决 grill 问题。

`im-plan.md` 规则：

- 只写怎么实现和怎么测试。
- 只能服务 `im-spec.md`。
- 不新增需求。
- 不扩大 scope。
- 如果发现 `im-spec.md` 仍有缺口，停止并回到 cap4。

完成检查：

- `im-spec.md` 和 `im-plan.md` 无矛盾。
- `im-plan.md` 没有新增 `im-spec.md` 中不存在的需求。
- `im-spec.md` 没有未决阻塞问题。

### gate-5 `finalize-spec-plan`

必须需要 gate。

原因：

- cap5 产出最终 `im-spec.md` 和 `im-plan.md`。
- 这两个文件会直接喂给开发。
- 这里最容易发生 spec/plan 边界污染。

gate 检查：

- `im-spec.md` 只写“要什么”。
- `im-spec.md` 不包含实现步骤。
- `im-spec.md` 不保留未决 grill 问题。
- `im-plan.md` 只写“怎么实现”和“怎么测试”。
- `im-plan.md` 没有新增 `im-spec.md` 中不存在的需求。
- `im-plan.md` 没有扩大 scope。
- `im-spec.md` 和 `im-plan.md` 互相不矛盾。
- `im-spec.md` 已吸收 `im-grill.md` 中所有 confirmed decisions。
- `im-plan.md` 没有把 rejected options 重新带回来。

gate 失败处理：

- 如果是文档边界、遗漏或矛盾问题，带着 gate findings 重新运行 cap5。
- 如果发现仍有 blocking unresolved decisions，停止并回到 cap4。

## cap6 `dev-unit-test`

根据 final spec/plan 开发并完成单元测试。

职责：

- 读取 `AGENTS.md`。
- 读取 `.autoqa/rules.md`，如果存在。
- 根据 `im-spec.md` 和 `im-plan.md` 开发。
- 补齐并运行 `.t2p/tickets/<ISSUE-ID>/tests` 下的单元测试。
- 记录执行结果。

停止并回到 cap4 的条件：

- 开发中发现新的 UI 决策缺口。
- 开发中发现新的 DB/schema 决策缺口。
- 开发中发现新的 prompt 决策缺口。
- 开发中发现新的 state machine 决策缺口。
- 开发中发现新的 external API 决策缺口。
- 开发中发现新的依赖或服务边界决策缺口。
- 开发中发现 `im-spec.md` 和代码事实不一致，且无法在 plan 内解决。

完成状态：

- 代码完成。
- 单元测试完成并通过，或失败原因明确记录。
- 未遗留需要 AI 自行发明的产品/架构决策。

### gate-6 `dev-unit-test`

需要 gate，但它是开发完成质量门，不是普通文档审查。

gate 检查：

- 代码是否符合 `im-spec.md`。
- 实现是否遵守 `im-plan.md`，或是否记录了合理偏差。
- 单元测试是否存在。
- 单元测试是否运行。
- 单元测试是否通过，或失败原因是否明确且不是未完成实现。
- 是否发现新的 UI、DB/schema、prompt、state machine、external API、新依赖、新服务或 scope 决策缺口。
- 是否有需要回到 cap4 的新问题。

gate 失败处理：

- 如果是实现或测试缺口，继续 cap6 修复。
- 如果是新决策缺口，停止 cap6，回到 cap4。
- 如果是 spec/plan 不一致，停止 cap6，回到 cap5；必要时再回到 cap4。

## cap7 `full-flow`

编排完整 `imops` 开发流。

顺序：

1. cap1 `init-worktree`
2. cap2 `init-ticket-context`
3. cap3 `create-draft`
4. cap4 `draft-grill-loop`
5. cap5 `finalize-spec-plan`
6. cap6 `dev-unit-test`

边界：

- 不生成 AutoQA ac-cases。
- 不执行 AutoQA。
- 不执行 t2p-review。
- 不生成 PR。
- 不做人工审核。
- 不添加 RG cases。

最终停点：

- 代码开发完毕。
- 单元测试完毕。
