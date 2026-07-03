const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/<StepWaitingApproval\s+onCheckStatus=\{handleCheckStatus\}/,
`<StepWaitingApproval member={member} onCheckStatus={handleCheckStatus}`);

fs.writeFileSync('App.tsx', code);
