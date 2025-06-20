'use client'

import { Textarea } from '@/components/ui/textarea'

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function TextEditor({ value, onChange, placeholder, className }: TextEditorProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Enter your Modern Script Language commands here...\n\nBasic Examples:\nX1000        // Move X to position 1000\nY2000 F1500  // Move Y to 2000 with speed 1500\nZ-500        // Move Z to -500\n\nAdvanced Examples:\nGROUP X100 Y200 Z300  // Move all axes together\nSYNC                  // Wait for completion\n\nFUNC pickup\n  Z-100\n  G1         // Close gripper\n  Z100\nENDFUNC\n\nCALL pickup"}
      className={className || "min-h-[400px] font-mono text-sm bg-background/50 border-0 focus:ring-2 focus:ring-primary/20"}
    />
  )
}