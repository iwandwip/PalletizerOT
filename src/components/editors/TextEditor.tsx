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
      placeholder={placeholder || "Enter your Modern Script Language commands here...\n\n📝 Basic Movement:\nX1000        // Move X-axis to position 1000\nY2000 F1500  // Move Y-axis to 2000 with speed 1500\nZ-500        // Move Z-axis to -500 (negative position)\n\n🔄 Group Commands:\nGROUP X100 Y200 Z300  // Move multiple axes together\nSYNC                  // Wait for all movements to complete\n\n⚙️ Functions & Loops:\nFUNC pickup\n  Z-100      // Lower Z-axis\n  G1         // Close gripper\n  Z100       // Raise Z-axis\nENDFUNC\n\nLOOP 5       // Repeat 5 times\n  CALL pickup\n  X1000\nENDLOOP\n\n💡 Click 'Basic Commands' button for quick start!"}
      className={className || "min-h-[400px] font-mono text-sm bg-background/50 border-0 focus:ring-2 focus:ring-primary/20"}
    />
  )
}