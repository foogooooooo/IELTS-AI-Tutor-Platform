# TL - IELTS Learning Platform

An intelligent self-study management system for IELTS that uses AI to help you plan daily learning tasks, grade assignments, making learning as efficient as working.

## ✨ Features

### 🎯 Daily Course System
- **8-lesson structure**: 3 morning sessions, 3 afternoon sessions, 2 evening sessions
- **AI auto-generation**: Personalized courses based on your study days, current level, and target score
- **Smart adjustment**: Automatically reduces study load on class days
- **Flexible control**: Can start, skip, or complete each lesson

### 🤖 AI Learning Assistant
- **Multiple conversation management**: Create multiple conversations to discuss different topics
- **Real-time grading**: AI provides detailed feedback immediately after submitting assignments
- **Learning advice**: Ask AI questions anytime for professional advice
- **Conversation saving**: All conversation history is permanently saved

### 📚 Materials Library
- **Categorized management**: Organized by listening, reading, writing, speaking
- **Difficulty rating**: 1-5 star difficulty system
- **Quick view**: Click materials to view detailed content

### 📊 Progress Tracking
- **Learning statistics**: Study days, completed courses, consecutive learning days
- **Skill analysis**: Independent scoring for four skills (listening, reading, writing, speaking)
- **Visual progress**: Progress bars and charts clearly displayed

### 🎨 Beautiful Design
- **Unique aesthetics**: Professional academic style + modern minimalist design
- **Smooth animations**: Carefully designed animations for card hover, page transitions
- **Responsive**: Perfectly adapts to desktop and mobile devices

## 🚀 Quick Start

### Method 1: Direct Open (Recommended)

1. Download all files to the same folder
2. Double-click `index.html` to open
3. Click "Demo Mode" to start using

### Method 2: Local Server

If you encounter CORS issues, you can use a local server:

```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx serve
```

Then open `http://localhost:8000` in your browser

## 📖 User Guide

### First-Time Use

1. **Login/Register**
   - Click "Demo Mode" to experience without registration
   - Or enter email to register an account (data saved in browser local storage)

2. **Set Information**
   - Click the ⚙️ settings button in the top right corner
   - Fill in current level, target score
   - Set class days (e.g., 1,3,5 means Monday, Wednesday, Friday)
   - Enter your Zhipu AI API Key (preset available, or use your own)

3. **Start Learning**
   - System automatically generates today's 8 lessons
   - Click "Start Learning" to enter a lesson
   - After completion, submit to AI for grading

### Daily Workflow

1. **Check Today's Lessons**
   - Open the app, automatically displays today's lessons
   - Schedule learning by time periods (morning/afternoon/evening)

2. **Study Lessons**
   - Click "Start Learning" to open lesson details
   - Read learning objectives and task content
   - Take notes or write assignments in the learning area
   - Submit to AI for feedback
   - Mark as complete or skip

3. **Chat with AI**
   - Switch to "AI Assistant" page
   - Create a new conversation
   - Ask questions, discuss, or submit assignments
   - All conversations are automatically saved

4. **Manage Materials**
   - Switch to "Materials Library" page
   - Upload learning materials
   - Filter and view by type

5. **Check Progress**
   - Switch to "Learning Progress" page
   - View statistics and skill scores

## 🔑 AI API Configuration

This project uses **Zhipu AI** (GLM-4/GLM-4V) to provide AI functionality, supporting text conversation and image recognition.

### Current Configuration
- Built-in Zhipu AI API Key, ready to use
- Supports image upload grading (using GLM-4V model)
- If API connection fails, automatically switches to demo mode

### Use Your Own API Key (Optional)
1. Visit [Zhipu AI Open Platform](https://open.bigmodel.cn/)
2. Register and log in to your account
3. Create a new Key in the "API Keys" page
4. Paste your Key in the app settings

### API Status Indicator
- 🟢 **Green**: Zhipu AI online, functioning normally
- 🔴 **Red**: API offline, using demo mode (preset responses)
- 🟡 **Yellow**: Checking connection status

## 💾 Data Storage

- All data saved in browser LocalStorage
- Includes: learning progress, course records, conversation history, materials library
- **Important**: Clearing browser cache will cause data loss
- Recommended to regularly export important conversations and notes

## 🎯 Learning Tips

### How to Maximize Learning Effectiveness

1. **Consistent Daily Study**
   - System automatically generates courses, no planning needed
   - Complete tasks on time like working a job

2. **Make Full Use of AI**
   - Ask when you don't understand, AI provides detailed explanations
   - Submit assignments for grading after completion
   - Record AI suggestions and review them

3. **Build Materials Library**
   - Collect Cambridge IELTS practice tests
   - Organize excellent sample essays
   - Save common vocabulary lists

4. **Regular Review**
   - Check learning progress
   - Review AI grading feedback
   - Identify weak areas

## 🛠️ Tech Stack

- **Frontend**: Native HTML + CSS + JavaScript
- **AI**: Zhipu AI (GLM-4 / GLM-4V) - supports image recognition
- **Storage**: LocalStorage
- **Fonts**: Newsreader (display) + DM Sans (body)
- **Design**: Custom CSS with animations

## 📝 File Structure

```
english-learning/
├── index.html          # Main HTML file
├── styles.css          # Stylesheet
├── app.js             # JavaScript logic
└── README.md          # Documentation
```

## ⚙️ Configuration Options

In `app.js` you can modify:

```javascript
const CONFIG = {
    zhipuApiKey: 'your-api-key',  // Zhipu AI API key
    zhipuApiUrl: '...'             // API URL
};
```

In settings you can adjust:
- Current level (3.0 - 7.0)
- Target score (5.5 - 8.0)
- Class days (0-6, 0=Sunday)
- API Key

## 🐛 Frequently Asked Questions

### Q: What if AI course generation fails?
A: System automatically uses backup courses. Check if API Key is correct and network is normal.

### Q: How to backup data?
A: Currently need to manually copy conversation content. Future versions will add export functionality.

### Q: Can I use on mobile?
A: Yes! Interface is responsive design, open in mobile browser to use.

### Q: Will data sync across devices?
A: Current version uses LocalStorage, data only saved on current device. For cross-device use, recommend using same browser's account sync feature.

## 🔮 Future Plans

- [ ] Firebase cloud sync (true cross-device)
- [ ] Data export/import functionality
- [ ] More comprehensive statistical charts
- [ ] Voice recognition (speaking practice)
- [ ] Mock exam mode
- [ ] Study reminder notifications

## 📄 License

MIT License - free to use and modify

## 🤝 Contribution

Suggestions and improvements are welcome!

---

**Start your IELTS learning journey!** 💪📚✨
