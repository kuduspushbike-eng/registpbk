const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

code = code.replace(/if \(action == "debug"\) \{[\s\S]*?if \(action == "get_all"\)/, 'if (action == "get_all")');

fs.writeFileSync('Code.gs', code);
