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
      placeholder={placeholder || "Enter your Modern Script Language commands here...\n\n📝 Basic Movement:\nX(100);                           // Move X to position 100\nY(50, 150);                      // Move Y to 50 then 150\nZ(10, 100, 200);                 // Move Z through multiple positions\nG(600);                          // Move gripper to position 600\nT(9900);                         // Move turntable to position 9900\n\n🔄 Group Commands:\nGROUP(X(100), Y(50), Z(10));     // Asynchronous movement\nGROUP(X(500, 600), Y(300));      // Multi-parameter coordination\nGROUPSYNC(X(100, 200), Y(50));   // Synchronized matrix movement\n\n⚙️ System Commands:\nHOME();                          // Home all axes\nHOME(X);                         // Home specific axis\nZERO();                          // Zero all axes\nSPEED(2000);                     // Set global speed\nSPEED(X, 1500);                 // Set axis speed\n\n🔧 Sync & Timing:\nSET(1);                          // Set sync pin HIGH\nWAIT();                          // Wait for sync\nDETECT();                        // Wait for detection\nDELAY(1000);                     // Wait 1000ms\n\n⚙️ Functions:\nFUNC(pickup) {\n  Z(100);\n  X(200, 300);\n  G(400);\n  DELAY(500);\n}\n\nCALL(pickup);\n\n💡 Three movement types: MOVE (trajectory), GROUP (async), GROUPSYNC (matrix)!"}
      className={className || "min-h-[400px] font-mono text-sm bg-background/50 border-0 focus:ring-2 focus:ring-primary/20"}
    />
  )
}