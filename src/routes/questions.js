const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path")
const {NotFoundError} = require("../lib/errors");
const { z  } = require("zod");


const questionInput = z.object({
    question: z.string().min(1),
    date: z.string().date().optional(),
    answer: z.string().min(1),
    keywords: z.union([z.string(), z.array(z.string())]).optional(),
});

//    

router.use((err, req, res, next) => {
if (err instanceof multer.MulterError ||
err?.message === "Only image files are allowed") {
return res.status(400).json({ msg: err.message });
}
next(err); // pass through to global handler
});

const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "public", "uploads"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
});

// Filter to only allow images
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new ValidationError("Only image files are allowed"));
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

// Apply authentication to ALL routes in this router
router.use(authenticate);

// Formatting questions to proper format
function formatQuestion(question) {
    return {
        ...question,
        date: question.date.toISOString().split("T")[0],
        keywords: question.keywords.map((k) => k.name),
        userName: question.user?.name || null,
        attemptCount: question._count?.attempts ?? 0,
        solved: question.attempts ? question.attempts.some(a => a.correct) : false,
        user: undefined,
        attempts: undefined,
        _count: undefined,
    };
}

// GET api/questions, /api/questions?keyword=http&page=1&limit5
router.get("/", async (req, res) => {
    const { keyword } = req.query;

    const where = keyword ? 
    { keywords: { some: { name: keyword } } }: {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    const [filteredQuestions, total] = await Promise.all([
        prisma.question.findMany({
            where: where,
            include: { 
                keywords: true, 
                user: true,
                attempts: { where: { userId: req.user.userId }, take: 1 },
                _count: { select: { attempts: true } },
            },
            orderBy: { id: "asc" },
            skip,
            take: limit,
        }),
        prisma.question.count({ where }),
    ]);

    // Paginated return from questions instead of whole list of questions
    res.json({
        data: filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

//GET api/questions/:questionId
// Show a specific question
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { 
            keywords: true, 
            user: true,
            attempts: { where: { userId: req.user.userId }, take: 1 },
            _count: { select: { attempts: true } },
        },
    });

    if (!question) {
        throw new NotFoundError("Question not found");
    }
    res.json(formatQuestion(question));
});

// POST api/questions
// Create a new question
router.post("/", upload.single("image"), async (req, res) => {

    const { question, date, answer, keywords } = questionInput.parse(req.body);

    // Päiväys valinnaiseksi
    const questionDate = date ? new Date(date) : new Date();    

    const keywordsArray = Array.isArray(keywords) 
    ? keywords 
    : typeof keywords === "string" 
    ? keywords.split(",").map((k) => k.trim()).filter((k) => k)
    : [];

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const newQuestion = await prisma.question.create({
        data: {
        question, date: questionDate, answer, imageUrl,
        userId: req.user.userId,
        keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw }, 
                    create: { name: kw },
                })), },
        },
        include: { 
            keywords: true, 
            user: true,
            attempts: { where: { userId: req.user.userId }, take: 1 },
            _count: { select: { attempts: true } }       
        },
    });

    res.status(201).json(formatQuestion(newQuestion));
});

//PUT api/questions/:questionId
// Edit a question
// PUT /api/posts/:postId — isOwner checks existence + ownership
router.put("/:questionId", isOwner, upload.single("image"), async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { question, date, answer, keywords } = questionInput.parse(req.body);

    const existingQuestion = await prisma.question.findUnique({ where: { id: questionId } });
    if (!existingQuestion) {
        throw new NotFoundError("Question not found");
    }

    if (!question || !answer) {
        throw new ValidationError("question and answer are mandatory");
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : existingQuestion.imageUrl;

    const keywordsArray = Array.isArray(keywords) 
        ? keywords 
        : typeof keywords === "string" 
        ? keywords.split(",").map((k) => k.trim()).filter((k) => k)
        : [];


    const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {     
            question, date: date ? new Date(date) :existingQuestion.date, answer, imageUrl,
            keywords: {
                set: [],
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { 
            keywords: true, 
            user: true,
            attempts: { where: { userId: req.user.userId }, take: 1 },
            _count: { select: { attempts: true } }
        },
    });
    res.json(formatQuestion(updatedQuestion));
});

// DELETE /questions/:questionId
// Delete a question
// PUT /api/posts/:postId — isOwner checks existence + ownership
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { 
            keywords: true,
            user: true,
            attempts: { where: { userId: req.user.userId }, take: 1 },
            _count: { select: { attempts: true } },
        },
    });

    if (!question) {
        throw new NotFoundError("Question not found");
    }

    // Attempt ensin foreign key ongelmaa varten
    await prisma.attempt.deleteMany({ where: { questionId } });
    await prisma.question.delete({ where: { id: questionId } });

    res.json({
        message: "Question deleted successfully",
        question: formatQuestion(question),
    });
});

// Play endpoint
// POST /api/questions/:questionId/play
router.post("/:questionId/play", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { answer } = req.body;
    
    const question = await prisma.question.findUnique({ 
        where: { id: questionId } 
    });

    if (!question) {
        throw new NotFoundError("Question not found");
    }

    const isCorrect = answer.trim().toLowerCase() === question.answer.trim().toLowerCase();

    const attempt = await prisma.attempt.upsert({
        where: { userId_questionId: { userId: req.user.userId, questionId } },
        update: { correct: isCorrect},
        create: { userId: req.user.userId, questionId, correct: isCorrect },
    });

    res.status(201).json({
        id: attempt.id,
        correct: isCorrect,
        submittedAnswer: answer,
        correctAnswer: question.answer,
        createdAt: attempt.createdAt,
    });
});

// Remove attempt -endpoint
// DELETE /api/questions/:questionId/attempt
router.delete("/:questionId/attempt", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({ where: { id: questionId } });
        if (!question) {
            throw new NotFoundError("Question not found");
    }

    // vaihtaa correctin falseksi
    await prisma.attempt.updateMany({
        where: { userId: req.user.userId, questionId },
        data: {correct: false},
    });

    const attemptCount = await prisma.attempt.count({ where: { questionId } });
    
    res.json({ 
        questionId, 
        correct: false, 
        attemptCount 
    });
});

module.exports = router;