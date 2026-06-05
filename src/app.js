const path = require('path')
const express = require('express');
const app = express();
const pinoHttp =  require("pino-http");
const logger = require("./lib/logger");
const QuestionsRouter = require("./routes/questions");
const authRouter = require("./routes/auth");
const errorHandler = require("./middleware/errorHandler")

app.use(pinoHttp({ 
    logger,
    autoLogging: { ignore: (req) => req.url.startsWith("/uploads") },
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/questions", QuestionsRouter);

//app.use((req, res) => {
//    throw new NotFoundError();
//});

app.use(errorHandler);

module.exports = app;