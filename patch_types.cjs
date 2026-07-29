const fs = require('fs');

const path = 'types.ts';
let content = fs.readFileSync(path, 'utf8');

const oldStr = "has_completed_onboarding: boolean; // Adicionado para o fluxo de boas-vindas";
const newStr = "city?: string;\n  state?: string;\n  has_completed_onboarding: boolean; // Adicionado para o fluxo de boas-vindas";
content = content.replace(oldStr, newStr);

fs.writeFileSync(path, content);
