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
        partite:[],
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
        aggiungiGruppo(chatId);  // Aggiungi il gruppo con l'ID chat
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
- /createUser <userId> - Crea un nuovo utente con l'ID specificato.
- /addAlias <userId> <alias> - Aggiungi un alias per un utente esistente.
- /users - Mostra tutti gli utenti registrati in questo gruppo.
- /partita <userId1> <userId2> / <userId3> <userId4> <userId5> - Registra una partita.
- /classifica - Mostra la classifica dei giocatori nel gruppo.
- /override <userId> <points> - Sovrascrive i punti di un utente.
- /undo <userId1> <userId2> / <userId3> <userId4> <userId5> - Annulla una partita.
    `);
});

// Comando `/createUser`: Crea un utente nel gruppo
bot.command("createUser", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const userId = args[0];

    if (!userId) {
        await ctx.reply("Per favore, fornisci un userId per creare un nuovo utente: /createUser <userId>");
        return;
    }

    const dati = caricaDati();
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === ctx.chat.id);
    if (!gruppo) {
        await ctx.reply("Il gruppo non esiste.");
        return;
    }

    const userExists = gruppo.utenti.some((user) => user.userId === userId);
    if (userExists) {
        await ctx.reply("Questo userId è già registrato in questo gruppo.");
        return;
    }

    gruppo.utenti.push({ userId, alias: "", points: 0 });
    salvaDati(dati);
    await ctx.reply(`Utente con ID ${userId} creato con successo nel gruppo.`);
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
        await ctx.reply(`Utente con ID ${userId} non trovato nel gruppo.`);
        return;
    }

    user.alias = alias;
    salvaDati(dati);
    await ctx.reply(`Alias per l'utente ${userId} aggiornato a "${alias}".`);
});

// Comando `/partita`: Registra una partita e aggiorna i punti
bot.command("partita", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const IDGruppo = ctx.chat.id;
    const savePartita = ctx.message.text.replace("/partita " , "");

    if (args.length < 5) {
        await ctx.reply("Per favore, fornisci almeno 5 playerId: /partita <userId1> <userId2> / <userId3> <userId4> <userId5>");
        return;
    }

    let dati = caricaDati();

    let gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);

   gruppo.partite.push(savePartita);

    if (!gruppo) {
        await ctx.reply(`Il gruppo con ID ${IDGruppo} non esiste.`);
        return;
    }

    const splitText = args.join(" ").split("/");  // Divide i team
    const team1 = splitText[0].trim();
    const team2 = splitText[1]?.trim() || "";

    const team1Players = team1.split(" ").filter(Boolean);
    const team2Players = team2.split(" ").filter(Boolean);



    const validUserIds = gruppo.utenti.map((user) => user.userId);
    const invalidUserIds = team1Players.concat(team2Players).filter((userId) => !validUserIds.includes(userId));
    if (invalidUserIds.length > 0) {
        await ctx.reply(`Gli userId ${invalidUserIds.join(", ")} non sono validi per questo gruppo.`);
        return;
    }

    // Aggiorna i punti in base ai risultati
   switch(team1Players.length) {
    case 1:
        // chiamata in mano e vince
        team1Players.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points += 4;
        });
        team2Players.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points -= 1;
        });
        break;
    case 2:
        // chiamata esterna e vince
        var k = 2;
        team1Players.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points += k;
            k--;
        });
        team2Players.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points -= 1;
        });
        break;
    case 3:
        // chiamo in mano e perdo
        team2Players.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points -= 4;
        });
        team1Players.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points += 1;
        });
        break; // aggiungi il break qui
    case 4:
        // chiamo esterno e perdo
        var k = 2;
        team2Players.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points -= k;
            k--;
        });
        team1Players.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points += 1;
        });
        break;
}


    salvaDati(dati);
    await ctx.reply(`Punteggi aggiornati!`);
});

bot.command("undo", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const IDGruppo = ctx.chat.id;
    const savePartita = ctx.message.text.replace("/undo ", "").trim();  // Assicurati che la stringa della partita sia corretta

    // Verifica che l'utente abbia fornito una stringa di partita
    if (!savePartita) {
        await ctx.reply("Errore: devi specificare la partita da annullare. Esempio: /undo <descrizione partita>");
        return;
    }

    const dati = caricaDati();
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    
    if (!gruppo) {
        await ctx.reply(`Errore: il gruppo con ID ${IDGruppo} non esiste.`);
        return;
    }

    // Verifica se la partita esiste
    const partita = gruppo.partite.find((p) => p === savePartita);  // Confronta direttamente le stringhe

    if (!partita) {
        await ctx.reply(`Errore: la partita "${savePartita}" non è mai stata registrata.`);
        return;
    }

    // Se la partita esiste, procediamo con l'annullamento
    const splitText = savePartita.split("/");  // Divide i team
    const team1 = splitText[0].trim();
    const team2 = splitText[1]?.trim() || "";

    const team1Players = team1.split(" ").filter(Boolean);
    const team2Players = team2.split(" ").filter(Boolean);

    // Ottieni gli ID degli utenti validi
    const validUserIds = gruppo.utenti.map((user) => user.userId);
    const invalidUserIds = team1Players.concat(team2Players).filter((userId) => !validUserIds.includes(userId));

    if (invalidUserIds.length > 0) {
        await ctx.reply(`Errore: gli userId ${invalidUserIds.join(", ")} non sono validi per questo gruppo.`);
        return;
    }

    // Aggiorna i punti in base all'undo
    switch (team1Players.length) {
        case 1:
            // chiamata in mano e vince
            team1Players.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points -= 4;  // Ripristina i punti precedenti
            });
            team2Players.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points += 1;  // Ripristina i punti precedenti
            });
            break;
        case 2:
            // chiamata esterna e vince
            let k = 2;
            team1Players.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points -= k;  // Ripristina i punti precedenti
                k--;
            });
            team2Players.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points += 1;  // Ripristina i punti precedenti
            });
            break;
        case 3:
            // chiamo in mano e perdo
            team2Players.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points += 4;  // Ripristina i punti precedenti
            });
            team1Players.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points -= 1;  // Ripristina i punti precedenti
            });
            break;
        case 4:
            // chiamo esterno e perdo
            let k2 = 2;
            team2Players.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points += k2;  // Ripristina i punti precedenti
                k2--;
            });
            team1Players.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points -= 1;  // Ripristina i punti precedenti
            });
            break;
    }

    // Rimuovi la partita dalla lista delle partite
    gruppo.partite = gruppo.partite.filter((p) => p !== savePartita);

    // Salva i dati dopo aver eseguito l'undo
    salvaDati(dati);

    // Rispondi all'utente
    await ctx.reply(`L'operazione di undo è stata eseguita! La partita "${savePartita}" è stata annullata.`);
});
bot.command("clear", async (ctx) => {
    const IDGruppo = ctx.chat.id;

    const dati = caricaDati();
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    
    if (!gruppo) {
        await ctx.reply(`Errore: il gruppo con ID ${IDGruppo} non esiste.`);
        return;
    }

    // Resetta i punti di tutti i giocatori nel gruppo a 0
    gruppo.utenti.forEach((user) => {
        user.points = 0;  // Azzeriamo i punti per ogni giocatore
    });

    // Salva i dati dopo aver azzerato i punti
    salvaDati(dati);

    // Rispondi all'utente
    await ctx.reply("Tutti i punti dei giocatori sono stati azzerati.");
});

bot.command("override", async (ctx) => {
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
});




// Comando `/classifica`: Mostra la classifica dei giocatori nel gruppo
bot.command("classifica", async (ctx) => {
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
            risposta += `${index + 1} Posizione, Nome:${user.alias || user.userId} - ${user.points} punti\n`;
        });
        await ctx.reply(risposta);
    }
});

// Avvio del bot
bot.launch().then(() => {
    console.log("Bot è attivo");
}).catch((err) => {
    console.error("Error starting bot", err);
});

// Stop con SIGINT e SIGTERM
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
