const fs = require('fs');
let code = fs.readFileSync('components/StepLogin.tsx', 'utf8');

const onLoginOld = `onLogin: (wa: string, nickname: string, childCount: number) => void;`;
const onLoginNew = `onLogin: (wa: string, nickname: string, childCount: number, isOldMemberClaimed: boolean) => void;`;
code = code.replace(onLoginOld, onLoginNew);

const stateCode = `  const [childCount, setChildCount] = useState<number>(1);`;
const stateNew = `  const [childCount, setChildCount] = useState<number>(1);
  const [isOldMemberClaimed, setIsOldMemberClaimed] = useState(false);`;
code = code.replace(stateCode, stateNew);

const handleSubCode = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = sanitizePhoneNumber(phone);
    if (cleanPhone.length < 9) {
      alert("Nomor WhatsApp tidak valid");
      return;
    }
    setLoading(true);
    await onLogin(cleanPhone, nickname, childCount);
    setLoading(false);
  };`;

const handleSubNew = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = sanitizePhoneNumber(phone);
    if (cleanPhone.length < 9) {
      alert("Nomor WhatsApp tidak valid");
      return;
    }
    setLoading(true);
    await onLogin(cleanPhone, nickname, childCount, isOldMemberClaimed);
    setLoading(false);
  };`;
code = code.replace(handleSubCode, handleSubNew);

const childCountSelector = `{/* CHILD COUNT SELECTOR */}`;
const memberTypeSelector = `      {/* MEMBER TYPE SELECTOR */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">Status Member</label>
        <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
          <button
            type="button"
            onClick={() => setIsOldMemberClaimed(false)}
            className={\`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-all \${!isOldMemberClaimed ? "bg-slate-800 text-white shadow" : "text-slate-500 hover:bg-slate-50"}\`}
          >
            MEMBER BARU
          </button>
          <button
            type="button"
            onClick={() => setIsOldMemberClaimed(true)}
            className={\`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-all \${isOldMemberClaimed ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:bg-slate-50"}\`}
          >
            MEMBER LAMA
          </button>
        </div>
        {isOldMemberClaimed && (
          <p className="text-xs text-emerald-600 px-1">
            *Member lama tidak dikenakan biaya pendaftaran ulang.
          </p>
        )}
      </div>
      
      {/* CHILD COUNT SELECTOR */}`;
code = code.replace(childCountSelector, memberTypeSelector);

fs.writeFileSync('components/StepLogin.tsx', code);
