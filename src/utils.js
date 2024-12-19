const { DATA_PATH } = require("./configs")
const fs = require("fs");


/* 
    This function is a wrapper around the OpenAI Chat API 
    that allows you to use custom functions in the assistant's 
    responses.

    The function takes an object with the following properties:
    - openai: an instance of the OpenAI API
    - messages: an array of messages that will be sent to the assistant
    - model: the name of the model to use (default: "gpt-3.5-turbo")
    - prompt: the initial prompt to send to the assistant
    - functions: an array of custom functions that the assistant can call

    The function returns a Promise that resolves with the assistant's response.
*/

// Funzione per la creazione di un nuovo gruppo
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

// Funzione per il caricamento dei dati nel nostro file "database.json"
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


const completionWithFunctions = async (options) => {
    const {
        openai,
        messages,
        model = "gpt-3.5-turbo",
        prompt,
        functions
    } = options

    let tools = []

    if (functions.length !== 0) {
        tools = functions.map(({ definition }) => ({
            type: "function",
            function: definition
        }))
    }

    // Add the prompt to the list of messages
    messages.push({
        role: "user",
        content: prompt
    })

    console.log("Messages:", messages)

    const firstCompletion = await openai.chat.completions.create({
        model,
        messages,
        tools: tools.length === 0
            ? undefined
            : tools
    })

    const firstMessage = firstCompletion.choices[0].message
    const { tool_calls } = firstMessage

    // Add the message to the list of messages
    messages.push(firstMessage)
    console.log(tool_calls)
    if (tool_calls) {
        // The assistant has requested one or more tool calls
        for (const toolCall of tool_calls) {
            const functionName = toolCall.function.name
            const functionArguments = JSON.parse(toolCall.function.arguments)
            
            const targetFunction = functions.find(({ definition }) => definition.name === functionName)
            if (!targetFunction) {
                throw new Error(`Function ${functionName} not found`)
            }

            const functionHandler = targetFunction.handler
            const result = await functionHandler(functionArguments)

            // Add the result to the list of messages
            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            })
        }
    }
    

    console.log(messages)

    const secondCompletion = await openai.chat.completions.create({
        model,
        messages,
        tools
    })

    return secondCompletion.choices[0].message.content
}

// Put here other utility functions that can be used in the whole project

// Comando `/createUser`: Crea un utente nel gruppo

/*async function setUsers(ctx) {
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
}
*/

// Funzione per restituire l'output  del comando /help
function writeHelp() {
    return `
        Comandi disponibili:
        - /start - Inizia una conversazione con il bot.
        - /createUser <userId> - Crea un nuovo utente con l'ID specificato.
        - /addAlias <userId> <alias> - Aggiungi un alias per un utente esistente.
        - /users - Mostra tutti gli utenti registrati in questo gruppo.
        - /partita <userId1> <userId2> / <userId3> <userId4> <userId5> - Registra una partita.
        - /classifica - Mostra la classifica dei giocatori nel gruppo.
        - /override <userId> <points> - Sovrascrive i punti di un utente.
        - /undo <userId1> <userId2> / <userId3> <userId4> <userId5> - Annulla una partita.
    `;
}



// Funzione per il comando "/createUser"
/*
async function writeHelp() {
  return `
    Comandi disponibili:
    - /start - Inizia una conversazione con il bot.
    - /createUser <userId> - Crea un nuovo utente con l'ID specificato.
    - /addAlias <userId> <alias> - Aggiungi un alias per un utente esistente.
    - /users - Mostra tutti gli utenti registrati in questo gruppo.
    - /partita <userId1> <userId2> / <userId3> <userId4> <userId5> - Registra una partita.
    - /classifica - Mostra la classifica dei giocatori nel gruppo.
    - /override <userId> <points> - Sovrascrive i punti di un utente.
    - /undo <userId1> <userId2> / <userId3> <userId4> <userId5> - Annulla una partita.
    `;
}*/

// Funcione per il comando "/createUser", crea un nuovo utente nel nostro gruppo determinato dal gruppoId
async function createUser(userId,dati,chatID){
    let gruppo = dati.gruppi.find((g) => g.IDGruppo === chatID);
    gruppo.utenti.push({ userId, alias: "", points: 0 });
    return dati;
}
//Aggiunge l'alias NON LO SALVA 
async function addAlias(user,alias){
    user.alias = alias;
    return user;    
}
async function undo(dati, IDGruppo, winTeams, FailTeams2) {
    // Trova il gruppo associato all'IDGruppo
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    //Controllo esistenza del gruppo
    if (!gruppo) {
        throw new Error(`Errore: il gruppo con ID ${IDGruppo} non esiste.`);
    }

    // Recupera la descrizione della partita dai team
    const savePartita = `${winTeams.join(" ")} / ${FailTeams2.join(" ")}`;

    // Verifica se la partita esiste
    const partita = gruppo.partite.find((p) => p === savePartita);
    // Controllo se sono state trovate delle partite precedentemente
    if (!partita) {
        return `Errore: la partita "${savePartita}" non è mai stata registrata.`;
    }

    // Ottieni gli ID degli utenti validi
    const validUserIds = gruppo.utenti.map((user) => user.userId);
    const invalidUserIds = winTeams.concat(FailTeams2).filter((userId) => !validUserIds.includes(userId));
    // Controllo degli userIds
    if (invalidUserIds.length > 0) {
        return `Errore: gli userId ${invalidUserIds.join(", ")} non sono validi per questo gruppo.`;
    }

    // Aggiorna i punti in base all'undo
    switch (winTeams.length) {
        case 1:
            // chiamata in mano e vince
            winTeams.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points -= 4;  // Ripristina i punti precedenti
            });
            FailTeams2.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points += 1;  // Ripristina i punti precedenti
            });
            break;
        case 2:
            // chiamata esterna e vince
            let k = 2;
            winTeams.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points -= k;  // Ripristina i punti precedenti
                k--;
            });
            FailTeams2.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points += 1;  // Ripristina i punti precedenti
            });
            break;
        case 3:
            // chiamo in mano e perdo
            FailTeams2.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points += 4;  // Ripristina i punti precedenti
            });
            winTeams.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points -= 1;  // Ripristina i punti precedenti
            });
            break;
        case 4:
            // chiamo esterno e perdo
            let k2 = 2;
            FailTeams2.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points += k2;  // Ripristina i punti precedenti
                k2--;
            });
            winTeams.forEach((userId) => {
                const user = gruppo.utenti.find((u) => u.userId === userId);
                if (user) user.points -= 1;  // Ripristina i punti precedenti
            });
            break;
    }

    // Rimuovi la partita dalla lista delle partite
    gruppo.partite = gruppo.partite.filter((p) => p !== savePartita);

    // Salva i dati dopo aver eseguito l'undo
    salvaDati(dati);

    // Restituisci un messaggio di conferma
    return `L'operazione di undo è stata eseguita! La partita "${savePartita}" è stata annullata.`;
}

// Aggiunge partita e lo salva
async function partita(dati, IDGruppo, winTeams, FailTeams2) {
    // Recupera il gruppo associato all'IDGruppo
    let gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    if (!gruppo) {
        throw new Error("Gruppo non trovato!");
    }

    // Aggiungi la partita al gruppo
    const savePartita = `${winTeams.join(" ")} / ${FailTeams2.join(" ")}`;
    gruppo.partite.push(savePartita);

    // Lista di ID utente validi
    const validUserIds = gruppo.utenti.map((user) => user.userId);

    // Verifica che tutti gli ID utente dei team siano validi
    const invalidUserIds = winTeams.concat(FailTeams2).filter((userId) => !validUserIds.includes(userId));
    if (invalidUserIds.length > 0) {
        return `Gli userId ${invalidUserIds.join(", ")} non sono validi per questo gruppo.`;
    }

    // Calcolo dei punteggi
    if (winTeams.length === 1) {
        // chiamata in mano e vince
        winTeams.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points += 4;
        });
        FailTeams2.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points -= 1;
        });
    } else if (winTeams.length === 2) {
        // chiamata esterna e vince
        let k = 2;
        winTeams.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points += k;
            k--;
        });
        FailTeams2.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points -= 1;
        });
    } else if (winTeams.length === 3) {
        // chiamo in mano e perdo
        FailTeams2.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points -= 4;
        });
        winTeams.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points += 1;
        });
    } else if (winTeams.length === 4) {
        // chiamo esterno e perdo
        let k = 2;
        FailTeams2.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points -= k;
            k--;
        });
        winTeams.forEach((userId) => {
            const user = gruppo.utenti.find((u) => u.userId === userId);
            user.points += 1;
        });
    }

    // Salva i dati
    salvaDati(dati);

    return "Punteggi aggiornati!";
}
async function clear(dati, IDGruppo2) {
    // Trova il gruppo associato all'IDGruppo
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo2);
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
async function setOverride(dati, IDGruppo, utenteId, points) {
    // Trova il gruppo associato all'IDGruppo
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    if (!gruppo) {
        throw new Error(`Errore: il gruppo con ID ${IDGruppo} non esiste.`);
    }

    // Trova l'utente all'interno del gruppo
    const user = gruppo.utenti.find((u) => u.userId === utenteId);
    if (!user) {
        throw new Error(`Errore: utente con userId "${utenteId}" non trovato.`);
    }

    // Esegui l'override dei punti
    user.points = points;

    // Salva i dati aggiornati
    salvaDati(dati);

    // Restituisci il messaggio di conferma
    return `Override eseguito! L'utente con userId "${utenteId}" ha ora ${points} punti.`;
}
async function classifica(dati, IDGruppo) {
    // Trova il gruppo associato all'IDGruppo
    const gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
    if (!gruppo) {
        throw new Error("Il gruppo non esiste.");
    }

    const utenti = gruppo.utenti;
    if (utenti.length === 0) {
        return "Non ci sono utenti registrati in questo gruppo.";
    } else {
        // Ordina gli utenti in base ai punti in modo decrescente
        utenti.sort((a, b) => b.points - a.points);

        let risposta = "Classifica:\n";
        utenti.forEach((user, index) => {
            risposta += `${index + 1} Posizione, Nome: ${user.alias || user.userId} - Punteggio -> ${user.points} punti\n`;
        });
        return risposta;
    }
}

 
// Selezioniamo le funzioni che vogliamo esportare da questo file
module.exports = {
    completionWithFunctions,
    aggiungiGruppo,
    writeHelp,
    caricaDati,
    salvaDati,
    writeHelp,
    createUser,
    addAlias,
    partita,
    undo,
    clear,
    setOverride,
    classifica
}