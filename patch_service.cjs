const fs = require('fs');
let code = fs.readFileSync('services/sheetService.ts', 'utf8');

const checkOld = `export const checkMemberStatus = async (whatsapp: string, nickname?: string, childCount: number = 1): Promise<MemberData> => {
  // 1. REAL MODE
  if (getActiveUrl()) {
    try {
      return await callScript('check_status', { whatsapp, nickname, childCount });`;

const checkNew = `export const checkMemberStatus = async (whatsapp: string, nickname?: string, childCount: number = 1, isOldMemberClaimed: boolean = false): Promise<MemberData> => {
  // 1. REAL MODE
  if (getActiveUrl()) {
    try {
      return await callScript('check_status', { whatsapp, nickname, childCount, isOldMemberClaimed });`;
code = code.replace(checkOld, checkNew);

fs.writeFileSync('services/sheetService.ts', code);
