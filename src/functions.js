const f = require("./utils");
const OpenAI = require("openai");
const { Telegraf } = require("telegraf");
const configs = require("./configs");  // Configurazioni, inclusi i token e le chiavi API
const { message } = require("telegraf/filters")

const functions = [{
    //help
    definition: {
        name: "writeHelp",
        description: "funzione che stampa un messagio di aiuto che elenca tutti i comandi disponibili, serve quando l'utente quando non conosce un comando o ne sbaglia uno",
    },
    handler: () => {
        f.writeHelp();
    },
    //create user
    definition: {
        name: "createUser",
        description: "funzione che dato un parametro crea un nuovo utente che ha per nome(userid) quel parametro",
        parameters: {
            type: "object",
            properties: {
                userid: {
                    type: "string"
                }
            },
        }
    },
    handler: async (options) => {
        const { userid } = options
        f.salvaDati ( await f.createUser(userid , f.caricaDati() , ctx.chat.id ));
    },
    //alias
    definition: {
        name: "addAlias",
        description: "Funzione che dati come parametri l'userid(univoco) di un utente gia esistente ed un alias assegna al'userid quel alias",
        parameters: {
            type: "object",
            properties: {
                userid: {
                    type: "string"
                },
                alias: {
                    type: "string"
                }
            },
        }
    },
    handler: async (options) => {
        const{ alias , userId } = options;
        const IDGruppo = ctx.chat.id; 
        let dati = caricaDati();
        let gruppo = dati.gruppi.find((g) => g.IDGruppo === IDGruppo);
        let user = gruppo.utenti.find((u) => u.userId === userId);
        f.salvaDati(await f.addAlias(user , alias));   
    },
    //partita
    // dati gen , chat id ,  arr w , aar f 
    definition: {
        name: "partita",
        description: "funzione che dati 2 array di utenti assegna a ciascuno i punti ottenuti,i 2 array sono strutturati nel seguente modo: arrW contiente gli utenti della squadra vincente mentre arrF i perdenti, l'array piu piccolo ha in prima posizione il giocatore che ha effetuato la chiamata",
        parameters: {
            type: "object",
            properties: {
                arrW: {
                    type: "array", 
                    items : {type:"string"}
                },
                arrF: {
                    type: "array", 
                    items : {type:"string"}
                }
            },
        }
    },
    handler: async (options) => {
        const{ arrW , arrF } = options;
        await f.partita(f.caricaDati  , ctx.chat.it , arrW , arrF); 
    },
    //undo
    definition: {
        name: "undo",
        description: "",
        parameters: {
            type: "object",
            properties: {
                x: {
                    type: "string"
                },
            },
        }
    },
    handler: (options) => {
        
    },
    //clasifica
    //dati idgruppo 
    definition: {
        name: "classifica",
        description: "la funzione stampa una classifica in base ai punti di ogni giocatore",
    },
    handler: (options) => {
          f.classifica();
    },
    //overide
    definition: {
        name: "override",
        description: "funzione che sovrascrive il punteggio di un utente con un nuovo punteggio",
        parameters: {
            type: "object",
            properties: {
                userid: {
                    type: "string"
                },
                punti: {
                      type: "number"
                },
            },
        }
    },
    handler: async (options) => {
        const{ userid , punti } = options;
        f.salvaDati(await f.override(f.caricaDati() , ctx.chat.id , userid , punti));
    },
    //clear FINIRE
    definition: {
        name: "clear", // dati, IDGRUPPO(chat.id)
        description: "funzione che sovrascrive il punteggio di un utente con un nuovo punteggio",
        parameters: {
            type: "object",
            properties: {
                userid: {
                    type: "string"
                },
                punti: {
                      type: "number"
                },
            },
        }
    },
    handler: async (options) => {
        const{ userid , punti } = options;
        f.salvaDati(await f.);
    }
}]


module.exports = {
    functions
}