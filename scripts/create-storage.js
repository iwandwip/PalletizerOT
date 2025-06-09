const fs = require('fs')
const path = require('path')

const directories = [
  'storage',
  'storage/scripts', 
  'storage/logs',
  'storage/config'
]

console.log('Creating storage directories...')

directories.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`✓ Created: ${dir}`)
  } else {
    console.log(`✓ Exists: ${dir}`)
  }
})

const defaultScript = `X(100,d1000,200);
Y(50,d500,100);
Z(10,d2000);

GROUP(X(100,d1000,200), Y(50,d500,100), Z(10));

FUNC(PICK_SEQUENCE) {
  GROUP(X(100,d500), Y(50,d300));
  Z(10,d1000);
}

CALL(PICK_SEQUENCE);`

const scriptPath = path.join(__dirname, '..', 'storage', 'scripts', 'current_script.txt')
if (!fs.existsSync(scriptPath)) {
  fs.writeFileSync(scriptPath, defaultScript)
  console.log('✓ Created default script')
}

console.log('Storage setup complete!')