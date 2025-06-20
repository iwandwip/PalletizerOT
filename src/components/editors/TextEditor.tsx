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
      placeholder={placeholder || "Enter your Modern Script Language commands here...\n\n📝 Basic Movement:\nX(100);                    // Move X-axis to position 100\nY(50,d1000);              // Move Y to 50 with 1000ms delay\nZ(10,d500,100);           // Move Z from 10 to 100 with delay\nG(600);                   // Move gripper to position 600\nT(9900);                  // Move turntable to position 9900\n\n🔄 Group Commands:\nGROUP(X(100), Y(50), Z(10));     // Simultaneous movement\nGROUP(X(100,d500), Y(50,d300));  // With individual delays\n\n⚙️ Functions:\nFUNC(pickup) {\n  Z(100);\n  X(200,d1000,300);\n  G(400);\n  Z(50,d2000);\n}\n\nCALL(pickup);\n\n🔧 System Commands:\nZERO;        // Home all axes\nSPEED;1000;  // Set all axes speed\nSET(1);      // Set sync pin\nWAIT;        // Wait for sync\n\n💡 Click 'Basic Commands' for examples!"}
      className={className || "min-h-[400px] font-mono text-sm bg-background/50 border-0 focus:ring-2 focus:ring-primary/20"}
    />
  )
}