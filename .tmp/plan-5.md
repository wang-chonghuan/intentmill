# 如何优化

## Findings

1. Blocker: im-plan.md 对 AGL 状态机约束不够，实施自由度太大。
   .workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/refs/im-spec.md:35 要求保留本地交易分析控制，但 .workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/refs/im-plan.md:26 只写 "OpenAI Agents SDK runner / controlled tools / structured final output"。这可能让实现者直接用 structured output 绕过当前 get_csv_profile -> run_python_analysis -> validate_output_schema -> submit_output 的状态机、saw_python_analysis gate、turn cap、trace、retry/repair 和 AglSchemaRetryExhaustedError 映射。
   建议：spec 补硬性 AGL loop contract；plan 明确必保留的状态变量、工具顺序、失败路径和异常映射。

2. Blocker: reasoning_effort=medium 在 plan 里被弱化成可选。
   需求要求 Azure GPT-5.5 medium；grill D5 也已确认。但 .workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/refs/im-plan.md:23 写 "where supported by the pinned OpenAI Agents SDK"，给了实现时跳过 medium 的空间。
   建议：改成必须传递 reasoning_effort: medium；如果 pinned SDK/API 无法表达，应阻断并记录，不允许静默省略或降级。

3. Plan 对 shared agent_sdk_lib 现有消费者保护不足。
   spec 有"不迁移 unrelated consumers"的边界，但 plan 修改 shared wrapper 时没有明确保护现有 run_agent、web-search tool、Money Action 等调用者。
   建议：plan Phase 2 增加 shared-wrapper regression 要求，确保新增 azure_settings_path/reasoning_effort 不破坏现有消费者。

4. 测试计划缺少高风险断言。
   当前 Unit Test Plan 覆盖了主线，但还应加：

- reasoning_effort 实际进入 ModelSettings / RunConfig 或等价 SDK 配置
- AGL 私有交易分析流不注册 web search
- trace metadata 不包含交易明细或 CSV 内容
- schema invalid 到 turn cap 后仍抛 AglSchemaRetryExhaustedError
- S06 repair/partial-success 语义不变
- shared agent_sdk_lib 既有调用者不回归

5. 非阻断：draft provenance 已过时。
   .workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/refs/im-draft.md:7 还写读过 .t2p/rules.md，但当前规则已改为 .evodocs/constitution.md，且 worktree 里 .t2p/rules.md 已删除。这个不影响 spec/plan 主体，但 artifact provenance 应该修正，否则后续审计会困惑。

## 结论

im-spec.md 基本覆盖 req/draft/grill 的主强约束，但建议补一条更硬的 AGL loop contract。im-plan.md 目前不够安全，尤其 AGL 状态机和 reasoning_effort 两处会导致实施偏移。我的建议是先收紧 spec/plan，再进入 cap6。

## 为什么生成和 gate5 没看出来

核心原因：cap5 是生成流程，gate5 是结构门禁，但这次缺陷属于"实施偏移风险"的语义门禁。当前 gate5 没有要求做这种审查。

具体说：

1. cap5 把强约束压缩得太抽象了。
   draft 里其实已经有"本地 Python 分析、schema validation、quality checks、trace、failure semantics"等信息，但 cap5 生成 plan 时压成了 "controlled tools / structured final output"。这个抽象在阅读上像是覆盖了要求，但对 cap6 实施者来说自由度太大。

2. gate5 检查的是 artifact 完整性，不是"能否防止误实现"。
   它现在能检查：grill 是否 completed、有没有 TBD、spec/plan section 是否齐、决策是否反映、有没有 forbidden scope。
   但它没有问：
   "一个开发者照这个 plan 写，会不会绕过现有状态机？"
   "有没有把关键运行时 invariant 写成必须保留的约束？"
   "有没有把不确定 SDK 能力误写成可选实现？"

3. 生成时缺少 adversarial review 视角。
   subagent 能看出来，是因为它被要求"独立审核 spec/plan 是否足够实施、是否自由度太大"。这个问题会自然触发反向推理：
   "哪里可能被实现者误解？"
   "哪里可能让 cap6 走捷径？"
   "哪些旧系统行为必须一一保留？"
   cap5 当前没有内置这个审查动作。

4. AGL 状态机是代码行为 invariant，不是普通需求文字。
   这类约束不会总是显式出现在 req.md 里，也不一定会通过 grill 变成用户决策。它来自现有代码合同：工具顺序、状态 flag、turn cap、retry/repair、异常映射。
   cap5 现在更擅长整理"需求/决策"，不够擅长把"现有代码合同"提升为 spec/plan 的硬约束。

5. reasoning_effort 的问题来自不确定性处理错误。
   生成时遇到 SDK 能力不确定，写成了 "where supported"。这在普通计划里像是谨慎，但这里实际弱化了需求。正确逻辑应该是：用户已确认 GPT-5.5 medium，那么无法表达 medium 就是 blocker/handoff issue，不能静默降级。

6. gate5 没有测试计划质量门禁。
   它检查有测试计划，但没检查是否覆盖最高风险断言。所以 reasoning_effort 是否真正传入、AGL 是否禁用 web search、trace 是否泄露 CSV、异常映射是否保持，这些都没有被 gate 拦住。

所以不是 subagent 更"聪明"，而是它运行的是另一个任务：review for implementation drift。cap5/gate5 当前没有强制执行这个任务。

应该改的方向是：给 cap5/gate5 增加一个明确检查：
Implementation Drift Review / Semantic Sufficiency Review。
要求 gate5 在通过前必须验证：

- spec 是否把现有关键代码合同提升为硬性要求；
- plan 是否足够约束 cap6，不允许绕过状态机或安全边界；
- 所有 "where supported / likely / may / optionally" 是否弱化了已确认需求；
- shared wrapper 改动是否有现有消费者回归保护；
- 测试计划是否覆盖最高风险行为，而不只是主线 happy path。
