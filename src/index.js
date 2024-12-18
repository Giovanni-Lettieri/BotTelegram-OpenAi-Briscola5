const OpenAI = require("openai");
const { Telegraf } = require("telegraf");
const fs = require("fs");
const configs = require("./configs");  // Configurazioni, inclusi i token e le chiavi API

/* ===================== SETUP ===================== */

// Carica i dati dal file JSON all'avvio
function caricaDati(filename = "database.json") {
    try {
        const data = fs.readFileSync(filename, "utf8");
        const parsedData = JSON.parse(data);

        // Assicurati che esistano le chiavi 'gruppi' e 'users'
        if (!parsedData.gruppi) {
            parsedData.gruppi = [];
        }
        return parsedData;
    } catch (err) {
        console.error("Errore nel caricare il file:", err);
        return { gruppi: [] };  // Restituisci un oggetto vuoto in caso di errore
    }
}

// Salva i dati nel file JSON
function salvaDati(dati, filename = "database.json") {
    try {
        fs.writeFileSync(filename, JSON.stringify(dati, null, 2), "utf8");
    } catch (err) {
        console.error("Errore nel salvare il file:", err);
    }
}

// Funzione per aggiungere un gruppo
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

const bot = new Telegraf(configs.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({
    apiKey: configs.OPENAI_API_KEY
});

// Comando `/start`: Inizia una conversazione con il bot e crea un gruppo
bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const dati = caricaDati();

    // Verifica se il gruppo esiste già
    if (!dati.gruppi.find((g) => g.IDGruppo === chatId)) {
        await aggiungiGruppo(chatId);  // Aggiungi il gruppo con l'ID chat
        await ctx.reply(`Gruppo creato con successo per il chat ID: ${chatId}`);
    } else {
        await ctx.reply(`Il gruppo con ID ${chatId} esiste già.`);
    }
});

// Comando `/help`: Mostra i comandi disponibili
bot.command("help", async (ctx) => {
    await ctx.reply(`
Comandi disponibili:
- /start - Inizia una conversazione con il bot.
- /ai <domanda> - Fai una domanda al bot e ottieni una risposta da OpenAI.
- /createUser <userId> - Crea un nuovo utente con l'ID specificato.
- /addAlias <userId> <alias> - Aggiungi un alias per un utente esistente.
- /users - Mostra tutti gli utenti registrati in questo gruppo.
- /partita <userId1> <userId2> / <userId3> <userId4> <userId5> - Registra una partita.
- /classifica - Mostra la classifica dei giocatori nel gruppo.
- /override <userId> <points> - Sovrascrive i punti di un utente.
- /undo <userId1> <userId2> / <userId3> <userId4> <userId5> - Annulla una partita.
    `);
});

// Comando `/createUser <userId>`: Crea un nuovo utente all'interno del gruppo
bot.command("createUser", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const userId = args[0];
    const IDGruppo = ctx.chat.id;

    if (!userId) {
        await ctx.reply("Per favore, fornisci un userId per creare un nuovo utente: /createUser <userId>");
        return;
    }

    const dati = caricaDati();
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    if (!gruppo) {
        await ctx.reply(`Il gruppo con ID ${IDGruppo} non esiste.`);
        return;
    }

    // Controlla se l'utente è già nel gruppo
    if (gruppo.utenti.some((user) => user.userId === userId)) {
        await ctx.reply("Questo utente è già registrato in questo gruppo.");
        return;
    }

    // Aggiungi l'utente al gruppo
    gruppo.utenti.push({ userId, alias: "", points: 0 });
    salvaDati(dati);
    await ctx.reply(`Utente con ID ${userId} creato con successo nel gruppo ${IDGruppo}.`);
});

// Comando `/users`: Mostra tutti gli utenti registrati nel gruppo
bot.command("users", async (ctx) => {
    const IDGruppo = ctx.chat.id;

    const dati = caricaDati();
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);

    if (!gruppo) {
        await ctx.reply(`Il gruppo con ID ${IDGruppo} non esiste.`);
        return;
    }

    const utenti = gruppo.utenti;

    if (utenti.length === 0) {
        await ctx.reply("Non ci sono utenti registrati in questo gruppo.");
    } else {
        let risposta = "Utenti nel gruppo:\n";
        utenti.forEach((user) => {
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
    const IDGruppo = ctx.chat.id;

    if (!userId || !alias) {
        await ctx.reply("Per favore, fornisci un userId e un alias: /addAlias <userId> <alias>");
        return;
    }

    const dati = caricaDati();
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    if (!gruppo) {
        await ctx.reply(`Il gruppo con ID ${IDGruppo} non esiste.`);
        return;
    }

    const user = gruppo.utenti.find((u) => u.userId === userId);
    if (!user) {
        await ctx.reply(`Utente con ID ${userId} non trovato nel gruppo ${IDGruppo}.`);
        return;
    }

    user.alias = alias;
    salvaDati(dati);
    await ctx.reply(`Alias per l'utente ${userId} nel gruppo ${IDGruppo} aggiornato a "${alias}".`);
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
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === ctx.chat.id);
    if (!gruppo) {
        await ctx.reply(`Il gruppo con ID ${ctx.chat.id} non esiste.`);
        return;
    }

    const squadra1 = gruppo.utenti.filter((user) => userIds1.includes(user.userId));
    const squadra2 = gruppo.utenti.filter((user) => userIds2.includes(user.userId));

    if (squadra1.length !== 3 || squadra2.length !== 2) {
        await ctx.reply("Ogni squadra deve avere il numero corretto di giocatori.");
        return;
    }

    const squadra1Points = Math.floor(Math.random() * 10);
    const squadra2Points = Math.floor(Math.random() * 10);

    squadra1.forEach((user) => (user.points += squadra1Points));
    squadra2.forEach((user) => (user.points += squadra2Points));

    salvaDati(dati);

    await ctx.reply(`
Partita completata!
Squadra 1 (Punti: ${squadra1Points}): ${squadra1.map((u) => u.alias).join(", ")}
Squadra 2 (Punti: ${squadra2Points}): ${squadra2.map((u) => u.alias).join(", ")}
`);
});

// Comando `/classifica`: Mostra la classifica dei giocatori nel gruppo
bot.command("classifica", async (ctx) => {
    const dati = caricaDati();
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === ctx.chat.id);

    if (!gruppo) {
        await ctx.reply("Il gruppo non esiste.");
        return;
    }

    const users = gruppo.utenti;

    if (users.length === 0) {
        await ctx.reply("Non ci sono utenti registrati in questo gruppo.");
    } else {
        users.sort((a, b) => b.points - a.points);

        let risposta = "Classifica:\n";
        users.forEach((user, index) => {
            risposta += `${index + 1}. ${user.alias} - ${user.points} punti\n`;
        });
        await ctx.reply(risposta);
    }
});

// Avvio del bot
bot.launch().then(() => {
    console.log("Bot is up and running");
}).catch((err) => {
    console.error("Error starting bot", err);
});

// Stop con SIGINT e SIGTERM
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
