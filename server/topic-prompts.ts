import {
  getCurriculumByLanguage,
  getTopicIdsByLanguage,
} from "@shared/curriculum";
import {
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS,
  type ProgrammingLanguageId,
} from "@shared/programming-language";

const LANGUAGE_TOPIC_PROMPTS: Record<
  ProgrammingLanguageId,
  Record<string, string>
> = {
  javascript: {
    variables:
      "JavaScript variable declarations using let and const only (do not include var), including block scope and when to use each",
    "data-types":
      "JavaScript primitive data types (string, number, boolean, null, undefined, symbol, bigint) and type checking",
    operators: "JavaScript arithmetic, comparison, and logical operators",
    "equality-coercion-truthiness":
      "JavaScript equality operators (== vs ===), type coercion, and truthy/falsy behavior",
    "null-undefined":
      "JavaScript null and undefined semantics, differences, and common pitfalls",
    "strings-template-literals":
      "JavaScript string operations with template literals, interpolation, and multiline strings",
    conditionals: "JavaScript if/else statements and ternary operators",
    loops: "JavaScript for, while, do-while, and for...of loops",
    switch: "JavaScript switch statements and case handling",
    declarations: "JavaScript function declarations and function expressions",
    "arrow-functions": "JavaScript ES6 arrow function syntax and behavior",
    callbacks: "JavaScript callback functions and callback patterns",
    "function-parameters-rest-spread":
      "JavaScript function parameters, default values, rest parameters, and spread syntax",
    "scope-hoisting-tdz":
      "JavaScript lexical scope, hoisting rules, and temporal dead zone behavior",
    "this-binding":
      "JavaScript this binding in regular functions, methods, arrow functions, and explicit binding",
    objects: "JavaScript object literals, properties, and methods",
    arrays: "JavaScript array methods like map, filter, reduce, find, forEach",
    destructuring: "JavaScript object and array destructuring syntax",
    "map-set":
      "JavaScript Map and Set usage, differences from objects/arrays, and iteration patterns",
    "optional-chaining-nullish":
      "JavaScript optional chaining (?.) and nullish coalescing (??) for safe property access and defaults",
    promises: "JavaScript Promises, then/catch chaining, and Promise.all",
    "async-await":
      "JavaScript async/await syntax for handling asynchronous code",
    "error-handling": "JavaScript try/catch blocks and error management",
    "event-loop-microtasks":
      "JavaScript event loop fundamentals, task queue vs microtask queue, and execution order",
    closures: "JavaScript closures and lexical scope",
    prototypes: "JavaScript prototype chain and prototype-based inheritance",
    classes: "JavaScript ES6 class syntax, constructors, and methods",
    modules: "JavaScript ES6 import/export and module patterns",
  },
  python: {
    "variables-assignment":
      "Python variable assignment, reassignment, and clean naming conventions",
    "data-types":
      "Python core data types including int, float, str, bool, and None",
    operators:
      "Python arithmetic, comparison, logical, membership, and identity operators",
    "comparisons-identity-truthiness":
      "Python == vs is, chained comparisons, and truthy/falsy behavior in conditions",
    "strings-formatting":
      "Python string handling with f-strings, slicing, split, join, and common methods",
    "input-output":
      "Python console interaction with print, input, and basic input conversion",
    conditionals:
      "Python if, elif, and else branching with readable condition logic",
    loops:
      "Python for and while loops with range, enumerate, zip, break, and continue",
    "function-definitions":
      "Python function definitions using def, return values, and docstring basics",
    "function-arguments":
      "Python function parameters including positional, keyword, default, *args, and **kwargs",
    "default-argument-pitfalls":
      "Python mutable default argument pitfalls and safe patterns using None defaults",
    "type-hints":
      "Python type hints for parameters and return values, including list[str] and Optional",
    scope:
      "Python scope rules for local, global, and nonlocal variable resolution",
    "lambda-functions":
      "Python lambda functions and practical usage with sorted, map, and filter",
    "lists-tuples":
      "Python lists and tuples for indexing, slicing, iteration, and mutation rules",
    "dicts-sets":
      "Python dictionaries and sets including key access and set operations",
    comprehensions:
      "Python list, set, and dict comprehensions with conditional clauses",
    "mutability-copying":
      "Python mutability, references, shallow copy, deep copy, and side-effect traps",
    "unpacking-multiple-assignment":
      "Python unpacking, starred assignment, and tuple/list destructuring patterns",
    "error-handling":
      "Python exception handling with try/except/else/finally and raising custom errors",
    "files-context-managers":
      "Python file operations with open, with context managers, and safe resource handling",
    "modules-packages":
      "Python imports, module structure, package layout, and __main__ execution basics",
    "classes-dataclasses":
      "Python classes, instance attributes, methods, and dataclasses for data modeling",
    "iterators-generators":
      "Python iterator protocol, generator functions, and yield-based lazy evaluation",
    decorators:
      "Python decorators for wrapping behavior, preserving metadata, and reusable augmentation",
    "async-await":
      "Python async and await for asynchronous I/O workflows and coroutine execution",
    "match-case":
      "Python structural pattern matching with match/case for readable branching",
  },
  java: {
    "variables-constants":
      "Java variable declarations, initialization, and constants with final",
    "primitive-types":
      "Java primitive types, numeric ranges, literals, and type-specific behavior",
    operators:
      "Java arithmetic, comparison, logical, assignment, and increment operators",
    "type-casting-autoboxing":
      "Java type casting, wrapper classes, autoboxing/unboxing, and == vs equals pitfalls",
    "input-output":
      "Java console I/O using System.out and Scanner for user input",
    "arrays-basics":
      "Java arrays: declaration, initialization, indexing, iteration, and bounds errors",
    "strings-basics":
      "Java String immutability, equals vs ==, and efficient concatenation with StringBuilder",
    "packages-imports":
      "Java package declarations, imports, namespaces, and project organization",
    conditionals: "Java if/else logic and ternary expressions",
    loops:
      "Java for, enhanced for, while, and do-while loops with control statements",
    switch:
      "Java switch statements and modern switch expressions with arrow syntax",
    "method-declarations":
      "Java method signatures, parameters, return types, and visibility basics",
    overloading: "Java method overloading rules and signature differences",
    "static-vs-instance":
      "Java static members versus instance members and when to use each",
    "classes-objects":
      "Java classes and objects, fields, methods, instantiation, and toString basics",
    "constructors-this-super":
      "Java constructors, constructor chaining, this, and super calls",
    "encapsulation-access-modifiers":
      "Java encapsulation with public, private, protected, and package-private access",
    "equals-hashcode-contract":
      "Java equals and hashCode contract and correct implementations for object equality",
    "inheritance-polymorphism":
      "Java inheritance, method overriding, upcasting, and runtime polymorphism",
    "interfaces-abstract-classes":
      "Java interfaces versus abstract classes and abstraction design tradeoffs",
    "exception-handling":
      "Java checked and unchecked exceptions with try/catch/finally and throws",
    "file-io-path-files":
      "Java file and path handling with java.nio.file.Path and Files",
    "collections-framework":
      "Java Collections Framework with List, Set, Map, and common usage patterns",
    generics:
      "Java generics for type-safe reusable APIs, wildcards, and bounds",
    records:
      "Java records for concise immutable data carriers with generated members",
    "sealed-classes":
      "Java sealed classes for constrained inheritance hierarchies and permitted subclasses",
    "optional-api":
      "Java Optional for null-safe return values and fluent value handling",
    "lambdas-functional-interfaces":
      "Java lambdas, functional interfaces, and method references",
    streams:
      "Java Stream API pipelines with map, filter, reduce, and collectors",
    "concurrency-basics":
      "Java concurrency fundamentals with threads, ExecutorService, and synchronization",
  },
};

export const LANGUAGE_NAMES = Object.fromEntries(
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS.map((languageId) => [
    languageId,
    getCurriculumByLanguage(languageId).languageName.en,
  ]),
) as Record<ProgrammingLanguageId, string>;

export const LANGUAGE_CONTEXT_EXCLUSIONS = Object.fromEntries(
  SUPPORTED_PROGRAMMING_LANGUAGE_IDS.map((languageId) => [
    languageId,
    getCurriculumByLanguage(languageId).contextExclusion ?? "",
  ]),
) as Record<ProgrammingLanguageId, string>;

function assertPromptCoverage(): void {
  for (const languageId of SUPPORTED_PROGRAMMING_LANGUAGE_IDS) {
    const curriculumTopicIds = new Set(getTopicIdsByLanguage(languageId));
    const promptTopicIds = new Set(
      Object.keys(LANGUAGE_TOPIC_PROMPTS[languageId] ?? {}),
    );

    const missingTopicPrompts = [...curriculumTopicIds].filter(
      (topicId) => !promptTopicIds.has(topicId),
    );
    const orphanPromptTopicIds = [...promptTopicIds].filter(
      (topicId) => !curriculumTopicIds.has(topicId),
    );

    if (missingTopicPrompts.length === 0 && orphanPromptTopicIds.length === 0) {
      continue;
    }

    const details = [
      missingTopicPrompts.length > 0
        ? `missing prompts: ${missingTopicPrompts.join(", ")}`
        : null,
      orphanPromptTopicIds.length > 0
        ? `orphan prompts: ${orphanPromptTopicIds.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("; ");

    throw new Error(
      `Topic prompt mapping mismatch for '${languageId}' (${details})`,
    );
  }
}

assertPromptCoverage();

export function getTopicPrompt(
  languageId: ProgrammingLanguageId,
  topicId: string,
): string | undefined {
  return LANGUAGE_TOPIC_PROMPTS[languageId]?.[topicId];
}
