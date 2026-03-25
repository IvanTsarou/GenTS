'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import type { Comment } from '@/lib/types/travel-story'
import { useEditMode } from '@/hooks/use-edit-mode'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ScrapbookCommentsProps {
  comments: Comment[]
}

const stickyColors = [
  'bg-yellow-200',
  'bg-pink-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-orange-200',
]

const rotations = [
  'rotate-[-3deg]',
  'rotate-[2deg]',
  'rotate-[-1deg]',
  'rotate-[4deg]',
  'rotate-[-2deg]',
]

function StickyComment({ comment, idx }: { comment: Comment; idx: number }) {
  const { isEditMode, updateComment } = useEditMode()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.text)

  useEffect(() => {
    setText(comment.text)
  }, [comment.id, comment.text])

  return (
    <motion.div
      key={comment.id}
      className={`
              relative p-4 w-40 md:w-48 
              ${stickyColors[idx % stickyColors.length]} 
              ${rotations[idx % rotations.length]}
              shadow-md
            `}
      initial={{ opacity: 0, y: 20, rotate: -10 }}
      whileInView={{
        opacity: 1,
        y: 0,
        rotate: parseInt(rotations[idx % rotations.length].match(/-?\d+/)?.[0] || '0'),
      }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.1 }}
      whileHover={{
        scale: 1.05,
        rotate: 0,
        zIndex: 10,
      }}
      style={{
        boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
      }}
    >
      <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-stamp-red shadow-sm" />

      {isEditMode && editing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[72px] w-full resize-none rounded border border-foreground/20 bg-white/80 p-2 text-sm text-foreground/90 outline-none font-[family-name:var(--font-handwritten)]"
            autoFocus
          />
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                updateComment(comment.id, text)
                setEditing(false)
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setText(comment.text)
                setEditing(false)
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p
            onClick={() => isEditMode && setEditing(true)}
            className={cn(
              'line-clamp-4 text-sm font-[family-name:var(--font-handwritten)] leading-relaxed text-foreground/80',
              isEditMode && 'cursor-pointer rounded hover:ring-2 hover:ring-ink-green/40'
            )}
          >
            {comment.text}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-green/20 text-xs font-bold text-ink-green">
              {(comment.author ?? '?').charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-xs text-muted-foreground">{comment.author ?? 'Аноним'}</span>
          </div>
        </>
      )}
    </motion.div>
  )
}

export function ScrapbookComments({ comments }: ScrapbookCommentsProps) {
  if (!comments || comments.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-2xl font-[family-name:var(--font-handwritten)] text-ink-green">
        <span>Notes & Memories</span>
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"
            fill="currentColor"
            className="text-washi-pink"
          />
        </svg>
      </h3>

      <div className="flex flex-wrap gap-4">
        {comments.slice(0, 4).map((comment, idx) => (
          <StickyComment key={comment.id} comment={comment} idx={idx} />
        ))}
      </div>

      {comments.length > 4 && (
        <p className="text-sm text-muted-foreground font-[family-name:var(--font-handwritten)]">
          + {comments.length - 4} заметок…
        </p>
      )}
    </div>
  )
}
