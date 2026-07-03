const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const loginOld = `  const handleLogin = async (wa: string, nickname: string, childCount: number) => {
    try {
      const result = await SheetService.checkMemberStatus(wa, nickname, childCount);`;

const loginNew = `  const handleLogin = async (wa: string, nickname: string, childCount: number, isOldMemberClaimed: boolean = false) => {
    try {
      const result = await SheetService.checkMemberStatus(wa, nickname, childCount, isOldMemberClaimed);`;
code = code.replace(loginOld, loginNew);

fs.writeFileSync('App.tsx', code);
