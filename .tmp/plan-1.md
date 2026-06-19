现在必须思考intentmill的工件
首先原始输入有两种，一是pm输入的user-story，二是dm输入的tech-issue
user-story不能独立成一个工单，所有工单必须被转成tech-issue
因为tech-issue就是最小交付单元

tech-issue在创建时，只有req部分，tech-issue的创建必须经过evodocs的参与，这样能清晰描述需求.
人工负责把一个user-story拆分成多个独立的tech-issue，并group到一个parent issue里管理，这一步人工完成
====im开始
tech-issue作为intentmill的输入

im会先生成spec和plan，作为初版。 im-spec.md, im-plan.md
然后如果里面有触发了grillme的条件，则必须经过grillme，否则可以直接开发

如果触发了grillme的条件，则进入问答环节，生成一个文件，名字叫 im-grill-questions.md
用户拿到后，开始填写，填写完成，生成 im-grill-answers.md

AI根据 im-grill-answers.md重新生成 im-spec.md和im-plan.md，覆盖掉之前的。
然后再生成im-ac.md

然后用一个goal，根据im-spec.md和im-plan.md进行开发。
开发过程中要遵守 AGENTS.md的要求，遵守 .evodocs/constitution.md的要求，要使用autoqa.md生成相关的ac-cases（根据 im-ac.md），以及在 .t2p/tickets/<ticket-id>/tests 目录下生成单元测试，前者确保工单最终通过验收，后者确保开发过程中的环节执行正确。

intentmill开发完毕。
====im结束
进入t2p-review，t2p-review过程中导致的代码修改，必须重新跑ac-cases。

生成pr

人工审核，然后根据ac-cases，往 rg-cases里添加一些rg
===================================================== 这是我的整体设想，就是 n-ticketer, intentmill, n-grill 这一系列东西按这个方式连接起来，你可以先把这个方案写到  .tmp 的目录下的   plan-1.md文件中

===================================================== 当前状态

已按最新设计更新：

1. Linear ticket 形态层由 `n-ticketer` 负责。
2. `n-ticketer` 已完成：
   - 创建 user-story。
   - 创建 req-only tech-issue。
   - 创建 parent-ticket。
   - group to parent。
   - normalize。
   - 使用 direct Linear GraphQL API，不使用 MCP。
   - tech-issue 创建前必须参考 `.evodocs`。
   - tech-issue 只填 `Requirement`，不生成 Meta、estimate、Solution、Acceptance criteria。
   - cap2 已有 gate，检查 tech-issue 是否 req-only、自包含、可交付。
3. `imops` 已完成入口两步：
   - cap1 初始化 issue worktree。
   - cap2 初始化或刷新 `.t2p/tickets/<ticket-id>/` ticket context。
4. `imops` 后续 spec/plan/grill/develop/unit-test 流程尚未落地。
