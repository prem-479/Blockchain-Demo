// Inlines css + core + app + initial state into one self-contained web/dist/index.html
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const safe = (s) => s.replace(/<\/(script|style)/gi, '<\\/$1');
const html = read('index.template.html')
  .replace('/*__CSS__*/', () => safe(read('styles.css')))
  .replace('/*__STATE__*/', () => safe(read('initial-state.json')))
  .replace('/*__CORE__*/', () => safe(read('blockchain-core.js')))
  .replace('/*__APP__*/', () => safe(read('app.js')));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
