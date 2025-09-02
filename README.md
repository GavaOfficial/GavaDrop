# GavaDrop

Un'applicazione moderna per la condivisione di file nella rete locale tramite WebRTC.

## Caratteristiche

- Trasferimento file peer-to-peer senza server
- Funziona solo nella rete locale per sicurezza
- Barre di progresso sincronizzate in tempo reale
- Sistema di accettazione/rifiuto file
- Nomi dispositivi personalizzabili
- **Supporto multilingue** - Italiano/Inglese con rilevamento automatico
- **Tema scuro/chiaro** - Con rilevamento preferenze sistema
- **Trasferimento batch** - Invio di file multipli con popup unificato
- **Design moderno** - Interfaccia bento-style con shadcn/ui e font Silkscreen
- Interfaccia moderna e intuitiva

## Come funziona

### Utilizzo
- **Seleziona dispositivo**: Clicca su un dispositivo dalla sidebar sinistra
- **Invia file**: Trascina file o clicca "Seleziona File"
- **File multipli**: Aggiungi più file alla coda prima di inviare
- **Accetta/Rifiuta**: Rispondi alle richieste di trasferimento (popup unificato per file multipli)
- **Rinomina dispositivo**: Clicca l'icona matita accanto al nome
- **Cambia lingua**: Usa il toggle 🇮🇹/🇺🇸 nell'header
- **Cambia tema**: Usa il toggle sole/luna per tema scuro/chiaro

### Funzionalità
- **Drag & Drop**: Trascina file direttamente nell'area di upload
- **Multi-file**: Selezione e invio di più file contemporaneamente con coda
- **Batch Transfer**: I file multipli vengono presentati in un unico popup al destinatario
- **Progresso real-time**: Monitoraggio trasferimento su entrambi i dispositivi
- **Connessione diretta**: Nessun dato passa attraverso server esterni
- **Layout sidebar**: Menu completo a sinistra, area trasferimento a destra
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
# Build dell'applicazione
npm run build

# Avvia in modalità produzione
npm start

# Server di signaling
node server.js
```

## Struttura progetto

```
GavaDrop/
├── src/                          # Codice sorgente frontend
│   ├── app/                      # App Router Next.js
│   │   ├── page.tsx             # Pagina principale
│   │   ├── layout.tsx           # Layout applicazione
│   │   └── globals.css          # Stili globali + font Silkscreen
│   ├── components/              # Componenti UI
│   │   ├── ui/                  # Componenti shadcn/ui
│   │   ├── theme-provider.tsx   # Provider tema scuro/chiaro
│   │   ├── theme-toggle.tsx     # Toggle tema
│   │   └── language-toggle.tsx  # Toggle lingua
│   ├── contexts/                # Context providers
│   │   └── language-context.tsx # Gestione multilingue
│   ├── hooks/                   # Custom hooks React
│   │   └── useWebRTC.ts         # Hook per WebRTC
│   └── lib/                     # Utilità
│       └── utils.ts             # Funzioni helper
├── public/                      # Asset statici
│   ├── icon.png                 # Icona applicazione personalizzata
│   └── Silkscreen/              # Font pixel Silkscreen per header
├── server.js                    # Server di signaling Socket.IO
├── package.json                 # Dipendenze e scripts
├── tsconfig.json               # Configurazione TypeScript
├── next.config.ts              # Configurazione Next.js
├── tailwind.config.ts          # Configurazione Tailwind CSS
├── UPDATE.md                   # Cronologia aggiornamenti
└── uploads/                    # File temporanei (ignorato da git)
```

## Tecnologie utilizzate

### Frontend
- **Next.js 15** - Framework React con Turbopack
- **TypeScript** - Type safety e developer experience
- **Tailwind CSS** - Styling responsive e moderno
- **shadcn/ui** - Componenti UI accessibili con Radix UI
- **next-themes** - Gestione tema scuro/chiaro con preferenze sistema
- **React Context** - Gestione stato multilingue e tema
- **React Hooks** - Gestione stato e side effects
- **Silkscreen Font** - Font pixel personalizzato per header

### Backend
- **Node.js** - Runtime server
- **Socket.IO** - Comunicazione real-time per signaling
- **Express** - Server HTTP per Socket.IO

### Comunicazione
- **WebRTC** - Peer-to-peer file transfer
- **Socket.IO** - Signaling per stabilire connessioni WebRTC
- **ICE/STUN** - Network traversal per connessioni dirette

## Sicurezza e Privacy

- **Rete locale only**: Funziona solo con dispositivi sulla stessa subnet
- **Nessun server centrale**: I file viaggiano direttamente tra dispositivi
- **Crittografia WebRTC**: Comunicazioni automaticamente crittografate
- **Nessun logging**: I file non vengono salvati o registrati

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
