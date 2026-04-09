import type { LocalizedText } from '@shared/curriculum/types';
import type { ProgrammingLanguageId } from '@shared/programming-language';

export interface ProgrammingLanguageOverview {
  summary: LocalizedText;
  keyFacts: LocalizedText[];
  useCases: LocalizedText[];
  contentNotes: LocalizedText[];
}

function localized(en: string, de: string): LocalizedText {
  return { en, de };
}

export const LANGUAGE_OVERVIEWS: Record<
  ProgrammingLanguageId,
  ProgrammingLanguageOverview
> = {
  javascript: {
    summary: localized(
      'JavaScript is a flexible, dynamically typed language used in browsers, servers, and tooling. In this app, the focus is on the language itself: values, control flow, functions, objects, arrays, modules, and asynchronous code.',
      'JavaScript ist eine flexible, dynamisch typisierte Sprache, die in Browsern, auf Servern und in Tooling genutzt wird. In dieser App steht die Sprache selbst im Fokus: Werte, Kontrollfluss, Funktionen, Objekte, Arrays, Module und asynchroner Code.'
    ),
    keyFacts: [
      localized(
        'JavaScript is dynamically typed and has runtime quirks such as coercion, truthy/falsy values, and different notions of equality.',
        'JavaScript ist dynamisch typisiert und hat einige Laufzeitbesonderheiten wie Coercion, Truthy/Falsy-Werte und unterschiedliche Gleichheitsbegriffe.'
      ),
      localized(
        'Functions are first-class values, and objects, arrays, closures, and prototypes strongly shape how larger programs are structured.',
        'Funktionen sind First-Class Values, und Objekte, Arrays, Closures sowie Prototypen prägen stark, wie größere Programme aufgebaut sind.'
      ),
      localized(
        'Promises, async/await, and the event loop are central to understanding asynchronous behavior in modern JavaScript.',
        'Promises, async/await und die Event Loop sind zentral, um asynchrones Verhalten in modernem JavaScript zu verstehen.'
      ),
    ],
    useCases: [
      localized(
        'Frontend application logic in the browser.',
        'Frontend-Logik im Browser.'
      ),
      localized(
        'Server-side services and APIs with Node.js.',
        'Server-seitige Services und APIs mit Node.js.'
      ),
      localized(
        'Build tooling, scripts, automation, and full-stack JavaScript ecosystems.',
        'Build-Tooling, Skripte, Automatisierung und Full-Stack-JavaScript-Ökosysteme.'
      ),
    ],
    contentNotes: [
      localized(
        'This path teaches core JavaScript concepts, not HTML, CSS, the DOM, or browser-specific Web APIs.',
        'Dieser Pfad vermittelt JavaScript als Sprache, nicht HTML, CSS, das DOM oder browser-spezifische Web-APIs.'
      ),
      localized(
        'Examples consistently use modern syntax such as let, const, arrow functions, modules, promises, and async/await.',
        'Die Beispiele verwenden konsequent moderne Syntax wie let, const, Arrow Functions, Module, Promises und async/await.'
      ),
      localized(
        'The scope covers strong language fundamentals and common patterns, not frameworks such as React or runtime tooling details.',
        'Der Umfang deckt solide Sprachgrundlagen und typische Muster ab, aber keine Frameworks wie React oder Runtime- und Tooling-Details.'
      ),
    ],
  },
  python: {
    summary: localized(
      'Python emphasizes readability and relatively little syntax, which makes it popular for learning and for shipping useful code quickly. In this app, the path moves from fundamentals to functions, data structures, files, modules, and selected advanced language features.',
      'Python legt Wert auf Lesbarkeit und vergleichsweise wenig Syntax. Dadurch ist die Sprache beliebt zum Lernen und um schnell nützlichen Code zu schreiben. In dieser App führt der Pfad von den Grundlagen über Funktionen und Datenstrukturen bis zu Dateien, Modulen und ausgewählten fortgeschrittenen Sprachfeatures.'
    ),
    keyFacts: [
      localized(
        'Python is dynamically typed, indentation-based, and optimized for clear, concise code rather than maximum raw performance.',
        'Python ist dynamisch typisiert, einrückungsbasiert und eher auf klaren, kompakten Code als auf maximale Rohperformance ausgelegt.'
      ),
      localized(
        'A lot of everyday Python work revolves around built-in data structures such as lists, dictionaries, sets, tuples, and idioms like comprehensions.',
        'Ein großer Teil der alltäglichen Python-Arbeit dreht sich um eingebaute Datenstrukturen wie Listen, Dictionaries, Sets und Tupel sowie um Idiome wie Comprehensions.'
      ),
      localized(
        'Python scales from tiny scripts to larger applications, but understanding mutability, scope, exceptions, and modules is important to avoid subtle bugs.',
        'Python skaliert von kleinen Skripten bis zu größeren Anwendungen, aber Themen wie Mutability, Scope, Exceptions und Module sind wichtig, um subtile Fehler zu vermeiden.'
      ),
    ],
    useCases: [
      localized(
        'Automation, scripting, and command-line utilities.',
        'Automatisierung, Skripte und Kommandozeilen-Tools.'
      ),
      localized(
        'Data processing, scientific workflows, and machine learning ecosystems.',
        'Datenverarbeitung, wissenschaftliche Workflows und Machine-Learning-Ökosysteme.'
      ),
      localized(
        'Backend services, education, and rapid prototyping.',
        'Backend-Services, Lehre und schnelles Prototyping.'
      ),
    ],
    contentNotes: [
      localized(
        'The focus is core Python, not framework-specific work with tools such as Django, Flask, pandas, or notebooks.',
        'Im Fokus steht reines Python, nicht frameworkspezifische Arbeit mit Werkzeugen wie Django, Flask, pandas oder Notebooks.'
      ),
      localized(
        'The curriculum covers syntax, control flow, functions, type hints, data structures, files, modules, classes and dataclasses, generators, decorators, and modern constructs like match/case.',
        'Das Curriculum deckt Syntax, Kontrollfluss, Funktionen, Type Hints, Datenstrukturen, Dateien, Module, Klassen und Dataclasses, Generatoren, Dekoratoren und moderne Konstrukte wie match/case ab.'
      ),
      localized(
        'It teaches the language and its core standard patterns, not the full packaging, deployment, or library ecosystem around Python.',
        'Vermittelt werden die Sprache und ihre zentralen Standardmuster, nicht das komplette Packaging-, Deployment- oder Library-Ökosystem rund um Python.'
      ),
    ],
  },
  java: {
    summary: localized(
      'Java is a statically typed language with a strong emphasis on explicit structure, maintainability, and object-oriented design. In this app, the path starts with fundamentals and moves through methods, OOP, collections, exceptions, generics, and selected modern Java features.',
      'Java ist eine statisch typisierte Sprache mit starkem Fokus auf explizite Struktur, Wartbarkeit und objektorientiertes Design. In dieser App führt der Pfad von den Grundlagen über Methoden und OOP bis zu Collections, Exceptions, Generics und ausgewählten modernen Java-Features.'
    ),
    keyFacts: [
      localized(
        'Java favors explicit types, compile-time checks, and well-structured code, which helps in larger teams and long-lived systems.',
        'Java setzt auf explizite Typen, Compile-Time-Prüfungen und klar strukturierten Code, was besonders in größeren Teams und langlebigen Systemen hilft.'
      ),
      localized(
        'Classes, objects, methods, encapsulation, interfaces, and polymorphism are core building blocks, not optional extras.',
        'Klassen, Objekte, Methoden, Kapselung, Interfaces und Polymorphie sind zentrale Bausteine und keine bloßen Zusätze.'
      ),
      localized(
        'Modern Java includes more than classic OOP: generics, records, lambdas, streams, Optional, and safer pattern-matching features matter in practice.',
        'Modernes Java umfasst mehr als klassisches OOP: Generics, Records, Lambdas, Streams, Optional und sicherere Pattern-Matching-Features sind in der Praxis relevant.'
      ),
    ],
    useCases: [
      localized(
        'Enterprise backends, APIs, and business software.',
        'Enterprise-Backends, APIs und Business-Software.'
      ),
      localized(
        'Large codebases where stability, tooling, and maintainability matter.',
        'Größere Codebasen, in denen Stabilität, Tooling und Wartbarkeit wichtig sind.'
      ),
      localized(
        'Large business systems, integration software, and established JVM ecosystems.',
        'Größere Fachanwendungen, Integrationssoftware und etablierte JVM-Ökosysteme.'
      ),
    ],
    contentNotes: [
      localized(
        'The focus is core Java, not Spring, Android specifics, build tooling, or deployment topics.',
        'Im Fokus steht reines Java, nicht Spring, Android-spezifische Themen, Build-Tooling oder Deployment.'
      ),
      localized(
        'The curriculum covers console I/O, arrays, strings, packages, methods, OOP, enums, collections, exceptions, generics, and selected modern Java features such as records, Optional, lambdas, streams, pattern matching, and concurrency basics.',
        'Das Curriculum deckt Konsolen-I/O, Arrays, Strings, Packages, Methoden, OOP, Enums, Collections, Exceptions, Generics und ausgewählte moderne Java-Features wie Records, Optional, Lambdas, Streams, Pattern Matching und Grundlagen der Nebenläufigkeit ab.'
      ),
      localized(
        'The goal is a solid understanding of the language and common standard-library patterns, not the entire JVM ecosystem.',
        'Ziel ist ein belastbares Verständnis der Sprache und typischer Standardbibliotheksmuster, nicht des gesamten JVM-Ökosystems.'
      ),
    ],
  },
  rust: {
    summary: localized(
      'Rust is a statically typed systems language designed for performance, memory safety, and precise control over ownership. In this app, the path introduces core syntax and abstractions, then spends real time on ownership, borrowing, error handling, and advanced Rust patterns.',
      'Rust ist eine statisch typisierte Systemprogrammiersprache, die auf Performance, Speichersicherheit und präzise Kontrolle über Ownership ausgelegt ist. In dieser App führt der Pfad von Kernsyntax und Abstraktionen gezielt zu Ownership, Borrowing, Fehlerbehandlung und fortgeschrittenen Rust-Mustern.'
    ),
    keyFacts: [
      localized(
        'Rust prevents broad classes of memory bugs at compile time through ownership, borrowing, and lifetimes.',
        'Rust verhindert ganze Klassen von Speicherfehlern bereits zur Compile-Zeit durch Ownership, Borrowing und Lifetimes.'
      ),
      localized(
        'Enums, pattern matching, traits, and Result/Option are everyday tools in idiomatic Rust, not niche features.',
        'Enums, Pattern Matching, Traits und Result/Option sind im idiomatischen Rust Alltagswerkzeuge und keine Nischenfeatures.'
      ),
      localized(
        'The compiler is a major part of the learning experience: it pushes you toward correct, explicit code, especially around references and concurrency.',
        'Der Compiler ist ein wichtiger Teil des Lernprozesses: Er drängt zu korrektem, explizitem Code, besonders bei Referenzen und Nebenläufigkeit.'
      ),
    ],
    useCases: [
      localized(
        'Systems programming, developer tooling, and command-line applications.',
        'Systemnahe Software, Entwickler-Tools und Kommandozeilen-Anwendungen.'
      ),
      localized(
        'Performance-sensitive backend components and infrastructure software.',
        'Performancekritische Backend-Komponenten und Infrastruktursoftware.'
      ),
      localized(
        'Embedded, networking, and other domains where safety and efficiency matter at the same time.',
        'Embedded-, Netzwerk- und andere Bereiche, in denen Sicherheit und Effizienz gleichzeitig wichtig sind.'
      ),
    ],
    contentNotes: [
      localized(
        'The curriculum teaches idiomatic core Rust with structs, enums, traits, modules, ownership, borrowing, slices, Result/Option, generics, iterators, smart pointers, and macros.',
        'Das Curriculum vermittelt idiomatisches Kern-Rust mit Structs, Enums, Traits, Modulen, Ownership, Borrowing, Slices, Result/Option, Generics, Iteratoren, Smart Pointern und Makros.'
      ),
      localized(
        'Ownership and the borrow checker are treated as central concepts, not side topics, because they shape almost every non-trivial Rust program.',
        'Ownership und der Borrow Checker werden als zentrale Konzepte behandelt und nicht als Randthemen, weil sie fast jedes nichttriviale Rust-Programm prägen.'
      ),
      localized(
        'The path builds a solid language foundation, but it is not a full tour of async runtimes, unsafe Rust, or framework-specific crate ecosystems.',
        'Der Pfad baut ein solides Sprachfundament auf, ist aber keine vollständige Tour durch Async-Runtimes, unsafe Rust oder framework-spezifische Crate-Ökosysteme.'
      ),
    ],
  },
};

export function getLanguageOverviewById(
  languageId: string | null | undefined
): ProgrammingLanguageOverview | undefined {
  if (!languageId) {
    return undefined;
  }

  return LANGUAGE_OVERVIEWS[languageId as ProgrammingLanguageId];
}
