const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedQuestions = [
    {
        question_phrase: "Is HTTP the foundation of communication on the web?",
        answer: "Yes",
        keywords: ["http", "web"]
    },
    {
        question_phrase: "Which HTTP method sends data to the server to create a new resource?",
        answer: "POST",
        keywords: ["http", "api"]
    },
    {
        question_phrase: "What is the most common database software?",
        answer: "Oracle DBMS",
        keywords: ["javascript", "backend"]
    },
    {
        question_phrase: "What is an object in JavaScript?",
        answer: "A collection of key-value pairs",
        keywords: ["database", "backend"]
    }
];

async function main() {
    await prisma.keyword.deleteMany();
    await prisma.question.deleteMany();

    //Create a default user 
    const hashedPassword = await bcrypt.hash("1234", 10);
    const user = await prisma.user.create({
        data: {
            email: "admin@example.com",
            password: hashedPassword,
            name: "Admin User",
        },
    });
    console.log("Created user:", user.email);

    for (const question of seedQuestions) {
        await prisma.question.create({
            data: {

                question_phrase: question.question_phrase,
                answer: question.answer,
                userId: user.id,
                keywords: {
                    connectOrCreate: question.keywords.map((kw) => ({
                        where: { name: kw },
                        create: { name: kw },
                        
                    })),
                },
            },
        });
    }
    console.log("Seeding completed successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());