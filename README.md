# GavaDrop

Un'applicazione moderna per la condivisione di file nella rete locale tramite WebRTC.

## Caratteristiche

- Trasferimento file peer-to-peer senza server
- Funziona solo nella rete locale per sicurezza
- Barre di progresso sincronizzate in tempo reale
- Sistema di accettazione/rifiuto file
- Nomi dispositivi personalizzabili
- Interfaccia moderna e intuitiva

## Come funziona

### Utilizzo
- **Seleziona dispositivo**: Clicca su un dispositivo dalla lista
- **Invia file**: Trascina file o clicca "Seleziona File"
- **Accetta/Rifiuta**: Rispondi alle richieste di trasferimento
- **Rinomina dispositivo**: Clicca l'icona matita accanto al nome

### Funzionalità
- **Drag & Drop**: Trascina file direttamente nell'area di upload
- **Multi-file**: Selezione e invio di più file contemporaneamente
- **Progresso real-time**: Monitoraggio trasferimento su entrambi i dispositivi
- **Connessione diretta**: Nessun dato passa attraverso server esterni

## Installazione

### Sviluppo locale
```bash
# Clona il repository
git clone <url-repository>
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
│   │   └── globals.css          # Stili globali
│   ├── components/              # Componenti UI
│   │   └── ui/                  # Componenti shadcn/ui
│   ├── hooks/                   # Custom hooks React
│   │   └── useWebRTC.ts         # Hook per WebRTC
│   └── lib/                     # Utilità
│       └── utils.ts             # Funzioni helper
├── public/                      # Asset statici
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
- **shadcn/ui** - Componenti UI accessibili
- **React Hooks** - Gestione stato e side effects

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
