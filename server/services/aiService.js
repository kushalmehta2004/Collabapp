const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateTaskSuggestions(boardTitle, existingTasks = []) {
    try {
      const prompt = `
        Given a project board titled "${boardTitle}" with existing tasks: ${existingTasks.map(t => t.title).join(', ')},
        suggest 5 relevant tasks that would help complete this project. 
        Return only a JSON array of objects with 'title' and 'description' fields.
        Make suggestions practical and actionable.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI Task Suggestions Error:', error);
      return this.getFallbackSuggestions();
    }
  }

  async categorizeTask(taskTitle, taskDescription) {
    try {
      const prompt = `
        Categorize this task into one of these categories: "Development", "Design", "Testing", "Documentation", "Planning", "Bug Fix", "Feature", "Research".
        Task: "${taskTitle}" - "${taskDescription}"
        Return only the category name.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.3,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI Categorization Error:', error);
      return 'General';
    }
  }

  async estimateTaskComplexity(taskTitle, taskDescription) {
    try {
      const prompt = `
        Estimate the complexity of this task on a scale of 1-5 (1=Very Easy, 2=Easy, 3=Medium, 4=Hard, 5=Very Hard).
        Task: "${taskTitle}" - "${taskDescription}"
        Return only the number.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0.3,
      });

      const complexity = parseInt(response.choices[0].message.content.trim());
      return isNaN(complexity) ? 3 : Math.max(1, Math.min(5, complexity));
    } catch (error) {
      console.error('AI Complexity Estimation Error:', error);
      return 3;
    }
  }

  async generateTaskBreakdown(taskTitle, taskDescription) {
    try {
      const prompt = `
        Break down this task into 3-5 smaller subtasks.
        Task: "${taskTitle}" - "${taskDescription}"
        Return a JSON array of strings representing the subtasks.
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI Task Breakdown Error:', error);
      return ['Review task requirements', 'Plan implementation', 'Execute task', 'Test and validate'];
    }
  }

  getFallbackSuggestions() {
    return [
      { title: "Set up project structure", description: "Create initial project folders and files" },
      { title: "Define requirements", description: "Document project requirements and specifications" },
      { title: "Create wireframes", description: "Design basic layout and user interface mockups" },
      { title: "Set up development environment", description: "Configure tools and dependencies" },
      { title: "Write initial tests", description: "Create test cases for core functionality" }
    ];
  }
}

module.exports = new AIService();