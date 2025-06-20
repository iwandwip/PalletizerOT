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
      placeholder={placeholder || "Enter your palletizer commands here...\n\nExample:\nX(1000,d1500);\nY(2000);\nGROUP(X(0), Y(0), Z(500));\nWAIT;\n\nFUNC(pickup) {\n  Z(-100);\n  G1;\n  Z(100);\n}\n\nCALL(pickup);"}
      className={className || "min-h-[400px] font-mono text-sm bg-background/50 border-0 focus:ring-2 focus:ring-primary/20"}
    />
  )
}