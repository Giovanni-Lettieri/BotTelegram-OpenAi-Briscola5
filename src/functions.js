const f = require("./utils");
const { Telegraf, Context } = require("telegraf");
const configs = require("./configs");  // Configurazioni, inclusi i token e le chiavi API

const functions = [
  // help
  {
    definition: {
      name: "writeHelp",
      description: "Mostra un messagio di aiuto con i comandi",
    },
    handler: () => {
      f.writeHelp();
    }
  },

  // create user
  {
    definition: {
      name: "createUser",
      description: "Funzione che dato un parametro crea un nuovo utente che ha per nome (userid) quel parametro.",
      parameters: {
        type: "object",
        properties: {
          userid: {
            type: "string"
          },
          chatId: {
            type: "number"
          }
        }
      }
    },
    handler: async (options) => {
      const { userid, chatId } = options;
      f.salvaDati(await f.createUser(userid, f.caricaDati(), chatId));
    }
  },

  // alias
  {
    definition: {
      name: "addAlias",
      description: "Funzione che, dati come parametri l'userid (univoco) di un utente già esistente ed un alias, assegna all'userid quel alias.",
      parameters: {
        type: "object",
        properties: {
          userid: {
            type: "string"
          },
          alias: {
            type: "string"
          },
          chatId: {
            type: "number"
          }
        }
      }
    },
    handler: async (options) => {
      const { alias, userId, chatId } = options;
      let dati = f.caricaDati();
      let gruppo = dati.gruppi.find((g) => g.IDGruppo === chatId);
      let user = gruppo.utenti.find((u) => u.userId === userId);
      f.salvaDati(await f.addAlias(user, alias));
    }
  },

  // partita
  {
    definition: {
      name: "partita",
      description: "Funzione che, dati 2 array di utenti, assegna a ciascuno i punti ottenuti. I 2 array sono strutturati nel seguente modo: arrW contiene gli utenti della squadra vincente, mentre arrF i perdenti. L'array più piccolo ha in prima posizione il giocatore che ha effettuato la chiamata.",
      parameters: {
        type: "object",
        properties: {
          arrW: {
            type: "array",
            items: { type: "string" }
          },
          arrF: {
            type: "array",
            items: { type: "string" }
          },
          chatId: {
            type: "number"
          }
        }
      }
    },
    handler: async (options) => {
      const { arrW, arrF, chatId } = options;
      await f.partita(f.caricaDati(), chatId, arrW, arrF);
    }
  },

  // undo
  {
    definition: {
      name: "undo",
      description: "Funzione che, dati 2 array di utenti che hanno fatto una partita, cerca in un database se tale partita è effettivamente avvenuta e, se sì, la elimina, riassegnando i punti come se non fosse mai avvenuta. Gli array sono strutturati come per la funzione partita.",
      parameters: {
        type: "object",
        properties: {
          arrW: {
            type: "array",
            items: { type: "string" }
          },
          arrF: {
            type: "array",
            items: { type: "string" }
          },
          chatId: {
            type: "number"
          }
        }
      }
    },
    handler: async (options) => {
      const { arrW, arrF, chatId } = options;
      await f.undo(f.caricaDati(), chatId, arrW, arrF);
    }
  },

  // classifica

  {
    definition: {
      name: "classifica",
      description: "Funzione che, dato un gruppo, restituisce la classifica dei giocatori migliorane l'estetica.",
      parameters: {
        type: "object",
        properties: {
          chatId: {
            type: "number"
          }
        }
      }
    },
handler: async (options) => {
  const { chatId } = options;
  
  // Carica i dati e ottieni la classifica
  const classifica = await f.classifica(await f.caricaDati(), chatId);
  
  // Log per il debug (opzionale)
  console.log(classifica);
  
  // Invia la classifica come risposta
    return classifica;
}

  },

  // clear
  {
    definition: {
      name: "clear",
      description: "Funzione che azzera i punteggi degli utenti di un gruppo.",
      parameters: {
        type: "object",
        properties: {
          userid: {
            type: "string"
          },
          chatId: {
            type: "number"
          }
        }
      }
    },
    handler: (options) => {
      const { userid, chatId } = options;
      f.clear(f.caricaDati(), chatId);
    }
  },

  // setOverride
  {
    definition: {
      name: "setOverride",
      description: "Funzione che sovrascrive il punteggio di uno user con un nuovo punteggio scelto dall'utente.",
      parameters: {
        type: "object",
        properties: {
          userid: {
            type: "string"
          },
          punti: {
            type: "number"
          },
          chatId: {
            type: "number"
          }
        }
      }
    },
    handler: async (options) => {
      const { userid, punti, chatId } = options;
      await f.setOverride(f.caricaDati(), chatId, userid, punti);
    }
  }
];

module.exports = {
  functions
};
