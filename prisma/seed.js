const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedQuestions = [
    {
        question: "Is HTTP the foundation of communication on the web?",
        date: new Date(),
        answer: "Yes",
        keywords: ["http", "web"]
    },
    {
        question: "Which HTTP method sends data to the server to create a new resource?",
        date: new Date(),
        answer: "POST",
        keywords: ["http", "api"]
    },
    {
        question: "What is the most common database software?",
        date: new Date(),
        answer: "Oracle DBMS",
        keywords: ["javascript", "backend"]
    },
    {
        question: "What is an object in JavaScript?",
        date: new Date(),
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

    for (const i of seedQuestions) {
        await prisma.question.create({
            data: {
                question: i.question,
                date: i.date,
                answer: i.answer,
                userId: user.id,
                keywords: {
                    connectOrCreate: i.keywords.map((kw) => ({
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