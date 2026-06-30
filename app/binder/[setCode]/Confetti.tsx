'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#22d3ee', '#a855f7', '#e879f9', '#ffffff', 'rgba(255,255,255,0.8)']

type Piece = {
  id: number
  color: string
  x: number
  drift: number
  delay: number
  duration: number
  wobble: number
  width: number
  height: number
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    x: Math.random() * 100,
    drift: Math.random() * 60 - 30,
    delay: Math.random() * 2,
    duration: 2.5 + Math.random() * 2,
    wobble: Math.random() * 80 - 40,
    width: 6 + Math.random() * 4,
    height: 4 + Math.random() * 4,
  }))
}

export function Confetti() {
  const [pieces] = useState(() => makePieces(120))
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden pointer-events-none"
      aria-hidden
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: animate ? 'calc(100% + 20px)' : '-20px',
            transform: animate ? `translateX(${p.drift}px) rotate(${p.wobble}deg)` : 'none',
            opacity: animate ? 0.15 : 1,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius: 2,
            transition: `top ${p.duration}s ${p.delay}s linear, transform ${p.duration}s ${p.delay}s linear, opacity ${p.duration}s ${p.delay}s linear`,
          }}
        />
      ))}
    </div>
  )
}
