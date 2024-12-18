const OpenAI = require("openai");
const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const fs = require("fs");
const configs = require("./configs");  // Configurazioni, inclusi i token e le chiavi API
const utils = require("./utils");  // Utilità (caricamento e salvataggio dei dati)

/* ===================== SETUP ===================== */

// Carica i dati dal file JSON all'avvio
const data = utils.loadData();

// Salva i dati ogni 5 secondi
setInterval(() => utils.saveData(data), 5000);

// Configura il bot con il token Telegram
const bot = new Telegraf(configs.TELEGRAM_BOT_TOKEN);

// Configura l'API OpenAI
const openai = new OpenAI({
    apiKey: configs.OPENAI_API_KEY
});

/* ===================== CARICAMENTO E SALVATAGGIO DATI ===================== */

// Carica i dati dal file JSON
function caricaDati(filename = "data.json") {
    try {
        const data = fs.readFileSync(filename, "utf8");
        const parsedData = JSON.parse(data);

        if (!parsedData.gruppi) {
            parsedData.gruppi = [];
        }
        if (!parsedData.users) {
            parsedData.users = [];
        }
        return parsedData;
    } catch (err) {
        console.error("Errore nel caricare il file:", err);
        return { gruppi: [], users: [] };  // Restituisci un oggetto vuoto in caso di errore
    }
}

// Salva i dati nel file JSON
function salvaDati(dati, filename = "data.json") {
    try {
        fs.writeFileSync(filename, JSON.stringify(dati, null, 2), "utf8");
    } catch (err) {
        console.error("Errore nel salvare il file:", err);
    }
}

/* ===================== FUNZIONE PER AGGIUNGERE UN GRUPPO ===================== */

// Aggiungi un nuovo gruppo
function aggiungiGruppo(IDGruppo) {
    const dati = caricaDati();
    const nuovoGruppo = {
        IDGruppo: IDGruppo,
        utenti: []
    };
    dati.gruppi.push(nuovoGruppo);
    salvaDati(dati);
    console.log(`Gruppo con ID ${IDGruppo} aggiunto.`);
}

/* ===================== COMANDI BOT ===================== */

// Comando `/start`: Inizia una conversazione con il bot e crea un gruppo
bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    await aggiungiGruppo(chatId);  // Aggiungi il gruppo con l'ID chat
    await ctx.reply(`Gruppo creato con successo per il chat ID: ${chatId}`);
});

// Comando `/help`: Mostra i comandi disponibili
bot.command("help", async (ctx) => {
    await ctx.reply(`
Comandi disponibili:
- /start - Inizia una conversazione con il bot.
- /ai <domanda> - Fai una domanda al bot e ottieni una risposta da OpenAI.
- /createUser <userId> - Crea un nuovo utente con l'ID specificato.
- /addAlias <userId> <alias> - Aggiungi un alias per un utente esistente.
- /users - Mostra tutti gli utenti registrati.
- /partita <userId1> <userId2> / <userId3> <userId4> <userId5> - Registra una partita.
- /classifica - Mostra la classifica dei giocatori.
- /override <userId> <points> - Sovrascrive i punti di un utente.
- /undo <userId1> <userId2> / <userId3> <userId4> <userId5> - Annulla una partita.
    `);
});

// Comando `/createUser <userId>`: Crea un nuovo utente
bot.command("createUser", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const userId = args[0];

    if (!userId) {
        await ctx.reply("Per favore, fornisci un userId per creare un nuovo utente: /createUser <userId>");
        return;
    }

    const dati = caricaDati();
    if (dati.users.some((user) => user.userId === userId)) {
        await ctx.reply("Questo utente è già registrato.");
        return;
    }

    // Aggiungi il nuovo utente
    dati.users.push({ userId, alias: "", points: 0 });
    salvaDati(dati);
    await ctx.reply(`Utente con ID ${userId} creato con successo.`);
});

// Comando `/users`: Mostra tutti gli utenti registrati
bot.command("users", async (ctx) => {
    const dati = caricaDati();
    const users = dati.users;

    if (users.length === 0) {
        await ctx.reply("Non ci sono utenti registrati.");
    } else {
        let risposta = "Utenti registrati:\n";
        users.forEach((user) => {
            risposta += `ID: ${user.userId}, Alias: ${user.alias}, Punti: ${user.points}\n`;
        });
        await ctx.reply(risposta);
    }
});

// Comando `/addAlias <userId> <alias>`: Aggiungi un alias a un utente
bot.command("addAlias", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const userId = args[0];
    const alias = args.slice(1).join(" ");

    if (!userId || !alias) {
        await ctx.reply("Per favore, fornisci un userId e un alias: /addAlias <userId> <alias>");
        return;
    }

    const dati = caricaDati();
    const user = dati.users.find((u) => u.userId === userId);

    if (!user) {
        await ctx.reply(`Utente con ID ${userId} non trovato.`);
        return;
    }

    user.alias = alias;
    salvaDati(dati);
    await ctx.reply(`Alias per l'utente ${userId} aggiornato a "${alias}".`);
});

// Comando `/partita <userId1> <userId2> / <userId3> <userId4> <userId5>`: Registra una partita
bot.command("partita", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length < 5) {
        await ctx.reply("Per favore, fornisci almeno 5 playerId: /partita <userId1> <userId2> / <userId3> <userId4> <userId5>");
        return;
    }

    const userIds1 = args.slice(0, 3); // Squadra 1
    const userIds2 = args.slice(3);    // Squadra 2

    const dati = caricaDati();
    const squadra1 = dati.users.filter((user) => userIds1.includes(user.userId));
    const squadra2 = dati.users.filter((user) => userIds2.includes(user.userId));

    if (squadra1.length !== 3 || squadra2.length !== 2) {
        await ctx.reply("Ogni squadra deve avere il numero corretto di giocatori.");
        return;
    }

    // Simula i punteggi (potresti modificare questa parte con un vero calcolo dei punteggi)
    const squadra1Points = Math.floor(Math.random() * 10);
    const squadra2Points = Math.floor(Math.random() * 10);

    // Aggiungi i punteggi
    squadra1.forEach((user) => (user.points += squadra1Points));
    squadra2.forEach((user) => (user.points += squadra2Points));

    salvaDati(dati);

    await ctx.reply(`
Partita completata!
Squadra 1 (Punti: ${squadra1Points}): ${squadra1.map((u) => u.alias).join(", ")}
Squadra 2 (Punti: ${squadra2Points}): ${squadra2.map((u) => u.alias).join(", ")}
`);
});

// Comando `/classifica`: Mostra la classifica dei giocatori
bot.command("classifica", async (ctx) => {
    const dati = caricaDati();
    const users = dati.users;

    if (users.length === 0) {
        await ctx.reply("Non ci sono utenti registrati.");
    } else {
        users.sort((a, b) => b.points - a.points);  // Ordina per punti decrescenti

        let risposta = "Classifica:\n";
        users.forEach((user, index) => {
            risposta += `${index + 1}. ${user.alias} - ${user.points} punti\n`;
        });
        await ctx.reply(risposta);
    }
});

// ===================== AVVIO BOT ===================== //
bot.launch().then(() => {
    console.log("Bot is up and running");
}).catch((err) => {
    console.error("Error starting bot", err);
});

// Abilita lo stop del bot con SIGINT e SIGTERM per lo sviluppo
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
