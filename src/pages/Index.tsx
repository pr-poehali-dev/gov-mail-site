import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import Icon from "@/components/ui/icon";

type Section = "home" | "compose" | "envelope" | "scan" | "track" | "history";
type AuthScreen = "login" | "register";

interface LetterData {
  id: string;
  trackingNumber: string;
  sender: { name: string; address: string; city: string; zip: string };
  recipient: { name: string; address: string; city: string; zip: string };
  type: string;
  weight: string;
  createdAt: string;
  status: string;
}

interface UserAccount {
  name: string;
  login: string;
  password: string;
}

const STATUSES = [
  "Принято в отделении",
  "В пути к получателю",
  "Прибыло в город назначения",
  "Ожидает получателя",
  "Доставлено",
];

function generateTrackingNumber(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const prefix =
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)];
  const nums = Math.floor(100000000 + Math.random() * 900000000).toString();
  const suffix =
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)];
  return `${prefix}${nums}${suffix}`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "compose", label: "Оформить письмо", icon: "FileText" },
  { id: "envelope", label: "Печать конверта", icon: "Printer" },
  { id: "scan", label: "Сканирование QR", icon: "QrCode" },
  { id: "track", label: "Отслеживание", icon: "MapPin" },
  { id: "history", label: "История", icon: "ClipboardList" },
];

export default function Index() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [authError, setAuthError] = useState("");

  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", login: "", password: "", confirm: "" });

  // App state
  const [active, setActive] = useState<Section>("home");
  const [letters, setLetters] = useState<LetterData[]>([]);
  const [currentLetter, setCurrentLetter] = useState<LetterData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [form, setForm] = useState({
    senderName: "", senderAddress: "", senderCity: "", senderZip: "",
    recipientName: "", recipientAddress: "", recipientCity: "", recipientZip: "",
    type: "Заказное", weight: "до 20г",
  });

  const [scanResult, setScanResult] = useState<LetterData | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [trackInput, setTrackInput] = useState("");
  const [trackResult, setTrackResult] = useState<LetterData | null>(null);
  const [trackError, setTrackError] = useState(false);
  const [scanError, setScanError] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Auth handlers
  function handleLogin() {
    setAuthError("");
    if (!loginForm.login || !loginForm.password) {
      setAuthError("Заполните все поля");
      return;
    }
    const user = accounts.find(
      (a) => a.login === loginForm.login && a.password === loginForm.password
    );
    if (!user) {
      setAuthError("Неверный логин или пароль");
      return;
    }
    setCurrentUser(user);
  }

  function handleRegister() {
    setAuthError("");
    if (!regForm.name || !regForm.login || !regForm.password || !regForm.confirm) {
      setAuthError("Заполните все поля");
      return;
    }
    if (regForm.password !== regForm.confirm) {
      setAuthError("Пароли не совпадают");
      return;
    }
    if (regForm.password.length < 4) {
      setAuthError("Пароль должен содержать не менее 4 символов");
      return;
    }
    if (accounts.find((a) => a.login === regForm.login)) {
      setAuthError("Пользователь с таким логином уже существует");
      return;
    }
    const newUser: UserAccount = {
      name: regForm.name,
      login: regForm.login,
      password: regForm.password,
    };
    setAccounts((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
  }

  function handleLogout() {
    setCurrentUser(null);
    setActive("home");
    setMobileMenuOpen(false);
    setLoginForm({ login: "", password: "" });
    setAuthError("");
  }

  // App handlers
  function navigate(s: Section) {
    setActive(s);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFormChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleRegisterLetter() {
    if (!form.senderName || !form.recipientName || !form.senderAddress || !form.recipientAddress) return;
    const letter: LetterData = {
      id: generateId(),
      trackingNumber: generateTrackingNumber(),
      sender: { name: form.senderName, address: form.senderAddress, city: form.senderCity, zip: form.senderZip },
      recipient: { name: form.recipientName, address: form.recipientAddress, city: form.recipientCity, zip: form.recipientZip },
      type: form.type,
      weight: form.weight,
      createdAt: formatDate(new Date()),
      status: "Принято в отделении",
    };
    setLetters((prev) => [letter, ...prev]);
    setCurrentLetter(letter);
    navigate("envelope");
  }

  function handleScan() {
    setScanError(false);
    const found = letters.find((l) => l.trackingNumber === scanInput.trim().toUpperCase());
    if (found) { setScanResult(found); setScanError(false); }
    else { setScanResult(null); setScanError(true); }
  }

  function handleTrack() {
    setTrackError(false);
    const found = letters.find((l) => l.trackingNumber === trackInput.trim().toUpperCase());
    if (found) { setTrackResult(found); setTrackError(false); }
    else { setTrackResult(null); setTrackError(true); }
  }

  function handleUpdateStatus(id: string) {
    setLetters((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const idx = STATUSES.indexOf(l.status);
        return { ...l, status: idx < STATUSES.length - 1 ? STATUSES[idx + 1] : l.status };
      })
    );
    const advance = (prev: LetterData | null) => {
      if (!prev || prev.id !== id) return prev;
      const idx = STATUSES.indexOf(prev.status);
      return { ...prev, status: idx < STATUSES.length - 1 ? STATUSES[idx + 1] : prev.status };
    };
    setTrackResult(advance);
    setScanResult(advance);
  }

  // AUTH SCREEN
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
          <div className="w-full max-w-md">
            <div className="bg-white border border-gray-200 shadow-sm">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => { setAuthScreen("login"); setAuthError(""); }}
                  className={`flex-1 py-3 font-oswald tracking-wider text-sm transition-colors ${
                    authScreen === "login"
                      ? "bg-[var(--gov-navy)] text-[var(--gov-gold)]"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  ВХОД
                </button>
                <button
                  onClick={() => { setAuthScreen("register"); setAuthError(""); }}
                  className={`flex-1 py-3 font-oswald tracking-wider text-sm transition-colors ${
                    authScreen === "register"
                      ? "bg-[var(--gov-navy)] text-[var(--gov-gold)]"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  РЕГИСТРАЦИЯ
                </button>
              </div>

              <div className="p-8">
                <div className="flex justify-center mb-6">
                  <div className="w-14 h-14 bg-[var(--gov-navy)] flex items-center justify-center">
                    <Icon name={authScreen === "login" ? "LogIn" : "UserPlus"} size={26} className="text-[var(--gov-gold)]" />
                  </div>
                </div>

                {authScreen === "login" ? (
                  <div className="space-y-4">
                    <AuthField
                      label="Логин"
                      value={loginForm.login}
                      onChange={(v) => { setLoginForm((f) => ({ ...f, login: v })); setAuthError(""); }}
                      placeholder="Введите логин"
                    />
                    <AuthField
                      label="Пароль"
                      value={loginForm.password}
                      type="password"
                      onChange={(v) => { setLoginForm((f) => ({ ...f, password: v })); setAuthError(""); }}
                      placeholder="Введите пароль"
                      onEnter={handleLogin}
                    />
                    {authError && <AuthError text={authError} />}
                    <button
                      onClick={handleLogin}
                      className="w-full bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald font-bold py-3 tracking-widest text-sm hover:bg-[var(--gov-navy-light)] transition-colors mt-2"
                    >
                      ВОЙТИ В СИСТЕМУ
                    </button>
                    <p className="text-center text-xs text-gray-400 font-golos">
                      Нет аккаунта?{" "}
                      <button onClick={() => { setAuthScreen("register"); setAuthError(""); }} className="text-[var(--gov-navy)] underline">
                        Зарегистрируйтесь
                      </button>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AuthField
                      label="ФИО"
                      value={regForm.name}
                      onChange={(v) => { setRegForm((f) => ({ ...f, name: v })); setAuthError(""); }}
                      placeholder="Иванов Иван Иванович"
                    />
                    <AuthField
                      label="Логин"
                      value={regForm.login}
                      onChange={(v) => { setRegForm((f) => ({ ...f, login: v })); setAuthError(""); }}
                      placeholder="Придумайте логин"
                    />
                    <AuthField
                      label="Пароль"
                      value={regForm.password}
                      type="password"
                      onChange={(v) => { setRegForm((f) => ({ ...f, password: v })); setAuthError(""); }}
                      placeholder="Не менее 4 символов"
                    />
                    <AuthField
                      label="Подтверждение пароля"
                      value={regForm.confirm}
                      type="password"
                      onChange={(v) => { setRegForm((f) => ({ ...f, confirm: v })); setAuthError(""); }}
                      placeholder="Повторите пароль"
                      onEnter={handleRegister}
                    />
                    {authError && <AuthError text={authError} />}
                    <button
                      onClick={handleRegister}
                      className="w-full bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald font-bold py-3 tracking-widest text-sm hover:bg-[var(--gov-navy-light)] transition-colors mt-2"
                    >
                      СОЗДАТЬ АККАУНТ
                    </button>
                    <p className="text-center text-xs text-gray-400 font-golos">
                      Уже есть аккаунт?{" "}
                      <button onClick={() => { setAuthScreen("login"); setAuthError(""); }} className="text-[var(--gov-navy)] underline">
                        Войти
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 font-golos mt-4">
              Государственная почтовая служба · Защищённый доступ
            </p>
          </div>
        </div>

        <footer className="bg-[var(--gov-navy)] border-t-4 border-[var(--gov-gold)] py-4 px-6 text-center text-xs text-gray-400 font-golos">
          © {new Date().getFullYear()} Государственная почтовая служба. Все права защищены.
        </footer>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-[#f0eee8] font-golos">
      {/* Header */}
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
                <span>{currentUser.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 border border-white/30 text-white text-xs font-oswald px-3 py-1.5 hover:bg-white/10 transition-colors tracking-wide"
              >
                <Icon name="LogOut" size={13} />
                <span className="hidden md:inline">ВЫЙТИ</span>
              </button>
              <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Icon name="Menu" size={24} />
              </button>
            </div>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="max-w-7xl mx-auto px-4 hidden md:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-oswald tracking-wide transition-all border-b-2 ${
                active === item.id
                  ? "border-[var(--gov-gold)] text-[var(--gov-gold)]"
                  : "border-transparent text-gray-300 hover:text-white hover:border-white/40"
              }`}
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </button>
          ))}
        </nav>
        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/20">
            <div className="px-5 py-3 border-b border-white/10 text-xs text-gray-400 font-golos flex items-center gap-2">
              <Icon name="User" size={13} className="text-[var(--gov-gold)]" />
              {currentUser.name}
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex items-center gap-3 w-full px-5 py-3 text-sm font-oswald tracking-wide ${
                  active === item.id ? "text-[var(--gov-gold)] bg-white/10" : "text-gray-300"
                }`}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
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
                  ДОБРО ПОЖАЛОВАТЬ, {currentUser.name.split(" ")[0].toUpperCase()}
                </div>
                <h1 className="font-oswald text-3xl md:text-4xl font-bold tracking-wide mb-4 leading-tight">
                  ГОСУДАРСТВЕННАЯ<br />ПОЧТОВАЯ СЛУЖБА
                </h1>
                <p className="text-gray-300 font-golos text-base mb-8 max-w-lg">
                  Оформляйте письма, печатайте конверты с QR-кодами и отслеживайте доставку в едином личном кабинете.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate("compose")}
                    className="bg-[var(--gov-gold)] text-[var(--gov-navy)] font-oswald font-bold px-6 py-3 tracking-wide hover:brightness-110 transition-all"
                  >
                    ОФОРМИТЬ ПИСЬМО
                  </button>
                  <button
                    onClick={() => navigate("track")}
                    className="border border-white text-white font-oswald px-6 py-3 tracking-wide hover:bg-white hover:text-[var(--gov-navy)] transition-colors"
                  >
                    ОТСЛЕДИТЬ ОТПРАВЛЕНИЕ
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
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

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {navItems.slice(1).map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className="bg-white border border-gray-200 p-4 text-left hover:border-[var(--gov-navy)] hover:shadow-sm transition-all group"
                >
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
                  <h3 className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide">ПАРАМЕТРЫ ОТПРАВЛЕНИЯ</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold font-oswald tracking-widest text-[var(--gov-navy)] uppercase mb-1">Вид отправления</label>
                    <select value={form.type} onChange={(e) => handleFormChange("type", e.target.value)} className="w-full border border-[var(--gov-navy)] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[var(--gov-gold)] rounded-none">
                      <option>Заказное</option>
                      <option>Ценное</option>
                      <option>Простое</option>
                      <option>С уведомлением</option>
                      <option>EMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold font-oswald tracking-widest text-[var(--gov-navy)] uppercase mb-1">Вес</label>
                    <select value={form.weight} onChange={(e) => handleFormChange("weight", e.target.value)} className="w-full border border-[var(--gov-navy)] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[var(--gov-gold)] rounded-none">
                      <option>до 20г</option>
                      <option>до 50г</option>
                      <option>до 100г</option>
                      <option>до 250г</option>
                      <option>до 500г</option>
                      <option>до 1кг</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleRegisterLetter}
                  disabled={!form.senderName || !form.recipientName || !form.senderAddress || !form.recipientAddress}
                  className="mt-6 w-full bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald font-bold py-3 tracking-widest text-sm hover:bg-[var(--gov-navy-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
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
                <button onClick={() => navigate("compose")} className="bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald px-6 py-2 tracking-wide hover:bg-[var(--gov-navy-light)]">
                  ОФОРМИТЬ ПИСЬМО
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 no-print flex flex-wrap gap-3">
                  <button onClick={() => window.print()} className="flex items-center gap-2 bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald px-5 py-2 tracking-wide hover:bg-[var(--gov-navy-light)] transition-colors">
                    <Icon name="Printer" size={16} />
                    ПЕЧАТЬ КОНВЕРТА
                  </button>
                  <button onClick={() => navigate("track")} className="flex items-center gap-2 border border-[var(--gov-navy)] text-[var(--gov-navy)] font-oswald px-5 py-2 tracking-wide hover:bg-gray-50">
                    <Icon name="MapPin" size={16} />
                    ОТСЛЕДИТЬ
                  </button>
                  <button onClick={() => navigate("compose")} className="flex items-center gap-2 border border-gray-300 text-gray-600 font-oswald px-5 py-2 tracking-wide hover:bg-gray-50">
                    <Icon name="Plus" size={16} />
                    НОВОЕ ПИСЬМО
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
                      <div className="font-golos text-sm font-semibold text-[var(--gov-navy)]">{currentLetter.sender.name}</div>
                      <div className="font-golos text-sm text-gray-600">{currentLetter.sender.address}</div>
                      <div className="font-golos text-sm text-gray-600">{currentLetter.sender.city} {currentLetter.sender.zip}</div>
                    </div>
                    <div className="flex-1 border-l-2 border-[var(--gov-gold)] pl-6">
                      <div className="text-xs text-gray-400 font-golos tracking-widest mb-2">ПОЛУЧАТЕЛЬ</div>
                      <div className="font-golos text-base font-bold text-[var(--gov-navy)]">{currentLetter.recipient.name}</div>
                      <div className="font-golos text-sm text-gray-600">{currentLetter.recipient.address}</div>
                      <div className="font-golos text-base font-semibold text-[var(--gov-navy)]">{currentLetter.recipient.city} {currentLetter.recipient.zip}</div>
                    </div>
                  </div>
                  <div className="border-t-2 border-[var(--gov-navy)] pt-4 flex items-center justify-between bg-gray-50 px-4 py-3">
                    <div>
                      <div className="text-xs text-gray-400 font-golos tracking-widest mb-1">ТРЕК-НОМЕР</div>
                      <div className="font-oswald font-bold text-xl text-[var(--gov-navy)] tracking-widest">{currentLetter.trackingNumber}</div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 font-golos">
                        <span>Вид: {currentLetter.type}</span>
                        <span>Вес: {currentLetter.weight}</span>
                        <span>Дата: {currentLetter.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <QRCodeSVG value={currentLetter.trackingNumber} size={80} bgColor="#ffffff" fgColor="#0d1f4e" level="H" />
                      <div className="text-xs text-gray-400 mt-1 font-golos">Сканируйте</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-white border-l-4 border-[var(--gov-gold)] no-print">
                  <div className="flex items-center gap-2 text-sm font-golos text-green-700">
                    <Icon name="CheckCircle" size={16} />
                    Письмо зарегистрировано. Трек-номер: <strong>{currentLetter.trackingNumber}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SCAN */}
        {active === "scan" && (
          <div className="animate-fade-in">
            <SectionHeader icon="QrCode" title="Сканирование QR-кода" subtitle="Введите трек-номер с конверта для получения данных" />
            <div className="max-w-xl mx-auto">
              <div className="bg-white border border-gray-200 p-8">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-28 h-28 border-4 border-dashed border-[var(--gov-navy)] flex items-center justify-center mb-4 relative">
                    <Icon name="QrCode" size={48} className="text-[var(--gov-navy)]" />
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[var(--gov-gold)] -translate-x-1 -translate-y-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[var(--gov-gold)] translate-x-1 -translate-y-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[var(--gov-gold)] -translate-x-1 translate-y-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[var(--gov-gold)] translate-x-1 translate-y-1"></div>
                  </div>
                  <p className="text-gray-500 text-sm font-golos text-center">Введите трек-номер с конверта</p>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold font-oswald tracking-widest text-[var(--gov-navy)] uppercase mb-1">Трек-номер</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-[var(--gov-navy)] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[var(--gov-gold)] rounded-none"
                      value={scanInput}
                      onChange={(e) => { setScanInput(e.target.value.toUpperCase()); setScanResult(null); setScanError(false); }}
                      placeholder="XX000000000XX"
                      onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    />
                    <button onClick={handleScan} className="bg-[var(--gov-navy)] text-[var(--gov-gold)] px-4 font-oswald hover:bg-[var(--gov-navy-light)] whitespace-nowrap">
                      НАЙТИ
                    </button>
                  </div>
                </div>
                {scanError && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-golos">Отправление с таким номером не найдено в системе.</div>}
                {scanResult && <LetterCard letter={scanResult} onUpdateStatus={handleUpdateStatus} />}
              </div>

              {letters.length > 0 && (
                <div className="mt-4 bg-white border border-gray-200 p-5">
                  <div className="text-xs font-oswald tracking-wider text-gray-400 mb-3">ПОСЛЕДНИЕ QR-КОДЫ</div>
                  <div className="flex flex-wrap gap-5">
                    {letters.slice(0, 4).map((l) => (
                      <div key={l.id} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setScanInput(l.trackingNumber); setScanResult(l); setScanError(false); }}>
                        <QRCodeSVG value={l.trackingNumber} size={64} fgColor="#0d1f4e" />
                        <div className="text-xs text-gray-400 mt-1 font-oswald">{l.trackingNumber.slice(0, 10)}…</div>
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
                <label className="block text-xs font-semibold font-oswald tracking-widest text-[var(--gov-navy)] uppercase mb-1">Трек-номер отправления</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-[var(--gov-navy)] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[var(--gov-gold)] rounded-none"
                    value={trackInput}
                    onChange={(e) => { setTrackInput(e.target.value.toUpperCase()); setTrackResult(null); setTrackError(false); }}
                    placeholder="Например: AB123456789CD"
                    onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                  />
                  <button onClick={handleTrack} className="bg-[var(--gov-navy)] text-[var(--gov-gold)] px-5 font-oswald tracking-wide hover:bg-[var(--gov-navy-light)] whitespace-nowrap">
                    НАЙТИ
                  </button>
                </div>
              </div>
              {trackError && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-golos">
                  Отправление <strong>{trackInput}</strong> не найдено. Проверьте номер и попробуйте снова.
                </div>
              )}
              {trackResult && (
                <div className="animate-slide-up">
                  <LetterCard letter={trackResult} onUpdateStatus={handleUpdateStatus} showTimeline />
                </div>
              )}
              {!trackResult && !trackError && letters.length > 0 && (
                <div className="bg-white border border-gray-200 p-4">
                  <div className="text-xs font-oswald tracking-wider text-gray-400 mb-3">ВАШИ ОТПРАВЛЕНИЯ</div>
                  <div className="space-y-2">
                    {letters.map((l) => (
                      <button key={l.id} onClick={() => { setTrackInput(l.trackingNumber); setTrackResult(l); }} className="w-full text-left flex items-center justify-between p-3 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                        <div>
                          <div className="font-oswald font-bold text-[var(--gov-navy)] tracking-wide">{l.trackingNumber}</div>
                          <div className="text-xs text-gray-400 font-golos">{l.recipient.name} · {l.recipient.city}</div>
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
            {letters.length === 0 ? (
              <div className="bg-white border border-gray-200 p-12 text-center">
                <Icon name="Inbox" size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-golos mb-4">История пуста. Оформите первое письмо.</p>
                <button onClick={() => navigate("compose")} className="bg-[var(--gov-navy)] text-[var(--gov-gold)] font-oswald px-6 py-2 tracking-wide hover:bg-[var(--gov-navy-light)]">
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
                          <div className="font-oswald font-bold text-[var(--gov-navy)] text-xs tracking-wide">{l.trackingNumber}</div>
                          <div className="text-gray-400 text-xs">{l.type}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="font-semibold text-gray-700">{l.sender.name}</div>
                          <div className="text-gray-400 text-xs">{l.sender.city}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-700">{l.recipient.name}</div>
                          <div className="text-gray-400 text-xs">{l.recipient.city}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{l.createdAt}</td>
                        <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button title="Показать конверт" onClick={() => { setCurrentLetter(l); navigate("envelope"); }} className="text-gray-400 hover:text-[var(--gov-navy)] transition-colors">
                              <Icon name="Printer" size={15} />
                            </button>
                            <button title="Обновить статус" onClick={() => handleUpdateStatus(l.id)} disabled={l.status === "Доставлено"} className="text-gray-400 hover:text-[var(--gov-gold)] transition-colors disabled:opacity-30">
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
      </main>

      <footer className="no-print mt-12 bg-[var(--gov-navy)] text-white py-6 border-t-4 border-[var(--gov-gold)]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-400 font-golos">
          <div className="font-oswald text-[var(--gov-gold)] tracking-widest">ГОСПОЧТА</div>
          <div>© {new Date().getFullYear()} Государственная почтовая служба. Все права защищены.</div>
          <div className="flex gap-4">
            <span>8-800-000-00-00</span>
            <span>info@gospochta.ru</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Компоненты

function AuthField({
  label, value, type = "text", onChange, placeholder, onEnter,
}: {
  label: string; value: string; type?: string;
  onChange: (v: string) => void; placeholder?: string; onEnter?: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold font-oswald tracking-widest text-[#0d1f4e] uppercase mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-[#0d1f4e] bg-white px-3 py-2.5 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[#c9952a] rounded-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      />
    </div>
  );
}

function AuthError({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-golos">
      <Icon name="AlertCircle" size={15} />
      {text}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold font-oswald tracking-widest text-[#0d1f4e] uppercase mb-1">{label}</label>
      <input
        className="w-full border border-[#0d1f4e] bg-white px-3 py-2 text-sm font-golos focus:outline-none focus:ring-2 focus:ring-[#c9952a] rounded-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
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

const STATUS_COLORS: Record<string, string> = {
  "Принято в отделении": "bg-blue-50 text-blue-700 border-blue-200",
  "В пути к получателю": "bg-amber-50 text-amber-700 border-amber-200",
  "Прибыло в город назначения": "bg-orange-50 text-orange-700 border-orange-200",
  "Ожидает получателя": "bg-purple-50 text-purple-700 border-purple-200",
  Доставлено: "bg-green-50 text-green-700 border-green-200",
};

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
    <div className="mt-4 border border-gray-200 bg-white">
      <div className="bg-[var(--gov-navy)] px-4 py-3 flex items-center justify-between">
        <div className="font-oswald font-bold text-white tracking-widest text-sm">{letter.trackingNumber}</div>
        <StatusBadge status={letter.status} />
      </div>
      <div className="p-4 grid grid-cols-2 gap-4 text-sm font-golos border-b border-gray-100">
        <div>
          <div className="text-xs text-gray-400 tracking-wider mb-1 font-oswald">ОТПРАВИТЕЛЬ</div>
          <div className="font-semibold text-gray-700">{letter.sender.name}</div>
          <div className="text-gray-500 text-xs">{letter.sender.address}</div>
          <div className="text-gray-500 text-xs">{letter.sender.city} {letter.sender.zip}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 tracking-wider mb-1 font-oswald">ПОЛУЧАТЕЛЬ</div>
          <div className="font-semibold text-gray-700">{letter.recipient.name}</div>
          <div className="text-gray-500 text-xs">{letter.recipient.address}</div>
          <div className="text-gray-500 text-xs">{letter.recipient.city} {letter.recipient.zip}</div>
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
        <div className="text-xs text-gray-400 font-golos">{letter.type} · {letter.weight} · {letter.createdAt}</div>
        <button
          onClick={() => onUpdateStatus(letter.id)}
          disabled={letter.status === "Доставлено"}
          className="flex items-center gap-1 text-xs text-[var(--gov-navy)] border border-[var(--gov-navy)] px-3 py-1 font-oswald hover:bg-[var(--gov-navy)] hover:text-[var(--gov-gold)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon name="RefreshCw" size={12} />
          ОБНОВИТЬ СТАТУС
        </button>
      </div>
    </div>
  );
}
