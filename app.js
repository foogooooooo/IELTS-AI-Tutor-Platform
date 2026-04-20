// ===== Configuration =====
const CONFIG = {
    // 智谱AI配置
    zhipuApiKey: '',  // 请在设置页面输入你的智谱AI API Key
    zhipuApiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    zhipuModel: 'glm-4',  // 文本模型
    zhipuVisionModel: 'glm-4v',  // 支持图片的模型
    
    // 保留Gemini配置作为备用
    geminiApiKey: '',  // 请在设置页面输入你的 Gemini API Key
    geminiApiUrl: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent'
};

// ===== State Management =====
const state = {
    user: null,
    currentView: 'planner',  // 默认显示学习计划视图
    courses: [],
    conversations: [],
    materials: [],
    currentConversation: null,
    
    // 任务系统：区分课程和任务
    tasks: {
        daily: [],      // 每日任务（独立于课程）
        custom: [],     // 自定义任务
        completed: []   // 已完成任务
    },
    
    settings: {
        currentLevel: 4.0,
        targetScore: 6.5,
        classDays: [1, 3, 5],
        apiKey: CONFIG.zhipuApiKey
    },
    
    progress: {
        studyDays: 1,
        totalCompletedCourses: 0,
        longestStreak: 1,
        currentStreak: 1,
        totalStudyTime: 0,
        dailyStudyTime: 0,
        efficiencyScore: 0,
        skills: {
            listening: 4.0,
            reading: 4.0,
            writing: 4.0,
            speaking: 4.0
        },
        dailyStats: {
            date: null,
            completedTasks: 0,
            totalTasks: 0,
            averageTimePerTask: 0,
            accuracyRate: 0
        },
        history: []
    },
    
    // AI模块状态记录
    aiStatus: {
        planner: { lastPlanDate: null, contextResetCount: 0 },
        quality: { lastCheckDate: null, contextResetCount: 0 },
        grader: { lastGradeDate: null, contextResetCount: 0 }
    },
    
    // 效率数据
    efficiency: {
        dailyScore: 0,
        weeklyTrend: [],
        improvementAreas: [],
        lastQualityCheck: null
    }
};

// ===== Local Storage Helper =====
const Storage = {
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Storage save error:', e);
        }
    },
    
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage load error:', e);
            return defaultValue;
        }
    },
    
    remove(key) {
        localStorage.removeItem(key);
    }
};

// ===== AI Base Class =====
const AIBase = {
    async generateContent(prompt, context = null, options = {}) {
        const apiKey = state.settings.apiKey || CONFIG.zhipuApiKey;
        const model = options.useVision ? CONFIG.zhipuVisionModel : CONFIG.zhipuModel;
        
        try {
            // Build messages array
            const messages = [];
            
            // Add system context if provided
            if (context) {
                messages.push({
                    role: 'system',
                    content: `上下文信息：\n${JSON.stringify(context, null, 2)}`
                });
            }
            
            // Add user message
            if (options.imageData) {
                // For image input, use GLM-4V format
                messages.push({
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: options.imageData
                            }
                        },
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
                });
            } else {
                messages.push({
                    role: 'user',
                    content: prompt
                });
            }
            
            const response = await fetch(CONFIG.zhipuApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }
            
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('AI generation error:', error);
            // Fallback to mock response for demo
            if (options.fallbackEnabled !== false) {
                console.warn('Using fallback response due to API error');
                return this.getFallbackResponse(prompt);
            }
            throw error;
        }
    },
    
    getFallbackResponse(prompt) {
        // Fallback responses for demo mode when API fails
        if (prompt.includes('雅思学习规划师') || prompt.includes('生成今天的8节课程')) {
            return JSON.stringify([
                {
                    emoji: "🎧",
                    title: "听力 - Section 1 训练",
                    goal: "掌握个人信息类题型",
                    duration: 30,
                    difficulty: 2,
                    tasks: ["听示范对话", "完成练习题", "复习错题"]
                },
                {
                    emoji: "📖",
                    title: "阅读 - 略读练习",
                    goal: "提高快速理解文章大意的能力",
                    duration: 40,
                    difficulty: 2,
                    tasks: ["阅读2-3篇文章", "练习略读技巧", "回答问题"]
                },
                {
                    emoji: "📝",
                    title: "词汇积累",
                    goal: "记忆30个学术类词汇",
                    duration: 25,
                    difficulty: 2,
                    tasks: ["学习新词汇", "完成词汇测试", "造句练习"]
                }
            ]);
        }
        
        if (prompt.includes('学习效率质检员')) {
            return JSON.stringify({
                score: 78,
                strengths: ["学习时间充足", "任务完成率良好", "坚持每日学习"],
                improvements: ["需要提高学习效率", "建议更系统化的复习"],
                recommendations: ["每天固定时间学习", "定期复习错题", "制定周学习计划"]
            });
        }
        
        if (prompt.includes('雅思考官') && prompt.includes('批改')) {
            return JSON.stringify({
                score: 6.5,
                strengths: ["内容完整", "表达清晰", "结构合理"],
                improvements: ["需要更多细节", "语法需要改进"],
                suggestions: ["多阅读范文", "练习语法结构", "增加词汇量"],
                recommendedPractice: ["完成一篇类似主题的写作", "复习相关语法点"]
            });
        }
        
        if (prompt.includes('图片') || prompt.includes('阅读材料')) {
            return JSON.stringify({
                materialAnalysis: "这是一篇典型的雅思阅读材料，涉及学术话题。文章结构清晰，包含多个段落，每个段落都有明确的主题句。",
                commonQuestions: ["主旨大意题 - 考查对文章整体理解", "细节理解题 - 考查具体信息定位", "词汇推理题 - 考查上下文猜词能力"],
                readingTips: ["先快速浏览全文，把握文章结构", "注意段落首句和转折词", "标记关键词和人名地名"],
                practiceRecommendations: ["完成类似主题的阅读练习", "计时阅读训练，提高速度", "做错题分析，总结规律"]
            });
        }
        
        // Default fallback
        return "我理解你的问题。作为雅思学习助手，我建议你制定系统的学习计划，每天坚持练习听说读写四项技能。如果有具体的作业需要批改，请直接提交，我会给出详细的反馈建议。";
    }
};

// ===== Planner AI (规划AI) =====
const PlannerAI = {
    context: null, // 独立上下文，避免污染
    
    resetContext() {
        this.context = {
            lastPlanDate: null,
            userPreferences: {},
            learningHistory: [],
            currentFocus: null
        };
    },
    
    async generateDailyPlan(day, currentLevel, targetScore, isClassDay, learningHistory = []) {
        // 重置上下文，避免被历史对话影响
        this.resetContext();
        
        this.context = {
            lastPlanDate: new Date().toISOString(),
            userLevel: currentLevel,
            targetScore: targetScore,
            isClassDay: isClassDay,
            learningHistory: learningHistory.slice(-10), // 只保留最近10条记录
            focusAreas: this.identifyFocusAreas(learningHistory)
        };
        
        const prompt = `你是一个专业的雅思学习规划师。今天是学习的第${day}天${isClassDay ? '（今天有课，建议轻量学习）' : ''}。

学生信息：
- 当前水平：${currentLevel}分
- 目标分数：${targetScore}分
- 近期学习重点：${this.context.focusAreas.length > 0 ? this.context.focusAreas.join('、') : '无特殊重点'}

请生成今天的8节课程（上午3节、下午3节、晚上2节）。每节课应该包括：
1. 类型emoji（🎧听力/📖阅读/✍️写作/🗣️口语）
2. 标题（简短）
3. 学习目标（一句话说明）
4. 预计时长（分钟）
5. 难度（1-5星，基于学生当前水平）
6. 任务内容（概括性的，不指定具体材料）

${isClassDay ? '注意：今天有课，总学习时间控制在3-4小时。' : '总学习时间6小时左右。'}

请基于学生的学习历史进行个性化调整，不要重复近期已学内容。

请用JSON数组格式返回，格式如下：
[
  {
    "emoji": "🎧",
    "title": "听力 - Section 1 训练",
    "goal": "掌握个人信息类题型",
    "duration": 30,
    "difficulty": 2,
    "tasks": ["听示范对话", "完成5-10道练习题", "复习错题"]
  },
  ...
]

只返回JSON数组，不要其他文字。`;

        try {
            const response = await AIBase.generateContent(prompt, this.context);
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const courses = JSON.parse(jsonMatch[0]);
                // 更新上下文记录
                this.context.generatedCourses = courses;
                return courses;
            }
            throw new Error('Failed to parse AI response');
        } catch (error) {
            console.error('Plan generation error:', error);
            return this.getFallbackCourses(isClassDay);
        }
    },
    
    identifyFocusAreas(learningHistory) {
        if (!learningHistory || learningHistory.length === 0) return [];
        
        // 简单分析：找出最常出现的课程类型
        const typeCount = {};
        learningHistory.forEach(item => {
            if (item.type) {
                typeCount[item.type] = (typeCount[item.type] || 0) + 1;
            }
        });
        
        // 返回出现次数最多的类型
        const sorted = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
        return sorted.slice(0, 2).map(([type]) => type);
    },
    
    getFallbackCourses(isClassDay) {
        // 使用之前定义的备用课程
        const morningCourses = [
            {
                emoji: "🎧",
                title: "听力 - Section 1 训练",
                goal: "掌握个人信息类题型",
                duration: 30,
                difficulty: 2,
                tasks: ["听示范对话", "完成练习题", "复习错题"]
            },
            {
                emoji: "📖",
                title: "阅读 - 略读练习",
                goal: "提高快速理解文章大意的能力",
                duration: 40,
                difficulty: 2,
                tasks: ["阅读2-3篇文章", "练习略读技巧", "回答问题"]
            },
            {
                emoji: "📝",
                title: "词汇积累",
                goal: "记忆30个学术类词汇",
                duration: 25,
                difficulty: 2,
                tasks: ["学习新词汇", "完成词汇测试", "造句练习"]
            }
        ];
        
        const afternoonCourses = [
            {
                emoji: "✍️",
                title: "写作 - Task 2 练习",
                goal: "掌握论述文基本结构",
                duration: 60,
                difficulty: 3,
                tasks: ["分析范文结构", "完成写作练习", "自我检查"]
            },
            {
                emoji: "📖",
                title: "语法专项",
                goal: "复习复杂句式",
                duration: 35,
                difficulty: 3,
                tasks: ["学习语法规则", "完成练习题", "造句应用"]
            },
            {
                emoji: "🎧",
                title: "听力 - Section 2 训练",
                goal: "提高听取细节信息的能力",
                duration: 35,
                difficulty: 3,
                tasks: ["听示范材料", "完成练习", "总结技巧"]
            }
        ];
        
        const eveningCourses = [
            {
                emoji: "🗣️",
                title: "口语 - Part 1 练习",
                goal: "流利回答日常话题",
                duration: 30,
                difficulty: 2,
                tasks: ["准备话题", "录音练习", "自我评估"]
            },
            {
                emoji: "📊",
                title: "每日总结",
                goal: "回顾今天的学习内容",
                duration: 20,
                difficulty: 1,
                tasks: ["复习今天内容", "记录学习笔记", "计划明天"]
            }
        ];
        
        if (isClassDay) {
            return {
                morning: morningCourses.slice(0, 2),
                afternoon: afternoonCourses.slice(0, 2),
                evening: eveningCourses.slice(0, 1)
            };
        }
        
        return {
            morning: morningCourses,
            afternoon: afternoonCourses,
            evening: eveningCourses
        };
    },
    
    async provideAdvice(question, userData) {
        // 为每个问题创建新的上下文
        const context = {
            userLevel: userData.currentLevel,
            targetScore: userData.targetScore,
            studyDays: userData.studyDays,
            recentProgress: userData.recentProgress
        };
        
        const prompt = `作为雅思学习规划师，请回答以下问题：

学生问题：${question}

请提供专业、实用的建议，基于学生的当前情况。`;
        
        return await AIBase.generateContent(prompt, context);
    }
};

// ===== Quality AI (质检AI) =====
const QualityAI = {
    context: null,
    
    resetContext() {
        this.context = {
            lastCheckDate: null,
            efficiencyMetrics: {},
            recommendations: []
        };
    },
    
    async analyzeLearningEfficiency(learningData) {
        this.resetContext();
        
        this.context = {
            lastCheckDate: new Date().toISOString(),
            totalStudyTime: learningData.totalStudyTime,
            completedTasks: learningData.completedTasks,
            totalTasks: learningData.totalTasks,
            accuracyRate: learningData.accuracyRate,
            skillProgress: learningData.skillProgress
        };
        
        const prompt = `作为学习效率质检员，请分析以下学习数据：

学习数据：
- 总学习时间：${learningData.totalStudyTime}小时
- 完成任务：${learningData.completedTasks}/${learningData.totalTasks}
- 准确率：${learningData.accuracyRate}%
- 技能进步：${JSON.stringify(learningData.skillProgress, null, 2)}

请分析：
1. 学习效率评分（1-100分）
2. 主要优点（2-3条）
3. 需要改进的地方（2-3条）
4. 具体建议

请用JSON格式返回：
{
  "score": 85,
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进1", "改进2"],
  "recommendations": ["建议1", "建议2", "建议3"]
}`;

        try {
            const response = await AIBase.generateContent(prompt, this.context);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                this.context.lastAnalysis = analysis;
                return analysis;
            }
            return this.getDefaultAnalysis();
        } catch (error) {
            console.error('Quality analysis error:', error);
            return this.getDefaultAnalysis();
        }
    },
    
    getDefaultAnalysis() {
        return {
            score: 75,
            strengths: ["学习时间充足", "任务完成率良好"],
            improvements: ["需要提高学习效率", "建议更系统化的复习"],
            recommendations: ["每天固定时间学习", "定期复习错题", "制定周学习计划"]
        };
    },
    
    calculateEfficiencyScore(learningData) {
        // 简单效率计算公式
        let score = 0;
        
        // 完成率权重：40%
        const completionRate = learningData.completedTasks / learningData.totalTasks;
        score += completionRate * 40;
        
        // 准确率权重：30%
        score += learningData.accuracyRate * 0.3;
        
        // 时间效率权重：30%（假设理想学习时间4小时/天）
        const timeEfficiency = Math.min(1, 4 / (learningData.totalStudyTime || 1));
        score += timeEfficiency * 30;
        
        return Math.min(100, Math.round(score));
    }
};

// ===== Grading AI (批改AI) =====
const GradingAI = {
    context: null,
    
    resetContext() {
        this.context = {
            lastGradeDate: null,
            gradingHistory: [],
            averageScore: null
        };
    },
    
    async gradeSubmission(courseTitle, submission, submissionType = 'text') {
        this.resetContext();
        
        const prompt = `作为雅思考官，请批改以下作业：

课程：${courseTitle}
学生答案：
${submission}

${submissionType === 'image' ? '注意：这是图片提交，请根据学生备注的内容进行批改。' : ''}

请提供：
1. 评分（1-9分，精确到0.5分）
2. 优点（2-3条）
3. 需要改进的地方（2-3条）
4. 具体建议
5. 推荐练习（1-2个相关练习）

请用友好、鼓励的语气，给出建设性反馈。

请用JSON格式返回：
{
  "score": 6.5,
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进1", "改进2"],
  "suggestions": ["建议1", "建议2", "建议3"],
  "recommendedPractice": ["练习1", "练习2"]
}`;

        try {
            const response = await AIBase.generateContent(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const grade = JSON.parse(jsonMatch[0]);
                // 更新上下文
                this.context.lastGrade = grade;
                this.context.gradingHistory.push({
                    date: new Date().toISOString(),
                    course: courseTitle,
                    score: grade.score
                });
                return grade;
            }
            return this.getDefaultFeedback();
        } catch (error) {
            console.error('Grading error:', error);
            return this.getDefaultFeedback();
        }
    },
    
    getDefaultFeedback() {
        return {
            score: 5.0,
            strengths: ["内容完整", "表达清晰"],
            improvements: ["需要更多细节", "语法需要改进"],
            suggestions: ["多阅读范文", "练习语法结构", "增加词汇量"],
            recommendedPractice: ["完成一篇类似主题的写作", "复习相关语法点"]
        };
    },
    
    async gradeImageSubmission(courseTitle, imageNote, imageData = null) {
        // 处理图片提交的批改 - 使用智谱AI GLM-4V模型
        this.resetContext();
        
        // 如果提供了图片数据，使用GLM-4V进行图片分析
        if (imageData) {
            const prompt = `作为雅思考官，学生提交了图片形式的作业。

课程：${courseTitle}
学生备注：${imageNote}

请仔细分析图片中的内容，并提供：
1. 对阅读材料/作业内容的详细分析
2. 针对该材料的常见问题分析（至少3个）
3. 阅读/答题技巧建议（至少3条）
4. 相关练习推荐（至少2个）

请用JSON格式返回：
{
  "materialAnalysis": "对阅读材料/作业的详细分析",
  "commonQuestions": ["常见问题1", "常见问题2", "常见问题3"],
  "readingTips": ["技巧1", "技巧2", "技巧3"],
  "practiceRecommendations": ["练习1", "练习2"]
}`;

            try {
                const response = await AIBase.generateContent(prompt, null, {
                    useVision: true,
                    imageData: imageData,
                    fallbackEnabled: false
                });
                
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                return this.parseTextResponse(response);
            } catch (error) {
                console.error('Image grading error with vision model:', error);
                // Fallback to text-based analysis without image
                return this.gradeSubmissionWithText(courseTitle, imageNote);
            }
        } else {
            // 没有图片数据，使用文本分析
            return this.gradeSubmissionWithText(courseTitle, imageNote);
        }
    },
    
    parseTextResponse(text) {
        // Try to extract structured data from non-JSON response
        const materialAnalysisMatch = text.match(/材料分析[：:]\s*(.+?)(?=\n\n|常见问题|阅读技巧|$)/s);
        const commonQuestionsMatch = text.match(/常见问?题[：:]\s*([\s\S]+?)(?=\n\n|阅读技巧|练习推荐|$)/);
        const readingTipsMatch = text.match(/阅读技巧|技巧建议[：:]\s*([\s\S]+?)(?=\n\n|练习推荐|$)/);
        const practiceMatch = text.match(/练习推荐|推荐练习[：:]\s*([\s\S]+?)$/);
        
        return {
            materialAnalysis: materialAnalysisMatch ? materialAnalysisMatch[1].trim() : "图片内容分析完成，建议重点关注材料中的关键信息。",
            commonQuestions: this.extractListItems(commonQuestionsMatch ? commonQuestionsMatch[1] : ""),
            readingTips: this.extractListItems(readingTipsMatch ? readingTipsMatch[1] : ""),
            practiceRecommendations: this.extractListItems(practiceMatch ? practiceMatch[1] : "")
        };
    },
    
    extractListItems(text) {
        if (!text) return ["信息提取中...", "建议重新提交获取详细分析"];
        // Extract items from numbered list or bullet points
        const items = text.split(/\n/).map(line => line.replace(/^\s*[\d\-\*•]\.?\s*/, '').trim()).filter(line => line.length > 0);
        return items.length > 0 ? items : [text.trim()];
    },
    
    async gradeSubmissionWithText(courseTitle, text) {
        // 纯文本分析（无图片时）
        const prompt = `作为雅思考官，学生备注了以下作业信息：

课程：${courseTitle}
学生备注：${text}

请根据学生备注的阅读材料信息，提供：
1. 针对该阅读材料的常见问题分析
2. 阅读技巧建议
3. 相关练习推荐

请用JSON格式返回：
{
  "materialAnalysis": "对阅读材料的分析",
  "commonQuestions": ["常见问题1", "常见问题2"],
  "readingTips": ["技巧1", "技巧2"],
  "practiceRecommendations": ["练习1", "练习2"]
}`;

        try {
            const response = await AIBase.generateContent(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return this.getDefaultImageFeedback();
        } catch (error) {
            console.error('Text grading error:', error);
            return this.getDefaultImageFeedback();
        }
    },
    
    getDefaultImageFeedback() {
        return {
            materialAnalysis: "这是一篇雅思阅读材料，建议重点练习阅读技巧。",
            commonQuestions: ["主旨大意题", "细节理解题", "词汇推理题"],
            readingTips: ["先快速浏览全文", "注意段落首句", "标记关键词"],
            practiceRecommendations: ["完成类似阅读练习", "计时阅读训练", "错题分析"]
        };
    }
};

// ===== AI Manager (兼容层，逐步迁移) =====
const AI = {
    // 保持向后兼容
    generateContent: AIBase.generateContent,
    
    async generateDailyCourses(day, currentLevel, targetScore, isClassDay) {
        // 使用新的PlannerAI
        const learningHistory = state.progress.history || [];
        return await PlannerAI.generateDailyPlan(day, currentLevel, targetScore, isClassDay, learningHistory);
    },
    
    getFallbackCourses: PlannerAI.getFallbackCourses,
    
    async gradeSubmission(courseTitle, submission) {
        // 使用新的GradingAI
        const result = await GradingAI.gradeSubmission(courseTitle, submission);
        // 转换为旧格式（字符串）
        return `评分：${result.score}\n\n优点：\n${result.strengths.map(s => `• ${s}`).join('\n')}\n\n改进建议：\n${result.improvements.map(i => `• ${i}`).join('\n')}\n\n具体建议：\n${result.suggestions.map(s => `• ${s}`).join('\n')}`;
    },
    
    async chat(conversationHistory, newMessage) {
        // 暂时保持原有逻辑，后续可以迁移到专门的ChatAI
        const historyText = conversationHistory.map(msg => 
            `${msg.role === 'user' ? '学生' : 'AI助手'}: ${msg.content}`
        ).join('\n');
        
        const prompt = `你是一个专业的雅思学习助手。

对话历史：
${historyText}

学生: ${newMessage}

请提供有帮助的、鼓励性的回答。如果学生提交作业，请给出详细反馈。`;

        try {
            const response = await this.generateContent(prompt);
            return response;
        } catch (error) {
            return '抱歉，我现在无法回答。请稍后再试。';
        }
    }
};

// ===== Course Manager =====
const CourseManager = {
    async generateDailyCourses() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const isClassDay = state.settings.classDays.includes(dayOfWeek);
        
        try {
            const coursesData = await AI.generateDailyCourses(
                state.progress.studyDays,
                state.settings.currentLevel,
                state.settings.targetScore,
                isClassDay
            );
            
            let courses = [];
            let courseId = 1;
            
            if (Array.isArray(coursesData)) {
                // AI返回了数组格式
                const morningCount = 3;
                const afternoonCount = 3;
                
                courses = coursesData.slice(0, 8).map((course, index) => {
                    let period = 'morning';
                    if (index >= morningCount && index < morningCount + afternoonCount) {
                        period = 'afternoon';
                    } else if (index >= morningCount + afternoonCount) {
                        period = 'evening';
                    }
                    
                    return {
                        id: courseId++,
                        period,
                        ...course,
                        completed: false,
                        skipped: false,
                        type: 'course' // 标记为课程
                    };
                });
            } else {
                // AI返回了分组格式
                ['morning', 'afternoon', 'evening'].forEach(period => {
                    if (coursesData[period]) {
                        coursesData[period].forEach(course => {
                            courses.push({
                                id: courseId++,
                                period,
                                ...course,
                                completed: false,
                                skipped: false,
                                type: 'course' // 标记为课程
                            });
                        });
                    }
                });
            }
            
            state.courses = courses;
            Storage.save('todayCourses', courses);
            Storage.save('coursesDate', today.toDateString());
            
            this.renderCourses();
        } catch (error) {
            console.error('Failed to generate courses:', error);
            UI.showNotification('课程生成失败，请稍后重试', 'error');
        }
    },
    
    renderCourses() {
        // The new planner uses ScheduleManager blocks; drop-zones no longer exist.
        // Just update progress/duration counters for stats without touching DOM.
        this.updateProgress();
        this.updateTotalDuration();
    },
    
    createCourseCard(course) {
        const card = document.createElement('div');
        card.className = `course-card ${course.completed ? 'completed' : ''}`;
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-course-id', course.id);
        card.setAttribute('data-item-type', 'course');
        
        // 课程使用原色
        card.style.borderLeft = '4px solid #2C4251'; // 主色
        
        const difficultyStars = '★'.repeat(course.difficulty) + '☆'.repeat(5 - course.difficulty);
        const statusText = course.completed ? 'Done' : course.skipped ? 'Skipped' : 'Not started';

        card.innerHTML = `
            <div class="course-header">
                <span class="course-number">Course ${course.id}</span>
                <span class="course-status">${statusText}</span>
            </div>
            <div class="course-type">${course.emoji}</div>
            <h4 class="course-title">${course.title}</h4>
            <p class="course-description">${course.goal}</p>
            <div class="course-meta">
                <div class="meta-item">
                    <span>⏱️</span>
                    <span>${course.duration} min</span>
                </div>
                <div class="meta-item">
                    <span class="course-difficulty">${difficultyStars}</span>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn-start" data-course-id="${course.id}">Start</button>
                <button class="btn-skip" data-course-id="${course.id}">Skip</button>
            </div>
        `;
        
        // Event listeners
        card.querySelector('.btn-start').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openCourse(course);
        });
        
        card.querySelector('.btn-skip').addEventListener('click', (e) => {
            e.stopPropagation();
            this.skipCourse(course.id);
        });
        
        // Make course card draggable
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: course.id,
                type: 'course'
            }));
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
        
        return card;
    },
    
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.completed ? 'completed' : ''}`;
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-task-id', task.id);
        card.setAttribute('data-item-type', 'task');
        
        // 任务使用不同的颜色 - 浅棕色
        card.style.borderLeft = '4px solid #B88B5C';
        card.style.background = 'linear-gradient(135deg, var(--color-surface) 0%, #F8F6F3 100%)';
        
        const skillEmojis = {
            'listening': '🎧',
            'reading': '📖',
            'writing': '✍️',
            'speaking': '🗣️'
        };
        
        const emoji = skillEmojis[task.skill] || '📝';
        const priorityText = task.priority === 'high' ? 'High priority' : task.priority === 'medium' ? 'Medium priority' : 'Low priority';
        const statusText = task.status === 'completed' ? 'Done' :
                          task.status === 'in_progress' ? 'In progress' :
                          task.status === 'skipped' ? 'Skipped' : 'Pending';

        card.innerHTML = `
            <div class="course-header">
                <span class="course-number">Task</span>
                <span class="course-status" style="background: #B88B5C;">${statusText}</span>
            </div>
            <div class="course-type">${emoji}</div>
            <h4 class="course-title">${task.title}</h4>
            <p class="course-description">${task.description}</p>
            <div class="course-meta">
                <div class="meta-item">
                    <span>⏱️</span>
                    <span>${task.estimatedDuration} min</span>
                </div>
                <div class="meta-item">
                    <span style="color: #B88B5C;">${priorityText}</span>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn-start" data-task-id="${task.id}">Start Task</button>
                <button class="btn-skip" data-task-id="${task.id}">Skip</button>
            </div>
        `;
        
        // Event listeners
        card.querySelector('.btn-start').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openTask(task);
        });
        
        card.querySelector('.btn-skip').addEventListener('click', (e) => {
            e.stopPropagation();
            this.skipTask(task.id);
        });
        
        // Make task card draggable
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: task.id,
                type: 'task'
            }));
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
        
        return card;
    },
    
    openCourse(course) {
        const modal = document.getElementById('course-modal');
        const modalBody = document.getElementById('course-modal-body');
        
        const tasksHtml = course.tasks.map(task => `<li>${task}</li>`).join('');
        
        modalBody.innerHTML = `
            <div class="course-detail">
                <div class="course-detail-header">
                    <span class="course-type" style="font-size: 3rem;">${course.emoji}</span>
                    <div>
                        <h3>${course.title}</h3>
                        <p style="color: var(--color-text-secondary); margin-top: 0.5rem;">${course.goal}</p>
                        <p style="color: #2C4251; font-size: 0.875rem; margin-top: 0.25rem;">📚 Course</p>
                    </div>
                </div>

                <div class="course-detail-meta">
                    <div class="meta-item">
                        <strong>Duration:</strong> ${course.duration} min
                    </div>
                    <div class="meta-item">
                        <strong>Difficulty:</strong> ${'★'.repeat(course.difficulty)}${'☆'.repeat(5 - course.difficulty)}
                    </div>
                </div>

                <div class="course-detail-tasks">
                    <h4>Study Tasks:</h4>
                    <ul>
                        ${tasksHtml}
                    </ul>
                </div>

                <div class="course-detail-workspace">
                    <h4>Workspace:</h4>
                    <textarea id="course-workspace" rows="10" placeholder="Take notes, write answers, or paste your work here..."></textarea>
                    <div style="margin-top: 1rem;">
                        <label for="course-image-upload" style="display: inline-block; padding: 0.5rem 1rem; background: var(--color-surface); border: 2px dashed var(--color-border); border-radius: var(--radius-md); cursor: pointer; color: var(--color-text-secondary);">
                            📷 Upload image (photo of reading material)
                        </label>
                        <input type="file" id="course-image-upload" accept="image/*" capture="environment" style="display: none;">
                        <div id="image-preview" style="margin-top: 0.5rem;"></div>
                    </div>
                </div>

                <div class="course-detail-actions" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn-primary" id="submit-work">Submit for AI Review</button>
                    <button class="btn-primary" id="submit-image-work" style="background: var(--color-accent);">Submit Image for Review</button>
                    <button class="btn-secondary" id="mark-complete">Mark Complete</button>
                    <button class="btn-skip" id="skip-course">Skip</button>
                </div>
            </div>
        `;
        
        // Event listeners
        modalBody.querySelector('#submit-work').addEventListener('click', async () => {
            const workspace = document.getElementById('course-workspace').value;
            if (!workspace.trim()) {
                UI.showNotification('请先输入你的作业内容', 'warning');
                return;
            }
            
            UI.showLoading(modalBody.querySelector('#submit-work'));
            
            try {
                const feedback = await AI.gradeSubmission(course.title, workspace);
                
                // Show feedback in modal
                const feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'ai-feedback';
                feedbackDiv.style.cssText = 'margin-top: 1.5rem; padding: 1.5rem; background: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border);';
                feedbackDiv.innerHTML = `
                    <h4 style="margin-bottom: 1rem;">AI 批改反馈：</h4>
                    <div style="white-space: pre-wrap; line-height: 1.8;">${feedback}</div>
                `;
                
                const existingFeedback = modalBody.querySelector('.ai-feedback');
                if (existingFeedback) {
                    existingFeedback.remove();
                }
                
                modalBody.querySelector('.course-detail').appendChild(feedbackDiv);
                
                UI.showNotification('批改完成！', 'success');
            } catch (error) {
                UI.showNotification('批改失败，请稍后再试', 'error');
            } finally {
                UI.hideLoading(modalBody.querySelector('#submit-work'));
            }
        });
        
        modalBody.querySelector('#mark-complete').addEventListener('click', () => {
            this.completeCourse(course.id);
            UI.closeModal('course-modal');
        });
        
        modalBody.querySelector('#skip-course').addEventListener('click', () => {
            this.skipCourse(course.id);
            UI.closeModal('course-modal');
        });
        
        UI.openModal('course-modal');
    },
    
    openTask(task) {
        const modal = document.getElementById('course-modal');
        const modalBody = document.getElementById('course-modal-body');
        
        const skillEmojis = {
            'listening': '🎧',
            'reading': '📖', 
            'writing': '✍️',
            'speaking': '🗣️'
        };
        
        const emoji = skillEmojis[task.skill] || '📝';
        
        modalBody.innerHTML = `
            <div class="course-detail">
                <div class="course-detail-header">
                    <span class="course-type" style="font-size: 3rem;">${emoji}</span>
                    <div>
                        <h3>${task.title}</h3>
                        <p style="color: var(--color-text-secondary); margin-top: 0.5rem;">${task.description}</p>
                        <p style="color: #B88B5C; font-size: 0.875rem; margin-top: 0.25rem;">📝 Task</p>
                    </div>
                </div>
                
                <div class="course-detail-meta">
                    <div class="meta-item">
                        <strong>Duration:</strong> ${task.estimatedDuration} min
                    </div>
                    <div class="meta-item">
                        <strong>Priority:</strong> ${task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'}
                    </div>
                </div>

                <div class="course-detail-tasks">
                    <h4>Task description:</h4>
                    <p>${task.description}</p>
                    <p style="margin-top: 1rem; color: var(--color-text-secondary); font-size: 0.875rem;">
                        Complete this task and submit for AI feedback.
                    </p>
                </div>

                <div class="course-detail-workspace">
                    <h4>Submit your work:</h4>
                    <textarea id="course-workspace" rows="10" placeholder="Complete your task here and submit..."></textarea>
                </div>

                <div class="course-detail-actions" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn-primary" id="submit-work">Submit for AI Review</button>
                    <button class="btn-secondary" id="mark-complete">Mark Complete</button>
                    <button class="btn-skip" id="skip-course">Skip Task</button>
                </div>
            </div>
        `;
        
        // Event listeners
        modalBody.querySelector('#submit-work').addEventListener('click', async () => {
            const workspace = document.getElementById('course-workspace').value;
            if (!workspace.trim()) {
                UI.showNotification('请先完成你的作业', 'warning');
                return;
            }
            
            UI.showLoading(modalBody.querySelector('#submit-work'));
            
            try {
                const feedback = await AI.gradeSubmission(task.title, workspace);
                
                // Show feedback in modal
                const feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'ai-feedback';
                feedbackDiv.style.cssText = 'margin-top: 1.5rem; padding: 1.5rem; background: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border);';
                feedbackDiv.innerHTML = `
                    <h4 style="margin-bottom: 1rem;">AI 批改反馈：</h4>
                    <div style="white-space: pre-wrap; line-height: 1.8;">${feedback}</div>
                `;
                
                const existingFeedback = modalBody.querySelector('.ai-feedback');
                if (existingFeedback) {
                    existingFeedback.remove();
                }
                
                modalBody.querySelector('.course-detail').appendChild(feedbackDiv);
                
                // Mark task as completed
                TaskManager.completeTask(task.id);
                
                UI.showNotification('作业批改完成！', 'success');
            } catch (error) {
                UI.showNotification('批改失败，请稍后再试', 'error');
            } finally {
                UI.hideLoading(modalBody.querySelector('#submit-work'));
            }
        });
        
        modalBody.querySelector('#mark-complete').addEventListener('click', () => {
            TaskManager.completeTask(task.id);
            UI.closeModal('course-modal');
            this.renderCourses();
        });
        
        modalBody.querySelector('#skip-course').addEventListener('click', () => {
            TaskManager.skipTask(task.id);
            UI.closeModal('course-modal');
            this.renderCourses();
        });
        
        UI.openModal('course-modal');
    },
    
    completeCourse(courseId) {
        const course = state.courses.find(c => c.id === courseId);
        if (course && !course.completed) {
            course.completed = true;
            course.skipped = false;
            state.progress.totalCompletedCourses++;
            Storage.save('todayCourses', state.courses);
            Storage.save('progress', state.progress);
            this.renderCourses();
            UI.showNotification('课程已完成！', 'success');
        }
    },
    
    skipCourse(courseId) {
        const course = state.courses.find(c => c.id === courseId);
        if (course) {
            course.skipped = true;
            Storage.save('todayCourses', state.courses);
            this.renderCourses();
            UI.showNotification('已跳过此课程', 'info');
        }
    },
    
    skipTask(taskId) {
        TaskManager.skipTask(taskId);
        this.renderCourses();
    },
    
    updateProgress() {
        // Progress ring is managed by ScheduleManager; just keep state in sync.
        if (typeof ScheduleManager !== 'undefined') {
            ScheduleManager.updateProgressRing();
        }
    },

    updateTotalDuration() {
        // total-duration element removed; no-op to avoid crash.
    }
};

// ===== Conversation Manager =====
const ConversationManager = {
    createConversation(title = '新对话') {
        const conversation = {
            id: Date.now().toString(),
            title: title,
            date: new Date().toISOString(),
            messages: []
        };
        
        state.conversations.unshift(conversation);
        Storage.save('conversations', state.conversations);
        this.renderConversations();
        this.selectConversation(conversation.id);
        
        return conversation;
    },
    
    renderConversations() {
        const container = document.getElementById('conversations-container');
        
        if (state.conversations.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>还没有对话</p></div>';
            return;
        }
        
        container.innerHTML = state.conversations.map(conv => {
            const preview = conv.messages.length > 0 
                ? conv.messages[conv.messages.length - 1].content.substring(0, 50) + '...'
                : '开始新对话...';
            
            const date = new Date(conv.date).toLocaleDateString('zh-CN');
            
            return `
                <div class="conversation-item ${state.currentConversation?.id === conv.id ? 'active' : ''}" 
                     data-conversation-id="${conv.id}">
                    <div class="conversation-title">${conv.title}</div>
                    <div class="conversation-preview">${preview}</div>
                    <div class="conversation-date">${date}</div>
                </div>
            `;
        }).join('');
        
        // Add click listeners
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectConversation(item.dataset.conversationId);
            });
        });
    },
    
    selectConversation(conversationId) {
        state.currentConversation = state.conversations.find(c => c.id === conversationId);
        
        if (state.currentConversation) {
            document.getElementById('current-conversation-title').textContent = 
                state.currentConversation.title;
            this.renderMessages();
            this.renderConversations(); // Re-render to update active state
        }
    },
    
    renderMessages() {
        const container = document.getElementById('chat-messages');
        
        if (!state.currentConversation || state.currentConversation.messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <p>开始对话</p>
                    <p class="empty-subtitle">输入你的问题或提交作业</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = state.currentConversation.messages.map(msg => {
            const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            return `
                <div class="message ${msg.role}">
                    <div class="message-header">
                        <span class="message-role">${msg.role === 'user' ? '你' : 'AI助手'}</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-content">${msg.content}</div>
                </div>
            `;
        }).join('');
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },
    
    async sendMessage(content) {
        if (!state.currentConversation) {
            this.createConversation('新对话');
        }
        
        // Add user message
        const userMessage = {
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        };
        
        state.currentConversation.messages.push(userMessage);
        this.renderMessages();
        
        // Get AI response
        try {
            const aiResponse = await AI.chat(state.currentConversation.messages, content);
            
            const aiMessage = {
                role: 'ai',
                content: aiResponse,
                timestamp: new Date().toISOString()
            };
            
            state.currentConversation.messages.push(aiMessage);
            
            // Update conversation title if first message
            if (state.currentConversation.messages.length === 2) {
                state.currentConversation.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
            }
            
            Storage.save('conversations', state.conversations);
            this.renderMessages();
            this.renderConversations();
        } catch (error) {
            UI.showNotification('发送失败，请稍后再试', 'error');
        }
    },
    
    deleteConversation(conversationId) {
        if (confirm('确定要删除这个对话吗？')) {
            state.conversations = state.conversations.filter(c => c.id !== conversationId);
            
            if (state.currentConversation?.id === conversationId) {
                state.currentConversation = null;
            }
            
            Storage.save('conversations', state.conversations);
            this.renderConversations();
            this.renderMessages();
        }
    }
};

// ===== Material Manager =====
const MaterialManager = {
    addMaterial(material) {
        const newMaterial = {
            id: Date.now().toString(),
            ...material,
            createdAt: new Date().toISOString()
        };
        
        state.materials.unshift(newMaterial);
        Storage.save('materials', state.materials);
        this.renderMaterials();
        
        return newMaterial;
    },
    
    renderMaterials(filter = 'all') {
        const grid = document.getElementById('library-grid');
        
        let materials = state.materials;
        if (filter !== 'all') {
            materials = materials.filter(m => m.type === filter);
        }
        
        if (materials.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📂</div>
                    <p>还没有${filter !== 'all' ? '此类型的' : ''}材料</p>
                    <p class="empty-subtitle">点击"创建自定义课程"开始添加学习资源</p>
                </div>
            `;
            return;
        }
        
        const typeEmojis = {
            listening: '🎧',
            reading: '📖',
            writing: '✍️',
            speaking: '🗣️'
        };
        
        grid.innerHTML = materials.map(material => `
            <div class="course-card" data-material-id="${material.id}">
                <div class="course-header">
                    <span class="course-number">材料</span>
                    <span class="course-status">${material.difficulty ? '★'.repeat(material.difficulty) + '☆'.repeat(5 - material.difficulty) : '资源'}</span>
                </div>
                <div class="course-type">${typeEmojis[material.type]}</div>
                <h4 class="course-title">${material.name}</h4>
                <p class="course-description">${material.content.substring(0, 100)}${material.content.length > 100 ? '...' : ''}</p>
                <div class="course-meta">
                    <div class="meta-item">
                        <span>📅</span>
                        <span>${new Date(material.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                </div>
                <div class="course-actions">
                    <button class="btn-start" data-material-id="${material.id}">查看详情</button>
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        grid.querySelectorAll('.btn-start').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewMaterial(button.dataset.materialId);
            });
        });
    },
    
    viewMaterial(materialId) {
        const material = state.materials.find(m => m.id === materialId);
        if (!material) return;
        
        const modal = document.getElementById('course-modal');
        const modalBody = document.getElementById('course-modal-body');
        
        modalBody.innerHTML = `
            <div class="material-detail">
                <h3>${material.name}</h3>
                <div class="material-meta" style="margin: 1rem 0;">
                    <span><strong>类型：</strong> ${material.type}</span>
                    <span><strong>难度：</strong> ${material.difficulty ? '★'.repeat(material.difficulty) + '☆'.repeat(5 - material.difficulty) : '未设置'}</span>
                </div>
                <div class="material-content" style="white-space: pre-wrap; padding: 1.5rem; background: var(--color-surface); border-radius: var(--radius-md);">
                    ${material.content}
                </div>
                <button class="btn-primary" style="margin-top: 1.5rem;" onclick="UI.closeModal('course-modal')">关闭</button>
            </div>
        `;
        
        UI.openModal('course-modal');
    },
    
    // 新增：课程库筛选功能
    filterLibrary(filter) {
        const grid = document.getElementById('library-grid');
        
        // 获取所有课程和任务数据
        const allItems = [
            ...state.materials.map(m => ({...m, itemType: 'material'})),
            ...state.tasks.custom.map(t => ({...t, itemType: 'task'})),
            ...state.tasks.daily.map(t => ({...t, itemType: 'task'}))
        ];
        
        let filteredItems = allItems;
        
        if (filter === 'courses') {
            // 显示课程/学习材料
            filteredItems = allItems.filter(item => item.itemType === 'material');
        } else if (filter === 'tasks') {
            // 显示任务/作业
            filteredItems = allItems.filter(item => item.itemType === 'task');
        } else if (filter === 'listening' || filter === 'reading' || filter === 'writing' || filter === 'speaking') {
            // 按技能类型筛选
            filteredItems = allItems.filter(item => item.skill === filter || item.type === filter);
        } else if (filter === 'custom') {
            // 自定义内容
            filteredItems = allItems.filter(item => item.custom === true || item.aiGenerated === true);
        }
        
        this.renderLibraryItems(filteredItems);
    },
    
    renderLibraryItems(items) {
        const grid = document.getElementById('library-grid');
        
        if (items.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📂</div>
                    <p>没有找到相关内容</p>
                    <p class="empty-subtitle">尝试其他筛选条件或创建新的学习资源</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = items.map(item => {
            if (item.itemType === 'material') {
                return this.renderMaterialCard(item);
            } else if (item.itemType === 'task') {
                return this.renderTaskCard(item);
            }
            return '';
        }).join('');
        
        // 添加事件监听器
        grid.querySelectorAll('.btn-start').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = button.dataset.itemId;
                const itemType = button.dataset.itemType;
                
                if (itemType === 'material') {
                    this.viewMaterial(itemId);
                } else if (itemType === 'task') {
                    this.viewTask(itemId);
                }
            });
        });
    },
    
    renderMaterialCard(material) {
        const typeEmojis = {
            listening: '🎧',
            reading: '📖',
            writing: '✍️',
            speaking: '🗣️'
        };
        
        return `
            <div class="course-card" data-material-id="${material.id}" style="border-left: 4px solid var(--color-primary);">
                <div class="course-header">
                    <span class="course-number">课程</span>
                    <span class="course-status">${material.difficulty ? '★'.repeat(material.difficulty) + '☆'.repeat(5 - material.difficulty) : '学习资源'}</span>
                </div>
                <div class="course-type">${typeEmojis[material.type] || '📚'}</div>
                <h4 class="course-title">${material.name}</h4>
                <p class="course-description">${material.content.substring(0, 100)}${material.content.length > 100 ? '...' : ''}</p>
                <div class="course-meta">
                    <div class="meta-item">
                        <span>📅</span>
                        <span>${new Date(material.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div class="meta-item">
                        <span>📚</span>
                        <span>课程</span>
                    </div>
                </div>
                <div class="course-actions">
                    <button class="btn-start" data-item-id="${material.id}" data-item-type="material">查看详情</button>
                </div>
            </div>
        `;
    },
    
    renderTaskCard(task) {
        const skillEmojis = {
            'listening': '🎧',
            'reading': '📖',
            'writing': '✍️',
            'speaking': '🗣️'
        };
        
        const emoji = skillEmojis[task.skill] || '📝';
        const priorityColors = {
            'high': '#FF6B6B',
            'medium': '#FFA726',
            'low': '#66BB6A'
        };
        const priorityText = task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级';
        
        return `
            <div class="course-card" data-task-id="${task.id}" style="border-left: 4px solid var(--color-accent-dark); background: linear-gradient(135deg, var(--color-surface) 0%, #F8F6F3 100%);">
                <div class="course-header">
                    <span class="course-number">任务</span>
                    <span class="course-status" style="background: ${priorityColors[task.priority] || '#666'};">${priorityText}</span>
                </div>
                <div class="course-type">${emoji}</div>
                <h4 class="course-title">${task.title}</h4>
                <p class="course-description">${task.description}</p>
                <div class="course-meta">
                    <div class="meta-item">
                        <span>⏱️</span>
                        <span>${task.estimatedDuration}分钟</span>
                    </div>
                    <div class="meta-item">
                        <span>📝</span>
                        <span>作业任务</span>
                    </div>
                </div>
                <div class="course-actions">
                    <button class="btn-start" data-item-id="${task.id}" data-item-type="task">查看详情</button>
                </div>
            </div>
        `;
    },
    
    viewTask(taskId) {
        const task = TaskManager.findTask(taskId);
        if (!task) return;
        
        // 直接打开任务详情（复用CourseManager的openTask方法）
        CourseManager.openTask(task);
    }
};

// ===== Drag and Drop Manager =====
const DragDropManager = {
    init() {
        this.setupDropZones();
        this.setupDragEvents();
    },
    
    setupDropZones() {
        const dropZones = document.querySelectorAll('.drop-zone');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            
            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                const data = e.dataTransfer.getData('text/plain');
                if (data) {
                    try {
                        const item = JSON.parse(data);
                        this.moveItem(item, zone.dataset.period);
                    } catch (error) {
                        // Fallback for old format
                        const courseId = data;
                        if (courseId) {
                            this.moveCourse(courseId, zone.dataset.period);
                        }
                    }
                }
            });
        });
    },
    
    setupDragEvents() {
        // Event listeners are already added in createCourseCard method
    },
    
    moveItem(item, newPeriod) {
        if (item.type === 'course') {
            this.moveCourse(item.id, newPeriod);
        } else if (item.type === 'task') {
            this.moveTask(item.id, newPeriod);
        }
    },
    
    moveCourse(courseId, newPeriod) {
        const course = state.courses.find(c => c.id === courseId);
        if (course && course.period !== newPeriod) {
            course.period = newPeriod;
            Storage.save('todayCourses', state.courses);
            CourseManager.renderCourses();
            UI.showNotification(`课程已移动到${this.getPeriodText(newPeriod)}时段`, 'success');
        }
    },
    
    moveTask(taskId, newPeriod) {
        // Tasks don't have period property yet, we'll just show a notification
        UI.showNotification(`任务已移动到${this.getPeriodText(newPeriod)}时段`, 'success');
    },
    
    getPeriodText(period) {
        switch(period) {
            case 'morning': return '上午';
            case 'afternoon': return '下午';
            case 'evening': return '晚上';
            default: return '';
        }
    }
};

// ===== AI Suggestions Manager =====
const AISuggestionsManager = {
    async getSuggestions(type = 'all') {
        try {
            const apiKey = state.settings.apiKey || CONFIG.geminiApiKey;
            if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
                return this.getMockSuggestions(type);
            }
            
            const prompt = this.buildSuggestionPrompt(type);
            const response = await AI.generateContent(prompt);
            
            // Parse JSON response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return this.getMockSuggestions(type);
        } catch (error) {
            console.error('Failed to get AI suggestions:', error);
            return this.getMockSuggestions(type);
        }
    },
    
    buildSuggestionPrompt(type) {
        const skillMap = {
            'listening': '听力',
            'reading': '阅读', 
            'writing': '写作',
            'speaking': '口语'
        };
        
        const skillText = type === 'all' ? '各项技能' : skillMap[type];
        
        return `作为雅思学习规划师，请为当前${state.settings.currentLevel}分水平的学生推荐一些适合的${skillText}练习任务。
        
学生信息：
- 当前水平：${state.settings.currentLevel}分
- 目标分数：${state.settings.targetScore}分
- 已学习天数：${state.progress.studyDays}天

请生成5个课程建议，每节课应该包括：
1. 类型emoji（🎧听力/📖阅读/✍️写作/🗣️口语）
2. 标题（简短）
3. 学习目标（一句话说明）
4. 预计时长（分钟，20-60分钟）
5. 难度（1-5星，基于学生当前水平）
6. 任务内容（概括性的，不指定具体材料）

请用JSON数组格式返回，格式如下：
[
  {
    "emoji": "🎧",
    "title": "听力 - Section 1 训练",
    "goal": "掌握个人信息类题型",
    "duration": 30,
    "difficulty": 2,
    "tasks": ["听示范对话", "完成5-10道练习题", "复习错题"]
  },
  ...
]

只返回JSON数组，不要其他文字。`;
    },
    
    getMockSuggestions(type) {
        const allSuggestions = [
            {
                emoji: "🎧",
                title: "听力 - Section 1 训练",
                goal: "掌握个人信息类题型",
                duration: 30,
                difficulty: 2,
                tasks: ["听示范对话", "完成5-10道练习题", "复习错题"],
                type: "listening"
            },
            {
                emoji: "📖",
                title: "阅读 - 略读练习",
                goal: "提高快速理解文章大意的能力",
                duration: 40,
                difficulty: 2,
                tasks: ["阅读2-3篇文章", "练习略读技巧", "回答问题"],
                type: "reading"
            },
            {
                emoji: "✍️",
                title: "写作 - Task 2 练习",
                goal: "掌握论述文基本结构",
                duration: 60,
                difficulty: 3,
                tasks: ["分析范文结构", "完成写作练习", "自我检查"],
                type: "writing"
            },
            {
                emoji: "🗣️",
                title: "口语 - Part 1 练习",
                goal: "流利回答日常话题",
                duration: 30,
                difficulty: 2,
                tasks: ["准备3个话题", "录音练习", "自我评估"],
                type: "speaking"
            },
            {
                emoji: "🎧",
                title: "听力 - Section 2 训练",
                goal: "提高听取细节信息的能力",
                duration: 35,
                difficulty: 3,
                tasks: ["听示范材料", "完成练习", "总结技巧"],
                type: "listening"
            },
            {
                emoji: "📖",
                title: "词汇专项训练",
                goal: "掌握学术类高频词汇",
                duration: 25,
                difficulty: 2,
                tasks: ["学习30个词汇", "完成词汇测试", "造句练习"],
                type: "reading"
            },
            {
                emoji: "✍️",
                title: "写作 - Task 1 练习",
                goal: "掌握图表描述基本结构",
                duration: 45,
                difficulty: 3,
                tasks: ["分析范文结构", "完成图表描述练习", "对照范文修改"],
                type: "writing"
            },
            {
                emoji: "🗣️",
                title: "口语 - Part 2 练习",
                goal: "学会组织2分钟演讲",
                duration: 40,
                difficulty: 3,
                tasks: ["准备话题卡", "录音练习", "时间控制练习"],
                type: "speaking"
            }
        ];
        
        if (type === 'all') {
            return allSuggestions;
        }
        
        return allSuggestions.filter(suggestion => suggestion.type === type);
    },
    
    async renderSuggestions(type = 'all') {
        const container = document.getElementById('ai-suggestions-list');
        if (!container) return;
        container.innerHTML = '<div class="loading-suggestions"><p>正在生成建议...</p></div>';
        
        const suggestions = await this.getSuggestions(type);
        
        container.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'suggestion-card';
            suggestionElement.setAttribute('draggable', 'true');
            suggestionElement.setAttribute('data-suggestion-index', index);
            
            const difficultyStars = '★'.repeat(suggestion.difficulty) + '☆'.repeat(5 - suggestion.difficulty);
            
            suggestionElement.innerHTML = `
                <div class="suggestion-header">
                    <span class="suggestion-type">${suggestion.emoji}</span>
                    <span class="suggestion-difficulty">${difficultyStars}</span>
                </div>
                <div class="suggestion-title">${suggestion.title}</div>
                <div class="suggestion-goal">${suggestion.goal}</div>
                <div class="suggestion-duration">⏱️ ${suggestion.duration}分钟</div>
                <div class="suggestion-buttons">
                    <button class="suggestion-add-course" data-suggestion-index="${index}">作为课程</button>
                    <button class="suggestion-add-task" data-suggestion-index="${index}">作为任务</button>
                </div>
            `;
            
            // Add drag events
            suggestionElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify(suggestion));
                e.dataTransfer.setData('text/suggestion', 'true');
                suggestionElement.classList.add('dragging');
            });
            
            suggestionElement.addEventListener('dragend', () => {
                suggestionElement.classList.remove('dragging');
            });
            
            // Add click events for buttons
            suggestionElement.querySelector('.suggestion-add-course').addEventListener('click', () => {
                this.addSuggestionAsCourse(suggestion);
            });
            
            suggestionElement.querySelector('.suggestion-add-task').addEventListener('click', () => {
                this.addSuggestionAsTask(suggestion);
            });
            
            container.appendChild(suggestionElement);
        });
    },
    
    async addSuggestionAsCourse(suggestion) {
        const courseId = state.courses.length > 0 
            ? Math.max(...state.courses.map(c => c.id)) + 1 
            : 1;
        
        const newCourse = {
            id: courseId,
            period: 'morning', // Default to morning period
            ...suggestion,
            type: 'course',
            completed: false,
            skipped: false
        };
        
        state.courses.push(newCourse);
        Storage.save('todayCourses', state.courses);
        CourseManager.renderCourses();
        UI.showNotification('已作为课程添加到今日计划', 'success');
        
        // Refresh suggestions
        await this.renderSuggestions();
    },
    
    async addSuggestionAsTask(suggestion) {
        const skillMap = {
            '🎧': 'listening',
            '📖': 'reading',
            '✍️': 'writing', 
            '🗣️': 'speaking'
        };
        
        const skill = skillMap[suggestion.emoji] || 'reading';
        
        const taskData = {
            type: 'independent',
            title: suggestion.title,
            description: suggestion.goal,
            skill: skill,
            estimatedDuration: suggestion.duration,
            priority: 'medium',
            daily: true,
            aiGenerated: true,
            custom: false
        };
        
        TaskManager.createTask(taskData);
        CourseManager.renderCourses();
        UI.showNotification('已作为任务添加到今日计划', 'success');
        
        // Refresh suggestions
        await this.renderSuggestions();
    }
};

// ===== Task System Manager =====
const TaskManager = {
    // 任务类型：分为课程任务和独立任务
    createTask(taskData) {
        const task = {
            id: Date.now().toString(),
            type: taskData.type, // 'course' 或 'independent'
            title: taskData.title,
            description: taskData.description,
            skill: taskData.skill, // 'listening', 'reading', 'writing', 'speaking'
            estimatedDuration: taskData.estimatedDuration, // 分钟
            dueDate: taskData.dueDate,
            priority: taskData.priority || 'medium', // 'low', 'medium', 'high'
            status: 'pending', // 'pending', 'in_progress', 'completed', 'skipped'
            score: null,
            timeSpent: 0, // 分钟
            startTime: null,
            endTime: null,
            aiGenerated: taskData.aiGenerated || false,
            custom: taskData.custom || false,
            createdAt: new Date().toISOString()
        };
        
        // 根据类型添加到不同的任务列表
        if (taskData.type === 'course') {
            // 课程任务已经由CourseManager管理
            return task;
        } else {
            // 独立任务
            if (taskData.daily) {
                state.tasks.daily.push(task);
            } else {
                state.tasks.custom.push(task);
            }
            Storage.save('tasks', state.tasks);
            CourseManager.renderCourses();
            return task;
        }
    },
    
    startTask(taskId) {
        const task = this.findTask(taskId);
        if (task && task.status === 'pending') {
            task.status = 'in_progress';
            task.startTime = new Date().toISOString();
            Storage.save('tasks', state.tasks);
            CourseManager.renderCourses();
        }
    },
    
    completeTask(taskId, score = null, timeSpent = null) {
        const task = this.findTask(taskId);
        if (task && task.status !== 'completed') {
            task.status = 'completed';
            task.endTime = new Date().toISOString();
            if (score !== null) task.score = score;
            if (timeSpent !== null) task.timeSpent = timeSpent;
            
            // 移动到已完成列表
            const list = this.getTaskList(taskId);
            if (list) {
                const index = list.findIndex(t => t.id === taskId);
                if (index > -1) {
                    const [completedTask] = list.splice(index, 1);
                    state.tasks.completed.push(completedTask);
                    Storage.save('tasks', state.tasks);
                }
            }
            
            // 更新学习进度
            this.updateProgressFromTask(task);
            CourseManager.renderCourses();
            return task;
        }
    },
    
    skipTask(taskId) {
        const task = this.findTask(taskId);
        if (task) {
            task.status = 'skipped';
            Storage.save('tasks', state.tasks);
            CourseManager.renderCourses();
        }
    },
    
    findTask(taskId) {
        // 在所有任务列表中查找
        const allTasks = [
            ...state.tasks.daily,
            ...state.tasks.custom, 
            ...state.tasks.completed
        ];
        return allTasks.find(task => task.id === taskId);
    },
    
    getTaskList(taskId) {
        if (state.tasks.daily.some(t => t.id === taskId)) return state.tasks.daily;
        if (state.tasks.custom.some(t => t.id === taskId)) return state.tasks.custom;
        if (state.tasks.completed.some(t => t.id === taskId)) return state.tasks.completed;
        return null;
    },
    
    updateProgressFromTask(task) {
        // 更新总学习时间
        if (task.timeSpent) {
            state.progress.totalStudyTime += task.timeSpent / 60; // 转换为小时
            state.progress.dailyStudyTime += task.timeSpent / 60;
        }
        
        // 更新技能分数
        if (task.score && task.skill) {
            // 简单的分数更新逻辑，实际应用中可能需要更复杂的算法
            const currentScore = state.progress.skills[task.skill] || 4.0;
            const newScore = Math.min(9.0, Math.max(0, currentScore + (task.score - currentScore) * 0.1));
            state.progress.skills[task.skill] = parseFloat(newScore.toFixed(1));
        }
        
        // 更新统计
        state.progress.totalCompletedCourses = state.tasks.completed.length;
        
        Storage.save('progress', state.progress);
        UI.updateProgressDisplay();
    },
    
    async generateDailyTasks() {
        // 基于学习进度和质检数据生成每日任务
        const qualityData = state.efficiency;
        const focusAreas = qualityData?.improvementAreas || [];
        
        const tasks = [];
        
        // 生成2-3个重点改进任务
        if (focusAreas.length > 0) {
            focusAreas.slice(0, 2).forEach(area => {
                const task = this.createTaskFromFocusArea(area);
                if (task) {
                    task.daily = true;
                    tasks.push(task);
                }
            });
        }
        
        // 生成基础练习任务
        const basicTasks = [
            {
                type: 'independent',
                title: '每日词汇积累',
                description: '学习30个雅思高频词汇',
                skill: 'reading',
                estimatedDuration: 20,
                priority: 'medium',
                daily: true
            },
            {
                type: 'independent', 
                title: '听力精听练习',
                description: '精听一段雅思听力材料并跟读',
                skill: 'listening',
                estimatedDuration: 30,
                priority: 'high',
                daily: true
            }
        ];
        
        basicTasks.forEach(taskData => {
            const task = this.createTask(taskData);
            tasks.push(task);
        });
        
        return tasks;
    },
    
    createTaskFromFocusArea(focusArea) {
        // 根据质检AI的改进建议创建任务
        const areaMap = {
            '听力': { skill: 'listening', type: '听力专项练习' },
            '阅读': { skill: 'reading', type: '阅读技巧训练' },
            '写作': { skill: 'writing', type: '写作结构练习' },
            '口语': { skill: 'speaking', type: '口语流利度训练' }
        };
        
        for (const [key, value] of Object.entries(areaMap)) {
            if (focusArea.includes(key)) {
                return {
                    type: 'independent',
                    title: `${value.type}`,
                    description: `改进${focusArea}`,
                    skill: value.skill,
                    estimatedDuration: 45,
                    priority: 'high',
                    aiGenerated: true,
                    daily: true
                };
            }
        }
        
        return null;
    },
    
    getTaskStatistics() {
        return {
            total: state.tasks.daily.length + state.tasks.custom.length + state.tasks.completed.length,
            completed: state.tasks.completed.length,
            pending: state.tasks.daily.filter(t => t.status === 'pending').length + 
                    state.tasks.custom.filter(t => t.status === 'pending').length,
            inProgress: state.tasks.daily.filter(t => t.status === 'in_progress').length + 
                       state.tasks.custom.filter(t => t.status === 'in_progress').length,
            averageScore: this.calculateAverageScore(),
            totalTimeSpent: state.tasks.completed.reduce((sum, task) => sum + (task.timeSpent || 0), 0)
        };
    },
    
    calculateAverageScore() {
        const completedWithScore = state.tasks.completed.filter(task => task.score !== null);
        if (completedWithScore.length === 0) return null;
        
        const total = completedWithScore.reduce((sum, task) => sum + task.score, 0);
        return parseFloat((total / completedWithScore.length).toFixed(1));
    }
};

// ===== Quality Center Manager =====
const QualityManager = {
    async runQualityCheck() {
        // Collect learning data from state
        const learningData = {
            totalStudyTime: state.progress.totalStudyTime,
            completedTasks: state.tasks.completed.length,
            totalTasks: state.tasks.daily.length + state.tasks.custom.length + state.tasks.completed.length,
            accuracyRate: this.calculateAccuracyRate(),
            skillProgress: state.progress.skills,
            taskStatistics: TaskManager.getTaskStatistics()
        };
        
        // Get AI analysis
        const analysis = await QualityAI.analyzeLearningEfficiency(learningData);
        
        // Update state
        state.efficiency.dailyScore = analysis.score;
        state.efficiency.lastQualityCheck = new Date().toISOString();
        state.efficiency.improvementAreas = analysis.improvements;
        
        // Save weekly trend data
        this.addToWeeklyTrend(analysis.score, learningData.completedTasks);
        
        // Update UI
        this.updateQualityDisplay(analysis, learningData);
        
        // Draw charts
        this.drawEfficiencyTrend();
        this.drawSkillRadar();
        this.updateSkillBreakdown();
        
        // Save to storage
        Storage.save('efficiency', state.efficiency);
        
        return analysis;
    },
    
    addToWeeklyTrend(score, completedTasks) {
        const today = new Date().toISOString().split('T')[0];
        const trend = state.efficiency.weeklyTrend || [];
        
        // Remove today's entry if exists
        const existingIndex = trend.findIndex(t => t.date === today);
        if (existingIndex >= 0) {
            trend.splice(existingIndex, 1);
        }
        
        // Add new entry
        trend.push({
            date: today,
            score: score,
            completedTasks: completedTasks
        });
        
        // Keep only last 7 days
        state.efficiency.weeklyTrend = trend.slice(-7);
    },
    
    calculateAccuracyRate() {
        // Simple accuracy calculation based on completed tasks
        if (state.tasks.completed.length === 0) return 75; // Default
        
        // In a real app, this would be based on actual task accuracy
        // For now, use a simple calculation
        return Math.min(95, 75 + Math.floor(state.tasks.completed.length / 10) * 5);
    },
    
    updateQualityDisplay(analysis, learningData) {
        // Update efficiency score
        const scoreEl = document.getElementById('efficiency-score');
        if (scoreEl) {
            scoreEl.textContent = analysis.score;
        }
        
        // Update efficiency circle visualization
        const circle = document.getElementById('efficiency-circle');
        if (circle) {
            const circumference = 364; // 2 * PI * 58
            const offset = circumference - (analysis.score / 100) * circumference;
            circle.style.strokeDashoffset = offset;
            
            // Update color based on score
            const color = this.getScoreColor(analysis.score);
            circle.style.stroke = color;
        }
        
        // Update completion rate
        const completionRate = learningData.totalTasks > 0 
            ? Math.round((learningData.completedTasks / learningData.totalTasks) * 100)
            : 0;
        const completionEl = document.getElementById('completion-rate');
        if (completionEl) {
            completionEl.textContent = `${completionRate}%`;
        }
        
        // Update accuracy rate
        const accuracyEl = document.getElementById('accuracy-rate');
        if (accuracyEl) {
            accuracyEl.textContent = `${learningData.accuracyRate}%`;
        }
        
        // Update time efficiency (hours per day)
        const avgHoursPerDay = state.progress.studyDays > 0 
            ? (state.progress.totalStudyTime / state.progress.studyDays).toFixed(1)
            : '0.0';
        const timeEl = document.getElementById('time-efficiency');
        if (timeEl) {
            timeEl.textContent = `${avgHoursPerDay}小时`;
        }
        
        // Update analysis content
        const analysisContent = document.getElementById('quality-analysis-content');
        if (analysisContent) {
            analysisContent.innerHTML = `
                <div class="quality-analysis-result">
                    <div class="analysis-header">
                        <span class="analysis-score" style="color: ${this.getScoreColor(analysis.score)}; font-size: 1.5rem; font-weight: 700;">${analysis.score}</span>
                        <span class="analysis-max">/100 分</span>
                    </div>
                    <p class="analysis-time" style="color: var(--color-text-secondary); font-size: 0.8125rem; margin: var(--spacing-sm) 0;">
                        分析时间：${new Date().toLocaleString('zh-CN')}
                    </p>
                    <div class="analysis-summary" style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: white; border-radius: var(--radius-md);">
                        <p style="font-size: 1rem; color: var(--color-primary); font-weight: 500;">${this.getSummaryText(analysis.score)}</p>
                    </div>
                </div>
            `;
        }
        
        // Update strengths list
        const strengthsList = document.getElementById('strengths-list');
        if (strengthsList) {
            strengthsList.innerHTML = analysis.strengths.length > 0 
                ? analysis.strengths.map(strength => `<li>${strength}</li>`).join('')
                : '<li class="loading-item">暂无数据</li>';
        }
        
        // Update improvements list
        const improvementsList = document.getElementById('improvements-list');
        if (improvementsList) {
            improvementsList.innerHTML = analysis.improvements.length > 0
                ? analysis.improvements.map(improvement => `<li>${improvement}</li>`).join('')
                : '<li class="loading-item">暂无数据</li>';
        }
        
        // Update recommendations list
        const recommendationsList = document.getElementById('recommendations-list');
        if (recommendationsList) {
            recommendationsList.innerHTML = analysis.recommendations.length > 0
                ? analysis.recommendations.map(recommendation => `<li>${recommendation}</li>`).join('')
                : '<li class="loading-item">暂无数据</li>';
        }
    },
    
    getScoreColor(score) {
        if (score >= 90) return '#4CAF50';
        if (score >= 80) return '#8BC34A';
        if (score >= 70) return '#FFC107';
        if (score >= 60) return '#FF9800';
        return '#F44336';
    },
    
    getSummaryText(score) {
        if (score >= 90) return "🌟 优秀！你的学习效率非常高，继续保持！";
        if (score >= 80) return "👍 良好！学习效率不错，仍有提升空间。";
        if (score >= 70) return "📊 中等！学习效率一般，需要改进。";
        if (score >= 60) return "⚠️ 需要改进！学习效率较低，请关注改进建议。";
        return "🚨 急需改进！学习效率很低，请认真对待改进建议。";
    },
    
    drawEfficiencyTrend() {
        const canvas = document.getElementById('efficiency-trend-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;
        const padding = { top: 20, right: 20, bottom: 30, left: 40 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Get trend data
        const trend = state.efficiency.weeklyTrend || [];
        if (trend.length === 0) {
            // Draw empty state
            ctx.fillStyle = '#999';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无趋势数据', width / 2, height / 2);
            return;
        }
        
        // Fill missing days with placeholder data
        const displayData = this.fillTrendData(trend);
        
        // Draw grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            // Y-axis labels
            ctx.fillStyle = '#666';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            const value = 100 - (i * 20);
            ctx.fillText(value.toString(), padding.left - 5, y + 4);
        }
        
        // Draw X-axis labels
        displayData.forEach((item, index) => {
            const x = padding.left + (chartWidth / (displayData.length - 1)) * index;
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const date = new Date(item.date);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            ctx.fillText(label, x, height - 10);
        });
        
        // Draw score line
        if (displayData.length > 1) {
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            displayData.forEach((item, index) => {
                const x = padding.left + (chartWidth / (displayData.length - 1)) * index;
                const y = padding.top + chartHeight - (item.score / 100) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
            
            // Draw points
            displayData.forEach((item, index) => {
                const x = padding.left + (chartWidth / (displayData.length - 1)) * index;
                const y = padding.top + chartHeight - (item.score / 100) * chartHeight;
                
                ctx.fillStyle = '#2196F3';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    },
    
    fillTrendData(trend) {
        // If less than 7 days, fill with placeholder data
        if (trend.length >= 7) return trend;
        
        const result = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const existing = trend.find(t => t.date === dateStr);
            if (existing) {
                result.push(existing);
            } else {
                result.push({
                    date: dateStr,
                    score: 60 + Math.random() * 20, // Random score between 60-80 for demo
                    completedTasks: Math.floor(Math.random() * 5)
                });
            }
        }
        
        return result;
    },
    
    drawSkillRadar() {
        const canvas = document.getElementById('skill-radar-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;
        const centerX = width / 2;
        const centerY = height / 2 + 10;
        const radius = Math.min(width, height) / 2 - 30;
        
        const skills = [
            { name: '听力', key: 'listening', emoji: '🎧' },
            { name: '阅读', key: 'reading', emoji: '📖' },
            { name: '写作', key: 'writing', emoji: '✍️' },
            { name: '口语', key: 'speaking', emoji: '🗣️' }
        ];
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background grid
        const levels = 3;
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= levels; i++) {
            const levelRadius = (radius / levels) * i;
            ctx.beginPath();
            for (let j = 0; j < skills.length; j++) {
                const angle = (Math.PI * 2 / skills.length) * j - Math.PI / 2;
                const x = centerX + Math.cos(angle) * levelRadius;
                const y = centerY + Math.sin(angle) * levelRadius;
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // Draw axis lines
        for (let i = 0; i < skills.length; i++) {
            const angle = (Math.PI * 2 / skills.length) * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.strokeStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Draw labels
            const labelX = centerX + Math.cos(angle) * (radius + 20);
            const labelY = centerY + Math.sin(angle) * (radius + 20);
            
            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(skills[i].emoji, labelX, labelY - 8);
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.fillText(skills[i].name, labelX, labelY + 6);
        }
        
        // Draw data
        const scores = skills.map(skill => state.progress.skills[skill.key] || 4.0);
        const maxScore = 9.0;
        
        ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < skills.length; i++) {
            const angle = (Math.PI * 2 / skills.length) * i - Math.PI / 2;
            const score = scores[i];
            const r = (score / maxScore) * radius;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw points
        for (let i = 0; i < skills.length; i++) {
            const angle = (Math.PI * 2 / skills.length) * i - Math.PI / 2;
            const score = scores[i];
            const r = (score / maxScore) * radius;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            
            ctx.fillStyle = '#2196F3';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    
    updateSkillBreakdown() {
        const container = document.getElementById('skill-breakdown-list');
        if (!container) return;
        
        const skills = [
            { name: '听力', key: 'listening', emoji: '🎧', color: '#4CAF50' },
            { name: '阅读', key: 'reading', emoji: '📖', color: '#2196F3' },
            { name: '写作', key: 'writing', emoji: '✍️', color: '#FF9800' },
            { name: '口语', key: 'speaking', emoji: '🗣️', color: '#9C27B0' }
        ];
        
        container.innerHTML = skills.map(skill => {
            const score = state.progress.skills[skill.key] || 4.0;
            const percentage = (score / 9.0) * 100;
            
            return `
                <div class="skill-breakdown-item">
                    <span class="skill-breakdown-emoji">${skill.emoji}</span>
                    <div class="skill-breakdown-info">
                        <div style="display: flex; justify-content: space-between;">
                            <span class="skill-breakdown-name">${skill.name}</span>
                            <span class="skill-breakdown-score">${score.toFixed(1)}分</span>
                        </div>
                        <div class="skill-breakdown-bar">
                            <div class="skill-breakdown-fill" style="width: ${percentage}%; background: ${skill.color};"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    init() {
        // Load saved efficiency data
        const savedEfficiency = Storage.load('efficiency');
        if (savedEfficiency) {
            state.efficiency = savedEfficiency;
        }
        
        // Initialize quality center display
        this.updateInitialDisplay();
    },
    
    updateInitialDisplay() {
        // Set initial values based on state
        const scoreEl = document.getElementById('efficiency-score');
        if (scoreEl) {
            scoreEl.textContent = state.efficiency.dailyScore || 75;
        }
        
        const circle = document.getElementById('efficiency-circle');
        if (circle) {
            const score = state.efficiency.dailyScore || 75;
            const circumference = 364; // 2 * PI * 58
            const offset = circumference - (score / 100) * circumference;
            circle.style.strokeDashoffset = offset;
            circle.style.stroke = this.getScoreColor(score);
        }
        
        // Calculate and display initial values
        const completionRate = this.calculateCompletionRate();
        const completionEl = document.getElementById('completion-rate');
        if (completionEl) {
            completionEl.textContent = `${completionRate}%`;
        }
        
        const accuracyRate = this.calculateAccuracyRate();
        const accuracyEl = document.getElementById('accuracy-rate');
        if (accuracyEl) {
            accuracyEl.textContent = `${accuracyRate}%`;
        }
        
        const avgHoursPerDay = state.progress.studyDays > 0 
            ? (state.progress.totalStudyTime / state.progress.studyDays).toFixed(1)
            : '0.0';
        const timeEl = document.getElementById('time-efficiency');
        if (timeEl) {
            timeEl.textContent = `${avgHoursPerDay}小时`;
        }
        
        // Draw initial charts
        setTimeout(() => {
            this.drawEfficiencyTrend();
            this.drawSkillRadar();
            this.updateSkillBreakdown();
        }, 100);
    },
    
    calculateCompletionRate() {
        const totalTasks = state.tasks.daily.length + state.tasks.custom.length + state.tasks.completed.length;
        if (totalTasks === 0) return 0;
        
        return Math.round((state.tasks.completed.length / totalTasks) * 100);
    }
};

// ===== Custom Course Manager =====

const CustomCourseManager = {
    init() {
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        document.getElementById('create-custom-course').addEventListener('click', () => {
            UI.openModal('custom-course-modal');
        });
        
        document.getElementById('save-custom-course').addEventListener('click', () => {
            this.saveCustomCourse();
        });
        
        document.querySelectorAll('.quick-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openQuickAddModal(btn.dataset.period);
            });
        });
    },
    
    saveCustomCourse() {
        const type = document.getElementById('custom-type').value;
        const title = document.getElementById('custom-title').value;
        const goal = document.getElementById('custom-goal').value;
        const duration = parseInt(document.getElementById('custom-duration').value);
        const difficulty = parseInt(document.getElementById('custom-difficulty').value);
        const tasksText = document.getElementById('custom-tasks').value;
        
        if (!title || !goal) {
            UI.showNotification('请填写课程标题和学习目标', 'warning');
            return;
        }
        
        const tasks = tasksText.split('\n').filter(task => task.trim());
        if (tasks.length === 0) {
            UI.showNotification('请至少添加一个任务', 'warning');
            return;
        }
        
        const typeEmojis = {
            listening: '🎧',
            reading: '📖',
            writing: '✍️',
            speaking: '🗣️'
        };
        
        const customCourse = {
            emoji: typeEmojis[type],
            title: title,
            goal: goal,
            duration: duration,
            difficulty: difficulty,
            tasks: tasks,
            type: type,
            custom: true
        };
        
        // Add to materials library
        MaterialManager.addMaterial({
            name: title,
            type: type,
            difficulty: difficulty,
            content: `学习目标：${goal}\n\n任务：\n${tasks.map(task => `• ${task}`).join('\n')}`
        });
        
        UI.closeModal('custom-course-modal');
        UI.showNotification('自定义课程已保存到课程库', 'success');
        
        // Clear form
        document.getElementById('custom-title').value = '';
        document.getElementById('custom-goal').value = '';
        document.getElementById('custom-tasks').value = '';
    },
    
    openQuickAddModal(period) {
        // For now, just create a simple default course
        const courseId = state.courses.length > 0 
            ? Math.max(...state.courses.map(c => c.id)) + 1 
            : 1;
        
        const defaultCourses = {
            morning: {
                emoji: "📖",
                title: "晨读练习",
                goal: "提高阅读理解能力",
                duration: 30,
                difficulty: 2,
                tasks: ["阅读一篇文章", "完成理解题", "记录生词"]
            },
            afternoon: {
                emoji: "✍️",
                title: "写作训练",
                goal: "练习写作结构与表达",
                duration: 45,
                difficulty: 3,
                tasks: ["完成一篇写作", "自我检查语法", "优化表达"]
            },
            evening: {
                emoji: "🎧",
                title: "晚间听力",
                goal: "提高听力理解能力",
                duration: 25,
                difficulty: 2,
                tasks: ["听一段材料", "完成练习题", "总结大意"]
            }
        };
        
        const newCourse = {
            id: courseId,
            period: period,
            ...defaultCourses[period],
            type: 'course',
            completed: false,
            skipped: false
        };
        
        state.courses.push(newCourse);
        Storage.save('todayCourses', state.courses);
        CourseManager.renderCourses();
        UI.showNotification(`已添加到${this.getPeriodText(period)}时段`, 'success');
    },
    
    getPeriodText(period) {
        switch(period) {
            case 'morning': return '上午';
            case 'afternoon': return '下午';
            case 'evening': return '晚上';
            default: return '';
        }
    }
};

// ===== Schedule Manager =====
const ScheduleManager = {
    defaultBlocks: {
        morning: [
            { id: 'morning-1', time: '09:00-10:00', content: '听力练习', skill: 'listening', completed: false },
            { id: 'morning-2', time: '10:15-11:15', content: '阅读训练', skill: 'reading', completed: false },
            { id: 'morning-3', time: '11:30-12:00', content: '词汇积累', skill: 'reading', completed: false }
        ],
        afternoon: [
            { id: 'afternoon-1', time: '14:00-15:30', content: '写作练习', skill: 'writing', completed: false },
            { id: 'afternoon-2', time: '15:45-16:45', content: '口语训练', skill: 'speaking', completed: false },
            { id: 'afternoon-3', time: '17:00-17:30', content: '复习总结', skill: 'reading', completed: false }
        ]
    },

    load() {
        const saved = Storage.load('scheduleBlocks');
        if (saved && saved.morning && saved.afternoon) return saved;
        return JSON.parse(JSON.stringify(this.defaultBlocks));
    },

    save(blocks) {
        Storage.save('scheduleBlocks', blocks);
    },

    render() {
        const blocks = this.load();
        ['morning', 'afternoon'].forEach(period => {
            const container = document.getElementById(`${period}-blocks`);
            if (!container) return;
            container.innerHTML = '';
            blocks[period].forEach(block => container.appendChild(this.createBlockElement(block)));
        });
        this.updateProgressRing();
    },

    createBlockElement(block) {
        const skillEmoji = { listening: '🎧', reading: '📖', writing: '✍️', speaking: '🗣️' };
        const skillOrder = ['listening', 'reading', 'writing', 'speaking'];
        const div = document.createElement('div');
        div.className = `schedule-block${block.completed ? ' completed' : ''}`;
        div.dataset.blockId = block.id;

        const checkSvg = block.completed
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="2,7 5.5,11 12,3"/></svg>`
            : '';

        div.innerHTML = `
            <div class="block-check" role="button" aria-label="标记完成">${checkSvg}</div>
            <div class="block-body">
                <span class="block-time" contenteditable="true" data-field="time" spellcheck="false">${block.time}</span>
                <span class="block-content" contenteditable="true" data-field="content" spellcheck="false">${block.content}</span>
            </div>
            <span class="block-skill-badge" data-skill="${block.skill}" title="点击切换技能类型">${skillEmoji[block.skill] || '📝'}</span>
            <button class="block-delete-btn" title="删除此任务" aria-label="删除">×</button>
        `;

        div.querySelector('.block-check').addEventListener('click', () => this.toggleBlock(block.id));

        div.querySelector('.block-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteBlock(block.id);
        });

        const badge = div.querySelector('.block-skill-badge');
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            const current = badge.dataset.skill;
            const idx = skillOrder.indexOf(current);
            const next = skillOrder[(idx + 1) % skillOrder.length];
            badge.dataset.skill = next;
            badge.textContent = skillEmoji[next];
            this.updateBlockField(block.id, 'skill', next);
        });

        div.querySelectorAll('[contenteditable]').forEach(el => {
            el.addEventListener('blur', () => {
                const val = el.textContent.trim();
                if (val) this.updateBlockField(block.id, el.dataset.field, val);
            });
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
            });
        });

        return div;
    },

    toggleBlock(blockId) {
        const blocks = this.load();
        const period = blockId.startsWith('morning') ? 'morning' : 'afternoon';
        const block = blocks[period].find(b => b.id === blockId);
        if (block) {
            block.completed = !block.completed;
            this.save(blocks);
            this.render();
            StreakManager.recordActivity();
        }
    },

    updateBlockField(blockId, field, value) {
        const blocks = this.load();
        const period = blockId.startsWith('morning') ? 'morning' : 'afternoon';
        const block = blocks[period].find(b => b.id === blockId);
        if (block) {
            block[field] = value;
            this.save(blocks);
        }
    },

    updateProgressRing() {
        const blocks = this.load();
        const all = [...blocks.morning, ...blocks.afternoon];
        const completed = all.filter(b => b.completed).length;
        const total = all.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        const circle = document.getElementById('daily-progress-circle');
        const label = document.getElementById('daily-percent');
        const countEl = document.getElementById('completed-count');

        if (circle) {
            const circumference = 314.16;
            circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
            circle.style.transition = 'stroke-dashoffset 0.5s ease';
        }
        if (label) label.textContent = `${pct}%`;
        if (countEl) countEl.textContent = completed;
    },

    deleteBlock(blockId) {
        const blocks = this.load();
        const period = blockId.startsWith('morning') ? 'morning' : 'afternoon';
        blocks[period] = blocks[period].filter(b => b.id !== blockId);
        this.save(blocks);
        this.render();
    },

    addBlock(period, blockData) {
        const blocks = this.load();
        blocks[period].push({
            id: `${period}-${Date.now()}`,
            time: blockData.time || (period === 'morning' ? '09:00-10:00' : '14:00-15:00'),
            content: blockData.content || '自定义任务',
            skill: blockData.skill || 'reading',
            completed: false
        });
        this.save(blocks);
        this.render();
    }
};

// ===== Streak Manager =====
const StreakManager = {
    recordActivity() {
        const today = new Date().toISOString().split('T')[0];
        const history = Storage.load('activityHistory') || {};
        const blocks = ScheduleManager.load();
        const all = [...blocks.morning, ...blocks.afternoon];
        history[today] = all.filter(b => b.completed).length;
        Storage.save('activityHistory', history);

        const streak = this.calculateStreak(history);
        state.progress.currentStreak = streak;
        if (streak > state.progress.longestStreak) state.progress.longestStreak = streak;
        Storage.save('progress', state.progress);

        const el = document.getElementById('streak-count');
        if (el) el.textContent = streak;
        this.renderHeatmap();
    },

    calculateStreak(history) {
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            if (history[key] && history[key] > 0) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        return streak;
    },

    renderHeatmap() {
        const container = document.getElementById('streak-heatmap');
        if (!container) return;
        const history = Storage.load('activityHistory') || {};
        const today = new Date();
        const cells = [];
        for (let i = 83; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const count = history[key] || 0;
            const level = count === 0 ? 0 : count <= 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
            const label = `${d.getMonth()+1}/${d.getDate()}: ${count}项`;
            cells.push(`<div class="heatmap-cell level-${level}" title="${label}"></div>`);
        }
        container.innerHTML = cells.join('');
    }
};

// ===== Weekly Plan Manager =====
const WeeklyPlanManager = {
    render() {
        const container = document.getElementById('weekly-plan-grid');
        if (!container) return;
        const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
        const todayDow = new Date().getDay(); // 0=Sun
        const plan = Storage.load('weeklyPlan') || {};
        container.innerHTML = dayLabels.map((label, i) => {
            const dayKey = `day-${i}`;
            const isToday = i === (todayDow === 0 ? 6 : todayDow - 1);
            return `<div class="weekly-day${isToday ? ' today' : ''}">
                <span class="weekly-day-label">${label}</span>
                <textarea class="weekly-day-input" data-day="${dayKey}" placeholder="目标">${plan[dayKey] || ''}</textarea>
            </div>`;
        }).join('');

        container.querySelectorAll('.weekly-day-input').forEach(el => {
            el.addEventListener('blur', () => {
                const p = Storage.load('weeklyPlan') || {};
                p[el.dataset.day] = el.value;
                Storage.save('weeklyPlan', p);
            });
        });
    }
};

// ===== Notebook Manager =====
const NotebookManager = {
    currentNoteId: null,

    load() {
        return Storage.load('notebooks') || [];
    },

    save(notes) {
        Storage.save('notebooks', notes);
    },

    newNote() {
        const notes = this.load();
        const note = {
            id: `note-${Date.now()}`,
            title: '新笔记',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        notes.unshift(note);
        this.save(notes);
        this.renderList();
        this.openNote(note.id);
    },

    openNote(id) {
        this.currentNoteId = id;
        const notes = this.load();
        const note = notes.find(n => n.id === id);
        if (!note) return;

        document.getElementById('note-editor-placeholder').style.display = 'none';
        document.getElementById('note-editor').style.display = 'flex';
        document.getElementById('note-title-input').value = note.title;
        document.getElementById('note-content-input').value = note.content;
        const d = new Date(note.updatedAt);
        document.getElementById('note-meta').textContent = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;

        document.querySelectorAll('.note-list-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.note-list-item[data-note-id="${id}"]`);
        if (activeItem) activeItem.classList.add('active');
    },

    saveCurrentNote() {
        if (!this.currentNoteId) return;
        const notes = this.load();
        const note = notes.find(n => n.id === this.currentNoteId);
        if (!note) return;
        note.title = document.getElementById('note-title-input').value.trim() || '未命名笔记';
        note.content = document.getElementById('note-content-input').value;
        note.updatedAt = new Date().toISOString();
        this.save(notes);
        this.renderList();
        const d = new Date(note.updatedAt);
        document.getElementById('note-meta').textContent = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
        UI.showNotification('笔记已保存', 'success');
    },

    deleteCurrentNote() {
        if (!this.currentNoteId) return;
        if (!confirm('确定要删除这条笔记吗？')) return;
        let notes = this.load();
        notes = notes.filter(n => n.id !== this.currentNoteId);
        this.save(notes);
        this.currentNoteId = null;
        document.getElementById('note-editor').style.display = 'none';
        document.getElementById('note-editor-placeholder').style.display = '';
        this.renderList();
        UI.showNotification('笔记已删除', 'info');
    },

    renderList() {
        const container = document.getElementById('note-list');
        if (!container) return;
        const notes = this.load();
        if (notes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>还没有笔记</p></div>';
            return;
        }
        container.innerHTML = notes.map(note => {
            const d = new Date(note.updatedAt);
            const dateStr = `${d.getMonth()+1}/${d.getDate()}`;
            const preview = note.content.replace(/\n/g, ' ').slice(0, 40) || '（空内容）';
            const active = note.id === this.currentNoteId ? ' active' : '';
            return `<div class="note-list-item${active}" data-note-id="${note.id}">
                <div class="note-item-title">${note.title}</div>
                <div class="note-item-preview">${preview}</div>
                <div class="note-item-date">${dateStr}</div>
            </div>`;
        }).join('');

        container.querySelectorAll('.note-list-item').forEach(el => {
            el.addEventListener('click', () => this.openNote(el.dataset.noteId));
        });
    },

    init() {
        this.renderList();
        document.getElementById('new-note-btn')?.addEventListener('click', () => this.newNote());
        document.getElementById('save-note-btn')?.addEventListener('click', () => this.saveCurrentNote());
        document.getElementById('delete-note-btn')?.addEventListener('click', () => this.deleteCurrentNote());

        // Auto-save on Ctrl+S
        document.getElementById('note-content-input')?.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentNote();
            }
        });
    }
};

// ===== UI Manager =====
const UI = {
    init() {
        this.setupAuthListeners();
        this.setupNavigationListeners();
        this.setupModalListeners();
        this.setupChatListeners();
        this.setupMaterialListeners();
        this.setupSettingsListeners();
        this.setupPlannerListeners();
        
        DragDropManager.init();
        CustomCourseManager.init();
        QualityManager.init();
        
        // Initialize task system with some default tasks
        this.initializeDefaultTasks();
        
        this.loadAISuggestions();
        
        // Check API status
        this.checkAPIStatus();
        
        // Check if user is already logged in
        const savedUser = Storage.load('user');
        if (savedUser) {
            this.login(savedUser.email);
        }
    },
    
    async checkAPIStatus() {
        const statusEl = document.getElementById('api-status');
        if (!statusEl) return;
        
        statusEl.className = 'api-status checking';
        statusEl.querySelector('.api-status-text').textContent = '检查中...';
        
        try {
            // Try a simple API call
            const response = await fetch(CONFIG.zhipuApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.settings.apiKey || CONFIG.zhipuApiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.zhipuModel,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 5
                })
            });
            
            if (response.ok) {
                statusEl.className = 'api-status online';
                statusEl.querySelector('.api-status-text').textContent = '智谱AI在线';
                console.log('✅ 智谱AI API连接正常');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.warn('API status check failed:', response.status, errorData);
                statusEl.className = 'api-status offline';
                statusEl.querySelector('.api-status-text').textContent = 'API离线(演示模式)';
            }
        } catch (error) {
            console.warn('API status check error:', error);
            statusEl.className = 'api-status offline';
            statusEl.querySelector('.api-status-text').textContent = 'API离线(演示模式)';
        }
    },
    
    initializeDefaultTasks() {
        // Add some default tasks if none exist
        if (state.tasks.daily.length === 0 && state.tasks.custom.length === 0) {
            const defaultTasks = [
                {
                    type: 'independent',
                    title: '听力练习作业',
                    description: '完成剑桥雅思听力Section 1练习',
                    skill: 'listening',
                    estimatedDuration: 30,
                    priority: 'high',
                    daily: true
                },
                {
                    type: 'independent',
                    title: '阅读作业',
                    description: '完成一篇雅思阅读文章并回答问题',
                    skill: 'reading',
                    estimatedDuration: 40,
                    priority: 'medium',
                    daily: true
                }
            ];
            
            defaultTasks.forEach(taskData => {
                TaskManager.createTask(taskData);
            });
        }
    },
    
    setupAuthListeners() {
        document.getElementById('demo-btn').addEventListener('click', () => {
            this.login('demo@user.com');
        });
        
        document.getElementById('login-btn').addEventListener('click', () => {
            const email = document.getElementById('email').value;
            if (email) {
                this.login(email);
            }
        });
        
        document.getElementById('register-btn').addEventListener('click', () => {
            const email = document.getElementById('email').value;
            if (email) {
                this.login(email);
            }
        });
    },
    
    setupNavigationListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.switchView(view);
            });
        });
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
        
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });
        
        // API status indicator click to recheck
        const apiStatusEl = document.getElementById('api-status');
        if (apiStatusEl) {
            apiStatusEl.addEventListener('click', () => {
                this.checkAPIStatus();
                this.showNotification('正在重新检查API状态...', 'info');
            });
        }
    },
    
    setupModalListeners() {
        document.querySelectorAll('.modal').forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal(modal.id);
                });
            }
            
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    this.closeModal(modal.id);
                });
            }
        });
    },
    
    setupChatListeners() {
        document.getElementById('new-conversation-btn').addEventListener('click', () => {
            ConversationManager.createConversation();
        });
        
        document.getElementById('send-message-btn').addEventListener('click', () => {
            this.sendChatMessage();
        });
        
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
        
        document.getElementById('delete-conversation-btn').addEventListener('click', () => {
            if (state.currentConversation) {
                ConversationManager.deleteConversation(state.currentConversation.id);
            }
        });
        
        // 图片上传功能
        const imageUpload = document.getElementById('image-upload');
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                this.handleImageUpload(e);
            });
        }
    },
    
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!state.currentConversation) {
            ConversationManager.createConversation('图片批改');
        }
        
        // 显示图片预览
        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;
            
            // 添加图片消息到对话
            const userMessage = {
                role: 'user',
                content: '[图片上传] 已上传图片，正在进行AI批改分析...',
                imageData: imageData,
                timestamp: new Date().toISOString()
            };
            
            state.currentConversation.messages.push(userMessage);
            ConversationManager.renderMessages();
            
            // 显示加载状态
            this.showNotification('正在分析图片...', 'info');
            
            try {
                // 使用GradingAI进行图片批改
                const imageNote = prompt('请描述图片内容（例如：这是剑桥雅思阅读Test 1 Passage 1的练习题）：') || '阅读材料';
                
                const result = await GradingAI.gradeImageSubmission('图片作业', imageNote, imageData);
                
                // 构建AI回复
                const aiResponse = `## 📷 图片批改分析

### 材料分析
${result.materialAnalysis}

### 常见问题
${result.commonQuestions.map(q => `- ${q}`).join('\n')}

### 阅读技巧建议
${result.readingTips.map(t => `- ${t}`).join('\n')}

### 推荐练习
${result.practiceRecommendations.map(p => `- ${p}`).join('\n')}

---
💡 **提示**：如有具体题目需要批改，请在图片中标注题号并说明你的答案。`;
                
                const aiMessage = {
                    role: 'ai',
                    content: aiResponse,
                    timestamp: new Date().toISOString()
                };
                
                state.currentConversation.messages.push(aiMessage);
                Storage.save('conversations', state.conversations);
                ConversationManager.renderMessages();
                ConversationManager.renderConversations();
                
                this.showNotification('图片分析完成！', 'success');
            } catch (error) {
                console.error('Image grading error:', error);
                
                const errorMessage = {
                    role: 'ai',
                    content: '抱歉，图片分析过程中出现错误。请确保图片格式正确（JPG/PNG），然后重试。',
                    timestamp: new Date().toISOString()
                };
                
                state.currentConversation.messages.push(errorMessage);
                Storage.save('conversations', state.conversations);
                ConversationManager.renderMessages();
                
                this.showNotification('图片分析失败，请重试', 'error');
            }
        };
        
        reader.readAsDataURL(file);
        
        // 清空input以便可以重复选择同一文件
        event.target.value = '';
    },
    
    setupMaterialListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                MaterialManager.renderMaterials(btn.dataset.filter);
            });
        });
    },
    
    setupSettingsListeners() {
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            state.settings.currentLevel = parseFloat(document.getElementById('setting-current-level').value);
            state.settings.targetScore = parseFloat(document.getElementById('setting-target-score').value);
            state.settings.classDays = document.getElementById('setting-class-days').value
                .split(',')
                .map(d => parseInt(d.trim()))
                .filter(d => !isNaN(d));
            
            const apiKey = document.getElementById('setting-api-key').value;
            if (apiKey) {
                state.settings.apiKey = apiKey;
                CONFIG.zhipuApiKey = apiKey;
            }

            Storage.save('settings', state.settings);
            this.updateProgressDisplay();
            this.closeModal('settings-modal');
            this.showNotification('设置已保存', 'success');
        });
        
        // Quality center run button
        document.getElementById('run-quality-check').addEventListener('click', async () => {
            UI.showNotification('正在运行质检分析...', 'info');
            await QualityManager.runQualityCheck();
            UI.showNotification('质检分析完成！', 'success');
        });
    },
    
    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        
        if (!content) return;
        
        input.value = '';
        await ConversationManager.sendMessage(content);
    },
    
    login(email) {
        state.user = { email };
        Storage.save('user', state.user);
        
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        
        this.loadAppData();
    },
    
    logout() {
        if (confirm('确定要退出登录吗？')) {
            state.user = null;
            Storage.remove('user');
            
            document.getElementById('app-screen').classList.remove('active');
            document.getElementById('auth-screen').classList.add('active');
        }
    },
    
    async loadAppData() {
        // Load saved data
        const savedProgress = Storage.load('progress');
        if (savedProgress) {
            state.progress = savedProgress;
        }
        
        const savedSettings = Storage.load('settings');
        if (savedSettings) {
            state.settings = { ...state.settings, ...savedSettings };
            if (state.settings.apiKey) CONFIG.zhipuApiKey = state.settings.apiKey;
        }
        
        const savedTasks = Storage.load('tasks');
        if (savedTasks) {
            state.tasks = savedTasks;
        }
        
        state.conversations = Storage.load('conversations', []);
        state.materials = Storage.load('materials', []);
        
        // Check if we need to generate new courses
        const savedDate = Storage.load('coursesDate');
        const today = new Date().toDateString();
        
        if (savedDate === today) {
            state.courses = Storage.load('todayCourses', []);
            CourseManager.renderCourses();
        } else {
            await CourseManager.generateDailyCourses();
        }
        
        this.updateProgressDisplay();
        ConversationManager.renderConversations();
        MaterialManager.renderMaterials();
        this.updateDate();

        // New visual managers
        ScheduleManager.render();
        StreakManager.renderHeatmap();
        WeeklyPlanManager.render();
        NotebookManager.init();
        const actHistory = Storage.load('activityHistory') || {};
        const streakEl = document.getElementById('streak-count');
        if (streakEl) streakEl.textContent = StreakManager.calculateStreak(actHistory);
    },
    
    updateProgressDisplay() {
        document.getElementById('study-day-count').textContent = state.progress.studyDays;
        
        // Progress view
        document.getElementById('total-study-days').textContent = state.progress.studyDays;
        document.getElementById('total-completed-courses').textContent = state.progress.totalCompletedCourses;
        document.getElementById('longest-streak').textContent = state.progress.longestStreak;
        document.getElementById('total-study-time').textContent = `${state.progress.totalStudyTime.toFixed(1)}小时`;
        
        // Skill scores
        document.getElementById('listening-score').textContent = state.progress.skills.listening.toFixed(1);
        document.getElementById('reading-score').textContent = state.progress.skills.reading.toFixed(1);
        document.getElementById('writing-score').textContent = state.progress.skills.writing.toFixed(1);
        document.getElementById('speaking-score').textContent = state.progress.skills.speaking.toFixed(1);
        
        // Update progress bars
        this.updateSkillBars();
    },
    
    updateSkillBars() {
        const skills = ['listening', 'reading', 'writing', 'speaking'];
        skills.forEach(skill => {
            const score = state.progress.skills[skill];
            const percentage = (score / 9) * 100;
            const bar = document.querySelector(`#${skill}-score`).closest('.skill-bar').querySelector('.bar-fill');
            if (bar) {
                bar.style.width = `${percentage}%`;
            }
        });
    },
    
    updateDate() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        const dateStr = now.toLocaleDateString('zh-CN', options);
        document.getElementById('current-date').textContent = dateStr;
    },
    
    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        
        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        const viewElement = document.getElementById(`${viewName}-view`);
        if (viewElement) {
            viewElement.classList.add('active');
            state.currentView = viewName;
            
            // Refresh content for specific views
            if (viewName === 'course-library') {
                MaterialManager.renderMaterials();
            } else if (viewName === 'quality-center') {
                requestAnimationFrame(() => QualityManager.updateInitialDisplay());
            } else if (viewName === 'notebook') {
                NotebookManager.renderList();
            }
        }
    },
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    openSettings() {
        document.getElementById('setting-current-level').value = state.settings.currentLevel;
        document.getElementById('setting-target-score').value = state.settings.targetScore;
        document.getElementById('setting-class-days').value = state.settings.classDays.join(',');
        document.getElementById('setting-api-key').value = state.settings.apiKey || '';
        
        this.openModal('settings-modal');
    },
    
    showNotification(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('toast-show'), 10);
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    showLoading(button) {
        if (!button) return;
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = '<span class="loading"></span>';
    },
    
    hideLoading(button) {
        if (!button) return;
        button.disabled = false;
        button.textContent = button.dataset.originalText;
    },
    
    setupPlannerListeners() {
        // Ask AI to generate plan
        document.getElementById('ask-ai-plan').addEventListener('click', async () => {
            if (!confirm('确定要让AI重新生成今日计划吗？当前进度将被清除。')) return;
            const btn = document.getElementById('ask-ai-plan');
            this.showLoading(btn);
            try {
                const level = state.settings.currentLevel;
                const target = state.settings.targetScore;
                const prompt = `你是雅思学习规划师。请为一个当前水平${level}分、目标${target}分的学生生成今天的学习计划。
请严格按JSON格式返回，包含morning和afternoon两个数组，每个数组3个对象，每个对象包含：
- time: 时间段字符串（如"09:00-10:00"）
- content: 任务名称（简短，10字内）
- skill: 技能类型（只能是listening/reading/writing/speaking之一）

只返回JSON，不要其他文字。示例：
{"morning":[{"time":"09:00-10:00","content":"听力练习","skill":"listening"},...],"afternoon":[...]}`;
                const result = await AIBase.generateContent(prompt);
                let plan = null;
                try {
                    const match = result.match(/\{[\s\S]*\}/);
                    if (match) plan = JSON.parse(match[0]);
                } catch (e) { /* parse failed */ }

                if (plan && plan.morning && plan.afternoon) {
                    const blocks = {
                        morning: plan.morning.slice(0, 3).map((b, i) => ({
                            id: `morning-${Date.now()}-${i}`,
                            time: b.time || '09:00-10:00',
                            content: b.content || '学习任务',
                            skill: ['listening','reading','writing','speaking'].includes(b.skill) ? b.skill : 'reading',
                            completed: false
                        })),
                        afternoon: plan.afternoon.slice(0, 3).map((b, i) => ({
                            id: `afternoon-${Date.now()}-${i}`,
                            time: b.time || '14:00-15:00',
                            content: b.content || '学习任务',
                            skill: ['listening','reading','writing','speaking'].includes(b.skill) ? b.skill : 'reading',
                            completed: false
                        }))
                    };
                    ScheduleManager.save(blocks);
                    ScheduleManager.render();
                    this.showNotification('AI已生成今日计划', 'success');
                } else {
                    this.showNotification('AI返回格式有误，请重试', 'error');
                }
            } catch (e) {
                console.error('AI规划失败', e);
                this.showNotification('AI规划失败：' + (e.message || '请检查API状态'), 'error');
            } finally {
                this.hideLoading(btn);
            }
        });
        
        // Clear plan
        document.getElementById('clear-plan').addEventListener('click', () => {
            if (confirm('确定要清空今日计划吗？所有任务将被移除。')) {
                Storage.remove('scheduleBlocks');
                ScheduleManager.render();
                this.showNotification('计划已清空', 'info');
            }
        });
        
        // Quick-add task panel toggle
        const quickAddBtn = document.getElementById('quick-add-task-btn');
        const quickAddPanel = document.getElementById('quick-add-panel');
        if (quickAddBtn && quickAddPanel) {
            quickAddBtn.addEventListener('click', () => {
                quickAddPanel.style.display = quickAddPanel.style.display === 'none' ? 'flex' : 'none';
                quickAddPanel.style.flexDirection = 'column';
            });
        }

        // Auto-fill title when skill changes
        const skillSelect = document.getElementById('quick-task-skill');
        const titleInput = document.getElementById('quick-task-title');
        const skillDefaults = { listening: '听力练习', reading: '阅读训练', writing: '写作练习', speaking: '口语训练' };
        if (skillSelect && titleInput) {
            skillSelect.addEventListener('change', () => {
                const defaultTitle = skillDefaults[skillSelect.value] || '';
                if (!titleInput.value || Object.values(skillDefaults).includes(titleInput.value)) {
                    titleInput.value = defaultTitle;
                }
            });
            // Pre-fill on panel open
            quickAddBtn.addEventListener('click', () => {
                if (quickAddPanel && quickAddPanel.style.display !== 'none') {
                    titleInput.value = skillDefaults[skillSelect.value] || '';
                }
            });
        }

        const saveQuickTask = document.getElementById('save-quick-task');
        if (saveQuickTask) {
            saveQuickTask.addEventListener('click', () => {
                const title = document.getElementById('quick-task-title').value.trim();
                const skill = document.getElementById('quick-task-skill').value;
                const period = document.getElementById('quick-task-period').value;
                const time = document.getElementById('quick-task-time').value.trim();
                if (!title) {
                    this.showNotification('请输入任务名称', 'warning');
                    return;
                }
                ScheduleManager.addBlock(period, { content: title, skill, time: time || undefined });
                document.getElementById('quick-task-title').value = '';
                document.getElementById('quick-task-time').value = '';
                if (quickAddPanel) quickAddPanel.style.display = 'none';
                this.showNotification('任务已添加', 'success');
            });
        }

        const cancelQuickTask = document.getElementById('cancel-quick-task');
        if (cancelQuickTask && quickAddPanel) {
            cancelQuickTask.addEventListener('click', () => {
                quickAddPanel.style.display = 'none';
            });
        }
    },

    loadAISuggestions(type = 'all') {
        if (typeof AISuggestionsManager !== 'undefined') {
            AISuggestionsManager.renderSuggestions(type);
        }
    }
};

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('TL IELTS Learning Platform initializing...');
    try {
        UI.init();
        console.log('UI initialized successfully');
    } catch (error) {
        console.error('Failed to initialize UI:', error);
    }
});