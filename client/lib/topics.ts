import { type Language, type TranslationKey, translations } from "./i18n";

export interface Topic {
  id: string;
  nameKey: TranslationKey;
  descKey: TranslationKey;
  category: string;
}

export interface Category {
  id: string;
  nameKey: TranslationKey;
  topics: Topic[];
}

export const CATEGORIES: Category[] = [
  {
    id: "fundamentals",
    nameKey: "fundamentals",
    topics: [
      {
        id: "variables",
        nameKey: "variables",
        descKey: "variablesDesc",
        category: "fundamentals",
      },
      {
        id: "data-types",
        nameKey: "dataTypes",
        descKey: "dataTypesDesc",
        category: "fundamentals",
      },
      {
        id: "operators",
        nameKey: "operators",
        descKey: "operatorsDesc",
        category: "fundamentals",
      },
    ],
  },
  {
    id: "control-flow",
    nameKey: "controlFlow",
    topics: [
      {
        id: "conditionals",
        nameKey: "conditionals",
        descKey: "conditionalsDesc",
        category: "control-flow",
      },
      {
        id: "loops",
        nameKey: "loops",
        descKey: "loopsDesc",
        category: "control-flow",
      },
      {
        id: "switch",
        nameKey: "switch",
        descKey: "switchDesc",
        category: "control-flow",
      },
    ],
  },
  {
    id: "functions",
    nameKey: "functionsCategory",
    topics: [
      {
        id: "declarations",
        nameKey: "declarations",
        descKey: "declarationsDesc",
        category: "functions",
      },
      {
        id: "arrow-functions",
        nameKey: "arrowFunctions",
        descKey: "arrowFunctionsDesc",
        category: "functions",
      },
      {
        id: "callbacks",
        nameKey: "callbacks",
        descKey: "callbacksDesc",
        category: "functions",
      },
    ],
  },
  {
    id: "objects-arrays",
    nameKey: "objectsArrays",
    topics: [
      {
        id: "objects",
        nameKey: "objects",
        descKey: "objectsDesc",
        category: "objects-arrays",
      },
      {
        id: "arrays",
        nameKey: "arrays",
        descKey: "arraysDesc",
        category: "objects-arrays",
      },
      {
        id: "destructuring",
        nameKey: "destructuring",
        descKey: "destructuringDesc",
        category: "objects-arrays",
      },
    ],
  },
  {
    id: "async",
    nameKey: "asyncCategory",
    topics: [
      {
        id: "promises",
        nameKey: "promises",
        descKey: "promisesDesc",
        category: "async",
      },
      {
        id: "async-await",
        nameKey: "asyncAwait",
        descKey: "asyncAwaitDesc",
        category: "async",
      },
      {
        id: "error-handling",
        nameKey: "errorHandling",
        descKey: "errorHandlingDesc",
        category: "async",
      },
    ],
  },
  {
    id: "advanced",
    nameKey: "advancedCategory",
    topics: [
      {
        id: "closures",
        nameKey: "closures",
        descKey: "closuresDesc",
        category: "advanced",
      },
      {
        id: "prototypes",
        nameKey: "prototypes",
        descKey: "prototypesDesc",
        category: "advanced",
      },
      {
        id: "classes",
        nameKey: "classes",
        descKey: "classesDesc",
        category: "advanced",
      },
      {
        id: "modules",
        nameKey: "modules",
        descKey: "modulesDesc",
        category: "advanced",
      },
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

export function getTopicName(topic: Topic, language: Language): string {
  return (
    translations[language][topic.nameKey] ||
    translations.en[topic.nameKey] ||
    topic.id
  );
}

export function getTopicDescription(topic: Topic, language: Language): string {
  return (
    translations[language][topic.descKey] ||
    translations.en[topic.descKey] ||
    ""
  );
}

export function getCategoryName(
  category: Category,
  language: Language,
): string {
  return (
    translations[language][category.nameKey] ||
    translations.en[category.nameKey] ||
    category.id
  );
}
