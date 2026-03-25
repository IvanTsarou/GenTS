'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Save, X, Undo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditMode } from '@/hooks/use-edit-mode'

export function EditBar() {
  const { 
    isEditMode, 
    hasUnsavedChanges, 
    saveChanges, 
    discardChanges 
  } = useEditMode()

  return (
    <AnimatePresence>
      {isEditMode && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-full bg-card px-4 py-3 shadow-2xl ring-1 ring-border/50 backdrop-blur-sm">
            {/* Edit mode indicator */}
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Режим редактирования
              </span>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {hasUnsavedChanges ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={discardChanges}
                    className="gap-1.5"
                  >
                    <Undo className="h-4 w-4" />
                    Отменить
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveChanges}
                    className="gap-1.5 bg-teal text-primary-foreground hover:bg-teal/90"
                  >
                    <Save className="h-4 w-4" />
                    Сохранить
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Кликни на элемент для редактирования</span>
                </div>
              )}
            </div>
            
            {/* Close button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={discardChanges}
              className="ml-2 h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-orange/10 px-3 py-1 text-xs font-medium text-orange"
            >
              Есть несохраненные изменения
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
