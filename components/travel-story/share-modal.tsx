'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Link2, Check, Twitter, Send, 
  Copy, QrCode, Download, MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditMode } from '@/hooks/use-edit-mode'
import { cn } from '@/lib/utils'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

const shareOptions = [
  { 
    id: 'copy', 
    label: 'Скопировать ссылку', 
    icon: Copy, 
    color: 'bg-secondary text-foreground',
    hoverColor: 'hover:bg-secondary/80'
  },
  { 
    id: 'telegram', 
    label: 'Telegram', 
    icon: Send, 
    color: 'bg-[#0088cc] text-white',
    hoverColor: 'hover:bg-[#0077b5]'
  },
  { 
    id: 'twitter', 
    label: 'Twitter', 
    icon: Twitter, 
    color: 'bg-foreground text-background',
    hoverColor: 'hover:bg-foreground/90'
  },
  { 
    id: 'whatsapp', 
    label: 'WhatsApp', 
    icon: MessageCircle, 
    color: 'bg-[#25D366] text-white',
    hoverColor: 'hover:bg-[#1da851]'
  }
]

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { story } = useEditMode()
  const [copied, setCopied] = useState(false)
  const [activeQR, setActiveQR] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  if (!story) return null
  
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/story/${story.id}` 
    : ''
  
  const shareText = `${story.title} - Мое путешествие по ${story.countries.join(', ')}`
  
  const handleShare = async (optionId: string) => {
    switch (optionId) {
      case 'copy':
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
        break
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank')
        break
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank')
        break
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank')
        break
    }
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="relative overflow-hidden">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-coral/20 via-orange/10 to-yellow/10" />
              
              <div className="relative px-6 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Поделиться историей
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {story.title}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onClose}
                    className="shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Share URL Preview */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-coral to-orange">
                  <Link2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {shareUrl}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {story.countries.join(', ')} | {story.days.length} дней
                  </p>
                </div>
              </div>
            </div>
            
            {/* Share Options */}
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-3">
                {shareOptions.map((option) => {
                  const Icon = option.icon
                  const isCopyOption = option.id === 'copy'
                  
                  return (
                    <motion.button
                      key={option.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleShare(option.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl p-4 transition-colors",
                        option.color,
                        option.hoverColor
                      )}
                    >
                      {isCopyOption && copied ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                      <span className="font-medium">
                        {isCopyOption && copied ? 'Скопировано!' : option.label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
            
            {/* QR Code Toggle */}
            <div className="border-t border-border px-6 py-4">
              <button
                onClick={() => setActiveQR(!activeQR)}
                className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR-код для быстрого доступа
                </span>
                <motion.span
                  animate={{ rotate: activeQR ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.span>
              </button>
              
              <AnimatePresence>
                {activeQR && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex flex-col items-center gap-3">
                      {/* Placeholder for QR code - in production use a QR library */}
                      <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-background p-4 shadow-inner">
                        <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-0.5">
                          {Array.from({ length: 64 }).map((_, i) => (
                            <div 
                              key={i}
                              className={cn(
                                "rounded-sm",
                                Math.random() > 0.5 ? "bg-foreground" : "bg-transparent"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Скачать QR
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
