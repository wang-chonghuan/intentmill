我建议这样拆：**`n-ticketer` 管 Linear 里的 issue 形态；`imops` 只管单个 `tech-issue` 从本地规划到开发完毕、单元测试完毕。后续验收、review、PR、RG 交给 `n-autoqa` 和 `t2p`。**

当前状态：**已按最新设计更新。`n-ticketer` ticket shaping 层已完成；`imops` 目前只完成 cap1/cap2，后续开发流仍是待实现设计。**

**放在 `n-ticketer` 的能力**
这些都发生在 Linear 里，应该由 `n-ticketer` 负责。当前已完成：

1. **Create user-story** - 已完成
   - 创建 PM-authored user-story。
   - user-story 只填 `Requirement`。
   - 不参考 evodocs。
   - 不写 AC、Solution、Meta、estimate。

2. **Create req-only tech-issue** - 已完成
   - 创建真正可执行的 `tech-issue`。
   - 只写 `Requirement`。
   - 必须参考 `.evodocs` 和必要代码，让 req 自包含。
   - 不生成 spec/plan/ac/solution/meta/estimate。
   - 使用 cap2 gate 检查 tech-issue 是否 req-only、自包含、可交付、无 solution 泄漏。

3. **Create parent-ticket** - 已完成
   - 创建最小 grouping parent。
   - parent 只保留 story pointer / grouping purpose。
   - parent-child 只表示 grouping，不表示执行顺序。
   - 不写 AC、Solution、Meta、estimate。

4. **Group to parent** - 已完成
   - 用 Linear `issueUpdate(parentId)` 把 tech issues 挂到 parent。
   - 不用 `relatedTo`、`blocks`、`blockedBy` 表示 grouping。
   - 不重写 child Requirement，除非用户明确要求。

5. **Normalize** - 已完成
   - 将已有 Linear issue 规范化为 user-story / parent-ticket / req-only tech-issue。
   - tech-issue normalise 必须复用 cap2，并通过 gate。
   - 移除或清空 AC、Solution、Meta、estimate、spec、plan、test plan。

6. **Direct Linear API transport** - 已完成
   - `n-ticketer` 使用 direct Linear GraphQL API。
   - 不使用 Linear MCP。
   - 统一 API helper: `scripts/linear-api.mjs`。
   - 统一 API 说明: `references/common/linear-api-methods.md`。
   - 统一操作 playbook: `references/common/api-operation-playbook.md`。

**放在 `imops` 的 cap**
当前已有并完成：

1. `cap1` - initialise issue worktree - 已完成
2. `cap2` - initialise t2p ticket context - 已完成

后续建议这样接，当前尚未落地：

3. **cap3 - Generate Initial Spec And Plan** - 待实现
   - 输入：tech-issue requirement + evodocs + docs + code。
   - 输出：
     - `im-spec.md`
     - `im-plan.md`
   - 这是初版，不问人也能先生成。

4. **cap4 - Detect Grill-Me Requirement** - 待实现
   - 检查初版 spec/plan 是否触发 grillme。
   - 触发条件：DB/schema、UI、prompt、state machine、external API、acceptance-impacting ambiguity。
   - 输出可以是：
     - `im-grill-needed.md`
   - 或直接在状态里返回 `required | not-required`。

5. **cap5 - Generate Grill Questions** - 待实现
   - 只在 cap4 判定 required 时运行。
   - 输出：
     - `im-grill-questions.md`
   - 问题要带推荐答案，但不替用户做决定。

6. **cap6 - Apply Grill Answers** - 待实现
   - 输入：
     - `im-grill-answers.md`
   - 覆盖重写：
     - `im-spec.md`
     - `im-plan.md`
   - 不 append，不 patch note，直接生成最终版。

7. **cap7 - Generate Unit Test Plan** - 待实现
   - 输入最终：
     - `im-spec.md`
     - `im-plan.md`
     - `im-grill-answers.md` 如果有
   - 输出：
     - `.t2p/tickets/<ticket-id>/tests` 下的单元测试计划或测试文件骨架。
   - 目标是保障开发过程中的关键环节执行正确。
   - 不生成 AutoQA ac-cases；验收用例交给 `n-autoqa`。

8. **cap8 - Prepare Goal Execution Context** - 待实现
   - 检查开发前置条件：
     - `AGENTS.md`
     - `im-spec.md`
     - `im-plan.md`
     - 单元测试计划或测试文件骨架
   - 输出一个给 goal 使用的入口说明，比如 `im-goal.md`。
   - 这个 cap 不执行后续验收，也不跑 t2p-review，只准备开发执行上下文。

9. **cap9 - Develop From Spec And Plan** - 待实现
   - 根据 `im-spec.md` 和 `im-plan.md` 进行开发。
   - 开发过程中必须遵守：
     - `AGENTS.md`
   - 必须补齐并运行 `.t2p/tickets/<ticket-id>/tests` 下的单元测试。
   - 如果开发过程中发现新的 UI、DB/schema、prompt、state machine、external API 或 acceptance-impacting 决策缺口，必须停止开发并回到 grill 流程，不允许 AI 自己发明。
   - 输出状态是：代码开发完毕，单元测试完毕。

10. **cap10 - Development Quality Gate** - 待实现
   - 检查 IntentMill 开发阶段是否完成：
     - 代码是否按 `im-spec.md` 实现。
     - 实现是否遵守 `im-plan.md`，或是否记录了合理偏差。
     - 单元测试是否存在并通过。
     - 没有在开发中发明未经过 grill 的产品/架构决策。
   - 这个 gate 只覆盖开发和单元测试完成度。
   - 不检查 AutoQA ac-cases。
   - 不处理 t2p-review。
   - 不生成 PR。

11. **cap11 - Full Development Flow** - 待实现
   - 编排：
     - cap1
     - cap2
     - cap3
     - cap4
     - 如果需要 grill：cap5，等待 answers，cap6
     - cap7
     - cap8
     - cap9
     - cap10
   - 停在“代码开发完毕、单元测试完毕”的状态。

**明确不放在 `imops` 的能力**

这些交给 `n-autoqa` 和 `t2p`，`imops` 不管：

- 根据 `im-ac.md` 生成 AutoQA ac-cases。
- 执行 AutoQA acceptance cases。
- t2p-review。
- t2p-review 后因为代码修改而重新跑 ac-cases。
- 生成 PR。
- 人工审核。
- 根据 ac-cases 往 rg-cases 添加 RG。

**关于 `im-ac.md`**

如果保留 `im-ac.md`，它更应该由 `n-autoqa` 或 AutoQA 前置能力负责生成/消费，而不是 `imops`。

`imops` 可以在开发完成后留下足够的 spec、plan、代码和单元测试上下文，让 `n-autoqa` 接手生成验收用例。

核心边界一句话：

`n-ticketer` 负责把产品意图变成正确的 `tech-issue` 图；`imops` 负责把单个 `tech-issue` 开发完并跑完单元测试；`n-autoqa` 和 `t2p` 负责后续验收、review、PR 前后的质量流程。
