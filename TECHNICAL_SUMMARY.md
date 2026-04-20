# IELTS AI Tutor Platform — 技术总结

## 项目概述

一个面向雅思备考的纯前端自主学习管理平台，集成 AI 辅助功能，帮助用户规划每日学习、批改作业、管理学习资料。无需后端服务器，打开 `index.html` 即可运行。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 页面结构 | 原生 HTML5（语义化标签、模态框、拖拽属性） |
| 样式 | 原生 CSS3（CSS 变量、Flexbox、Grid、@keyframes 动画、响应式设计） |
| 逻辑 | 原生 JavaScript（ES2020，无框架，无构建工具） |
| 数据持久化 | Browser LocalStorage |
| AI 接口 | 智谱 AI（GLM-4 文本模型 / GLM-4V 多模态图像模型） |
| AI 备用接口 | Google Gemini Pro |
| 字体 | Newsreader（展示字体）+ DM Sans（正文字体）via Google Fonts |

---

## 核心功能模块

### 1. 每日课程系统（`CourseManager`）
- 按晨/午/晚三时段自动生成 8 节课
- 根据用户当前分数、目标分数、上课日自动调整难度和负荷
- 支持开始、跳过、完成三种状态流转
- 拖拽排课（`DragDropManager`）

### 2. AI 学习助手（`AIBase` / `PlannerAI` / `GradingAI` / `QualityAI`）
- **批改作业**：提交写作/口语练习，AI 给出详细 IELTS 评分反馈
- **AI 规划**：根据学情自动生成周学习计划
- **质量检测**（`QualityManager`）：检测当日课程安排合理性
- **AI 建议**（`AISuggestionsManager`）：推荐练习任务，可直接拖入课表
- 支持图片上传（试卷拍照识别，调用 GLM-4V）

### 3. 多轮对话管理（`ConversationManager`）
- 创建/切换/删除多个独立对话
- 对话历史持久化到 LocalStorage
- 支持图片消息

### 4. 学习进度追踪（`StreakManager`）
- 连续学习天数统计
- 听/说/读/写四项技能独立评分
- 可视化进度条

### 5. 资料库（`MaterialManager`）
- 按技能分类管理学习资料
- 1–5 星难度评级
- 支持自定义内容录入

### 6. 自定义课程（`CustomCourseManager`）
- 用户手动创建、编辑课程模板
- 绑定技能类型和时长

### 7. 周计划 + 笔记本（`WeeklyPlanManager` / `NotebookManager`）
- AI 生成或手动维护周学习计划
- Markdown 友好的笔记编辑器，支持多篇笔记切换

### 8. 日程管理（`ScheduleManager`）
- 按时间块可视化一天安排
- 支持块的创建、勾选完成、删除

---

## 架构设计

```
app.js (3800+ 行)
├── CONFIG          — API 配置常量
├── state           — 全局状态对象（单一数据源）
├── Storage         — LocalStorage 读写封装
├── AIBase          — AI 请求基础层（fetch + 错误处理 + 流式响应）
├── PlannerAI       — 规划类 AI prompt
├── GradingAI       — 批改类 AI prompt
├── QualityAI       — 质量检测类 AI prompt
├── CourseManager   — 课程生成与状态管理
├── ConversationManager — 多轮对话
├── MaterialManager — 资料库 CRUD
├── DragDropManager — 拖拽排课逻辑
├── AISuggestionsManager — AI 推荐任务
├── TaskManager     — 任务管理
├── QualityManager  — 课程质量评估
├── CustomCourseManager — 自定义课程
├── ScheduleManager — 时间块日程
├── StreakManager   — 连续学习统计
├── WeeklyPlanManager — 周计划
├── NotebookManager — 笔记本
└── UI              — 路由、模态框、导航、事件绑定
```

**模式**：模块化对象字面量（Module Object Pattern），每个模块职责单一，通过共享 `state` 和 `Storage` 通信，无需引入框架。

---

## 我做了什么

1. **设计并实现完整的单页应用架构**，用原生 JS 实现了路由切换、模态框系统、全局状态管理，不依赖任何框架。

2. **封装 AI 调用层**，统一处理鉴权、错误回退（API 不可用时自动降级为 Demo 模式）、流式/非流式响应，并为规划、批改、质量检测三种场景分别设计 prompt。

3. **实现拖拽排课功能**，原生 HTML5 Drag and Drop API，课程卡片与时间段之间的拖拽交互。

4. **设计课程自动生成算法**，综合用户当前分数、目标分数、上课日、时段偏好动态生成每日 8 节课，区分四项技能权重。

5. **构建完整的数据持久化方案**，所有用户数据（设置、对话历史、资料库、笔记、进度）通过统一的 `Storage` 模块存储到 LocalStorage，页面刷新后完整恢复状态。

6. **设计视觉系统**，自定义 CSS 变量体系（颜色、字体、间距统一管理），实现卡片悬停、页面切换、模态框出入等过渡动画，响应式适配桌面和移动端。

7. **API Key 安全处理**：移除所有硬编码密钥，改为用户在设置页面自行输入并存储于本地浏览器，代码仓库中无任何敏感凭证。

---

## API Key 安全说明

| 方案 | 安全级别 | 说明 |
|------|----------|------|
| 硬编码在源码中 | ❌ 危险 | 任何人克隆仓库即可获取 |
| 用户输入存 LocalStorage（当前方案） | ✅ 仓库安全 | key 不进入代码，但本机浏览器 DevTools 可见 |
| 后端代理服务器 | ✅✅ 最安全 | key 仅在服务器端，前端完全无感知 |

当前方案已确保 **GitHub 仓库中不含任何 API Key**。如需彻底杜绝客户端泄露，需引入后端代理层。

---

*项目地址：https://github.com/foogooooooo/IELTS-AI-Tutor-Platform*
