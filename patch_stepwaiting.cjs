const fs = require('fs');
let code = fs.readFileSync('components/StepWaitingApproval.tsx', 'utf8');

code = code.replace(/const StepWaitingApproval = \(\{[\s\S]*?onCheckStatus: \(\) => void;\n\}\) => \{/, 
`const StepWaitingApproval = ({
  member,
  onCheckStatus,
}: {
  member: MemberData;
  onCheckStatus: () => void;
}) => {`);

code = code.replace(/Mohon tunggu sebentar, Admin sedang memverifikasi pembayaran Anda\./,
`{member.paymentMethod === "KLAIM_MEMBER_LAMA" 
  ? "Admin sedang memverifikasi klaim Member Lama Anda. Mohon ditunggu." 
  : "Mohon tunggu sebentar, Admin sedang memverifikasi pembayaran Anda."}`
);

fs.writeFileSync('components/StepWaitingApproval.tsx', code);
