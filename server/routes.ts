import type { Express } from "express";
import { createServer, type Server } from "node:http";
import crypto from "node:crypto";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface QuizQuestion {
  id: string;
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const TOPIC_PROMPTS: Record<string, string> = {
  variables: "JavaScript variable declarations using let and const only (do not include var), including block scope and when to use each",
  "data-types": "JavaScript primitive data types (string, number, boolean, null, undefined, symbol, bigint) and type checking",
  operators: "JavaScript arithmetic, comparison, and logical operators",
  conditionals: "JavaScript if/else statements and ternary operators",
  loops: "JavaScript for, while, do-while, and for...of loops",
  switch: "JavaScript switch statements and case handling",
  declarations: "JavaScript function declarations and function expressions",
  "arrow-functions": "JavaScript ES6 arrow function syntax and behavior",
  callbacks: "JavaScript callback functions and callback patterns",
  objects: "JavaScript object literals, properties, and methods",
  arrays: "JavaScript array methods like map, filter, reduce, find, forEach",
  destructuring: "JavaScript object and array destructuring syntax",
  promises: "JavaScript Promises, then/catch chaining, and Promise.all",
  "async-await": "JavaScript async/await syntax for handling asynchronous code",
  "error-handling": "JavaScript try/catch blocks and error management",
  closures: "JavaScript closures and lexical scope",
  prototypes: "JavaScript prototype chain and prototype-based inheritance",
  classes: "JavaScript ES6 class syntax, constructors, and methods",
  modules: "JavaScript ES6 import/export and module patterns",
};

async function generateQuizQuestions(topicId: string, count: number = 5, language: string = "en"): Promise<QuizQuestion[]> {
  const topicDescription = TOPIC_PROMPTS[topicId] || "general JavaScript programming concepts";

  const languageInstruction = language === "de" 
    ? "Write all questions, answer options, and explanations in German (Deutsch). Keep code examples and JavaScript syntax in English as they are programming terms."
    : "Write all questions, answer options, and explanations in English.";

  const prompt = `Generate ${count} multiple-choice quiz questions about ${topicDescription} for computer science students learning JavaScript programming.

${languageInstruction}

Each question should:
- Test understanding of the concept, not just memorization
- Include a short code snippet when appropriate (keep code under 10 lines)
- Have exactly 4 answer options
- Have only one correct answer
- Include a brief explanation of why the correct answer is right

Return a JSON array with this exact structure:
[
  {
    "id": "unique-id-1",
    "question": "What will be the output of this code?",
    "code": "const x = 5;\\nlet y = x;\\ny = 10;\\nconsole.log(x);",
    "options": ["5", "10", "undefined", "Error"],
    "correctIndex": 0,
    "explanation": "Primitives are copied by value, so changing y doesn't affect x."
  }
]

Important:
- Make questions progressively challenging
- Use realistic code examples students would encounter
- Avoid web/HTML/CSS context - focus purely on JavaScript language concepts
- Return ONLY valid JSON, no markdown or extra text`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are a JavaScript programming tutor creating quiz questions. ${language === "de" ? "Respond in German." : "Respond in English."} Always respond with valid JSON containing a 'questions' array.` 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 4096,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    console.log("OpenAI response content:", content.substring(0, 200));
    
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();
    
    const parsed = JSON.parse(cleanContent);
    
    let questions: QuizQuestion[] = [];
    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    }
    
    // Generate stable unique IDs based on question content hash
    // IDs are deterministic for identical question content, enabling progress tracking
    questions = questions.map((q, index) => {
      const contentHash = crypto
        .createHash('md5')
        .update(`${topicId}-${q.question}-${JSON.stringify(q.options)}-${index}`)
        .digest('hex')
        .substring(0, 12);
      return {
        ...q,
        id: `${topicId}-${contentHash}`,
      };
    });
    
    console.log(`Generated ${questions.length} questions for topic ${topicId} in ${language}`);
    return questions;
  } catch (error) {
    console.error("Error generating quiz questions:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/quiz/generate", async (req, res) => {
    try {
      const { topicId, count = 5, language = "en" } = req.body;
      
      if (!topicId) {
        return res.status(400).json({ error: "topicId is required" });
      }

      const questions = await generateQuizQuestions(topicId, count, language);
      res.json({ questions });
    } catch (error) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ error: "Failed to generate quiz questions" });
    }
  });

  app.post("/api/quiz/generate-mixed", async (req, res) => {
    try {
      const { count = 10, language = "en" } = req.body;
      const topics = Object.keys(TOPIC_PROMPTS);
      const randomTopics = topics.sort(() => Math.random() - 0.5).slice(0, 3);
      
      const questionsPerTopic = Math.ceil(count / randomTopics.length);
      const allQuestions: QuizQuestion[] = [];

      for (const topicId of randomTopics) {
        const questions = await generateQuizQuestions(topicId, questionsPerTopic, language);
        allQuestions.push(...questions);
      }

      const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, count);
      res.json({ questions: shuffled });
    } catch (error) {
      console.error("Mixed quiz generation error:", error);
      res.status(500).json({ error: "Failed to generate quiz questions" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
