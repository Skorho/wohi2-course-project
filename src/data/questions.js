const questions = [
    {
        id: 1,
        question_phrase: "Is HTTP the foundation of communication on the web?",
        options: ["Yes", "No"],
        answer: "Yes",
        keywords: ["http", "web"]
    },
    {
        id: 2,
        question_phrase: "Which HTTP method sends data to the server to create a new resource?",
        options: ["GET", "POST", "PATCH", "PUT","DELETE"],
        answer: "POST",
        keywords: ["http", "api"]
    },
    {
        id: 3,
        question_phrase: "What is the most common database software?",
        options: ["MySQL", "Oracle DBMS", "PostgreSQL", "MongoDB"],
        answer: "Oracle DBMS",
        keywords: ["javascript", "backend"]
    },
    {
        id: 4,
        question_phrase: "What is an object in JavaScript?",
        options: ["A list of values", "A dictionary", "A collection of key-value pairs", "Ice cream"],
        answer: "A collection of key-value pairs",
        keywords: ["database", "backend"]
    }
];

module.exports = questions;