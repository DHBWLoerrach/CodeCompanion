export interface Topic {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  topics: Topic[];
}

export const CATEGORIES: Category[] = [
  {
    id: "fundamentals",
    name: "Fundamentals",
    topics: [
      { id: "variables", name: "Variables", category: "fundamentals", description: "var, let, const declarations" },
      { id: "data-types", name: "Data Types", category: "fundamentals", description: "Primitives and type checking" },
      { id: "operators", name: "Operators", category: "fundamentals", description: "Arithmetic, comparison, logical" },
    ],
  },
  {
    id: "control-flow",
    name: "Control Flow",
    topics: [
      { id: "conditionals", name: "Conditionals", category: "control-flow", description: "if/else, ternary operator" },
      { id: "loops", name: "Loops", category: "control-flow", description: "for, while, do-while, for...of" },
      { id: "switch", name: "Switch", category: "control-flow", description: "Switch statements and cases" },
    ],
  },
  {
    id: "functions",
    name: "Functions",
    topics: [
      { id: "declarations", name: "Declarations", category: "functions", description: "Function declarations and expressions" },
      { id: "arrow-functions", name: "Arrow Functions", category: "functions", description: "ES6 arrow function syntax" },
      { id: "callbacks", name: "Callbacks", category: "functions", description: "Callback functions and patterns" },
    ],
  },
  {
    id: "objects-arrays",
    name: "Objects & Arrays",
    topics: [
      { id: "objects", name: "Objects", category: "objects-arrays", description: "Object literals and methods" },
      { id: "arrays", name: "Arrays", category: "objects-arrays", description: "Array methods and manipulation" },
      { id: "destructuring", name: "Destructuring", category: "objects-arrays", description: "Object and array destructuring" },
    ],
  },
  {
    id: "async",
    name: "Async",
    topics: [
      { id: "promises", name: "Promises", category: "async", description: "Promise creation and chaining" },
      { id: "async-await", name: "Async/Await", category: "async", description: "Modern async syntax" },
      { id: "error-handling", name: "Error Handling", category: "async", description: "try/catch and error management" },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    topics: [
      { id: "closures", name: "Closures", category: "advanced", description: "Lexical scope and closures" },
      { id: "prototypes", name: "Prototypes", category: "advanced", description: "Prototype chain and inheritance" },
      { id: "classes", name: "Classes", category: "advanced", description: "ES6 class syntax" },
      { id: "modules", name: "Modules", category: "advanced", description: "import/export and module patterns" },
    ],
  },
];

export function getTopicById(topicId: string): Topic | undefined {
  for (const category of CATEGORIES) {
    const topic = category.topics.find((t) => t.id === topicId);
    if (topic) return topic;
  }
  return undefined;
}

export function getAllTopics(): Topic[] {
  return CATEGORIES.flatMap((c) => c.topics);
}

export function getRandomTopics(count: number): Topic[] {
  const allTopics = getAllTopics();
  const shuffled = [...allTopics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
