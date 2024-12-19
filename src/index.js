const OpenAI = require("openai");
const { Telegraf } = require("telegraf");
const configs = require("./configs");  // Configurazioni, inclusi i token e le chiavi API
const { message } = require("telegraf/filters")
const { salvaDati, caricaDati,aggiungiGruppo,writeHelp,createUser,addAlias,partita,undo } = require("./utils");


/* ===================== SETUP ===================== */

// Carica i dati dal file JSON all'avvio


// Funzione per aggiungere un gruppo


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
        aggiungiGruppo(chatId);  // Aggiungi il gruppo con l'ID chat
        await ctx.reply(`Gruppo creato con successo per il chat ID: ${chatId}`);
    } else {
        await ctx.reply(`Il gruppo con ID ${chatId} esiste già.`);
    }
});

// Comando `/help`: Mostra i comandi disponibili
bot.command("help", async (ctx) => {
    const helpMessage = await writeHelp();
    await ctx.reply(helpMessage);
});


// Comando `/createUser`: Crea un utente nel gruppo
bot.command("createUser", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const userId = args[0];
    // Controlliamo che sia presente il nostro utente (userId)
    if (!userId) {
        await ctx.reply("Per favore, fornisci un userId per creare un nuovo utente: /createUser <userId>");
        return;
    }

    let dati = caricaDati();
 
    console.log("userid index", userId)
    // Salviamo i dati nel file JSONel userId ed il contesto
    dati = await createUser(userId, dati,ctx.chat.id);
    salvaDati(dati);
    await ctx.reply(`Utente con ID ${userId} creato con successo nel gruppo.`);
});

// Comando `/users`: Mostra tutti gli utenti registrati nel gruppo
bot.command("users", async (ctx) => {
    const IDGruppo = ctx.chat.id;
    const dati = caricaDati();
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    // Controllo che esista già l'IDGruppo
    if (!gruppo) {
        await ctx.reply(`Il gruppo con ID ${IDGruppo} non esiste.`);
        return;
    }

    // Controlliamo il quantitativo di utenti
    if (gruppo.utenti.length === 0) {
        await ctx.reply("Non ci sono utenti registrati in questo gruppo.");
    } else {
        let risposta = "Utenti nel gruppo:\n";
        gruppo.utenti.forEach((user) => {
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

    // Chiediamo l'inserimento e l'alias
    if (!userId || !alias) {
        await ctx.reply("Per favore, fornisci un userId e un alias: /addAlias <userId> <alias>");
        return;
    }

    let dati = caricaDati();
    let gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    if (!gruppo) {
        await ctx.reply(`Il gruppo con ID ${IDGruppo} non esiste.`);
        return;
    }

    let user = gruppo.utenti.find((u) => u.userId === userId);
    // Controlliamo la presenza dell'utente
    if (!user) {
        await ctx.reply(`Utente con ID ${userId} non trovato nel gruppo.`);
        return;
    }
    // Attribuiamo all'utente l'alias e salviamo i dati nel file JSON
    user = addAlias(user,alias);
    salvaDati(dati);
    await ctx.reply(`Alias per l'utente ${userId} aggiornato a "${alias}".`);

});

// Comando `/partita`: Registra una partita e aggiorna i punti


// Funzione partita modificata


// Comando `/partita`: Registra una partita e aggiorna i punti
bot.command("partita", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const IDGruppo = ctx.chat.id;

    if (args.length < 5) {
        await ctx.reply("Per favore, fornisci almeno 5 playerId: /partita <userId1> <userId2> / <userId3> <userId4> <userId5>");
        return;
    }

    // Carica i dati
    let dati = caricaDati();

    // Dividi i giocatori nei due team
    const splitText = args.join(" ").split("/");  // Divide i team
    const team1 = splitText[0].trim();
    const team2 = splitText[1]?.trim() || "";
    // Prepariamo gli array con il team dei vincitori (team1) e dei perdenti (team2)
    const team1Players = team1.split(" ").filter(Boolean);
    const team2Players = team2.split(" ").filter(Boolean);

    // Esegui la funzione partita passando i parametri
    const result = await partita(dati, IDGruppo, team1Players, team2Players);

    // Rispondi con il risultato
    await ctx.reply(result);
});

// Funzione undo modificata, ci permette di tornare indietro con le partite

// Comando `/undo`: Annulla una partita e aggiorna i punteggi
bot.command("undo", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const IDGruppo = ctx.chat.id;

    if (args.length < 5) {
        await ctx.reply("Per favore, fornisci almeno 5 playerId: /undo <userId1> <userId2> / <userId3> <userId4> <userId5>");
        return;
    }

    // Carica i dati
    let dati = caricaDati();

    // Dividi i giocatori nei due team
    const splitText = args.join(" ").split("/");  // Divide i team
    const team1 = splitText[0].trim();
    const team2 = splitText[1]?.trim() || "";

    const team1Players = team1.split(" ").filter(Boolean);
    const team2Players = team2.split(" ").filter(Boolean);

    // Esegui la funzione undo passando i parametri
    const result = await undo(dati, IDGruppo, team1Players, team2Players);

    // Rispondi con il risultato
    await ctx.reply(result);
});

// Eseguiamo un reset dei punteggi di tutti gli utenti
// Funzione clear modificata
async function clear(dati, IDGruppo) {
    // Trova il gruppo associato all'IDGruppo
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    if (!gruppo) {
        throw new Error(`Errore: il gruppo con ID ${IDGruppo} non esiste.`);
    }

    // Resetta i punti di tutti i giocatori nel gruppo a 0
    gruppo.utenti.forEach((user) => {
        user.points = 0;  // Azzeriamo i punti per ogni giocatore
    });

    // Salva i dati dopo aver azzerato i punti
    salvaDati(dati);

    // Restituisci un messaggio di conferma
    return "Tutti i punti dei giocatori sono stati azzerati.";
}

// Comando `/clear`: Azzerare i punti di tutti i giocatori del gruppo
bot.command("clear", async (ctx) => {
    const IDGruppo = ctx.chat.id;

    // Carica i dati
    let dati = caricaDati();

    try {
        // Esegui la funzione clear passando i parametri
        const result = await clear(dati, IDGruppo);

        // Rispondi con il risultato
        await ctx.reply(result);
    } catch (error) {
        await ctx.reply(error.message);  // Rispondi con l'errore, se presente
    }
});

async function setOverride (ctx){
    // Devo eseguire l'override dei punti del valore passato come parametro
    // - /override <userId> <points>
    const args = ctx.message.text.split(" ").slice(1);

    // Controllo preliminare per assicurarsi che ci siano abbastanza argomenti
    if (args.length < 2) {
        return await ctx.reply("Errore: devi specificare un userId e un valore per i punti. Esempio: /override <userId> <points>");
    }

    const userId = args[0].toString();  // Assicuriamoci che userId sia una stringa
    const points = parseInt(args[1], 10);

    // Controlla che `points` sia un numero valido
    if (isNaN(points)) {
        return await ctx.reply("Errore: il valore dei punti deve essere un numero valido.");
    }

    // Carica i dati del gruppo (se necessario)
    const dati = caricaDati();  // Assicurati che questa funzione carichi i dati correttamente
    const IDGruppo = ctx.chat.id;
    
    // Trova il gruppo dal dato
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);

    // Se il gruppo non esiste, invia un messaggio di errore
    if (!gruppo) {
        return await ctx.reply(`Errore: il gruppo con ID ${IDGruppo} non esiste.`);
    }

    // Trova l'utente all'interno del gruppo
    const user = gruppo.utenti.find((u) => u.userId === userId);

    if (!user) {
        return await ctx.reply(`Errore: utente con userId "${userId}" non trovato.`);
    }

    // Esegui l'override dei punti
    user.points = points;

    // Salva i dati aggiornati
    salvaDati(dati);

    // Rispondi al comando
    await ctx.reply(`Override eseguito! L'utente con userId "${userId}" ha ora ${points} punti.`);
};

bot.command("override", async (ctx) => {
    setOverride(ctx);  
});
async function clasifica(ctx){
    let dati = caricaDati();
    let gruppo = dati.gruppi.find((g) => g.IDGruppo === ctx.chat.id);

    if (!gruppo) {
        await ctx.reply("Il gruppo non esiste.");
        return;
    }

    const utenti = gruppo.utenti;
    if (utenti.length === 0) {
        await ctx.reply("Non ci sono utenti registrati in questo gruppo.");
    } else {
        utenti.sort((a, b) => b.points - a.points);

        let risposta = "Classifica:\n";
        utenti.forEach((user, index) => {
            risposta += `${index + 1} Posizione, Nome:${user.alias || user.userId} - Punteggio -> ${user.points} punti\n`;
        });
        await ctx.reply(risposta);
    }
}
// Comando `/classifica`: Mostra la classifica dei giocatori nel gruppo
bot.command("classifica", async (ctx) => {
    clasifica(ctx);
});
bot.on(message("text"), async (ctx) => {
    await ctx.reply(`You said: ${ctx.message.text}`)
})

// Avvio del bot
bot.launch().then(() => {
    console.log("Bot è attivo");
}).catch((err) => {
    console.error("Error starting bot", err);
});

// Stop con SIGINT e SIGTERM
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));