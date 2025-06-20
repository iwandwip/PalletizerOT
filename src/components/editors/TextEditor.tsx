'use client'

import { Textarea } from '@/components/ui/textarea'
import { useRef, useEffect, useState } from 'react'

interface TextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function TextEditor({ value, onChange, placeholder, className }: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  useEffect(() => {
    const lines = value.split('\n').length
    setLineCount(lines)
  }, [value])

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  // Calculate exact line height to match textarea
  const lineHeight = 21 // 1.5 * 14px (text-sm)
  const padding = 8 // 0.5rem

  return (
    <div className="relative flex border rounded-md bg-background/50 overflow-hidden">
      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--muted));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: hsl(var(--muted));
        }
        
        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) hsl(var(--muted));
        }
      `}</style>

      {/* Line Numbers */}
      <div 
        ref={lineNumbersRef}
        className="text-right text-sm text-muted-foreground bg-muted/20 border-r select-none overflow-hidden custom-scrollbar"
        style={{
          minWidth: '3.5rem',
          paddingTop: `${padding}px`,
          paddingBottom: `${padding}px`,
          paddingLeft: '8px',
          paddingRight: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: '14px',
          lineHeight: `${lineHeight}px`
        }}
      >
        {lineNumbers.map(num => (
          <div key={num} style={{ height: `${lineHeight}px`, lineHeight: `${lineHeight}px` }}>
            {num}
          </div>
        ))}
      </div>

      {/* Text Area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        wrap="off"
        placeholder={placeholder || "Enter your Modern Script Language commands here...\n\n📝 Basic Movement:\nX(100);                           // Move X to position 100\nY(50, 150);                      // Move Y to 50 then 150\nZ(10, 100, 200);                 // Move Z through multiple positions\nG(600);                          // Move gripper to position 600\nT(9900);                         // Move turntable to position 9900\n\n🔄 Group Commands:\nGROUP(X(100), Y(50), Z(10));     // Asynchronous movement\nGROUP(X(500, 600), Y(300));      // Multi-parameter coordination\nGROUPSYNC(X(100, 200), Y(50));   // Synchronized matrix movement\n\n⚙️ System Commands:\nHOME();                          // Home all axes\nHOME(X);                         // Home specific axis\nZERO();                          // Zero all axes\nSPEED(2000);                     // Set global speed\nSPEED(X, 1500);                 // Set axis speed\n\n🔧 Sync & Timing:\nSET(1);                          // Set sync pin HIGH\nWAIT();                          // Wait for sync\nDETECT();                        // Wait for detection\nDELAY(1000);                     // Wait 1000ms\n\n⚙️ Functions:\nFUNC(pickup) {\n  Z(100);\n  X(200, 300);\n  G(400);\n  DELAY(500);\n}\n\nCALL(pickup);\n\n💡 Three movement types: MOVE (trajectory), GROUP (async), GROUPSYNC (matrix)!"}
        className={`${className || "min-h-[400px] font-mono"} flex-1 border-0 bg-transparent focus:ring-2 focus:ring-primary/20 resize-none rounded-none overflow-x-auto custom-scrollbar`}
        style={{
          paddingTop: `${padding}px`,
          paddingBottom: `${padding}px`,
          paddingLeft: '12px',
          paddingRight: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: '14px',
          lineHeight: `${lineHeight}px`
        }}
      />
    </div>
  )
}