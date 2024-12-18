const OpenAI = require("openai")
const { Telegraf } = require("telegraf")
const { message } = require("telegraf/filters")

const configs = require("./configs")
const utils = require("./utils")

/* ===================== SETUP ===================== */

const data = utils.loadData()
setInterval(() => utils.saveData(data), 5000)

const bot = new Telegraf(configs.TELEGRAM_BOT_TOKEN)
const openai = new OpenAI({
    apiKey: configs.OPENAI_API_KEY
})

/* ===================== BOT ===================== */

bot.start(async (ctx) => {
    const chatId = ctx.chat.id
    await ctx.reply(`Hello! Your chat ID is ${chatId}`)
})

bot.on(message("text"), async (ctx) => {
    const message = ctx.message.text
    await ctx.reply(`You said: ${message}`)
})

/* ===================== LAUNCH ===================== */

bot.launch(() => {
    console.log('Bot is up and running')
}).catch((err) => {
    console.error('Error starting bot', err)
})

// Enable graceful stop for develop
process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))