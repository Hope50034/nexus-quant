import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Layers,
  Download,
  RefreshCw,
  X,
  Command,
  CornerDownLeft,
  PieChart,
  ShieldAlert,
  Cpu
} from 'lucide-react'

// Defined Categories and Command Handlers
export const COMMAND_LIST = [
  // AI Confluence Brain
  {
    id: 'ai-brain',
    category: 'Analysis & AI',
    label: 'Open AI Brain (Fastest News + Technical Confluence)',
    shortcut: 'B',
    icon: Cpu,
    action: 'OPEN_AI_BRAIN'
  },
  // Quick Filters
  {
    id: 'filter-bullish',
    category: 'Quick Filters',
    label: 'Show Bullish Buy Crossovers',
    shortcut: 'B',
    icon: TrendingUp,
    action: 'SET_MODE_BULLISH'
  },
  {
    id: 'filter-bearish',
    category: 'Quick Filters',
    label: 'Show Bearish Sell Divergences',
    shortcut: 'S',
    icon: TrendingDown,
    action: 'SET_MODE_BEARISH'
  },
  {
    id: 'filter-crypto',
    category: 'Quick Filters',
    label: 'Filter Crypto Assets (BTC, ETH, SOL)',
    shortcut: 'C',
    icon: Layers,
    action: 'FILTER_CRYPTO'
  },
  {
    id: 'filter-stocks',
    category: 'Quick Filters',
    label: 'Filter Tech Equities (NVDA, TSLA, QQQ)',
    shortcut: 'E',
    icon: Layers,
    action: 'FILTER_STOCKS'
  },

  // Analysis & AI
  {
    id: 'ai-scan',
    category: 'Analysis & AI',
    label: 'Run Deep Gemini Quantitative Risk Scan',
    shortcut: 'AI',
    icon: Sparkles,
    action: 'RUN_AI_SCAN'
  },
  {
    id: 'vol-qqq',
    category: 'Analysis & AI',
    label: 'Calculate QQQ Volatility & Gamma Exposure',
    shortcut: 'V',
    icon: Zap,
    action: 'SHOW_VOLATILITY'
  },

  // System & Utilities
  {
    id: 'refresh-data',
    category: 'System & Data',
    label: 'Refresh Market Feed & Recalculate MACD',
    shortcut: 'R',
    icon: RefreshCw,
    action: 'REFRESH_FEED'
  },
  {
    id: 'export-csv',
    category: 'System & Data',
    label: 'Export Active Signals Data as CSV',
    shortcut: 'X',
    icon: Download,
    action: 'EXPORT_CSV'
  }
]

export default function CommandMenu({ isOpen = false, onClose, onExecuteCommand }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return COMMAND_LIST
    return COMMAND_LIST.filter(cmd =>
      cmd.label.toLowerCase().includes(query) ||
      cmd.category.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Group filtered commands by category
  const categories = useMemo(() => {
    const map = {}
    filteredCommands.forEach(cmd => {
      if (!map[cmd.category]) map[cmd.category] = []
      map[cmd.category].push(cmd)
    })
    return map
  }, [filteredCommands])

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Focus input automatically when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Keyboard Navigation: ArrowUp, ArrowDown, Enter, Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const activeCommand = filteredCommands[selectedIndex]
        if (activeCommand) {
          executeCommand(activeCommand)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, onClose])

  const executeCommand = (cmd) => {
    onExecuteCommand?.(cmd)
    onClose?.()
  }

  // Calculate current flat item index across grouped categories
  let itemCounter = 0

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="command-menu-root">
          {/* Backdrop */}
          <motion.div
            className="command-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal Shell */}
          <div className="command-modal-wrapper">
            <motion.div
              className="command-card"
              initial={{ scale: 0.95, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            >
              {/* Search Bar Input Header */}
              <div className="command-search-header">
                <Search size={16} className="search-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  className="command-input"
                  placeholder="Type a financial command or search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="esc-key-badge" onClick={onClose} title="Press ESC to close">
                  <span>ESC</span>
                </div>
              </div>

              {/* Command List Body */}
              <div className="command-list-body">
                {filteredCommands.length === 0 ? (
                  <div className="no-commands-empty">
                    <span>No commands matching "{searchQuery}"</span>
                  </div>
                ) : (
                  Object.entries(categories).map(([categoryName, items]) => (
                    <div key={categoryName} className="command-category-group">
                      <span className="category-header-title">{categoryName}</span>
                      <div className="category-items-list">
                        {items.map(cmd => {
                          const currentIndex = itemCounter++
                          const isSelected = currentIndex === selectedIndex
                          const IconComponent = cmd.icon

                          return (
                            <div
                              key={cmd.id}
                              className={`command-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => executeCommand(cmd)}
                              onMouseEnter={() => setSelectedIndex(currentIndex)}
                            >
                              <div className="command-item-left">
                                <IconComponent size={15} className="cmd-icon" />
                                <span className="cmd-label">{cmd.label}</span>
                              </div>
                              <div className="command-item-right">
                                {cmd.shortcut && <span className="cmd-shortcut">{cmd.shortcut}</span>}
                                {isSelected && (
                                  <span className="enter-hint">
                                    <CornerDownLeft size={11} />
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Command Footer */}
              <div className="command-footer">
                <div className="footer-keys-row">
                  <span className="key-hint">
                    <kbd>↑</kbd> <kbd>↓</kbd> Navigate
                  </span>
                  <span className="key-hint">
                    <kbd>↵</kbd> Select
                  </span>
                  <span className="key-hint">
                    <kbd>esc</kbd> Exit
                  </span>
                </div>
                <span className="footer-brand font-mono">KAPPA // CMD-K v1.0</span>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
