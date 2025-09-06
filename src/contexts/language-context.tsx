"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type Language = "it" | "en"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  it: {
    // App
    "app.title": "GavaDrop",
    "app.subtitle": "P2P File Sharing",
    "app.description": "Condividi file facilmente nella tua rete locale",
    
    // Connection
    "status.connected": "Connected",
    "status.disconnected": "Disconnected",
    
    // Device
    "device.yourDevice": "Il tuo dispositivo",
    "device.availableDevices": "Dispositivi Disponibili",
    "device.selectDevice": "Seleziona un dispositivo per inviare file",
    "device.noDevicesFound": "Nessun dispositivo trovato",
    "device.openGavaDrop": "Altri dispositivi devono aprire GavaDrop",
    "device.selected": "Selezionato",
    
    // File Transfer
    "transfer.title": "Trasferimento File",
    "transfer.readyToSend": "Pronto per inviare a",
    "transfer.selectDeviceFirst": "Seleziona un dispositivo dalla barra laterale per iniziare",
    "transfer.dropFilesHere": "Trascina i File Qui",
    "transfer.selectDeviceFirst2": "Seleziona Prima il Dispositivo",
    "transfer.addMoreFiles": "Aggiungi Altri File",
    "transfer.dragDrop": "Trascina e rilascia o clicca per selezionare",
    "transfer.multipleFiles": "Trascina più file o clicca ovunque per selezionarli. Crea la tua coda di trasferimento prima di inviare.",
    "transfer.selectDeviceHelp": "Scegli un dispositivo dalla barra laterale per iniziare a condividere file in sicurezza via P2P",
    "transfer.clickToBrowse": "Clicca per Sfogliare i File",
    "transfer.selectFiles": "Seleziona File",
    "transfer.selectFolder": "Seleziona Cartella",
    "transfer.queue": "Coda di Trasferimento",
    "transfer.sendingTo": "Inviando a",
    "transfer.readyToSendTo": "Pronto per inviare a",
    "transfer.clearAll": "Cancella Tutto",
    "transfer.send": "Invia",
    "transfer.sendFiles": "File",
    "transfer.sending": "Inviando...",
    "transfer.resendAuto": "Re-invio automatico",
    "transfer.resendManual": "Re-invio (seleziona file)",
    
    // Progress
    "progress.sending": "Inviando",
    "progress.receiving": "Ricevendo",
    "progress.completed": "completato",
    
    // Dialogs
    "dialog.fileRequest": "Richiesta File",
    "dialog.multipleFilesRequest": "Richiesta File Multipli",
    "dialog.wantsToSend": "vuole inviarti il file",
    "dialog.wantsToSendMultiple": "vuole inviarti",
    "dialog.files": "file",
    "dialog.acceptFile": "Vuoi accettare questo file?",
    "dialog.total": "Totale",
    "dialog.accept": "Accetta",
    "dialog.reject": "Rifiuta",
    "dialog.acceptAll": "Accetta Tutto (ZIP)",
    "dialog.rejectAll": "Rifiuta Tutto", 
    "dialog.zipInfo": "I file verranno compressi in un unico archivio ZIP",
    "dialog.confirmClearHistory": "Sei sicuro di voler eliminare tutti gli elementi dalla cronologia? Questa azione non può essere annullata.",
    "dialog.cancel": "Annulla",
    
    // Toasts
    "toast.filesAdded": "file aggiunti alla lista",
    "toast.selectDeviceFirst": "Seleziona prima un dispositivo di destinazione",
    "toast.sentSuccess": "inviato con successo!",
    "toast.sentSuccessMultiple": "file inviati con successo!",
    "toast.rejected": "I file sono stati rifiutati dal destinatario",
    "toast.timeout": "Timeout: i file non sono stati accettati in tempo",
    "toast.fileRejected": "Il file è stato rifiutato dal destinatario",
    "toast.fileTimeout": "Timeout: il file non è stato accettato in tempo",
    "toast.sendError": "Errore nell'invio dei file",
    "toast.nameUpdated": "Nome dispositivo aggiornato!",
    "toast.sessionRestored": "Sessione ripristinata - lo stato della chat è stato recuperato",
    "toast.filesWereSelected": "Avevi selezionato",
    "toast.pleaseReselectFiles": "Riseleziona i tuoi file per continuare.",
    "toast.resendSuccess": "re-inviato con successo!",
    "toast.deviceNotConnected": "Dispositivo non connesso",
    "toast.selectOriginalFile": "Seleziona il file originale per re-inviarlo",
    
    // Languages
    "lang.italian": "Italiano",
    "lang.english": "English",
    
    // Chat
    "chat.messages": "messaggi",
    "chat.noMessages": "Nessun messaggio",
    "chat.startConversation": "Inizia una conversazione",
    "chat.typeMessage": "Scrivi un messaggio...",
    "chat.title": "Chat",
    
    // History
    "history.title": "Cronologia",
    "history.transferHistory": "Cronologia Trasferimenti",
    "history.allTransfers": "Tutti i trasferimenti",
    "history.sentOnly": "Solo inviati",
    "history.receivedOnly": "Solo ricevuti",
    "history.encryptedOnly": "Solo criptati",
    "history.noTransfers": "Nessun trasferimento nella cronologia",
    "history.noTransfersFiltered": "Nessun trasferimento",
    "history.noTransfersCompleted": "Nessun trasferimento effettuato",
    "history.completedWillAppear": "I trasferimenti completati appariranno qui",
    "history.removeFromHistory": "Rimuovi dalla cronologia",
    "history.clearAll": "Svuota tutto",
    "history.cleared": "Cronologia svuotata completamente",
    "history.today": "Oggi",
    "history.yesterday": "Ieri",
    "history.transfers": "trasferimenti",
    "history.transfer": "trasferimento",
    "history.filtered": "filtrati",
    
    // File types and misc
    "file.element": "elemento",
    "file.elements": "elementi",
    "file.folder": "Cartella",
    "file.file": "File",
    "file.files": "file",
    "file.encrypted": "criptato",
    "file.encrypted.plural": "criptati",
    "file.unknown": "Sconosciuto",
    "file.type": "Tipo:",
    "file.modified": "Modificato:",
    "file.preview": "Anteprima File",
    "file.unknownDevice": "Dispositivo Sconosciuto",
    
    // Encryption
    "encryption.endToEnd": "Crittografia End-to-End",
    "encryption.passwordPlaceholder": "Password per crittografia (opzionale)",
    "encryption.enabledDescription": "I file saranno criptati prima dell'invio. Il destinatario dovrà inserire la stessa password.",
    "encryption.disabledDescription": "I file verranno inviati senza crittografia aggiuntiva.",
    "encryption.fileEncrypted": "File Criptato",
    "encryption.receivedEncrypted": "Hai ricevuto un file criptato:",
    "encryption.enterPassword": "Inserisci la password per decrittare e scaricare il file:",
    "encryption.attentionAttempts": "Attenzione: Tentativo rimanente:",
    "encryption.attentionAttemptsPlural": "Attenzione: Tentativi rimanenti:",
    "encryption.passwordPlaceholderDecrypt": "Password di decrittografia",
    "encryption.decryptAndDownload": "Decritta e Scarica",
    "encryption.cancel": "Annulla",
    "encryption.success": "File decriptato e scaricato con successo!",
    "encryption.wrongPassword": "Password errata. Rimangono",
    "encryption.wrongPasswordSingular": "tentativo",
    "encryption.wrongPasswordPlural": "tentativi",
    "encryption.tooManyAttempts": "Troppi tentativi errati. File scartato.",
    "encryption.error": "Errore nella decrittografia. Rimangono",
    
    // Messages and notifications
    "message.folderAdded": "cartella aggiunta",
    "message.foldersAdded": "cartelle aggiunte",
    "message.fileAdded": "file aggiunto",
    "message.filesAdded": "file aggiunti",
    "message.and": "e",
    "message.thisFile": "questo file",
    
    // Misc
    "misc.devices": "Dispositivi",
    "misc.reconnecting": "Reconnecting...",
    "misc.total": "Totale"
  },
  en: {
    // App
    "app.title": "GavaDrop",
    "app.subtitle": "P2P File Sharing",
    "app.description": "Share files easily on your local network",
    
    // Connection
    "status.connected": "Connected",
    "status.disconnected": "Disconnected",
    
    // Device
    "device.yourDevice": "Your device",
    "device.availableDevices": "Available Devices",
    "device.selectDevice": "Select a device to send files",
    "device.noDevicesFound": "No devices found",
    "device.openGavaDrop": "Other devices need to open GavaDrop",
    "device.selected": "Selected",
    
    // File Transfer
    "transfer.title": "File Transfer",
    "transfer.readyToSend": "Ready to send to",
    "transfer.selectDeviceFirst": "Select a device from the sidebar to begin",
    "transfer.dropFilesHere": "Drop Files Here",
    "transfer.selectDeviceFirst2": "Select Device First",
    "transfer.addMoreFiles": "Add More Files",
    "transfer.dragDrop": "Drag & drop or click to select",
    "transfer.multipleFiles": "Drag multiple files or click anywhere to select them. Build your transfer queue before sending.",
    "transfer.selectDeviceHelp": "Choose a device from the sidebar to start sharing files securely via P2P",
    "transfer.clickToBrowse": "Click to Browse Files",
    "transfer.selectFiles": "Select Files",
    "transfer.selectFolder": "Select Folder",
    "transfer.queue": "Transfer Queue",
    "transfer.sendingTo": "Sending to",
    "transfer.readyToSendTo": "Ready to send to",
    "transfer.clearAll": "Clear All",
    "transfer.send": "Send",
    "transfer.sendFiles": "File",
    "transfer.sending": "Sending...",
    "transfer.resendAuto": "Automatic resend",
    "transfer.resendManual": "Resend (select file)",
    
    // Progress
    "progress.sending": "Sending",
    "progress.receiving": "Receiving",
    "progress.completed": "completed",
    
    // Dialogs
    "dialog.fileRequest": "File Request",
    "dialog.multipleFilesRequest": "Multiple Files Request",
    "dialog.wantsToSend": "wants to send you the file",
    "dialog.wantsToSendMultiple": "wants to send you",
    "dialog.files": "files",
    "dialog.acceptFile": "Do you want to accept this file?",
    "dialog.total": "Total",
    "dialog.accept": "Accept",
    "dialog.reject": "Reject",
    "dialog.acceptAll": "Accept All (ZIP)",
    "dialog.rejectAll": "Reject All",
    "dialog.zipInfo": "Files will be compressed into a single ZIP archive",
    "dialog.confirmClearHistory": "Are you sure you want to delete all items from the history? This action cannot be undone.",
    "dialog.cancel": "Cancel",
    
    // Toasts
    "toast.filesAdded": "files added to list",
    "toast.selectDeviceFirst": "Select a destination device first",
    "toast.sentSuccess": "sent successfully!",
    "toast.sentSuccessMultiple": "files sent successfully!",
    "toast.rejected": "Files were rejected by recipient",
    "toast.timeout": "Timeout: files were not accepted in time",
    "toast.fileRejected": "File was rejected by recipient",
    "toast.fileTimeout": "Timeout: file was not accepted in time",
    "toast.sendError": "Error sending files",
    "toast.nameUpdated": "Device name updated!",
    "toast.sessionRestored": "Session restored - your chat state has been recovered",
    "toast.filesWereSelected": "You had selected",
    "toast.pleaseReselectFiles": "Please reselect your files to continue.",
    "toast.resendSuccess": "resent successfully!",
    "toast.deviceNotConnected": "Device not connected",
    "toast.selectOriginalFile": "Select the original file to resend",
    
    // Languages
    "lang.italian": "Italiano",
    "lang.english": "English",
    
    // Chat
    "chat.messages": "messages",
    "chat.noMessages": "No messages",
    "chat.startConversation": "Start a conversation",
    "chat.typeMessage": "Type a message...",
    "chat.title": "Chat",
    
    // History
    "history.title": "History",
    "history.transferHistory": "Transfer History",
    "history.allTransfers": "All transfers",
    "history.sentOnly": "Sent only",
    "history.receivedOnly": "Received only",
    "history.encryptedOnly": "Encrypted only",
    "history.noTransfers": "No transfers in history",
    "history.noTransfersFiltered": "No transfers",
    "history.noTransfersCompleted": "No transfers completed",
    "history.completedWillAppear": "Completed transfers will appear here",
    "history.removeFromHistory": "Remove from history",
    "history.clearAll": "Clear all",
    "history.cleared": "History cleared completely",
    "history.today": "Today",
    "history.yesterday": "Yesterday",
    "history.transfers": "transfers",
    "history.transfer": "transfer",
    "history.filtered": "filtered",
    
    // File types and misc
    "file.element": "item",
    "file.elements": "items",
    "file.folder": "Folder",
    "file.file": "File",
    "file.files": "files",
    "file.encrypted": "encrypted",
    "file.encrypted.plural": "encrypted",
    "file.unknown": "Unknown",
    "file.type": "Type:",
    "file.modified": "Modified:",
    "file.preview": "File Preview",
    "file.unknownDevice": "Unknown Device",
    
    // Encryption
    "encryption.endToEnd": "End-to-End Encryption",
    "encryption.passwordPlaceholder": "Password for encryption (optional)",
    "encryption.enabledDescription": "Files will be encrypted before sending. The recipient will need to enter the same password.",
    "encryption.disabledDescription": "Files will be sent without additional encryption.",
    "encryption.fileEncrypted": "Encrypted File",
    "encryption.receivedEncrypted": "You received an encrypted file:",
    "encryption.enterPassword": "Enter the password to decrypt and download the file:",
    "encryption.attentionAttempts": "Warning: Attempt remaining:",
    "encryption.attentionAttemptsPlural": "Warning: Attempts remaining:",
    "encryption.passwordPlaceholderDecrypt": "Decryption password",
    "encryption.decryptAndDownload": "Decrypt and Download",
    "encryption.cancel": "Cancel",
    "encryption.success": "File decrypted and downloaded successfully!",
    "encryption.wrongPassword": "Wrong password. Remaining",
    "encryption.wrongPasswordSingular": "attempt",
    "encryption.wrongPasswordPlural": "attempts",
    "encryption.tooManyAttempts": "Too many wrong attempts. File discarded.",
    "encryption.error": "Decryption error. Remaining",
    
    // Messages and notifications
    "message.folderAdded": "folder added",
    "message.foldersAdded": "folders added",
    "message.fileAdded": "file added",
    "message.filesAdded": "files added",
    "message.and": "and",
    "message.thisFile": "this file",
    
    // Misc
    "misc.devices": "Devices",
    "misc.reconnecting": "Reconnecting...",
    "misc.total": "Total"
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("it")

  useEffect(() => {
    const savedLanguage = localStorage.getItem("gavadrop-language") as Language
    if (savedLanguage && (savedLanguage === "it" || savedLanguage === "en")) {
      setLanguageState(savedLanguage)
    } else {
      // Detect browser language
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith("it")) {
        setLanguageState("it")
      } else {
        setLanguageState("en")
      }
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("gavadrop-language", lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.it] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}