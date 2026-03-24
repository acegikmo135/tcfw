import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'gu';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // General
    "app.title": "The Courtyard F wing",
    "app.subtitle": "Transparent Fund Management",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "search": "Search...",
    "all": "All",
    "income": "Income",
    "expense": "Expense",
    
    // Login
    "login.flatNo": "Flat Number",
    "login.password": "Password",
    "login.enter": "Enter Dashboard",
    "login.authorized": "Authorized Access Only",
    "login.setup": "First time? Click here to setup database",
    "login.invalid": "Invalid Flat Number or Password.",
    "login.flatNoPlaceholder": "e.g. F601",
    "login.passwordPlaceholder": "••••••••",
    
    // Dashboard
    "dash.totalBalance": "Total Balance",
    "dash.recent": "Recent Transactions",
    "dash.add": "Add Transaction",
    "dash.export": "Export PDF",
    "dash.adminPanel": "Admin Panel",
    "dash.search": "Search transactions...",
    "dash.noTransactions": "No transactions found.",
    "dash.health": "Financial Health",
    "dash.healthGood": "The building fund is healthy. We have a positive surplus for future maintenance.",
    "dash.healthBad": "The building fund is currently in deficit. Please ensure all dues are cleared.",
    "dash.notify": "Notify",
    
    // Transaction Modal
    "tx.new": "New Transaction",
    "tx.type": "Type",
    "tx.amount": "Amount",
    "tx.category": "Category",
    "tx.description": "Description",
    "tx.descPlaceholder": "Brief details...",
    "tx.save": "Save Entry",
    "tx.error": "Failed to add transaction. Check permissions.",
    
    // Admin Panel
    "admin.access": "Admin Access",
    "admin.subtitle": "Enter the master password to manage users.",
    "admin.masterPass": "Master Password",
    "admin.authorize": "Authorize",
    "admin.back": "Back to Dashboard",
    "admin.title": "User Management",
    "admin.flats": "Flats & Residents",
    "admin.manage": "Manage access and roles for all building units.",
    "admin.addFlat": "Add Flat",
    "admin.accessPass": "Access Password",
    "admin.demote": "Demote to Resident",
    "admin.promote": "Promote to Admin",
    "admin.addNew": "Add New Flat",
    "admin.initialRole": "Initial Role",
    "admin.resident": "Resident",
    "admin.admin": "Admin",
    "admin.saveFlat": "Save Flat",
    "admin.errorAuth": "Incorrect Admin Access Password.",
    "admin.errorAdd": "Failed to add flat. Check permissions.",
    "admin.errorRequired": "Flat number and password are required.",
    "admin.deleteConfirm": "Are you sure you want to delete flat {id}?",
    "admin.flatNoPlaceholder": "e.g. F601",
    "admin.passwordPlaceholder": "Set access password",
    
    // PDF Export
    "pdf.generate": "Generate Report",
    "pdf.title": "The Courtyard F wing - Fund Report",
    "pdf.monthly": "Monthly",
    "pdf.yearly": "Yearly",
    "pdf.year": "Year",
    "pdf.month": "Month",
    "pdf.download": "Download",
    "pdf.generatedOn": "Generated on",
    "pdf.totalIncome": "Total Income",
    "pdf.totalExpense": "Total Expense",
    "pdf.netBalance": "Net Balance",
    "pdf.date": "Date",
    "pdf.type": "Type",
    "pdf.category": "Category",
    "pdf.desc": "Description",
    "pdf.amount": "Amount",
    "pdf.by": "By",
    "pdf.pending": "Pending",
    
    // Initialization
    "init.success": "Database initialized successfully! You can now login.",
    "init.fail": "Initialization failed:",
    
    // Delete Modal
    "del.title": "Delete Entry?",
    "del.desc": "This action cannot be undone. Are you sure you want to remove this transaction?",
    "del.confirm": "Delete",
    
    // Chart
    "chart.overview": "Financial Overview",
    "chart.pie": "Category View",
    "chart.line": "Trend View",
    "chart.noData": "No data available for this period.",
    
    // PWA
    "pwa.install": "Install App"
  },
  gu: {
    // General
    "app.title": "ધ કોર્ટયાર્ડ F વિંગ",
    "app.subtitle": "પારદર્શક ફંડ મેનેજમેન્ટ",
    "cancel": "રદ કરો",
    "save": "સાચવો",
    "delete": "કાઢી નાખો",
    "search": "શોધો...",
    "all": "બધા",
    "income": "આવક",
    "expense": "ખર્ચ",
    
    // Login
    "login.flatNo": "ફ્લેટ નંબર",
    "login.password": "પાસવર્ડ",
    "login.enter": "ડેશબોર્ડમાં પ્રવેશ કરો",
    "login.authorized": "ફક્ત અધિકૃત પ્રવેશ",
    "login.setup": "પ્રથમ વખત? ડેટાબેઝ સેટ કરવા માટે અહીં ક્લિક કરો",
    "login.invalid": "અમાન્ય ફ્લેટ નંબર અથવા પાસવર્ડ.",
    "login.flatNoPlaceholder": "દા.ત. F601",
    "login.passwordPlaceholder": "••••••••",
    
    // Dashboard
    "dash.totalBalance": "કુલ બેલેન્સ",
    "dash.recent": "તાજેતરના વ્યવહારો",
    "dash.add": "વ્યવહાર ઉમેરો",
    "dash.export": "PDF ડાઉનલોડ કરો",
    "dash.adminPanel": "એડમિન પેનલ",
    "dash.search": "વ્યવહારો શોધો...",
    "dash.noTransactions": "કોઈ વ્યવહાર મળ્યો નથી.",
    "dash.health": "નાણાકીય આરોગ્ય",
    "dash.healthGood": "બિલ્ડિંગ ફંડ સ્વસ્થ છે. ભવિષ્યની જાળવણી માટે આપણી પાસે સકારાત્મક સરપ્લસ છે.",
    "dash.healthBad": "બિલ્ડિંગ ફંડ હાલમાં ખાધમાં છે. કૃપા કરીને ખાતરી કરો કે તમામ બાકી રકમ ચૂકવવામાં આવી છે.",
    "dash.notify": "સૂચના",
    
    // Transaction Modal
    "tx.new": "નવો વ્યવહાર",
    "tx.type": "પ્રકાર",
    "tx.amount": "રકમ",
    "tx.category": "શ્રેણી",
    "tx.description": "વર્ણન",
    "tx.descPlaceholder": "ટૂંકી વિગતો...",
    "tx.save": "વ્યવહાર સાચવો",
    "tx.error": "વ્યવહાર ઉમેરવામાં નિષ્ફળ. પરવાનગીઓ તપાસો.",
    
    // Admin Panel
    "admin.access": "એડમિન પ્રવેશ",
    "admin.subtitle": "વપરાશકર્તાઓનું સંચાલન કરવા માટે માસ્ટર પાસવર્ડ દાખલ કરો.",
    "admin.masterPass": "માસ્ટર પાસવર્ડ",
    "admin.authorize": "અધિકૃત કરો",
    "admin.back": "ડેશબોર્ડ પર પાછા જાઓ",
    "admin.title": "વપરાશકર્તા સંચાલન",
    "admin.flats": "ફ્લેટ્સ અને રહેવાસીઓ",
    "admin.manage": "બધા બિલ્ડિંગ યુનિટ્સ માટે ઍક્સેસ અને ભૂમિકાઓનું સંચાલન કરો.",
    "admin.addFlat": "ફ્લેટ ઉમેરો",
    "admin.accessPass": "ઍક્સેસ પાસવર્ડ",
    "admin.demote": "રહેવાસી બનાવો",
    "admin.promote": "એડમિન બનાવો",
    "admin.addNew": "નવો ફ્લેટ ઉમેરો",
    "admin.initialRole": "પ્રારંભિક ભૂમિકા",
    "admin.resident": "રહેવાસી",
    "admin.admin": "એડમિન",
    "admin.saveFlat": "ફ્લેટ સાચવો",
    "admin.errorAuth": "ખોટો એડમિન ઍક્સેસ પાસવર્ડ.",
    "admin.errorAdd": "ફ્લેટ ઉમેરવામાં નિષ્ફળ. પરવાનગીઓ તપાસો.",
    "admin.errorRequired": "ફ્લેટ નંબર અને પાસવર્ડ જરૂરી છે.",
    "admin.deleteConfirm": "શું તમે ખરેખર ફ્લેટ {id} કાઢી નાખવા માંગો છો?",
    "admin.flatNoPlaceholder": "દા.ત. F601",
    "admin.passwordPlaceholder": "ઍક્સેસ પાસવર્ડ સેટ કરો",
    
    // PDF Export
    "pdf.generate": "રિપોર્ટ બનાવો",
    "pdf.title": "ધ કોર્ટયાર્ડ F વિંગ - ફંડ રિપોર્ટ",
    "pdf.monthly": "માસિક",
    "pdf.yearly": "વાર્ષિક",
    "pdf.year": "વર્ષ",
    "pdf.month": "મહિનો",
    "pdf.download": "ડાઉનલોડ કરો",
    "pdf.generatedOn": "બનાવેલ તારીખ",
    "pdf.totalIncome": "કુલ આવક",
    "pdf.totalExpense": "કુલ ખર્ચ",
    "pdf.netBalance": "ચોખ્ખું બેલેન્સ",
    "pdf.date": "તારીખ",
    "pdf.type": "પ્રકાર",
    "pdf.category": "શ્રેણી",
    "pdf.desc": "વર્ણન",
    "pdf.amount": "રકમ",
    "pdf.by": "દ્વારા",
    "pdf.pending": "બાકી",
    
    // Initialization
    "init.success": "ડેટાબેઝ સફળતાપૂર્વક શરૂ થયો! હવે તમે લોગિન કરી શકો છો.",
    "init.fail": "શરૂઆતમાં નિષ્ફળતા:",
    
    // Delete Modal
    "del.title": "વ્યવહાર કાઢી નાખવો છે?",
    "del.desc": "આ ક્રિયા પૂર્વવત્ કરી શકાતી નથી. શું તમે ખરેખર આ વ્યવહાર દૂર કરવા માંગો છો?",
    "del.confirm": "કાઢી નાખો",
    
    // Chart
    "chart.overview": "નાણાકીય વિહંગાવલોકન",
    "chart.pie": "શ્રેણી દૃશ્ય",
    "chart.line": "વલણ દૃશ્ય",
    "chart.noData": "આ સમયગાળા માટે કોઈ ડેટા ઉપલબ્ધ નથી.",
    
    // PWA
    "pwa.install": "એપ ઇન્સ્ટોલ કરો"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_lang', language);
  }, [language]);

  const t = (key: string) => {
    const lang = language as keyof typeof translations;
    const langTranslations = translations[lang] as Record<string, string>;
    return langTranslations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
