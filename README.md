# GavaDrop

Un'applicazione moderna per la condivisione di file e cartelle nella rete locale tramite WebRTC con chat integrata e crittografia end-to-end.

## Caratteristiche

- **Trasferimento file peer-to-peer** senza server
- **Trasferimento cartelle complete** con compressione ZIP automatica
- **Anteprime file integrate** - Visualizza immagini e icone per tutti i tipi di file
- **Crittografia end-to-end opzionale** - AES-GCM 256-bit con derivazione PBKDF2
- **Chat in tempo reale** tra dispositivi connessi
- **Notifiche messaggi non letti** persistenti
- **Persistenza di sessione** - ripristina lo stato dopo refresh
- **Gestione disconnessione** con grazia period di 4 secondi
- **Auto-riconnessione** dispositivi con selezione automatica
- **Cronologia trasferimenti completa** - Traccia tutti i file inviati/ricevuti con filtri
- **Sistema di resend intelligente** - Reinvia file automaticamente dai dati salvati
- **Trasferimenti ottimizzati** - Chunking dinamico e compressione intelligente  
- **Velocità adattiva** - Dimensione chunk ottimale basata sulla velocità di rete
- **Notifiche audio sintetiche** - Suoni distintivi per ogni tipo di evento
- Funziona solo nella rete locale per sicurezza
- Barre di progresso sincronizzate in tempo reale con animazioni fluide
- Sistema di accettazione/rifiuto file e cartelle
- Nomi dispositivi personalizzabili
- **Supporto multilingue** - Italiano/Inglese con rilevamento automatico
- **Tema scuro/chiaro** - Con rilevamento preferenze sistema
- **Trasferimento batch con ZIP** - File multipli compressi automaticamente in un archivio
- **Design moderno** - Interfaccia bento-style con shadcn/ui e font Silkscreen
- **UI non-scrollabile** con scroll interno nelle aree necessarie

## Come funziona

### Utilizzo
- **Seleziona dispositivo**: Clicca su un dispositivo dalla sidebar sinistra
- **Chat istantanea**: Apri la chat cliccando il pulsante chat o selezionando un dispositivo con messaggi
- **Invia file**: Trascina file o clicca "Seleziona File"
- **Invia cartelle**: Trascina cartelle intere o clicca "Seleziona Cartella" - vengono compresse automaticamente in ZIP
- **Anteprime file**: Visualizza anteprime delle immagini e icone appropriate per ogni tipo di file
- **Crittografia**: Abilita il toggle "Crittografia End-to-End" e inserisci una password opzionale
- **File criptati**: I file criptati vengono scaricati con una password (3 tentativi massimi)
- **File multipli**: Aggiungi più file e cartelle alla coda prima di inviare
- **Trasferimento ZIP**: I file multipli vengono compressi in un archivio ZIP senza perdita di qualità
- **Accetta/Rifiuta**: Rispondi alle richieste di trasferimento con anteprima completa dei file
- **Notifiche messaggi**: Vedi i badge rossi per messaggi non letti
- **Persistenza stato**: L'app ricorda dispositivo selezionato, chat aperta e testo in corso
- **Gestione disconnessioni**: I dispositivi restano selezionati per 4 secondi durante disconnessioni
- **Cronologia**: Accedi alla cronologia completa con il pulsante History in basso nella sidebar
- **Resend file**: Reinvia file dalla cronologia con un click (icona verde = automatico, blu = seleziona file)
- **Trasferimenti veloci**: Velocità ottimizzata con chunking adattivo (4KB-1MB) e compressione automatica
- **Notifiche audio**: Senti suoni distintivi per messaggi, richieste file, successi ed errori
- **Rinomina dispositivo**: Clicca l'icona matita accanto al nome
- **Cambia lingua**: Usa il toggle 🇮🇹/🇺🇸 nell'header
- **Cambia tema**: Usa il toggle sole/luna per tema scuro/chiaro

### Funzionalità
- **Chat P2P**: Messaggi istantanei tramite WebRTC con fallback Socket.IO
- **Trasferimento cartelle**: Invia cartelle complete con struttura preservata tramite compressione ZIP
- **Anteprime avanzate**: Visualizzazione immagini reali e icone intelligenti per ogni tipo di file
- **Crittografia AES-GCM**: Protezione opzionale dei file con crittografia a 256-bit e derivazione chiave sicura
- **Sistema decrittografia**: Gestione intelligente della decrittografia con tentativi limitati (3 max)
- **Cronologia trasferimenti**: Sistema completo di tracking con filtri (tutti/inviati/ricevuti/criptati)
- **Resend intelligente**: Reinvio automatico di file piccoli (<5MB) dai dati salvati in localStorage
- **Transfer ottimizzati**: Chunking dinamico (4KB-1MB) che si adatta automaticamente alla velocità di rete
- **Compressione intelligente**: File di testo >1MB vengono compressi automaticamente prima del trasferimento
- **Trasferimenti paralleli**: Invio simultaneo di massimo 3 file per velocizzare batch transfer
- **Notifiche audio**: Sistema di suoni sintetici per eventi (messaggi, richieste, successi, errori)
- **Notifiche persistenti**: I messaggi non letti sopravvivono al refresh della pagina
- **Gestione disconnessioni intelligente**: Grace period di 4 secondi con UI trasparente
- **Auto-riconnessione**: Riseleziona automaticamente i dispositivi dopo disconnessione/refresh
- **Persistenza sessione**: Ripristina dispositivo selezionato, stato chat e testo in corso
- **Drag & Drop avanzato**: Trascina file e cartelle direttamente nell'area di upload
- **Multi-item**: Selezione e invio di file e cartelle contemporaneamente con coda unificata
- **Batch Transfer ZIP**: File e cartelle multipli compressi automaticamente in archivio ZIP
- **Popup unificato**: Anteprima completa dei file con accettazione singola per tutti gli elementi
- **Progresso animato**: Monitoraggio trasferimento con animazioni fluide su entrambi i dispositivi
- **Connessione diretta**: Nessun dato passa attraverso server esterni
- **Layout sidebar**: Menu completo a sinistra, area trasferimento e chat a destra
- **UI fixed-height**: Pagina non scrollabile con scroll interno nelle aree necessarie
- **Tema adattivo**: Supporto automatico tema scuro/chiaro del sistema
- **Multilingue**: Interfaccia completamente tradotta in italiano e inglese

## Installazione

### Sviluppo locale
```bash
# Clona il repository
git clone https://github.com/GavaOfficial/GavaDrop
cd GavaDrop

# Installa dipendenze
npm install

# Avvia il server di sviluppo frontend
npm run dev

# Avvia il server di signaling (terminale separato)
node server.js
```

### Accesso all'applicazione
```bash
# Frontend (React/Next.js)
http://localhost:3000

# Server signaling (Socket.IO)
http://localhost:3002
```

### Produzione
```bash
# Export statico dell'applicazione (cartella `out/`)
npm run export

# Servi i file generati con un qualsiasi server statico
# (esempio con `serve`)
npx serve out

# Server di signaling
node server.js
```

## Struttura progetto

```
GavaDrop/
├── src/                          # Codice sorgente frontend
│   ├── app/                      # App Router Next.js
│   │   ├── page.tsx             # Pagina principale con chat, file transfer, cartelle e crittografia
│   │   ├── layout.tsx           # Layout applicazione
│   │   └── globals.css          # Stili globali + font Silkscreen
│   ├── components/              # Componenti UI
│   │   ├── ui/                  # Componenti shadcn/ui (Button, Input, Dialog, etc.)
│   │   ├── file-preview.tsx     # Componente anteprima file con supporto immagini
│   │   ├── file-preview-metadata.tsx # Componente metadati e icone per tipi di file
│   │   ├── transfer-history.tsx # Componente cronologia con filtri e resend
│   │   ├── theme-provider.tsx   # Provider tema scuro/chiaro
│   │   ├── theme-toggle.tsx     # Toggle tema
│   │   └── language-toggle.tsx  # Toggle lingua
│   ├── contexts/                # Context providers
│   │   └── language-context.tsx # Gestione multilingue con traduzioni complete
│   ├── hooks/                   # Custom hooks React
│   │   └── useWebRTC.ts         # Hook per WebRTC, chat e persistenza messaggi
│   ├── utils/                   # Utilità specializzate
│   │   ├── encryption.ts        # Sistema crittografia AES-GCM con PBKDF2
│   │   ├── folder-utils.ts      # Gestione cartelle e compressione ZIP
│   │   ├── history-utils.ts     # Sistema cronologia e persistenza file per resend
│   │   ├── notification-sounds.ts # Sistema notifiche audio sintetiche
│   │   └── transfer-optimizer.ts # Ottimizzazione trasferimenti e compressione
│   └── lib/                     # Utilità generali
│       └── utils.ts             # Funzioni helper
├── public/                      # Asset statici
│   ├── icon.png                 # Icona applicazione personalizzata
│   └── Silkscreen/              # Font pixel Silkscreen per header
├── server.js                    # Server di signaling Socket.IO con chat support
├── package.json                 # Dipendenze e scripts
├── tsconfig.json               # Configurazione TypeScript
├── next.config.ts              # Configurazione Next.js
├── tailwind.config.ts          # Configurazione Tailwind CSS
├── UPDATE.md                   # Cronologia aggiornamenti (v0.9.4)
└── uploads/                    # File temporanei (ignorato da git)
```

## Tecnologie utilizzate

### Frontend
- **Next.js 15** - Framework React con Turbopack
- **TypeScript** - Type safety e developer experience
- **Tailwind CSS** - Styling responsive e moderno
- **shadcn/ui** - Componenti UI accessibili con Radix UI
- **JSZip** - Libreria per compressione ZIP delle cartelle
- **Web Crypto API** - Crittografia AES-GCM nativa del browser
- **next-themes** - Gestione tema scuro/chiaro con preferenze sistema
- **React Context** - Gestione stato multilingue e tema
- **React Hooks** - Gestione stato e side effects
- **Silkscreen Font** - Font pixel personalizzato per header

### Backend
- **Node.js** - Runtime server
- **Socket.IO** - Comunicazione real-time per signaling
- **Express** - Server HTTP per Socket.IO

### Comunicazione & Sicurezza
- **WebRTC** - Peer-to-peer file transfer e chat
- **Socket.IO** - Signaling per stabilire connessioni WebRTC e fallback chat
- **ICE/STUN** - Network traversal per connessioni dirette
- **AES-GCM 256-bit** - Crittografia end-to-end opzionale con derivazione PBKDF2
- **Web Audio API** - Notifiche audio sintetiche senza file esterni
- **localStorage** - Persistenza messaggi, notifiche, stato sessione e cronologia

## Sicurezza e Privacy

- **Rete locale only**: Funziona solo con dispositivi sulla stessa subnet
- **Nessun server centrale**: I file viaggiano direttamente tra dispositivi
- **Crittografia WebRTC**: Comunicazioni automaticamente crittografate
- **Crittografia opzionale**: AES-GCM 256-bit per file sensibili con password
- **Derivazione chiave sicura**: PBKDF2 con 100.000 iterazioni e salt casuali
- **Nessun logging**: I file non vengono salvati o registrati sui server

## Requisiti

### Sviluppo
- Node.js 18 o superiore
- npm o yarn
- Browser moderno con supporto WebRTC

### Utilizzo
- Browser moderno (Chrome, Firefox, Safari, Edge)
- Connessione alla stessa rete locale Wi-Fi/LAN
- JavaScript abilitato

## Licenza

MIT License - vedi [LICENSE](LICENSE)
