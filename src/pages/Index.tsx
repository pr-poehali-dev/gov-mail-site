import { useState, useRef, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Icon from "@/components/ui/icon";

const URLS = {
  auth: "https://functions.poehali.dev/ed582c64-69d5-4703-97c5-2f01007ecbb9",
  letters: "https://functions.poehali.dev/3716bf58-32ac-48c1-98c7-d90104c9cffc",
  reports: "https://functions.poehali.dev/2cca1bee-0615-4ef8-91cb-b1bc4a0b9cb9",
};

const STORAGE_KEY = "gospochta_user";

type Section = "home" | "compose" | "envelope" | "scan" | "track" | "history" | "reports";

interface LetterData {
  id: string;
  tracking_number: string;
  user_login: string;
  sender_name: string;
  sender_address: string;
  sender_city: string;
  sender_zip: string;
  recipient_name: string;
  recipient_address: string;
  recipient_city: string;
  recipient_zip: string;
  letter_type: string;
  weight: string;
  status: string;
  created_at: string;
}

interface ReportData {
  total: number;
  delivered: number;
  in_transit: number;
  by_status: { status: string; count: number }[];
  by_type: { type: string; count: number }[];
  by_month: { month: string; count: number }[];
}

const STATUSES = [
  "Принято в отделении",
  "В пути к получателю",
  "Прибыло в город назначения",
  "Ожидает получателя",
  "Доставлено",
];

const STATUS_COLORS: Record<string, string> = {
  "Принято в отделении": "bg-blue-50 text-blue-700 border-blue-200",
  "В пути к получателю": "bg-amber-50 text-amber-700 border-amber-200",
  "Прибыло в город назначения": "bg-orange-50 text-orange-700 border-orange-200",
  "Ожидает получателя": "bg-purple-50 text-purple-700 border-purple-200",
  Доставлено: "bg-green-50 text-green-700 border-green-200",
};

const PIE_COLORS = ["#0d1f4e", "#c9952a", "#4f7bc8", "#82b440", "#e05a2b"];

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "compose", label: "Оформить письмо", icon: "FileText" },
  { id: "envelope", label: "Печать конверта", icon: "Printer" },
  { id: "scan", label: "Сканирование QR", icon: "QrCode" },
  { id: "track", label: "Отслеживание", icon: "MapPin" },
  { id: "history", label: "История", icon: "ClipboardList" },
  { id: "reports", label: "Отчёты", icon: "BarChart2" },
];

function generateTrackingNumber(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const prefix = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)];
  const nums = Math.floor(100000000 + Math.random() * 900000000).toString();
  const suffix = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)];
  return `${prefix}${nums}${suffix}`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export default function Index() {
  const [currentUser, setCurrentUser] = useState<{ login: string; full_name: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  });
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [active, setActive] = useState<Section>("home");
  const [letters, setLetters] = useState<LetterData[]>([]);
  const [currentLetter, setCurrentLetter] = useState<LetterData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lettersLoading, setLettersLoading] = useState(false);

  const [form, setForm] = useState({
    senderName: "", senderAddress: "", senderCity: "", senderZip: "",
    recipientName: "", recipientAddress: "", recipientCity: "", recipientZip: "",
    type: "Заказное", weight: "до 20г",
  });

  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<LetterData | null>(null);
  const [scanError, setScanError] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const [trackInput, setTrackInput] = useState("");
  const [trackResult, setTrackResult] = useState<LetterData | null>(null);
  const [trackError, setTrackError] = useState(false);

  const [reports, setReports] = useState<ReportData | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) loadLetters();
  }, [currentUser]);

  async function loadLetters() {
    setLettersLoading(true);
    try {
      const r = await fetch(`${URLS.letters}?user_login=${currentUser?.login}`);
      const data = await r.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setLetters(Array.isArray(parsed) ? parsed : []);
    } catch { setLetters([]); }
    setLettersLoading(false);
  }

  async function loadReports() {
    setReportsLoading(true);
    try {
      const r = await fetch(`${URLS.reports}?user_login=${currentUser?.login}`);
      const data = await r.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setReports(parsed);
    } catch { setReports(null); }
    setReportsLoading(false);
  }

  async function handleLogin() {
    setLoginError("");
    if (!loginForm.login || !loginForm.password) { setLoginError("Заполните все поля"); return; }
    setLoginLoading(true);
    try {
      const r = await fetch(URLS.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginForm.login, password: loginForm.password }),
      });
      const data = await r.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (!r.ok) { setLoginError(parsed.error || "Неверный логин или пароль"); }
      else {
        const user = { login: parsed.login, full_name: parsed.full_name };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setCurrentUser(user);
      }
    } catch { setLoginError("Ошибка подключения к серверу"); }
    setLoginLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setLetters([]);
    setActive("home");
    setMobileMenuOpen(false);
    setLoginForm({ login: "", password: "" });
  }

  const stopCamera = useCallback(async () => {
    if (qrScannerRef.current) {
      try { await qrScannerRef.current.stop(); } catch (_e) { void _e; }
      qrScannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  function navigate(s: Section) {
    setActive(s);
    setMobileMenuOpen(false);
    stopCamera();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (s === "reports") loadReports();
  }

  function handleFormChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleRegisterLetter() {
    if (!form.senderName || !form.recipientName || !form.senderAddress || !form.recipientAddress) return;
    const letter: LetterData = {
      id: generateId(),
      tracking_number: generateTrackingNumber(),
      user_login: currentUser!.login,
      sender_name: form.senderName, sender_address: form.senderAddress,
      sender_city: form.senderCity, sender_zip: form.senderZip,
      recipient_name: form.recipientName, recipient_address: form.recipientAddress,
      recipient_city: form.recipientCity, recipient_zip: form.recipientZip,
      letter_type: form.type, weight: form.weight,
      status: "Принято в отделении",
      created_at: new Date().toLocaleDateString("ru-RU"),
    };
    await fetch(URLS.letters, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(letter),
    });
    setLetters((prev) => [letter, ...prev]);
    setCurrentLetter(letter);
    navigate("envelope");
  }

  async function handleUpdateStatus(id: string) {
    const r = await fetch(URLS.letters, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await r.json();
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const newStatus = parsed.status;
    setLetters((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
    setTrackResult((prev) => prev?.id === id ? { ...prev, status: newStatus } : prev);
    setScanResult((prev) => prev?.id === id ? { ...prev, status: newStatus } : prev);
  }

  function handleScan() {
    setScanError(false);
    const found = letters.find((l) => l.tracking_number === scanInput.trim().toUpperCase());
    if (found) { setScanResult(found); }
    else { setScanResult(null); setScanError(true); }
  }

  function handleTrack() {
    setTrackError(false);
    const found = letters.find((l) => l.tracking_number === trackInput.trim().toUpperCase());
    if (found) { setTrackResult(found); }
    else { setTrackResult(null); setTrackError(true); }
  }

  async function startCamera() {
    setCameraActive(true);
    setScanResult(null);
    setScanError(false);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        qrScannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            setScanInput(decodedText);
            const found = letters.find((l) => l.tracking_number === decodedText.trim().toUpperCase());
            if (found) { setScanResult(found); setScanError(false); }
            else { setScanResult(null); setScanError(true); }
            stopCamera();
          },
          () => {}
        );
      } catch { setCameraActive(false); }
    }, 100);
  }

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f0eee8] flex flex-col">
        <div className="bg-[var(--gov-navy)] border-b-4 border-[var(--gov-gold)] py-4 px-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--gov-gold)] flex items-center justify-center">
            <span className="text-[var(--gov-navy)] font-oswald font-bold">ГП</span>
          </div>
          <div>
            <div className="font-oswald font-bold text-white tracking-wider">ГОСПОЧТА</div>
            <div className="text-[var(--gov-gold)] text-xs tracking-widest font-golos">ГОСУДАРСТВЕННАЯ ПОЧТОВАЯ СЛУЖБА</div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">
            <div className="bg-white border border-gray-200 shadow-sm">
              <div className="bg-[var(--gov-navy)] p-6 text-center">
                <div className="w-14 h-14 bg-[var(--gov-gold)] flex items-center justify-center mx-auto mb-3">
                  <Icon name="LogIn" size={26} className="text-[var(--gov-navy)]" />
                </div>
                <div className="font-oswald font-bold text-white tracking-widest text-lg">ВХОД В СИСТЕМУ</div>
                <div className="text-gray-400 text-xs font-golos mt-1">Государственная почтовая служба</div>
              </div>
              <div className="p-8 space-y-4">
                <AuthField label="Логин" value={loginForm.login}
                  onChange={(v) => { setLoginForm((f) => ({ ...f, login: v })); setLoginError(""); }}
                  placeholder="Введите логин" />
                <AuthField label="Пароль" value={loginForm.password} type="password"
                  onChange={(v) => { setLoginForm((f) => ({ ...f, password: v })); setLoginError(""); }}
                  placeholder="Введите пароль" onEnter={handleLogin} />
                {loginError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-golos">
                    <Icon name="AlertCircle" size={15} /> {loginError}
                  </div>
                )}
                <button onClick={handleLogin} disabled={loginLoading}
                  className="w-full bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald font-bold py-3 tracking-widest text-sm hover:bg-[var(--gov-navy-light)] transition-colors disabled:opacity-50 mt-2">
                  {loginLoading ? "ПРОВЕРКА..." : "ВОЙТИ В СИСТЕМУ"}
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 font-golos mt-4">
              Государственная почтовая служба · Защищённый доступ
            </p>
          </div>
        </div>

        <footer className="bg-[var(--gov-navy)] border-t-4 border-[var(--gov-gold)] py-4 text-center text-xs text-gray-400 font-golos">
          © {new Date().getFullYear()} Государственная почтовая служба. Все права защищены.
        </footer>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-[#f0eee8] font-golos">
      <header className="no-print bg-[var(--gov-navy)] text-white shadow-xl">
        <div className="border-b-4 border-[var(--gov-gold)]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--gov-gold)] flex items-center justify-center rounded-sm">
                <span className="text-[var(--gov-navy)] font-oswald font-bold text-lg">ГП</span>
              </div>
              <div>
                <div className="font-oswald font-bold text-lg tracking-wider leading-tight">ГОСПОЧТА</div>
                <div className="text-[var(--gov-gold)] text-xs tracking-widest font-golos">ГОСУДАРСТВЕННАЯ ПОЧТОВАЯ СЛУЖБА</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm font-golos text-gray-300">
                <Icon name="User" size={14} className="text-[var(--gov-gold)]" />
                <span>{currentUser.full_name || currentUser.login}</span>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-1 border border-white/30 text-white text-xs font-oswald px-3 py-1.5 hover:bg-white/10 transition-colors tracking-wide">
                <Icon name="LogOut" size={13} />
                <span className="hidden md:inline">ВЫЙТИ</span>
              </button>
              <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Icon name="Menu" size={24} />
              </button>
            </div>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 hidden md:flex flex-wrap">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-oswald tracking-wide transition-all border-b-2 ${
                active === item.id ? "border-[var(--gov-gold)] text-[var(--gov-gold)]" : "border-transparent text-gray-300 hover:text-white hover:border-white/40"
              }`}>
              <Icon name={item.icon} size={15} /> {item.label}
            </button>
          ))}
        </nav>
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/20">
            <div className="px-5 py-3 border-b border-white/10 text-xs text-gray-400 font-golos flex items-center gap-2">
              <Icon name="User" size={13} className="text-[var(--gov-gold)]" />
              {currentUser.full_name || currentUser.login}
            </div>
            {navItems.map((item) => (
              <button key={item.id} onClick={() => navigate(item.id)}
                className={`flex items-center gap-3 w-full px-5 py-3 text-sm font-oswald tracking-wide ${active === item.id ? "text-[var(--gov-gold)] bg-white/10" : "text-gray-300"}`}>
                <Icon name={item.icon} size={16} /> {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* HOME */}
        {active === "home" && (
          <div className="animate-fade-in">
            <div className="bg-[var(--gov-navy)] text-white px-8 py-12 mb-8 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--gov-gold)]"></div>
              <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-gradient-to-l from-[var(--gov-gold)]"></div>
              <div className="relative z-10">
                <div className="text-[var(--gov-gold)] text-xs font-oswald tracking-widest mb-2">
                  ДОБРО ПОЖАЛОВАТЬ, {(currentUser.full_name || currentUser.login).split(" ")[0].toUpperCase()}
                </div>
                <h1 className="font-oswald text-3xl md:text-4xl font-bold tracking-wide mb-4 leading-tight">
                  ГОСУДАРСТВЕННАЯ<br />ПОЧТОВАЯ СЛУЖБА
                </h1>
                <p className="text-gray-300 font-golos text-base mb-8 max-w-lg">
                  Оформляйте письма, печатайте конверты с QR-кодами и отслеживайте доставку.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => navigate("compose")}
                    className="bg-[var(--gov-gold)] text-[var(--gov-navy)] font-oswald font-bold px-6 py-3 tracking-wide hover:brightness-110 transition-all">
                    ОФОРМИТЬ ПИСЬМО
                  </button>
                  <button onClick={() => navigate("track")}
                    className="border border-white text-white font-oswald px-6 py-3 tracking-wide hover:bg-white hover:text-[var(--gov-navy)] transition-colors">
                    ОТСЛЕДИТЬ ОТПРАВЛЕНИЕ
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "ЗАРЕГИСТРИРОВАНО", value: letters.length, icon: "FileText" },
                { label: "ДОСТАВЛЕНО", value: letters.filter((l) => l.status === "Доставлено").length, icon: "CheckCircle" },
                { label: "В ПУТИ", value: letters.filter((l) => l.status !== "Доставлено").length, icon: "Truck" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-gray-200 p-5 text-center">
                  <Icon name={s.icon} size={22} className="text-[var(--gov-navy)] mx-auto mb-2" />
                  <div className="font-oswald text-3xl font-bold text-[var(--gov-navy)]">{s.value}</div>
                  <div className="text-xs text-gray-400 font-golos tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {navItems.slice(1).map((item) => (
                <button key={item.id} onClick={() => navigate(item.id)}
                  className="bg-white border border-gray-200 p-4 text-left hover:border-[var(--gov-navy)] hover:shadow-sm transition-all group">
                  <div className="w-8 h-8 bg-[var(--gov-navy)] flex items-center justify-center mb-3 group-hover:bg-[var(--gov-gold)] transition-colors">
                    <Icon name={item.icon} size={16} className="text-[var(--gov-gold)] group-hover:text-[var(--gov-navy)]" />
                  </div>
                  <div className="font-oswald font-bold text-[var(--gov-navy)] text-sm tracking-wide">{item.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COMPOSE */}
        {active === "compose" && (
          <div className="animate-fade-in">
            <SectionHeader icon="FileText" title="Оформление письма" subtitle="Заполните данные для регистрации отправления" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 bg-[var(--gov-navy)] flex items-center justify-center">
                    <Icon name="User" size={13} className="text-[var(--gov-gold)]" />
                  </div>
                  <h3 className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide">ОТПРАВИТЕЛЬ</h3>
                </div>
                <div className="space-y-4">
                  <Field label="ФИО / Организация" value={form.senderName} onChange={(v) => handleFormChange("senderName", v)} placeholder="Иванов Иван Иванович" />
                  <Field label="Адрес" value={form.senderAddress} onChange={(v) => handleFormChange("senderAddress", v)} placeholder="ул. Ленина, д. 10, кв. 5" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Город" value={form.senderCity} onChange={(v) => handleFormChange("senderCity", v)} placeholder="Москва" />
                    <Field label="Индекс" value={form.senderZip} onChange={(v) => handleFormChange("senderZip", v)} placeholder="101000" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 bg-[var(--gov-gold)] flex items-center justify-center">
                    <Icon name="UserCheck" size={13} className="text-[var(--gov-navy)]" />
                  </div>
                  <h3 className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide">ПОЛУЧАТЕЛЬ</h3>
                </div>
                <div className="space-y-4">
                  <Field label="ФИО / Организация" value={form.recipientName} onChange={(v) => handleFormChange("recipientName", v)} placeholder="Петров Пётр Петрович" />
                  <Field label="Адрес" value={form.recipientAddress} onChange={(v) => handleFormChange("recipientAddress", v)} placeholder="пр. Победы, д. 22, кв. 8" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Город" value={form.recipientCity} onChange={(v) => handleFormChange("recipientCity", v)} placeholder="Санкт-Петербург" />
                    <Field label="Индекс" value={form.recipientZip} onChange={(v) => handleFormChange("recipientZip", v)} placeholder="190000" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-6 md:col-span-2">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 bg-[var(--gov-navy)] flex items-center justify-center">
                    <Icon name="Settings" size={13} className="text-[var(--gov-gold)]" />
                  </div>
                  <h3 className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide">ПАРАМЕТРЫ</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold font-oswald tracking-widest text-[var(--gov-navy)] uppercase mb-1">Вид отправления</label>
                    <select value={form.type} onChange={(e) => handleFormChange("type", e.target.value)}
                      className="w-full border border-[var(--gov-navy)] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[var(--gov-gold)] rounded-none">
                      <option>Заказное</option><option>Ценное</option><option>Простое</option>
                      <option>С уведомлением</option><option>EMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold font-oswald tracking-widest text-[var(--gov-navy)] uppercase mb-1">Вес</label>
                    <select value={form.weight} onChange={(e) => handleFormChange("weight", e.target.value)}
                      className="w-full border border-[var(--gov-navy)] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[var(--gov-gold)] rounded-none">
                      <option>до 20г</option><option>до 50г</option><option>до 100г</option>
                      <option>до 250г</option><option>до 500г</option><option>до 1кг</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleRegisterLetter}
                  disabled={!form.senderName || !form.recipientName || !form.senderAddress || !form.recipientAddress}
                  className="mt-6 w-full bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald font-bold py-3 tracking-widest text-sm hover:bg-[var(--gov-navy-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  ЗАРЕГИСТРИРОВАТЬ ОТПРАВЛЕНИЕ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ENVELOPE */}
        {active === "envelope" && (
          <div className="animate-fade-in">
            <SectionHeader icon="Printer" title="Печать конверта" subtitle="Макет конверта с QR-кодом готов к печати" />
            {!currentLetter ? (
              <div className="bg-white border border-gray-200 p-12 text-center">
                <Icon name="FileX" size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-golos mb-4">Нет данных для печати. Сначала оформите письмо.</p>
                <button onClick={() => navigate("compose")}
                  className="bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald px-6 py-2 tracking-wide hover:bg-[var(--gov-navy-light)]">
                  ОФОРМИТЬ ПИСЬМО
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 no-print flex flex-wrap gap-3">
                  <button onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald px-5 py-2 tracking-wide hover:bg-[var(--gov-navy-light)] transition-colors">
                    <Icon name="Printer" size={16} /> ПЕЧАТЬ КОНВЕРТА
                  </button>
                  <button onClick={() => navigate("track")}
                    className="flex items-center gap-2 border border-[var(--gov-navy)] text-[var(--gov-navy)] font-oswald px-5 py-2 tracking-wide hover:bg-gray-50">
                    <Icon name="MapPin" size={16} /> ОТСЛЕДИТЬ
                  </button>
                  <button onClick={() => navigate("compose")}
                    className="flex items-center gap-2 border border-gray-300 text-gray-600 font-oswald px-5 py-2 tracking-wide hover:bg-gray-50">
                    <Icon name="Plus" size={16} /> НОВОЕ ПИСЬМО
                  </button>
                </div>

                <div ref={printRef} className="print-area bg-white p-8 max-w-3xl mx-auto shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[var(--gov-navy)] flex items-center justify-center">
                        <span className="text-[var(--gov-gold)] font-oswald font-bold text-xs">ГП</span>
                      </div>
                      <div>
                        <div className="font-oswald font-bold text-[var(--gov-navy)] text-sm tracking-wider">ГОСПОЧТА</div>
                        <div className="text-gray-400 text-xs">Российская Федерация</div>
                      </div>
                    </div>
                    <div className="border-2 border-dashed border-gray-400 w-20 h-14 flex items-center justify-center">
                      <span className="text-gray-300 text-xs text-center leading-tight">МЕСТО<br />МАРКИ</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 mb-6"></div>
                  <div className="flex gap-8 mb-6">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 font-golos tracking-widest mb-2">ОТПРАВИТЕЛЬ</div>
                      <div className="font-golos text-sm font-semibold text-[var(--gov-navy)]">{currentLetter.sender_name}</div>
                      <div className="font-golos text-sm text-gray-600">{currentLetter.sender_address}</div>
                      <div className="font-golos text-sm text-gray-600">{currentLetter.sender_city} {currentLetter.sender_zip}</div>
                    </div>
                    <div className="flex-1 border-l-2 border-[var(--gov-gold)] pl-6">
                      <div className="text-xs text-gray-400 font-golos tracking-widest mb-2">ПОЛУЧАТЕЛЬ</div>
                      <div className="font-golos text-base font-bold text-[var(--gov-navy)]">{currentLetter.recipient_name}</div>
                      <div className="font-golos text-sm text-gray-600">{currentLetter.recipient_address}</div>
                      <div className="font-golos text-base font-semibold text-[var(--gov-navy)]">{currentLetter.recipient_city} {currentLetter.recipient_zip}</div>
                    </div>
                  </div>
                  <div className="border-t-2 border-[var(--gov-navy)] pt-4 flex items-center justify-between bg-gray-50 px-4 py-3">
                    <div>
                      <div className="text-xs text-gray-400 font-golos tracking-widest mb-1">ТРЕК-НОМЕР</div>
                      <div className="font-oswald font-bold text-xl text-[var(--gov-navy)] tracking-widest">{currentLetter.tracking_number}</div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 font-golos">
                        <span>Вид: {currentLetter.letter_type}</span>
                        <span>Вес: {currentLetter.weight}</span>
                        <span>Дата: {currentLetter.created_at}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <QRCodeSVG value={currentLetter.tracking_number} size={80} bgColor="#ffffff" fgColor="#0d1f4e" level="H" />
                      <div className="text-xs text-gray-400 mt-1 font-golos">Сканируйте</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-white border-l-4 border-[var(--gov-gold)] no-print">
                  <div className="flex items-center gap-2 text-sm font-golos text-green-700">
                    <Icon name="CheckCircle" size={16} />
                    Письмо зарегистрировано. Трек-номер: <strong>{currentLetter.tracking_number}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SCAN */}
        {active === "scan" && (
          <div className="animate-fade-in">
            <SectionHeader icon="QrCode" title="Сканирование QR-кода" subtitle="Наведите камеру на QR-код конверта или введите трек-номер вручную" />
            <div className="max-w-xl mx-auto space-y-4">
              <div className="bg-white border border-gray-200 p-6">
                <div className="text-xs font-oswald tracking-wider text-gray-400 mb-3">СКАНЕР КАМЕРЫ</div>
                {cameraActive ? (
                  <div>
                    <div id="qr-reader" className="w-full rounded overflow-hidden mb-3" style={{ minHeight: 260 }}></div>
                    <button onClick={stopCamera}
                      className="w-full border border-gray-300 text-gray-600 font-oswald py-2 tracking-wide hover:bg-gray-50">
                      ОСТАНОВИТЬ КАМЕРУ
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6">
                    <div className="w-24 h-24 border-4 border-dashed border-[var(--gov-navy)] flex items-center justify-center mb-4 relative">
                      <Icon name="QrCode" size={40} className="text-[var(--gov-navy)]" />
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[var(--gov-gold)] -translate-x-1 -translate-y-1"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[var(--gov-gold)] translate-x-1 -translate-y-1"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[var(--gov-gold)] -translate-x-1 translate-y-1"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[var(--gov-gold)] translate-x-1 translate-y-1"></div>
                    </div>
                    <button onClick={startCamera}
                      className="flex items-center gap-2 bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald px-6 py-2 tracking-wide hover:bg-[var(--gov-navy-light)]">
                      <Icon name="Camera" size={16} /> ВКЛЮЧИТЬ КАМЕРУ
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 p-6">
                <div className="text-xs font-oswald tracking-wider text-gray-400 mb-3">ИЛИ ВВЕДИТЕ ВРУЧНУЮ</div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-[var(--gov-navy)] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[var(--gov-gold)] rounded-none"
                    value={scanInput}
                    onChange={(e) => { setScanInput(e.target.value.toUpperCase()); setScanResult(null); setScanError(false); }}
                    placeholder="XX000000000XX"
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  />
                  <button onClick={handleScan}
                    className="bg-[var(--gov-navy)] text-[var(--gov-gold)] px-4 font-oswald hover:bg-[var(--gov-navy-light)] whitespace-nowrap">
                    НАЙТИ
                  </button>
                </div>
                {scanError && <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-golos">Отправление с таким номером не найдено.</div>}
              </div>

              {scanResult && <LetterCard letter={scanResult} onUpdateStatus={handleUpdateStatus} />}

              {letters.length > 0 && (
                <div className="bg-white border border-gray-200 p-5">
                  <div className="text-xs font-oswald tracking-wider text-gray-400 mb-3">ПОСЛЕДНИЕ QR-КОДЫ</div>
                  <div className="flex flex-wrap gap-5">
                    {letters.slice(0, 4).map((l) => (
                      <div key={l.id} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => { setScanInput(l.tracking_number); setScanResult(l); setScanError(false); }}>
                        <QRCodeSVG value={l.tracking_number} size={64} fgColor="#0d1f4e" />
                        <div className="text-xs text-gray-400 mt-1 font-oswald">{l.tracking_number.slice(0, 10)}…</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRACK */}
        {active === "track" && (
          <div className="animate-fade-in">
            <SectionHeader icon="MapPin" title="Отслеживание отправления" subtitle="Введите трек-номер для получения текущего статуса" />
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border border-gray-200 p-6 mb-4">
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-[var(--gov-navy)] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[var(--gov-gold)] rounded-none"
                    value={trackInput}
                    onChange={(e) => { setTrackInput(e.target.value.toUpperCase()); setTrackResult(null); setTrackError(false); }}
                    placeholder="Например: AB123456789CD"
                    onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                  />
                  <button onClick={handleTrack}
                    className="bg-[var(--gov-navy)] text-[var(--gov-gold)] px-5 font-oswald tracking-wide hover:bg-[var(--gov-navy-light)] whitespace-nowrap">
                    НАЙТИ
                  </button>
                </div>
              </div>
              {trackError && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-golos">
                  Отправление <strong>{trackInput}</strong> не найдено.
                </div>
              )}
              {trackResult && <LetterCard letter={trackResult} onUpdateStatus={handleUpdateStatus} showTimeline />}
              {!trackResult && !trackError && letters.length > 0 && (
                <div className="bg-white border border-gray-200 p-4">
                  <div className="text-xs font-oswald tracking-wider text-gray-400 mb-3">ВАШИ ОТПРАВЛЕНИЯ</div>
                  <div className="space-y-2">
                    {letters.map((l) => (
                      <button key={l.id} onClick={() => { setTrackInput(l.tracking_number); setTrackResult(l); }}
                        className="w-full text-left flex items-center justify-between p-3 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                        <div>
                          <div className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide">{l.tracking_number}</div>
                          <div className="text-xs text-gray-400 font-golos">{l.recipient_name} · {l.recipient_city}</div>
                        </div>
                        <StatusBadge status={l.status} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {active === "history" && (
          <div className="animate-fade-in">
            <SectionHeader icon="ClipboardList" title="История отправлений" subtitle={`Зарегистрировано: ${letters.length}`} />
            <div className="mb-3 flex justify-end">
              <button onClick={loadLetters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[var(--gov-navy)] font-golos transition-colors">
                <Icon name="RefreshCw" size={13} /> Обновить
              </button>
            </div>
            {lettersLoading ? (
              <div className="bg-white border border-gray-200 p-12 text-center text-gray-400 font-golos">Загрузка...</div>
            ) : letters.length === 0 ? (
              <div className="bg-white border border-gray-200 p-12 text-center">
                <Icon name="Inbox" size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-golos mb-4">История пуста. Оформите первое письмо.</p>
                <button onClick={() => navigate("compose")}
                  className="bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald px-6 py-2 tracking-wide hover:bg-[var(--gov-navy-light)]">
                  ОФОРМИТЬ ПИСЬМО
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm font-golos min-w-[600px]">
                  <thead className="bg-[var(--gov-navy)] text-white">
                    <tr>
                      <th className="text-left px-4 py-3 font-oswald tracking-wider text-xs">ТРЕК-НОМЕР</th>
                      <th className="text-left px-4 py-3 font-oswald tracking-wider text-xs hidden md:table-cell">ОТПРАВИТЕЛЬ</th>
                      <th className="text-left px-4 py-3 font-oswald tracking-wider text-xs">ПОЛУЧАТЕЛЬ</th>
                      <th className="text-left px-4 py-3 font-oswald tracking-wider text-xs hidden md:table-cell">ДАТА</th>
                      <th className="text-left px-4 py-3 font-oswald tracking-wider text-xs">СТАТУС</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {letters.map((l, i) => (
                      <tr key={l.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/50" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="font-oswald font-bold text-[var(--gov-navy)] text-xs tracking-wide">{l.tracking_number}</div>
                          <div className="text-gray-400 text-xs">{l.letter_type}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="font-semibold text-gray-700">{l.sender_name}</div>
                          <div className="text-gray-400 text-xs">{l.sender_city}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-700">{l.recipient_name}</div>
                          <div className="text-gray-400 text-xs">{l.recipient_city}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{l.created_at}</td>
                        <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button title="Конверт" onClick={() => { setCurrentLetter(l); navigate("envelope"); }}
                              className="text-gray-400 hover:text-[var(--gov-navy)] transition-colors">
                              <Icon name="Printer" size={15} />
                            </button>
                            <button title="Обновить статус" onClick={() => handleUpdateStatus(l.id)}
                              disabled={l.status === "Доставлено"}
                              className="text-gray-400 hover:text-[var(--gov-gold)] transition-colors disabled:opacity-30">
                              <Icon name="RefreshCw" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REPORTS */}
        {active === "reports" && (
          <div className="animate-fade-in">
            <SectionHeader icon="BarChart2" title="Отчёты" subtitle="Статистика по вашим отправлениям" />
            {reportsLoading ? (
              <div className="bg-white border border-gray-200 p-12 text-center text-gray-400 font-golos">Загрузка отчётов...</div>
            ) : !reports ? (
              <div className="bg-white border border-gray-200 p-12 text-center text-gray-400 font-golos">Нет данных</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "ВСЕГО ОТПРАВЛЕНИЙ", value: reports.total, icon: "Package", color: "text-[var(--gov-navy)]" },
                    { label: "ДОСТАВЛЕНО", value: reports.delivered, icon: "CheckCircle", color: "text-green-600" },
                    { label: "В ПУТИ", value: reports.in_transit, icon: "Truck", color: "text-amber-600" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white border border-gray-200 p-6 text-center">
                      <Icon name={s.icon} size={24} className={`${s.color} mx-auto mb-2`} />
                      <div className={`font-oswald text-4xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-gray-400 font-golos tracking-wider mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reports.by_status.length > 0 && (
                    <div className="bg-white border border-gray-200 p-6">
                      <div className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide mb-4">ПО СТАТУСАМ</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={reports.by_status.map((s) => ({ name: s.status, value: s.count }))}
                            dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                            {reports.by_status.map((_, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-3 space-y-1">
                        {reports.by_status.map((s, idx) => (
                          <div key={s.status} className="flex items-center gap-2 text-xs font-golos">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                            <span className="text-gray-600">{s.status}</span>
                            <span className="ml-auto font-bold text-gray-700">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reports.by_type.length > 0 && (
                    <div className="bg-white border border-gray-200 p-6">
                      <div className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide mb-4">ПО ВИДАМ ОТПРАВЛЕНИЙ</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={reports.by_type.map((t) => ({ name: t.type, count: t.count }))} margin={{ left: -20 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="Количество" fill="#0d1f4e" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {reports.by_month.length > 0 && (
                    <div className="bg-white border border-gray-200 p-6 md:col-span-2">
                      <div className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide mb-4">ДИНАМИКА ПО МЕСЯЦАМ</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[...reports.by_month].reverse().map((m) => ({ name: m.month, count: m.count }))} margin={{ left: -20 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="Отправлений" fill="#c9952a" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {reports.by_status.length === 0 && reports.by_type.length === 0 && (
                    <div className="md:col-span-2 bg-white border border-gray-200 p-12 text-center">
                      <Icon name="BarChart2" size={48} className="text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-golos">Оформите первые письма, чтобы появилась статистика.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="no-print mt-12 bg-[var(--gov-navy)] text-white py-6 border-t-4 border-[var(--gov-gold)]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-400 font-golos">
          <div className="font-oswald text-[var(--gov-gold)] tracking-widest">ГОСПОЧТА</div>
          <div>© {new Date().getFullYear()} Государственная почтовая служба. Все права защищены.</div>
          <div className="flex gap-4"><span>8-800-000-00-00</span><span>info@gospochta.ru</span></div>
        </div>
      </footer>
    </div>
  );
}

function AuthField({ label, value, type = "text", onChange, placeholder, onEnter }: {
  label: string; value: string; type?: string;
  onChange: (v: string) => void; placeholder?: string; onEnter?: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold font-oswald tracking-widest text-[#0d1f4e] uppercase mb-1">{label}</label>
      <input type={type}
        className="w-full border border-[#0d1f4e] bg-white px-3 py-2.5 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[#c9952a] rounded-none"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold font-oswald tracking-widest text-[#0d1f4e] uppercase mb-1">{label}</label>
      <input className="w-full border border-[#0d1f4e] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[#c9952a] rounded-none"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="w-12 h-12 bg-[var(--gov-navy)] flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={22} className="text-[var(--gov-gold)]" />
      </div>
      <div>
        <h2 className="font-oswald font-bold text-2xl text-[var(--gov-navy)] tracking-wide">{title}</h2>
        <p className="text-gray-500 font-golos text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-1 border font-golos font-semibold whitespace-nowrap ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function LetterCard({ letter, onUpdateStatus, showTimeline }: { letter: LetterData; onUpdateStatus: (id: string) => void; showTimeline?: boolean }) {
  const statusIdx = STATUSES.indexOf(letter.status);
  return (
    <div className="border border-gray-200 bg-white">
      <div className="bg-[var(--gov-navy)] px-4 py-3 flex items-center justify-between">
        <div className="font-oswald font-bold text-white tracking-widest text-sm">{letter.tracking_number}</div>
        <StatusBadge status={letter.status} />
      </div>
      <div className="p-4 grid grid-cols-2 gap-4 text-sm font-golos border-b border-gray-100">
        <div>
          <div className="text-xs text-gray-400 tracking-wider mb-1 font-oswald">ОТПРАВИТЕЛЬ</div>
          <div className="font-semibold text-gray-700">{letter.sender_name}</div>
          <div className="text-gray-500 text-xs">{letter.sender_address}</div>
          <div className="text-gray-500 text-xs">{letter.sender_city} {letter.sender_zip}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 tracking-wider mb-1 font-oswald">ПОЛУЧАТЕЛЬ</div>
          <div className="font-semibold text-gray-700">{letter.recipient_name}</div>
          <div className="text-gray-500 text-xs">{letter.recipient_address}</div>
          <div className="text-gray-500 text-xs">{letter.recipient_city} {letter.recipient_zip}</div>
        </div>
      </div>
      {showTimeline && (
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="text-xs text-gray-400 tracking-wider mb-3 font-oswald">ИСТОРИЯ ДВИЖЕНИЯ</div>
          <div className="space-y-3">
            {STATUSES.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 text-sm font-golos ${i <= statusIdx ? "text-gray-800" : "text-gray-300"}`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i < statusIdx ? "bg-green-500" : i === statusIdx ? "bg-[var(--gov-gold)]" : "bg-gray-200"}`}></div>
                <span>{s}</span>
                {i === statusIdx && <span className="text-xs text-[var(--gov-gold)] font-semibold">← текущий</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-gray-400 font-golos">{letter.letter_type} · {letter.weight} · {letter.created_at}</div>
        <button onClick={() => onUpdateStatus(letter.id)} disabled={letter.status === "Доставлено"}
          className="flex items-center gap-1 text-xs text-[var(--gov-navy)] border border-[var(--gov-navy)] px-3 py-1 font-oswald hover:bg-[var(--gov-navy)] hover:text-[var(--gov-gold)] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          <Icon name="RefreshCw" size={12} /> ОБНОВИТЬ СТАТУС
        </button>
      </div>
    </div>
  );
}