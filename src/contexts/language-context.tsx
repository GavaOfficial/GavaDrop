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
    "dialog.acceptAll": "Accetta Tutto",
    "dialog.rejectAll": "Rifiuta Tutto",
    
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
    
    // Languages
    "lang.italian": "Italiano",
    "lang.english": "English",
    
    // Chat
    "chat.messages": "messaggi",
    "chat.noMessages": "Nessun messaggio",
    "chat.startConversation": "Inizia una conversazione",
    "chat.typeMessage": "Scrivi un messaggio...",
    "chat.title": "Chat"
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
    "dialog.acceptAll": "Accept All",
    "dialog.rejectAll": "Reject All",
    
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
    
    // Languages
    "lang.italian": "Italiano",
    "lang.english": "English",
    
    // Chat
    "chat.messages": "messages",
    "chat.noMessages": "No messages",
    "chat.startConversation": "Start a conversation",
    "chat.typeMessage": "Type a message...",
    "chat.title": "Chat"
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