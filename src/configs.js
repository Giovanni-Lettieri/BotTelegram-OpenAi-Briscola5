require("dotenv/config")

const {
    OPENAI_API_KEY ,
    TELEGRAM_BOT_TOKEN,
    DATA_PATH = "data.json"
} = process.env

if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined')
}

if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined')
}


module.exports = {
    OPENAI_API_KEY,
    TELEGRAM_BOT_TOKEN,
    DATA_PATH
}