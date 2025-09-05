# GavaDrop - Update History

## Version 0.9.3 (Current)

### Complete Transfer History System
- **Comprehensive transfer tracking** with persistent localStorage storage
  - TransferHistory component with advanced filtering (all/sent/received/encrypted)
  - Real-time history updates for both sent and received files
  - Date-based grouping with localized display (Today/Yesterday/Date)
  - Visual file type indicators and metadata display in history
  - Individual file removal and complete history clearing functionality
  - Multilingual date formatting and interface translations

### Intelligent File Resend System
- **Smart file resending** with automatic data storage and retrieval
  - Automatic file data storage (Base64) for files under 5MB
  - Visual resend indicators: green icon (automatic), blue icon (requires file selection)
  - Seamless file reconstruction from stored data without user interaction
  - Fallback to manual file selection for large files or missing data
  - Batch file support with selective storage for small files only
  - Storage optimization with configurable file size limits and history retention

### Professional Audio Notification System
- **Synthetic audio notifications** using Web Audio API
  - Five distinct notification sounds for different events
  - fileRequest: Ascending dual tone for incoming file requests
  - success: Major chord progression for successful operations
  - fileComplete: Ascending trill for received files
  - message: Gentle single tone for chat messages
  - error: Descending tone sequence for errors
  - Browser policy-compliant audio initialization on first user interaction
  - Volume-optimized sounds designed to be informative but not intrusive

### Enhanced User Interface & Navigation
- **Redesigned history interface** integrated into sidebar
  - History button relocated to bottom of sidebar for better UX
  - Full-screen history overlay with smooth animations
  - Advanced filtering and search capabilities within history
  - Visual distinction between different transfer types and encryption status
  - Improved file preview integration within history items
  - Responsive design maintaining functionality across screen sizes

### Multilingual System Expansion
- **Extended translation coverage** for new features
  - Complete history interface translations (Italian/English)
  - Audio notification descriptions and tooltips
  - Resend functionality user guidance and error messages
  - Enhanced error handling with localized feedback
  - Comprehensive UI text coverage including edge cases and error states

### Technical Architecture Improvements
- **Robust state management** for complex data persistence
  - Enhanced useWebRTC hook with file data parameter support
  - Circular dependency resolution in React component initialization
  - Proper cleanup of unused imports and variables for optimal performance
  - TypeScript interface enhancements for type safety
  - Improved memory management for file data storage and retrieval

### Storage & Performance Optimization
- **Intelligent storage management** with size-based strategies
  - Smart file storage limits: 5MB for single files, 1MB for batch files
  - Automatic storage cleanup with configurable retention limits
  - Efficient Base64 encoding/decoding for file data preservation
  - Graceful fallback mechanisms when storage limits are exceeded
  - Background cleanup of expired or corrupted storage data

### Advanced Error Handling
- **Comprehensive error management** for all new systems
  - Robust handling of audio initialization failures across browsers
  - Graceful degradation when localStorage is full or unavailable
  - Proper error recovery for file reconstruction failures
  - Enhanced user feedback for all error conditions with actionable guidance
  - Silent fallback modes maintaining core functionality when features are unavailable

## Version 0.9.1

### Advanced Folder Transfer System
- **Complete folder transfer implementation** with ZIP compression
  - Drag & drop entire folders with automatic detection and grouping
  - Folder selection via webkitdirectory API with proper file structure preservation
  - Smart UI display showing folders as single amber-colored items instead of expanded file lists
  - Automatic ZIP compression using JSZip library when sending folders
  - Folder metadata display with file count and total size information
  - Combined file and folder queue management with unified send button

### Enhanced File Preview System
- **Comprehensive file preview components** for sender and receiver interfaces
  - FilePreview component with actual image previews and fallback icons
  - FilePreviewMetadata component with file type detection and appropriate icons
  - Support for images, videos, audio, PDFs, text files, and archives
  - Color-coded file type indicators with gradient backgrounds
  - Large preview panel with detailed file information in sender UI
  - Preview integration in receiver popups for both single and batch transfers

### End-to-End Encryption System
- **Optional AES-GCM encryption** with password-based key derivation
  - Toggle-based encryption enabling with visual feedback (Lock/Unlock icons)
  - Optional password field with clear user guidance
  - PBKDF2 key derivation with 100,000 iterations and SHA-256 for security
  - Automatic .encrypted file extension handling
  - Smart decryption dialog with 3-attempt limit system
  - Encrypted file detection and automatic decryption flow
  - Support for both encrypted files and folders (ZIP encryption)

### Improved User Interface & Experience
- **Enhanced file selection workflow** with better event handling
  - Fixed double file selector opening issues with proper event propagation
  - Improved folder selection state management using refs for immediate control
  - Properly centered file/folder selection buttons with justify-center layout
  - Smooth progress bar animations with slide-down completion effect
  - Better visual feedback for encrypted vs unencrypted transfers
  - Enhanced drag & drop visual states with folder support

### Advanced Progress & Animation System
- **Sophisticated transfer progress management**
  - Slide-down animation for completed progress bars using CSS transforms
  - Coordinated timing between progress completion and UI cleanup
  - Smooth transitions for progress bar hiding with opacity and scale effects
  - Enhanced visual feedback during encryption/decryption processes

### Technical Architecture Improvements
- **Robust file handling and type safety**
  - Proper TypeScript interfaces for folder structures and file metadata
  - Enhanced error handling for encryption/decryption failures
  - Clean separation between file utilities and UI components
  - Proper memory management for file operations and ZIP generation
  - Optimized file grouping algorithms for folder detection

### Security & Encryption Features
- **Professional-grade encryption implementation**
  - AES-GCM 256-bit encryption with cryptographically secure random IV generation
  - Salt-based key derivation preventing rainbow table attacks
  - Secure file format with embedded salt, IV, and encrypted data
  - Multiple decryption attempt handling with automatic cleanup
  - Clear security indicators and user guidance throughout the process

## Version 0.9.0

### Real-Time Chat System
- **Complete P2P chat implementation** with persistent message history
  - WebRTC-based direct messaging with Socket.IO fallback for reliability
  - Real-time message delivery with unique ID generation system
  - Message persistence using localStorage with clientId-based storage
  - Auto-clearing notifications when opening chat with message sender
  - Inline chat panel with slide-out animation and fixed positioning
  - Message timestamp display and proper message bubble styling

### Advanced Notification System
- **Persistent unread message notifications** across page refreshes
  - Red badge counters on devices with unread messages in sidebar
  - Automatic notification clearing when selecting devices with messages
  - Cross-session persistence using localStorage with client-specific keys
  - Smart notification management tied to persistent client IDs

### Intelligent Disconnection Management
- **4-second grace period system** for temporary disconnections
  - Devices appear transparent/orange during disconnection period
  - Chat remains open during grace period with disabled messaging
  - File transfer disabled during disconnection with visual feedback
  - Automatic cleanup after grace period expires
  - Smart timer management with proper cleanup on reconnection

### Advanced Auto-Reconnection System
- **Automatic device reselection** after disconnection/reconnection
  - Persistent clientId tracking across socket reconnections
  - Smart peer matching using clientId instead of socketId
  - Seamless state preservation during network interruptions
  - Automatic chat reopening for previously selected devices

### Complete Session Persistence
- **Full UI state restoration** after page refresh
  - Selected device persistence with automatic reselection on reconnection
  - Chat input text preservation during typing sessions
  - Chat panel state (open/closed) persistence across refreshes
  - File selection metadata tracking with user notification system
  - Session restoration notifications with multilingual support

### Enhanced UI Layout & UX
- **Fixed-height page layout** with internal scrolling
  - Non-scrollable page root with h-screen overflow-hidden design
  - Internal scrolling for sidebar device list and chat messages
  - File list area with proper overflow handling
  - Chat panel with fixed height and internal message scrolling
  - Improved visual hierarchy and space utilization

### Robust Error Handling & Recovery
- **Comprehensive error management** for chat and persistence
  - Graceful handling of localStorage corruption with automatic cleanup
  - Safe message ID generation with collision prevention
  - Proper React hook dependency management to prevent memory leaks
  - Enhanced useEffect cleanup for disconnection timers

### Technical Architecture Improvements
- **Advanced React patterns** for state management and persistence
  - Complex useEffect chains for disconnection/reconnection handling
  - Proper state loading flags to prevent premature persistence triggers
  - Enhanced message uniqueness system with timestamp + counter + random
  - Optimized re-rendering with proper dependency arrays and useCallback usage

### Multilingual Enhancements
- **Extended translation system** for new chat and persistence features
  - Session restoration messages in both Italian and English
  - File persistence notifications with proper pluralization
  - Chat-specific UI text and placeholder translations
  - Comprehensive toast notification translations

### Server-Side Chat Integration
- **Enhanced Socket.IO server** with chat message routing
  - chat-message event handling with proper message forwarding
  - Maintains existing file transfer and signaling functionality
  - Efficient message routing between connected peers
  - Backward compatibility with existing WebRTC signaling

## Version 0.8.5

### Multi-Language Support System

### Multi-Language Support System
- **Complete internationalization (i18n) implementation** with Italian and English
  - Dynamic language switching with dropdown toggle in sidebar header
  - Auto-detection of browser language with fallback to Italian
  - Persistent language preference storage in localStorage
  - Complete UI translation including dialogs, toasts, and all interface elements
  - React Context-based language management with translation function
  
### Advanced Theme System
- **Dark/Light theme support** with system preference detection
  - next-themes integration for seamless theme switching
  - System preference auto-detection with manual override option
  - Persistent theme storage with proper SSR handling
  - Complete UI adaptation for both light and dark modes
  - Theme toggle component in sidebar header with sun/moon icons

### Enhanced UI/UX Design
- **Complete design system overhaul** with modern bento-style layout
  - Full-page left sidebar with devices list and controls
  - Right-side file transfer area with improved visual hierarchy
  - Custom Silkscreen pixel font integration for headers and titles
  - Custom app icon integration (/public/icon.png) throughout interface
  - Improved color scheme using shadcn/ui design tokens
  - Enhanced visual feedback and hover states for all interactive elements

### Batch File Transfer System
- **Multi-file transfer queue implementation**
  - Add multiple files before sending with visual queue management
  - Single unified popup for batch file acceptance/rejection
  - Individual file removal from queue before sending
  - Clear all files functionality with confirmation
  - Improved drag & drop area that adapts to queue state
  - Send button activation only when files are queued and device selected

### Advanced State Management
- **Improved React hooks and state management**
  - Enhanced useWebRTC hook with batch transfer capabilities
  - Proper cleanup and error handling for all transfer states
  - Better dependency management in useCallback hooks
  - Improved loading states and user feedback during operations
  - Enhanced toast notification system with translated messages

### User Interface Improvements
- **Enhanced sidebar layout and device management**
  - Dedicated language and theme toggles in header
  - Improved device selection with visual indicators
  - Better responsive design for various screen sizes
  - Enhanced file queue visualization with progress indicators
  - Improved button states and loading animations

### Technical Enhancements
- **Modern React patterns and best practices**
  - Proper TypeScript usage with strict typing for translation keys
  - Context providers for theme and language state management
  - Component composition with proper prop interfaces
  - Enhanced error boundaries and loading state management
  - Optimized re-rendering with proper dependency arrays

### Developer Experience
- **Improved development workflow**
  - Better component organization with dedicated contexts folder
  - Cleaner separation of concerns between UI and business logic
  - Enhanced code maintainability with translation system
  - Better debugging capabilities with proper error handling
  - Comprehensive component documentation through TypeScript interfaces

## Version 0.8.0

### File Transfer & WebRTC Implementation
- **Complete WebRTC-based file transfer system** with peer-to-peer communication
  - Direct device-to-device file sharing without server intermediaries
  - Real-time transfer progress tracking with synchronized progress bars
  - Support for multiple file formats and sizes
  - Chunk-based transfer with 16KB packets for optimal performance
  
### Network Discovery & Room Management
- **Local network device discovery** with subnet-based room creation
  - Automatic IP-based room assignment (e.g., 192.168.1.x devices in same room)
  - Real-time peer list updates when devices join/leave network
  - Random device name generation with customizable names
  - Persistent device name storage using localStorage

### User Interface & Experience
- **Modern React/Next.js frontend** with responsive design
  - Clean, intuitive interface with shadcn/ui components
  - Drag-and-drop file upload with visual feedback
  - Device selection with hover effects and selection indicators
  - Dark/light theme support with system preference detection

### Transfer Management System
- **Advanced file request/response workflow**
  - Pop-up notifications for incoming file requests with accept/reject options
  - Sender receives immediate feedback on request status (accepted/rejected/timeout)
  - Graceful error handling with user-friendly error messages
  - Connection cleanup and reusability for multiple file transfers

### Real-time Communication
- **Socket.IO-based signaling server** for WebRTC coordination
  - Handles ICE candidate exchange and session descriptions
  - Manages room-based peer discovery and communication
  - Real-time progress updates synchronized between sender and receiver
  - Automatic reconnection handling for network interruptions

### Progress Tracking & Feedback
- **Comprehensive transfer monitoring**
  - Real-time progress bars visible on both sender and receiver devices
  - Transfer speed calculation and ETA estimation
  - File metadata display (name, size, progress percentage)
  - Visual indicators for different transfer states (pending, active, completed, error)

### Device Management
- **Flexible device naming system**
  - Click-to-edit device names with inline editing interface
  - Persistent name storage across browser sessions
  - Real-time name updates broadcast to all connected devices
  - Keyboard shortcuts (Enter to save, Escape to cancel)

### Error Handling & Reliability
- **Robust error management**
  - Connection timeout handling with configurable timeouts
  - File rejection handling with proper cleanup
  - Network interruption recovery
  - Clear error messages for different failure scenarios

### Architecture & Performance
- **Modern tech stack optimization**
  - Next.js 15 with Turbopack for fast development builds
  - TypeScript for type safety and better developer experience
  - Tailwind CSS for responsive and maintainable styling
  - Custom hooks for clean component organization

### Security & Privacy
- **Privacy-focused design**
  - No file data passes through central servers
  - Direct peer-to-peer encryption via WebRTC
  - Local network restriction prevents unauthorized external access
  - No file storage or logging on server infrastructure

## Version 0.7.0

### Core WebRTC Integration
- **Initial WebRTC implementation** for direct peer communication
- **Basic file transfer functionality** with data channels
- **Socket.IO signaling server** for connection establishment
- **Simple device discovery** within local network

### Frontend Foundation
- **React/Next.js application setup** with TypeScript
- **Basic UI components** for device listing and file selection
- **Initial styling** with Tailwind CSS
- **Simple state management** with React hooks

### Network Architecture
- **Node.js signaling server** with Express and Socket.IO
- **Room-based connection management** for local network isolation
- **Basic peer discovery** and connection establishment
- **Initial ICE candidate handling**

## Version 0.6.0

### Project Initialization
- **Project structure setup** with Git repository
- **Technology stack selection** (React, Next.js, Node.js, WebRTC)
- **Development environment configuration**
- **Basic build system setup**

### Research & Planning
- **WebRTC technology research** for peer-to-peer communication
- **File transfer protocol design**
- **Network topology planning** for local area network functionality
- **UI/UX wireframing** and design planning

---

*GavaDrop is a modern file sharing application enabling instant peer-to-peer file transfers within local networks using WebRTC technology.*