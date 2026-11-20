// Copies the Persian font into src/fonts so the app has no web dependency.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'node_modules', '@fontsource-variable', 'vazirmatn', 'files');
const out = path.join(__dirname, '..', 'src', 'fonts');
fs.mkdirSync(out, { recursive: true });
let n = 0;
for (const sub of ['arabic-wght-normal', 'latin-wght-normal']) {
  const f = fs.existsSync(dir) ? fs.readdirSync(dir).find((x) => x === 'vazirmatn-' + sub + '.woff2') : null;
  if (f) { fs.copyFileSync(path.join(dir, f), path.join(out, f)); n++; }
}
console.log(n === 2 ? 'Fonts copied.' : 'WARNING: Vazirmatn font files not found - the app will use Tahoma.');
