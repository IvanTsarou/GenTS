'use client'

import { motion } from 'framer-motion'
import { 
  Plane, Car, Train, Footprints, Ship, Bike, Bus, 
  Cable, CarTaxiFront, TrainFront, TramFront
} from 'lucide-react'
import type { TransportType } from '@/lib/types/travel-story'

interface TransportDoodleProps {
  transport: TransportType
}

const transportConfig: Record<TransportType, { 
  icon: React.ComponentType<{ className?: string }>
  label: string 
}> = {
  plane: { icon: Plane, label: 'Fly away!' },
  car: { icon: Car, label: 'Road trip!' },
  train: { icon: Train, label: 'Choo choo!' },
  walk: { icon: Footprints, label: 'Walking around' },
  ship: { icon: Ship, label: 'Sailing!' },
  bike: { icon: Bike, label: 'Pedal power!' },
  bus: { icon: Bus, label: 'Bus ride' },
  metro: { icon: TramFront, label: 'Underground' },
  taxi: { icon: CarTaxiFront, label: 'Taxi!' },
  tram: { icon: TrainFront, label: 'Tram time' },
  cable_car: { icon: Cable, label: 'Up we go!' },
  motorcycle: { icon: Bike, label: 'Ride on!' },
}

export function TransportDoodle({ transport }: TransportDoodleProps) {
  const config = transportConfig[transport]
  const Icon = config.icon

  return (
    <motion.div 
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {/* Hand-drawn arrow */}
      <svg className="w-8 h-16 text-ink-green" viewBox="0 0 32 64">
        <motion.path
          d="M16 0 C16 20, 14 30, 16 45 M8 38 L16 48 L24 38"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>

      {/* Transport badge */}
      <motion.div 
        className="relative"
        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.4 }}
      >
        {/* Sticker background */}
        <div className="absolute inset-0 bg-washi-pink rounded-full transform scale-110 opacity-60" />
        
        <div className="relative flex items-center gap-2 px-5 py-3 bg-paper-cream rounded-full border-2 border-dashed border-ink-green/40">
          <Icon className="w-6 h-6 text-ink-green" />
          <span className="text-lg font-[family-name:var(--font-handwritten)] text-ink-green font-medium">
            {config.label}
          </span>
        </div>

        {/* Small decorative star */}
        <motion.div 
          className="absolute -top-2 -right-2 text-xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          ✦
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
