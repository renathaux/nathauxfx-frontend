const BASE_URL =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8001"
    : "https://flowsignal-backend-3.onrender.com";

const DISPLAY_NAMES = {
  EURUSD: "EURUSD",
  XAUUSD: "XAUUSD"
};

const API_URL = `${BASE_URL}/panel-data`;
const FUNDAMENTAL_INSIGHT_SYMBOLS = new Set(["EURUSD", "XAUUSD"]);
const fundamentalInsightStates = new Map();
let fundamentalInsightRenderRequest = 0;
const FUNDAMENTAL_INSIGHT_CACHE_MS = 5 * 60 * 1000;
const FUNDAMENTAL_INSIGHT_FAILURE_BACKOFF_MS = 2 * 60 * 1000;
let lastGoodBrokerAccountsData = null;
let brokerAccountActionInProgress = false;
let currentNewsImpactWindow = null;
let currentUpcomingHighImpactEvents = [];
const NEWS_PROTECTION_BEFORE_MS = 30 * 60 * 1000;
const NEWS_RELEASE_PHASE_MS = 60 * 1000;
const NEWS_PROTECTION_AFTER_MS = 15 * 60 * 1000;
// These values are needed by early role guards before chart setup begins.
// Keep them initialized before any top-level UI initializer can call clearTradeLines().
let currentChartSymbol = "EURUSD";
let currentChartTimeframe = "15m";
let chartModuleInitialized = false;
// ==============================
// 🌍 LANGUAGE SYSTEM
// ==============================

const LANG = {
  en: {
    // General
    buy: "Bullish Bias",
    sell: "Bearish Bias",
    confidence: "Bias Strength",
    wait: "WAIT",
    send: "Send",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    enter: "Enter",
    back: "Back",
    login: "Login",
    unlock: "Unlock",

    // Top controls
    alerts: "Alerts",
    strong: "Strong",
    feedback: "Feedback",
    adminLock: "Admin Lock",
    adminOn: "Admin On",
    fitFullMode: "Fit / Full Mode",

    // Symbols
    gold: "XAUUSD",
    eurusd: "EURUSD",

    // Landing
    features: "Features",
    pricing: "Pricing",
    testimonials: "Testimonials",
    docs: "Docs",
    blog: "Blog",
    getStarted: "Get Started",
    startTrading: "Start Trading Now →",
    viewFeatures: "View Features",
    liveHero: "● LIVE",
    heroLine: "Real-time signals • Smart money concepts • Built for traders",
    heroTitle1: "Smarter Signals.",
    heroTitle2: "Stronger Trades.",
    heroText: "FlowSignal provides real-time trading signals, market structure analysis, and smart money insights to help you trade with confidence.",
    realTimeAlerts: "⚡ Real-time Alerts",
    highAccuracy: "◎ High Accuracy",
    riskManaged: "🛡 Risk Managed",
    activeTraders: "Active Traders",
    signalAccuracy: "Signal Accuracy",
    trustedText: "TRUSTED BY TRADERS WORLDWIDE",

    // Access / login
    accessTitle: "FlowSignal Access",
    accessPlaceholder: "Enter access code",
    adminLoginTitle: "Admin Login",
    adminEmail: "Admin email",
    password: "Password",
    enterEmailPassword: "Enter email and password",
    invalidAdminLogin: "Invalid admin login",
    loginFailed: "Login failed",
    enterAccessCode: "Enter access code",
    invalidCode: "Invalid code ❌",

    // Feedback
    feedbackTitle: "Send Feedback",
    feedbackText: "Tell us what you want improved.",
    feedbackPlaceholder: "Type your feedback here...",
    thanks: "Thank you! Your feedback was sent",

    // Card metrics
    choppy: "CHOPPY",
    medium: "MEDIUM",
    weak: "WEAK",
    neutral: "NEUTRAL",
    mixed: "MIXED",
    trending: "TRENDING",
    strongQuality: "STRONG",
    unknown: "UNKNOWN",
    marketClosed: "MARKET CLOSED",
    noFeed: "NO FEED",
    noTiming: "NO TIMING",
    closed: "CLOSED",

    // Main panel
    smcPlan: "SMC PLAN",
    type: "Type",
    bias: "Bias",
    entry: "Entry",
    sl: "SL",
    tp1: "TP1",
    tp2: "TP2",
    riskReward: "Risk/Reward",
    invalidation: "Invalidation",
    reason: "Reason",
    lastSignal: "Last Signal",
    biasOnlyNote: "Market bias only - entry requires strategy checks.",

    // News panel
    marketStructure: "NEWS IMPACT",
    trend: "Trend: 1h",
    structure: "Entry: 15m",
    nextStep: "5m:",
    keyLevel: "Key Level:",
    sideways: "SIDEWAYS",
    bullish: "BULLISH",
    bearish: "BEARISH",

    // History
    history: "Recent Signal History",
    noHistory: "No history yet",
    time: "Time",
    symbol: "Symbol",
    signal: "Signal",
    result: "Result",
    pips: "Pips",

    // Modals
    confirmTrade: "Confirm Trade",
    confirmTradeText: "Confirm",
    adminAccess: "Admin Access",
    adminAccessText: "Enter admin code to unlock BUY / SELL.",
    enterAdminCode: "Enter admin code",
    accessRestricted: "Access Restricted",
    tradeAdminOnly: "Trade execution is only available for FlowSignal admin.",

    // Status
    live: "LIVE",
    loadingPanel: "LOADING PANEL",
    cache: "CACHE",
    error: "Error",
    updated: "updated",
    usingLastGoodData: "using last good data"
  },

  fr: {
    // General
    buy: "Biais haussier",
    sell: "Biais baissier",
    confidence: "Force du biais",
    wait: "ATTENTE",
    send: "Envoyer",
    cancel: "Annuler",
    confirm: "Confirmer",
    close: "Fermer",
    enter: "Entrer",
    back: "Retour",
    login: "Connexion",
    unlock: "Déverrouiller",

    // Top controls
    alerts: "Alertes",
    strong: "Fort",
    feedback: "Avis",
    adminLock: "Verrou admin",
    adminOn: "Admin activé",
    fitFullMode: "Mode ajusté / plein écran",

    // Symbols
    gold: "XAUUSD",
    eurusd: "EURUSD",

    // Landing
    features: "Fonctions",
    pricing: "Prix",
    testimonials: "Témoignages",
    docs: "Docs",
    blog: "Blog",
    getStarted: "Commencer",
    startTrading: "Commencer à trader →",
    viewFeatures: "Voir les fonctions",
    liveHero: "● EN DIRECT",
    heroLine: "Signaux en temps réel • Smart money concepts • Créé pour les traders",
    heroTitle1: "Signaux plus intelligents.",
    heroTitle2: "Trades plus forts.",
    heroText: "FlowSignal fournit des signaux de trading en temps réel, une analyse de structure du marché et des informations smart money pour vous aider à trader avec confiance.",
    realTimeAlerts: "⚡ Alertes en temps réel",
    highAccuracy: "◎ Haute précision",
    riskManaged: "🛡 Risque géré",
    activeTraders: "Traders actifs",
    signalAccuracy: "Précision des signaux",
    trustedText: "UTILISÉ PAR DES TRADERS DANS LE MONDE",

    // Access / login
    accessTitle: "Accès FlowSignal",
    accessPlaceholder: "Entrer le code d’accès",
    adminLoginTitle: "Connexion admin",
    adminEmail: "Email admin",
    password: "Mot de passe",
    enterEmailPassword: "Entrez l’email et le mot de passe",
    invalidAdminLogin: "Connexion admin invalide",
    loginFailed: "Connexion échouée",
    enterAccessCode: "Entrez le code d’accès",
    invalidCode: "Code invalide ❌",

    // Feedback
    feedbackTitle: "Envoyer un avis",
    feedbackText: "Dites-nous ce que vous voulez améliorer.",
    feedbackPlaceholder: "Écrivez votre message ici...",
    thanks: "Merci ! Votre message a été envoyé",

    // Card metrics
    choppy: "HÉSITANT",
    medium: "MOYEN",
    weak: "FAIBLE",
    neutral: "NEUTRE",
    mixed: "MIXTE",
    trending: "EN TENDANCE",
    strongQuality: "FORT",
    unknown: "INCONNU",
    marketClosed: "MARCHÉ FERMÉ",
    noFeed: "AUCUN FLUX",
    noTiming: "PAS DE TIMING",
    closed: "FERMÉ",

    // Main panel
    smcPlan: "PLAN SMC",
    type: "Type",
    bias: "Biais",
    entry: "Entrée",
    sl: "SL",
    tp1: "TP1",
    tp2: "TP2",
    riskReward: "Risque/Rendement",
    invalidation: "Invalidation",
    reason: "Raison",
    lastSignal: "Dernier signal",
    biasOnlyNote: "Biais de marché seulement - l’entrée exige les contrôles de stratégie.",

    // Structure panel
    marketStructure: "IMPACT DES NOUVELLES",
    trend: "Tendance: 1h",
    structure: "Entrée: 15m",
    nextStep: "5m:",
    keyLevel: "Niveau clé:",
    sideways: "LATÉRAL",
    bullish: "HAUSSIER",
    bearish: "BAISSIER",

    // History
    history: "Historique des signaux",
    noHistory: "Aucun historique",
    time: "Heure",
    symbol: "Symbole",
    signal: "Signal",
    result: "Résultat",
    pips: "Pips",

    // Modals
    confirmTrade: "Confirmer le trade",
    confirmTradeText: "Confirmer",
    adminAccess: "Accès admin",
    adminAccessText: "Entrez le code admin pour déverrouiller ACHAT / VENTE.",
    enterAdminCode: "Entrer le code admin",
    accessRestricted: "Accès limité",
    tradeAdminOnly: "L’exécution des trades est seulement disponible pour l’admin FlowSignal.",

    // Status
    live: "EN DIRECT",
    loadingPanel: "CHARGEMENT DU PANEL",
    cache: "CACHE",
    error: "Erreur",
    updated: "mis à jour",
    usingLastGoodData: "utilise les dernières bonnes données"
  },

  es: {
    // General
    buy: "Sesgo alcista",
    sell: "Sesgo bajista",
    confidence: "Fuerza del sesgo",
    wait: "ESPERA",
    send: "Enviar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    close: "Cerrar",
    enter: "Entrar",
    back: "Atrás",
    login: "Iniciar sesión",
    unlock: "Desbloquear",

    // Top controls
    alerts: "Alertas",
    strong: "Fuerte",
    feedback: "Comentario",
    adminLock: "Bloqueo admin",
    adminOn: "Admin activado",
    fitFullMode: "Modo ajustar / pantalla completa",

    // Symbols
    gold: "XAUUSD",
    eurusd: "EURUSD",

    // Landing
    features: "Funciones",
    pricing: "Precios",
    testimonials: "Testimonios",
    docs: "Docs",
    blog: "Blog",
    getStarted: "Comenzar",
    startTrading: "Empezar a operar →",
    viewFeatures: "Ver funciones",
    liveHero: "● EN VIVO",
    heroLine: "Señales en tiempo real • Smart money concepts • Creado para traders",
    heroTitle1: "Señales más inteligentes.",
    heroTitle2: "Operaciones más fuertes.",
    heroText: "FlowSignal ofrece señales de trading en tiempo real, análisis de estructura del mercado e información smart money para ayudarte a operar con confianza.",
    realTimeAlerts: "⚡ Alertas en tiempo real",
    highAccuracy: "◎ Alta precisión",
    riskManaged: "🛡 Riesgo gestionado",
    activeTraders: "Traders activos",
    signalAccuracy: "Precisión de señales",
    trustedText: "USADO POR TRADERS EN TODO EL MUNDO",

    // Access / login
    accessTitle: "Acceso FlowSignal",
    accessPlaceholder: "Ingresa el código de acceso",
    adminLoginTitle: "Inicio admin",
    adminEmail: "Email admin",
    password: "Contraseña",
    enterEmailPassword: "Ingresa email y contraseña",
    invalidAdminLogin: "Inicio admin inválido",
    loginFailed: "Inicio fallido",
    enterAccessCode: "Ingresa el código de acceso",
    invalidCode: "Código inválido ❌",

    // Feedback
    feedbackTitle: "Enviar comentario",
    feedbackText: "Dinos qué quieres mejorar.",
    feedbackPlaceholder: "Escribe tu mensaje aquí...",
    thanks: "¡Gracias! Mensaje enviado",

    // Card metrics
    choppy: "IRREGULAR",
    medium: "MEDIO",
    weak: "DÉBIL",
    neutral: "NEUTRAL",
    mixed: "MIXTO",
    trending: "EN TENDENCIA",
    strongQuality: "FUERTE",
    unknown: "DESCONOCIDO",
    marketClosed: "MERCADO CERRADO",
    noFeed: "SIN DATOS",
    noTiming: "SIN TIMING",
    closed: "CERRADO",

    // Main panel
    smcPlan: "PLAN SMC",
    type: "Tipo",
    bias: "Sesgo",
    entry: "Entrada",
    sl: "SL",
    tp1: "TP1",
    tp2: "TP2",
    riskReward: "Riesgo/Recompensa",
    invalidation: "Invalidación",
    reason: "Razón",
    lastSignal: "Última señal",
    biasOnlyNote: "Solo sesgo de mercado - la entrada requiere controles de estrategia.",

    // Structure panel
    marketStructure: "IMPACTO DE NOTICIAS",
    trend: "Tendencia: 1h",
    structure: "Entrada: 15m",
    nextStep: "5m:",
    keyLevel: "Nivel clave:",
    sideways: "LATERAL",
    bullish: "ALCISTA",
    bearish: "BAJISTA",

    // History
    history: "Historial de señales",
    noHistory: "Sin historial",
    time: "Hora",
    symbol: "Símbolo",
    signal: "Señal",
    result: "Resultado",
    pips: "Pips",

    // Modals
    confirmTrade: "Confirmar operación",
    confirmTradeText: "Confirmar",
    adminAccess: "Acceso admin",
    adminAccessText: "Ingresa el código admin para desbloquear COMPRAR / VENDER.",
    enterAdminCode: "Ingresa el código admin",
    accessRestricted: "Acceso restringido",
    tradeAdminOnly: "La ejecución de operaciones solo está disponible para el admin de FlowSignal.",

    // Status
    live: "EN VIVO",
    loadingPanel: "CARGANDO PANEL",
    cache: "CACHÉ",
    error: "Error",
    updated: "actualizado",
    usingLastGoodData: "usando los últimos datos buenos"
  }
};

// Text rendered outside the original landing/dashboard dictionary.  Keeping
// these phrases in one place lets settings, broker, performance and dynamically
// refreshed panels follow the same EN/FR/ES preference as the main dashboard.
const FULL_UI_TRANSLATIONS = Object.fromEntries([
  ["Dashboard", "Tableau de bord", "Panel"],
  ["Get Access →", "Obtenir l’accès →", "Obtener acceso →"],
  ["FlowSignal Access", "Accès FlowSignal", "Acceso FlowSignal"],
  ["Enter access code", "Entrez le code d’accès", "Ingresa el código de acceso"],
  ["Admin Login", "Connexion administrateur", "Inicio de administrador"],
  ["Admin email", "Courriel administrateur", "Correo de administrador"],
  ["Email", "Courriel", "Correo"],
  ["Password", "Mot de passe", "Contraseña"],
  ["Enter admin code", "Entrez le code administrateur", "Ingresa el código de administrador"],
  ["Type your feedback here...", "Écrivez votre avis ici...", "Escribe tu comentario aquí..."],
  ["Flow Assistant", "Assistant Flow", "Asistente Flow"],
  ["Market Assistant", "Assistant de marché", "Asistente de mercado"],
  ["Live Trading", "Trading réel", "Trading real"],
  ["History", "Historique", "Historial"],
  ["Performance", "Performance", "Rendimiento"],
  ["Settings", "Paramètres", "Configuración"],
  ["General", "Général", "General"],
  ["Risk Management", "Gestion du risque", "Gestión de riesgo"],
  ["Broker Accounts", "Comptes de courtier", "Cuentas del bróker"],
  ["Notifications", "Notifications", "Notificaciones"],
  ["Strategy", "Stratégie", "Estrategia"],
  ["Logout", "Déconnexion", "Cerrar sesión"],
  ["DAILY P/L", "P/L QUOTIDIEN", "P/G DIARIO"],
  ["WEEKLY P/L", "P/L HEBDOMADAIRE", "P/G SEMANAL"],
  ["MONTHLY P/L", "P/L MENSUEL", "P/G MENSUAL"],
  ["LIVE P/L (FLOATING)", "P/L RÉEL (FLOTTANT)", "P/G REAL (FLOTANTE)"],
  ["OPEN TRADES", "TRADES OUVERTS", "OPERACIONES ABIERTAS"],
  ["Broker status loading", "Chargement du statut du courtier", "Cargando estado del bróker"],
  ["Trend active · no fresh entry", "Tendance active · aucune nouvelle entrée", "Tendencia activa · sin entrada nueva"],
  ["Bullish Bias", "Biais haussier", "Sesgo alcista"],
  ["Bearish Bias", "Biais baissier", "Sesgo bajista"],
  ["Bias Strength", "Force du biais", "Fuerza del sesgo"],
  ["Market bias only - entry requires strategy checks.", "Biais de marché seulement — l’entrée exige les contrôles de stratégie.", "Solo sesgo de mercado: la entrada requiere controles de estrategia."],
  ["Block Reason", "Raison du blocage", "Motivo del bloqueo"],
  ["Market Structure", "Structure du marché", "Estructura del mercado"],
  ["Next Trigger", "Prochain déclencheur", "Próximo activador"],
  ["Waiting For", "En attente de", "Esperando"],
  ["Next Entry Zone", "Prochaine zone d’entrée", "Próxima zona de entrada"],
  ["Estimated SL", "SL estimé", "SL estimado"],
  ["Estimated TP", "TP estimé", "TP estimado"],
  ["Progress", "Progression", "Progreso"],
  ["ENTRY STRATEGY CHECKS", "CONTRÔLES DE LA STRATÉGIE D’ENTRÉE", "CONTROLES DE ESTRATEGIA DE ENTRADA"],
  ["Swing break", "Cassure du swing", "Ruptura del swing"],
  ["15m close", "Clôture 15 min", "Cierre de 15 min"],
  ["5m confirm", "Confirmation 5 min", "Confirmación de 5 min"],
  ["Swing SL", "SL du swing", "SL del swing"],
  ["Reason", "Raison", "Motivo"],
  ["Buy", "Acheter", "Comprar"],
  ["Sell", "Vendre", "Vender"],
  ["OPEN TRADE", "TRADE OUVERT", "OPERACIÓN ABIERTA"],
  ["No active live trade", "Aucun trade réel actif", "No hay operación real activa"],
  ["Lot", "Lot", "Lote"],
  ["Protected SL active", "SL protégé actif", "SL protegido activo"],
  ["Protected SL", "SL protégé", "SL protegido"],
  ["ORDER MANAGEMENT", "GESTION DE L’ORDRE", "GESTIÓN DE LA ORDEN"],
  ["Apply changes?", "Appliquer les modifications ?", "¿Aplicar cambios?"],
  ["Review the updated trade level.", "Vérifiez le niveau de trade modifié.", "Revisa el nivel de operación actualizado."],
  ["CANCEL", "ANNULER", "CANCELAR"],
  ["YES", "OUI", "SÍ"],
  ["FUNDAMENTAL INSIGHT", "ANALYSE FONDAMENTALE", "ANÁLISIS FUNDAMENTAL"],
  ["Loading fundamental insight…", "Chargement de l’analyse fondamentale…", "Cargando análisis fundamental…"],
  ["OVERALL BIAS", "BIAIS GLOBAL", "SESGO GENERAL"],
  ["USD STRENGTH", "FORCE USD", "FORTALEZA USD"],
  ["EUR STRENGTH", "FORCE EUR", "FORTALEZA EUR"],
  ["USD MACRO", "MACRO USD", "MACRO USD"],
  ["GOLD SUPPORT", "SOUTIEN DE L’OR", "SOPORTE DEL ORO"],
  ["VS", "CONTRE", "VS"],
  ["WHY THIS BIAS?", "POURQUOI CE BIAIS ?", "¿POR QUÉ ESTE SESGO?"],
  ["Waiting for evidence-backed reasons.", "En attente de raisons fondées sur des données.", "Esperando motivos respaldados por datos."],
  ["No evidence-backed directional reasons are available.", "Aucune raison directionnelle fondée sur des données n’est disponible.", "No hay motivos direccionales respaldados por datos."],
  ["Evidence-backed fundamental factor.", "Facteur fondamental fondé sur des données.", "Factor fundamental respaldado por datos."],
  ["NEXT HIGH-IMPACT EVENT", "PROCHAIN ÉVÉNEMENT À FORT IMPACT", "PRÓXIMO EVENTO DE ALTO IMPACTO"],
  ["No trusted high-impact event currently available.", "Aucun événement fiable à fort impact n’est disponible actuellement.", "No hay un evento fiable de alto impacto disponible actualmente."],
  ["High-impact event", "Événement à fort impact", "Evento de alto impacto"],
  ["Previous", "Précédent", "Anterior"],
  ["Forecast", "Prévision", "Pronóstico"],
  ["Actual", "Réel", "Real"],
  ["Impact", "Impact", "Impacto"],
  ["TRADING GUIDANCE", "ORIENTATION DE TRADING", "ORIENTACIÓN DE TRADING"],
  ["Informational only", "À titre informatif seulement", "Solo informativo"],
  ["Neutral", "Neutre", "Neutral"],
  ["Prefer BUY setups", "Privilégier les configurations d’ACHAT", "Preferir configuraciones de COMPRA"],
  ["Prefer SELL setups", "Privilégier les configurations de VENTE", "Preferir configuraciones de VENTA"],
  ["Neutral — insufficient data", "Neutre — données insuffisantes", "Neutral: datos insuficientes"],
  ["Neutral fundamental guidance", "Orientation fondamentale neutre", "Orientación fundamental neutral"],
  ["Fundamental data is loading.", "Chargement des données fondamentales.", "Cargando datos fundamentales."],
  ["Fundamental evidence is currently insufficient.", "Les données fondamentales sont actuellement insuffisantes.", "La evidencia fundamental es insuficiente actualmente."],
  ["No strong fundamental directional advantage.", "Aucun avantage directionnel fondamental marqué.", "No hay una ventaja direccional fundamental clara."],
  ["Fundamental evidence is incomplete.", "Les données fondamentales sont incomplètes.", "La evidencia fundamental está incompleta."],
  ["Insufficient fundamental data", "Données fondamentales insuffisantes", "Datos fundamentales insuficientes"],
  ["Insufficient fundamental coverage", "Couverture fondamentale insuffisante", "Cobertura fundamental insuficiente"],
  ["Loading", "Chargement", "Cargando"],
  ["STRONG", "FORT", "FUERTE"],
  ["POSITIVE", "POSITIF", "POSITIVO"],
  ["VERY WEAK", "TRÈS FAIBLE", "MUY DÉBIL"],
  ["WEAK", "FAIBLE", "DÉBIL"],
  ["NEUTRAL", "NEUTRE", "NEUTRAL"],
  ["Recent Signal History", "Historique récent des signaux", "Historial reciente de señales"],
  ["Time", "Heure", "Hora"],
  ["Symbol", "Symbole", "Símbolo"],
  ["Signal", "Signal", "Señal"],
  ["Result", "Résultat", "Resultado"],
  ["No history yet", "Aucun historique", "Sin historial"],
  ["Markets", "Marchés", "Mercados"],
  ["Trades", "Trades", "Operaciones"],
  ["Menu", "Menu", "Menú"],
  ["Voice announcer controls", "Commandes de l’annonceur vocal", "Controles del anunciador de voz"],
  ["Live trading performance", "Performance du trading réel", "Rendimiento del trading real"],
  ["Draggable trade levels", "Niveaux de trade déplaçables", "Niveles de operación arrastrables"],
  ["Mobile timeframe selector", "Sélecteur mobile d’unité de temps", "Selector móvil de temporalidad"],
  ["Refresh Fundamental Insight", "Actualiser l’analyse fondamentale", "Actualizar análisis fundamental"],
  ["Fundamental summary", "Résumé fondamental", "Resumen fundamental"],
  ["Mobile app navigation", "Navigation de l’application mobile", "Navegación de la aplicación móvil"],
  ["Close explanation", "Fermer l’explication", "Cerrar explicación"],
  ["Close Broker Accounts", "Fermer les comptes de courtier", "Cerrar cuentas del bróker"],
  ["Close Auto Trade", "Fermer le trading automatique", "Cerrar trading automático"],
  ["Close Flow Assistant", "Fermer l’assistant Flow", "Cerrar Asistente Flow"],
  ["Assistant voice", "Voix de l’assistant", "Voz del asistente"],
  ["Streamer voice hotkeys", "Raccourcis de la voix du streamer", "Atajos de voz del streamer"],
  ["FlowSignal is ready.", "FlowSignal est prêt.", "FlowSignal está listo."],
  ["Confirm Trade", "Confirmer le trade", "Confirmar operación"],
  ["Admin Access", "Accès administrateur", "Acceso de administrador"],
  ["Enter admin code to unlock BUY / SELL.", "Entrez le code administrateur pour déverrouiller ACHAT / VENTE.", "Ingresa el código de administrador para desbloquear COMPRA / VENTA."],
  ["Send Feedback", "Envoyer un avis", "Enviar comentario"],
  ["Tell us what you want improved.", "Dites-nous ce que vous souhaitez améliorer.", "Dinos qué quieres mejorar."],
  ["Bug report", "Signaler un bogue", "Reporte de error"],
  ["Feature request", "Demande de fonctionnalité", "Solicitud de función"],
  ["Thank you! for your feedback ✨", "Merci pour votre avis ✨", "¡Gracias por tu comentario! ✨"],
  ["Track your trading performance and platform analytics.", "Suivez vos performances de trading et les statistiques de la plateforme.", "Consulta tu rendimiento de trading y las estadísticas de la plataforma."],
  ["Win Rate", "Taux de réussite", "Tasa de aciertos"],
  ["Total Trades", "Total des trades", "Total de operaciones"],
  ["Wins / Losses", "Gains / Pertes", "Ganancias / Pérdidas"],
  ["Best Trade", "Meilleur trade", "Mejor operación"],
  ["Worst Trade", "Pire trade", "Peor operación"],
  ["Average RR", "RR moyen", "RR promedio"],
  ["Profit Factor", "Facteur de profit", "Factor de beneficio"],
  ["EURUSD Performance", "Performance EURUSD", "Rendimiento EURUSD"],
  ["XAUUSD Performance", "Performance XAUUSD", "Rendimiento XAUUSD"],
  ["App Analytics", "Statistiques de l’application", "Analítica de la aplicación"],
  ["Total Visits", "Visites totales", "Visitas totales"],
  ["Unique Visitors", "Visiteurs uniques", "Visitantes únicos"],
  ["Today Visits", "Visites aujourd’hui", "Visitas de hoy"],
  ["Last Visit", "Dernière visite", "Última visita"],
  ["Countries", "Pays", "Países"],
  ["Platform Statistics", "Statistiques de la plateforme", "Estadísticas de la plataforma"],
  ["Equity Curve", "Courbe des capitaux", "Curva de capital"],
  ["Performance Summary", "Résumé des performances", "Resumen de rendimiento"],
  ["30 Days", "30 jours", "30 días"],
  ["30 days ago", "Il y a 30 jours", "Hace 30 días"],
  ["Today", "Aujourd’hui", "Hoy"],
  ["General Settings", "Paramètres généraux", "Configuración general"],
  ["Control what appears on your dashboard.", "Contrôlez les éléments affichés sur votre tableau de bord.", "Controla lo que aparece en tu panel."],
  ["Show Weekly P/L", "Afficher le P/L hebdomadaire", "Mostrar P/G semanal"],
  ["Show Monthly P/L", "Afficher le P/L mensuel", "Mostrar P/G mensual"],
  ["Show Floating P/L", "Afficher le P/L flottant", "Mostrar P/G flotante"],
  ["Show Bias Strength", "Afficher la force du biais", "Mostrar fuerza del sesgo"],
  ["Show Bullish/Bearish Bias", "Afficher le biais haussier/baissier", "Mostrar sesgo alcista/bajista"],
  ["Show Buy/Sell Buttons", "Afficher les boutons Acheter/Vendre", "Mostrar botones Comprar/Vender"],
  ["Show Open Trades Counter", "Afficher le compteur de trades ouverts", "Mostrar contador de operaciones abiertas"],
  ["Show News Impact Panel", "Afficher le panneau d’impact des nouvelles", "Mostrar panel de impacto de noticias"],
  ["Show Recent Signal History", "Afficher l’historique récent des signaux", "Mostrar historial reciente de señales"],
  ["Show Account Balance", "Afficher le solde du compte", "Mostrar saldo de la cuenta"],
  ["Show Account Number", "Afficher le numéro de compte", "Mostrar número de cuenta"],
  ["Show Broker Info", "Afficher les informations du courtier", "Mostrar información del bróker"],
  ["All risk settings apply to both EURUSD and Gold automatically.", "Tous les paramètres de risque s’appliquent automatiquement à EURUSD et à l’or.", "Todos los ajustes de riesgo se aplican automáticamente a EURUSD y al oro."],
  ["Risk per trade", "Risque par trade", "Riesgo por operación"],
  ["% of account equity", "% des capitaux du compte", "% del capital de la cuenta"],
  ["Max daily loss", "Perte quotidienne maximale", "Pérdida diaria máxima"],
  ["Maximum loss per day", "Perte maximale par jour", "Pérdida máxima por día"],
  ["Max weekly loss", "Perte hebdomadaire maximale", "Pérdida semanal máxima"],
  ["Maximum loss per week", "Perte maximale par semaine", "Pérdida máxima por semana"],
  ["Max open trades", "Nombre maximal de trades ouverts", "Máximo de operaciones abiertas"],
  ["Maximum trades at the same time", "Nombre maximal de trades simultanés", "Máximo de operaciones simultáneas"],
  ["TP1 Distance Toward TP2 (%)", "Distance de TP1 vers TP2 (%)", "Distancia de TP1 hacia TP2 (%)"],
  ["Controls where TP1 is placed between entry and TP2; not position size.", "Contrôle le placement de TP1 entre l’entrée et TP2, pas la taille de la position.", "Controla dónde se coloca TP1 entre la entrada y TP2, no el tamaño de la posición."],
  ["Protected SL Distance Toward TP2 (%)", "Distance du SL protégé vers TP2 (%)", "Distancia del SL protegido hacia TP2 (%)"],
  ["After TP1, controls where SL moves between entry and TP2. Current behavior: 50%.", "Après TP1, contrôle le déplacement du SL entre l’entrée et TP2. Comportement actuel : 50 %.", "Después de TP1, controla dónde se mueve el SL entre la entrada y TP2. Comportamiento actual: 50 %."],
  ["Break-even rule", "Règle du seuil de rentabilité", "Regla de punto de equilibrio"],
  ["Allowed symbols", "Symboles autorisés", "Símbolos permitidos"],
  ["Default trading mode", "Mode de trading par défaut", "Modo de trading predeterminado"],
  ["Reset to Defaults", "Rétablir les valeurs par défaut", "Restablecer valores"],
  ["Save Changes", "Enregistrer les modifications", "Guardar cambios"],
  ["These settings are saved locally and apply to all instruments.", "Ces paramètres sont enregistrés localement et s’appliquent à tous les instruments.", "Estos ajustes se guardan localmente y se aplican a todos los instrumentos."],
  ["Signal alerts", "Alertes de signal", "Alertas de señal"],
  ["Signal notifications", "Notifications de signal", "Notificaciones de señal"],
  ["Receive a sound, an in-app message, and a Chrome notification when a BUY or SELL signal arrives.", "Recevez un son, un message dans l’application et une notification Chrome lorsqu’un signal ACHAT ou VENTE arrive.", "Recibe un sonido, un mensaje en la aplicación y una notificación de Chrome cuando llegue una señal de COMPRA o VENTA."],
  ["Notification status: On · desktop and in-app alerts active", "État des notifications : activé · alertes bureau et application actives", "Estado de notificaciones: activado · alertas de escritorio y de la aplicación activas"],
  ["Notification status: On · Chrome blocked; in-app alerts active", "État des notifications : activé · Chrome bloqué, alertes dans l’application actives", "Estado de notificaciones: activado · Chrome bloqueado, alertas en la aplicación activas"],
  ["Notification status: On · allow Chrome permission; in-app alerts active", "État des notifications : activé · autorisez Chrome, alertes dans l’application actives", "Estado de notificaciones: activado · permite Chrome, alertas en la aplicación activas"],
  ["Notification status: On · in-app alerts active", "État des notifications : activé · alertes dans l’application actives", "Estado de notificaciones: activado · alertas en la aplicación activas"],
  ["Notification status: Off", "État des notifications : désactivé", "Estado de notificaciones: desactivado"],
  ["Play sound and show a desktop notification when EURUSD or XAUUSD changes to BUY or SELL.", "Émettre un son et afficher une notification quand EURUSD ou XAUUSD passe à ACHAT ou VENTE.", "Reproducir sonido y mostrar una notificación cuando EURUSD o XAUUSD cambie a COMPRA o VENTA."],
  ["Test Alert", "Tester l’alerte", "Probar alerta"],
  ["News Trading Mode", "Mode de trading des nouvelles", "Modo de trading de noticias"],
  ["Strategy Parameters", "Paramètres de stratégie", "Parámetros de estrategia"],
  ["Risk / Reward", "Risque / Rendement", "Riesgo / Beneficio"],
  ["Trade qualification and target requirements.", "Qualification du trade et exigences de cible.", "Calificación de la operación y requisitos de objetivo."],
  ["Minimum RR", "RR minimal", "RR mínimo"],
  ["Maximum RR", "RR maximal", "RR máximo"],
  ["Structure", "Structure", "Estructura"],
  ["Price-structure qualification controls.", "Contrôles de qualification de la structure des prix.", "Controles de calificación de la estructura del precio."],
  ["Minimum BOS Buffer", "Marge BOS minimale", "Margen BOS mínimo"],
  ["Wired — the strategy uses the greater of this value or its ATR-based buffer.", "Connecté — la stratégie utilise la valeur la plus élevée entre celle-ci et son tampon basé sur l’ATR.", "Conectado: la estrategia usa el valor mayor entre este y su margen basado en ATR."],
  ["Minimum SL Distance", "Distance SL minimale", "Distancia SL mínima"],
  ["Wired — sets the minimum allowed SL distance; it does not choose the swing.", "Connecté — définit la distance SL minimale autorisée ; ne choisit pas le swing.", "Conectado: define la distancia SL mínima permitida; no elige el swing."],
  ["Require M15 Candle Close", "Exiger la clôture de la bougie M15", "Exigir cierre de vela M15"],
  ["Require Later M5 Confirmation", "Exiger une confirmation M5 ultérieure", "Exigir confirmación M5 posterior"],
  ["Require Fresh BOS After Consolidation Clears", "Exiger un nouveau BOS après la consolidation", "Exigir un BOS nuevo tras finalizar la consolidación"],
  ["Foundation only", "Base seulement", "Solo base"],
  ["Foundation only — not active in execution.", "Base seulement — non actif dans l’exécution.", "Solo base: no está activo en la ejecución."],
  ["Wired", "Connecté", "Conectado"],
  ["Enabled", "Activé", "Activado"],
  ["Disabled", "Désactivé", "Desactivado"],
  ["Trend Filters", "Filtres de tendance", "Filtros de tendencia"],
  ["Closed-candle EMA direction controls.", "Contrôles de direction EMA sur bougies clôturées.", "Controles de dirección EMA con velas cerradas."],
  ["EMA Filter", "Filtre EMA", "Filtro EMA"],
  ["BUY/SELL permission from closed M15 candles.", "Permission ACHAT/VENTE selon les bougies M15 clôturées.", "Permiso COMPRA/VENTA según velas M15 cerradas."],
  ["EMA Fast", "EMA rapide", "EMA rápida"],
  ["EMA Slow", "EMA lente", "EMA lenta"],
  ["Market Filters", "Filtres de marché", "Filtros de mercado"],
  ["Noise and event protection.", "Protection contre le bruit et les événements.", "Protección contra ruido y eventos."],
  ["Consolidation Filter", "Filtre de consolidation", "Filtro de consolidación"],
  ["When ON, the existing 2-of-3 consolidation detector blocks new setups.", "Lorsqu’il est activé, le détecteur de consolidation 2 sur 3 existant bloque les nouvelles configurations.", "Cuando está activado, el detector de consolidación existente de 2 de 3 bloque nuevas configuraciones."],
  ["Fixed Strategy Rules", "Règles de stratégie fixes", "Reglas de estrategia fijas"],
  ["Core rules shown for clarity; these are not editable.", "Règles principales affichées pour plus de clarté ; elles ne sont pas modifiables.", "Reglas principales mostradas para mayor claridad; no son editables."],
  ["Fixed", "Fixe", "Fijo"],
  ["FIXED", "FIXE", "FIJO"],
  ["EMA Trend Filter", "Filtre de tendance EMA", "Filtro de tendencia EMA"],
  ["M15 Closed Break", "Cassure clôturée M15", "Ruptura cerrada M15"],
  ["Later M5 Confirmation", "Confirmation M5 ultérieure", "Confirmación M5 posterior"],
  ["Fresh BOS After Consolidation", "Nouveau BOS après consolidation", "BOS nuevo después de consolidación"],
  ["ATR BOS Buffer Component", "Composante ATR du tampon BOS", "Componente ATR del margen BOS"],
  ["REQUIRED", "REQUIS", "REQUERIDO"],
  ["Reset", "Réinitialiser", "Restablecer"],
  ["Current", "Actuel", "Actual"],
  ["Default", "Par défaut", "Predeterminado"],
  ["Change History", "Historique des modifications", "Historial de cambios"],
  ["Recent saved Strategy Settings changes, newest first.", "Modifications récentes enregistrées des paramètres de stratégie, les plus récentes en premier.", "Cambios recientes guardados de los ajustes de estrategia, del más reciente al más antiguo."],
  ["Open this tab to load recent changes.", "Ouvrez cet onglet pour charger les modifications récentes.", "Abre esta pestaña para cargar los cambios recientes."],
  ["Loading change history…", "Chargement de l’historique…", "Cargando historial de cambios…"],
  ["No strategy changes have been saved yet.", "Aucune modification de stratégie n’a encore été enregistrée.", "Aún no se han guardado cambios de estrategia."],
  ["Could not load change history", "Impossible de charger l’historique", "No se pudo cargar el historial de cambios"],
  ["Manage", "Gérer", "Gestionar"],
  ["Execution Timing", "Calendrier d’exécution", "Tiempos de ejecución"],
  ["Post-trade timing controls.", "Contrôles du délai après trade.", "Controles de tiempo posteriores a la operación."],
  ["Post Trade Cooldown", "Pause après trade", "Pausa posterior a la operación"],
  ["points", "points", "puntos"],
  ["minutes", "minutes", "minutos"],
  ["Money, exposure, and position-management controls.", "Contrôles de l’argent, de l’exposition et de la gestion des positions.", "Controles de dinero, exposición y gestión de posiciones."],
  ["Manage:", "Gérer :", "Gestionar:"],
  ["Daily loss limits", "Limites de perte quotidienne", "Límites de pérdida diaria"],
  ["Weekly loss limits", "Limites de perte hebdomadaire", "Límites de pérdida semanal"],
  ["Position limits", "Limites de positions", "Límites de posiciones"],
  ["TP1 placement", "Placement de TP1", "Ubicación de TP1"],
  ["Open Risk Management →", "Ouvrir la gestion du risque →", "Abrir gestión de riesgo →"],
  ["Current Config Summary", "Résumé de la configuration actuelle", "Resumen de configuración actual"],
  ["Backend-authoritative V1 values.", "Valeurs V1 contrôlées par le backend.", "Valores V1 controlados por el backend."],
  ["No settings loaded.", "Aucun paramètre chargé.", "No hay ajustes cargados."],
  ["Wired: Minimum RR, Maximum RR, Minimum BOS Buffer, Minimum SL Distance, and Post Trade Cooldown.", "Connectés : RR minimal, RR maximal, marge BOS minimale, distance SL minimale et pause après trade.", "Conectados: RR mínimo, RR máximo, margen BOS mínimo, distancia SL mínima y pausa posterior a la operación."],
  ["Strategy changes apply to future evaluations only. Existing open positions and broker orders are not modified.", "Les changements de stratégie s’appliquent uniquement aux évaluations futures. Les positions ouvertes et les ordres existants ne sont pas modifiés.", "Los cambios de estrategia solo se aplican a evaluaciones futuras. Las posiciones abiertas y las órdenes existentes no se modifican."],
  ["Six wired settings: RR window, BOS floor, minimum SL, cooldown, and consolidation permission.", "Six paramètres connectés : fenêtre RR, plancher BOS, SL minimal, pause et permission de consolidation.", "Seis ajustes conectados: ventana RR, mínimo BOS, SL mínimo, pausa y permiso de consolidación."],
  ["Restore Defaults", "Rétablir les valeurs", "Restaurar valores"],
  ["Discard Changes", "Annuler les modifications", "Descartar cambios"],
  ["Save Strategy", "Enregistrer la stratégie", "Guardar estrategia"],
  ["Strategy profile controls.", "Contrôles du profil de stratégie.", "Controles del perfil de estrategia."],
  ["Loading strategy settings…", "Chargement des paramètres de stratégie…", "Cargando ajustes de estrategia…"],
  ["Loaded backend settings · production defaults", "Paramètres du backend chargés · valeurs de production par défaut", "Ajustes del backend cargados · valores de producción predeterminados"],
  ["Saving strategy settings…", "Enregistrement des paramètres de stratégie…", "Guardando ajustes de estrategia…"],
  ["Strategy settings saved successfully.", "Paramètres de stratégie enregistrés.", "Ajustes de estrategia guardados correctamente."],
  ["Restoring production defaults…", "Restauration des valeurs de production par défaut…", "Restaurando valores de producción predeterminados…"],
  ["Production defaults restored.", "Valeurs de production par défaut restaurées.", "Valores de producción predeterminados restaurados."],
  ["Unsaved strategy changes.", "Modifications de stratégie non enregistrées.", "Cambios de estrategia sin guardar."],
  ["Unsaved changes discarded.", "Modifications non enregistrées annulées.", "Cambios sin guardar descartados."],
  ["🔒 Sign in to view or change Strategy Settings.", "🔒 Connectez-vous pour consulter ou modifier les paramètres de stratégie.", "🔒 Inicia sesión para ver o modificar los ajustes de estrategia."],
  ["🔒 Sign in to modify Strategy Settings.", "🔒 Connectez-vous pour modifier les paramètres de stratégie.", "🔒 Inicia sesión para modificar los ajustes de estrategia."],
  ["Could not establish the FlowSignal session.", "Impossible d’établir la session FlowSignal.", "No se pudo establecer la sesión de FlowSignal."],
  ["Could not load strategy settings", "Impossible de charger les paramètres de stratégie", "No se pudieron cargar los ajustes de estrategia"],
  ["Could not save strategy settings", "Impossible d’enregistrer les paramètres de stratégie", "No se pudieron guardar los ajustes de estrategia"],
  ["Could not restore defaults", "Impossible de restaurer les valeurs par défaut", "No se pudieron restaurar los valores predeterminados"],
  ["Restore the original production strategy defaults?", "Restaurer les valeurs de stratégie de production d’origine ?", "¿Restaurar los valores originales de estrategia de producción?"],
  ["About", "À propos", "Acerca de"],
  ["Advanced controls will be added only after their trading behavior is reviewed and approved.", "Les contrôles avancés seront ajoutés uniquement après examen et approbation de leur comportement de trading.", "Los controles avanzados se añadirán solo tras revisar y aprobar su comportamiento de trading."],
  ["About Strategy Settings", "À propos des paramètres de stratégie", "Acerca de los ajustes de estrategia"],
  ["Settings are stored by the backend and shared across signed-in browsers. V1 connects exactly six controls: Minimum RR, Maximum RR, Minimum BOS Buffer, Minimum SL Distance, Post Trade Cooldown, and Consolidation Filter.", "Les paramètres sont stockés par le backend et partagés entre les navigateurs connectés. La V1 connecte exactement six contrôles : RR minimal, RR maximal, marge BOS minimale, distance SL minimale, pause après trade et filtre de consolidation.", "Los ajustes se guardan en el backend y se comparten entre navegadores conectados. V1 conecta exactamente seis controles: RR mínimo, RR máximo, margen BOS mínimo, distancia SL mínima, pausa posterior y filtro de consolidación."],
  ["Choose how high-impact economic news affects new entries.", "Choisissez comment les nouvelles économiques à fort impact affectent les nouvelles entrées.", "Elige cómo las noticias económicas de alto impacto afectan nuevas entradas."],
  ["OFF", "DÉSACTIVÉ", "DESACTIVADO"],
  ["BLOCK ONLY", "BLOCAGE SEULEMENT", "SOLO BLOQUEO"],
  ["TRADE CONFIRMED", "TRADE CONFIRMÉ", "OPERACIÓN CONFIRMADA"],
  ["News does not block or create trades.", "Les nouvelles ne bloquent ni ne créent de trades.", "Las noticias no bloquean ni crean operaciones."],
  ["Blocks new entries from 30 minutes before until 15 minutes after relevant high-impact news.", "Bloque les nouvelles entrées de 30 minutes avant à 15 minutes après une nouvelle pertinente à fort impact.", "Bloquea nuevas entradas desde 30 minutos antes hasta 15 minutos después de noticias relevantes de alto impacto."],
  ["Blocks before release, then may trade one verified post-news setup after live data and market confirmation.", "Bloque avant la publication, puis peut trader une configuration post-nouvelle vérifiée après confirmation des données et du marché.", "Bloquea antes de la publicación y puede operar una configuración posterior verificada tras confirmar datos y mercado."],
  ["Enable confirmed news trading?", "Activer le trading confirmé des nouvelles ?", "¿Activar trading confirmado de noticias?"],
  ["This mode may open trades after high-impact economic releases.", "Ce mode peut ouvrir des trades après des publications économiques à fort impact.", "Este modo puede abrir operaciones después de publicaciones económicas de alto impacto."],
  ["It should be tested on demo before being used on a funded or live account.", "Il doit être testé en démo avant d’être utilisé sur un compte financé ou réel.", "Debe probarse en demo antes de usarse en una cuenta financiada o real."],
  ["Enable", "Activer", "Activar"],
  ["Manage your cTrader connection and accounts. Select which account FlowSignal should use for live trading.", "Gérez votre connexion et vos comptes cTrader. Sélectionnez le compte utilisé par FlowSignal pour le trading réel.", "Gestiona tu conexión y cuentas de cTrader. Selecciona la cuenta que FlowSignal usará para trading real."],
  ["cTrader Connection", "Connexion cTrader", "Conexión cTrader"],
  ["Checking", "Vérification", "Comprobando"],
  ["Connect cTrader", "Connecter cTrader", "Conectar cTrader"],
  ["Disconnect cTrader", "Déconnecter cTrader", "Desconectar cTrader"],
  ["Refresh Accounts", "Actualiser les comptes", "Actualizar cuentas"],
  ["cTrader Accounts", "Comptes cTrader", "Cuentas cTrader"],
  ["Account list", "Liste des comptes", "Lista de cuentas"],
  ["Number", "Numéro", "Número"],
  ["Broker", "Courtier", "Bróker"],
  ["Type", "Type", "Tipo"],
  ["Balance", "Solde", "Saldo"],
  ["Currency", "Devise", "Moneda"],
  ["Status", "Statut", "Estado"],
  ["Active", "Actif", "Activo"],
  ["No accounts loaded.", "Aucun compte chargé.", "No hay cuentas cargadas."],
  ["About Accounts", "À propos des comptes", "Acerca de las cuentas"],
  ["Only one account can be active at a time. All signals, positions, and orders will use the selected active account.", "Un seul compte peut être actif à la fois. Tous les signaux, positions et ordres utiliseront le compte sélectionné.", "Solo una cuenta puede estar activa a la vez. Todas las señales, posiciones y órdenes usarán la cuenta seleccionada."],
  ["If an account shows as unavailable, it may be expired or no longer authorized in cTrader.", "Si un compte est indisponible, il peut être expiré ou ne plus être autorisé dans cTrader.", "Si una cuenta aparece no disponible, puede haber expirado o ya no estar autorizada en cTrader."],
  ["Active Account", "Compte actif", "Cuenta activa"],
  ["No active account selected", "Aucun compte actif sélectionné", "No hay cuenta activa seleccionada"],
  ["Change Active Account", "Changer le compte actif", "Cambiar cuenta activa"],
  ["Account Actions", "Actions du compte", "Acciones de la cuenta"],
  ["Forget Account", "Oublier le compte", "Olvidar cuenta"],
  ["Remove selected account from FlowSignal", "Supprimer le compte sélectionné de FlowSignal", "Eliminar la cuenta seleccionada de FlowSignal"],
  ["Clear All Accounts", "Effacer tous les comptes", "Borrar todas las cuentas"],
  ["Remove all saved accounts from FlowSignal", "Supprimer tous les comptes enregistrés de FlowSignal", "Eliminar todas las cuentas guardadas de FlowSignal"],
  ["Auto Trade", "Trading automatique", "Trading automático"],
  ["Manage paper and live automated trading.", "Gérez le trading automatique papier et réel.", "Gestiona el trading automático de prueba y real."],
  ["PAPER TRADES", "TRADES PAPIER", "OPERACIONES DE PRUEBA"],
  ["LIVE TRADES", "TRADES RÉELS", "OPERACIONES REALES"],
  ["ACTIVE STRATEGIES", "STRATÉGIES ACTIVES", "ESTRATEGIAS ACTIVAS"],
  ["No active live trades", "Aucun trade réel actif", "No hay operaciones reales activas"],
  ["No paper history yet", "Aucun historique papier", "Sin historial de prueba"],
  ["No live trades yet", "Aucun trade réel", "Sin operaciones reales"],
  ["Live Auto Confirmation", "Confirmation du trading automatique réel", "Confirmación de trading automático real"],
  ["FlowSignal will place trades on your connected broker account. Continue?", "FlowSignal placera des trades sur votre compte de courtier connecté. Continuer ?", "FlowSignal colocará operaciones en tu cuenta de bróker conectada. ¿Continuar?"],
  ["Configure your AI assistant and market voice settings.", "Configurez votre assistant IA et les paramètres de voix du marché.", "Configura tu asistente de IA y los ajustes de voz del mercado."],
  ["Voice Settings", "Réglages de la voix", "Ajustes de voz"],
  ["Voice", "Voix", "Voz"],
  ["Test Voice", "Tester la voix", "Probar voz"],
  ["Show text popup", "Afficher la fenêtre de texte", "Mostrar ventana de texto"],
  ["Voice speed", "Vitesse de la voix", "Velocidad de voz"],
  ["Voice pitch", "Tonalité de la voix", "Tono de voz"],
  ["Voice volume", "Volume de la voix", "Volumen de voz"],
  ["Assistant style", "Style de l’assistant", "Estilo del asistente"],
  ["Calm & Professional", "Calme et professionnel", "Calmado y profesional"],
  ["Confident", "Assuré", "Seguro"],
  ["Hype", "Énergique", "Enérgico"],
  ["Professional", "Professionnel", "Profesional"],
  ["Streamer Voice", "Voix du streamer", "Voz del streamer"],
  ["Edit Streamer Voice Text", "Modifier le texte de la voix du streamer", "Editar texto de la voz del streamer"],
  ["Edit Text", "Modifier le texte", "Editar texto"],
  ["Market Voice Triggers", "Déclencheurs de la voix du marché", "Activadores de voz del mercado"],
  ["Voice Behavior", "Comportement de la voix", "Comportamiento de voz"],
  ["Advanced Settings", "Paramètres avancés", "Configuración avanzada"],
  ["Language", "Langue", "Idioma"],
  ["Response Length", "Longueur de réponse", "Longitud de respuesta"],
  ["Normal", "Normal", "Normal"],
  ["Short", "Court", "Corto"],
  ["Detailed", "Détaillé", "Detallado"],
  ["AI Creativity", "Créativité de l’IA", "Creatividad de IA"],
  ["Balanced", "Équilibré", "Equilibrado"],
  ["More Accurate", "Plus précis", "Más preciso"],
  ["More Creative", "Plus créatif", "Más creativo"],
].map(([en, fr, es]) => [en, { en, fr, es }]));

const fullUiTextSources = new WeakMap();
const fullUiAttributeSources = new WeakMap();
let fullUiTranslationObserver = null;

function translateDynamicUiText(source, lang) {
  const direct = FULL_UI_TRANSLATIONS[source];
  if (direct) return direct[lang] || direct.en;
  const decorated = source.match(/^([^\p{L}\p{N}]*)([\s\S]+)$/u);
  if (decorated && decorated[1] && FULL_UI_TRANSLATIONS[decorated[2]]) {
    const translated = FULL_UI_TRANSLATIONS[decorated[2]];
    return `${decorated[1]}${translated[lang] || translated.en}`;
  }
  if (lang === "en") return source;

  const replacements = lang === "fr" ? [
    [/^(\d+(?:\.\d+)?)% Confidence$/, "$1 % de confiance"],
    [/^Last update: (.+)$/, "Dernière mise à jour : $1"],
    [/^Current mode: (.+)$/, "Mode actuel : $1"],
    [/^Active account:\s*(.*)$/, "Compte actif : $1"],
    [/^Environment:\s*(.*)$/, "Environnement : $1"],
    [/^Browser permission:\s*(.*)$/, "Autorisation du navigateur : $1"],
    [/^Connection Status:\s*(.*)$/, "État de la connexion : $1"],
    [/^Authorized:\s*(.*)$/, "Autorisé : $1"],
    [/^(\d+) Accounts Found$/, "$1 comptes trouvés"],
    [/^Paper Auto: (ON|OFF)$/, "Auto papier : $1"],
    [/^Live Auto: (ON|OFF)$/, "Auto réel : $1"],
    [/^Live Broker: (.+)$/, "Courtier réel : $1"],
    [/^Loading (EURUSD|XAUUSD) fundamental data\.$/, "Chargement des données fondamentales $1."],
    [/^Loading (EURUSD|XAUUSD) fundamental insight…$/, "Chargement de l’analyse fondamentale $1…"],
    [/^Fundamental insight unavailable(.*)$/, "Analyse fondamentale indisponible$1"],
    [/^Showing last successful result • Refresh failed: (.+)$/, "Dernier résultat valide affiché • Échec de l’actualisation : $1"],
    [/^Currency affected: (.+)$/, "Devise concernée : $1"],
    [/^Countdown: (.+)$/, "Compte à rebours : $1"],
    [/^(\d+) provisional evidence items?$/, "$1 éléments de preuve provisoires"],
    [/^(\d+) recent provider warnings?$/, "$1 avertissements récents du fournisseur"],
    [/^Enabled( · .+)$/, "Activé$1"],
    [/^Disabled( · .+)$/, "Désactivé$1"],
    [/^Allowed: (.+)$/, "Autorisé : $1"],
    [/^Loaded backend settings · (.+)$/, "Paramètres du backend chargés · $1"],
    [/^(\d+) unsaved changes?$/, "$1 modifications non enregistrées"],
  ] : [
    [/^(\d+(?:\.\d+)?)% Confidence$/, "$1 % de confianza"],
    [/^Last update: (.+)$/, "Última actualización: $1"],
    [/^Current mode: (.+)$/, "Modo actual: $1"],
    [/^Active account:\s*(.*)$/, "Cuenta activa: $1"],
    [/^Environment:\s*(.*)$/, "Entorno: $1"],
    [/^Browser permission:\s*(.*)$/, "Permiso del navegador: $1"],
    [/^Connection Status:\s*(.*)$/, "Estado de conexión: $1"],
    [/^Authorized:\s*(.*)$/, "Autorizado: $1"],
    [/^(\d+) Accounts Found$/, "$1 cuentas encontradas"],
    [/^Paper Auto: (ON|OFF)$/, "Auto de prueba: $1"],
    [/^Live Auto: (ON|OFF)$/, "Auto real: $1"],
    [/^Live Broker: (.+)$/, "Bróker real: $1"],
    [/^Loading (EURUSD|XAUUSD) fundamental data\.$/, "Cargando datos fundamentales de $1."],
    [/^Loading (EURUSD|XAUUSD) fundamental insight…$/, "Cargando análisis fundamental de $1…"],
    [/^Fundamental insight unavailable(.*)$/, "Análisis fundamental no disponible$1"],
    [/^Showing last successful result • Refresh failed: (.+)$/, "Mostrando el último resultado válido • Error de actualización: $1"],
    [/^Currency affected: (.+)$/, "Moneda afectada: $1"],
    [/^Countdown: (.+)$/, "Cuenta regresiva: $1"],
    [/^(\d+) provisional evidence items?$/, "$1 elementos de evidencia provisionales"],
    [/^(\d+) recent provider warnings?$/, "$1 advertencias recientes del proveedor"],
    [/^Enabled( · .+)$/, "Activado$1"],
    [/^Disabled( · .+)$/, "Desactivado$1"],
    [/^Allowed: (.+)$/, "Permitido: $1"],
    [/^Loaded backend settings · (.+)$/, "Ajustes del backend cargados · $1"],
    [/^(\d+) unsaved changes?$/, "$1 cambios sin guardar"],
  ];
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(source)) return source.replace(pattern, replacement);
  }
  return source;
}

function isTranslatableUiText(text) {
  if (FULL_UI_TRANSLATIONS[text]) return true;
  const decorated = text.match(/^([^\p{L}\p{N}]*)([\s\S]+)$/u);
  if (decorated && decorated[1] && FULL_UI_TRANSLATIONS[decorated[2]]) return true;
  return [
    /% Confidence$/, /^Last update:/, /^Current mode:/, /^Active account:/,
    /^Environment:/, /^Browser permission:/, /^Connection Status:/,
    /^Authorized:/, /Accounts Found$/, /^Paper Auto:/, /^Live Auto:/,
    /^Live Broker:/, /^Loading (EURUSD|XAUUSD) fundamental/,
    /^Fundamental insight unavailable/, /^Showing last successful result/,
    /^Currency affected:/, /^Countdown:/, /provisional evidence item/,
    /recent provider warning/, /^(Enabled|Disabled) · /,
    /^Allowed:/, /^Loaded backend settings ·/, /unsaved changes?$/,
  ].some((pattern) => pattern.test(text));
}

function translateUiTextNode(node, lang) {
  if (!node || !node.parentElement || ["SCRIPT", "STYLE"].includes(node.parentElement.tagName)) return;
  const raw = node.nodeValue || "";
  const trimmed = raw.trim();
  let source = fullUiTextSources.get(node);
  if (!source) {
    if (!trimmed || !isTranslatableUiText(trimmed)) return;
    source = trimmed;
    fullUiTextSources.set(node, source);
  }
  const translated = translateDynamicUiText(source, lang);
  const leading = raw.match(/^\s*/)?.[0] || "";
  const trailing = raw.match(/\s*$/)?.[0] || "";
  const nextValue = `${leading}${translated}${trailing}`;
  if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
}

function translateUiSubtree(root, lang) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateUiTextNode(root, lang);
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateUiTextNode(node, lang);
    node = walker.nextNode();
  }
}

function translateUiAttributes(lang, root = document) {
  const selector = "input[placeholder], textarea[placeholder], [title], [aria-label]";
  const elements = [];
  if (root?.nodeType === Node.ELEMENT_NODE && root.matches?.(selector)) {
    elements.push(root);
  }
  root?.querySelectorAll?.(selector).forEach((element) => elements.push(element));
  elements.forEach((element) => {
    let sources = fullUiAttributeSources.get(element);
    if (!sources) {
      sources = {};
      ["placeholder", "title", "aria-label"].forEach((attribute) => {
        const value = element.getAttribute(attribute)?.trim();
        if (value && isTranslatableUiText(value)) sources[attribute] = value;
      });
      fullUiAttributeSources.set(element, sources);
    }
    Object.entries(sources).forEach(([attribute, source]) => {
      element.setAttribute(attribute, translateDynamicUiText(source, lang));
    });
  });
}

function translateFullInterface(lang) {
  const safeLang = ["en", "fr", "es"].includes(lang) ? lang : "en";
  document.documentElement.lang = safeLang;
  translateUiSubtree(document.body, safeLang);
  translateUiAttributes(safeLang);
  if (!fullUiTranslationObserver && document.body) {
    fullUiTranslationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          translateUiSubtree(node, currentLang);
          translateUiAttributes(currentLang, node);
        });
      });
    });
    fullUiTranslationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

function tTradeAction(signal) {
  const side = String(signal || "").trim().toUpperCase();
  if (side === "BUY" || side === "SELL") return side;
  return side;
}

let currentLang = localStorage.getItem("flowsignal_lang") || "en";
const TRADE_URL = `${BASE_URL}/execute-trade`;

const statusEl = document.getElementById("status");
const runtimeStatusDetail = document.getElementById("runtimeStatusDetail");
const mobileLiveStatusEl = document.querySelector(".mobile-live-status");
const utcLabel = document.getElementById("utcLabel");
const alertsToggle = document.getElementById("alertsToggle");
const strongToggle = document.getElementById("strongToggle");

const tradeModal = document.getElementById("tradeModal");
const tradeModalTitle = document.getElementById("tradeModalTitle");
const tradeModalText = document.getElementById("tradeModalText");
const tradeCancelBtn = document.getElementById("tradeCancelBtn");
const tradeConfirmBtn = document.getElementById("tradeConfirmBtn");

const viewToggleBtn = document.getElementById("viewToggleBtn");

const adminUnlockBtn = document.getElementById("adminUnlockBtn");
const adminModal = document.getElementById("adminModal");
const adminCodeInput = document.getElementById("adminCodeInput");
const adminCancelBtn = document.getElementById("adminCancelBtn");
const adminConfirmBtn = document.getElementById("adminConfirmBtn");

const feedbackBtn = document.getElementById("feedbackBtn");
const authScreen = document.getElementById("authScreen");

const accessCodeInput = document.getElementById("accessCode");
const accessBtn = document.getElementById("accessBtn");
const authMsg = document.getElementById("authMsg");
const mainApp = document.getElementById("mainApp");
const dashboardDailyPnl = document.getElementById("dashboardDailyPnl");
const dashboardWeeklyPnl = document.getElementById("dashboardWeeklyPnl");
const dashboardMonthlyPnl = document.getElementById("dashboardMonthlyPnl");
const dashboardFloatingPnl = document.getElementById("dashboardFloatingPnl");
const dashboardOpenTrades = document.getElementById("dashboardOpenTrades");
const dashboardPerformanceStrip = document.querySelector(".performance-strip");
const dashboardAdminCards = document.querySelectorAll(".performance-daily, .performance-weekly, .performance-monthly, .performance-floating, .performance-trades");
function isCompactPhoneView() {
  const widths = [
    window.innerWidth,
    window.outerWidth,
    document.documentElement?.clientWidth,
    window.visualViewport?.width
  ].filter((width) => Number.isFinite(width) && width > 0);
  return Math.min(...widths) <= 760;
}

const voiceToggleBtn = document.getElementById("voiceToggleBtn");
const menuAssistantBtn = document.getElementById("menuAssistantBtn");
const assistantModal = document.getElementById("assistantModal");
const closeAssistantPanelBtn = document.getElementById("closeAssistantPanelBtn");
const assistantPopupToggle = document.getElementById("assistantPopupToggle");
const flowAssistantSettings = document.getElementById("flowAssistantSettings");
const menuVoiceToggleBtn = document.getElementById("menuVoiceToggleBtn");
const voiceSelect = document.getElementById("voiceSelect");
const testVoiceBtn = document.getElementById("testVoiceBtn");
const voiceSpeed = document.getElementById("voiceSpeed");
const voiceSpeedValue = document.getElementById("voiceSpeedValue");
const voicePitch = document.getElementById("voicePitch");
const voicePitchValue = document.getElementById("voicePitchValue");
const assistantStyle = document.getElementById("assistantStyle");
const streamerVoiceList = document.getElementById("streamerVoiceList");
const streamerVoiceMenu = document.getElementById("streamerVoiceMenu");
const streamerVoiceToggle = document.getElementById("streamerVoiceToggle");
const streamerVoiceEditBtn = document.getElementById("streamerVoiceEditBtn");
const smartExplain = document.getElementById("smartExplain");
const smartExplainTitle = document.getElementById("smartExplainTitle");
const smartExplainSubtitle = document.getElementById("smartExplainSubtitle");
const smartExplainText = document.getElementById("smartExplainText");
const smartExplainDetails = document.getElementById("smartExplainDetails");
const smartExplainState = document.getElementById("smartExplainState");
const smartExplainClose = document.getElementById("smartExplainClose");

const openAccessBtn = document.getElementById("openAccessBtn");
const landingLang = document.getElementById("landingLang");

if (landingLang) {
  landingLang.value = currentLang.toUpperCase();

  landingLang.addEventListener("change", () => {
    const lang = landingLang.value.toLowerCase();

    localStorage.setItem("flowsignal_lang", lang);

    applyLanguage(lang);
    updateAssistantLanguageUI();
    refreshVoiceForCurrentLanguage();
    showAssistantMessage(
      assistantEventMessage("languageChanged"),
      "LANGUAGE"
    );
  });
}
const openAdminLoginBtn = document.getElementById("openAdminLoginBtn");
const adminLoginBox = document.getElementById("adminLoginBox");
const adminEmailInput = document.getElementById("adminEmailInput");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const closeAdminLoginBtn = document.getElementById("closeAdminLoginBtn");
const adminLoginMsg = document.getElementById("adminLoginMsg");
const closeAccessBtn = document.getElementById("closeAccessBtn");
const accessBox = document.getElementById("accessBox");
const landingPage = document.getElementById("landingPage");

function openUserAccessBox() {
  if (adminLoginBox) adminLoginBox.classList.add("hidden");
  if (accessBox) accessBox.classList.remove("hidden");
  setTimeout(() => accessCodeInput?.focus(), 50);
}

function openAdminLoginBox() {
  if (accessBox) accessBox.classList.add("hidden");
  if (adminLoginBox) adminLoginBox.classList.remove("hidden");
  setTimeout(() => adminEmailInput?.focus(), 50);
}

const accessModal = document.getElementById("accessModal");
const menuToggleBtn = document.getElementById("menuToggleBtn");
const sideMenu = document.getElementById("sideMenu");
const menuDashboardBtn = document.getElementById("menuDashboardBtn");
const menuFeedbackBtn = document.getElementById("menuFeedbackBtn");
const menuAdminBtn = document.getElementById("menuAdminBtn");
const menuViewBtn = document.getElementById("menuViewBtn");
const menuStatsBtn = document.getElementById("menuStatsBtn");
const menuAccessRequestsBtn = document.getElementById("menuAccessRequestsBtn");
const accessRequestsModal = document.getElementById("accessRequestsModal");
const closeAccessRequestsBtn = document.getElementById("closeAccessRequestsBtn");
const accessRequestsBody = document.getElementById("accessRequestsBody");
const accessRequestsStatus = document.getElementById("accessRequestsStatus");
const menuHistoryBtn = document.getElementById("menuHistoryBtn");
const menuSettingsBtn = document.getElementById("menuSettingsBtn");
const settingsSubmenu = document.getElementById("settingsSubmenu");
const menuGeneralSettingsBtn = document.getElementById("menuGeneralSettingsBtn");
const menuRiskSettingsBtn = document.getElementById("menuRiskSettingsBtn");
const menuNotificationsSettingsBtn = document.getElementById("menuNotificationsSettingsBtn");
const menuStrategySettingsBtn = document.getElementById("menuStrategySettingsBtn");
const menuBrokerAccountsBtn = document.getElementById("menuBrokerAccountsBtn");
const paperModal = document.getElementById("paperModal");
const closePaperBtn = document.getElementById("closePaperBtn");
const paperEurusdStatus = document.getElementById("paperEurusdStatus");
const paperGoldStatus = document.getElementById("paperGoldStatus");
const paperHistoryList = document.getElementById("paperHistoryList");
const paperAutoToggleBtn = document.getElementById("paperAutoToggleBtn");
const paperAutoSection = document.getElementById("paperAutoSection");
const liveAutoSection = document.getElementById("liveAutoSection");
const liveAutoToggleBtn = document.getElementById("liveAutoToggleBtn");
const brokerConnectionStatus = document.getElementById("brokerConnectionStatus");
const liveAutoConfirmOverlay = document.getElementById("liveAutoConfirmOverlay");
const liveAutoConfirmMessage = document.getElementById("liveAutoConfirmMessage");
const liveAutoConfirmCancel = document.getElementById("liveAutoConfirmCancel");
const liveAutoConfirmOk = document.getElementById("liveAutoConfirmOk");

const liveActiveList =
  document.getElementById(
    "liveActiveList"
  );

const liveHistoryList =
  document.getElementById(
    "liveHistoryList"
  );

const paperPageBtn =
  document.getElementById("paperPageBtn");

const livePageBtn =
  document.getElementById("livePageBtn");

let executionPage = "paper";

let paperAutoEnabled =
  localStorage.getItem("paper_auto_enabled") === "true";
let liveAutoEnabled =
  false;

let marketDataSourceStatus = null;
let livePrices = {};
let autoTradeStatus = null;
let liveAutoStatusBySymbol = {};

let liveConnectionState = {
  connected: false,
  mode: "broker"
};

function getLastSaturday5pmMs() {
  const now = new Date();

  const reset = new Date(now);
  reset.setHours(17, 0, 0, 0);

  const day = now.getDay();
  const daysSinceSaturday = (day + 1) % 7;

  reset.setDate(now.getDate() - daysSinceSaturday);

  if (now.getDay() === 6 && now < reset) {
    reset.setDate(reset.getDate() - 7);
  }

  return reset.getTime();
}

const RESET_KEY = "paper_reset_time";

function resetLegacyPaperLocalStorage() {
  const lastReset = Number(localStorage.getItem(RESET_KEY) || 0);
  const currentReset = getLastSaturday5pmMs();

  if (currentReset <= lastReset) return;

  let history = [];

  try {
    history = JSON.parse(
      localStorage.getItem("paper_trade_history") || "[]"
    );
  } catch (err) {
    history = [];
  }

  const keepOpenTrades = history.filter((t) => {
    const result = String(t.result || "").toUpperCase();
    const status = String(t.status || "").toUpperCase();

    return (
      result === "RUNNING" ||
      result === "TP1 HIT" ||
      status === "OPEN"
    );
  });

  localStorage.setItem(
    "paper_trade_history",
    JSON.stringify(keepOpenTrades)
  );

  localStorage.setItem(
    "paper_trade_stats",
    JSON.stringify({
      wins: 0,
      losses: 0,
      running: keepOpenTrades.length,
      total: keepOpenTrades.length
    })
  );

  localStorage.setItem(RESET_KEY, currentReset);

  console.log("PAPER LOCAL WEEKLY RESET:", {
    removed: history.length - keepOpenTrades.length,
    keptOpen: keepOpenTrades.length
  });
}

resetLegacyPaperLocalStorage();

let autoTradeFilter = "ALL";
const menuPaperBtn = document.getElementById("menuPaperBtn");

const statsModal = document.getElementById("statsModal");
const totalVisitorsCount = document.getElementById("totalVisitorsCount");
const closeStatsBtn = document.getElementById("closeStatsBtn");
const brokerAccountsModal = document.getElementById("brokerAccountsModal");
const brokerAccountsStatus = document.getElementById("brokerAccountsStatus");
const brokerAccountSelect = document.getElementById("brokerAccountSelect");
const brokerAccountList = document.getElementById("brokerAccountList");
const brokerAccountCount = document.getElementById("brokerAccountCount");
const brokerConnectedBadge = document.getElementById("brokerConnectedBadge");
const brokerAuthorizedText = document.getElementById("brokerAuthorizedText");
const activeBrokerAccountCard = document.getElementById("activeBrokerAccountCard");
const connectCtraderBtn = document.getElementById("connectCtraderBtn");
const disconnectCtraderBtn = document.getElementById("disconnectCtraderBtn");
const refreshCtraderAccountsBtn = document.getElementById("refreshCtraderAccountsBtn");
const setActiveCtraderAccountBtn = document.getElementById("setActiveCtraderAccountBtn");
const forgetCtraderAccountBtn = document.getElementById("forgetCtraderAccountBtn");
const clearAllBrokerAccountsBtn = document.getElementById("clearAllBrokerAccountsBtn");
const closeBrokerAccountsBtn = document.getElementById("closeBrokerAccountsBtn");
const uniqueVisitorsCount = document.getElementById("uniqueVisitorsCount");
const todayVisitsCount = document.getElementById("todayVisitsCount");
const lastVisitTime = document.getElementById("lastVisitTime");
const countryStats = document.getElementById("countryStats");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModalBtn = document.getElementById("closeSettingsModalBtn");
const settingsModalTitle = document.getElementById("settingsModalTitle");
const settingsModalSubtitle = document.getElementById("settingsModalSubtitle");
const generalSettingsPanel = document.getElementById("generalSettingsPanel");
const riskSettingsPanel = document.getElementById("riskSettingsPanel");
const notificationsSettingsPanel = document.getElementById("notificationsSettingsPanel");
const strategySettingsPanel = document.getElementById("strategySettingsPanel");
const strategySettingsLoadState = document.getElementById("strategySettingsLoadState");
const strategySaveBtn = document.getElementById("strategySaveBtn");
const strategyDiscardBtn = document.getElementById("strategyDiscardBtn");
const strategyRestoreBtn = document.getElementById("strategyRestoreBtn");
const strategyConfigSummary = document.getElementById("strategyConfigSummary");
const strategyUnsavedSummary = document.getElementById("strategyUnsavedSummary");
const strategyHistoryState = document.getElementById("strategyHistoryState");
const strategyHistoryList = document.getElementById("strategyHistoryList");
const strategyNewsModeSummary = document.getElementById("strategyNewsModeSummary");
const newsModeSaveBtn = document.getElementById("newsModeSaveBtn");
const newsModeSaveStatus = document.getElementById("newsModeSaveStatus");
const newsModeCurrentLabel = document.getElementById("newsModeCurrentLabel");
const newsModeAccount = document.getElementById("newsModeAccount");
const newsModeEnvironment = document.getElementById("newsModeEnvironment");
const newsModeConfirmModal = document.getElementById("newsModeConfirmModal");
const newsModeConfirmCancelBtn = document.getElementById("newsModeConfirmCancelBtn");
const newsModeConfirmEnableBtn = document.getElementById("newsModeConfirmEnableBtn");
const signalAlertsToggle = document.getElementById("signalAlertsToggle");
const generalSignalAlertsToggle = document.getElementById("generalSignalAlertsToggle");
const testSignalAlertBtn = document.getElementById("testSignalAlertBtn");
const notificationPermissionStatus = document.getElementById("notificationPermissionStatus");
const generalNotificationStatus = document.getElementById("generalNotificationStatus");

const DASHBOARD_PREFS_KEY = "flowsignal_dashboard_preferences";
const RISK_PREFS_KEY = "flowsignal_risk_preferences";
const SIGNAL_ALERTS_KEY = "soundEnabled";
const SESSION_TOKEN_KEY = "flowsignal_session_token";
const NEWS_MODE_VALUES = new Set(["OFF", "BLOCK_ONLY", "TRADE_CONFIRMED"]);
let confirmedNewsTradingMode = null;
let newsModeSaveInProgress = false;
let confirmedStrategySettings = null;
let draftStrategySettings = null;
let strategySettingsLimits = {};
let strategySettingsDefaults = {};
let strategyFixedRules = {};
let strategyHistoryItems = [];
let strategySettingsSaveInProgress = false;
// This state is read by early role/layout guards before the chart initializes.
let tradeVisualPriceLines = {
  EURUSD: {},
  XAUUSD: {},
};

function displayNewsMode(mode) {
  return String(mode || "OFF").replaceAll("_", " ");
}

function selectedNewsMode() {
  return document.querySelector('input[name="newsTradingMode"]:checked')?.value || null;
}

function setNewsModeSelection(mode) {
  document.querySelectorAll('input[name="newsTradingMode"]').forEach((input) => {
    input.checked = input.value === mode;
  });
}

function setNewsModeControlsDisabled(disabled) {
  document.querySelectorAll('input[name="newsTradingMode"]').forEach((input) => {
    input.disabled = Boolean(disabled);
  });
  if (newsModeSaveBtn) newsModeSaveBtn.disabled = true;
}

function setNewsModeStatus(message, state = "") {
  if (!newsModeSaveStatus) return;
  newsModeSaveStatus.textContent = message;
  newsModeSaveStatus.classList.toggle("is-success", state === "success");
  newsModeSaveStatus.classList.toggle("is-error", state === "error");
}

function applyConfirmedNewsMode(data, statusMessage = "") {
  const mode = NEWS_MODE_VALUES.has(data?.mode) ? data.mode : "OFF";
  confirmedNewsTradingMode = mode;
  setNewsModeSelection(mode);
  if (newsModeCurrentLabel) {
    newsModeCurrentLabel.textContent = `Current mode: ${displayNewsMode(mode)}`;
  }
  if (newsModeAccount) newsModeAccount.textContent = data?.active_account || "Not connected";
  if (newsModeEnvironment) {
    const environment = String(data?.broker_environment || "unknown");
    newsModeEnvironment.textContent = environment.charAt(0).toUpperCase() + environment.slice(1);
  }
  if (strategyNewsModeSummary) {
    strategyNewsModeSummary.textContent = `Current mode: ${displayNewsMode(mode)}`;
  }
  const badge = document.getElementById("news-trading-mode-badge");
  if (badge) badge.textContent = `NEWS MODE: ${displayNewsMode(mode)}`;
  setNewsModeControlsDisabled(false);
  if (newsModeSaveBtn) newsModeSaveBtn.disabled = true;
  if (statusMessage) setNewsModeStatus(statusMessage, "success");
}

function newsModeAuthHeaders() {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function hasLocalFlowSignalAccess() {
  let accessGrant = null;
  try {
    accessGrant = JSON.parse(localStorage.getItem("flowsignal_access") || "null");
  } catch (error) {
    accessGrant = null;
  }
  const role = localStorage.getItem("flowsignal_role");
  return Boolean(accessGrant?.granted || role === "user" || role === "admin");
}

async function establishFlowSignalSession(code = ACCESS_CODE) {
  if (!code) return false;
  try {
    const response = await fetch(`${BASE_URL}/session/access-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    if (!response.ok || !data.token) {
      window.FlowSignalStartup?.record("authentication_restore_failed", {
        status: response.status,
      });
      return false;
    }
    localStorage.setItem(SESSION_TOKEN_KEY, data.token);
    window.FlowSignalStartup?.record("authentication_restored", {
      role: data.role || "user",
      method: "backend_session",
    });
    return true;
  } catch (error) {
    console.error("FlowSignal backend session could not be established:", error);
    window.FlowSignalStartup?.record("authentication_restore_failed", {
      message: error.message,
    });
    return false;
  }
}

async function ensureFlowSignalSession(forceRefresh = false) {
  if (!forceRefresh && localStorage.getItem(SESSION_TOKEN_KEY)) return true;
  if (!hasLocalFlowSignalAccess()) return false;
  return establishFlowSignalSession(ACCESS_CODE);
}

async function authenticatedSettingsFetch(url, options = {}) {
  if (!await ensureFlowSignalSession()) return null;
  const send = () => fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...newsModeAuthHeaders() },
  });
  let response = await send();
  if (response.status === 401 && hasLocalFlowSignalAccess()) {
    window.FlowSignalStartup?.record("authentication_refresh_started");
    localStorage.removeItem(SESSION_TOKEN_KEY);
    if (await ensureFlowSignalSession(true)) response = await send();
  }
  return response;
}

function strategySettingInputs() {
  return Array.from(document.querySelectorAll("[data-strategy-setting]"));
}

function setStrategySettingsStatus(message, state = "") {
  if (!strategySettingsLoadState) return;
  strategySettingsLoadState.textContent = message;
  strategySettingsLoadState.classList.toggle("is-success", state === "success");
  strategySettingsLoadState.classList.toggle("is-error", state === "error");
  strategySettingsLoadState.classList.toggle("is-dirty", state === "dirty");
}

function setStrategySettingsControlsDisabled(disabled) {
  strategySettingInputs().forEach((input) => { input.disabled = Boolean(disabled); });
  document.querySelectorAll("[data-strategy-reset]").forEach((button) => {
    button.disabled = Boolean(disabled);
  });
  if (strategyRestoreBtn) strategyRestoreBtn.disabled = Boolean(disabled);
  syncStrategySettingsActions();
}

function strategySettingsDirty() {
  return strategySettingChanges().length > 0;
}

function editableStrategyKeys() {
  return strategySettingInputs().map((input) => input.dataset.strategySetting);
}

function strategySettingChanges() {
  if (!confirmedStrategySettings || !draftStrategySettings) return [];
  return editableStrategyKeys().filter(
    (key) => JSON.stringify(confirmedStrategySettings[key]) !== JSON.stringify(draftStrategySettings[key])
  );
}

function syncStrategySettingsActions() {
  const dirty = strategySettingsDirty();
  if (strategySaveBtn) {
    strategySaveBtn.disabled = strategySettingsSaveInProgress || !dirty;
  }
  if (strategyDiscardBtn) {
    strategyDiscardBtn.disabled = strategySettingsSaveInProgress || !dirty;
  }
}

function readStrategySettingInput(input) {
  const key = input.dataset.strategySetting;
  const definition = strategySettingsLimits[key] || {};
  if (definition.type === "boolean" || input.type === "checkbox") {
    return Boolean(input.checked);
  }
  const value = Number(input.value);
  return definition.type === "integer" ? Math.trunc(value) : value;
}

const STRATEGY_SETTING_LABELS = {
  minimum_rr: "Minimum RR",
  maximum_rr: "Maximum RR",
  bos_buffer_points: "Minimum BOS Buffer",
  minimum_sl_distance_points: "Minimum SL Distance",
  post_trade_cooldown_minutes: "Post Trade Cooldown",
  consolidation_filter_enabled: "Consolidation Filter",
};

function strategySettingLabel(key) {
  return translateDynamicUiText(STRATEGY_SETTING_LABELS[key] || key, currentLang);
}

function formatStrategySettingValue(key, value) {
  if (typeof value === "boolean") {
    return translateDynamicUiText(value ? "Enabled" : "Disabled", currentLang);
  }
  const definition = strategySettingsLimits[key] || {};
  const numeric = Number(value);
  const displayed = Number.isFinite(numeric)
    ? (definition.type === "number" ? numeric.toFixed(2) : String(numeric))
    : String(value ?? "--");
  const unit = definition.unit && !["R"].includes(definition.unit)
    ? ` ${translateDynamicUiText(definition.unit, currentLang)}`
    : "";
  return `${displayed}${unit}`;
}

function renderStrategyValueMetadata() {
  document.querySelectorAll("[data-strategy-value-meta]").forEach((element) => {
    const key = element.dataset.strategyValueMeta;
    const current = confirmedStrategySettings?.[key];
    const valueDefault = strategySettingsDefaults?.[key];
    const draft = draftStrategySettings?.[key];
    const changed = JSON.stringify(current) !== JSON.stringify(draft);
    const currentText = `${translateDynamicUiText("Current", currentLang)}: ${formatStrategySettingValue(key, current)}`;
    const defaultText = `${translateDynamicUiText("Default", currentLang)}: ${formatStrategySettingValue(key, valueDefault)}`;
    const draftText = changed
      ? ` · ${formatStrategySettingValue(key, current)} → ${formatStrategySettingValue(key, draft)}`
      : "";
    element.textContent = `${currentText} · ${defaultText}${draftText}`;
    element.classList.toggle("is-draft", changed);
  });
}

function renderStrategyUnsavedSummary() {
  if (!strategyUnsavedSummary) return;
  const changes = strategySettingChanges();
  strategyUnsavedSummary.classList.toggle("hidden", changes.length === 0);
  if (!changes.length) {
    strategyUnsavedSummary.innerHTML = "";
    return;
  }
  const countLabel = translateDynamicUiText(
    changes.length === 1 ? "1 unsaved change" : `${changes.length} unsaved changes`,
    currentLang,
  );
  strategyUnsavedSummary.innerHTML = `<strong>${countLabel}</strong>${changes.map((key) => (
    `<span><b>${strategySettingLabel(key)}</b><em>${formatStrategySettingValue(key, confirmedStrategySettings[key])} → ${formatStrategySettingValue(key, draftStrategySettings[key])}</em></span>`
  )).join("")}`;
}

function syncStrategySettingsPresentation() {
  renderStrategyConfigSummary(draftStrategySettings || {});
  renderStrategyValueMetadata();
  renderStrategyUnsavedSummary();
  syncStrategySettingsActions();
}

function resetStrategySettingDraft(key) {
  if (!draftStrategySettings || !(key in strategySettingsDefaults)) return false;
  draftStrategySettings[key] = strategySettingsDefaults[key];
  const input = strategySettingInputs().find(
    (candidate) => candidate.dataset.strategySetting === key
  );
  if (input) {
    if (input.type === "checkbox") input.checked = Boolean(draftStrategySettings[key]);
    else input.value = draftStrategySettings[key];
  }
  syncStrategySettingsPresentation();
  return true;
}

function renderStrategyConfigSummary(settings = {}) {
  if (!strategyConfigSummary) return;
  const yesNo = (value) => value ? "Enabled" : "Disabled";
  strategyConfigSummary.innerHTML = [
    ["RR", `${Number(settings.minimum_rr).toFixed(2)} – ${Number(settings.maximum_rr).toFixed(2)}`],
    ["Minimum BOS Buffer", `${settings.bos_buffer_points} points`],
    ["Minimum SL Distance", `${settings.minimum_sl_distance_points} points`],
    ["Consolidation Filter", yesNo(settings.consolidation_filter_enabled)],
    ["Post Trade Cooldown", `${settings.post_trade_cooldown_minutes} min`],
  ].map(([label, value]) => `<span>${translateDynamicUiText(label, currentLang)}<strong>${value}</strong></span>`).join("");
}

function renderFixedStrategyRules(rules = {}) {
  const ema = rules.ema_trend_filter || {};
  const values = {
    ema: `${ema.enabled === false ? "OFF" : "ON"} · EMA ${ema.fast_period ?? 9} / EMA ${ema.slow_period ?? 21}`,
    m15: rules.m15_closed_break_required === false ? "OPTIONAL" : "REQUIRED",
    m5: rules.later_m5_confirmation_required === false ? "OPTIONAL" : "REQUIRED",
    fresh_bos: rules.fresh_bos_after_consolidation_required === false ? "OPTIONAL" : "REQUIRED",
    atr: `${Math.round(Number(rules.atr_bos_buffer_fraction ?? 0.1) * 100)}% ATR${rules.atr_period ?? 14}`,
  };
  document.querySelectorAll("[data-fixed-rule]").forEach((element) => {
    element.textContent = translateDynamicUiText(values[element.dataset.fixedRule] || "--", currentLang);
  });
}

function renderStrategySettings(settings, limits = strategySettingsLimits) {
  draftStrategySettings = { ...(settings || {}) };
  strategySettingInputs().forEach((input) => {
    const key = input.dataset.strategySetting;
    const definition = limits[key] || {};
    if (definition.type === "boolean" || input.type === "checkbox") {
      input.checked = Boolean(draftStrategySettings[key]);
    } else {
      input.value = draftStrategySettings[key] ?? "";
      if (definition.min !== undefined) input.min = definition.min;
      if (definition.max !== undefined) input.max = definition.max;
      if (definition.step !== undefined) input.step = definition.step;
    }
    const range = document.querySelector(`[data-strategy-limit="${key}"]`);
    if (range && definition.min !== undefined && definition.max !== undefined) {
      const unit = definition.unit ? ` ${definition.unit}` : "";
      range.textContent = `Allowed: ${definition.min}–${definition.max}${unit}`;
    }
  });
  syncStrategySettingsPresentation();
}

function applyConfirmedStrategySettings(data, message = "") {
  confirmedStrategySettings = { ...(data?.current || {}) };
  strategySettingsLimits = { ...(data?.limits || {}) };
  strategySettingsDefaults = { ...(data?.defaults || {}) };
  strategyFixedRules = { ...(data?.fixed_rules || {}) };
  renderStrategySettings(confirmedStrategySettings, strategySettingsLimits);
  renderFixedStrategyRules(strategyFixedRules);
  setStrategySettingsControlsDisabled(false);
  const updated = data?.last_updated
    ? new Date(data.last_updated).toLocaleString()
    : "production defaults";
  setStrategySettingsStatus(message || `Loaded backend settings · ${updated}`, message ? "success" : "");
}

async function loadStrategySettings() {
  setStrategySettingsControlsDisabled(true);
  if (!hasLocalFlowSignalAccess()) {
    setStrategySettingsStatus("🔒 Sign in to view or change Strategy Settings.", "error");
    return false;
  }
  setStrategySettingsStatus("Loading strategy settings…");
  try {
    const response = await authenticatedSettingsFetch(`${BASE_URL}/strategy/settings`);
    if (!response) throw new Error("Could not establish the FlowSignal session.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not load strategy settings");
    applyConfirmedStrategySettings(data);
    return true;
  } catch (error) {
    setStrategySettingsControlsDisabled(true);
    setStrategySettingsStatus(error.message || "Could not load strategy settings", "error");
    return false;
  }
}

async function persistStrategySettings() {
  if (strategySettingsSaveInProgress || !strategySettingsDirty()) return;
  strategySettingsSaveInProgress = true;
  setStrategySettingsControlsDisabled(true);
  setStrategySettingsStatus("Saving strategy settings…");
  try {
    const response = await authenticatedSettingsFetch(`${BASE_URL}/strategy/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Request-Source": "flowsignal_web_app" },
      body: JSON.stringify({ settings: Object.fromEntries(
        editableStrategyKeys().map((key) => [key, draftStrategySettings[key]])
      ) }),
    });
    if (!response) throw new Error("🔒 Sign in to modify Strategy Settings.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not save strategy settings");
    applyConfirmedStrategySettings(data, "Strategy settings saved successfully.");
  } catch (error) {
    setStrategySettingsStatus(error.message || "Could not save strategy settings", "error");
  } finally {
    strategySettingsSaveInProgress = false;
    setStrategySettingsControlsDisabled(!confirmedStrategySettings);
  }
}

async function restoreStrategySettingsDefaults() {
  if (strategySettingsSaveInProgress) return;
  if (!window.confirm(translateDynamicUiText("Restore the original production strategy defaults?", currentLang))) return;
  strategySettingsSaveInProgress = true;
  setStrategySettingsControlsDisabled(true);
  setStrategySettingsStatus("Restoring production defaults…");
  try {
    const response = await authenticatedSettingsFetch(`${BASE_URL}/strategy/settings/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Request-Source": "flowsignal_web_app" },
      body: JSON.stringify({ confirm: true }),
    });
    if (!response) throw new Error("🔒 Sign in to modify Strategy Settings.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not restore defaults");
    applyConfirmedStrategySettings(data, "Production defaults restored.");
  } catch (error) {
    setStrategySettingsStatus(error.message || "Could not restore defaults", "error");
  } finally {
    strategySettingsSaveInProgress = false;
    setStrategySettingsControlsDisabled(!confirmedStrategySettings);
  }
}

function selectStrategySettingsTab(tabName) {
  document.querySelectorAll("[data-strategy-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.strategyTab === tabName);
  });
  document.querySelectorAll("[data-strategy-pane]").forEach((pane) => {
    pane.classList.toggle("hidden", pane.dataset.strategyPane !== tabName);
  });
  if (tabName === "news") loadNewsTradingMode();
  if (tabName === "history") loadStrategySettingsHistory();
}

async function loadStrategySettingsHistory() {
  if (!strategyHistoryState || !strategyHistoryList) return false;
  strategyHistoryState.textContent = translateDynamicUiText("Loading change history…", currentLang);
  strategyHistoryList.innerHTML = "";
  try {
    const response = await authenticatedSettingsFetch(`${BASE_URL}/strategy/settings/history?limit=50`);
    if (!response) throw new Error("🔒 Sign in to view or change Strategy Settings.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not load change history");
    strategyHistoryItems = Array.isArray(data.items) ? data.items : [];
    if (!strategyHistoryItems.length) {
      strategyHistoryState.textContent = translateDynamicUiText("No strategy changes have been saved yet.", currentLang);
      return true;
    }
    renderStrategySettingsHistory();
    return true;
  } catch (error) {
    strategyHistoryState.textContent = error.message || translateDynamicUiText("Could not load change history", currentLang);
    return false;
  }
}

function renderStrategySettingsHistory() {
  if (!strategyHistoryState || !strategyHistoryList || !strategyHistoryItems.length) return;
  strategyHistoryState.textContent = "";
  strategyHistoryList.innerHTML = strategyHistoryItems.map((item) => {
      const key = item.setting_name;
      const changedAt = item.changed_at ? new Date(item.changed_at).toLocaleString() : "--";
      return `<article><strong>${strategySettingLabel(key)}</strong><span>${formatStrategySettingValue(key, item.previous_value)} → ${formatStrategySettingValue(key, item.new_value)}</span><small>${changedAt}</small></article>`;
  }).join("");
}

async function loadNewsTradingMode() {
  setNewsModeControlsDisabled(true);
  if (!hasLocalFlowSignalAccess()) {
    confirmedNewsTradingMode = null;
    setNewsModeStatus("🔒 Sign in to modify News Trading Mode.", "error");
    return false;
  }
  setNewsModeStatus("Loading current mode…");
  try {
    const response = await authenticatedSettingsFetch(
      `${BASE_URL}/settings/news-trading-mode`
    );
    if (!response) throw new Error("Could not establish the FlowSignal session.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not load news trading mode");
    applyConfirmedNewsMode(data);
    setNewsModeStatus(`Loaded from ${displayNewsMode(data.source || "backend")}.`);
    return true;
  } catch (error) {
    setNewsModeControlsDisabled(true);
    setNewsModeStatus(error.message || "Could not load news trading mode", "error");
    return false;
  }
}

async function persistNewsTradingMode(mode) {
  if (newsModeSaveInProgress || !NEWS_MODE_VALUES.has(mode)) return;
  newsModeSaveInProgress = true;
  if (newsModeSaveBtn) {
    newsModeSaveBtn.disabled = true;
    newsModeSaveBtn.textContent = "Saving…";
  }
  setNewsModeStatus("Saving…");
  try {
    const response = await authenticatedSettingsFetch(`${BASE_URL}/settings/news-trading-mode`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Source": "flowsignal_web_app",
      },
      body: JSON.stringify({ mode }),
    });
    if (!response) throw new Error("🔒 Sign in to modify News Trading Mode.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not save news trading mode");
    applyConfirmedNewsMode(data, "Saved successfully");
    refreshNewsImpact(currentChartSymbol);
  } catch (error) {
    if (confirmedNewsTradingMode) setNewsModeSelection(confirmedNewsTradingMode);
    setNewsModeStatus(error.message || "Could not save news trading mode", "error");
  } finally {
    newsModeSaveInProgress = false;
    if (newsModeSaveBtn) {
      newsModeSaveBtn.textContent = "Save";
      newsModeSaveBtn.disabled = selectedNewsMode() === confirmedNewsTradingMode;
    }
  }
}
const DEFAULT_DASHBOARD_PREFS = {
  showDailyPnl: true,
  showWeeklyPnl: true,
  showMonthlyPnl: false,
  showFloatingPnl: true,
  showConfidence: true,
  showBuySellPct: true,
  showManualTradeButtons: false,
  showOpenTradesCounter: true,
  showPerformanceBar: true,
  showTradeLevels: true,
  showMarketStructurePanel: true,
  showRecentSignalHistory: true,
  showAccountBalance: true,
  showAccountNumber: true,
  showBrokerInfo: true,
};
const DEFAULT_RISK_PREFS = {
  riskPerTradePct: "1.00",
  maxDailyLoss: "",
  maxWeeklyLoss: "",
  maxOpenTrades: "1",
  tp1PercentOfTp2: "80",
  protectedSlPercentOfTp2: "50",
  breakEvenEnabled: true,
  allowedSymbols: "EURUSD,XAUUSD",
  defaultTradingMode: "PAPER",
};

function loadLocalObject(key, defaults) {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return { ...defaults };
  }
}

function saveLocalObject(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function signalAlertsEnabled() {
  return localStorage.getItem(SIGNAL_ALERTS_KEY) !== "false";
}

function setSignalAlertsEnabled(enabled) {
  const wasEnabled = signalAlertsEnabled();
  localStorage.setItem(SIGNAL_ALERTS_KEY, enabled ? "true" : "false");
  if (alertsToggle) alertsToggle.checked = enabled;
  if (signalAlertsToggle) signalAlertsToggle.checked = enabled;
  if (generalSignalAlertsToggle) generalSignalAlertsToggle.checked = enabled;
  if (enabled && !wasEnabled) {
    Object.keys(lastSignals).forEach((symbol) => {
      lastSignals[symbol] = null;
    });
  }
  updateNotificationPermissionStatus();
}

function updateNotificationPermissionStatus() {
  const enabled = signalAlertsEnabled();
  const permission = "Notification" in window ? Notification.permission : "unsupported";
  if (notificationPermissionStatus) {
    notificationPermissionStatus.textContent = `Browser permission: ${permission}`;
  }
  if (generalNotificationStatus) {
    generalNotificationStatus.textContent = !enabled
      ? "Notification status: Off"
      : permission === "granted"
        ? "Notification status: On · desktop and in-app alerts active"
        : permission === "denied"
          ? "Notification status: On · Chrome blocked; in-app alerts active"
          : permission === "default"
            ? "Notification status: On · allow Chrome permission; in-app alerts active"
            : "Notification status: On · in-app alerts active";
  }
}

function requestSignalNotificationPermission() {
  if (!("Notification" in window)) return Promise.resolve("unsupported");
  if (Notification.permission !== "default") {
    updateNotificationPermissionStatus();
    return Promise.resolve(Notification.permission);
  }

  return Notification.requestPermission().then((permission) => {
    updateNotificationPermissionStatus();
    return permission;
  });
}

function initializeSignalAlertSettings() {
  const enabled = signalAlertsEnabled();
  if (alertsToggle) alertsToggle.checked = enabled;
  if (signalAlertsToggle) signalAlertsToggle.checked = enabled;
  if (generalSignalAlertsToggle) generalSignalAlertsToggle.checked = enabled;
  updateNotificationPermissionStatus();
}

function applyDashboardPreferences() {
  const prefs = loadLocalObject(DASHBOARD_PREFS_KEY, DEFAULT_DASHBOARD_PREFS);
  const phoneView = isCompactPhoneView();
  document.body.classList.toggle("hide-daily-pnl", !prefs.showDailyPnl);
  document.body.classList.toggle("hide-weekly-pnl", !prefs.showWeeklyPnl);
  document.body.classList.toggle("hide-monthly-pnl", !phoneView && !prefs.showMonthlyPnl);
  document.body.classList.toggle("hide-floating-pnl", !phoneView && !prefs.showFloatingPnl);
  document.body.classList.toggle("hide-manual-trade-buttons", !prefs.showManualTradeButtons);
  document.body.classList.toggle("hide-open-trades-counter", !prefs.showOpenTradesCounter);
  document.body.classList.toggle("hide-performance-bar", !prefs.showPerformanceBar);
  document.body.classList.toggle("hide-trade-levels", !prefs.showTradeLevels);
  document.body.classList.toggle("hide-confidence-ui", !prefs.showConfidence);
  document.body.classList.toggle("hide-buy-sell-ui", !prefs.showBuySellPct);
  document.body.classList.toggle("hide-market-structure-ui", !prefs.showMarketStructurePanel);
  document.body.classList.toggle("hide-recent-history-ui", !prefs.showRecentSignalHistory);
  document.body.classList.toggle("hide-account-balance-ui", !prefs.showAccountBalance);
  document.body.classList.toggle("hide-account-number-ui", !prefs.showAccountNumber);
  document.body.classList.toggle("hide-broker-info-ui", !prefs.showBrokerInfo);

  if (prefs.showTradeLevels === false && chartModuleInitialized) {
    clearTradeLines("EURUSD");
    clearTradeLines("XAUUSD");
    clearTradeLevelDragLayer({ force: true });
  }

  document.querySelectorAll("[data-dashboard-pref]").forEach((input) => {
    input.checked = Boolean(prefs[input.dataset.dashboardPref]);
  });

  forcePhonePerformanceRow();
}

function forcePhonePerformanceRow() {
  const monthlyCard = document.querySelector(".performance-monthly");
  const floatingCard = document.querySelector(".performance-floating");
  const floatingLabel = floatingCard?.querySelector(".performance-copy span");

  if (!monthlyCard || !floatingCard) return;

  if (isCompactPhoneView()) {
    monthlyCard.style.setProperty("display", "none", "important");
    monthlyCard.style.setProperty("visibility", "hidden", "important");
    floatingCard.style.setProperty("display", "grid", "important");
    floatingCard.style.setProperty("visibility", "visible", "important");
    floatingCard.style.setProperty("order", "3", "important");
    if (floatingLabel) floatingLabel.textContent = "LIVE P/L";
  } else {
    monthlyCard.style.removeProperty("display");
    monthlyCard.style.removeProperty("visibility");
    floatingCard.style.removeProperty("display");
    floatingCard.style.removeProperty("visibility");
    floatingCard.style.removeProperty("order");
    if (floatingLabel) floatingLabel.textContent = "LIVE P/L (FLOATING)";
  }
}

function hydrateRiskSettings() {
  const prefs = loadLocalObject(RISK_PREFS_KEY, DEFAULT_RISK_PREFS);

  document.querySelectorAll("[data-risk-pref]").forEach((input) => {
    const key = input.dataset.riskPref;
    if (input.type === "checkbox") {
      input.checked = Boolean(prefs[key]);
    } else {
      input.value = prefs[key] ?? "";
    }
  });
}

function updateRiskSaveStatus(prefs, message = "") {
  const status = document.getElementById("riskSaveStatus");
  if (!status) return;

  const risk = Number(prefs?.riskPerTradePct || 0);
  const riskText = Number.isFinite(risk) ? risk.toFixed(2) : "--";

  status.textContent = message
    ? `${message} · Current risk: ${riskText}%`
    : `Current risk: ${riskText}%`;
}

function saveRiskSettingsFromInputs() {
  const prefs = loadLocalObject(RISK_PREFS_KEY, DEFAULT_RISK_PREFS);

  document.querySelectorAll("[data-risk-pref]").forEach((input) => {
    const key = input.dataset.riskPref;
    prefs[key] = input.type === "checkbox" ? input.checked : input.value;
  });

  saveLocalObject(RISK_PREFS_KEY, prefs);
  updateRiskSaveStatus(prefs, "Local saved");

  console.log("RISK_LOCAL_SAVE_DEBUG", prefs);

  return prefs;
}

async function loadRiskSettingsFromBackend() {
  try {
    const response = await fetch(`${BASE_URL}/settings/risk`);
    const data = await response.json();

    if (!response.ok || !data.ok || !data.risk) return;

    const prefs = {
      ...DEFAULT_RISK_PREFS,
      ...data.risk,
      // The legacy endpoint still reports 40 although production protection is
      // hard-coded at 50. Keep the UI honest until that field is wired later.
      protectedSlPercentOfTp2: DEFAULT_RISK_PREFS.protectedSlPercentOfTp2,
      allowedSymbols: Array.isArray(data.risk.allowedSymbols)
        ? data.risk.allowedSymbols.join(",")
        : data.risk.allowedSymbols,
    };
    saveLocalObject(RISK_PREFS_KEY, prefs);
    hydrateRiskSettings();
    updateRiskSaveStatus(prefs, "Loaded backend");

    console.log("RISK_BACKEND_LOAD_DEBUG", prefs);
    
  } catch (error) {
    console.error("Risk settings load failed:", error);
  }
}

let menuOpen = false;
let activeSettingsPage = null;

function closeAttachedMenuPage() {
  settingsModal?.classList.add("hidden");
  brokerAccountsModal?.classList.add("hidden");
  statsModal?.classList.add("hidden");
  assistantModal?.classList.add("hidden");
  paperModal?.classList.add("hidden");
  document.documentElement.classList.remove("paper-open");
  document.body.classList.remove("paper-open");
  activeSettingsPage = null;
  document.body.removeAttribute("data-active-settings-page");
}

function getActiveAttachedPageElement() {
  if (!activeSettingsPage) return null;
  if (activeSettingsPage === "broker-accounts") {
    return brokerAccountsModal?.querySelector(".broker-settings-content") || null;
  }
  if (activeSettingsPage === "performance") {
    return statsModal?.querySelector(".performance-modal-box") || null;
  }
  if (activeSettingsPage === "assistant") {
    return assistantModal?.querySelector(".assistant-modal-box") || null;
  }
  if (activeSettingsPage === "auto-trade") {
    return paperModal?.querySelector(".trade-modal-box") || null;
  }
  if (activeSettingsPage.startsWith("settings:")) {
    return settingsModal?.querySelector(".settings-modal-box") || null;
  }
  return null;
}

function setActiveSettingsPage(page) {
  activeSettingsPage = page || null;
  if (activeSettingsPage) {
    document.body.dataset.activeSettingsPage = activeSettingsPage;
  } else {
    document.body.removeAttribute("data-active-settings-page");
  }
}

function closeAllOverlays() {
  feedbackModal?.classList.add("hidden");
  statsModal?.classList.add("hidden");
  settingsModal?.classList.add("hidden");
  brokerAccountsModal?.classList.add("hidden");
  assistantModal?.classList.add("hidden");
  paperModal?.classList.add("hidden");
  closeTradeLevelConfirmation?.({ restore: false, reset: true });
  document.documentElement.classList.remove("paper-open");
  document.body.classList.remove("paper-open");
  setActiveSettingsPage(null);
}

function openSettingsPage(page = "general") {
  if (!settingsModal) return;
  if (page === "risk" && !isAdminAccount()) {
    page = "general";
  }
  closeAllOverlays();

  const panels = {
    general: generalSettingsPanel,
    risk: riskSettingsPanel,
    notifications: notificationsSettingsPanel,
    strategy: strategySettingsPanel,
  };

  Object.values(panels).forEach((panel) => panel?.classList.add("hidden"));
  panels[page]?.classList.remove("hidden");

  const titles = {
    general: ["General Settings", "Control what appears on your dashboard."],
    risk: ["Risk Settings", "Configure your risk limits. Changes apply to all instruments (EURUSD & Gold)."],
    notifications: ["Notifications", "Alert and notification controls."],
    strategy: ["Strategy", "Strategy profile controls."],
  };
  const copy = titles[page] || titles.general;

  if (settingsModalTitle) settingsModalTitle.textContent = copy[0];
  if (settingsModalSubtitle) settingsModalSubtitle.textContent = copy[1];

  applyDashboardPreferences();
  hydrateRiskSettings();
  if (page === "notifications") {
    initializeSignalAlertSettings();
  }
  if (page === "strategy") {
    selectStrategySettingsTab("parameters");
    loadStrategySettings();
    loadNewsTradingMode();
  }
  if (page === "risk") {
  const localPrefs = loadLocalObject(RISK_PREFS_KEY, DEFAULT_RISK_PREFS);
  updateRiskSaveStatus(localPrefs, "Loaded local");
  loadRiskSettingsFromBackend();
}
  settingsModal.classList.remove("hidden");
  setActiveSettingsPage(`settings:${page}`);
  setMainMenuOpen(true);
}

if (closeAccessBtn) {
  closeAccessBtn.addEventListener("click", () => {
    if (accessBox) accessBox.classList.add("hidden");
  });
}
// ==============================
// ACCESS CODE SYSTEM
// ==============================

const ACCESS_CODE = "FLOWTEST";
window.establishFlowSignalSession = establishFlowSignalSession;
window.loadNewsTradingMode = loadNewsTradingMode;
if (openAdminLoginBtn) {
  openAdminLoginBtn.addEventListener("click", () => {
    openAdminLoginBox();
  });
}

if (closeAdminLoginBtn) {
  closeAdminLoginBtn.addEventListener("click", () => {
    if (adminLoginBox) adminLoginBox.classList.add("hidden");
    if (adminLoginMsg) adminLoginMsg.textContent = "";
  });
}

if (adminLoginBtn) {
  adminLoginBtn.addEventListener("click", async () => {
    const email = adminEmailInput ? adminEmailInput.value.trim() : "";
    const password = adminPasswordInput ? adminPasswordInput.value.trim() : "";

    if (!email || !password) {
      if (adminLoginMsg) adminLoginMsg.textContent = "Enter email and password";
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.ok && data.role === "admin") {
        localStorage.setItem("flowsignal_access", JSON.stringify({
          granted: true,
          time: Date.now()
        }));
        localStorage.setItem("flowsignal_role", "admin");
        localStorage.setItem(SESSION_TOKEN_KEY, data.token);
        updatePnlVisibility();
        applyRoleVisibility();


      if (menuStatsBtn) {
          menuStatsBtn.classList.remove("hidden");
        }

        if (menuPaperBtn) {
          menuPaperBtn.classList.remove("hidden");
        }

        if (adminLoginBox) adminLoginBox.classList.add("hidden");

        if (landingPage) {
          landingPage.classList.add("hidden");
          landingPage.style.display = "none";
        }

        if (mainApp) {
          mainApp.classList.remove("hidden");
          mainApp.classList.remove("locked");
          mainApp.style.display = "flex";
        }

        setTimeout(() => {
          bootMainApp();
        }, 120);
      } else {
        if (adminLoginMsg) adminLoginMsg.textContent = "Invalid admin login";
      }
    } catch (err) {
      console.error(err);
      if (adminLoginMsg) adminLoginMsg.textContent = "Login failed";
    }
  });
}

if (closeAccessBtn) {
  closeAccessBtn.addEventListener("click", () => {
    if (accessBox) accessBox.classList.add("hidden");
    setAuthMessage("");
  });
}

if (accessBtn) {
  accessBtn.addEventListener("click", () => {
    const code = accessCodeInput?.value.trim();

    if (!code) {
      setAuthMessage("Enter access code", true);
      return;
    }

    console.log("INPUT:", code);
    console.log("EXPECTED:", ACCESS_CODE);

    if (code === ACCESS_CODE) {

  console.log("ACCESS GRANTED");

  localStorage.setItem("flowsignal_access", JSON.stringify({
    granted: true,
    time: Date.now()
  }));
  localStorage.setItem("flowsignal_role", "user");
  localStorage.removeItem("flowsignal_admin");
  updatePnlVisibility();
  applyRoleVisibility();

  setAuthMessage("");

  // CLOSE BOXES
  if (accessBox) accessBox.classList.add("hidden");
  if (adminLoginBox) adminLoginBox.classList.add("hidden");

  // HIDE LANDING PAGE (IMPORTANT)
  if (landingPage) {
    landingPage.classList.add("hidden");
    landingPage.style.display = "none";
  }

  // SHOW APP (VERY IMPORTANT)
  if (mainApp) {
    mainApp.classList.remove("hidden");
    mainApp.classList.remove("locked");
    mainApp.style.display = "flex";
  }
  applyRoleVisibility();

  setTimeout(() => {
    bootMainApp();
  }, 100);
    } else {
      setAuthMessage("Invalid code ❌", true);
    }
  });
}

if (accessCodeInput) {
  accessCodeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      accessBtn.click();
    }
  });
}


// =========================
// SMOOTH BAR ENGINE
// =========================
const _BAR_STATE = {};
let _BAR_ANIMATING = false;
let _BAR_IDLE_PHASE = 0;
let _BAR_IDLE_TIMER = null;

function animateBars() {
  let moving = false;

  Object.keys(_BAR_STATE).forEach((key) => {
    const s = _BAR_STATE[key];
    const diff = s.target - s.current;
    const isMoving = Math.abs(diff) >= 0.2;

    if (!isMoving) {
      s.current = s.target;
    } else {
      s.current += diff * 0.12;
      moving = true;
    }

    let visual = s.current;

    if (!isMoving) {
      const wave = Math.sin((_BAR_IDLE_PHASE + key.length) * 0.9) * 0.8;
      visual = Math.max(0, Math.min(100, s.current + wave));
    }

    const width = `${visual}%`;

    if (s.main) s.main.style.width = width;
    if (s.glow) s.glow.style.width = width;
  });

  if (moving) {
    requestAnimationFrame(animateBars);
  } else {
    _BAR_ANIMATING = false;
  }
}

function setSmoothBar(symbol, type, pct, immediate = false) {
  const key = `${symbol}_${type}`;

  const main = document.getElementById(`${symbol.toLowerCase()}-${type}-fill`);
  const glow = document.getElementById(`${symbol.toLowerCase()}-${type}-fill-glow`);

  if (!main && !glow) return;

  if (!_BAR_STATE[key]) {
    _BAR_STATE[key] = {
      current: pct,
      target: pct,
      main,
      glow
    };
  }

  const s = _BAR_STATE[key];
  s.main = main;
  s.glow = glow;
  s.target = pct;

  if (immediate) {
    s.current = pct;
    const width = `${pct}%`;
    if (main) main.style.width = width;
    if (glow) glow.style.width = width;
    return;
  }

  if (!_BAR_ANIMATING) {
    _BAR_ANIMATING = true;
    requestAnimationFrame(animateBars);
  }
}

const lastSignals = {
  EURUSD: null,
  XAUUSD: null
};

let pendingTrade = null;
let panelRefreshInProgress = false;
let isAdminUnlocked = false;
const ADMIN_CODE = "nathaux123";

function isAdminAccount() {
  const tabRole = String(
    window.FlowSignalTabRole?.get?.()
      || window.FlowSignalAuth?.user?.role
      || sessionStorage.getItem("flowsignal_tab_role")
      || localStorage.getItem("flowsignal_role")
      || ""
  ).toLowerCase();
  return tabRole === "admin";
}

function applyRoleVisibility() {
  const admin = isAdminAccount();
  const autoTradeLabel = menuPaperBtn?.querySelector(".menu-row-text");
  const autoTradePanelSubtitle = document.getElementById("autoTradePanelSubtitle");
  if (document.body) {
    document.body.dataset.userRole = admin ? "admin" : "user";
  }
  const setAdminOnlyVisible = (element, visible) => {
    if (!element) return;
    element.classList.toggle("hidden", !visible);
    element.setAttribute("aria-hidden", visible ? "false" : "true");
  };

  if (menuPaperBtn) {
    menuPaperBtn.classList.remove("hidden");
    menuPaperBtn.title = admin ? "Live Trading" : "Paper Auto Trade";
  }

  if (autoTradeLabel) {
    autoTradeLabel.textContent = admin ? "Live Trading" : "Paper Auto";
  }

  if (autoTradePanelSubtitle) {
    autoTradePanelSubtitle.textContent = admin
      ? "Manage paper and live automated trading."
      : "Manage paper automated trading.";
  }

  setAdminOnlyVisible(menuStatsBtn, admin);
  setAdminOnlyVisible(menuAccessRequestsBtn, admin);
  setAdminOnlyVisible(menuRiskSettingsBtn, admin);
  setAdminOnlyVisible(menuBrokerAccountsBtn, admin);
  setAdminOnlyVisible(livePageBtn, admin);
  setAdminOnlyVisible(liveAutoSection, admin);
  setAdminOnlyVisible(brokerConnectionStatus, admin);
  setAdminOnlyVisible(document.getElementById("liveActiveOrders"), admin);
  setAdminOnlyVisible(document.getElementById("liveAutoSymbolStatus"), admin);

  document.querySelectorAll(
    ".main-buttons-row, .entry-strategy-debug, .main-smc-panel, #tradeLevelDragLayer, #tradeLevelPreview, #tradeLevelConfirmModal"
  ).forEach((element) => {
    element.classList.toggle("hidden", !admin);
    element.setAttribute("aria-hidden", admin ? "false" : "true");
  });

  if (!admin && chartModuleInitialized) {
    clearTradeLines("EURUSD");
    clearTradeLines("XAUUSD");
    hideTradeLevelPreview?.();
    document.getElementById("tradeLevelConfirmModal")?.classList.add("hidden");
  }
  renderUserLiveAutoStatus();

  if (!admin && executionPage === "live") {
    executionPage = "paper";
  }

  if (!admin && settingsModal && !settingsModal.classList.contains("hidden")) {
    const activePage = document.body.dataset.activeSettingsPage || "";
    if (activePage === "settings:risk") {
      openSettingsPage("general");
    }
  }
}

window.applyRoleVisibility = applyRoleVisibility;

function updatePnlVisibility() {
  const showPnl = isAdminAccount();

  dashboardAdminCards.forEach((card) => {
    card.classList.toggle("admin-only-hidden", !showPnl);
  });

  if (dashboardPerformanceStrip) {
    dashboardPerformanceStrip.classList.toggle("user-no-pnl", !showPnl);
    dashboardPerformanceStrip.setAttribute("aria-hidden", showPnl ? "false" : "true");
    if (showPnl) {
      dashboardPerformanceStrip.style.removeProperty("display");
    } else {
      dashboardPerformanceStrip.style.setProperty("display", "none", "important");
    }
  }

  if (mainApp) {
    mainApp.classList.toggle("user-no-performance", !showPnl);
  }

  const livePnlCardRow = document.getElementById("livePnlCardRow");

  if (livePnlCardRow) {
    livePnlCardRow.classList.toggle("hidden", !showPnl);
  }
}

// Authentication is restored asynchronously by tab-role-session.js. Expose
// this refresh so the Owner desktop P/L strip is reapplied after that restore.
window.updatePnlVisibility = updatePnlVisibility;

function renderUserLiveAutoStatus() {
  const existing = document.getElementById("userLiveAutoStatus");

  if (isAdminAccount()) {
    existing?.remove();
    return;
  }

  const activeTrades = Object.entries(activeLiveOrders || {})
    .filter(([_, trade]) => trade && isLiveTradeActiveForDisplay(trade));

  if (!activeTrades.length) {
    existing?.remove();
    return;
  }

  const summary = activeTrades
    .map(([symbol, trade]) => {
      const side = String(trade?.side || trade?.action || "LIVE").toUpperCase();
      return `${symbol} ${side}`;
    })
    .join(" · ");

  const badge = existing || document.createElement("div");
  badge.id = "userLiveAutoStatus";
  badge.className = "user-live-auto-status";
  badge.textContent = `Live Auto running: ${summary}`;

  const topbar = document.querySelector(".topbar");
  if (topbar && !existing) {
    topbar.appendChild(badge);
  }
}

let latestRawPanelData = null;
let latestPanelFetchedAt = 0;
let lastGoodPanelData = null;
let latestPanelData = null;
let latestPanelMeta = {};
let lastLiveOrderKey = null;
let activeLiveOrders = {
  EURUSD: null,
  XAUUSD: null
};
let liveTradeHistory = [];
let liveTradeStats = {
  total_today: 0,
  wins: 0,
  losses: 0,
  running: 0,
  closed: 0,
  total_pl: 0,
  total_pnl: 0,
  daily_realized_pl: 0,
  daily_total_pl: 0,
  weekly_realized_pl: 0,
  monthly_realized_pl: 0,
  floating_live_pl: 0,
  weekly_total_pl: 0
};

const VOICE_COOLDOWN_MS = 10000;
const ASSISTANT_REPEAT_MS = 20000;
const ASSISTANT_CLICK_DEBOUNCE_MS = 320;
const VOICE_STORAGE = {
  enabled: "flowsignal_voice_enabled",
  name: "flowsignal_voice_name",
  rate: "flowsignal_voice_speed",
  pitch: "flowsignal_voice_pitch",
  style: "flowsignal_assistant_style",
  popup: "flowsignal_assistant_popup",
  streamerMessages: "flowsignal_streamer_voice_messages",
  streamerOpen: "flowsignal_streamer_voice_open"
};
const VOICE_DEFAULTS = {
  rate: 0.9,
  pitch: 1.05,
  volume: 1,
  style: "calm"
};
const VOICE_STYLE_TUNING = {
  calm: { rate: 1, pitch: 1 },
  confident: { rate: 1.02, pitch: 1 },
  hype: { rate: 1.08, pitch: 1.06 },
  professional: { rate: 1, pitch: 0.96 }
};
const VOICE_PREFERRED_NAMES = [
  "Google UK English Female",
  "Victoria",
  "Karen",
  "Google US English",
  "Alex"
];
const ASSISTANT_LOCALES = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES"
};
const ASSISTANT_COPY = {
  en: {
    panelTitle: "Flow Assistant",
    settings: "Voice Settings",
    voice: "Voice",
    testVoice: "Test Voice",
    showPopup: "Show text popup",
    speed: "Voice speed",
    pitch: "Voice pitch",
    style: "Assistant style",
    styles: ["Calm", "Confident", "Hype", "Professional"],
    stopVoice: "Stop Voice",
    closePanel: "Close Panel",
    voiceOn: "Voice ON",
    voiceOff: "Voice OFF",
    voiceOnMessage: "Perfect. I’ll keep you updated.",
    voiceOffMessage: "Okay, I’ll stay quiet.",
    testMessage: "Welcome back to FlowSignal. I'm watching the market for you.",
    wait: "{symbol} is waiting. No clean setup yet.",
    holdBuy: "The trend is still bullish, but the fresh entry is gone.",
    holdSell: "The trend is still bearish, but the fresh entry is gone.",
    freshBuy: "Okay... {symbol} has a fresh buy setup.",
    freshSell: "Careful... {symbol} has a fresh sell setup.",
    blocked: "Execution is blocked because {reason}.",
    blockedEvent: "{symbol} has a {side} signal, but execution is blocked because {reason}.",
    riskBlocked: "broker risk is {actual}, above the {maximum} limit",
    blockedReasons: {
      distance: "the minimum stop loss distance is not met",
      volume: "Live trade blocked because calculated volume or broker minimum volume would exceed your risk settings",
      running: "a trade is already running",
      disconnected: "the broker is disconnected",
      safety: "a safety check did not pass"
    },
    buyAutoOff: "{symbol} has a buy setup, but live auto is off.",
    sellAutoOff: "{symbol} has a sell setup, but live auto is off.",
    chart: "{symbol}, on the {timeframe} chart, is {direction}. I’m waiting for {waiting} before a trade.",
    waiting: {
      candle: "a clean confirmation candle",
      choch: "a confirmed change of character",
      bos: "a confirmed structure break",
      swing: "a closed candle beyond the swing level",
      structure: "a clean structure break and candle close"
    },
    executed: "{symbol} {side} trade confirmed. We’re in.",
    liveExecuted: "Live {side} executed on {symbol}. Entry, stop loss, and take profits are active.",
    activeTrade: "{symbol} has an active {side} trade.",
    tp1: "Nice. {symbol} reached the first target.",
    tp1Protected: "Nice. {symbol} reached the first target and stop loss is protected.",
    protected: "{symbol} stop loss is protected now.",
    win: "{symbol} trade closed in profit.",
    loss: "{symbol} trade closed in loss.",
    gold: "gold",
    euro: "euro dollar",
    directions: { bullish: "bullish", bearish: "bearish", sideways: "sideways", unclear: "unclear" },
    timeframes: { "5m": "five minute", "15m": "fifteen minute", "1h": "one hour" },
    languageChanged: "Language changed to English.",
    paperAuto: "Paper auto is {state}.",
    liveAuto: "Live auto is {state}.",
    on: "on",
    off: "off",
    assistant: "Assistant",
    manualBuy: "Okay... manual buy selected for {symbol}.",
    manualSell: "Okay... manual sell selected for {symbol}."
  },
  fr: {
    panelTitle: "Assistant Flow",
    settings: "Réglages de la voix",
    voice: "Voix",
    testVoice: "Tester la voix",
    showPopup: "Afficher la fenêtre de texte",
    speed: "Vitesse de la voix",
    pitch: "Tonalité de la voix",
    style: "Style de l’assistant",
    styles: ["Calme", "Assuré", "Énergique", "Professionnel"],
    stopVoice: "Arrêter la voix",
    closePanel: "Fermer",
    voiceOn: "Voix ACTIVÉE",
    voiceOff: "Voix DÉSACTIVÉE",
    voiceOnMessage: "Parfait. Je vous tiendrai au courant.",
    voiceOffMessage: "D’accord, je reste silencieux.",
    testMessage: "Bienvenue sur FlowSignal. Je surveille le marché pour vous.",
    wait: "{symbol} est en attente. Aucune configuration claire pour le moment.",
    holdBuy: "La tendance reste haussière, mais l’entrée récente est passée.",
    holdSell: "La tendance reste baissière, mais l’entrée récente est passée.",
    freshBuy: "D’accord... {symbol} présente une nouvelle configuration d’achat.",
    freshSell: "Attention... {symbol} montre maintenant une pression vendeuse.",
    blocked: "L’exécution est bloquée parce que {reason}.",
    blockedEvent: "{symbol} présente un signal de {side}, mais l’exécution est bloquée parce que {reason}.",
    riskBlocked: "le risque du courtier est de {actual}, au-dessus de la limite de {maximum}",
    blockedReasons: {
      distance: "la distance minimale du stop loss n’est pas respectée",
      volume: "la sécurité du volume du courtier a refusé le risque",
      running: "un trade est déjà en cours",
      disconnected: "le courtier est déconnecté",
      safety: "un contrôle de sécurité n’est pas validé"
    },
    buyAutoOff: "{symbol} présente un achat, mais le trading automatique réel est désactivé.",
    sellAutoOff: "{symbol} présente une vente, mais le trading automatique réel est désactivé.",
    chart: "{symbol}, sur le graphique de {timeframe}, est {direction}. J’attends {waiting} avant un trade.",
    waiting: {
      candle: "une bougie de confirmation claire",
      choch: "un changement de caractère confirmé",
      bos: "une cassure de structure confirmée",
      swing: "une clôture au-delà du niveau de swing",
      structure: "une cassure de structure avec clôture confirmée"
    },
    executed: "Trade {side} confirmé sur {symbol}. Nous sommes en position.",
    activeTrade: "{symbol} a un trade {side} actif.",
    tp1: "Bien. {symbol} a atteint le premier objectif.",
    tp1Protected: "Bien. {symbol} a atteint le premier objectif et le stop est protégé.",
    protected: "Le stop loss de {symbol} est maintenant protégé.",
    win: "Le trade sur {symbol} est clôturé en profit.",
    loss: "Le trade sur {symbol} est clôturé en perte.",
    gold: "l’or",
    euro: "l’euro dollar",
    directions: { bullish: "haussier", bearish: "baissier", sideways: "latéral", unclear: "incertain" },
    timeframes: { "5m": "cinq minutes", "15m": "quinze minutes", "1h": "une heure" },
    languageChanged: "La langue est maintenant le français.",
    paperAuto: "Le trading automatique papier est {state}.",
    liveAuto: "Le trading automatique réel est {state}.",
    on: "activé",
    off: "désactivé",
    assistant: "Assistant",
    manualBuy: "D’accord... achat manuel sélectionné pour {symbol}.",
    manualSell: "D’accord... vente manuelle sélectionnée pour {symbol}."
  },
  es: {
    panelTitle: "Asistente Flow",
    settings: "Ajustes de voz",
    voice: "Voz",
    testVoice: "Probar voz",
    showPopup: "Mostrar ventana de texto",
    speed: "Velocidad de voz",
    pitch: "Tono de voz",
    style: "Estilo del asistente",
    styles: ["Calmado", "Seguro", "Enérgico", "Profesional"],
    stopVoice: "Detener voz",
    closePanel: "Cerrar",
    voiceOn: "Voz ACTIVADA",
    voiceOff: "Voz DESACTIVADA",
    voiceOnMessage: "Perfecto. Te mantendré informado.",
    voiceOffMessage: "De acuerdo, me quedaré en silencio.",
    testMessage: "Bienvenido a FlowSignal. Estoy vigilando el mercado por ti.",
    wait: "{symbol} está en espera. Todavía no hay una configuración clara.",
    holdBuy: "La tendencia sigue alcista, pero la entrada reciente ya pasó.",
    holdSell: "La tendencia sigue bajista, pero la entrada reciente ya pasó.",
    freshBuy: "Bien... {symbol} muestra una nueva configuración de compra.",
    freshSell: "Cuidado... {symbol} muestra presión vendedora ahora.",
    blocked: "La ejecución está bloqueada porque {reason}.",
    blockedEvent: "{symbol} tiene una señal de {side}, pero la ejecución está bloqueada porque {reason}.",
    riskBlocked: "el riesgo del bróker es {actual}, por encima del límite de {maximum}",
    blockedReasons: {
      distance: "no se cumple la distancia mínima del stop loss",
      volume: "la seguridad de volumen del bróker rechazó el riesgo",
      running: "ya hay una operación activa",
      disconnected: "el bróker está desconectado",
      safety: "no se aprobó una comprobación de seguridad"
    },
    buyAutoOff: "{symbol} tiene una compra, pero el trading automático real está desactivado.",
    sellAutoOff: "{symbol} tiene una venta, pero el trading automático real está desactivado.",
    chart: "{symbol}, en el gráfico de {timeframe}, está {direction}. Estoy esperando {waiting} antes de operar.",
    waiting: {
      candle: "una vela de confirmación clara",
      choch: "un cambio de carácter confirmado",
      bos: "una ruptura de estructura confirmada",
      swing: "un cierre más allá del nivel de swing",
      structure: "una ruptura de estructura con cierre confirmado"
    },
    executed: "Operación de {side} confirmada en {symbol}. Ya estamos dentro.",
    activeTrade: "{symbol} tiene una operación de {side} activa.",
    tp1: "Bien. {symbol} alcanzó el primer objetivo.",
    tp1Protected: "Bien. {symbol} alcanzó el primer objetivo y el stop está protegido.",
    protected: "El stop loss de {symbol} ya está protegido.",
    win: "La operación de {symbol} cerró con ganancia.",
    loss: "La operación de {symbol} cerró con pérdida.",
    gold: "el oro",
    euro: "el euro dólar",
    directions: { bullish: "alcista", bearish: "bajista", sideways: "lateral", unclear: "indefinido" },
    timeframes: { "5m": "cinco minutos", "15m": "quince minutos", "1h": "una hora" },
    languageChanged: "El idioma cambió a español.",
    paperAuto: "El trading automático de prueba está {state}.",
    liveAuto: "El trading automático real está {state}.",
    on: "activado",
    off: "desactivado",
    assistant: "Asistente",
    manualBuy: "Bien... compra manual seleccionada para {symbol}.",
    manualSell: "Bien... venta manual seleccionada para {symbol}."
  }
};

const VOICE_EVENT_PRIORITY = {
  MARKET_CLOSED: 140,
  BROKER_DISCONNECTED: 130,
  BROKER_CONNECTED: 125,
  WIN: 110,
  LOSS: 110,
  TP2: 100,
  TP1: 95,
  PROTECTED: 90,
  EXECUTED: 85,
  BLOCKED: 80,
  HIGH_CONFIDENCE: 65,
  STRONG_MOMENTUM: 62,
  BUY: 60,
  SELL: 60,
  HOLD: 45,
  WAIT: 30,
  USER_ACTION: 20,
  APP_OPENED: 10
};

const VOICE_LIBRARY = {
  en: {
    brokerDisconnected: [
      "I've lost connection to the broker.",
      "Broker connection is unavailable right now."
    ],
    brokerConnected: [
      "Broker connection restored.",
      "We're connected again."
    ],
    marketClosed: [
      "The market is currently closed.",
      "I'll resume monitoring when the market reopens."
    ],
    executed: [
      "Trade confirmed. We're in.",
      "Position opened successfully.",
      "We have an active trade.",
      "Execution confirmed."
    ],
    activeTrade: [
      "{symbol} already has an active trade.",
      "{symbol} is already running a position.",
      "An active trade is already open on {symbol}."
    ],
    blocked: [
      "I found a setup, but I can't take it right now.",
      "The signal is there, but something is blocking execution.",
      "I see the opportunity, but a safety check stopped it.",
      "The setup looks valid, but execution isn't allowed yet."
    ],
    tp1: [
      "Nice. First target reached.",
      "TP1 has been secured.",
      "Good start. First target completed."
    ],
    protected: [
      "Stop loss is protected now.",
      "The trade is protected.",
      "We've locked in protection."
    ],
    tp2: [
      "Excellent. Final target reached.",
      "We got the full move.",
      "Target achieved."
    ],
    win: [
      "Trade closed in profit.",
      "Nice result.",
      "That one finished green.",
      "Another winning trade."
    ],
    loss: [
      "Trade closed at a loss.",
      "That one didn't work out.",
      "Small loss. We'll wait for the next setup."
    ],
    buySetup: [
      "Okay... {symbol} is starting to look bullish.",
      "I'm seeing a fresh buy opportunity on {symbol}.",
      "Momentum is building to the upside on {symbol}.",
      "{symbol} is getting interesting.",
      "We may have a buy developing on {symbol}."
    ],
    sellSetup: [
      "Careful... I'm seeing growing sell pressure on {symbol}.",
      "{symbol} is starting to lean bearish.",
      "A fresh sell setup is forming on {symbol}.",
      "Momentum is shifting to the downside on {symbol}.",
      "We may have a sell opportunity on {symbol}."
    ],
    highConfidence: [
      "This setup looks strong.",
      "Confidence is increasing.",
      "This one deserves attention."
    ],
    strongMomentum: [
      "Momentum is accelerating.",
      "This move is gaining strength.",
      "Pressure is building quickly."
    ],
    holdBuy: [
      "The trend is still bullish, but the entry is no longer fresh.",
      "I still like the direction, but we're a bit late now.",
      "The move is active, but I don't see a new entry.",
      "The trend remains healthy, but I need a fresh setup."
    ],
    holdSell: [
      "The trend is still bearish, but the entry is no longer fresh.",
      "The move is active, but we're late to the entry.",
      "I still like the downside, but I need a new setup."
    ],
    wait: [
      "{symbol} is waiting. No clean setup yet.",
      "Not ready yet. I need a little more confirmation.",
      "There's movement, but I don't have an entry yet.",
      "I'm staying patient on this one.",
      "Nothing actionable right now."
    ],
    liveAutoOn: [
      "Perfect. Live trading is active.",
      "I'm ready to execute valid setups.",
      "Live mode is on. I'll let you know when something appears."
    ],
    liveAutoOff: [
      "Live trading is off. I'll keep monitoring the market.",
      "No problem. I'll watch the market without trading.",
      "Live execution is disabled for now."
    ],
    paperAutoOn: [
      "Paper auto is active.",
      "Paper mode is ready to track valid setups."
    ],
    paperAutoOff: [
      "Paper auto is off.",
      "Paper mode is disabled for now."
    ],
    voiceOn: [
      "I'm back.",
      "Voice notifications are active.",
      "I'll keep you updated."
    ],
    voiceOff: [
      "Okay. I'll stay quiet.",
      "Understood. Voice notifications are off."
    ],
    languageChanged: [
      "Language updated.",
      "Your language preference has been changed."
    ],
    manualBuy: [
      "Manual buy selected.",
      "You've chosen a buy position."
    ],
    manualSell: [
      "Manual sell selected.",
      "You've chosen a sell position."
    ],
    goldClicked: [
      "I'm watching gold.",
      "Let's take a look at gold."
    ],
    euroClicked: [
      "I'm watching euro dollar.",
      "Let's take a look at euro dollar."
    ],
    appOpened: [
      "Welcome back. I'm watching the market for you.",
      "Good to see you again. Let's see what the market gives us.",
      "Everything is ready. I'm monitoring both markets."
    ]
  },
  fr: {
    brokerDisconnected: ["J'ai perdu la connexion au courtier.", "La connexion au courtier est indisponible."],
    brokerConnected: ["Connexion au courtier rétablie.", "Nous sommes reconnectés."],
    marketClosed: ["Le marché est actuellement fermé.", "Je reprendrai la surveillance à la réouverture."],
    executed: ["Trade confirmé. Nous sommes en position.", "Position ouverte avec succès.", "Nous avons un trade actif.", "Exécution confirmée."],
    activeTrade: ["{symbol} a déjà un trade actif.", "{symbol} a déjà une position en cours.", "Un trade actif est déjà ouvert sur {symbol}."],
    blocked: ["J'ai trouvé un setup, mais je ne peux pas le prendre maintenant.", "Le signal est là, mais quelque chose bloque l'exécution.", "Je vois l'opportunité, mais une sécurité l'a arrêtée.", "Le setup semble valide, mais l'exécution n'est pas encore autorisée."],
    tp1: ["Bien. Premier objectif atteint.", "TP1 est sécurisé.", "Bon départ. Premier objectif terminé."],
    protected: ["Le stop loss est maintenant protégé.", "Le trade est protégé.", "La protection est verrouillée."],
    tp2: ["Excellent. Objectif final atteint.", "Nous avons pris tout le mouvement.", "Objectif atteint."],
    win: ["Trade clôturé en profit.", "Beau résultat.", "Celui-là finit vert.", "Encore un trade gagnant."],
    loss: ["Trade clôturé en perte.", "Celui-là n'a pas fonctionné.", "Petite perte. Nous attendrons le prochain setup."],
    buySetup: ["D'accord... {symbol} commence à devenir haussier.", "Je vois une nouvelle opportunité d'achat sur {symbol}.", "Le momentum monte vers le haut sur {symbol}.", "{symbol} devient intéressant.", "Nous avons peut-être un achat en formation sur {symbol}."],
    sellSetup: ["Attention... je vois une pression vendeuse grandir sur {symbol}.", "{symbol} commence à pencher baissier.", "Une nouvelle vente se forme sur {symbol}.", "Le momentum bascule vers le bas sur {symbol}.", "Nous avons peut-être une vente sur {symbol}."],
    highConfidence: ["Ce setup semble solide.", "La confiance augmente.", "Celui-ci mérite de l'attention."],
    strongMomentum: ["Le momentum accélère.", "Ce mouvement prend de la force.", "La pression monte rapidement."],
    holdBuy: ["La tendance reste haussière, mais l'entrée n'est plus fraîche.", "J'aime encore la direction, mais nous sommes un peu en retard.", "Le mouvement est actif, mais je ne vois pas de nouvelle entrée.", "La tendance reste saine, mais il me faut un nouveau setup."],
    holdSell: ["La tendance reste baissière, mais l'entrée n'est plus fraîche.", "Le mouvement est actif, mais l'entrée est tardive.", "J'aime encore la baisse, mais il me faut un nouveau setup."],
    wait: ["{symbol} attend. Aucun setup clair pour le moment.", "Pas encore prêt. Il me faut un peu plus de confirmation.", "Il y a du mouvement, mais pas encore d'entrée.", "Je reste patient sur celui-ci.", "Rien d'actionnable pour le moment."],
    liveAutoOn: ["Parfait. Le trading réel est actif.", "Je suis prêt à exécuter les setups valides.", "Le mode réel est activé. Je vous dirai quand quelque chose apparaît."],
    liveAutoOff: ["Le trading réel est désactivé. Je continue de surveiller le marché.", "Aucun problème. Je surveille sans trader.", "L'exécution réelle est désactivée pour l'instant."],
    paperAutoOn: ["Le trading papier est actif.", "Le mode papier est prêt à suivre les setups valides."],
    paperAutoOff: ["Le trading papier est désactivé.", "Le mode papier est désactivé pour l'instant."],
    voiceOn: ["Je suis de retour.", "Les notifications vocales sont actives.", "Je vous tiendrai au courant."],
    voiceOff: ["D'accord. Je reste silencieux.", "Compris. Les notifications vocales sont désactivées."],
    languageChanged: ["Langue mise à jour.", "Votre préférence de langue a été modifiée."],
    manualBuy: ["Achat manuel sélectionné.", "Vous avez choisi une position acheteuse."],
    manualSell: ["Vente manuelle sélectionnée.", "Vous avez choisi une position vendeuse."],
    goldClicked: ["Je surveille l'or.", "Regardons l'or."],
    euroClicked: ["Je surveille l'euro dollar.", "Regardons l'euro dollar."],
    appOpened: ["Bon retour. Je surveille le marché pour vous.", "Content de vous revoir. Voyons ce que le marché donne.", "Tout est prêt. Je surveille les deux marchés."]
  },
  es: {
    brokerDisconnected: ["Perdí la conexión con el bróker.", "La conexión con el bróker no está disponible ahora."],
    brokerConnected: ["Conexión con el bróker restaurada.", "Estamos conectados otra vez."],
    marketClosed: ["El mercado está cerrado ahora.", "Volveré a vigilar cuando el mercado abra."],
    executed: ["Operación confirmada. Ya estamos dentro.", "Posición abierta correctamente.", "Tenemos una operación activa.", "Ejecución confirmada."],
    activeTrade: ["{symbol} ya tiene una operación activa.", "{symbol} ya tiene una posición en curso.", "Ya hay una operación abierta en {symbol}."],
    blocked: ["Encontré un setup, pero no puedo tomarlo ahora.", "La señal está ahí, pero algo bloquea la ejecución.", "Veo la oportunidad, pero una seguridad la detuvo.", "El setup parece válido, pero la ejecución todavía no está permitida."],
    tp1: ["Bien. Primer objetivo alcanzado.", "TP1 está asegurado.", "Buen inicio. Primer objetivo completado."],
    protected: ["El stop loss ya está protegido.", "La operación está protegida.", "Hemos bloqueado la protección."],
    tp2: ["Excelente. Objetivo final alcanzado.", "Tomamos todo el movimiento.", "Objetivo alcanzado."],
    win: ["Operación cerrada en ganancia.", "Buen resultado.", "Esta terminó en verde.", "Otra operación ganadora."],
    loss: ["Operación cerrada en pérdida.", "Esta no funcionó.", "Pérdida pequeña. Esperaremos el próximo setup."],
    buySetup: ["Bien... {symbol} empieza a verse alcista.", "Veo una nueva oportunidad de compra en {symbol}.", "El impulso sube hacia arriba en {symbol}.", "{symbol} se está poniendo interesante.", "Puede que tengamos una compra formándose en {symbol}."],
    sellSetup: ["Cuidado... veo presión vendedora creciendo en {symbol}.", "{symbol} empieza a inclinarse bajista.", "Se está formando una nueva venta en {symbol}.", "El impulso cambia hacia abajo en {symbol}.", "Puede que tengamos una venta en {symbol}."],
    highConfidence: ["Este setup se ve fuerte.", "La confianza está aumentando.", "Este merece atención."],
    strongMomentum: ["El impulso está acelerando.", "Este movimiento gana fuerza.", "La presión crece rápido."],
    holdBuy: ["La tendencia sigue alcista, pero la entrada ya no es fresca.", "Todavía me gusta la dirección, pero ya vamos tarde.", "El movimiento sigue activo, pero no veo una nueva entrada.", "La tendencia sigue sana, pero necesito un setup fresco."],
    holdSell: ["La tendencia sigue bajista, pero la entrada ya no es fresca.", "El movimiento sigue activo, pero llegamos tarde a la entrada.", "Todavía me gusta la baja, pero necesito un nuevo setup."],
    wait: ["{symbol} está esperando. No hay setup claro todavía.", "Aún no está listo. Necesito un poco más de confirmación.", "Hay movimiento, pero todavía no tengo entrada.", "Me mantengo paciente en este.", "Nada accionable por ahora."],
    liveAutoOn: ["Perfecto. Trading real activo.", "Estoy listo para ejecutar setups válidos.", "Modo real activado. Te avisaré cuando aparezca algo."],
    liveAutoOff: ["Trading real apagado. Seguiré vigilando el mercado.", "Sin problema. Vigilaré el mercado sin operar.", "La ejecución real está desactivada por ahora."],
    paperAutoOn: ["Paper auto está activo.", "El modo de prueba está listo para seguir setups válidos."],
    paperAutoOff: ["Paper auto está apagado.", "El modo de prueba está desactivado por ahora."],
    voiceOn: ["Estoy de vuelta.", "Las notificaciones de voz están activas.", "Te mantendré informado."],
    voiceOff: ["De acuerdo. Me quedaré en silencio.", "Entendido. Las notificaciones de voz están desactivadas."],
    languageChanged: ["Idioma actualizado.", "Tu preferencia de idioma ha cambiado."],
    manualBuy: ["Compra manual seleccionada.", "Elegiste una posición de compra."],
    manualSell: ["Venta manual seleccionada.", "Elegiste una posición de venta."],
    goldClicked: ["Estoy mirando oro.", "Veamos oro."],
    euroClicked: ["Estoy mirando euro dólar.", "Veamos euro dólar."],
    appOpened: ["Bienvenido de vuelta. Estoy vigilando el mercado por ti.", "Me alegra verte otra vez. Veamos qué nos da el mercado.", "Todo está listo. Estoy vigilando ambos mercados."]
  }
};
const speechSynthesisSupported =
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

const streamerVoiceTitles = {
  en: "Streamer Voice",
  fr: "Voix Streamer",
  es: "Voz Streamer"
};

const streamerVoiceHotkeyOrder = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  "space",
  "spaceDouble"
];

const streamerVoiceHotkeyLabels = {
  space: "Space",
  spaceDouble: "Space x2"
};

const streamerVoiceMessagesByLang = {
  en: {
    "1": "Welcome to FlowSignal, let’s watch the market together.",
    "2": "Please like the live if you enjoy the signals.",
    "3": "Follow the page so you don’t miss the next setup.",
    "4": "We are waiting for a clean opportunity.",
    "5": "No rush, patience is part of trading.",
    "6": "Let’s see if the market gives confirmation.",
    "7": "Drop your pair in the chat and I’ll check it.",
    "8": "What do you think, buy or sell?",
    "9": "Thanks for watching, I appreciate you.",
    "0": "Thank you guys.",
    space: "Thanks for the gift.",
    spaceDouble: "Thank you, I appreciate it."
  },
  fr: {
    "1": "Bienvenue sur FlowSignal, regardons le marché ensemble.",
    "2": "Mettez un like au live si vous aimez les signaux.",
    "3": "Suivez la page pour ne pas manquer le prochain setup.",
    "4": "Nous attendons une opportunité propre.",
    "5": "Pas de précipitation, la patience fait partie du trading.",
    "6": "Voyons si le marché donne une confirmation.",
    "7": "Envoyez votre paire dans le chat et je vais la regarder.",
    "8": "Vous pensez quoi, achat ou vente ?",
    "9": "Merci de regarder, je vous apprécie.",
    "0": "Merci à tous.",
    space: "Merci pour le cadeau.",
    spaceDouble: "Merci, j’apprécie vraiment."
  },
  es: {
    "1": "Bienvenidos a FlowSignal, vamos a mirar el mercado juntos.",
    "2": "Dale like al live si te gustan las señales.",
    "3": "Sigue la página para no perderte el próximo setup.",
    "4": "Estamos esperando una oportunidad limpia.",
    "5": "Sin prisa, la paciencia es parte del trading.",
    "6": "Veamos si el mercado da confirmación.",
    "7": "Deja tu par en el chat y lo reviso.",
    "8": "¿Qué piensan, compra o venta?",
    "9": "Gracias por mirar, se los agradezco.",
    "0": "Gracias a todos.",
    space: "Gracias por el regalo.",
    spaceDouble: "Gracias, lo aprecio mucho."
  }
};

function loadStreamerVoiceOverrides() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(VOICE_STORAGE.streamerMessages) || "{}"
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

function saveStreamerVoiceOverrides(overrides) {
  localStorage.setItem(
    VOICE_STORAGE.streamerMessages,
    JSON.stringify(overrides || {})
  );
}

function getStreamerVoiceOverridesForLang(lang = currentLang) {
  const overrides = loadStreamerVoiceOverrides();
  return overrides[lang] && typeof overrides[lang] === "object"
    ? overrides[lang]
    : {};
}

function setStreamerVoiceOverride(key, value) {
  const overrides = loadStreamerVoiceOverrides();
  const langOverrides = {
    ...(overrides[currentLang] || {})
  };
  const defaultValue =
    streamerVoiceMessagesByLang[currentLang]?.[key] ||
    streamerVoiceMessagesByLang.en[key] ||
    "";
  const cleanValue = String(value || "").trim();

  if (!cleanValue || cleanValue === defaultValue) {
    delete langOverrides[key];
  } else {
    langOverrides[key] = cleanValue;
  }

  overrides[currentLang] = langOverrides;
  saveStreamerVoiceOverrides(overrides);
}

const voiceState = {
  enabled:
    speechSynthesisSupported &&
    localStorage.getItem(VOICE_STORAGE.enabled) !== "false",
  initialized: false,
  snapshots: {},
  spokenFingerprints: new Set(),
  lastSpokenAt: {},
  pendingBySymbol: {},
  pendingTimers: {},
  eventSequence: 0,
  voices: [],
  selectedVoiceName: localStorage.getItem(VOICE_STORAGE.name) || "",
  selectedVoice: null,
  rate: Number(localStorage.getItem(VOICE_STORAGE.rate)) || VOICE_DEFAULTS.rate,
  pitch: Number(localStorage.getItem(VOICE_STORAGE.pitch)) || VOICE_DEFAULTS.pitch,
  style: localStorage.getItem(VOICE_STORAGE.style) || VOICE_DEFAULTS.style,
  popupEnabled: localStorage.getItem(VOICE_STORAGE.popup) !== "false",
  lastSpokenMessage: "",
  lastSpokenMessageAt: 0,
  lastLibraryMessage: "",
  lastAssistantMessage: "",
  lastAssistantSpokenAt: 0,
  systemSnapshot: null,
  interactionTimer: null
};

function assistantCopy(key, replacements = {}) {
  const copy = ASSISTANT_COPY[currentLang] || ASSISTANT_COPY.en;
  let value = copy[key] ?? ASSISTANT_COPY.en[key] ?? key;

  Object.entries(replacements).forEach(([name, replacement]) => {
    value = String(value).replaceAll(`{${name}}`, String(replacement));
  });

  return value;
}

function applyAssistantReplacements(value, replacements = {}) {
  let output = String(value || "");

  Object.entries(replacements).forEach(([name, replacement]) => {
    output = output.replaceAll(`{${name}}`, String(replacement));
  });

  return output;
}

function applyAssistantStyleText(message) {
  const text = String(message || "").trim();
  if (!text) return "";

  if (voiceState.style === "confident") {
    return text.startsWith("Confirmed:") ? text : `Confirmed: ${text}`;
  }

  if (voiceState.style === "hype") {
    return text.startsWith("Let's go.") ? text : `Let's go. ${text}`;
  }

  if (voiceState.style === "professional") {
    return text.startsWith("Market update:") ? text : `Market update: ${text}`;
  }

  return text;
}

function assistantLibraryLine(key, replacements = {}) {
  const library = VOICE_LIBRARY[currentLang] || VOICE_LIBRARY.en;
  const fallbackLibrary = VOICE_LIBRARY.en;
  const lines = library[key] || fallbackLibrary[key] || [assistantCopy(key)];
  const prepared = lines.map((line) => applyAssistantReplacements(line, replacements));
  let options = prepared.filter((line) => (
    line &&
    line !== voiceState.lastLibraryMessage &&
    line !== voiceState.lastSpokenMessage
  ));

  if (!options.length) {
    options = prepared.filter(Boolean);
  }

  const selected =
    options[Math.floor(Math.random() * options.length)] ||
    prepared[0] ||
    "";

  return applyAssistantStyleText(selected);
}

function trimSentencePunctuation(value) {
  return String(value || "").trim().replace(/[.!?]+$/g, "");
}

function assistantBlockedLine(reason = "") {
  const cleanReason = trimSentencePunctuation(reason);
  const base = trimSentencePunctuation(assistantLibraryLine("blocked"));
  const connector =
    currentLang === "fr" ? "parce que" :
    currentLang === "es" ? "porque" :
    "because";

  if (!cleanReason) return `${base}.`;

  return `${base} ${connector} ${cleanReason}.`;
}

function assistantEventMessage(key, replacements = {}) {
  return assistantLibraryLine(key, replacements);
}

function assistantLiveAutoOffReason() {
  return assistantCopy("liveAuto", {
    state: assistantCopy("off")
  }).toLowerCase();
}

function assistantSymbolClickMessage(symbol) {
  return assistantEventMessage(
    symbol === "XAUUSD" ? "goldClicked" : "euroClicked"
  );
}

function createVoiceFingerprint(base) {
  voiceState.eventSequence += 1;
  return `${base}:${voiceState.eventSequence}`;
}

function updateVoiceControls() {
  const supported = speechSynthesisSupported;

  [voiceToggleBtn, menuVoiceToggleBtn].forEach((button) => {
    if (!button) return;
    button.textContent = voiceState.enabled
      ? assistantCopy("voiceOn")
      : assistantCopy("voiceOff");
    button.classList.toggle("is-off", !voiceState.enabled);
    button.setAttribute("aria-pressed", String(voiceState.enabled));
    button.disabled = !supported;
  });
}

function findVoiceByName(voices, name) {
  const target = String(name || "").toLowerCase();
  if (!target) return null;

  return voices.find((voice) => voice.name.toLowerCase() === target)
    || voices.find((voice) => voice.name.toLowerCase().includes(target))
    || null;
}

function chooseAssistantVoice(voices) {
  const savedVoice = findVoiceByName(voices, voiceState.selectedVoiceName);
  const languagePrefix = (ASSISTANT_LOCALES[currentLang] || "en-US")
    .slice(0, 2)
    .toLowerCase();

  if (
    savedVoice &&
    String(savedVoice.lang || "").toLowerCase().startsWith(languagePrefix)
  ) {
    return savedVoice;
  }

  const languageVoices = voices.filter((voice) => (
    String(voice.lang || "").toLowerCase().startsWith(languagePrefix)
  ));

  for (const preferredName of VOICE_PREFERRED_NAMES) {
    const preferredVoice = findVoiceByName(voices, preferredName);
    if (
      preferredVoice &&
      String(preferredVoice.lang || "").toLowerCase().startsWith(languagePrefix)
    ) {
      return preferredVoice;
    }
  }

  return languageVoices[0] || null;
}

function refreshAssistantVoices() {
  if (!speechSynthesisSupported) return;

  const voices = window.speechSynthesis.getVoices();
  voiceState.voices = voices;
  voiceState.selectedVoice = chooseAssistantVoice(voices);

  if (
    voiceState.selectedVoice &&
    voiceState.selectedVoiceName !== voiceState.selectedVoice.name
  ) {
    voiceState.selectedVoiceName = voiceState.selectedVoice.name;
    localStorage.setItem(VOICE_STORAGE.name, voiceState.selectedVoiceName);
  }

  if (voiceSelect) {
    const previousValue = voiceState.selectedVoice?.name || "";
    voiceSelect.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Browser default";
    voiceSelect.appendChild(defaultOption);

    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name}${voice.lang ? ` · ${voice.lang}` : ""}`;
      voiceSelect.appendChild(option);
    });

    voiceSelect.value = previousValue;
  }
}

function configureAssistantUtterance(utterance) {
  refreshAssistantVoices();

  if (voiceState.selectedVoice) {
    utterance.voice = voiceState.selectedVoice;
  }

  const tuning = VOICE_STYLE_TUNING[voiceState.style]
    || VOICE_STYLE_TUNING.calm;
  utterance.lang = ASSISTANT_LOCALES[currentLang] || ASSISTANT_LOCALES.en;
  utterance.rate = Math.min(2, Math.max(0.1, voiceState.rate * tuning.rate));
  utterance.pitch = Math.min(2, Math.max(0, voiceState.pitch * tuning.pitch));
  utterance.volume = VOICE_DEFAULTS.volume;
}

function speakStreamerVoice(message) {
  if (!message || !speechSynthesisSupported) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  configureAssistantUtterance(utterance);
  window.speechSynthesis.speak(utterance);
}

function getStreamerVoiceMessages() {
  return {
    ...(streamerVoiceMessagesByLang[currentLang] || streamerVoiceMessagesByLang.en),
    ...getStreamerVoiceOverridesForLang(currentLang),
  };
}

function getStreamerVoiceMessage(key) {
  const messages = getStreamerVoiceMessages();
  return messages[key] || streamerVoiceMessagesByLang.en[key] || "";
}

let streamerSpacePressTimer = null;
let streamerVoiceEditMode = false;

function clearStreamerSpaceTimer() {
  if (!streamerSpacePressTimer) return;

  window.clearTimeout(streamerSpacePressTimer);
  streamerSpacePressTimer = null;
}

function handleStreamerSpaceHotkey() {
  if (streamerSpacePressTimer) {
    clearStreamerSpaceTimer();
    speakStreamerVoice(getStreamerVoiceMessage("spaceDouble"));
    return;
  }

  streamerSpacePressTimer = window.setTimeout(() => {
    streamerSpacePressTimer = null;
    speakStreamerVoice(getStreamerVoiceMessage("space"));
  }, 260);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderStreamerVoiceMenu() {
  if (!streamerVoiceList) return;

  const title = document.getElementById("streamerVoiceTitle");
  if (title) {
    title.textContent = streamerVoiceTitles[currentLang] || streamerVoiceTitles.en;
  }

  streamerVoiceList.innerHTML = streamerVoiceHotkeyOrder
    .map((key) => `
      <div class="streamer-voice-row">
        <kbd>${streamerVoiceHotkeyLabels[key] || key}</kbd>
        <input
          class="streamer-voice-input"
          type="text"
          value="${escapeHtml(getStreamerVoiceMessage(key))}"
          data-streamer-key="${key}"
          aria-label="Streamer voice ${streamerVoiceHotkeyLabels[key] || key}"
          ${streamerVoiceEditMode ? "" : "readonly"}
        >
      </div>
    `)
    .join("");
}

function updateStreamerVoiceEditMode() {
  streamerVoiceMenu?.classList.toggle("editing", streamerVoiceEditMode);
  if (streamerVoiceEditBtn) {
    streamerVoiceEditBtn.textContent = streamerVoiceEditMode ? "Done" : "Edit text";
    streamerVoiceEditBtn.classList.toggle("active", streamerVoiceEditMode);
  }

  streamerVoiceList
    ?.querySelectorAll(".streamer-voice-input")
    .forEach((input) => {
      input.toggleAttribute("readonly", !streamerVoiceEditMode);
    });
}

function setStreamerVoiceMenuOpen(open) {
  if (!streamerVoiceMenu || !streamerVoiceToggle) return;

  streamerVoiceMenu.classList.toggle("collapsed", !open);
  streamerVoiceToggle.setAttribute("aria-expanded", String(open));
  localStorage.setItem(VOICE_STORAGE.streamerOpen, open ? "true" : "false");
}

function initializeStreamerVoiceMenu() {
  setStreamerVoiceMenuOpen(
    localStorage.getItem(VOICE_STORAGE.streamerOpen) === "true"
  );
  streamerVoiceEditMode = false;
  updateStreamerVoiceEditMode();
}

streamerVoiceToggle?.addEventListener("click", () => {
  const isOpen = !streamerVoiceMenu?.classList.contains("collapsed");
  setStreamerVoiceMenuOpen(!isOpen);
});

streamerVoiceEditBtn?.addEventListener("click", () => {
  streamerVoiceEditMode = !streamerVoiceEditMode;
  setStreamerVoiceMenuOpen(true);
  updateStreamerVoiceEditMode();
});

streamerVoiceList?.addEventListener("input", (event) => {
  const input = event.target;
  if (!input?.matches?.(".streamer-voice-input")) return;
  if (!streamerVoiceEditMode) return;

  setStreamerVoiceOverride(input.dataset.streamerKey, input.value);
});

function isTypingInEditableField() {
  const active = document.activeElement;
  const tag = active?.tagName?.toLowerCase();

  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    Boolean(active?.isContentEditable)
  );
}

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (isTypingInEditableField()) return;

  if (event.code === "Space" || event.key === " ") {
    event.preventDefault();
    handleStreamerSpaceHotkey();
    return;
  }

  const message = getStreamerVoiceMessage(event.key);
  if (!message) return;

  event.preventDefault();
  clearStreamerSpaceTimer();
  speakStreamerVoice(message);
});

function initializeVoiceSettings() {
  if (!speechSynthesisSupported) {
    console.warn("Flow Assistant voice disabled: browser speechSynthesis is unavailable.");
    voiceToggleBtn?.closest(".voice-controls")?.classList.add("hidden");
    flowAssistantSettings?.classList.add("hidden");
    return;
  }

  if (voiceSpeed) voiceSpeed.value = String(voiceState.rate);
  if (voicePitch) voicePitch.value = String(voiceState.pitch);
  if (assistantStyle) assistantStyle.value = voiceState.style;
  if (assistantPopupToggle) {
    assistantPopupToggle.checked = voiceState.popupEnabled;
  }
  if (voiceSpeedValue) voiceSpeedValue.textContent = voiceState.rate.toFixed(2);
  if (voicePitchValue) voicePitchValue.textContent = voiceState.pitch.toFixed(2);

  renderStreamerVoiceMenu();
  initializeStreamerVoiceMenu();
  refreshAssistantVoices();
  window.speechSynthesis.addEventListener?.(
    "voiceschanged",
    refreshAssistantVoices
  );
  updateAssistantLanguageUI();
}

function updateAssistantLanguageUI() {
  const copy = ASSISTANT_COPY[currentLang] || ASSISTANT_COPY.en;
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("assistantModalTitle", copy.panelTitle);
  setText("flowAssistantSettingsTitle", copy.settings);
  setText("assistantVoiceLabel", copy.voice);
  setText("testVoiceBtn", copy.testVoice);
  setText("assistantPopupLabel", copy.showPopup);
  setText("assistantSpeedLabel", copy.speed);
  setText("assistantPitchLabel", copy.pitch);
  setText("assistantStyleLabel", copy.style);
  renderStreamerVoiceMenu();

  if (assistantStyle) {
    Array.from(assistantStyle.options).forEach((option, index) => {
      option.textContent = copy.styles[index] || option.textContent;
    });
  }

  updateVoiceControls();
}

function refreshVoiceForCurrentLanguage() {
  voiceState.selectedVoiceName = "";
  voiceState.selectedVoice = null;
  refreshAssistantVoices();
}

function clearPendingVoiceEvents() {
  Object.values(voiceState.pendingTimers).forEach((timer) => {
    window.clearTimeout(timer);
  });

  voiceState.pendingBySymbol = {};
  voiceState.pendingTimers = {};
}

function openAssistantPanel() {
  if (!assistantModal) return;

  assistantModal.classList.remove("hidden");
  setActiveSettingsPage("assistant");
  setMainMenuOpen(true);

  if (window.matchMedia("(max-width: 700px)").matches) {
    window.setTimeout(() => {
      setMainMenuOpen(false, { closeAttachedPage: false });
    }, 0);
  }
}

function closeAssistantPanel() {
  assistantModal?.classList.add("hidden");
  setMainMenuOpen(false);
}

function stopAssistantVoice() {
  if (speechSynthesisSupported) {
    window.speechSynthesis.cancel();
  }
  clearPendingVoiceEvents();
}

function speakVoiceEvent(event) {
  if (
    isForexWeekendClosed() &&
    String(event?.state || "").toUpperCase() !== "MARKET CLOSED"
  ) {
    return;
  }

  if (
    !voiceState.enabled ||
    !event?.message ||
    !speechSynthesisSupported ||
    voiceState.spokenFingerprints.has(event.fingerprint)
  ) {
    return;
  }

  const symbol = event.symbol || "SYSTEM";
  const now = Date.now();
  const repeatedTooSoon =
    event.message === voiceState.lastSpokenMessage &&
    now - voiceState.lastSpokenMessageAt < ASSISTANT_REPEAT_MS;

  if (repeatedTooSoon) return;

  const elapsed = now - (voiceState.lastSpokenAt[symbol] || 0);

  if (elapsed < VOICE_COOLDOWN_MS) {
    const currentPending = voiceState.pendingBySymbol[symbol];

    if (
      !currentPending ||
      currentPending.fingerprint === event.fingerprint ||
      event.priority >= currentPending.priority
    ) {
      voiceState.pendingBySymbol[symbol] = event;
    }

    window.clearTimeout(voiceState.pendingTimers[symbol]);
    voiceState.pendingTimers[symbol] = window.setTimeout(() => {
      const pending = voiceState.pendingBySymbol[symbol];

      delete voiceState.pendingBySymbol[symbol];
      delete voiceState.pendingTimers[symbol];

      if (pending) speakVoiceEvent(pending);
    }, VOICE_COOLDOWN_MS - elapsed + 50);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(event.message);
  configureAssistantUtterance(utterance);

  window.speechSynthesis.cancel();
  renderAssistantPopup(event.message, event.state || "UPDATE", {
    symbol,
    subtitle: getAssistantSubtitle(symbol)
  });
  voiceState.spokenFingerprints.add(event.fingerprint);
  voiceState.lastSpokenAt[symbol] = now;
  voiceState.lastSpokenMessage = event.message;
  voiceState.lastSpokenMessageAt = now;
  voiceState.lastLibraryMessage = event.message;
  window.speechSynthesis.speak(utterance);
}

function queueVoiceEvents(events) {
  const bestBySymbol = new Map();

  events.forEach((event) => {
    if (!event || voiceState.spokenFingerprints.has(event.fingerprint)) return;

    const symbol = event.symbol || "SYSTEM";
    const current = bestBySymbol.get(symbol);

    if (!current || event.priority > current.priority) {
      bestBySymbol.set(symbol, event);
    }
  });

  const selected = Array.from(bestBySymbol.values())
    .sort((left, right) => right.priority - left.priority)[0];

  if (selected) speakVoiceEvent(selected);
}

function normalizeVoiceSignal(item) {
  const signal = String(item?.signal || "WAIT").trim().toUpperCase();
  return signal === "BUY" || signal === "SELL" ? signal : "WAIT";
}

function getSpokenSymbol(symbol) {
  return symbol === "XAUUSD"
    ? assistantCopy("gold")
    : assistantCopy("euro");
}

function getAssistantSubtitle(symbol, timeframe = "") {
  const symbolName = symbol === "XAUUSD"
    ? (currentLang === "en" ? "Gold" : currentLang === "fr" ? "Or" : "Oro")
    : (currentLang === "es" ? "Euro Dólar" : "Euro Dollar");

  return timeframe
    ? `${symbolName} · ${timeframe}`
    : `${symbolName} ${assistantCopy("assistant")}`;
}

function getAssistantDisplaySymbol(symbol) {
  return symbol === "XAUUSD" ? "XAUUSD" : "EURUSD";
}

function getLocalizedTradeSide(side) {
  const normalized = String(side || "").toUpperCase();

  if (currentLang === "fr") return normalized === "SELL" ? "vente" : "achat";
  if (currentLang === "es") return normalized === "SELL" ? "venta" : "compra";
  return normalized === "SELL" ? "sell" : "buy";
}

function getVoiceBlockedReason(status) {
  const reason = getShortAutoTradeReason(status)
    .replace(/\bTrade not sent\.?/gi, "")
    .trim();
  const lower = reason.toLowerCase();
  const copy = ASSISTANT_COPY[currentLang] || ASSISTANT_COPY.en;

  if (lower.includes("min") && lower.includes("distance")) {
    return copy.blockedReasons.distance;
  }

  if (lower.includes("volume") || lower.includes("risk")) {
    return copy.blockedReasons.volume;
  }

  if (lower.includes("already running") || lower.includes("already active")) {
    return copy.blockedReasons.running;
  }

  if (lower.includes("disconnect")) {
    return copy.blockedReasons.disconnected;
  }

  return (reason || copy.blockedReasons.safety)
    .split(/[.!?]/)[0]
    .trim()
    .toLowerCase();
}

function getVoiceBlockedExplanation(status) {
  const shortReason = getVoiceBlockedReason(status);
  const details = getAutoTradeDetails(status);
  const actualRisk =
    details.final_risk_percent ??
    details.risk_percent_if_minimum ??
    details.minimum_volume_risk_percent;
  const maximumRisk =
    details.maximum_allowed_risk_percent ??
    details.required_risk_percent ??
    details.risk_percent;
  const actualRiskText = formatRiskPercent(actualRisk);
  const maximumRiskText = formatRiskPercent(maximumRisk);

  if (
    (
      shortReason === ASSISTANT_COPY.en.blockedReasons.volume ||
      shortReason === ASSISTANT_COPY.fr.blockedReasons.volume ||
      shortReason === ASSISTANT_COPY.es.blockedReasons.volume
    ) &&
    actualRiskText &&
    maximumRiskText
  ) {
    return assistantCopy("riskBlocked", {
      actual: actualRiskText,
      maximum: maximumRiskText
    });
  }

  return shortReason;
}

function getVoiceTradeKey(trade, fallback = "") {
  return String(
    getLiveTradeMatchId(trade) ||
    trade?.trade_id ||
    `${fallback}:${getTradeTimestampMs(trade) || "unknown"}`
  );
}

function wasActiveTradeAnnounced(tradeKey) {
  if (!tradeKey) return false;

  try {
    return sessionStorage.getItem(`flowsignal_voice_active_${tradeKey}`) === "true";
  } catch (error) {
    return false;
  }
}

function markActiveTradeAnnounced(tradeKey) {
  if (!tradeKey) return;

  try {
    sessionStorage.setItem(`flowsignal_voice_active_${tradeKey}`, "true");
  } catch (error) {
    // Session storage is optional; voice still works without persistence.
  }
}

function buildVoiceSnapshot(symbol, data, meta) {
  const autoStatus = meta?.live_auto_status_by_symbol?.[symbol] || {};
  const autoState = String(autoStatus.status || "").toUpperCase();
  const possibleActiveTrade = meta?.live_active_orders?.[symbol] || null;
  const activeTrade = (
    ["", "broker", "ctrader"].includes(
      String(possibleActiveTrade?.source || "").toLowerCase()
    ) &&
    hasRealLiveBrokerId(possibleActiveTrade) &&
    isLiveTradeActiveForDisplay(possibleActiveTrade)
  )
    ? possibleActiveTrade
    : null;
  const activeTradeKey = activeTrade ? getVoiceTradeKey(activeTrade, symbol) : "";
  const history = Array.isArray(meta?.live_trade_history)
    ? meta.live_trade_history
    : [];
  const closedTrades = history
    .filter((trade) => (
      String(trade?.symbol || "").toUpperCase() === symbol &&
      !isLiveTradeActiveForDisplay(trade)
    ))
    .map((trade) => {
      const result = getLiveTradeResult(trade);
      const pnl = getLiveTradePnl(trade);

      return {
        key: getVoiceTradeKey(trade, symbol),
        result,
        pnl
      };
    });

  return {
    rawSignal: String(data?.[symbol]?.signal || "WAIT").trim().toUpperCase(),
    signal: normalizeVoiceSignal(data?.[symbol]),
    autoState,
    liveAutoEnabled:
      typeof meta?.live_auto_enabled === "boolean"
        ? meta.live_auto_enabled
        : Boolean(liveAutoEnabled),
    autoReason: getVoiceBlockedExplanation(autoStatus),
    autoFingerprint: [
      autoState,
      autoStatus.signal || autoStatus.action || "",
      stringifyAutoTradeValue(autoStatus.reason)
    ].join("|"),
    confidence: Number(data?.[symbol]?.confidence ?? 0),
    momentumScore: Math.max(
      Number(data?.[symbol]?.displacement_score ?? 0),
      Number(data?.[symbol]?.momentum_score ?? 0),
      Number(data?.[symbol]?.volume_score ?? 0)
    ),
    activeTradeKey,
    activeTradeSide: String(
      activeTrade?.side || activeTrade?.action || ""
    ).toUpperCase(),
    tp1Hit: Boolean(
      activeTrade?.hit_tp1 ||
      getLiveTradeResult(activeTrade) === "TP1 HIT" ||
      hasConfirmedProfitProtection(activeTrade)
    ),
    tp2Hit: Boolean(
      activeTrade?.hit_tp2 ||
      getLiveTradeResult(activeTrade) === "TP2 HIT" ||
      getLiveTradeResult(activeTrade) === "TARGET HIT"
    ),
    protectedSl: hasConfirmedProfitProtection(activeTrade),
    closedTrades
  };
}

function isForexWeekendClosed(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const day = values.weekday;
  const minutes = (Number(values.hour) * 60) + Number(values.minute);
  const closeMinutes = 17 * 60;

  return (
    day === "Sat" ||
    (day === "Fri" && minutes >= closeMinutes) ||
    (day === "Sun" && minutes < closeMinutes)
  );
}

function isPanelMarketClosed(rawData) {
  if (isForexWeekendClosed()) {
    return true;
  }

  if (typeof rawData?.market_closed === "boolean") {
    return rawData.market_closed;
  }

  const feedStatuses = Object.values(rawData?.feed_status || {});
  return (
    feedStatuses.length > 0 &&
    feedStatuses.every((status) => Boolean(status?.market_closed))
  );
}

function buildVoiceSystemSnapshot(meta, rawData) {
  const marketClosed = isPanelMarketClosed(rawData);
  const brokerKnown = Boolean(meta?.live_account);
  const brokerConnected = brokerKnown
    ? Boolean(meta.live_account.connected)
    : null;

  return {
    brokerKnown,
    brokerConnected,
    marketClosed
  };
}

function buildVoiceSystemEvents(meta, rawData) {
  const next = buildVoiceSystemSnapshot(meta, rawData);
  const previous = voiceState.systemSnapshot;
  const events = [];

  if (!voiceState.initialized || !previous) {
    if (next.marketClosed) {
      events.push({
        symbol: "SYSTEM",
        state: "MARKET CLOSED",
        priority: VOICE_EVENT_PRIORITY.MARKET_CLOSED,
        fingerprint: "system:market-closed:initial",
        message: assistantEventMessage("marketClosed")
      });
      return { snapshot: next, events };
    }

    events.push({
      symbol: "SYSTEM",
      state: "APP",
      priority: VOICE_EVENT_PRIORITY.APP_OPENED,
      fingerprint: "system:app-opened",
      message: assistantEventMessage("appOpened")
    });

    if (next.brokerKnown && next.brokerConnected === false) {
      events.push({
        symbol: "SYSTEM",
        state: "BROKER",
        priority: VOICE_EVENT_PRIORITY.BROKER_DISCONNECTED,
        fingerprint: "system:broker-disconnected:initial",
        message: assistantEventMessage("brokerDisconnected")
      });
    }

    return { snapshot: next, events };
  }

  if (next.marketClosed) {
    if (!previous.marketClosed) {
      events.push({
        symbol: "SYSTEM",
        state: "MARKET CLOSED",
        priority: VOICE_EVENT_PRIORITY.MARKET_CLOSED,
        fingerprint: `system:market-closed:${Date.now()}`,
        message: assistantEventMessage("marketClosed")
      });
    }
    return { snapshot: next, events };
  }

  if (
    next.brokerKnown &&
    previous.brokerConnected !== null &&
    next.brokerConnected !== previous.brokerConnected
  ) {
    const connected = Boolean(next.brokerConnected);
    events.push({
      symbol: "SYSTEM",
      state: "BROKER",
      priority: connected
        ? VOICE_EVENT_PRIORITY.BROKER_CONNECTED
        : VOICE_EVENT_PRIORITY.BROKER_DISCONNECTED,
      fingerprint: `system:broker:${connected ? "connected" : "disconnected"}:${Date.now()}`,
      message: assistantEventMessage(
        connected ? "brokerConnected" : "brokerDisconnected"
      )
    });
  }

  return { snapshot: next, events };
}

function processVoiceAnnouncements(data, meta, rawData = null) {
  const symbols = ["EURUSD", "XAUUSD"];
  const nextSnapshots = {};
  const system = buildVoiceSystemEvents(meta, rawData);
  const events = [...system.events];

  if (system.snapshot.marketClosed) {
    voiceState.snapshots = nextSnapshots;
    voiceState.systemSnapshot = system.snapshot;
    voiceState.initialized = true;

    if (events.length) {
      queueVoiceEvents(events);
    }
    return;
  }

  symbols.forEach((symbol) => {
    const next = buildVoiceSnapshot(symbol, data, meta);
    const previous = voiceState.snapshots[symbol];
    nextSnapshots[symbol] = next;

    if (!voiceState.initialized || !previous) {
      if (
        next.activeTradeKey &&
        !wasActiveTradeAnnounced(next.activeTradeKey)
      ) {
        markActiveTradeAnnounced(next.activeTradeKey);
        events.push({
          symbol,
          state: "EXECUTED",
          priority: VOICE_EVENT_PRIORITY.EXECUTED,
          fingerprint: `${symbol}:executed:${next.activeTradeKey}`,
          message: assistantEventMessage("liveExecuted", {
            symbol,
            side: next.activeTradeSide
          })
        });
      }
      return;
    }

    next.closedTrades.forEach((trade) => {
      const profitable =
        ["WIN", "PROTECTED_WIN"].includes(trade.result) ||
        (["BROKER_CLOSED", "DISCONNECTED", "CLOSED"].includes(trade.result) && trade.pnl > 0);
      const losing =
        trade.result === "LOSS" ||
        (["BROKER_CLOSED", "DISCONNECTED", "CLOSED"].includes(trade.result) && trade.pnl < 0);
      const previousTrade = previous.closedTrades.find((item) => item.key === trade.key);
      const previousProfitable = previousTrade && (
        ["WIN", "PROTECTED_WIN"].includes(previousTrade.result) ||
        (["BROKER_CLOSED", "DISCONNECTED", "CLOSED"].includes(previousTrade.result) && previousTrade.pnl > 0)
      );
      const previousLosing = previousTrade && (
        previousTrade.result === "LOSS" ||
        (["BROKER_CLOSED", "DISCONNECTED", "CLOSED"].includes(previousTrade.result) && previousTrade.pnl < 0)
      );
      const sameKnownOutcome =
        (profitable && previousProfitable) ||
        (losing && previousLosing);

      if (sameKnownOutcome) return;

      if (profitable || losing) {
        events.push({
          symbol,
          state: profitable ? "WIN" : "LOSS",
          priority: profitable ? VOICE_EVENT_PRIORITY.WIN : VOICE_EVENT_PRIORITY.LOSS,
          fingerprint: `${symbol}:closed:${trade.key}:${profitable ? "WIN" : "LOSS"}`,
          message: assistantEventMessage(profitable ? "win" : "loss")
        });
      }
    });

    if (
      next.activeTradeKey &&
      next.activeTradeKey === previous.activeTradeKey &&
      next.tp2Hit &&
      !previous.tp2Hit
    ) {
      events.push({
        symbol,
        state: "TP2",
        priority: VOICE_EVENT_PRIORITY.TP2,
        fingerprint: `${symbol}:tp2:${next.activeTradeKey}`,
        message: assistantEventMessage("tp2")
      });
    } else if (
      next.activeTradeKey &&
      next.activeTradeKey === previous.activeTradeKey &&
      next.tp1Hit &&
      !previous.tp1Hit
    ) {
      events.push({
        symbol,
        state: "TP1",
        priority: VOICE_EVENT_PRIORITY.TP1,
        fingerprint: `${symbol}:tp1:${next.activeTradeKey}`,
        message: assistantEventMessage("tp1")
      });
    } else if (
      next.activeTradeKey &&
      next.activeTradeKey === previous.activeTradeKey &&
      next.protectedSl &&
      !previous.protectedSl
    ) {
      events.push({
        symbol,
        state: "PROTECTED",
        priority: VOICE_EVENT_PRIORITY.PROTECTED,
        fingerprint: `${symbol}:protected:${next.activeTradeKey}`,
        message: assistantEventMessage("protected")
      });
    }

    if (
      next.activeTradeKey &&
      next.activeTradeKey !== previous.activeTradeKey
    ) {
      markActiveTradeAnnounced(next.activeTradeKey);
      events.push({
        symbol,
        state: "EXECUTED",
        priority: VOICE_EVENT_PRIORITY.EXECUTED,
        fingerprint: `${symbol}:executed:${next.activeTradeKey}`,
        message: assistantEventMessage("liveExecuted", {
          symbol,
          side: next.activeTradeSide
        })
      });
    }

    if (
      next.autoState === "BLOCKED" &&
      ["BUY", "SELL"].includes(next.rawSignal) &&
      next.autoFingerprint !== previous.autoFingerprint
    ) {
      events.push({
        symbol,
        state: "BLOCKED",
        priority: VOICE_EVENT_PRIORITY.BLOCKED,
        fingerprint: createVoiceFingerprint(`${symbol}:blocked:${next.autoFingerprint}`),
        message: assistantBlockedLine(next.autoReason)
      });
    }

    if (
      next.rawSignal === "WAIT" &&
      previous.rawSignal !== "WAIT" &&
      smartExplain?.dataset.symbol === symbol &&
      smartExplain?.dataset.state === "blocked"
    ) {
      renderAssistantPopup(
        assistantEventMessage("wait", { symbol: getSpokenSymbol(symbol) }),
        "WAIT",
        {
          symbol,
          subtitle: getAssistantSubtitle(symbol)
        }
      );
    }

    // WAIT is normal market noise during refreshes. Keep it for user clicks only.

    if (
      next.signal !== previous.signal &&
      ["BUY", "SELL"].includes(next.signal)
    ) {
      const liveAutoOff = !next.liveAutoEnabled;
      const message = liveAutoOff
        ? assistantBlockedLine(assistantLiveAutoOffReason())
        : next.signal === "BUY"
          ? assistantEventMessage("buySetup", { symbol: getSpokenSymbol(symbol) })
          : assistantEventMessage("sellSetup", { symbol: getSpokenSymbol(symbol) });

      events.push({
        symbol,
        state: liveAutoOff ? "BLOCKED" : next.signal,
        priority: liveAutoOff
          ? VOICE_EVENT_PRIORITY.BLOCKED
          : VOICE_EVENT_PRIORITY[next.signal],
        fingerprint: createVoiceFingerprint(`${symbol}:signal:${previous.signal}:${next.signal}`),
        message
      });
    }

    if (
      ["BUY", "SELL"].includes(next.signal) &&
      next.confidence >= 75 &&
      (!previous.confidence || previous.confidence < 75)
    ) {
      events.push({
        symbol,
        state: "CONFIDENCE",
        priority: VOICE_EVENT_PRIORITY.HIGH_CONFIDENCE,
        fingerprint: createVoiceFingerprint(`${symbol}:confidence:${Math.floor(next.confidence)}`),
        message: assistantEventMessage("highConfidence")
      });
    }

    if (
      ["BUY", "SELL"].includes(next.signal) &&
      next.momentumScore >= 80 &&
      (!previous.momentumScore || previous.momentumScore < 80)
    ) {
      events.push({
        symbol,
        state: "MOMENTUM",
        priority: VOICE_EVENT_PRIORITY.STRONG_MOMENTUM,
        fingerprint: createVoiceFingerprint(`${symbol}:momentum:${Math.floor(next.momentumScore)}`),
        message: assistantEventMessage("strongMomentum")
      });
    }
  });

  voiceState.snapshots = nextSnapshots;
  voiceState.systemSnapshot = system.snapshot;

  if (!voiceState.initialized) {
    voiceState.initialized = true;
  }

  if (events.length) {
    queueVoiceEvents(events);
  }
}

function setVoiceEnabled(nextEnabled) {
  if (!speechSynthesisSupported) return;

  const shouldEnable = Boolean(nextEnabled);

  if (!shouldEnable) {
    window.speechSynthesis.cancel();
    clearPendingVoiceEvents();
  }

  voiceState.enabled = shouldEnable;
  localStorage.setItem(
    VOICE_STORAGE.enabled,
    voiceState.enabled ? "true" : "false"
  );
  updateVoiceControls();

  showAssistantMessage(
    voiceState.enabled
      ? assistantEventMessage("voiceOn")
      : assistantEventMessage("voiceOff"),
    voiceState.enabled ? "VOICE ON" : "VOICE OFF",
    { forceSpeech: true }
  );
}

[voiceToggleBtn, menuVoiceToggleBtn].forEach((button) => {
  button?.addEventListener("click", () => {
    const nextEnabled = !voiceState.enabled;
    setVoiceEnabled(nextEnabled);
  });
});

voiceSelect?.addEventListener("change", () => {
  voiceState.selectedVoiceName = voiceSelect.value;
  voiceState.selectedVoice = findVoiceByName(
    voiceState.voices,
    voiceState.selectedVoiceName
  );
  localStorage.setItem(VOICE_STORAGE.name, voiceState.selectedVoiceName);
});

voiceSpeed?.addEventListener("input", () => {
  voiceState.rate = Number(voiceSpeed.value) || VOICE_DEFAULTS.rate;
  if (voiceSpeedValue) voiceSpeedValue.textContent = voiceState.rate.toFixed(2);
  localStorage.setItem(VOICE_STORAGE.rate, String(voiceState.rate));
});

voicePitch?.addEventListener("input", () => {
  voiceState.pitch = Number(voicePitch.value) || VOICE_DEFAULTS.pitch;
  if (voicePitchValue) voicePitchValue.textContent = voiceState.pitch.toFixed(2);
  localStorage.setItem(VOICE_STORAGE.pitch, String(voiceState.pitch));
});

assistantStyle?.addEventListener("change", () => {
  voiceState.style = assistantStyle.value;
  localStorage.setItem(VOICE_STORAGE.style, voiceState.style);
  showAssistantMessage(
    applyAssistantStyleText(assistantCopy("testMessage")),
    "VOICE STYLE",
    { forceSpeech: true }
  );
});

assistantPopupToggle?.addEventListener("change", () => {
  voiceState.popupEnabled = assistantPopupToggle.checked;
  localStorage.setItem(
    VOICE_STORAGE.popup,
    voiceState.popupEnabled ? "true" : "false"
  );

  if (!voiceState.popupEnabled) {
    hideSmartExplanation();
  }
});

testVoiceBtn?.addEventListener("click", () => {
  showAssistantMessage(
    applyAssistantStyleText(assistantCopy("testMessage")),
    "TEST VOICE",
    { forceSpeech: true }
  );
});

initializeVoiceSettings();
updateVoiceControls();

function getSmartExplainBlockedStatus(symbol, data) {
  const autoStatus = liveAutoStatusBySymbol?.[symbol] || {};
  const autoState = String(autoStatus.status || "").toUpperCase();
  const currentSignal = String(data?.signal || "WAIT").trim().toUpperCase();

  if (
    ["BUY", "SELL"].includes(currentSignal) &&
    autoState === "BLOCKED"
  ) {
    return {
      blocked: true,
      reason: getVoiceBlockedExplanation({
        ...autoStatus,
        reason: autoStatus.reason || "current live auto safety check"
      }),
      status: autoStatus
    };
  }

  return { blocked: false, reason: "", status: autoStatus };
}

function formatAssistantNumber(value, maximumFractionDigits = 4) {
  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return number.toLocaleString(undefined, {
    maximumFractionDigits
  });
}

function buildVolumeSafetyAssistantDetails(status) {
  const details = getAutoTradeDetails(status);
  const requestedVolume =
    details.broker_interpreted_volume ??
    details.final_volume ??
    details.volume_in_payload ??
    details.volume_units ??
    details.calculated_volume_units;
  const brokerMinimum =
    details.broker_min_volume ??
    details.min_volume_units ??
    details.minVolume;
  const brokerStep =
    details.broker_volume_step ??
    details.volume_step_units ??
    details.stepVolume;
  const actualRisk =
    details.final_risk_percent ??
    details.risk_percent_if_minimum ??
    details.minimum_volume_risk_percent;
  const allowedRisk =
    details.maximum_allowed_risk_percent ??
    details.required_risk_percent ??
    details.risk_percent;
  const parts = [];
  const requestedText = formatAssistantNumber(requestedVolume);
  const minimumText = formatAssistantNumber(brokerMinimum);
  const stepText = formatAssistantNumber(brokerStep);
  const actualRiskText = formatRiskPercent(actualRisk);
  const allowedRiskText = formatRiskPercent(allowedRisk);

  if (requestedText !== null) parts.push(`Requested ${requestedText}`);
  if (minimumText !== null) parts.push(`Broker min ${minimumText}`);
  if (stepText !== null) parts.push(`Step ${stepText}`);

  if (actualRiskText && allowedRiskText) {
    parts.push(`Risk ${actualRiskText} / max ${allowedRiskText}`);
  } else if (actualRiskText) {
    parts.push(`Risk ${actualRiskText}`);
  }

  return parts.join(" • ");
}

function getVerifiedActiveTrade(symbol) {
  const trade = activeLiveOrders?.[symbol] || null;
  const source = String(trade?.source || "").toLowerCase();

  if (
    !trade ||
    !["", "broker", "ctrader"].includes(source) ||
    !hasRealLiveBrokerId(trade) ||
    !isLiveTradeActiveForDisplay(trade)
  ) {
    return null;
  }

  return trade;
}

function buildSmartExplanation(symbol) {
  const data = latestPanelData?.[symbol] || {};
  const rawSignal = String(data?.signal || "WAIT").trim().toUpperCase();
  const signal = normalizeVoiceSignal(data);
  const blocked = getSmartExplainBlockedStatus(symbol, data);
  const activeTrade = getVerifiedActiveTrade(symbol);
  const marketClosed = isPanelMarketClosed(latestRawPanelData);
  let message = "";
  let state = signal;
  let details = "";

  if (marketClosed) {
    state = "MARKET CLOSED";
    message = assistantEventMessage("marketClosed");
  } else if (activeTrade) {
    state = "EXECUTED";
    message = assistantEventMessage("activeTrade", {
      symbol: getSpokenSymbol(symbol)
    });
  } else if (
    rawSignal === "WAIT" ||
    rawSignal === "HOLD BUY" ||
    rawSignal === "HOLD SELL"
  ) {
    state = "WAIT";
    message = assistantEventMessage("wait", {
      symbol: getSpokenSymbol(symbol)
    });
  } else if (blocked.blocked) {
    state = "BLOCKED";
    message = assistantBlockedLine(blocked.reason);
    details = buildVolumeSafetyAssistantDetails(blocked.status);
  } else if (signal === "BUY") {
    if (!liveAutoEnabled) {
      state = "BLOCKED";
      message = assistantBlockedLine(assistantLiveAutoOffReason());
    } else {
      message = assistantEventMessage("buySetup", {
        symbol: getSpokenSymbol(symbol)
      });
    }
  } else if (signal === "SELL") {
    if (!liveAutoEnabled) {
      state = "BLOCKED";
      message = assistantBlockedLine(assistantLiveAutoOffReason());
    } else {
      message = assistantEventMessage("sellSetup", {
        symbol: getSpokenSymbol(symbol)
      });
    }
  } else {
    state = "WAIT";
    message = assistantEventMessage("wait", {
      symbol: getSpokenSymbol(symbol)
    });
  }

  return {
    symbol,
    state,
    message,
    details
  };
}

function speakAssistantMessage(
  message,
  force = false,
  symbol = "SYSTEM",
  interaction = false,
  bypassSymbolCooldown = false
) {
  if (interaction) {
    window.clearTimeout(voiceState.interactionTimer);
    voiceState.interactionTimer = window.setTimeout(() => {
      speakAssistantMessage(message, force, symbol, false, true);
    }, ASSISTANT_CLICK_DEBOUNCE_MS);
    return;
  }

  if (
    (!voiceState.enabled && !force) ||
    !message ||
    !speechSynthesisSupported
  ) {
    return;
  }

  const now = Date.now();
  const repeatedTooSoon =
    message === voiceState.lastSpokenMessage &&
    now - voiceState.lastSpokenMessageAt < ASSISTANT_REPEAT_MS;

  if (repeatedTooSoon) return;

  if (
    !bypassSymbolCooldown &&
    ["EURUSD", "XAUUSD"].includes(symbol) &&
    now - (voiceState.lastSpokenAt[symbol] || 0) < VOICE_COOLDOWN_MS
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  configureAssistantUtterance(utterance);
  voiceState.lastAssistantMessage = message;
  voiceState.lastAssistantSpokenAt = now;
  voiceState.lastSpokenMessage = message;
  voiceState.lastSpokenMessageAt = now;
  voiceState.lastLibraryMessage = message;
  voiceState.lastSpokenAt[symbol] = now;
  window.speechSynthesis.speak(utterance);
}

function hideSmartExplanation() {
  smartExplain?.classList.add("hidden");
}

function renderAssistantPopup(message, state = "INFO", options = {}) {
  if (!smartExplain || !smartExplainTitle || !smartExplainText || !smartExplainState) {
    return;
  }

  if (!voiceState.popupEnabled && !options.forcePopup) {
    hideSmartExplanation();
    return;
  }

  smartExplainTitle.textContent = "Flow Assistant";
  if (smartExplainSubtitle) {
    smartExplainSubtitle.textContent = options.subtitle || "Market Assistant";
  }
  smartExplainText.textContent = message;
  if (smartExplainDetails) {
    smartExplainDetails.textContent = options.details || "";
    smartExplainDetails.classList.toggle("hidden", !options.details);
  }
  smartExplainState.textContent = state;
  smartExplainState.dataset.state = String(state).toLowerCase().split(" ")[0];
  smartExplain.dataset.state = String(state).toLowerCase().split(" ")[0];
  smartExplain.dataset.symbol = options.symbol || "SYSTEM";
  smartExplain.classList.remove("hidden");
}

function showAssistantMessage(message, state = "INFO", options = {}) {
  const marketClosed = isPanelMarketClosed(latestRawPanelData);
  const finalMessage = marketClosed
    ? assistantEventMessage("marketClosed")
    : message;
  const finalState = marketClosed
    ? "MARKET CLOSED"
    : state;
  const finalOptions = marketClosed
    ? {
        ...options,
        symbol: "SYSTEM",
        subtitle:
          currentLang === "fr"
            ? "Assistant de marché"
            : currentLang === "es"
              ? "Asistente de mercado"
              : "Market Assistant"
      }
    : options;

  renderAssistantPopup(finalMessage, finalState, finalOptions);

  speakAssistantMessage(
    finalMessage,
    Boolean(finalOptions.forceSpeech),
    finalOptions.symbol || "SYSTEM",
    Boolean(finalOptions.interaction)
  );
}

function showSmartExplanation(symbol) {
  const result = buildSmartExplanation(symbol);
  showAssistantMessage(result.message, result.state, {
    subtitle: getAssistantSubtitle(symbol),
    symbol,
    details: result.details,
    interaction: true
  });
}

function getChartDirection(symbol, timeframe) {
  const candles =
    latestRawPanelData?.candles?.[symbol]?.[timeframe] || [];
  const recent = candles.slice(-12);

  if (recent.length < 2) return "unclear";

  const first = Number(recent[0]?.close);
  const last = Number(recent[recent.length - 1]?.close);

  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) {
    return "unclear";
  }

  const move = (last - first) / Math.abs(first);
  const flatThreshold = symbol === "XAUUSD" ? 0.0008 : 0.00025;

  if (Math.abs(move) < flatThreshold) return "sideways";
  return move > 0 ? "bullish" : "bearish";
}

function getChartWaitingText(data, timeframe) {
  const timeframeStructure = timeframe === "1h"
    ? data?.structure_trend
    : timeframe === "15m"
      ? data?.structure_type
      : data?.structure_next;
  const structure = String(timeframeStructure || "").toLowerCase();
  const planReason = String(data?.plan_reason || "").trim();
  const copy = ASSISTANT_COPY[currentLang] || ASSISTANT_COPY.en;

  const combined = `${structure} ${planReason}`.toLowerCase();
  if (combined.includes("swing")) return copy.waiting.swing;
  if (combined.includes("closed") && combined.includes("candle")) {
    return copy.waiting.swing;
  }
  if (combined.includes("choch")) return copy.waiting.choch;
  if (combined.includes("bos")) return copy.waiting.bos;
  if (combined.includes("confirmation")) return copy.waiting.candle;
  return copy.waiting.structure;
}

function buildChartExplanation(symbol, timeframe) {
  const data = latestPanelData?.[symbol] || {};
  const direction = getChartDirection(symbol, timeframe);
  const spokenSymbol = getSpokenSymbol(symbol);
  const waitingFor = getChartWaitingText(data, timeframe);
  const signal = String(data?.signal || "WAIT").trim().toUpperCase();
  const state = ["BUY", "SELL"].includes(signal) ? signal : "WAIT";
  const copy = ASSISTANT_COPY[currentLang] || ASSISTANT_COPY.en;
  const spokenTimeframe = copy.timeframes[timeframe] || timeframe;
  const spokenDirection = copy.directions[direction] || direction;

  return {
    state,
    message: assistantCopy("chart", {
      symbol: spokenSymbol,
      timeframe: spokenTimeframe,
      direction: spokenDirection,
      waiting: waitingFor
    })
  };
}

function showChartExplanation(symbol, timeframe) {
  const explanation = buildChartExplanation(symbol, timeframe);
  showAssistantMessage(explanation.message, explanation.state, {
    subtitle: getAssistantSubtitle(symbol, timeframe),
    symbol,
    interaction: true
  });
}

function makeSmartExplainTarget(element, symbol) {
  if (!element) return;

  element.classList.add("smart-explain-target");
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", `Explain ${symbol} signal`);

  element.addEventListener("click", (event) => {
    if (event.target.closest("button, input, select, a")) return;
    showSmartExplanation(symbol);
  });

  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showSmartExplanation(symbol);
    }
  });
}

makeSmartExplainTarget(document.getElementById("eurusd-card"), "EURUSD");
makeSmartExplainTarget(document.getElementById("gold-card"), "XAUUSD");

const mainSmcPanel = document.querySelector(".main-smc-panel");

if (mainSmcPanel) {
  mainSmcPanel.classList.add("smart-explain-target");
  mainSmcPanel.setAttribute("role", "button");
  mainSmcPanel.setAttribute("tabindex", "0");
  mainSmcPanel.setAttribute("aria-label", "Explain current SMC plan");
  mainSmcPanel.addEventListener("click", (event) => {
    if (event.target.closest("button, input, select, a")) return;
    showSmartExplanation(currentChartSymbol);
  });
  mainSmcPanel.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showSmartExplanation(currentChartSymbol);
    }
  });
}

smartExplainClose?.addEventListener("click", hideSmartExplanation);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideSmartExplanation();
});

function setAuthMessage(text, isError = false) {
  if (!authMsg) return;
  authMsg.textContent = text;
  authMsg.style.color = isError ? "#ff8f8f" : "#cdd5df";
}

// ==============================
// HELPERS
// ==============================

function applyLanguage(lang) {
  currentLang = lang;
// ==============================
// LANDING PAGE TRANSLATION
// ==============================

// HERO TITLE
const heroTitle = document.querySelector(".hero-left h1");
if (heroTitle) {
  heroTitle.innerHTML = `
    ${LANG[lang].heroTitle1}<br>
    <span>${LANG[lang].heroTitle2}</span>
  `;
}

// HERO TEXT
const heroText = document.querySelector(".hero-left p");
if (heroText) {
  heroText.textContent = LANG[lang].heroText;
}

// HERO LINE (pill)
const heroPill = document.querySelector(".hero-pill");
if (heroPill) {
  heroPill.innerHTML = `
    <span>${LANG[lang].liveHero}</span>
    ${LANG[lang].heroLine}
  `;
}

// BUTTONS
const startBtn = document.getElementById("openAccessBtnHero");

if (startBtn) {
  startBtn.textContent =
    window.innerWidth <= 700
      ? "Get Access →"
      : LANG[lang].startTrading;
}
const getBtn = document.getElementById("openAccessBtn");
if (getBtn) getBtn.textContent = LANG[lang].getStarted;

const viewBtn = document.querySelector(".hero-secondary");
if (viewBtn) viewBtn.textContent = LANG[lang].viewFeatures;

// BADGES
const badges = document.querySelectorAll(".hero-badges span");
if (badges[0]) badges[0].textContent = LANG[lang].realTimeAlerts;
if (badges[1]) badges[1].textContent = LANG[lang].highAccuracy;
if (badges[2]) badges[2].textContent = LANG[lang].riskManaged;

// STATS
const stats = document.querySelectorAll(".hero-stats span");
if (stats[0]) stats[0].textContent = LANG[lang].activeTraders;
if (stats[1]) stats[1].textContent = LANG[lang].signalAccuracy;

// TRUST TEXT
const trusted = document.querySelector(".trusted-text");
if (trusted) trusted.textContent = LANG[lang].trustedText;
// ==============================
// TOP NAV LINKS (ADD HERE)
// ==============================

const linkContact = document.getElementById("linkContact");
const linkSupport = document.getElementById("linkSupport");
const linkFacebook = document.getElementById("linkFacebook");
const loginBtn = document.getElementById("openAdminLoginBtn");

if (linkContact) linkContact.textContent = lang === "fr" ? "Contact" : lang === "es" ? "Contacto" : "Contact";
if (linkSupport) linkSupport.textContent = lang === "fr" ? "Support" : lang === "es" ? "Soporte" : "Support";
if (linkFacebook) linkFacebook.textContent = lang === "fr" ? "Facebook" : lang === "es" ? "Facebook" : "Facebook";
if (loginBtn) loginBtn.textContent = LANG[lang].login;
// ==============================
// EXTRA TRANSLATIONS - STATIC UI
// ==============================

// Top status
document.querySelectorAll("#status, .main-live").forEach((el) => {
  if (!el) return;

  el.textContent = el.textContent
    .replace("MARKET CLOSED", LANG[lang].marketClosed)
    .replace("LIVE", LANG[lang].live);
});

// Card tags
document.querySelectorAll(".glow-tag").forEach((el) => {
  const text = el.textContent.trim().toUpperCase();

  if (text === "MARKET CLOSED") el.textContent = LANG[lang].marketClosed;
  if (text === "WEAK") el.textContent = LANG[lang].weak;
  if (text === "NEUTRAL") el.textContent = LANG[lang].neutral;
  if (text === "MIXED") el.textContent = LANG[lang].mixed;
  if (text === "CHOPPY") el.textContent = LANG[lang].choppy;
});

// Main metrics
const mainMetricLabels = document.querySelectorAll(".main-metrics span");
if (mainMetricLabels[0]) mainMetricLabels[0].textContent = LANG[lang].buy;
if (mainMetricLabels[1]) mainMetricLabels[1].textContent = LANG[lang].sell;
if (mainMetricLabels[2]) mainMetricLabels[2].textContent = LANG[lang].confidence;
mainMetricLabels.forEach((label) => {
  label.title = LANG[lang].biasOnlyNote;
});
const biasOnlyNote = document.querySelector(".bias-only-note");
if (biasOnlyNote) biasOnlyNote.textContent = LANG[lang].biasOnlyNote;

// SMC plan title
const smcHeader = document.querySelector(".smc-header");
if (smcHeader) smcHeader.textContent = `⚡ ${LANG[lang].smcPlan}`;

// SMC rows
const smcRows = document.querySelectorAll(".main-smc-panel .smc-row span:first-child");
if (smcRows[0]) smcRows[0].textContent = LANG[lang].type;
if (smcRows[1]) smcRows[1].textContent = LANG[lang].bias;
if (smcRows[2]) smcRows[2].textContent = LANG[lang].entry;
if (smcRows[3]) smcRows[3].textContent = LANG[lang].sl;
if (smcRows[4]) smcRows[4].textContent = LANG[lang].tp1;
if (smcRows[5]) smcRows[5].textContent = LANG[lang].tp2;
if (smcRows[6]) smcRows[6].textContent = LANG[lang].riskReward;
if (smcRows[7]) smcRows[7].textContent = LANG[lang].invalidation;
if (smcRows[8]) smcRows[8].textContent = LANG[lang].reason;

if (fundamentalInsightPollingActive()) {
  refreshNewsImpact(
    typeof currentChartSymbol !== "undefined" ? currentChartSymbol : "EURUSD"
  );
}

// History empty row
const noHistoryCell = document.querySelector("#historyBody td");
if (noHistoryCell) noHistoryCell.textContent = LANG[lang].noHistory;

// Bottom last signal
const mainLastSignal = document.getElementById("main-last-signal");
if (mainLastSignal) {
  const rawSignal = mainLastSignal.textContent.split(":")[1]?.trim() || "WAIT";
  const translatedSignal =
    rawSignal === "WAIT" ? LANG[lang].wait :
    rawSignal === "BUY" ? LANG[lang].buy.toUpperCase() :
    rawSignal === "SELL" ? LANG[lang].sell.toUpperCase() :
    rawSignal;

  mainLastSignal.textContent = `${LANG[lang].lastSignal}: ${translatedSignal}`;
}

  // Feedback modal
  const feedbackTitle = document.querySelector("#feedbackModal .trade-modal-title");
  const feedbackText = document.getElementById("feedbackHelpText");
  const feedbackInput = document.getElementById("feedbackInput");
  const feedbackSendBtn = document.getElementById("feedbackSendBtn");
  const feedbackCancelBtn = document.getElementById("feedbackCancelBtn");
  const feedbackToast = document.getElementById("feedbackToast");

  if (feedbackTitle) feedbackTitle.textContent = LANG[lang].feedbackTitle;
  if (feedbackText) feedbackText.textContent = LANG[lang].feedbackText;
  if (feedbackInput) feedbackInput.placeholder = LANG[lang].feedbackPlaceholder;
  if (feedbackSendBtn) feedbackSendBtn.textContent = LANG[lang].send;
  if (feedbackCancelBtn) feedbackCancelBtn.textContent = LANG[lang].cancel;
  if (feedbackToast) feedbackToast.textContent = LANG[lang].thanks;

  // History
  const historyTitle = document.querySelector(".history-header h2");
  if (historyTitle) historyTitle.textContent = LANG[lang].history;

  const emptyRow = document.querySelector("#historyBody td");
  if (emptyRow) emptyRow.textContent = LANG[lang].noHistory;

  // BUY / SELL buttons
  document.querySelectorAll(".buy-button").forEach((btn) => {
    btn.textContent = LANG[lang].buy;
  });

  document.querySelectorAll(".sell-button").forEach((btn) => {
    btn.textContent = LANG[lang].sell;
  });

  // WAIT text
  document.querySelectorAll("#eurusd-signal, #gold-signal").forEach((el) => {
    const current = el.textContent.trim().toUpperCase();

    // Top controls
    const alertsLabel = document.querySelector('label[for="alertsToggle"], .switch-wrap span');
    const switchSpans = document.querySelectorAll(".switch-wrap span");
    if (switchSpans[0]) switchSpans[0].textContent = LANG[lang].alerts;
    if (switchSpans[1]) switchSpans[1].textContent = LANG[lang].strong;

    // Menu items
    const menuFeedbackText = document.querySelector("#menuFeedbackBtn .menu-row-text");
    const menuAdminText = document.querySelector("#menuAdminBtn .menu-row-text");
    const menuViewText = document.querySelector("#menuViewBtn .menu-row-text");

    if (menuFeedbackText) menuFeedbackText.textContent = LANG[lang].feedback;
    if (menuAdminText) menuAdminText.textContent = LANG[lang].adminLock;
    if (menuViewText) menuViewText.textContent = LANG[lang].fitFullMode;

    // History table headers
    const historyHeaders = document.querySelectorAll(".history-table thead th");
    if (historyHeaders[0]) historyHeaders[0].textContent = LANG[lang].time;
    if (historyHeaders[1]) historyHeaders[1].textContent = LANG[lang].symbol;
    if (historyHeaders[2]) historyHeaders[2].textContent = LANG[lang].signal;
    if (historyHeaders[3]) historyHeaders[3].textContent = LANG[lang].confidence;
    if (historyHeaders[4]) historyHeaders[4].textContent = LANG[lang].result;
    if (historyHeaders[5]) historyHeaders[5].textContent = LANG[lang].pips;

    if (
      current === "WAIT" ||
      current === "ATTENTE" ||
      current === "ESPERA"
    ) {
      el.textContent = LANG[lang].wait;
    }
  });

  if (statusEl?.dataset.connectionState) {
    setConnectionBadge(
      statusEl.dataset.connectionState,
      statusEl.dataset.fullStatus || ""
    );
  }
  translateFullInterface(lang);
  if (confirmedStrategySettings) syncStrategySettingsPresentation();
  if (strategyFixedRules) renderFixedStrategyRules(strategyFixedRules);
  if (strategyHistoryItems.length) renderStrategySettingsHistory();
}



function clampPct(value) {
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(num, 100));
}

function setBar(symbol, type, pct, immediate = false) {
  setSmoothBar(symbol, type, pct, immediate);
}

function setTagStyle(el, mode, text) {
  if (!el) return;
  el.textContent = text;
  el.className = `glow-tag ${mode}`;
}

function normalizeMainSignalBadge(signal) {
  const s = String(signal || "WAIT").trim().toUpperCase();

  if (["BUY", "SELL", "WAIT", "NO DATA"].includes(s)) return s;
  if (s.includes("EXIT")) return s;
  return "WAIT";
}

function applySignalStyle(symbol, signal) {
  signal = normalizeMainSignalBadge(signal);

  const shell = document.getElementById(`${symbol.toLowerCase()}-signal-shell`);
  const box = document.getElementById(`${symbol.toLowerCase()}-signal-box`);
  const text = document.getElementById(`${symbol.toLowerCase()}-signal`);
  const note = document.getElementById(`${symbol.toLowerCase()}-signal-note`);

  if (!shell || !box || !text) {
    console.warn(`Missing signal elements for ${symbol}`);
    return;
  }

  shell.className = "signal-shell";
  box.className = "signal-box";
  text.className = "signal-text";

  if (signal === "BUY") {
    shell.classList.add("signal-buy");
    box.classList.add("signal-border-buy");
    text.classList.add("buy-text");
  } else if (signal === "SELL") {
    shell.classList.add("signal-sell");
    box.classList.add("signal-border-sell");
    text.classList.add("sell-text");
  } else if (signal.includes("EXIT")) {
    shell.classList.add("signal-sell");
    box.classList.add("signal-border-sell");
    text.classList.add("sell-text");
  } else if (signal === "NO DATA") {
    shell.classList.add("signal-no-data");
    box.classList.add("signal-border-no-data");
    text.classList.add("no-data-text");
  } else {
    shell.classList.add("signal-wait");
    box.classList.add("signal-border-wait");
    text.classList.add("wait-text");
  }

  const isHold = signal === "HOLD BUY" || signal === "HOLD SELL";

  if (note) {
    note.classList.add("hidden");
  }

  if (signal === "WAIT" || isHold) {
    text.textContent = LANG[currentLang].wait;
  } else if (signal === "BUY") {
    text.textContent = tTradeAction(signal);
  } else if (signal === "SELL") {
    text.textContent = tTradeAction(signal);
  } else {
    text.textContent = signal;
  }
}

function tSignal(signal) {
  const s = String(signal || "WAIT").toUpperCase();

  if (s === "WAIT") return LANG[currentLang].wait;
  if (s === "BUY" || s === "SELL") return tTradeAction(s);
  if (s === "HOLD BUY" || s === "HOLD SELL") return LANG[currentLang].wait;

  if (s === "EXIT SELL") return "EXIT SELL";
  if (s === "EXIT BUY") return "EXIT BUY";

  return s;
}

function getSignalSide(signal) {
  const s = String(signal || "").trim().toUpperCase();
  if (s === "BUY" || s === "SELL") return s;
  return s;
}

function getVisibleSignal(data) {
  const displaySignal = String(
    data?.strategy_decision
    || data?.display_signal
    || data?.signal_display_state
    || data?.final_signal
    || data?.signal
    || "WAIT"
  ).trim().toUpperCase();

  if (["BUY", "SELL", "WAIT", "NO DATA"].includes(displaySignal)) {
    return displaySignal;
  }

  if (displaySignal === "HOLD BUY" || displaySignal === "HOLD SELL") {
    return "WAIT";
  }

  if (displaySignal.includes("EXIT")) {
    return displaySignal;
  }

  if (displaySignal.includes("BIAS") || displaySignal.includes("BULLISH") || displaySignal.includes("BEARISH")) {
    return "WAIT";
  }

  return "WAIT";
}

function tMarketText(text) {
  const s = String(text || "").toUpperCase();

  if (s === "MARKET CLOSED") return LANG[currentLang].marketClosed;
  if (s === "WEAK") return LANG[currentLang].weak;
  if (s === "NEUTRAL") return LANG[currentLang].neutral;
  if (s === "MIXED") return LANG[currentLang].mixed;
  if (s === "CHOPPY") return LANG[currentLang].choppy;
  if (s === "TRENDING") return LANG[currentLang].trending;
  if (s === "STRONG") return LANG[currentLang].strongQuality;

  if (s === "WAIT BUY RETEST") {
    if (currentLang === "fr") return "ATTENTE RETEST ACHAT";
    if (currentLang === "es") return "ESPERA RETEST COMPRA";
  }

  if (s === "BUY") return LANG[currentLang].buy.toUpperCase();
  if (s === "SELL") return LANG[currentLang].sell.toUpperCase();

if (currentLang === "fr") {
  return String(text)
    .replaceAll("Wait for 15m swing break + close", "Attendre cassure 15m + clôture")
    .replaceAll("STRONG_BEARISH(", "BAISSIER FORT (")
    .replaceAll("STRONG_BULLISH(", "HAUSSIER FORT (")
    .replaceAll("MEDIUM_BEARISH(", "BAISSIER MOYEN (")
    .replaceAll("MEDIUM_BULLISH(", "HAUSSIER MOYEN (")
    .replaceAll("WEAK_BEARISH(", "BAISSIER FAIBLE (")
    .replaceAll("WEAK_BULLISH(", "HAUSSIER FAIBLE (")
    .replaceAll("LOW_ACTIVITY • LOW VOLUME", "FAIBLE ACTIVITÉ • FAIBLE VOLUME")
    .replaceAll("LOW_ACTIVITY", "FAIBLE ACTIVITÉ")
    .replaceAll("LOW VOLUME", "FAIBLE VOLUME")

    .replaceAll("MEDIUM_BULLISH", "HAUSSIER MOYEN")
    .replaceAll("MEDIUM BEARISH", "BAISSIER MOYEN")
    .replaceAll("MEDIUM_BEARISH", "BAISSIER MOYEN")

    .replaceAll("WEAK_BULLISH", "HAUSSIER FAIBLE")
    .replaceAll("WEAK BEARISH", "BAISSIER FAIBLE")
    .replaceAll("WEAK_BEARISH", "BAISSIER FAIBLE")

    .replaceAll("STRONG_BULLISH", "HAUSSIER FORT")
    .replaceAll("STRONG BEARISH", "BAISSIER FORT")
    .replaceAll("STRONG_BEARISH", "BAISSIER FORT")
    .replaceAll("No entry until 15m structure confirms", "Pas d’entrée avant confirmation 15m")
    .replaceAll("No entry until structure confirms", "Pas d’entrée avant confirmation de la structure")
    .replaceAll("Wait for 15m swing break + close", "Attendre cassure 15m + clôture")
    .replaceAll("LOW_ACTIVITY", "FAIBLE ACTIVITÉ")
    .replaceAll("MEDIUM_BULLISH", "HAUSSIER MOYEN")
    .replaceAll("MEDIUM_BEARISH", "BAISSIER MOYEN")
    .replaceAll("WEAK_BULLISH", "HAUSSIER FAIBLE")
    .replaceAll("WEAK_BEARISH", "BAISSIER FAIBLE")
    .replaceAll("STRONG_BULLISH", "HAUSSIER FORT")
    .replaceAll("STRONG_BEARISH", "BAISSIER FORT")
    .replaceAll("WAIT BUY BREAK", "ATTENTE CASSURE ACHAT")
    .replaceAll("WAIT SELL BREAK", "ATTENTE CASSURE VENTE")
    .replaceAll("BUY HOLDING", "ACHAT EN ATTENTE")
    .replaceAll("SELL HOLDING", "VENTE EN ATTENTE")
    .replaceAll("SELL READY", "VENTE PRÊTE")
    .replaceAll("BUY READY", "ACHAT PRÊT")
    .replaceAll("WAIT", "ATTENTE")
    .replaceAll("BUY", "ACHAT")
    .replaceAll("SELL", "VENTE")
    .replaceAll("BEARISH", "BAISSIER")
    .replaceAll("BULLISH", "HAUSSIER")
    .replaceAll("LOW_ACTIVITY", "FAIBLE ACTIVITÉ")
    .replaceAll("LOW VOLUME", "FAIBLE VOLUME")
    .replaceAll("DISPLACEMENT", "DÉPLACEMENT")
    .replaceAll("FAKE BREAKOUT", "FAUSSE CASSURE")
    .replaceAll("NONE", "AUCUN");
}

if (currentLang === "es") {
  return String(text)

    .replaceAll(
    "No entry until structure confirms",
    "Sin entrada hasta que la estructura confirme"
  )
    .replaceAll("No entry until 15m structure confirms", "Sin entrada hasta confirmación 15m")
    .replaceAll("Wait for 15m swing break + close", "Esperar ruptura 15m + cierre")
    .replaceAll("STRONG_BEARISH(", "BAJISTA FUERTE (")
    .replaceAll("STRONG_BULLISH(", "ALCISTA FUERTE (")
    .replaceAll("MEDIUM_BEARISH(", "BAJISTA MEDIO (")
    .replaceAll("MEDIUM_BULLISH(", "ALCISTA MEDIO (")
    .replaceAll("WEAK_BEARISH(", "BAJISTA DÉBIL (")
    .replaceAll("WEAK_BULLISH(", "ALCISTA DÉBIL (")
    .replaceAll("WAIT BUY BREAK", "ESPERA RUPTURA COMPRA")
    .replaceAll("WAIT SELL BREAK", "ESPERA RUPTURA VENTA")
    .replaceAll("BUY HOLDING", "COMPRA ACTIVA")
    .replaceAll("SELL HOLDING", "VENTA ACTIVA")
    .replaceAll("SELL READY", "VENTA LISTA")
    .replaceAll("BUY READY", "COMPRA LISTA")
    .replaceAll("WAIT", "ESPERA")
    .replaceAll("BUY", "COMPRA")
    .replaceAll("SELL", "VENTA")
    .replaceAll("BEARISH", "BAJISTA")
    .replaceAll("BULLISH", "ALCISTA")
    .replaceAll("LOW_ACTIVITY", "BAJA ACTIVIDAD")
    .replaceAll("LOW VOLUME", "BAJO VOLUMEN")
    .replaceAll("DISPLACEMENT", "DESPLAZAMIENTO")
    .replaceAll("FAKE BREAKOUT", "RUPTURA FALSA")
    .replaceAll("NONE", "NINGUNO");
}

  return text;
}

// ==============================
// CARD UPDATE
// ==============================
function getCardPrefix(symbol) {
  return symbol === "XAUUSD" ? "gold" : symbol.toLowerCase();
}

function getLiveTickMid(symbol) {
  const tick = livePrices?.[symbol];
  const mid = Number(tick?.mid);
  const timestamp = Number(tick?.timestamp);
  const ageSeconds = Number.isFinite(timestamp)
    ? (Date.now() / 1000) - timestamp
    : Infinity;

  return Number.isFinite(mid) && mid > 0 && ageSeconds <= 20 ? mid : null;
}

function formatLivePrice(symbol, value) {
  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) return null;

  return symbol === "XAUUSD" ? price.toFixed(2) : price.toFixed(5);
}

function formatCandleDebugTime(value) {
  if (!value || value === "--") return "--";

  const date = parseCandleDebugDate(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseCandleDebugDate(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? new Date(numericValue > 100000000000 ? numericValue : numericValue * 1000)
    : new Date(value);
}

function formatCandleAgeDebug(value) {
  if (!value || value === "--") return "";

  const date = parseCandleDebugDate(value);

  if (Number.isNaN(date.getTime())) return "";

  const ageMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (!Number.isFinite(ageMinutes) || ageMinutes < 7) return "";
  if (ageMinutes < 120) return ` (${ageMinutes}m old)`;

  const ageHours = Math.floor(ageMinutes / 60);
  const remainingMinutes = ageMinutes % 60;

  return ` (${ageHours}h ${remainingMinutes}m old)`;
}

function getTimeframeSeconds(timeframe) {
  return {
    "5m": 5 * 60,
    "15m": 15 * 60,
    "1h": 60 * 60
  }[timeframe] || 5 * 60;
}

function formatChartCandleFreshness(value, timeframe) {
  if (!value || value === "--") {
    return { text: "", stale: false };
  }

  const date = parseCandleDebugDate(value);

  if (Number.isNaN(date.getTime())) {
    return { text: "", stale: false };
  }

  const timeframeSeconds = getTimeframeSeconds(timeframe);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const candleSeconds = Math.floor(date.getTime() / 1000);
  const currentBucket = Math.floor(nowSeconds / timeframeSeconds) * timeframeSeconds;
  const elapsedSeconds = Math.max(0, nowSeconds - candleSeconds);

  if (candleSeconds === currentBucket && elapsedSeconds < timeframeSeconds) {
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const totalMinutes = Math.floor(timeframeSeconds / 60);
    return {
      text: ` (forming ${elapsedMinutes}m/${totalMinutes}m)`,
      stale: false
    };
  }

  const staleSeconds = nowSeconds - (candleSeconds + timeframeSeconds);

  if (staleSeconds < 60) {
    return { text: "", stale: false };
  }

  const staleMinutes = Math.floor(staleSeconds / 60);

  if (staleMinutes < 120) {
    return {
      text: ` (${staleMinutes}m late)`,
      stale: true
    };
  }

  const staleHours = Math.floor(staleMinutes / 60);
  const remainingMinutes = staleMinutes % 60;

  return {
    text: ` (${staleHours}h ${remainingMinutes}m late)`,
    stale: true
  };
}

function getLiveAugmentedCandles(candles, symbol, timeframe, fallbackPrice = null) {
  const list = Array.isArray(candles)
    ? candles.map((candle) => ({ ...candle }))
    : [];

  if (!list.length || MARKET_IS_CLOSED) return list;

  const livePrice = getLiveTickMid(symbol) || Number(fallbackPrice);
  if (!Number.isFinite(livePrice) || livePrice <= 0) return list;

  const timeframeSeconds = getTimeframeSeconds(timeframe);
  const currentBucket = Math.floor(Date.now() / 1000 / timeframeSeconds)
    * timeframeSeconds;
  const last = list[list.length - 1];
  const lastTime = Number(last?.time);

  if (!Number.isFinite(lastTime)) return list;

  if (lastTime < currentBucket) {
    const previousClose = Number(last.close);
    const open = Number.isFinite(previousClose) && previousClose > 0
      ? previousClose
      : livePrice;

    list.push({
      time: currentBucket,
      open,
      high: Math.max(open, livePrice),
      low: Math.min(open, livePrice),
      close: livePrice
    });
    return list;
  }

  if (lastTime === currentBucket) {
    const high = Number(last.high);
    const low = Number(last.low);
    list[list.length - 1] = {
      ...last,
      high: Number.isFinite(high) ? Math.max(high, livePrice) : livePrice,
      low: Number.isFinite(low) ? Math.min(low, livePrice) : livePrice,
      close: livePrice
    };
  }

  return list;
}

function preserveFormingCandleShape(candles, previousCandles, timeframe) {
  const next = Array.isArray(candles) ? candles : [];
  const previous = Array.isArray(previousCandles) ? previousCandles : [];
  if (!next.length || !previous.length || MARKET_IS_CLOSED) return next;

  const timeframeSeconds = getTimeframeSeconds(timeframe);
  const currentBucket = Math.floor(Date.now() / 1000 / timeframeSeconds)
    * timeframeSeconds;
  const latest = next[next.length - 1];
  const prior = previous[previous.length - 1];
  if (Number(latest?.time) !== currentBucket) return next;

  const incomingOpen = Number(latest.open);
  const incomingHigh = Number(latest.high);
  const incomingLow = Number(latest.low);
  const incomingClose = Number(latest.close);
  const priorClose = Number(prior?.close);
  const sameBucket = Number(prior?.time) === currentBucket;
  const incomingIsFlat = [incomingHigh, incomingLow, incomingClose]
    .every((value) => Number.isFinite(value) && value === incomingOpen);

  const preservedOpen = sameBucket
    ? Number(prior.open)
    : (incomingIsFlat && Number.isFinite(priorClose) ? priorClose : incomingOpen);
  const candidates = [incomingOpen, incomingHigh, incomingLow, incomingClose];
  if (sameBucket) {
    candidates.push(Number(prior.high), Number(prior.low), Number(prior.close));
  } else if (incomingIsFlat) {
    candidates.push(priorClose);
  }
  const valid = candidates.filter(Number.isFinite);
  if (!Number.isFinite(preservedOpen) || !valid.length) return next;

  next[next.length - 1] = {
    ...latest,
    open: preservedOpen,
    high: Math.max(...valid),
    low: Math.min(...valid),
    close: incomingClose,
  };
  return next;
}

function updateCard(symbol, data) {
  const cardPrefix = getCardPrefix(symbol);
  let signal = getVisibleSignal(data);
  const displayScores = getFinalDisplayScores(data);
  const buyPct = displayScores.buy;
  const sellPct = displayScores.sell;
  const confidence = displayScores.confidence;
  const marketCondition = String(data.market_condition || "UNKNOWN").trim().toUpperCase();
  const entryQuality = String(data.entry_quality || "WEAK").trim().toUpperCase();
  const entryTiming = String(data.entry_timing || "NEUTRAL").trim().toUpperCase();
  const marketClosed = Boolean(data.market_closed);

  const noData = marketCondition === "UNKNOWN" && buyPct === 0 && sellPct === 0 && confidence === 0;

  if (marketClosed) {
    signal = "WAIT";
  } else if (noData) {
    signal = "NO DATA";
  }
  applySignalStyle(cardPrefix, signal);

  const buyLabel = document.getElementById(`${cardPrefix}-buy-label`);
  const sellLabel = document.getElementById(`${cardPrefix}-sell-label`);
  const confLabel = document.getElementById(`${cardPrefix}-conf-label`);
  const cardEl = document.getElementById(`${cardPrefix}-card`);
  const mobileTrend = buyPct >= sellPct ? "BULLISH ↑" : "BEARISH ↓";

  if (buyLabel) {
    buyLabel.textContent = `${LANG[currentLang].buy}: ${buyPct}%`;
    buyLabel.title = LANG[currentLang].biasOnlyNote;
    buyLabel.dataset.mobileTitle = "Trend (15m)";
    buyLabel.dataset.mobileValue = mobileTrend;
    buyLabel.dataset.mobileCompact = `Bullish ${buyPct}%`;
    buyLabel.nextElementSibling?.setAttribute("data-mobile-info", `B ${buyPct}%`);
  }
if (sellLabel) {
  sellLabel.textContent = `${LANG[currentLang].sell}: ${sellPct}%`;
  sellLabel.title = LANG[currentLang].biasOnlyNote;
  sellLabel.dataset.mobileTitle = "Bias Strength";
  sellLabel.dataset.mobileValue = `${confidence}%`;
  sellLabel.dataset.mobileCompact = `Bearish ${sellPct}%`;
  sellLabel.nextElementSibling?.setAttribute("data-mobile-info", `S ${sellPct}%`);
}
if (confLabel) {
  confLabel.textContent = `${LANG[currentLang].confidence}: ${confidence}%`;
  confLabel.title = LANG[currentLang].biasOnlyNote;
  confLabel.dataset.mobileCompact = `Strength ${confidence}%`;
  confLabel.nextElementSibling?.setAttribute("data-mobile-info", `STR ${confidence}%`);
}
  cardEl?.classList.toggle("mobile-bullish", buyPct >= sellPct);
  cardEl?.classList.toggle("mobile-bearish", sellPct > buyPct);

  if (!data._barsInit) {
  setBar(cardPrefix, "buy", buyPct, true);
  setBar(cardPrefix, "sell", sellPct, true);
  setBar(cardPrefix, "conf", confidence, true);
  data._barsInit = true;
} else {
  setBar(cardPrefix, "buy", buyPct);
  setBar(cardPrefix, "sell", sellPct);
  setBar(cardPrefix, "conf", confidence);
}

  const marketTag = document.getElementById(`${cardPrefix}-market-tag`);
  const qualityTag = document.getElementById(`${cardPrefix}-quality-tag`);
  const timingTag = document.getElementById(`${cardPrefix}-timing-tag`);

  const rawMarketText = marketCondition.replaceAll("_", " ");
  const rawQualityText = entryQuality.replaceAll("_", " ");
  const rawTimingText = entryTiming.replaceAll("_", " ");

  let marketText = rawMarketText;
  let qualityText = rawQualityText;
  let timingText = rawTimingText;

  if (rawMarketText === "CHOPPY") marketText = LANG[currentLang].choppy;
  if (rawMarketText === "MIXED") marketText = LANG[currentLang].mixed;

  if (rawQualityText === "WEAK") qualityText = LANG[currentLang].weak;
  if (rawQualityText === "MEDIUM") qualityText = LANG[currentLang].medium;
  if (rawQualityText === "NEUTRAL") qualityText = LANG[currentLang].neutral;

  if (rawTimingText === "WEAK") timingText = LANG[currentLang].weak;
  if (rawTimingText === "MEDIUM") timingText = LANG[currentLang].medium;
  if (rawTimingText === "NEUTRAL") timingText = LANG[currentLang].neutral;
  if (marketClosed) {
  setTagStyle(marketTag, "gray", LANG[currentLang].marketClosed);
  setTagStyle(qualityTag, "gray", qualityText || "WAIT");
  setTagStyle(timingTag, "gray", LANG[currentLang].closed);
} else if (signal === "NO DATA") {
  setTagStyle(marketTag, "gray", "NO FEED");
  setTagStyle(qualityTag, "gray", "WAIT");
  setTagStyle(timingTag, "gray", "NO TIMING");
} else {
  if (marketText.includes("TRENDING")) {
    setTagStyle(marketTag, "green", marketText);
  } else if (marketText.includes("MIXED") || marketText.includes("CHOPPY")) {
    setTagStyle(marketTag, "gray", marketText);
  } else {
    setTagStyle(marketTag, "neutral", marketText);
  }

  if (qualityText === "STRONG") {
    setTagStyle(qualityTag, "green", qualityText);
  } else if (qualityText === "MEDIUM") {
    setTagStyle(qualityTag, "gold", qualityText);
  } else {
    setTagStyle(qualityTag, "gray", qualityText);
  }

  if (timingText.includes("GOOD")) {
    setTagStyle(timingTag, "green", timingText);
  } else if (timingText.includes("LATE")) {
    setTagStyle(timingTag, "gold", timingText);
  } else if (timingText.includes("WAIT PULLBACK")) {
    setTagStyle(timingTag, "gray", timingText);
  } else {
    setTagStyle(timingTag, "neutral", timingText);
  }
}
        // SMC PLAN PANEL DATA
    const smcSymbol = cardPrefix;

    const typeEl = document.getElementById(`${smcSymbol}-plan-type`);
    const biasEl = document.getElementById(`${smcSymbol}-plan-bias`);
    const entryEl = document.getElementById(`${smcSymbol}-entry-price`);
    const slEl = document.getElementById(`${smcSymbol}-sl`);
    const tp1El = document.getElementById(`${smcSymbol}-tp1`);
    const tp2El = document.getElementById(`${smcSymbol}-tp2`);
    const rrEl = document.getElementById(`${smcSymbol}-rr`);
    const invalidationEl = document.getElementById(`${smcSymbol}-invalidation`);
const reasonEl = document.getElementById(`${smcSymbol}-reason`);

const executedPlanSnapshot = data.executed_trade_setup_snapshot || null;
const planType = String(
  executedPlanSnapshot
    ? (data.smc_status || executedPlanSnapshot.status || "RUNNING")
    : (data.plan_type || "")
).toUpperCase();
const isHoldSignal = signal === "HOLD BUY" || signal === "HOLD SELL";
const strategyDebugForPlan = getSmcStrategyDebug(data);
const rrBlockedForPlan = hasStructureTpRrBlock(data, strategyDebugForPlan);
const rrDisplayForPlan = formatStructureTpRr(data, strategyDebugForPlan);
const safePlanType = rrBlockedForPlan
  ? "WAIT"
  : isHoldSignal
  ? "WAIT FOR STRATEGY CONFIRMATION"
  : executedPlanSnapshot ? planType : data.plan_type || "--";

if (typeEl) typeEl.textContent = safePlanType;
if (biasEl) biasEl.textContent = executedPlanSnapshot?.direction || (isHoldSignal ? "WAIT" : data.plan_bias || "--");

[typeEl, biasEl].forEach((el) => {
  if (!el) return;
  el.classList.remove("plan-buy", "plan-sell", "plan-exit", "plan-wait");

  if (!isHoldSignal && planType.includes("BUY")) el.classList.add("plan-buy");
  else if (!isHoldSignal && planType.includes("SELL")) el.classList.add("plan-sell");
  else if (planType.includes("EXIT")) el.classList.add("plan-exit");
  else el.classList.add("plan-wait");
});
if (entryEl) entryEl.textContent = executedPlanSnapshot?.entry ?? (isHoldSignal ? "--" : data.entry_price || "--");
if (slEl) slEl.textContent = executedPlanSnapshot?.sl ?? (isHoldSignal ? "--" : data.stop_loss || "--");
if (tp1El) tp1El.textContent = executedPlanSnapshot?.tp1 ?? (isHoldSignal ? "--" : data.tp1 || "--");
if (tp2El) tp2El.textContent = executedPlanSnapshot?.tp2 ?? (isHoldSignal ? "--" : data.tp2 || "--");
if (rrEl) {
  rrEl.textContent = rrBlockedForPlan
    ? `${rrDisplayForPlan} | Required RR 1.20 to 2.00`
    : isHoldSignal
      ? "--"
      : data.risk_reward || "--";
}
if (invalidationEl) invalidationEl.textContent = data.invalidation || "--";
if (reasonEl) {
  reasonEl.textContent = rrBlockedForPlan
    ? "TP swing found but RR is outside allowed window"
    : data.plan_reason || "--";
}

  // STRUCTURE PANEL DATA
  const trendEl = document.getElementById("structure-trend");
  const structureTypeEl = document.getElementById("structure-type");
  const nextEl = document.getElementById("structure-next");
  const resistanceEl = document.getElementById("structure-resistance");
  const supportEl = document.getElementById("structure-support");

  if (trendEl) trendEl.textContent = data.structure_trend || "--";
  if (structureTypeEl) structureTypeEl.textContent = data.structure_type || "--";
  if (nextEl) nextEl.textContent = data.structure_next || "--";
  if (resistanceEl) resistanceEl.textContent = data.structure_resistance || "--";
  if (supportEl) supportEl.textContent = data.structure_support || "--";

  const alertSignal = normalizeSignalAlert(signal, data);
  if (lastSignals[symbol] !== alertSignal) {
    const alertsOn = signalAlertsEnabled();
    const strongOnly = strongToggle ? strongToggle.checked : false;

    let shouldAlert =
    alertSignal === "BUY" ||
    alertSignal === "SELL" ||
    alertSignal === "EXIT BUY" ||
    alertSignal === "EXIT SELL";
    if (strongOnly) {
      shouldAlert = shouldAlert && qualityText === "STRONG";
    }

    if (shouldAlert && alertsOn) {
      playAlert(symbol, alertSignal);
    }

    lastSignals[symbol] = alertSignal;
  }
}
function updateSmcVisual(data) {
  const structure = String(data.structure_type || "").toUpperCase();
  const trend = String(data.structure_trend || "").toUpperCase();

  const liveLine = document.getElementById("smcLiveLine");
  const projection = document.getElementById("smcProjectionLine");
  const liquidityLayer = document.getElementById("smcLiquidityLayer");
  const bosText = document.getElementById("smcBosText");
  const chochText = document.getElementById("smcChochText");
  const bosLine = document.getElementById("smcBosLine");
  const chochLine = document.getElementById("smcChochLine");
  const lowText = document.getElementById("smcLowText");
  const highText = document.getElementById("smcHighText");

  if (!liveLine) return;

  const swings = (data.smc_swings || []).slice(-12);
  const equalHighs = data.equal_highs || [];
  const equalLows = data.equal_lows || [];

  if (swings.length < 3) {
    liveLine.setAttribute("points", "35,105 80,75 125,98 170,65 215,82 260,55");
    return;
  }

  const prices = swings.map(s => Number(s.price));
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice || 1;

  const pts = swings.map((s, i) => {
    const x = 30 + i * 24;
    const y = 125 - ((Number(s.price) - minPrice) / range) * 90;
    return { x, y, type: s.type, price: Number(s.price) };
  });

  liveLine.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
  
  liveLine.setAttribute("stroke", trend.includes("BEARISH") ? "#ef4444" : "#22c55e");
  liveLine.setAttribute("stroke-width", "4");

  const highs = pts.filter(p => p.type === "HIGH");
  const lows = pts.filter(p => p.type === "LOW");

  const lastHigh = highs[highs.length - 1];
  const lastLow = lows[lows.length - 1];

  if (lastHigh && highText) {
    highText.textContent = trend.includes("BEARISH") ? "LH" : "HH";
    highText.setAttribute("x", String(lastHigh.x - 8));
    highText.setAttribute("y", String(lastHigh.y - 10));
  }

  if (lastLow && lowText) {
    lowText.textContent = trend.includes("BEARISH") ? "LL" : "HL";
    lowText.setAttribute("x", String(lastLow.x - 8));
    lowText.setAttribute("y", String(lastLow.y + 20));
  }

  const bosPoint = structure.includes("SELL") ? lastLow : lastHigh;
  const chochPoint = structure.includes("SELL") ? lastHigh : lastLow;

  if (bosPoint && bosLine && bosText) {
    bosLine.setAttribute("x1", String(Math.max(30, bosPoint.x - 55)));
    bosLine.setAttribute("x2", String(Math.min(310, bosPoint.x + 55)));
    bosLine.setAttribute("y1", String(bosPoint.y));
    bosLine.setAttribute("y2", String(bosPoint.y));

    bosText.textContent = "BOS";
    bosText.setAttribute("x", String(bosPoint.x - 5));
    bosText.setAttribute("y", String(bosPoint.y - 24));
  }

  if (chochPoint && chochLine && chochText) {
    chochLine.setAttribute("x1", String(Math.max(30, chochPoint.x - 45)));
    chochLine.setAttribute("x2", String(Math.min(310, chochPoint.x + 45)));
    chochLine.setAttribute("y1", String(chochPoint.y));
    chochLine.setAttribute("y2", String(chochPoint.y));

    chochText.textContent = "CHOCH";
    chochText.setAttribute("x", String(chochPoint.x - 25));
    chochText.setAttribute("y", String(chochPoint.y + 32));
  }

  const showBos = structure.includes("BOS");
  const showChoch = structure.includes("CHOCH");

  if (bosLine) bosLine.style.opacity = showBos ? "1" : "0.25";
  if (bosText) bosText.style.opacity = showBos ? "1" : "0.3";

  if (chochLine) chochLine.style.opacity = showChoch ? "1" : "0";
  if (chochText) chochText.style.opacity = showChoch ? "1" : "0";

  if (projection && pts.length >= 2) {
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];

    projection.setAttribute(
      "points",
      `${prev.x},${prev.y} ${last.x},${last.y} ${last.x + 35},${last.y}`
    );

    projection.style.opacity = "0.55";
  }
}

function renderNewsImpact(symbol, newsData) {
  const normalizedSymbol = String(symbol || "EURUSD").toUpperCase();
  const data = newsData && typeof newsData === "object" ? newsData : null;
  const authoritativeNews = data?.news_trading && typeof data.news_trading === "object"
    ? data.news_trading
    : {};

  const titleEl = document.getElementById("news-impact-title");
  const updatedEl = document.getElementById("news-impact-updated");
  const emptyEl = document.getElementById("news-impact-empty");
  const contentEl = document.getElementById("news-impact-content");
  const eventEl = document.getElementById("news-impact-event-name");
  const currencyEl = document.getElementById("news-impact-currency");
  const timeEl = document.getElementById("news-impact-time");
  const countdownEl = document.getElementById("news-impact-countdown");
  const levelEl = document.getElementById("news-impact-level");
  const biasEl = document.getElementById("news-impact-bias");
  const effectLabelEl = document.getElementById("news-impact-effect-label");
  const effectEl = document.getElementById("news-impact-effect");
  const scoreEl = document.getElementById("news-impact-score");
  const decisionEl = document.getElementById("news-impact-decision");
  const forecastEl = document.getElementById("news-impact-forecast");
  const previousEl = document.getElementById("news-impact-previous");
  const actualEl = document.getElementById("news-impact-actual");
  const sourceEl = document.getElementById("news-impact-source");
  const cardEl = document.querySelector(".news-impact-card");
  const dotsEl = document.querySelector(".news-impact-dots");
  const biasNoteEl = document.getElementById("news-impact-bias-note");
  const effectNoteEl = document.getElementById("news-impact-effect-note");
  const decisionNoteEl = document.getElementById("news-impact-decision-note");
  const upcomingListEl = document.getElementById("news-impact-upcoming-list");
  const modeBadgeEl = document.getElementById("news-trading-mode-badge");

  if (!titleEl) return;

  const displayName = DISPLAY_NAMES[normalizedSymbol] || normalizedSymbol;
  titleEl.textContent = `NEWS IMPACT • ${displayName}`;
  if (modeBadgeEl && NEWS_MODE_VALUES.has(authoritativeNews.mode)) {
    modeBadgeEl.textContent = `NEWS MODE: ${displayNewsMode(authoritativeNews.mode)}`;
  }

  if (!data || data.unavailable) {
    currentNewsImpactWindow = null;
    currentUpcomingHighImpactEvents = [];
    renderUpcomingHighImpactEvents();
    if (cardEl) cardEl.className = "news-impact-card news-state-unavailable";
    if (updatedEl) updatedEl.textContent = "Last update: --";
    if (emptyEl) {
      emptyEl.textContent = "News unavailable.";
      emptyEl.classList.remove("hidden");
    }
    if (contentEl) contentEl.classList.add("hidden");
    return;
  }

  const hasNews = Boolean(
    data.event_name
    || data.next_event
    || data.news_event
    || data.event
  );
  const rawDecision = String(
    authoritativeNews.authoritative_status
    || data.trade_decision
    || data.decision
    || ""
  ).toUpperCase();
  const rawEventName = data.event_name || data.next_event || data.news_event || data.event || "--";
  const isNoNews = rawDecision.includes("NO_MAJOR_NEWS")
    || rawDecision.includes("NEWS_UNAVAILABLE")
    || String(rawEventName).toUpperCase().includes("NO MAJOR NEWS")
    || String(rawEventName).toUpperCase().includes("NEWS UNAVAILABLE");
  const eventName = rawEventName;
  const rawImpact = String(data.impact || data.impact_level || "").toUpperCase();
  const impact = isNoNews || !["HIGH", "MEDIUM", "LOW"].includes(rawImpact)
    ? "NEUTRAL"
    : rawImpact;
  const bias = data.news_bias || data.bias || "Neutral";
  const effect =
    data.symbol_effect
    || data.effect_on_symbol
    || data.effect
    || `${normalizedSymbol} Neutral`;
  const rawStatus = authoritativeNews.authoritative_status
    || data.trade_decision
    || data.display_status
    || data.status
    || data.decision
    || "";
  const decision = humanizeNewsStatus(rawStatus, data);
  const sourceLabel = data.source_label || data.source_used || data.source || "";
  const reasonText = authoritativeNews.blocking_reason
    || data.blocking_reason
    || data.news_reason
    || data.reason
    || "";
  const eventTime = authoritativeNews.event_time
    || data.time_utc
    || data.release_time
    || data.time
    || data.event_time;
  const rawScore = data.final_news_score ?? data.news_score ?? data.score;
  const score = Number.isFinite(Number(rawScore))
    ? Math.max(-25, Math.min(25, Number(rawScore)))
    : 0;

  if (updatedEl) {
    updatedEl.textContent = `Last update: ${data.last_update || data.updated_at || "--"}`;
  }

  if (emptyEl) emptyEl.classList.toggle("hidden", hasNews);
  if (contentEl) contentEl.classList.toggle("hidden", !hasNews);

  if (!hasNews && emptyEl) {
    emptyEl.textContent = "News unavailable.";
  }
  if (!hasNews) {
    currentNewsImpactWindow = null;
    currentUpcomingHighImpactEvents = [];
    renderUpcomingHighImpactEvents();
    updateNewsTradingWindow();
    return;
  }

  currentNewsImpactWindow = {
    eventTime,
    eventName,
    impact,
    authoritative: authoritativeNews,
  };
  currentUpcomingHighImpactEvents = Array.isArray(data.upcoming_high_impact)
    ? data.upcoming_high_impact
    : [];
  renderUpcomingHighImpactEvents(upcomingListEl);

  if (eventEl) eventEl.textContent = eventName;
  if (currencyEl) {
    currencyEl.textContent = `Currency affected: ${data.currency || data.currency_affected || "--"}`;
  }
  if (timeEl) {
    timeEl.textContent = formatNewsEventTime(eventTime);
  }
  if (countdownEl) {
    countdownEl.textContent = `Countdown: ${data.countdown || data.time_until_event || data.time_until || "--"}`;
  }
  if (levelEl) {
    levelEl.textContent = impact;
    levelEl.className = `news-impact-pill ${impact.toLowerCase()}`;
  }
  if (dotsEl) {
    const dotCount = impact === "HIGH" ? 3 : impact === "MEDIUM" ? 2 : impact === "LOW" ? 1 : 0;
    dotsEl.className = `news-impact-dots ${impact.toLowerCase()}`;
    dotsEl.innerHTML = Array.from({ length: dotCount }, () => "<i></i>").join("");
  }
  if (biasEl) biasEl.textContent = bias;
  if (biasNoteEl) {
    const surprise = authoritativeNews.normalized_surprise;
    biasNoteEl.textContent = Number.isFinite(Number(surprise))
      ? `${reasonText || "News evaluated"} • Surprise: ${Number(surprise).toFixed(3)}`
      : reasonText || "Backend-authoritative news status";
  }
  if (effectLabelEl) effectLabelEl.textContent = `EFFECT ON ${displayName}`;
  if (effectEl) {
    effectEl.textContent = effect;
    const effectRaw = String(effect).toUpperCase();
    effectEl.classList.toggle("effect-buy", effectRaw.includes("BUY"));
    effectEl.classList.toggle("effect-sell", effectRaw.includes("SELL"));
    if (effectNoteEl) {
      effectNoteEl.textContent = effectRaw.includes("SELL")
        ? `${displayName} may move down`
        : effectRaw.includes("BUY")
          ? `${displayName} may move up`
          : "Informational only";
    }
  }
  if (forecastEl) forecastEl.textContent = data.forecast || "--";
  if (previousEl) previousEl.textContent = data.previous || "--";
  if (actualEl) actualEl.textContent = data.actual || "--";
  if (sourceEl) sourceEl.textContent = sourceLabel || "--";
  if (scoreEl) {
    scoreEl.textContent = `${score > 0 ? "+" : ""}${score}`;
    scoreEl.classList.toggle("score-positive", score > 0);
    scoreEl.classList.toggle("score-negative", score < 0);
  }
  if (decisionEl) {
    decisionEl.textContent = decision;
    const decisionRaw = String(decision).toUpperCase();
    decisionEl.classList.toggle("decision-supports", decisionRaw.includes("SUPPORTS"));
    decisionEl.classList.toggle("decision-conflicts", decisionRaw.includes("CONFLICTS"));
    decisionEl.classList.toggle("decision-block", decisionRaw.includes("BLOCK"));
    if (decisionNoteEl) {
      const expiration = authoritativeNews.opportunity_expiration
        ? ` • Expires: ${formatNewsEventTime(authoritativeNews.opportunity_expiration)}`
        : "";
      const decisionNote = decisionRaw.includes("RELEASED")
        ? "Released - analysis updated"
        : decisionRaw.includes("DATA UNAVAILABLE")
          ? "Calendar data unavailable"
          : decisionRaw.includes("WAITING")
            ? "Waiting for release data"
            : reasonText || "Backend-authoritative status";
      decisionNoteEl.textContent = sourceLabel
        ? `${decisionNote} • Source: ${sourceLabel}${expiration}`
        : `${decisionNote}${expiration}`;
    }
    if (cardEl) {
      cardEl.className = "news-impact-card";
      if (decisionRaw.includes("CONFLICTS") || decisionRaw.includes("BLOCK")) {
        cardEl.classList.add("news-state-alert");
      } else if (decisionRaw.includes("SUPPORTS")) {
        cardEl.classList.add("news-state-supports");
      } else if (decisionRaw.includes("WAITING")) {
        cardEl.classList.add("news-state-waiting");
      } else if (isNoNews) {
        cardEl.classList.add("news-state-neutral");
      } else {
        cardEl.classList.add("news-state-neutral");
      }
    }
  }

  updateNewsTradingWindow();
}

function humanizeNewsStatus(status, data = {}) {
  const raw = String(status || "").toUpperCase().replaceAll("_", " ");
  const authoritativeStatuses = [
    "NEWS BLOCK",
    "WAITING FOR ACTUAL",
    "MIXED RESULT",
    "WAITING FOR 5M CONFIRMATION",
    "NEWS BUY READY",
    "NEWS SELL READY",
    "NEWS TRADE RUNNING",
    "NEWS OPPORTUNITY EXPIRED",
  ];
  const authoritative = authoritativeStatuses.find((value) => raw.includes(value));
  if (authoritative) return authoritative;
  if (raw.includes("NEWS UNAVAILABLE")) return "Data unavailable";
  if (raw.includes("NO MAJOR NEWS")) return "Neutral";
  if (raw.includes("WAITING FOR ACTUAL")) return "Waiting for actual data";
  if (raw.includes("WAITING FOR RELEASE")) return "Waiting for release";
  if (raw.includes("RELEASED")) return "Released";
  if (data.actual !== undefined && data.actual !== null && String(data.actual).trim() !== "") {
    return "Released";
  }
  return status || "Waiting for release";
}

function formatNewsEventTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return date.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch (error) {
    return String(value);
  }
}

function parseNewsWindowTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNewsWindowDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function setNewsWindowPhase(id, state, countdown) {
  const row = document.getElementById(id);
  if (!row) return;
  const countdownEl = row.querySelector("em");
  row.classList.toggle("active", state === "active");
  row.classList.toggle("completed", state === "completed");
  row.classList.toggle("pending", state === "pending");
  if (countdownEl) countdownEl.textContent = countdown || "--";
}

function formatUpcomingEventCountdown(value) {
  const eventTime = parseNewsWindowTime(value);
  if (!eventTime) return "--";
  const remainingMs = eventTime.getTime() - Date.now();
  if (remainingMs < 0) {
    return `Released ${formatNewsWindowDuration(Math.abs(remainingMs))} ago`;
  }
  return formatNewsWindowDuration(remainingMs);
}

function renderUpcomingHighImpactEvents(container = null) {
  const listEl = container || document.getElementById("news-impact-upcoming-list");
  if (!listEl) return;

  const events = Array.isArray(currentUpcomingHighImpactEvents)
    ? currentUpcomingHighImpactEvents.slice(0, 2)
    : [];
  listEl.replaceChildren();

  if (!events.length) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "news-impact-upcoming-empty";
    emptyEl.textContent = "No upcoming high-impact events.";
    listEl.appendChild(emptyEl);
    return;
  }

  events.forEach((event) => {
    const itemEl = document.createElement("div");
    itemEl.className = "news-impact-upcoming-event";

    const titleEl = document.createElement("strong");
    titleEl.textContent = event.event_name || event.event || "--";

    const metaEl = document.createElement("span");
    metaEl.textContent = `${event.currency || "--"} • ${event.impact || "--"}`;

    const timeEl = document.createElement("b");
    timeEl.textContent = formatNewsEventTime(event.time_utc || event.time);

    const countdownEl = document.createElement("em");
    countdownEl.dataset.eventTime = event.time_utc || event.time || "";
    countdownEl.textContent = formatUpcomingEventCountdown(countdownEl.dataset.eventTime);

    const sourceEl = document.createElement("small");
    sourceEl.textContent = event.source_label || event.source || "--";

    itemEl.append(titleEl, metaEl, timeEl, countdownEl, sourceEl);
    listEl.appendChild(itemEl);
  });
}

function updateUpcomingHighImpactCountdowns() {
  document
    .querySelectorAll("#news-impact-upcoming-list em[data-event-time]")
    .forEach((countdownEl) => {
      countdownEl.textContent = formatUpcomingEventCountdown(
        countdownEl.dataset.eventTime
      );
    });
}

function updateNewsTradingWindow() {
  const statusEl = document.getElementById("news-trading-window-status");
  const countdownEl = document.getElementById("news-trading-window-countdown");
  const releaseTime = parseNewsWindowTime(currentNewsImpactWindow?.eventTime);

  if (!statusEl || !countdownEl) return;

  const authoritative = currentNewsImpactWindow?.authoritative;
  if (authoritative && Object.keys(authoritative).length) {
    const status = String(
      authoritative.authoritative_status || "NORMAL"
    ).toUpperCase();
    const phase = String(authoritative.phase || "NORMAL").toUpperCase();
    statusEl.textContent = status;
    statusEl.className = status.includes("READY")
      ? "normal"
      : status === "NORMAL" || status.includes("EXPIRED")
        ? "normal"
        : phase === "RELEASE_LOCK"
          ? "release"
          : "high-risk";
    const expiration = parseNewsWindowTime(authoritative.opportunity_expiration);
    const remaining = expiration
      ? ` • Opportunity expires in ${formatNewsWindowDuration(expiration.getTime() - Date.now())}`
      : "";
    countdownEl.textContent = `${authoritative.blocking_reason || phase}${remaining}`;
    setNewsWindowPhase("news-window-normal-start", phase === "NORMAL" ? "active" : "completed", phase === "NORMAL" ? "Active now" : "Completed");
    setNewsWindowPhase("news-window-before", phase === "PRE_NEWS" ? "active" : phase === "NORMAL" ? "pending" : "completed", phase === "PRE_NEWS" ? "Backend block active" : "--");
    setNewsWindowPhase("news-window-release", phase === "RELEASE_LOCK" ? "active" : phase === "POST_NEWS_EVALUATION" ? "completed" : "pending", phase === "RELEASE_LOCK" ? "Waiting for verified actual" : "--");
    setNewsWindowPhase("news-window-after", phase === "POST_NEWS_EVALUATION" ? "active" : "pending", phase === "POST_NEWS_EVALUATION" ? status : "--");
    setNewsWindowPhase("news-window-normal", phase === "NORMAL" ? "active" : "pending", phase === "NORMAL" ? "Active now" : "Backend gate controls entry");
    return;
  }

  if (!releaseTime) {
    statusEl.textContent = "NORMAL TRADING";
    statusEl.className = "normal";
    countdownEl.textContent = "News protection inactive.";
    setNewsWindowPhase("news-window-normal-start", "active", "Active now");
    setNewsWindowPhase("news-window-before", "pending", "--");
    setNewsWindowPhase("news-window-release", "pending", "--");
    setNewsWindowPhase("news-window-after", "pending", "--");
    setNewsWindowPhase("news-window-normal", "pending", "--");
    return;
  }

  const now = Date.now();
  const releaseMs = releaseTime.getTime();
  const beforeStartMs = releaseMs - NEWS_PROTECTION_BEFORE_MS;
  const releaseEndMs = releaseMs + NEWS_RELEASE_PHASE_MS;
  const protectionEndMs = releaseMs + NEWS_PROTECTION_AFTER_MS;

  if (now < beforeStartMs) {
    statusEl.textContent = "NORMAL TRADING";
    statusEl.className = "normal";
    countdownEl.textContent = "News protection inactive.";
    setNewsWindowPhase(
      "news-window-normal-start",
      "active",
      `Protection begins in ${formatNewsWindowDuration(beforeStartMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-before",
      "pending",
      `Starts in ${formatNewsWindowDuration(beforeStartMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-release",
      "pending",
      `Starts in ${formatNewsWindowDuration(releaseMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-after",
      "pending",
      `Starts in ${formatNewsWindowDuration(releaseMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-normal",
      "active",
      `Protection begins in ${formatNewsWindowDuration(beforeStartMs - now)}`
    );
    return;
  }

  if (now < releaseMs) {
    statusEl.textContent = "HIGH RISK";
    statusEl.className = "high-risk";
    countdownEl.textContent = `Trading resumes in ${formatNewsWindowDuration(protectionEndMs - now)}`;
    setNewsWindowPhase("news-window-normal-start", "completed", "Completed");
    setNewsWindowPhase(
      "news-window-before",
      "active",
      `Release in ${formatNewsWindowDuration(releaseMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-release",
      "pending",
      `Starts in ${formatNewsWindowDuration(releaseMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-after",
      "pending",
      `Starts in ${formatNewsWindowDuration(releaseMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-normal",
      "pending",
      `Begins in ${formatNewsWindowDuration(protectionEndMs - now)}`
    );
    return;
  }

  if (now < releaseEndMs) {
    statusEl.textContent = "DURING RELEASE";
    statusEl.className = "release";
    countdownEl.textContent = `Trading resumes in ${formatNewsWindowDuration(protectionEndMs - now)}`;
    setNewsWindowPhase("news-window-normal-start", "completed", "Completed");
    setNewsWindowPhase("news-window-before", "completed", "Completed");
    setNewsWindowPhase(
      "news-window-release",
      "active",
      `Extreme window ends in ${formatNewsWindowDuration(releaseEndMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-after",
      "pending",
      `Stabilizes in ${formatNewsWindowDuration(protectionEndMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-normal",
      "pending",
      `Begins in ${formatNewsWindowDuration(protectionEndMs - now)}`
    );
    return;
  }

  if (now < protectionEndMs) {
    statusEl.textContent = "HIGH RISK";
    statusEl.className = "high-risk";
    countdownEl.textContent = `Trading resumes in ${formatNewsWindowDuration(protectionEndMs - now)}`;
    setNewsWindowPhase("news-window-normal-start", "completed", "Completed");
    setNewsWindowPhase("news-window-before", "completed", "Completed");
    setNewsWindowPhase("news-window-release", "completed", "Completed");
    setNewsWindowPhase(
      "news-window-after",
      "active",
      `Ends in ${formatNewsWindowDuration(protectionEndMs - now)}`
    );
    setNewsWindowPhase(
      "news-window-normal",
      "pending",
      `Begins in ${formatNewsWindowDuration(protectionEndMs - now)}`
    );
    return;
  }

  statusEl.textContent = "NORMAL TRADING";
  statusEl.className = "normal";
  countdownEl.textContent = "News protection inactive.";
  setNewsWindowPhase("news-window-normal-start", "completed", "Completed");
  setNewsWindowPhase("news-window-before", "completed", "Completed");
  setNewsWindowPhase("news-window-release", "completed", "Completed");
  setNewsWindowPhase("news-window-after", "completed", "Completed");
  setNewsWindowPhase("news-window-normal", "active", "Active now");
}

function formatFundamentalNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function normalizeFundamentalSymbol(value) {
  const symbol = String(value || "EURUSD").trim().toUpperCase();
  return FUNDAMENTAL_INSIGHT_SYMBOLS.has(symbol) ? symbol : "EURUSD";
}

function getFundamentalInsightState(symbol) {
  const normalized = normalizeFundamentalSymbol(symbol);
  if (!fundamentalInsightStates.has(normalized)) {
    fundamentalInsightStates.set(normalized, {
      cache: null,
      inflight: null,
      fetchedAt: 0,
      retryAfter: 0,
    });
  }
  return fundamentalInsightStates.get(normalized);
}

function setFundamentalSymbolPresentation(symbol) {
  const normalized = normalizeFundamentalSymbol(symbol);
  const isGold = normalized === "XAUUSD";
  const values = {
    "fundamental-symbol": normalized,
    "fundamental-primary-label": isGold ? "USD MACRO" : "USD STRENGTH",
    "fundamental-primary-mark": "USD",
    "fundamental-secondary-label": isGold ? "GOLD SUPPORT" : "EUR STRENGTH",
    "fundamental-secondary-mark": isGold ? "GOLD" : "EUR",
  };
  Object.entries(values).forEach(([id, text]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  });
  const card = document.getElementById("fundamental-insight-card");
  if (card) card.dataset.symbol = normalized;
}

function formatFundamentalUpdate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Last update: --";
  return `Last update: ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  })}`;
}

function fundamentalFactorLabel(value) {
  return String(value || "Fundamental")
    .replace(/_score$/i, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fundamentalFactorIcon(value) {
  const factor = String(value || "").toLowerCase();
  if (factor.includes("policy")) return "🏛";
  if (factor.includes("yield")) return "⌁";
  if (factor.includes("employment")) return "▥";
  if (factor.includes("inflation")) return "◉";
  if (factor.includes("growth")) return "↗";
  if (factor.includes("risk")) return "◇";
  return "✦";
}

function fundamentalStrengthLabel(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return "--";
  if (score >= 35) return "STRONG";
  if (score > 5) return "POSITIVE";
  if (score <= -35) return "VERY WEAK";
  if (score < -5) return "WEAK";
  return "NEUTRAL";
}

function formatFundamentalCountdown(releaseTime, fallbackSeconds = null) {
  const parsed = new Date(releaseTime);
  let seconds = Number.isNaN(parsed.getTime())
    ? Number(fallbackSeconds)
    : Math.max(0, Math.floor((parsed.getTime() - Date.now()) / 1000));
  if (!Number.isFinite(seconds)) return "--";
  seconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function renderFundamentalReasons(reasons) {
  const list = document.getElementById("fundamental-reasons-list");
  if (!list) return;
  list.replaceChildren();
  const items = Array.isArray(reasons) ? reasons.slice(0, 3) : [];
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "fundamental-empty-copy";
    empty.textContent = "No evidence-backed directional reasons are available.";
    list.appendChild(empty);
    return;
  }
  items.forEach((reason) => {
    const row = document.createElement("article");
    const direction = String(reason.direction || "NEUTRAL").toUpperCase();
    const tone = direction.includes("BULLISH")
      ? "bullish"
      : direction.includes("BEARISH")
        ? "bearish"
        : "neutral";
    row.className = `fundamental-reason fundamental-reason-${tone}`;

    const icon = document.createElement("span");
    icon.className = "fundamental-reason-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = fundamentalFactorIcon(reason.factor);

    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = [reason.currency, fundamentalFactorLabel(reason.factor)].filter(Boolean).join(" ");
    const summary = document.createElement("span");
    summary.textContent = reason.summary || "Evidence-backed fundamental factor.";
    const badge = document.createElement("em");
    badge.textContent = direction;
    copy.append(title, summary);
    row.append(icon, copy, badge);
    list.appendChild(row);
  });
}

function renderFundamentalEvent(event) {
  const container = document.getElementById("fundamental-event-content");
  if (!container) return;
  container.replaceChildren();
  if (!event || typeof event !== "object") {
    const empty = document.createElement("p");
    empty.className = "fundamental-empty-copy";
    empty.textContent = "No trusted high-impact event currently available.";
    container.appendChild(empty);
    return;
  }

  const heading = document.createElement("div");
  heading.className = "fundamental-event-heading";
  const currency = document.createElement("span");
  currency.className = "fundamental-event-currency";
  currency.textContent = event.currency || "--";
  const name = document.createElement("strong");
  name.textContent = event.event_name || "High-impact event";
  heading.append(currency, name);

  const countdown = document.createElement("div");
  countdown.className = "fundamental-event-countdown";
  countdown.dataset.releaseTime = event.release_time || "";
  countdown.dataset.fallbackSeconds = Number.isFinite(Number(event.countdown))
    ? String(event.countdown)
    : "";
  countdown.textContent = formatFundamentalCountdown(event.release_time, event.countdown);

  const values = document.createElement("dl");
  values.className = "fundamental-event-values";
  const fields = [
    ["Previous", event.previous],
    ["Forecast", event.forecast],
    ...(event.actual !== null && event.actual !== undefined && String(event.actual).trim() !== ""
      ? [["Actual", event.actual]]
      : []),
    ["Impact", event.impact || "UNKNOWN"],
  ];
  fields.forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.textContent = value === null || value === undefined || String(value).trim() === "" ? "--" : value;
    if (label === "Impact") detail.className = `impact-${String(value || "unknown").toLowerCase()}`;
    values.append(term, detail);
  });
  container.append(heading, countdown, values);
}

function fundamentalQualityMessages(data) {
  const messages = [];
  const currencies = data?.currency_strength || {};
  Object.entries(currencies).forEach(([currency, state]) => {
    Object.entries(state?.factors || {}).forEach(([factor, detail]) => {
      if (String(detail?.status || "").toUpperCase() === "STALE") {
        messages.push(`${currency} ${fundamentalFactorLabel(factor).toLowerCase()} stale`);
      }
    });
    (state?.missing_factors || []).forEach((factor) => {
      messages.push(`${currency} ${fundamentalFactorLabel(factor).toLowerCase()} missing`);
    });
  });
  const drivers = data?.drivers || {};
  Object.entries(drivers).forEach(([factor, detail]) => {
    const status = String(detail?.status || "").toUpperCase();
    if (status === "STALE") {
      messages.push(`${fundamentalFactorLabel(factor)} stale`);
    } else if (status === "INSUFFICIENT_DATA") {
      messages.push(`${fundamentalFactorLabel(factor)} unavailable`);
    }
  });
  const quality = data?.data_quality || {};
  (quality.missing_factors || []).forEach((factor) => {
    const label = fundamentalFactorLabel(factor);
    const alreadyReported = messages.some((message) => message.toLowerCase().startsWith(label.toLowerCase()));
    if (!alreadyReported) messages.push(`${label} unavailable`);
  });
  const driverProvisional = Object.values(drivers).reduce(
    (total, detail) => total + Number(detail?.provisional_count || 0),
    0,
  );
  const provisional = Number(quality.provisional_factor_count ?? driverProvisional);
  if (provisional > 0) messages.push(`${provisional} provisional evidence item${provisional === 1 ? "" : "s"}`);
  const failures = Number(quality.provider_failures_recent || 0);
  if (failures > 0) messages.push(`${failures} recent provider warning${failures === 1 ? "" : "s"}`);
  if (String(data?.overall_bias?.status || "").toUpperCase() === "INSUFFICIENT_DATA") {
    messages.push("Insufficient fundamental coverage");
  }
  return [...new Set(messages)].slice(0, 4);
}

function applyFundamentalStrengthTone(element, score) {
  if (!element) return;
  const value = Number(score);
  element.classList.remove("is-positive", "is-negative", "is-neutral");
  element.classList.add(
    !Number.isFinite(value) || Math.abs(value) < 0.005
      ? "is-neutral"
      : value > 0
        ? "is-positive"
        : "is-negative"
  );
}

function renderFundamentalInsight(data, options = {}) {
  const card = document.getElementById("fundamental-insight-card");
  if (!card) return;
  const symbol = normalizeFundamentalSymbol(options.symbol || data?.symbol || currentChartSymbol);
  const isGold = symbol === "XAUUSD";
  const overall = data?.overall_bias || {};
  const insufficient = String(overall.status || "").toUpperCase() !== "ACTIVE";
  const direction = insufficient ? "NEUTRAL" : String(overall.direction || "NEUTRAL").toUpperCase();
  const confidence = Number(overall.confidence);
  const usd = isGold
    ? { score: data?.usd_macro_score }
    : data?.currency_strength?.USD || {};
  const secondary = isGold
    ? { score: data?.gold_support_score }
    : data?.currency_strength?.EUR || {};
  const statusLine = document.getElementById("fundamental-status-line");
  const refreshButton = document.getElementById("fundamental-refresh-btn");

  setFundamentalSymbolPresentation(symbol);
  card.dataset.bias = ["BUY", "SELL"].includes(direction) ? direction : "NEUTRAL";
  card.dataset.state = options.error ? "error" : insufficient ? "insufficient" : "ready";
  document.getElementById("fundamental-bias").textContent = direction;
  document.getElementById("fundamental-confidence").textContent = insufficient
    ? "Insufficient fundamental data"
    : `${Number.isFinite(confidence) ? confidence.toFixed(2) : "--"}% Confidence`;
  document.getElementById("fundamental-usd-strength").textContent = formatFundamentalNumber(usd.score);
  document.getElementById("fundamental-eur-strength").textContent = formatFundamentalNumber(secondary.score);
  document.getElementById("fundamental-usd-label").textContent = fundamentalStrengthLabel(usd.score);
  document.getElementById("fundamental-eur-label").textContent = fundamentalStrengthLabel(secondary.score);
  applyFundamentalStrengthTone(card.querySelector(".fundamental-strength-usd"), usd.score);
  applyFundamentalStrengthTone(card.querySelector(".fundamental-strength-eur"), secondary.score);
  document.getElementById("fundamental-last-update").textContent = formatFundamentalUpdate(data?.generated_at);

  renderFundamentalReasons(insufficient ? [] : data?.top_reasons);
  renderFundamentalEvent(data?.next_high_impact_event);

  const guidance = data?.trading_guidance || {};
  const preference = insufficient ? "INSUFFICIENT_DATA" : String(guidance.preference || "NEUTRAL").toUpperCase();
  document.getElementById("fundamental-guidance-preference").textContent = preference === "PREFER_BUY"
    ? "Prefer BUY setups"
    : preference === "PREFER_SELL"
      ? "Prefer SELL setups"
      : preference === "INSUFFICIENT_DATA"
        ? "Neutral — insufficient data"
        : "Neutral fundamental guidance";
  document.getElementById("fundamental-guidance-message").textContent = guidance.message
    || (insufficient ? "Fundamental evidence is currently insufficient." : "No strong fundamental directional advantage.");

  const qualityNote = document.getElementById("fundamental-quality-note");
  const qualityMessages = fundamentalQualityMessages(data);
  qualityNote.textContent = qualityMessages.join(" • ");
  qualityNote.classList.toggle("hidden", !qualityMessages.length);

  if (statusLine) {
    statusLine.textContent = options.error
      ? `Showing last successful result • Refresh failed: ${options.error}`
      : insufficient
        ? "Fundamental evidence is incomplete."
        : "";
    statusLine.classList.toggle("hidden", !statusLine.textContent);
  }
  if (refreshButton) refreshButton.disabled = false;
}

function renderFundamentalLoading(symbol) {
  const normalized = normalizeFundamentalSymbol(symbol);
  const card = document.getElementById("fundamental-insight-card");
  const statusLine = document.getElementById("fundamental-status-line");
  setFundamentalSymbolPresentation(normalized);
  if (card) {
    card.dataset.bias = "NEUTRAL";
    card.dataset.state = "loading";
  }
  ["fundamental-bias", "fundamental-usd-strength", "fundamental-eur-strength",
    "fundamental-usd-label", "fundamental-eur-label"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = id === "fundamental-bias" ? "NEUTRAL" : "--";
  });
  const confidence = document.getElementById("fundamental-confidence");
  if (confidence) confidence.textContent = "--% Confidence";
  const update = document.getElementById("fundamental-last-update");
  if (update) update.textContent = "Last update: --";
  renderFundamentalReasons([]);
  renderFundamentalEvent(null);
  const preference = document.getElementById("fundamental-guidance-preference");
  const message = document.getElementById("fundamental-guidance-message");
  if (preference) preference.textContent = "Loading";
  if (message) message.textContent = `Loading ${normalized} fundamental data.`;
  const quality = document.getElementById("fundamental-quality-note");
  if (quality) {
    quality.textContent = "";
    quality.classList.add("hidden");
  }
  if (statusLine) {
    statusLine.textContent = `Loading ${normalized} fundamental insight…`;
    statusLine.classList.remove("hidden");
  }
}

function renderFundamentalUnavailable(error, symbol = currentChartSymbol) {
  const card = document.getElementById("fundamental-insight-card");
  const statusLine = document.getElementById("fundamental-status-line");
  const refreshButton = document.getElementById("fundamental-refresh-btn");
  setFundamentalSymbolPresentation(symbol);
  if (card) {
    card.dataset.bias = "NEUTRAL";
    card.dataset.state = "error";
  }
  if (statusLine) {
    statusLine.textContent = `Fundamental insight unavailable${error ? ` • ${error}` : ""}`;
    statusLine.classList.remove("hidden");
  }
  if (refreshButton) refreshButton.disabled = false;
}

function updateFundamentalEventCountdown() {
  const countdown = document.querySelector(".fundamental-event-countdown[data-release-time]");
  if (!countdown) return;
  countdown.textContent = formatFundamentalCountdown(
    countdown.dataset.releaseTime,
    countdown.dataset.fallbackSeconds,
  );
}

async function fetchFundamentalInsight(options = {}) {
  const force = options.force === true;
  const symbol = normalizeFundamentalSymbol(options.symbol || currentChartSymbol);
  const state = getFundamentalInsightState(symbol);
  const renderRequest = ++fundamentalInsightRenderRequest;
  const isCurrentRequest = () => (
    normalizeFundamentalSymbol(currentChartSymbol) === symbol
    && renderRequest === fundamentalInsightRenderRequest
  );
  const now = Date.now();
  const cacheFresh = state.cache && now - state.fetchedAt < FUNDAMENTAL_INSIGHT_CACHE_MS;
  const retryBlocked = now < state.retryAfter;

  if (options.symbolSwitch) renderFundamentalLoading(symbol);
  else setFundamentalSymbolPresentation(symbol);

  if (state.cache && !force && (cacheFresh || retryBlocked)) {
    if (isCurrentRequest()) {
      renderFundamentalInsight(state.cache, {
        symbol,
        ...(retryBlocked ? { error: "Retry scheduled" } : {}),
      });
    }
    const refreshButton = document.getElementById("fundamental-refresh-btn");
    if (refreshButton) refreshButton.disabled = false;
    return state.cache;
  }

  const refreshButton = document.getElementById("fundamental-refresh-btn");
  const statusLine = document.getElementById("fundamental-status-line");
  if (refreshButton) refreshButton.disabled = true;
  if (statusLine && !state.cache && !options.symbolSwitch) {
    statusLine.textContent = `Loading ${symbol} fundamental insight…`;
    statusLine.classList.remove("hidden");
  }

  if (!state.inflight) {
    const refreshQuery = options.bypassBackendCache === true ? "&refresh=true" : "";
    const request = fetch(`${BASE_URL}/fundamentals/insight?symbol=${encodeURIComponent(symbol)}${refreshQuery}`, {
      method: "GET",
      cache: "no-store",
      timeoutMs: 30000,
      suppressErrorPanel: true,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const validModel = symbol === "XAUUSD"
          ? data?.drivers && Number.isFinite(Number(data?.usd_macro_score))
          : data?.currency_strength?.USD && data?.currency_strength?.EUR;
        if (!data || normalizeFundamentalSymbol(data.symbol) !== symbol || !data.overall_bias || !validModel) {
          throw new Error("Invalid Fundamental Insight response");
        }
        state.cache = data;
        state.fetchedAt = Date.now();
        state.retryAfter = 0;
        return { data, error: null };
      })
      .catch((error) => {
        console.warn(`${symbol} fundamental insight unavailable:`, error);
        state.retryAfter = Date.now() + FUNDAMENTAL_INSIGHT_FAILURE_BACKOFF_MS;
        return { data: state.cache, error: error.message || "Request failed" };
      })
      .finally(() => {
        if (state.inflight === request) state.inflight = null;
      });
    state.inflight = request;
  }

  const result = await state.inflight;
  if (isCurrentRequest()) {
    if (result.data) renderFundamentalInsight(result.data, { symbol, ...(result.error ? { error: result.error } : {}) });
    else renderFundamentalUnavailable(result.error, symbol);
    if (refreshButton) refreshButton.disabled = false;
  }
  return result.data;
}

function refreshNewsImpact(symbol = currentChartSymbol, options = {}) {
  return fetchFundamentalInsight({ symbol, force: options.force === true, symbolSwitch: options.symbolSwitch === true });
}

function dashboardRuntimeActive() {
  if (document.hidden === true || !mainApp) return false;
  if (document.body?.dataset?.activeSettingsPage) return false;
  return !mainApp.classList.contains("hidden")
    && !mainApp.classList.contains("locked")
    && mainApp.style.display !== "none";
}

function fundamentalInsightPollingActive() {
  return dashboardRuntimeActive();
}

function pollFundamentalInsightIfActive() {
  if (!fundamentalInsightPollingActive()) return Promise.resolve(null);
  return fetchFundamentalInsight({ symbol: currentChartSymbol, force: true });
}

function handleFundamentalVisibilityChange() {
  if (!fundamentalInsightPollingActive()) return Promise.resolve(null);
  return fetchFundamentalInsight({ symbol: currentChartSymbol, force: true });
}

function refreshAllNewsImpact() {
  if (!fundamentalInsightPollingActive()) return Promise.resolve(null);
  return fetchFundamentalInsight({ symbol: currentChartSymbol, force: false });
}

function refreshFundamentalInsight() {
  return fetchFundamentalInsight({
    symbol: currentChartSymbol,
    force: true,
    bypassBackendCache: true,
  });
}

document.getElementById("fundamental-refresh-btn")?.addEventListener("click", () => {
  refreshFundamentalInsight();
});

const v2ShadowState = { request: 0, cache: new Map() };

function v2ShadowText(key) {
  const language = String(currentLang || "en").toLowerCase();
  const copy = {
    en: { loading: "Loading forward shadow data…", unavailable: "Shadow data unavailable", noTrades: "No forward shadow trades yet.", retest: "Retest", noOpen: "No shadow trade open", open: "Hypothetical trade open" },
    fr: { loading: "Chargement des données shadow…", unavailable: "Données shadow indisponibles", noTrades: "Aucun trade shadow pour le moment.", retest: "Retest", noOpen: "Aucun trade shadow ouvert", open: "Trade hypothétique ouvert" },
    es: { loading: "Cargando datos shadow…", unavailable: "Datos shadow no disponibles", noTrades: "Aún no hay operaciones shadow.", retest: "Retesteo", noOpen: "No hay operación shadow abierta", open: "Operación hipotética abierta" },
  };
  return (copy[language] || copy.en)[key] || key;
}

function setV2ShadowDecision(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  const decision = String(value || "WAIT").toUpperCase();
  element.textContent = decision;
  element.dataset.tone = decision.includes("BUY") ? "buy" : decision.includes("SELL") ? "sell" : "wait";
}

function renderV2Shadow(data, symbol) {
  const current = data?.current || {};
  const v1 = data?.v1 || {};
  const v2 = data?.v2 || {};
  document.getElementById("v2-shadow-card")?.setAttribute("data-state", "ready");
  document.getElementById("v2-shadow-symbol").textContent = symbol;
  document.getElementById("v2-shadow-status").textContent = data?.strategy_version || "V2 SHADOW";
  setV2ShadowDecision("v2-shadow-v1-decision", current.v1_decision);
  setV2ShadowDecision("v2-shadow-v2-decision", current.v2_decision);
  document.getElementById("v2-shadow-reason").textContent = current.v2_reason || "--";
  document.getElementById("v2-shadow-extension").textContent = Number.isFinite(Number(current.extension_atr)) ? `${Number(current.extension_atr).toFixed(2)} ATR` : "-- ATR";
  document.getElementById("v2-shadow-retest").textContent = `${v2ShadowText("retest")}: ${current.retest_timestamp ? new Date(current.retest_timestamp).toLocaleTimeString() : "--"}`;
  document.getElementById("v2-shadow-reset").textContent = current.post_sl_reset_state || "CLEAR";
  document.getElementById("v2-shadow-open").textContent = current.hypothetical_open_position ? v2ShadowText("open") : v2ShadowText("noOpen");
  document.getElementById("v2-shadow-v1-trades").textContent = v1.trade_decisions ?? 0;
  document.getElementById("v2-shadow-v1-linked").textContent = v1.linked_executions ?? 0;
  document.getElementById("v2-shadow-v1-extended").textContent = v1.entries_over_075_atr ?? 0;
  document.getElementById("v2-shadow-v2-trades").textContent = v2.trades ?? 0;
  document.getElementById("v2-shadow-v2-wl").textContent = `${v2.wins ?? 0} / ${v2.losses ?? 0}`;
  document.getElementById("v2-shadow-v2-net").textContent = `${Number(v2.net_r || 0).toFixed(2)}R`;
  document.getElementById("v2-shadow-started").textContent = data?.started_at ? new Date(data.started_at).toLocaleString() : "--";
  const history = document.getElementById("v2-shadow-history-list");
  const rows = Array.isArray(data?.recent_trades) ? data.recent_trades : [];
  if (history) {
    history.innerHTML = rows.length ? rows.slice(0, 5).map((row) => `
      <div class="v2-shadow-history-row">
        <span>${new Date(row.date_time).toLocaleString()}</span>
        <span>${row.direction || "--"}</span>
        <span>${row.outcome || "OPEN"}</span>
        <span>${row.r == null ? "--" : `${Number(row.r).toFixed(2)}R`}</span>
      </div>`).join("") : `<p>${v2ShadowText("noTrades")}</p>`;
  }
}

async function fetchV2Shadow(symbol = currentChartSymbol, options = {}) {
  const normalized = normalizeFundamentalSymbol(symbol);
  const request = ++v2ShadowState.request;
  const status = document.getElementById("v2-shadow-status");
  if (status && options.loading !== false) status.textContent = v2ShadowText("loading");
  try {
    const response = await fetch(`${BASE_URL}/shadow/v2/summary?symbol=${encodeURIComponent(normalized)}`, {
      method: "GET", cache: "no-store", timeoutMs: 15000, suppressErrorPanel: true,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data?.symbol !== normalized || data?.shadow_only !== true) throw new Error("Invalid shadow response");
    v2ShadowState.cache.set(normalized, data);
    if (request === v2ShadowState.request && currentChartSymbol === normalized) renderV2Shadow(data, normalized);
    return data;
  } catch (error) {
    console.warn("V2 shadow unavailable:", error);
    const cached = v2ShadowState.cache.get(normalized);
    if (request === v2ShadowState.request && currentChartSymbol === normalized) {
      if (cached) renderV2Shadow(cached, normalized);
      if (status) status.textContent = `${v2ShadowText("unavailable")}: ${error.message}`;
    }
    return cached || null;
  }
}

document.getElementById("v2-shadow-refresh")?.addEventListener("click", () => fetchV2Shadow(currentChartSymbol));

document.addEventListener("visibilitychange", handleFundamentalVisibilityChange);

function firstUsableValue(...values) {
  return values.find((value) => {
    if (value === undefined || value === null) return false;
    const text = String(value).trim();
    return text !== "" && text !== "--" && text.toUpperCase() !== "N/A";
  });
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const STRATEGY_STAGE_STATES = new Set([
  "PASSED",
  "FAILED",
  "BLOCKED",
  "NOT_EVALUATED",
]);

function normalizeStrategyStageState(value, fallback = "NOT_EVALUATED") {
  const raw = typeof value === "object" && value !== null
    ? value.state
    : value;
  const normalized = String(raw || "").trim().toUpperCase().replace(/\s+/g, "_");
  return STRATEGY_STAGE_STATES.has(normalized) ? normalized : fallback;
}

function getStrategyStageStates(data = {}, strategyDebug = {}) {
  const states = strategyDebug?.stage_states
    || data?.strategy_stage_states
    || data?.strategy_cycle?.stage_states
    || {};
  return {
    swingDetection: normalizeStrategyStageState(states.swing_detection),
    bos: normalizeStrategyStageState(states.fifteen_m_bos),
    fifteenClose: normalizeStrategyStageState(states.fifteen_m_close),
    ema: normalizeStrategyStageState(states.ema),
    fiveMinute: normalizeStrategyStageState(states.five_m_confirmation),
    consolidation: normalizeStrategyStageState(states.consolidation_gate),
    swingSl: normalizeStrategyStageState(states.swing_sl),
    tpRr: normalizeStrategyStageState(states.tp_rr),
    execution: normalizeStrategyStageState(states.execution),
  };
}

function strategyStagePassed(value) {
  return normalizeStrategyStageState(value) === "PASSED";
}

function strategyStageDisplay(value, blockedReason = "") {
  const state = normalizeStrategyStageState(value);
  if (state === "BLOCKED" && String(blockedReason).toUpperCase().includes("CONSOLIDATION")) {
    return "BLOCKED BY CONSOLIDATION";
  }
  return state.replace(/_/g, " ");
}

function getSmcStrategyDebug(data = {}) {
  const merged = {
    ...(data?.signal_diagnostics || {}),
    ...(data?.entry_strategy_debug || {}),
    ...(data?.strategy_debug || {}),
  };
  const breakData = data?.fifteen_m_swing_break || {};
  const confirmation5m = data?.confirmation_5m || {};
  const canonicalStages = data?.strategy_stage_states
    || data?.strategy_cycle?.stage_states
    || merged?.stage_states
    || {};
  merged.stage_states = canonicalStages;
  const breakSide = String(breakData?.side || data?.fifteen_m_setup || "").toUpperCase();

  if (merged.bos_detected == null) {
    merged.bos_detected = Boolean(
      merged.fifteen_m_swing_break === true
      || merged.fifteen_m_swing_break_confirmed === true
      || data?.fifteen_m_swing_break_confirmed === true
      || (["BUY", "SELL"].includes(breakSide) && breakData?.level != null)
    );
  }
  if (merged.choch_detected == null) merged.choch_detected = Boolean(data?.choch_detected);
  if (!merged.smc_direction && ["BUY", "SELL"].includes(breakSide)) merged.smc_direction = breakSide;
  if (merged.fifteen_m_close_confirmed == null) {
    merged.fifteen_m_close_confirmed = Boolean(
      data?.fifteen_m_close_confirmed
      ?? data?.fifteen_m_swing_break_confirmed
      ?? breakData?.close_confirmed
      ?? breakData?.confirmed
    );
  }
  if (merged.five_m_confirmation == null) {
    merged.five_m_confirmation = Boolean(
      data?.five_m_confirmation
      ?? data?.current_5m_entry_confirmation
      ?? confirmation5m?.close_confirmed
    );
  }
  if (!merged.selected_swing_sl) {
    merged.selected_swing_sl = firstUsableValue(
      data?.selected_swing_sl,
      data?.swing_sl_debug?.selected_swing_sl,
      data?.swing_sl_debug?.final_sl,
      data?.stop_loss
    );
  }
  if (merged.sl_valid == null) {
    merged.sl_valid = Boolean(merged.selected_swing_sl || data?.swing_sl_debug?.ok);
  }
  return merged;
}

function inferSmcPlanSide(data, signal) {
  const rawSignal = String(signal || "").toUpperCase();
  const planText = String(
    data?.plan_type
      || data?.structure_next
      || data?.blocked_reason
      || ""
  ).toUpperCase();
  const strategyDebug = getSmcStrategyDebug(data);
  const debugDirection = String(
    strategyDebug.smc_direction
      || strategyDebug.side
      || strategyDebug.final_signal
      || ""
  ).toUpperCase();

  if (rawSignal.includes("BUY") || planText.includes("BUY") || debugDirection.includes("BUY")) {
    return "BUY";
  }
  if (rawSignal.includes("SELL") || planText.includes("SELL") || debugDirection.includes("SELL")) {
    return "SELL";
  }

  const buyScore = Number(data?.buy_percentage ?? data?.buy_score);
  const sellScore = Number(data?.sell_percentage ?? data?.sell_score);
  if (Number.isFinite(buyScore) && Number.isFinite(sellScore) && Math.abs(buyScore - sellScore) >= 8) {
    return buyScore > sellScore ? "BUY" : "SELL";
  }
  return "WAIT";
}

function formatSmcLevel(symbol, value) {
  const number = numericValue(value);
  if (number === null) return firstUsableValue(value) || "--";
  const decimals = symbol === "XAUUSD" ? 2 : 5;
  return number.toFixed(decimals);
}

function formatSmcZone(symbol, level, side) {
  const number = numericValue(level);
  if (number === null) return "--";
  const buffer = symbol === "XAUUSD" ? 1.5 : 0.00015;
  const low = side === "SELL" ? number - buffer : number;
  const high = side === "SELL" ? number : number + buffer;
  return `${formatSmcLevel(symbol, low)} - ${formatSmcLevel(symbol, high)}`;
}

function setSmcText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value || "--";
}

function renderSmcWaitingList(items) {
  const listEl = document.getElementById("main-smc-waiting-list");
  if (!listEl) return;
  listEl.replaceChildren();

  items.forEach((item) => {
    const li = document.createElement("li");
    const state = item.state || (item.done ? "complete" : "missing");
    li.className = state;
    const mark = document.createElement("b");
    mark.textContent = state === "info" ? "•" : item.done ? "✓" : "✗";
    const text = document.createElement("span");
    text.textContent = item.label;
    li.append(mark, text);
    listEl.appendChild(li);
  });
}

function getConfirmedSwingSlValue(data = {}, strategyDebug = {}) {
  return firstUsableValue(
    strategyDebug.selected_swing_sl,
    strategyDebug.sl_source,
    strategyDebug.final_sl,
    strategyDebug.stop_loss,
    strategyDebug?.swing_sl_debug?.selected_swing_sl,
    strategyDebug?.swing_sl_debug?.final_sl,
    strategyDebug?.swing_sl_debug?.stop_loss,
    data?.selected_swing_sl,
    data?.swing_sl_debug?.selected_swing_sl,
    data?.swing_sl_debug?.final_sl,
    data?.swing_sl_debug?.stop_loss
  );
}

function hasConfirmedSwingSl(data = {}, strategyDebug = {}) {
  return Boolean(
    getConfirmedSwingSlValue(data, strategyDebug)
      || strategyDebug.sl_valid
      || data?.swing_sl_debug?.ok
      || strategyDebug?.swing_sl_debug?.ok
  );
}

function hasReachedSwingSlEvaluation(data = {}, strategyDebug = {}) {
  if (hasConfirmedSwingSl(data, strategyDebug)) return true;
  if (data?.swing_sl_debug || strategyDebug?.swing_sl_debug) return true;
  if (data?.swing_sl_validation || strategyDebug?.swing_sl_validation) return true;

  const swingSlText = [
    data?.blocked_by,
    data?.blocked_reason,
    data?.blocker_rule_name,
    data?.entry_timing,
    data?.plan_reason,
    strategyDebug?.blocked_by,
    strategyDebug?.blocked_reason,
    strategyDebug?.block_reason,
  ].map((value) => String(value || "").toUpperCase()).join(" ");

  return (
    swingSlText.includes("SWING_SL")
    || swingSlText.includes("SWING SL")
    || swingSlText.includes("INVALID_RISK_REWARD")
    || swingSlText.includes("WAIT_VALID_STRUCTURE_TP")
    || swingSlText.includes("WAIT_STRUCTURE_REWARD_BELOW_MINIMUM")
    || swingSlText.includes("WAIT_RR_OUTSIDE_1_2_TO_2")
    || swingSlText.includes("NO_STRUCTURE_TP_IN_RR_WINDOW")
  );
}

function getSwingSlCheckStatus(data = {}, strategyDebug = {}) {
  const stages = getStrategyStageStates(data, strategyDebug);
  if (stages.swingSl === "PASSED") return "PASSED";
  if (stages.swingSl === "FAILED") return "FAILED";
  if (stages.swingSl === "BLOCKED") return "BLOCKED";
  if (hasConfirmedSwingSl(data, strategyDebug)) return "YES";
  if (hasReachedSwingSlEvaluation(data, strategyDebug)) return "NO";
  return "NOT_CALCULATED_YET";
}

function getFifteenMinuteBreak(data = {}, strategyDebug = {}) {
  return data?.fifteen_m_swing_break
    || strategyDebug?.fifteen_m_swing_break_detail
    || strategyDebug?.fifteen_m_swing_break_data
    || null;
}

function hasConfirmedFifteenMinuteBreak(data = {}, strategyDebug = {}) {
  const breakData = getFifteenMinuteBreak(data, strategyDebug);
  const breakSide = String(breakData?.side || "").toUpperCase();
  const breakLevel = firstUsableValue(
    strategyDebug?.fifteen_m_break_level,
    strategyDebug?.fifteen_m_swing_level,
    strategyDebug?.fifteen_m_bos_level,
    data?.fifteen_m_swing_level,
    data?.fifteen_m_bos_level,
    breakData?.level
  );

  return Boolean(
    strategyDebug?.fifteen_m_swing_break === true
      || strategyDebug?.fifteen_m_swing_break_confirmed === true
      || data?.fifteen_m_swing_break_confirmed === true
      || (["BUY", "SELL"].includes(breakSide) && breakLevel)
  );
}

function hasStructureTpRrBlock(data = {}, strategyDebug = {}) {
  const reasonText = [
    data?.reason,
    data?.reason_if_wait,
    data?.blocked_by,
    data?.blocked_reason,
    data?.blocker_rule_name,
    data?.entry_timing,
    data?.plan_reason,
    data?.rejection_reason,
    strategyDebug?.reason,
    strategyDebug?.reason_if_wait,
    strategyDebug?.blocked_by,
    strategyDebug?.blocked_reason,
    strategyDebug?.block_reason,
    strategyDebug?.rejection_reason,
  ].map((value) => String(value || "").toUpperCase()).join(" ");

  return (
    reasonText.includes("NO_STRUCTURE_TP_IN_RR_WINDOW")
    || reasonText.includes("WAIT_RR_OUTSIDE_1_2_TO_2")
    || reasonText.includes("ATTENTE_NO_STRUCTURE_TP_IN_RR_WINDOW")
  );
}

function getStructureTpRrValue(data = {}, strategyDebug = {}) {
  const directValue = firstUsableValue(
    data?.risk_reward_ratio,
    data?.structure_reward_ratio,
    strategyDebug?.risk_reward_ratio,
    strategyDebug?.structure_reward_ratio
  );
  const directNumber = numericValue(directValue);
  if (directNumber !== null) return directNumber;

  const candidateLists = [
    data?.rejected_tp_candidates,
    data?.tp_candidate_rejections,
    strategyDebug?.rejected_tp_candidates,
    strategyDebug?.tp_candidate_rejections,
  ];

  for (const list of candidateLists) {
    if (!Array.isArray(list)) continue;
    const candidate = list.find((item) => numericValue(item?.risk_reward_ratio) !== null);
    if (candidate) return numericValue(candidate.risk_reward_ratio);
  }

  return null;
}

function formatStructureTpRr(data = {}, strategyDebug = {}) {
  const rr = getStructureTpRrValue(data, strategyDebug);
  return rr === null ? "Calculated RR: --" : `Calculated RR: ${rr.toFixed(2)}`;
}

function updateSmcPlanIntelligence(symbol, data, signal, strategyDebug = {}) {
  const normalizedSymbol = String(symbol || currentChartSymbol || "EURUSD").toUpperCase();
  const executedSnapshot = data?.executed_trade_setup_snapshot;
  const snapshotSymbol = String(executedSnapshot?.symbol || "").toUpperCase();
  const snapshotPositionId = executedSnapshot?.broker_position_id ?? executedSnapshot?.position_id;
  if (
    executedSnapshot
    && snapshotSymbol === normalizedSymbol
    && snapshotPositionId !== undefined
    && snapshotPositionId !== null
  ) {
    const direction = String(executedSnapshot.direction || data?.active_trade_side || "").toUpperCase();
    const status = String(data?.smc_status || executedSnapshot.status || "RUNNING").toUpperCase();
    const breakLabel = executedSnapshot.break_level
      ? `Structure break at ${formatSmcLevel(normalizedSymbol, executedSnapshot.break_level)}`
      : "Structure break level";
    const waitingItems = [
      { label: `${executedSnapshot.bos_choch || direction} confirmed`, done: true },
      { label: breakLabel, done: true },
      { label: "15m close confirmation", done: true },
      { label: "5m confirmation close", done: true },
      { label: "Swing SL confirmed", done: true },
      { label: "TP/RR validation", done: true },
    ];
    const planIntel = document.getElementById("main-smc-plan-intel");
    if (planIntel) planIntel.classList.add("is-ready");
    setSmcText("main-smc-structure", tMarketText(String(executedSnapshot.structure || direction)));
    setSmcText("main-smc-trigger", status === "EXECUTED" ? "EXECUTED" : "RUNNING");
    setSmcText("main-smc-entry-zone", formatSmcLevel(normalizedSymbol, executedSnapshot.entry));
    setSmcText("main-smc-estimated-sl", formatSmcLevel(normalizedSymbol, executedSnapshot.swing_sl ?? executedSnapshot.sl));
    setSmcText("main-smc-estimated-tp", formatSmcLevel(normalizedSymbol, executedSnapshot.tp2));
    setSmcText("main-smc-progress-label", "100%");
    const progressBar = document.getElementById("main-smc-progress-bar");
    if (progressBar) progressBar.style.width = "100%";
    renderSmcWaitingList(waitingItems);
    return;
  }
  const side = inferSmcPlanSide(data, signal);
  const savedSetups = strategyDebug.saved_15m_setups || data?.saved_15m_setups || {};
  const expiredSetup = strategyDebug.expired_15m_setup || data?.expired_15m_setup || null;
  const savedSetupForSide = side && savedSetups ? savedSetups[side] : null;
  const savedSetupStatus = String(
    strategyDebug.saved_15m_setup_status
      || savedSetupForSide?.status
      || expiredSetup?.status
      || ""
  ).toUpperCase();
  const expiredSetupLevel = firstUsableValue(
    expiredSetup?.swing_level,
    expiredSetup?.broken_swing_price,
    expiredSetup?.level
  );
  const expiredSetupReason = firstUsableValue(
    expiredSetup?.expiration_reason,
    data?.setup_freshness_reason,
    strategyDebug.blocked_reason,
    "No 5m confirmation in time"
  );
  const expiredSetupActive = savedSetupStatus === "EXPIRED" && Boolean(expiredSetupLevel);
  const actionableTriggerLevel = side === "SELL"
    ? strategyDebug.actionable_15m_sell_level
    : side === "BUY"
      ? strategyDebug.actionable_15m_buy_level
      : null;
  const structure = firstUsableValue(
    data?.structure_trend,
    data?.structure_type,
    strategyDebug.htf_structure,
    strategyDebug.structure_type,
    "Neutral"
  );
  const triggerLevel = firstUsableValue(
    strategyDebug.entry_confirm_level,
    strategyDebug.fifteen_m_bos_level,
    data?.entry_confirm_level,
    data?.fifteen_m_bos_level,
    actionableTriggerLevel,
    side === "SELL" ? data?.structure_support : data?.structure_resistance
  );
  const selectedSwingSl = firstUsableValue(
    data?.stop_loss,
    data?.sl,
    strategyDebug.final_sl,
    strategyDebug.stop_loss,
    strategyDebug?.swing_sl_debug?.final_sl,
    strategyDebug?.swing_sl_debug?.stop_loss,
    strategyDebug.selected_swing_sl,
    data?.selected_swing_sl
  );
  const estimatedSlLevel = selectedSwingSl
    || (side === "SELL" ? data?.structure_resistance : data?.structure_support);
  const estimatedTpLevel = firstUsableValue(
    data?.tp2,
    data?.tp1,
    side === "SELL" ? data?.structure_support : data?.structure_resistance
  );

  const stageStates = getStrategyStageStates(data, strategyDebug);
  const hasCanonicalStages = Boolean(
    data?.strategy_stage_states
      || data?.strategy_cycle?.stage_states
      || strategyDebug?.stage_states
  );
  const smcShiftComplete = hasCanonicalStages
    ? strategyStagePassed(stageStates.bos)
    : Boolean(
      strategyDebug.bos_detected
        || strategyDebug.choch_detected
        || ["BUY", "SELL"].includes(String(strategyDebug.smc_direction || "").toUpperCase())
    );
  const swingBreakComplete = hasCanonicalStages
    ? strategyStagePassed(stageStates.bos)
    : hasConfirmedFifteenMinuteBreak(data, strategyDebug);
  const fifteenCloseComplete = hasCanonicalStages
    ? strategyStagePassed(stageStates.fifteenClose)
    : Boolean(
      strategyDebug.fifteen_m_close_confirmed
        ?? strategyDebug.fifteen_m_candle_close_confirmed
    );
  const swingSlComplete = hasCanonicalStages
    ? strategyStagePassed(stageStates.swingSl)
    : hasConfirmedSwingSl(data, strategyDebug);
  const fiveMinuteComplete = hasCanonicalStages
    ? strategyStagePassed(stageStates.fiveMinute)
    : Boolean(strategyDebug.five_m_confirmation);
  const rrBlocked = hasStructureTpRrBlock(data, strategyDebug);
  const reachedTpRrValidation = Boolean(
    rrBlocked
      || (
        smcShiftComplete
        && swingBreakComplete
        && fifteenCloseComplete
        && fiveMinuteComplete
        && swingSlComplete
      )
  );
  const rrComplete = Boolean(
    reachedTpRrValidation
      && !rrBlocked
      && firstUsableValue(
        data?.tp2,
        data?.risk_reward_ratio,
        data?.structure_reward_ratio,
        strategyDebug?.risk_reward_ratio,
        strategyDebug?.structure_reward_ratio
      )
  );
  const waitingForFiveMinuteConfirmation = Boolean(
    !expiredSetupActive
      && !fiveMinuteComplete
      && (
        savedSetupStatus === "PENDING"
        || savedSetupStatus === "DIRECT_15M_ENTRY"
        || swingBreakComplete
        || fifteenCloseComplete
      )
  );
  const liveTriggerLevel = expiredSetupActive ? null : triggerLevel;

  const panelMeta = data?._panel_meta || latestPanelMeta || {};
  const stalePanel = Boolean(panelMeta.stale_data);
  const triggerText = stalePanel
    ? "STALE DATA"
    : rrBlocked
    ? "TP swing found but RR is outside allowed window"
    : expiredSetupActive
    ? "Setup expired — waiting for fresh 15m BOS/CHOCH"
    : waitingForFiveMinuteConfirmation
      ? "15m break confirmed — waiting for 5m confirmation"
    : liveTriggerLevel
      ? `${side === "SELL" ? "Waiting for 15m close below" : side === "BUY" ? "Waiting for 15m close above" : "Waiting for 15m break near"} ${formatSmcLevel(normalizedSymbol, liveTriggerLevel)}`
    : strategyDebug.actionable_15m_levels_message
      ? strategyDebug.actionable_15m_levels_message
    : "Fresh 15m BOS/CHOCH";
  const waitingLabel = side === "SELL"
    ? "15m bearish BOS"
    : side === "BUY"
      ? "15m bullish BOS"
      : "15m BOS/CHOCH";

  const waitingItems = [
    { label: waitingLabel, done: smcShiftComplete },
    {
      label: liveTriggerLevel
        ? `${side === "SELL" ? "Break below" : side === "BUY" ? "Break above" : "Break near"} ${formatSmcLevel(normalizedSymbol, liveTriggerLevel)}`
        : "Structure break level",
      done: swingBreakComplete,
    },
    { label: "15m close confirmation", done: fifteenCloseComplete },
    { label: "5m confirmation close", done: fiveMinuteComplete },
    {
      label: swingSlComplete ? "Swing SL confirmed" : "Estimated SL found",
      done: swingSlComplete,
    },
  ];
  if (reachedTpRrValidation) {
    waitingItems.push({
      label: rrBlocked
        ? `${formatStructureTpRr(data, strategyDebug)} • Required RR 1.20 to 2.00`
        : "TP/RR validation",
      done: rrComplete,
    });
  }
  if (expiredSetupActive) {
    waitingItems.splice(
      1,
      0,
      {
        label: `Expired level: ${formatSmcLevel(normalizedSymbol, expiredSetupLevel)}`,
        state: "info",
      },
      {
        label: `Expired reason: ${expiredSetupReason}`,
        state: "info",
      },
    );
  }

  const completedCount = waitingItems.filter((item) => item.done).length;
  const progressItems = waitingItems.filter((item) => item.state !== "info");
  const progress = Math.round((completedCount / Math.max(1, progressItems.length)) * 100);
  const planIntel = document.getElementById("main-smc-plan-intel");
  if (planIntel) {
    planIntel.classList.toggle("is-ready", progress === 100 && !rrBlocked);
  }

  setSmcText("main-smc-structure", tMarketText(String(structure || "Neutral")));
  setSmcText("main-smc-trigger", triggerText);
  setSmcText("main-smc-entry-zone", formatSmcZone(normalizedSymbol, liveTriggerLevel, side));
  setSmcText(
    "main-smc-estimated-sl",
    estimatedSlLevel
      ? `${side === "SELL" ? "Above" : side === "BUY" ? "Below" : "Near"} ${formatSmcLevel(normalizedSymbol, estimatedSlLevel)}`
      : "--"
  );
  setSmcText("main-smc-estimated-tp", estimatedTpLevel ? formatSmcLevel(normalizedSymbol, estimatedTpLevel) : "--");
  setSmcText("main-smc-progress-label", rrBlocked ? "Blocked by RR" : `${progress}%`);
  const progressBar = document.getElementById("main-smc-progress-bar");
  if (progressBar) progressBar.style.width = `${progress}%`;
  renderSmcWaitingList(waitingItems);
}

function updateMainPanel(symbol) {
  if (!latestPanelData) return;

  const data = latestPanelData[symbol];

  if (!data) return;

 const smcData = data;
 updateSmcVisual(data);
  const marketClosed = Boolean(data.market_closed);
  const mainLive = document.querySelector(".main-live");
  const candleSourceState = data.signal_data_source || {};
  const panelMeta = data?._panel_meta || latestPanelMeta || {};
  const stalePanel = Boolean(panelMeta.stale_data);
  const feedAvailable = candleSourceState.available !== false;
  const feedStale =
    String(candleSourceState.tf_5m_source || "").toLowerCase().includes("stale")
    || String(candleSourceState.candle_source || "").toLowerCase().includes("stale");

  if (mainLive) {
    mainLive.textContent = stalePanel
      ? "• STALE DATA"
      : marketClosed
      ? `• ${LANG[currentLang].marketClosed}`
      : (!feedAvailable || feedStale)
      ? "• FEED STALE"
      : `• ${LANG[currentLang].live}`;
    mainLive.style.color =
      stalePanel || marketClosed || !feedAvailable || feedStale
        ? "#ef4444"
        : "#35ff8a";
  }

  let signal = getVisibleSignal(data);

  const displayScores = getFinalDisplayScores(data);
  const buyPct = displayScores.buy;
  const sellPct = displayScores.sell;
  const confidence = displayScores.confidence;


  const liveCandles = getLiveAugmentedCandles(
    latestRawPanelData?.candles?.[symbol]?.[currentChartTimeframe] || [],
    symbol,
    currentChartTimeframe,
    data.price || data.current_price || data.entry_price
  );

  const lastCandle = liveCandles[liveCandles.length - 1];

const fixedPrice =
  getLiveTickMid(symbol) || lastCandle?.close || data.entry_price || data.price;

const priceEl = document.getElementById("main-live-price");

if (priceEl) {
  priceEl.textContent = formatLivePrice(symbol, fixedPrice) || "Data unavailable";
}
  const candleDebugEl = document.getElementById("main-candle-debug");
  const candleSource = data.signal_data_source || {};
  const lastCandleTime =
    lastCandle?.time
    || candleSource.latest_5m_time
    || "--";
  const lastFetch = candleSource.last_successful_fetch || "--";
  const missedFetches = Number(candleSource.missed_fetch_count || 0);

  if (candleDebugEl) {
    const candleFreshness = formatChartCandleFreshness(
      lastCandleTime,
      currentChartTimeframe
    );
    const strategyCycle = data?.strategy_cycle || {};
    const decisionTime = strategyCycle.evaluation_time
      || panelMeta?.backend_decision_timestamps?.[symbol]
      || "--";
    const evaluatedM15 = strategyCycle.evaluated_m15_candle
      || panelMeta?.evaluated_m15_candles?.[symbol]
      || "--";
    const cacheAge = Number(panelMeta.cache_age_seconds);
    const lastSuccessfulRefresh = panelMeta.last_successful_refresh
      || panelMeta?.brain_refresh?.last_success
      || "--";
    candleDebugEl.textContent =
      `Candle ${currentChartTimeframe}: ${formatCandleDebugTime(lastCandleTime)}${candleFreshness.text} · `
      + `Source: ${String(candleSource.candle_source || candleSource.tf_5m_source || "cache")} · `
      + `Last fetch: ${formatCandleDebugTime(lastFetch)} · `
      + `Misses: ${missedFetches} · `
      + `Decision: ${formatCandleDebugTime(decisionTime)} · `
      + `M15 evaluated: ${formatCandleDebugTime(evaluatedM15)} · `
      + `Cache age: ${Number.isFinite(cacheAge) ? `${cacheAge}s` : "--"} · `
      + `Last success: ${formatCandleDebugTime(lastSuccessfulRefresh)}`;
    candleDebugEl.classList.toggle(
      "is-stale",
      stalePanel || candleFreshness.stale || missedFetches > 0 || !feedAvailable || feedStale
    );
  }

  console.log("CHART_CANDLE_DEBUG", {
    symbol,
    timeframe: currentChartTimeframe,
    candleCount: liveCandles.length,
    lastCandleTime,
    source: candleSource.candle_source || candleSource.tf_5m_source,
    lastSuccessfulFetch: lastFetch,
    missedFetchCount: missedFetches,
  });
  const displayName =
  DISPLAY_NAMES[symbol] || symbol;
  document.getElementById("main-symbol-title").innerHTML =
    symbol === "EURUSD"
      ? `${displayName} <img src="eurusd.png" class="main-symbol-icon">`
      : `${displayName} <img src="gold.png" class="main-symbol-icon gold-main-icon">`;

  const mainDisplaySignal =
    signal === "HOLD BUY"
      ? "WAIT"
      : signal === "HOLD SELL"
        ? "WAIT"
        : signal;
  document.getElementById("main-signal").textContent = tSignal(mainDisplaySignal);
  const mainSignal = document.getElementById("main-signal");
  const mainSignalNote = document.getElementById("main-signal-note");

  if (mainSignalNote) {
    mainSignalNote.classList.add("hidden");
  }

  if (mainSignal) {
    mainSignal.className = "main-signal-text";

    if (signal === "BUY") {
      mainSignal.classList.add("buy-text");
    } else if (signal === "SELL" || signal.includes("EXIT")) {
      mainSignal.classList.add("sell-text");
    } else {
      mainSignal.classList.add("wait-text");
    }
  }
  document.getElementById("main-buy").textContent = `${buyPct}%`;
  document.getElementById("main-sell").textContent = `${sellPct}%`;
  document.getElementById("main-confidence").textContent = `${confidence}%`;
  const mainLastSignal = document.getElementById("main-last-signal");
  const mainLocalTime = document.getElementById("main-local-time");

  if (mainLastSignal) {
    mainLastSignal.textContent = `${LANG[currentLang].lastSignal}: ${tSignal(mainDisplaySignal)}`;
  }

  if (mainLocalTime) {
    mainLocalTime.textContent = new Date().toLocaleTimeString();
  }

  const mainExecutedSnapshot = data.executed_trade_setup_snapshot || null;
  const mainExecutedStatus = mainExecutedSnapshot
    ? (data.smc_status || mainExecutedSnapshot.status || "RUNNING")
    : null;
  document.getElementById("main-plan-type").textContent = tMarketText(mainExecutedStatus || data.plan_type || "--");
  const mainPlanType = document.getElementById("main-plan-type");
  const mainPlanRaw = String(mainExecutedStatus || data.plan_type || "").toUpperCase();

  [mainPlanType].forEach((el) => {
    if (!el) return;

    el.classList.remove("plan-buy", "plan-sell", "plan-exit", "plan-wait");

    if (mainPlanRaw.includes("EXIT")) el.classList.add("plan-exit");
    else if (mainPlanRaw.includes("BUY")) el.classList.add("plan-buy");
    else if (mainPlanRaw.includes("SELL")) el.classList.add("plan-sell");
    else el.classList.add("plan-wait");
  });
  document.getElementById("main-entry-price").textContent = mainExecutedSnapshot?.entry ?? data.entry_price ?? "--";
  document.getElementById("main-sl").textContent = mainExecutedSnapshot?.sl ?? data.stop_loss ?? "--";
  document.getElementById("main-tp1").textContent = mainExecutedSnapshot?.tp1 ?? data.tp1 ?? "--";
  document.getElementById("main-tp2").textContent = mainExecutedSnapshot?.tp2 ?? data.tp2 ?? "--";
  const rawRiskReward = String(data.risk_reward || "").trim();
  const riskRewardLooksValid =
    rawRiskReward &&
    rawRiskReward.length <= 12 &&
    /^[0-9.:/\-\s]+$/.test(rawRiskReward);
  document.getElementById("main-rr").textContent = riskRewardLooksValid
    ? rawRiskReward
    : "--";

  const strategyDebug = getSmcStrategyDebug(data);
  updateSmcPlanIntelligence(symbol, data, signal, strategyDebug);
  const strategyStages = getStrategyStageStates(data, strategyDebug);
  const hasCanonicalStrategyStages = Boolean(
    data?.strategy_stage_states
      || data?.strategy_cycle?.stage_states
      || strategyDebug?.stage_states
  );
  const setStrategyCheck = (id, value, blockedReason = "") => {
    const element = document.getElementById(id);
    if (!element) return;

    const isCanonical = STRATEGY_STAGE_STATES.has(
      String(value || "").toUpperCase()
    );
    const status = isCanonical
      ? strategyStageDisplay(value, blockedReason)
      : value === true
        ? "PASSED"
        : value === false
          ? "FAILED"
          : String(value || "NOT_EVALUATED").toUpperCase().replace(/_/g, " ");
    const passed = status === "PASSED";
    const failed = status === "FAILED";
    const blocked = status.startsWith("BLOCKED");
    const notEvaluated = status === "NOT EVALUATED" || status === "NOT CALCULATED YET";

    element.textContent = status;
    element.classList.toggle("check-pass", passed);
    element.classList.toggle("check-fail", failed);
    element.classList.toggle("check-blocked", blocked);
    element.classList.toggle("check-waiting", blocked);
    element.classList.toggle("check-not-checked", notEvaluated);
  };

  setStrategyCheck(
    "strategy-debug-smc",
    hasCanonicalStrategyStages
      ? strategyStages.bos
      : Boolean(
        strategyDebug.bos_detected
        || strategyDebug.choch_detected
        || ["BUY", "SELL"].includes(String(strategyDebug.smc_direction || "").toUpperCase())
      ),
    strategyDebug.blocked_reason || data.blocked_reason
  );
  setStrategyCheck(
    "strategy-debug-swing-break",
    hasCanonicalStrategyStages
      ? strategyStages.bos
      : hasConfirmedFifteenMinuteBreak(data, strategyDebug),
    strategyDebug.blocked_reason || data.blocked_reason
  );
  setStrategyCheck(
    "strategy-debug-15m-close",
    hasCanonicalStrategyStages
      ? strategyStages.fifteenClose
      : strategyDebug.fifteen_m_close_confirmed
        ?? strategyDebug.fifteen_m_candle_close_confirmed
  );
  setStrategyCheck(
    "strategy-debug-5m-confirm",
    hasCanonicalStrategyStages
      ? strategyStages.fiveMinute
      : strategyDebug.five_m_confirmation
  );
  setStrategyCheck(
    "strategy-debug-swing-sl",
    getSwingSlCheckStatus(data, strategyDebug)
  );

  const strategyDecision = document.getElementById(
    "strategy-debug-decision"
  );
  if (strategyDecision) {
    const decision = String(
      strategyDebug.final_signal
        || strategyDebug.final_entry_decision
        || "WAIT"
    ).toUpperCase();
    strategyDecision.textContent = decision;
    strategyDecision.classList.remove(
      "decision-buy",
      "decision-sell",
      "decision-wait"
    );
    strategyDecision.classList.add(
      decision === "BUY"
        ? "decision-buy"
        : decision === "SELL"
          ? "decision-sell"
          : "decision-wait"
    );
  }

  const strategyBlockReason = document.getElementById(
    "strategy-debug-block-reason"
  );
  if (strategyBlockReason) {
    const blockReason =
      strategyDebug.blocked_reason
      || strategyDebug.block_reason
      || data.blocked_reason
      || data.block_reason
      || data.plan_reason
      || "--";
    strategyBlockReason.textContent =
      signal === "BUY" || signal === "SELL" ? "--" : blockReason;
    strategyBlockReason.title = strategyBlockReason.textContent;
  }

  const showSignalBlocker =
    signal === "WAIT" &&
    Boolean(data.blocked_reason || data.block_reason);
  const blockedReasonRow = document.getElementById("main-blocked-reason-row");
  const blockedReasonEl = document.getElementById("main-blocked-reason");

  if (blockedReasonRow) {
    blockedReasonRow.classList.toggle("hidden", !showSignalBlocker);
  }

  if (blockedReasonEl) {
    blockedReasonEl.textContent = showSignalBlocker
      ? tMarketText(String(data.blocked_reason || data.block_reason || "--"))
      : "--";
  }

  const structureTrendEl = document.getElementById("structure-trend");
  const structureTypeEl = document.getElementById("structure-type");
  const structureNextEl = document.getElementById("structure-next");
  const structureResistanceEl = document.getElementById("structure-resistance");
  const structureSupportEl = document.getElementById("structure-support");

  if (structureTrendEl) structureTrendEl.textContent = tMarketText(smcData.structure_trend || "--");
  if (structureTypeEl) structureTypeEl.textContent = tMarketText(smcData.structure_type || "--");
  if (structureNextEl) structureNextEl.textContent = tMarketText(smcData.structure_next || "--");
  if (structureResistanceEl) structureResistanceEl.textContent = smcData.structure_resistance || "--";
  if (structureSupportEl) structureSupportEl.textContent = smcData.structure_support || "--";
  const structureTitle = document.querySelector(".structure-title");

  if (structureTitle) {
    const displayName =
      DISPLAY_NAMES[symbol] || symbol;

    structureTitle.textContent =
      `${LANG[currentLang].marketStructure} • ${displayName} • ${currentChartTimeframe}`;
  }
  }

function normalizeSignalAlert(signal, data = {}) {
  const candidates = [
    signal,
    data?.signal,
    data?.final_signal,
    data?.display_signal,
    data?.signal_display_state,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim().toUpperCase();
    if (value.startsWith("EXIT BUY")) return "EXIT BUY";
    if (value.startsWith("EXIT SELL")) return "EXIT SELL";
    if (value === "BUY" || value.startsWith("BUY ")) return "BUY";
    if (value === "SELL" || value.startsWith("SELL ")) return "SELL";
  }
  return "WAIT";
}

function showSignalAlertMessage(symbol, signal) {
  let toast = document.getElementById("signalAlertToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "signalAlertToast";
    toast.className = "signal-alert-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "assertive");
    document.body.appendChild(toast);
  }
  toast.textContent = `FlowSignal Alert · ${symbol} ${signal}`;
  toast.dataset.side = signal.includes("SELL") ? "SELL" : "BUY";
  toast.classList.add("is-visible");
  window.clearTimeout(showSignalAlertMessage.hideTimer);
  showSignalAlertMessage.hideTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 9000);
}

function playAlert(symbol, signal) {
  try {
    if (!signalAlertsEnabled()) {
      return;
    }

    showSignalAlertMessage(symbol, signal);

    const audio = document.getElementById("alertSound");

    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0.9;

      audio.play().catch(() => {});  
    }

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("FlowSignal Alert", {
          body: `${symbol} ${signal} signal detected`
        });
      }
    }

  } catch (err) {
    console.log(err);
  }
}

function updateUTC() {
  if (!utcLabel) return;
  const now = new Date();
  const utc = now.toUTCString().split(" ")[4];
  utcLabel.textContent = `UTC ${utc}`;
}

function getConnectionBadgeLabel(state) {
  const labels = {
    en: {
      loading: "● LIVE loading...",
      live: "● LIVE connected",
      closed: "● Market Closed",
      stale: "● LIVE loading...",
      error: "● Connection issue"
    },
    fr: {
      loading: "● LIVE chargement...",
      live: "● LIVE connecté",
      closed: "● Marché fermé",
      stale: "● LIVE chargement...",
      error: "● Problème de connexion"
    },
    es: {
      loading: "● LIVE cargando...",
      live: "● LIVE conectado",
      closed: "● Mercado cerrado",
      stale: "● LIVE cargando...",
      error: "● Problema de conexión"
    }
  };

  return (labels[currentLang] || labels.en)[state] || labels.en.live;
}

function setConnectionBadge(state = "live", details = "") {
  if (!statusEl) return;

  const normalized = ["loading", "live", "closed", "stale", "error"].includes(state)
    ? state
    : "live";
  const label = getConnectionBadgeLabel(normalized);

  statusEl.textContent = label;
  statusEl.title = details || label;
  statusEl.dataset.fullStatus = details || label;
  statusEl.dataset.mobileLabel = label;
  statusEl.dataset.connectionState = normalized;
  statusEl.className = `status status-${normalized}`;

  if (mobileLiveStatusEl) {
    const mobileLabel = label.replace(/^●\s*/, "");
    mobileLiveStatusEl.textContent = mobileLabel;
    mobileLiveStatusEl.title = details || label;
    mobileLiveStatusEl.dataset.connectionState = normalized;
  }
}

function setStatus(text, mode = "live") {
  const upperText = String(text || "").toUpperCase();

  if (mode === "error" || upperText.includes("ERROR")) {
    setConnectionBadge("error", text);
  } else if (upperText.includes("MARKET CLOSED")) {
    setConnectionBadge("closed", text);
  } else if (upperText.includes("STALE") || upperText.includes("CACHE")) {
    setConnectionBadge("stale", text);
  } else if (upperText.includes("LOADING") || upperText.includes("SENDING")) {
    setConnectionBadge("loading", text);
  } else {
    setConnectionBadge("live", text);
  }
}

function refreshConnectionBadgeFreshness() {
  if (!statusEl || !latestPanelFetchedAt) return;
  if (Date.now() - latestPanelFetchedAt <= 60000) return;

  const state = statusEl.dataset.connectionState;
  if (state === "error" || state === "stale" || state === "closed") return;

  setConnectionBadge(
    "stale",
    `Last updated: ${new Date(latestPanelFetchedAt).toLocaleTimeString()}`
  );
}

function updateTradeButtonsLock() {
  const buttons = document.querySelectorAll(".buy-button, .sell-button");

  buttons.forEach((btn) => {
    btn.disabled = false;
    btn.classList.toggle("trade-locked", !isAdminUnlocked);
  });

  if (adminUnlockBtn) {
    adminUnlockBtn.textContent = isAdminUnlocked ? "Admin On" : "Admin Lock";
    adminUnlockBtn.classList.remove("locked", "unlocked");
    adminUnlockBtn.classList.add(isAdminUnlocked ? "unlocked" : "locked");
  }
}

function showAdminModal() {
  if (adminModal) {
    adminModal.classList.remove("hidden");
  }

  if (adminCodeInput) {
    adminCodeInput.value = "";
    setTimeout(() => adminCodeInput.focus(), 50);
  }
}

function hideAdminModal() {
  if (adminModal) {
    adminModal.classList.add("hidden");
  }
}

function unlockAdminAccess() {
  const entered = adminCodeInput ? adminCodeInput.value.trim() : "";

  if (entered === ADMIN_CODE) {
    isAdminUnlocked = true;
    updateTradeButtonsLock();
    hideAdminModal();
    setStatus("● ADMIN MODE • trading unlocked", "live");
    return;
  }

  setStatus("● ADMIN LOCK • wrong code", "error");
  if (adminCodeInput) {
    adminCodeInput.value = "";
    adminCodeInput.focus();
  }
}

// ==============================
// TRADE MODAL
// ==============================

function showTradeModal(symbol, action) {
  if (tradeConfirmBtn) {
    tradeConfirmBtn.style.display = "inline-flex";
}

if (tradeCancelBtn) {
    tradeCancelBtn.textContent = "Cancel";
}
  pendingTrade = { symbol, action };

  if (tradeModalTitle) tradeModalTitle.textContent = `${action} Confirmation`;
  if (tradeModalText) tradeModalText.textContent = `Confirm ${action} on ${symbol}?`;

  if (tradeConfirmBtn) {
    tradeConfirmBtn.classList.remove("sell-mode");
    if (action === "SELL") {
      tradeConfirmBtn.classList.add("sell-mode");
    }
  }

  if (tradeModal) {
    tradeModal.classList.remove("hidden");
  }
}

function hideTradeModal() {
  if (tradeModal) {
    tradeModal.classList.add("hidden");
  }
  pendingTrade = null;
}

async function maybeExecuteLiveOrder(symbol, data) {

  const signal =
    String(data?.signal || "WAIT").toUpperCase();

  if (signal !== "BUY" && signal !== "SELL") return;
  if (activeLiveOrders[symbol]) return;

  if (!liveAutoEnabled) return;

  if (!liveConnectionState.connected) return;

  const orderKey =
    `${symbol}_${signal}_${data?.entry_price || ""}`;

  if (lastLiveOrderKey === orderKey) return;

  lastLiveOrderKey = orderKey;

  try {

    const res = await fetch(
      `${BASE_URL}/execute-live-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          symbol,
          side: signal
        })
      }
    );

    const result = await res.json();

    console.log(
      "LIVE ORDER RESULT:",
      result
    );

    if (!result.ok) {
      lastLiveOrderKey = null;
      const blockReason =
        result?.reason ||
        result?.message ||
        result?.result?.reason ||
        result?.result?.message ||
        "live order safety check failed";
      speakVoiceEvent({
        symbol,
        state: "BLOCKED",
        priority: VOICE_EVENT_PRIORITY.BLOCKED,
        fingerprint: createVoiceFingerprint(`${symbol}:live-blocked:${blockReason}`),
        message: `Live ${signal} blocked on ${symbol}. ${blockReason}.`
      });
      return;
    }

    if (result.active_order) {
      activeLiveOrders[symbol] = result.active_order;
      renderLiveActiveOrders();
    }

  } catch (err) {

    lastLiveOrderKey = null;

    console.error(
      "LIVE ORDER ERROR:",
      err
    );

  }
}

async function executeTrade(symbol, action) {
  setStatus(`● SENDING • ${symbol} ${action}`, action === "BUY" ? "live" : "sell");

  try {
    const res = await fetch(TRADE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ symbol, action, token: ADMIN_CODE })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const result = await res.json();
    console.log("Trade result:", result);

    setStatus(`● TRADE SENT • ${symbol} ${action}`, action === "BUY" ? "live" : "sell");

    setTimeout(() => {
      const local = new Date().toLocaleTimeString();
      setStatus(`● LIVE • updated (${local})`, "live");
    }, 2500);
  } catch (err) {
    console.error("Trade error:", err);
    setStatus(`● TRADE ERROR • ${err.message}`, "error");
  }
}

function confirmTrade(symbol, action) {
  const internalSignal = String(
    latestPanelData?.[symbol]?.signal || "WAIT"
  ).toUpperCase();

  if (internalSignal === "HOLD BUY" || internalSignal === "HOLD SELL") {
    showAssistantMessage(
      internalSignal === "HOLD BUY"
        ? assistantCopy("holdBuy")
        : assistantCopy("holdSell"),
      "HOLD",
      { symbol, interaction: true }
    );
    setStatus(`● HOLD • ${symbol} has no fresh entry`, "error");
    return;
  }

  showAssistantMessage(
    assistantEventMessage(action === "BUY" ? "manualBuy" : "manualSell"),
    action,
    { symbol, interaction: true }
  );

  const role = localStorage.getItem("flowsignal_role");

  // PUBLIC USERS → blocked
  if (role !== "admin") {
    if (tradeModalTitle) {
        tradeModalTitle.textContent = LANG[currentLang].accessRestricted;
    }

    if (tradeModalText) {
        tradeModalText.textContent = LANG[currentLang].tradeAdminOnly;
    }

    if (tradeConfirmBtn) {
        tradeConfirmBtn.style.display = "none";
    }

    if (tradeCancelBtn) {
        tradeCancelBtn.textContent = LANG[currentLang].close;
    }

    if (tradeModal) {
        tradeModal.classList.remove("hidden");
    }

    return;
}

  showTradeModal(symbol, action);
}

window.confirmTrade = confirmTrade;

// ==============================
// DATA NORMALIZATION
// ==============================
function normalizePanelData(data) {
  if (data && (data.EURUSD || data.XAUUSD)) {
    return {
      EURUSD: data.EURUSD || {},
      XAUUSD: data.XAUUSD || {}
    };
  }

  return {
    EURUSD: {},
    XAUUSD: {}
  };
}

function getFinalDisplayScores(data) {
  const signal = getVisibleSignal(data);
  const signalSide = getSignalSide(signal);
  let buy = clampPct(data?.final_buy_pct ?? data?.buy_pct ?? data?.buy_percentage ?? data?.buy_percent ?? 0);
  let sell = clampPct(data?.final_sell_pct ?? data?.sell_pct ?? data?.sell_percentage ?? data?.sell_percent ?? 0);
  let confidence = clampPct(data?.final_confidence ?? data?.confidence ?? 0);

  if (signalSide === "BUY" && buy <= sell) {
    const stronger = Math.max(buy, sell, confidence, 60);
    const weaker = Math.min(buy, sell, 100 - stronger);
    buy = clampPct(stronger);
    sell = clampPct(Math.min(weaker, buy - 1));
  } else if (signalSide === "SELL" && sell <= buy) {
    const stronger = Math.max(buy, sell, confidence, 60);
    const weaker = Math.min(buy, sell, 100 - stronger);
    sell = clampPct(stronger);
    buy = clampPct(Math.min(weaker, sell - 1));
  }

  if ((signalSide === "BUY" || signalSide === "SELL") && confidence <= 0) {
    confidence = signalSide === "BUY" ? buy : sell;
  }

  return { buy, sell, confidence };
}

function renderHistory(history) {
  const body = document.getElementById("historyBody");
  if (!body) return;

  if (!history || !history.length) {
    body.innerHTML = `
      <tr class="history-empty-row">
        <td colspan="6">No history yet</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = history
  .slice()
  .reverse()

    .map((item) => {
      const signal = String(item.signal || "WAIT").toUpperCase();
      const result = String(item.result || "RUNNING").toUpperCase();
      const confidence = item.confidence ?? "--";
      const pips = item.pips ?? "0";

      let signalClass = "history-signal-wait";
      if (signal === "BUY") signalClass = "history-signal-buy";
      if (signal === "SELL") signalClass = "history-signal-sell";

      let resultClass = "history-result-running";
      if (result === "WIN") resultClass = "history-result-win";
      if (result === "LOSS") resultClass = "history-result-loss";
      if (["BROKER_CLOSED", "CLOSED", "STALE_CLOSED"].includes(result)) {
        resultClass = "history-result-closed";
      }

      let rowClass = "history-row-neutral";
      if (signal === "BUY") rowClass = "history-row-buy";
      if (signal === "SELL") rowClass = "history-row-sell";

      let pipsClass = "history-pips-flat";
      const pipsText = String(pips).trim();
      if (pipsText.startsWith("+")) pipsClass = "history-pips-plus";
      if (pipsText.startsWith("-")) pipsClass = "history-pips-minus";
      const rawTime = String(item.time || "--");
      const compactTime = formatHistoryTime(rawTime);

      return `
        <tr class="history-row ${rowClass}">
          <td class="history-time" title="${escapeHtml(rawTime)}">${compactTime}</td>
          <td class="history-symbol">${DISPLAY_NAMES[item.symbol] || item.symbol || "--"}</td>
          <td>
            <span class="history-pill ${signalClass}">${signal}</span>
          </td>
          <td class="history-confidence">${confidence}</td>
          <td>
            <span class="history-pill ${resultClass}">${result}</span>
          </td>
          <td class="${pipsClass}">${pipsText}</td>
        </tr>
      `;
    })
    .join("");
}

function formatHistoryTime(rawTime) {
  if (!rawTime || rawTime === "--") return "--";
  const text = String(rawTime).trim();
  const timeMatch = text.match(/\b(\d{2}):(\d{2})(?::\d{2})?\b/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
  const dateMatch = text.match(/\b\d{4}-(\d{2})-(\d{2})\b/);
  if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]}`;
  return text.length > 5 ? text.slice(0, 5) : text;
}

// ==============================
// PANEL REFRESH
// ==============================
function setAutoTradeFilter(filter) {
  autoTradeFilter = filter;

  document.querySelectorAll(".paper-filter-btn").forEach((btn) => {
    btn.classList.remove("active");

    if (btn.dataset.filter === filter) {
      btn.classList.add("active");
    }
  });

  if (latestRawPanelData) {
    updatePaperPanel(
      latestRawPanelData?.paper_trades || {},
      latestRawPanelData?.paper_trade_history || [],
      latestRawPanelData?.paper_trade_stats || {}
    );
  }
}

function isLiveBrokerTrade(trade) {
  const source = String(trade?.source || "").toLowerCase();

  return source === "broker"
    || !!trade?.broker_position_id
    || !!trade?.broker_order_id
    || !!trade?.broker_result;
}

function hasConfirmedProfitProtection(trade) {
  if (!trade?.profit_protected || trade?.protection_confirmed === false) return false;

  if (!isLiveBrokerTrade(trade)) return true;

  return trade?.sl_protection_broker_result?.ok === true;
}

function getProfitProtectionLabel(trade) {
  return hasConfirmedProfitProtection(trade)
    ? "Profit Protected (+40% toward TP2 locked)"
    : "";
}

function getSlProtectionWarning(trade) {
  if (
    trade?.broker_stop_loss_missing ||
    (isLiveBrokerTrade(trade) && !trade?.broker_stop_loss_confirmed)
  ) {
    return "No broker stop loss attached";
  }

  return trade?.sl_protection_failed || trade?.sl_protection_warning
    ? "BROKER SL PROTECTION FAILED"
    : "";
}

function getBrokerTargetWarning(trade) {
  if (
    trade?.broker_take_profit_missing ||
    (isLiveBrokerTrade(trade) && !trade?.broker_take_profit_confirmed)
  ) {
    return "No broker take profit attached";
  }

  return "";
}

function getLiveRiskError(trade) {
  const missingSl =
    trade?.broker_stop_loss_missing ||
    (isLiveBrokerTrade(trade) && !trade?.broker_stop_loss_confirmed);
  const missingTp =
    trade?.broker_take_profit_missing ||
    (isLiveBrokerTrade(trade) && !trade?.broker_take_profit_confirmed);

  return missingSl || missingTp
    ? "LIVE RISK ERROR: trade has no broker SL/TP"
    : "";
}

function getBrokerStopLossDisplay(trade) {
  if (
    trade?.broker_stop_loss_missing ||
    (isLiveBrokerTrade(trade) && !trade?.broker_stop_loss_confirmed)
  ) {
    return "No broker SL";
  }

  return trade?.sl ?? trade?.current_sl ?? trade?.stop_loss ?? "--";
}

function getBrokerTakeProfitDisplay(trade) {
  if (
    trade?.broker_take_profit_missing ||
    (isLiveBrokerTrade(trade) && !trade?.broker_take_profit_confirmed)
  ) {
    return "No broker TP";
  }

  return trade?.tp2 ?? trade?.take_profit_2 ?? trade?.take_profit ?? trade?.takeProfit ?? "--";
}

function getTp1Display(trade) {
  if (
    trade?.broker_take_profit_missing ||
    (isLiveBrokerTrade(trade) && !trade?.broker_take_profit_confirmed)
  ) {
    return trade?.planned_tp1 ? `${trade.planned_tp1} planned` : "Planned only";
  }

  return trade?.tp1 ?? trade?.take_profit_1 ?? "--";
}

function getTradeDisplayResult(trade) {
  if (!trade) return "--";
  if (hasConfirmedProfitProtection(trade)) return "TP1 HIT";
  if (trade?.hit_tp1) return "TP1 HIT";

  return trade.result || trade.status || "RUNNING";
}

function getTradeProtectedText(trade) {
  return hasConfirmedProfitProtection(trade) ? "YES" : "NO";
}

function updatePaperPanel(paperTrades, paperHistory = [], backendStats = {}) {
  if (executionPage === "live") {
    if (paperHistoryList) {
      paperHistoryList.classList.add("hidden");
      paperHistoryList.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    return;
  }

  if (!paperTrades) paperTrades = {};

  if (paperHistoryList) {
    paperHistoryList.classList.remove("hidden");
    paperHistoryList.style.setProperty(
      "display",
      "flex",
      "important"
    );
  }

  if (liveHistoryList) {
    liveHistoryList.classList.add("hidden");
    liveHistoryList.style.setProperty(
      "display",
      "none",
      "important"
    );
  }

  const eurusd = paperTrades.EURUSD;
  const gold = paperTrades.XAUUSD;

  if (paperEurusdStatus) {
    paperEurusdStatus.textContent = eurusd
      ? `${eurusd.side} • ${getTradeDisplayResult(eurusd)} • Entry ${eurusd.entry} • SL ${eurusd.sl} • TP1 ${eurusd.tp1} • TP2 ${eurusd.tp2}`
      : "No paper trade";
  }

  if (paperGoldStatus) {
    paperGoldStatus.textContent = gold
      ? `${gold.side} • ${getTradeDisplayResult(gold)} • Entry ${gold.entry} • SL ${gold.sl} • TP1 ${gold.tp1} • TP2 ${gold.tp2}`
      : "No paper trade";
  }

  if (paperHistoryList) {
    paperHistory = Array.isArray(paperHistory) ? paperHistory : [];

const activeTrades = Object.values(paperTrades || {})
  .filter(Boolean)
  .map((t) => ({
    ...t,
    status: "OPEN",
    result: t.result || "RUNNING"
  }));

const closedHistory = paperHistory.filter((t) => {
  const r = String(t?.result || t?.status || "").toUpperCase();
  const s = String(t?.status || "").toUpperCase();
  return r === "WIN" || r === "LOSS" || s === "CLOSED";
});

const allPaperTrades = [
  ...activeTrades,
  ...closedHistory
];

function getPaperResult(t) {
  const r = String(t?.result || t?.status || "RUNNING").toUpperCase();
  const s = String(t?.status || "").toUpperCase();

  if (t?.profit_protected && s === "CLOSED") return "WIN";
  if (r.includes("STALE") || r.includes("RESET") || r.includes("CLOSED")) return "CLOSED";
  if (s === "CLOSED" && (r.includes("WIN") || r.includes("TP") || r.includes("PROFIT"))) return "WIN";
  if (s === "CLOSED" && (r.includes("LOSS") || r.includes("SL") || r.includes("STOP"))) return "LOSS";
  if (r === "WIN") return "WIN";
  if (r === "LOSS") return "LOSS";

  return "RUNNING";
}

const wins = backendStats.wins ?? allPaperTrades.filter(t => getPaperResult(t) === "WIN").length;
const losses = backendStats.losses ?? allPaperTrades.filter(t => getPaperResult(t) === "LOSS").length;
const running = backendStats.running ?? allPaperTrades.filter(t => getPaperResult(t) === "RUNNING").length;
const total = backendStats.total ?? (wins + losses + running);

const filteredHistory =
  autoTradeFilter === "ALL"
    ? allPaperTrades
    : allPaperTrades.filter((t) => {
        const r = getPaperResult(t);

        if (autoTradeFilter === "WIN") return r === "WIN";
        if (autoTradeFilter === "LOSS") return r === "LOSS";
        if (autoTradeFilter === "RUNNING") return r === "RUNNING";

        return true;
      });
paperHistoryList.innerHTML = `
  <div style="display:grid;gap:8px;">

    <div style="padding:8px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.14);">
      <div style="font-size:11px;font-weight:900;color:#cbd5e1;margin-bottom:6px;">✦ ACTIVE STRATEGIES</div>

      ${activeTrades.length === 0 ? `
        <div class="live-empty">
          <div class="live-empty-title">No active paper trades</div>
          <div class="live-empty-subtitle">
            Paper auto will track one setup per symbol when conditions align.
          </div>
        </div>
      ` : ["EURUSD", "XAUUSD"].map((sym) => {
        const t = paperTrades?.[sym];
        if (!t) return "";

        const side = t.side || "--";
        const result = t.result || "RUNNING";
        const source = (t.source || "paper").toUpperCase();
        const display = DISPLAY_NAMES[sym] || sym;
        const sideColor = side === "SELL" ? "#ef4444" : "#22c55e";
        const protectionLabel = getProfitProtectionLabel(t);
        const originalSl = t.original_sl ?? t.initial_sl ?? t.sl ?? "--";
        const currentSl = t.sl ?? "--";
        const tp1 = t.tp1 ?? "--";
        const tp2 = t.tp2 ?? t.tp ?? "--";
        const displayResult = getTradeDisplayResult(t);
        const protectedText = getTradeProtectedText(t);

        return `
          <div style="margin-bottom:5px;padding:7px 9px;border-radius:12px;background:rgba(30,41,59,.70);border:1px solid rgba(148,163,184,.16);">
            <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;">
              <strong style="font-size:12px;color:#f8fafc;">${display}</strong>
              <span style="
                font-size:9px;
                font-weight:900;
                color:#38bdf8;
                background:rgba(56,189,248,.12);
                border:1px solid rgba(56,189,248,.25);
                padding:2px 6px;
                border-radius:7px;
              ">
                ${source}
              </span>
              <span style="color:${sideColor};background:${sideColor}22;padding:2px 6px;border-radius:7px;font-size:9px;font-weight:900;">${side}</span>
              <span style="color:#60a5fa;background:#60a5fa22;padding:2px 6px;border-radius:7px;font-size:9px;font-weight:900;">${displayResult}</span>
            </div>
            <div style="margin-top:4px;font-size:10px;color:#cbd5e1;font-weight:700;line-height:1.25;">
              Entry ${t.entry ?? "--"} • Original SL ${originalSl} • Current SL ${currentSl}<br>
              TP1 ${tp1} • TP2 ${tp2} • Protected ${protectedText} • Result ${displayResult}
              ${protectionLabel ? `<br><span style="color:#86efac;">${protectionLabel}</span>` : ""}
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
      <div onclick="setAutoTradeFilter('WIN')" style="background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.35);border-radius:12px;padding:7px;cursor:pointer;text-align:center;">
        <div style="font-size:16px;font-weight:900;color:#22c55e;">${wins}</div>
        <div style="font-size:9px;color:#86efac;font-weight:800;">Wins</div>
      </div>
      <div onclick="setAutoTradeFilter('LOSS')" style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);border-radius:12px;padding:7px;cursor:pointer;text-align:center;">
        <div style="font-size:16px;font-weight:900;color:#ef4444;">${losses}</div>
        <div style="font-size:9px;color:#fca5a5;font-weight:800;">Losses</div>
      </div>
      <div onclick="setAutoTradeFilter('RUNNING')" style="background:rgba(250,204,21,.12);border:1px solid rgba(250,204,21,.35);border-radius:12px;padding:7px;cursor:pointer;text-align:center;">
        <div style="font-size:16px;font-weight:900;color:#facc15;">${running}</div>
        <div style="font-size:9px;color:#fde68a;font-weight:800;">Running</div>
      </div>
      <div onclick="setAutoTradeFilter('ALL')" style="background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.35);border-radius:12px;padding:7px;cursor:pointer;text-align:center;">
        <div style="font-size:16px;font-weight:900;color:#60a5fa;">${total}</div>
        <div style="font-size:9px;color:#bfdbfe;font-weight:800;">Total</div>
      </div>
    </div>

    <div style="padding:8px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.14);">
      <div style="font-size:11px;font-weight:900;color:#cbd5e1;margin-bottom:6px;">RECENT TRADES</div>

      <div style="max-height:175px;overflow-y:auto;padding-right:3px;">
        ${filteredHistory.length === 0 ? `
          <div class="live-empty">
            <div class="live-empty-title">No paper trades yet</div>
            <div class="live-empty-subtitle">
              New paper trades will appear here after the next valid setup.
            </div>
          </div>
        ` : filteredHistory.slice().reverse().map((t) => {
          const result = t.result || "RUNNING";
          const side = t.side || "--";
          const symbol = DISPLAY_NAMES[t.symbol] || t.symbol || "--";
          const sideColor = side === "SELL" ? "#ef4444" : "#22c55e";
          const normalizedResult = getPaperResult(t);
          const badgeColor = normalizedResult === "WIN" ? "#22c55e" : normalizedResult === "LOSS" ? "#ef4444" : normalizedResult === "CLOSED" ? "#94a3b8" : "#60a5fa";
          const protectionLabel = getProfitProtectionLabel(t);
          const originalSl = t.original_sl ?? t.initial_sl ?? t.sl ?? "--";
          const currentSl = t.sl ?? "--";
          const tp1 = t.tp1 ?? "--";
          const tp2 = t.tp2 ?? t.tp ?? "--";
          const protectedText = getTradeProtectedText(t);

          return `
            <details style="margin-bottom:4px;border-radius:11px;background:rgba(30,41,59,.70);border:1px solid rgba(148,163,184,.16);overflow:hidden;">
              <summary style="list-style:none;cursor:pointer;padding:5px 8px;display:grid;grid-template-columns:1fr auto auto;gap:5px;align-items:center;font-weight:900;color:#f8fafc;">
                <span style="font-size:12px;">${symbol}</span>
                <span style="color:${sideColor};background:${sideColor}22;padding:2px 6px;border-radius:7px;font-size:9px;">${side}</span>
                <span style="color:${badgeColor};background:${badgeColor}22;padding:2px 6px;border-radius:7px;font-size:9px;">${result}</span>
              </summary>
              <div style="padding:0 8px 7px;color:#cbd5e1;font-size:10px;line-height:1.35;">
                Entry: <b>${t.entry ?? "--"}</b><br>
                Original SL: <b>${originalSl}</b> • Current SL: <b>${currentSl}</b><br>
                TP1: <b>${tp1}</b> • TP2: <b>${tp2}</b> • Protected: <b>${protectedText}</b><br>
                ${protectionLabel ? `<span style="color:#86efac;font-weight:900;">${protectionLabel}</span><br>` : ""}
                Pips: <b>${t.pips ?? 0}</b>
              </div>
            </details>
          `;
        }).join("")}
      </div>
    </div>

  </div>
`;
  }

  }

function updateLivePanel(liveTrades, liveHistory = [], stats = null) {
  activeLiveOrders =
    liveConnectionState.connected
      ? mergeRefreshedLiveOrders(liveTrades)
      : {
          EURUSD: null,
          XAUUSD: null
        };

  liveTradeHistory =
    Array.isArray(liveHistory)
      ? liveHistory
      : [];

  if (stats && typeof stats === "object") {
    liveTradeStats = {
      ...liveTradeStats,
      ...stats
    };
  }

  clearTradeLines(currentChartSymbol);
  clearInactiveTradeVisualLines();

  renderLiveTotalTradesCard();
  renderLiveActiveOrders();
  renderLiveHistory();
  drawTradeVisualLevels();
  renderUserLiveAutoStatus();

}

function formatMarketSource(value) {
  const text = String(value || "--").toLowerCase();

  if (text === "ctrader") return "cTrader";
  if (text === "twelvedata") return "Twelve Data";
  if (text === "hybrid") return "hybrid";

  return value || "--";
}

function ensureMarketDataStatusEl() {
  if (!paperModal) return null;

  let el = document.getElementById("marketDataSourceStatus");

  if (el) return el;

  const anchor = document.querySelector(".execution-page-tabs");
  const box = paperModal.querySelector(".trade-modal-box");

  if (!box) return null;

  el = document.createElement("div");
  el.id = "marketDataSourceStatus";
  el.className = "market-data-source-status";
  el.textContent = "Data Health: --";

  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(el, anchor);
  } else {
    box.appendChild(el);
  }

  return el;
}

function renderMarketDataSourceStatus() {
  const el = ensureMarketDataStatusEl();

  if (!el) return;

  if (executionPage !== "live") {
    el.classList.add("hidden");
    el.style.setProperty("display", "none", "important");
    return;
  }

  el.classList.remove("hidden");
  el.style.removeProperty("display");

  const status = marketDataSourceStatus || {};
  const staleKeys = Array.isArray(status.stale_keys)
    ? status.stale_keys
    : [];
  const rawHealth = String(status.data_health || "").toUpperCase();
  const dataHealth =
    rawHealth === "OK" && staleKeys.length === 0
      ? "OK"
      : (rawHealth || staleKeys.length)
        ? "STALE"
        : "--";

  el.replaceChildren();

  [
    `Data Health: ${dataHealth}`,
    `Live Price: ${String(status.live_price_health || "--").toUpperCase()}`,
    staleKeys.length ? `Stale: ${staleKeys.join(", ")}` : null
  ]
    .filter(Boolean)
    .forEach((text) => {
      const item = document.createElement("span");
      item.textContent = text;

      if (
        text.includes("Data Health: STALE") ||
        text.includes("Live Price: STALE") ||
        text.startsWith("Stale:")
      ) {
        item.classList.add("warning");
      }

      el.appendChild(item);
    });
}

function ensureAutoTradeStatusEl() {
  if (!paperModal) return null;

  let el = document.getElementById("autoTradeStatus");

  if (el) return el;

  const anchor = document.querySelector(".execution-page-tabs");
  const marketEl = document.getElementById("marketDataSourceStatus");
  const box = paperModal.querySelector(".trade-modal-box");

  if (!box) return null;

  el = document.createElement("div");
  el.id = "autoTradeStatus";
  el.className = "auto-trade-status";
  el.textContent = "Auto Trade: Waiting";

  if (marketEl && marketEl.parentNode) {
    marketEl.parentNode.insertBefore(el, marketEl.nextSibling);
  } else if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(el, anchor);
  } else {
    box.appendChild(el);
  }

  return el;
}

function ensureLiveAutoSymbolStatusEl() {
  if (!paperModal) return null;

  let el = document.getElementById("liveAutoSymbolStatus");

  if (el) return el;

  const anchor = ensureAutoTradeStatusEl();
  const box = paperModal.querySelector(".trade-modal-box");

  if (!box) return null;

  el = document.createElement("div");
  el.id = "liveAutoSymbolStatus";
  el.className = "auto-trade-status live-auto-symbol-status";

  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(el, anchor.nextSibling);
  } else {
    box.appendChild(el);
  }

  return el;
}

function ensureLiveTotalTradesCard() {
  if (!liveAutoSection) return null;

  if (!isAdminAccount()) {
    document.getElementById("livePnlCardRow")?.remove();
    return null;
  }

  const oldTotalCard = document.getElementById("liveTotalTradesCard");
  const existingRow = document.getElementById("livePnlCardRow");

  if (oldTotalCard) {
    oldTotalCard.remove();
  }

  if (existingRow) return existingRow;

  const oldWeeklyCard = document.getElementById("liveWeeklyPnlCard");
  const oldFloatingCard = document.getElementById("liveFloatingPnlCard");

  if (oldWeeklyCard) oldWeeklyCard.remove();
  if (oldFloatingCard) oldFloatingCard.remove();

  let el = document.createElement("div");
  el.id = "livePnlCardRow";
  el.className = "live-pnl-card-row";
  el.innerHTML = `
    <div id="liveWeeklyPnlCard" class="live-pnl-card">
      <small>Weekly P/L</small>
      <strong>$0.00</strong>
    </div>
    <div id="liveFloatingPnlCard" class="live-pnl-card">
      <small>Floating P/L</small>
      <strong>$0.00</strong>
    </div>
  `;
  liveAutoSection.appendChild(el);

  return el;
}

function renderLiveTotalTradesCard() {
  if (!isAdminAccount()) {
    document.getElementById("livePnlCardRow")?.remove();
    return;
  }

  ensureLiveTotalTradesCard();

  const weeklyEl = document.getElementById("liveWeeklyPnlCard");
  const floatingEl = document.getElementById("liveFloatingPnlCard");

  if (!weeklyEl || !floatingEl) return;

  const floatingPnl = Number.isFinite(Number(liveTradeStats.floating_live_pl))
    ? Number(liveTradeStats.floating_live_pl)
    : Object.values(activeLiveOrders || {})
      .filter((trade) => trade && isLiveTradeActiveForDisplay(trade))
      .reduce((sum, trade) => {
        const pnl = getLiveTradePnl(trade);

        return sum + (Number.isFinite(pnl) ? pnl : 0);
      }, 0);
  const realizedPnl = Number.isFinite(Number(liveTradeStats.weekly_realized_pl))
    ? Number(liveTradeStats.weekly_realized_pl)
    : 0;
  const displayStats = calculateLiveDisplayStats();
  const confirmedClosedTrades = Math.max(
    0,
    Number(displayStats.total || 0) - Number(displayStats.running || 0)
  );
  const weeklyPnl = confirmedClosedTrades === 0
    ? floatingPnl
    : Number.isFinite(Number(liveTradeStats.weekly_total_pl))
    ? Number(liveTradeStats.weekly_total_pl)
    : realizedPnl + floatingPnl;

  [
    [weeklyEl, "Weekly P/L", weeklyPnl],
    [floatingEl, "Floating P/L", floatingPnl]
  ].forEach(([card, label, value]) => {
    const pnlClass = value > 0 ? "positive" : value < 0 ? "negative" : "";

    card.classList.toggle("positive", value > 0);
    card.classList.toggle("negative", value < 0);
    card.innerHTML = `<small>${label}</small><strong class="${pnlClass}">${formatLiveMoney(value)}</strong>`;
  });
}

function sanitizeActiveLiveOrders(liveTrades = {}) {
  const cleaned = {
    EURUSD: null,
    XAUUSD: null
  };

  ["EURUSD", "XAUUSD"].forEach((symbol) => {
    const trade = liveTrades?.[symbol] || null;
    cleaned[symbol] = isLiveTradeActiveForDisplay(trade) ? trade : null;
  });

  return cleaned;
}

function mergeRefreshedLiveOrders(liveTrades = {}) {
  const incoming = sanitizeActiveLiveOrders(liveTrades);

  ["EURUSD", "XAUUSD"].forEach((symbol) => {
    const current = activeLiveOrders?.[symbol];
    const refreshed = incoming[symbol];
    if (!current || !refreshed) return;

    const currentId = getTradeChartIdentity(current, symbol);
    const refreshedId = getTradeChartIdentity(refreshed, symbol);
    if (currentId !== refreshedId) return;

    const currentModifiedAt = Number(current.levels_modified_at || 0);
    const refreshedModifiedAt = Number(refreshed.levels_modified_at || 0);
    const incomingIsStale = currentModifiedAt > refreshedModifiedAt;
    const missingEditedLevel = Boolean(
      current.user_modified_levels &&
      (
        refreshed.sl == null ||
        refreshed.tp1 == null ||
        refreshed.tp2 == null
      )
    );
    const overwriteBlocked = incomingIsStale || missingEditedLevel;

    console.log("refreshOverwriteBlocked", overwriteBlocked, {
      symbol,
      tradeId: currentId,
      currentModifiedAt,
      refreshedModifiedAt,
    });

    if (overwriteBlocked) {
      incoming[symbol] = {
        ...refreshed,
        sl: current.sl,
        current_sl: current.current_sl ?? current.sl,
        tp1: current.tp1,
        take_profit_1: current.take_profit_1 ?? current.tp1,
        tp2: current.tp2,
        take_profit_2: current.take_profit_2 ?? current.tp2,
        take_profit: current.take_profit ?? current.tp2,
        levels_modified_at: current.levels_modified_at,
        user_modified_levels: current.user_modified_levels,
      };
    }
  });

  return incoming;
}

function formatDashboardMoney(value) {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (safeAmount === 0) return "$0.00";

  const sign = safeAmount > 0 ? "+" : "-";

  return `${sign}$${Math.abs(safeAmount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function getNewYorkTradingWeekStartTs(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const weekdayIndex = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  }[parts.weekday] ?? 0;
  const wallDate = new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) - weekdayIndex,
    17
  ));

  if (
    weekdayIndex === 0 &&
    ((Number(parts.hour) * 60) + Number(parts.minute)) < (17 * 60)
  ) {
    wallDate.setUTCDate(wallDate.getUTCDate() - 7);
  }

  const wallGuess = wallDate.getTime();
  const guessParts = Object.fromEntries(
    formatter.formatToParts(new Date(wallGuess))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const renderedGuess = Date.UTC(
    Number(guessParts.year),
    Number(guessParts.month) - 1,
    Number(guessParts.day),
    Number(guessParts.hour),
    Number(guessParts.minute),
    Number(guessParts.second)
  );

  return (wallGuess - (renderedGuess - wallGuess)) / 1000;
}

function getNewYorkTradingDayStartTs(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const beforeReset =
    ((Number(parts.hour) * 60) + Number(parts.minute)) < (17 * 60);
  const wallDate = new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) - (beforeReset ? 1 : 0),
    17
  ));
  const wallGuess = wallDate.getTime();
  const guessParts = Object.fromEntries(
    formatter.formatToParts(new Date(wallGuess))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const renderedGuess = Date.UTC(
    Number(guessParts.year),
    Number(guessParts.month) - 1,
    Number(guessParts.day),
    Number(guessParts.hour),
    Number(guessParts.minute),
    Number(guessParts.second)
  );

  return (wallGuess - (renderedGuess - wallGuess)) / 1000;
}

function getVerifiedClosedLivePnl(history, startTimestamp) {
  if (!Array.isArray(history)) {
    return { count: 0, pnl: 0, losses: 0 };
  }

  const seen = new Set();
  let count = 0;
  let losses = 0;
  let pnl = 0;

  history.forEach((trade) => {
    const status = String(
      trade?.status || trade?.result || ""
    ).toUpperCase();
    const source = String(
      trade?.source || trade?.history_source || ""
    ).toLowerCase();
    const rawTimestamp = Number(trade?.closed_at || 0);
    const timestamp = rawTimestamp > 10000000000
      ? rawTimestamp / 1000
      : rawTimestamp;
    const identity = String(
      trade?.deal_id ||
      trade?.trade_id ||
      trade?.position_id ||
      trade?.broker_position_id ||
      trade?.order_id ||
      ""
    );
    const value = Number(
      trade?.broker_realized_profit ??
      trade?.realized_profit ??
      trade?.closed_profit
    );

    if (
      !["WIN", "LOSS", "PROTECTED_WIN", "BROKER_CLOSED", "DISCONNECTED", "CLOSED"].includes(status) ||
      !(source.includes("broker") || source.includes("ctrader")) ||
      !Number.isFinite(timestamp) ||
      timestamp < startTimestamp ||
      !Number.isFinite(value) ||
      !identity ||
      seen.has(identity)
    ) {
      return;
    }

    seen.add(identity);
    count += 1;
    pnl += value;
    if (value < 0) losses += 1;
  });

  return { count, losses, pnl: Math.round(pnl * 100) / 100 };
}

function renderDashboardPerformance(meta = {}) {
  updatePnlVisibility();

  const floating = Number(
    meta.floating_live_pl ??
    liveTradeStats.floating_live_pl ??
    0
  );
  let weeklyPnl = Number(
    meta.weekly_total_pl ??
    liveTradeStats.weekly_total_pl ??
    (
      Number(meta.weekly_realized_pl ?? liveTradeStats.weekly_realized_pl ?? 0) +
      floating
    )
  );
  let dailyPnl = Number(
    meta.daily_total_pl ??
    liveTradeStats.daily_total_pl ??
    (
      Number(meta.daily_realized_pl ?? liveTradeStats.daily_realized_pl ?? 0) +
      floating
    )
  );
  const monthlyPnl = Number(
    meta.monthly_realized_pl ??
    liveTradeStats.monthly_realized_pl ??
    0
  );
  const calculationVersion =
    meta.pl_calculation_version ||
    meta.live_trade_stats?.pl_calculation_version;
  const displayStats = calculateLiveDisplayStats();
  const confirmedClosedTrades = Math.max(
    0,
    Number(displayStats.total || 0) - Number(displayStats.running || 0)
  );
  const verifiedWeek = getVerifiedClosedLivePnl(
    meta.live_trade_history,
    getNewYorkTradingWeekStartTs()
  );
  const verifiedDay = getVerifiedClosedLivePnl(
    meta.live_trade_history,
    getNewYorkTradingDayStartTs()
  );

  if (calculationVersion !== "closed-windows-v2") {
    weeklyPnl = verifiedWeek.pnl + floating;
    dailyPnl = verifiedDay.pnl + floating;
    console.warn("Legacy P/L payload ignored; rebuilt from verified closed live trades.");
  } else {
    const weeklyRealized = weeklyPnl - floating;
    const dailyRealized = dailyPnl - floating;

    if (verifiedWeek.count === 0 && Math.abs(weeklyRealized) > 0.005) {
      console.warn("stale weekly P/L cache ignored");
      weeklyPnl = floating;
    }
    if (verifiedDay.count === 0 && Math.abs(dailyRealized) > 0.005) {
      console.warn("stale daily P/L cache ignored");
      dailyPnl = floating;
    }
    if (weeklyRealized < 0 && verifiedWeek.losses === 0) {
      console.warn("stale weekly P/L cache ignored");
      weeklyPnl = floating;
    }
    if (dailyRealized < 0 && verifiedDay.losses === 0) {
      console.warn("stale daily P/L cache ignored");
      dailyPnl = floating;
    }
  }

  const activeTrades = Object.values(
    sanitizeActiveLiveOrders(meta.live_active_orders || activeLiveOrders || {})
  ).filter(Boolean);
  const brokerOpenCount = Number(meta.broker_open_positions_count);

  [
    [dashboardDailyPnl, dailyPnl],
    [dashboardWeeklyPnl, weeklyPnl],
    [dashboardMonthlyPnl, monthlyPnl],
    [dashboardFloatingPnl, floating]
  ].forEach(([element, value]) => {
    if (!element) return;

    const safeValue = Number.isFinite(value) ? value : 0;
    element.textContent = formatDashboardMoney(safeValue);
    element.classList.toggle("negative", safeValue < 0);
    element.classList.toggle("neutral", safeValue === 0);
  });
  forcePhonePerformanceRow();

  if (dashboardOpenTrades) {
    const openTradeCount = Number.isFinite(brokerOpenCount)
      ? Math.max(brokerOpenCount, activeTrades.length)
      : activeTrades.length;

    dashboardOpenTrades.textContent = String(
      openTradeCount
    );
  }

  if (!activeTrades.length) {
    clearTradeLines("EURUSD");
    clearTradeLines("XAUUSD");
  }
}

function formatPerformanceMoney(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? formatDashboardMoney(numeric)
    : "--";
}

function formatPerformanceNumber(value, suffix = "") {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString("en-US", {
        maximumFractionDigits: 2
      })}${suffix}`
    : "--";
}

function setPerformanceText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderPerformanceEquityCurve(points = []) {
  const line = document.querySelector(".performance-equity-chart .equity-line");
  const area = document.querySelector(".performance-equity-chart .equity-area");
  const marker = document.querySelector(".performance-equity-chart circle");
  const values = (points || [])
    .map((point) => Number(point?.equity))
    .filter(Number.isFinite);

  if (!line || !area || !marker || !values.length) return;

  const chartWidth = 700;
  const top = 20;
  const bottom = 165;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = Math.max(max - min, 1);
  const plotted = values.map((value, index) => {
    const x = values.length === 1
      ? chartWidth
      : index * (chartWidth / (values.length - 1));
    const y = bottom - ((value - min) / range) * (bottom - top);
    return { x: Math.round(x), y: Math.round(y) };
  });
  const linePath = plotted
    .map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`)
    .join(" ");
  const last = plotted[plotted.length - 1];

  line.setAttribute("d", linePath);
  area.setAttribute(
    "d",
    `${linePath} L${last.x} 190 L0 190 Z`
  );
  marker.setAttribute("cx", String(last.x));
  marker.setAttribute("cy", String(last.y));
}

function renderPerformanceSummary(data = {}) {
  const wins = Number(data.wins || 0);
  const losses = Number(data.losses || 0);
  const symbolText = (stats) => {
    const item = stats || {};
    return `${Number(item.trades || 0)} trades • `
      + `${formatPerformanceNumber(item.winRate || 0, "%")} • `
      + `${formatPerformanceMoney(item.pnl || 0)}`;
  };

  setPerformanceText("perfWinRate", formatPerformanceNumber(data.winRate || 0, "%"));
  setPerformanceText("perfTotalTrades", String(Number(data.totalTrades || 0)));
  setPerformanceText("perfWinsLosses", `${wins} / ${losses}`);
  setPerformanceText("perfWeeklyPnl", formatPerformanceMoney(data.weeklyPnl));
  setPerformanceText("perfMonthlyPnl", formatPerformanceMoney(data.monthlyPnl));
  setPerformanceText("perfBestTrade", formatPerformanceMoney(data.bestTrade));
  setPerformanceText("perfWorstTrade", formatPerformanceMoney(data.worstTrade));
  setPerformanceText("perfAverageRr", data.averageRr == null
    ? "--"
    : formatPerformanceNumber(data.averageRr));
  setPerformanceText("perfProfitFactor", data.profitFactor == null
    ? "--"
    : formatPerformanceNumber(data.profitFactor));
  setPerformanceText("perfEurusd", symbolText(data.eurusd));
  setPerformanceText("perfXauusd", symbolText(data.xauusd));

  setPerformanceText("perfTotalTradesSummary", String(Number(data.totalTrades || 0)));
  setPerformanceText("perfWinsLossesSummary", `${wins} / ${losses}`);
  setPerformanceText("perfWeeklyPnlSummary", formatPerformanceMoney(data.weeklyPnl));
  setPerformanceText("perfMonthlyPnlSummary", formatPerformanceMoney(data.monthlyPnl));
  setPerformanceText("perfProfitFactorSummary", data.profitFactor == null
    ? "--"
    : formatPerformanceNumber(data.profitFactor));
  setPerformanceText("perfSummaryTrades", String(Number(data.totalTrades || 0)));
  setPerformanceText("perfSummaryWins", `${wins} / ${losses}`);
  setPerformanceText("perfSummaryWeekly", formatPerformanceMoney(data.weeklyPnl));
  setPerformanceText("perfSummaryMonthly", formatPerformanceMoney(data.monthlyPnl));
  setPerformanceText("perfSummaryFactor", data.profitFactor == null
    ? "--"
    : formatPerformanceNumber(data.profitFactor));
  renderPerformanceEquityCurve(data.equityCurve);

  const updated = document.getElementById("perfLastUpdated");
  if (updated) {
    const timestamp = data.updatedAt ? new Date(data.updatedAt) : new Date();
    updated.textContent = `Last Updated: ${timestamp.toLocaleString()}`;
  }
}

async function loadPerformanceSummary() {
  const response = await fetch(`${BASE_URL}/performance/summary`);
  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(data.reason || "Performance unavailable");
  }

  renderPerformanceSummary(data);
  return data;
}

function formatAutoTradeStatusText(status) {
  const item = status || {};
  const state = String(item.status || "WAITING").toUpperCase();
  const symbol = item.symbol || "";
  const action = item.action || item.signal || "";
  const reason = getShortAutoTradeReason(item);

  if (state === "ORDER_SENT" || state === "EXECUTED") {
    if (reason && reason !== "Order sent") {
      return `Auto Trade: ${reason} - ${symbol} ${action}`.trim();
    }

    return `Auto Trade: Order sent - ${symbol} ${action}`.trim();
  }

  if (state === "ORDER_REJECTED") {
    return `Auto Trade: Rejected - ${reason || "order rejected"}`;
  }

  if (state === "BLOCKED") {
    return `Auto Trade: Blocked - ${reason || "safety check"}`;
  }

  if (state === "WAIT") {
    return `Auto Trade: ${reason || "Waiting"}`;
  }

  return `Auto Trade: ${reason || "Waiting"}`;
}

function stringifyAutoTradeValue(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
}

function formatRiskPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return `${number.toFixed(2)}%`;
}

function getAutoTradeDetails(item) {
  const details = item?.details && typeof item.details === "object"
    ? item.details
    : {};

  return {
    ...details,
    ...(item && typeof item.reason === "object" ? item.reason : {})
  };
}

function getShortAutoTradeReason(item) {
  const reasonText = stringifyAutoTradeValue(item?.reason);
  const details = getAutoTradeDetails(item);
  const finalRisk =
    details.final_risk_percent ??
    details.risk_percent_if_minimum ??
    details.minimum_volume_risk_percent;
  const requiredRisk = details.risk_percent ?? details.required_risk_percent ?? 0.5;
  const allowedRisk =
    details.allowed_risk_percent ??
    details.maximum_allowed_risk_percent ??
    requiredRisk;

  if (reasonText.trim().toUpperCase().startsWith("LIVE BLOCKED:")) {
    return reasonText.trim();
  }

  if (
    reasonText.includes("Calculated risk is not close")
    || reasonText.includes("Calculated volume is below broker minimum")
    || reasonText.includes("minimum broker volume")
    || Number.isFinite(Number(finalRisk))
  ) {
    const finalRiskText = formatRiskPercent(finalRisk);
    const requiredRiskText = formatRiskPercent(requiredRisk) || "0.50%";
    const allowedRiskText = formatRiskPercent(allowedRisk);

    return [
      finalRiskText
        ? `Minimum broker volume would risk ${finalRiskText}.`
        : "Minimum broker volume would exceed the allowed risk.",
      `Required risk: ${requiredRiskText}.`,
      allowedRiskText ? `Allowed risk: ${allowedRiskText}.` : "",
      "Trade not sent."
    ].filter(Boolean).join(" ");
  }

  if (typeof item?.reason === "object" || reasonText.trim().startsWith("{") || reasonText.trim().startsWith("[")) {
    return "Safety check blocked trade. Trade not sent.";
  }

  if (reasonText.length > 140) {
    return `${reasonText.slice(0, 137).trim()}...`;
  }

  return reasonText || "Waiting";
}

function formatAutoTradeDetailsPreview(item) {
  const details = getAutoTradeDetails(item);
  const lines = [];

  if (details.entry_price ?? details.entry) {
    lines.push(`Entry ${details.entry_price ?? details.entry}`);
  }

  if (details.sl_price ?? details.sl) {
    lines.push(`SL ${details.sl_price ?? details.sl}`);
  }

  if (details.tp1 ?? details.tp_price) {
    lines.push(`TP1 ${details.tp1 ?? details.tp_price}`);
  }

  if (details.tp2) {
    lines.push(`TP2 ${details.tp2}`);
  }

  if (details.sl_distance_pips) {
    lines.push(`SL distance ${details.sl_distance_pips} pips`);
  }

  if (details.broker_minimum_distance_pips) {
    lines.push(`Broker min ${details.broker_minimum_distance_pips} pips`);
  }

  if (details.final_risk_percent) {
    lines.push(`Rounded risk ${formatRiskPercent(details.final_risk_percent)}`);
  }

  return lines.slice(0, 6);
}

function formatBrokerMinDistanceDetails(item) {
  const details = getAutoTradeDetails(item);
  const lines = [];
  const minDistance = details.broker_minimum_distance_pips;
  const slDistance = details.sl_distance_pips;
  const tp1Distance = details.tp1_distance_pips ?? details.tp_distance_pips;
  const tp2Distance = details.tp2_distance_pips;
  const failed = Array.isArray(details.failed_distance_fields)
    ? details.failed_distance_fields.filter(Boolean).join(", ")
    : details.failed_distance;

  if (minDistance !== undefined && minDistance !== null) {
    lines.push(`Minimum required: ${minDistance} pips`);
  }

  if (slDistance !== undefined && slDistance !== null) {
    lines.push(`Current SL distance: ${slDistance} pips`);
  }

  if (tp1Distance !== undefined && tp1Distance !== null) {
    lines.push(`Current TP1 distance: ${tp1Distance} pips`);
  }

  if (tp2Distance !== undefined && tp2Distance !== null) {
    lines.push(`Current TP2 distance: ${tp2Distance} pips`);
  }

  if (failed) {
    lines.push(`Failed: ${failed}`);
  }

  return lines.slice(0, 5);
}

function formatVolumeSafetyDetails(item) {
  const details = getAutoTradeDetails(item);
  const lines = [];

  if (details.risk_percent !== undefined && details.risk_percent !== null) {
    lines.push(`Risk: ${details.risk_percent}%`);
  }

  if (details.allowed_risk_percent ?? details.maximum_allowed_risk_percent) {
    lines.push(`Allowed risk: ${details.allowed_risk_percent ?? details.maximum_allowed_risk_percent}%`);
  }

  if (details.final_risk_percent !== undefined && details.final_risk_percent !== null) {
    lines.push(`Final risk: ${details.final_risk_percent}%`);
  }

  if (details.risk_money ?? details.risk_amount) {
    lines.push(`Risk money: ${details.risk_money ?? details.risk_amount}`);
  }

  if (details.pip_value ?? details.pip_value_per_lot) {
    lines.push(`Pip value: ${details.pip_value ?? details.pip_value_per_lot}`);
  }

  if (details.stop_loss_pips ?? details.sl_pips) {
    lines.push(`SL pips: ${details.stop_loss_pips ?? details.sl_pips}`);
  }

  if (details.stop_loss_price_distance !== undefined && details.stop_loss_price_distance !== null) {
    lines.push(`SL price distance: ${details.stop_loss_price_distance}`);
  }

  if (details.lot_size_before_rounding ?? details.calculated_lots ?? details.raw_lots) {
    lines.push(`Lot before rounding: ${details.lot_size_before_rounding ?? details.calculated_lots ?? details.raw_lots}`);
  }

  if (details.lot_size_after_rounding ?? details.lot_size ?? details.rounded_lots) {
    lines.push(`Lot after rounding: ${details.lot_size_after_rounding ?? details.lot_size ?? details.rounded_lots}`);
  }

  if (details.broker_min_lots) {
    lines.push(`Broker min lots: ${details.broker_min_lots}`);
  }

  if (details.broker_min_volume ?? details.min_volume_units ?? details.minVolume) {
    lines.push(`Broker min volume: ${details.broker_min_volume ?? details.min_volume_units ?? details.minVolume}`);
  }

  if (details.broker_max_volume ?? details.max_volume_units ?? details.maxVolume) {
    lines.push(`Broker max volume: ${details.broker_max_volume ?? details.max_volume_units ?? details.maxVolume}`);
  }

  if (details.broker_volume_step ?? details.volume_step_units ?? details.stepVolume) {
    lines.push(`Broker step: ${details.broker_volume_step ?? details.volume_step_units ?? details.stepVolume}`);
  }

  if (details.payload_volume) {
    lines.push(`Payload volume: ${details.payload_volume}`);
  }

  if (details.final_volume ?? details.volume_in_payload ?? details.volume_units) {
    lines.push(`Final volume: ${details.final_volume ?? details.volume_in_payload ?? details.volume_units}`);
  }

  if (details.blocked_reason || details.broker_rejection_reason) {
    lines.push(`Blocked: ${details.blocked_reason || details.broker_rejection_reason}`);
  }

  return lines.slice(0, 14);
}

function escapeLiveAutoStatusText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatLiveAutoSymbolReason(symbol, status) {
  const item = status || {};
  const state = String(item.status || "WAIT").toUpperCase();
  const signal = String(item.signal || item.action || "--").toUpperCase();
  const rawReason = stringifyAutoTradeValue(item.reason);
  const activeSide =
    item.active_trade?.side ||
    item.active_trade?.action ||
    null;

  if (state === "BLOCKED" || state === "ORDER_REJECTED") {
    const lowerReason = rawReason.toLowerCase();
    let blockedLabel = "safety check";

    if (activeSide || lowerReason.includes("already running")) {
      blockedLabel = "trade already running";
    } else if (lowerReason.includes("volume") || lowerReason.includes("risk")) {
      blockedLabel = "volume safety";
    } else if (lowerReason.includes("minimum") || lowerReason.includes("distance")) {
      blockedLabel = "broker min distance";
    } else if (lowerReason.includes("stale") || lowerReason.includes("market data")) {
      blockedLabel = "stale market data";
    } else if (lowerReason.includes("cooldown")) {
      blockedLabel = "cooldown active";
    } else if (lowerReason.includes("broker") || lowerReason.includes("disconnect")) {
      blockedLabel = "broker disconnected";
    }

    return escapeLiveAutoStatusText(
      `${symbol}: NOT EXECUTED • ${blockedLabel}`
    );
  }

  if (state === "WAIT" || state === "WAITING") {
    if (signal === "BUY" || signal === "SELL") {
      const shortWaitReason = rawReason
        ? rawReason.replace(/^Blocked:\s*/i, "").slice(0, 80)
        : "strategy not complete";

      return escapeLiveAutoStatusText(
        `${symbol}: NOT EXECUTED • ${shortWaitReason}`
      );
    }

    return escapeLiveAutoStatusText(
      `${symbol}: WAIT • No valid entry`
    );
  }

  return escapeLiveAutoStatusText(
    `${symbol}: ${state} • ${signal}`
  );
}

function renderLiveAutoSymbolStatus() {
  const el = ensureLiveAutoSymbolStatusEl();

  if (!el) return;

  el.classList.add("hidden");
  el.style.setProperty("display", "none", "important");
  el.innerHTML = "";
}

function renderAutoTradeStatus() {
  const el = ensureAutoTradeStatusEl();

  if (!el) return;

  el.classList.remove("hidden");
  el.classList.add("hidden");
  el.style.setProperty("display", "none", "important");
  el.textContent = "";
  el.classList.remove("blocked", "sent");
  renderLiveAutoSymbolStatus();
}

async function fetchAutoTradeStatus() {
  try {
    const res = await fetch(`${BASE_URL}/auto-trade-status`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const status = await res.json();
    autoTradeStatus = status;
  liveAutoStatusBySymbol =
      status?.live_auto_status_by_symbol || liveAutoStatusBySymbol || {};
    if (typeof status?.auto_trade?.live_enabled === "boolean") {
      liveAutoEnabled = status.auto_trade.live_enabled;
      updateLiveToggleUI();
    }
    renderAutoTradeStatus();
    window.FlowSignalStartup?.record("backend_auto_trade_status_loaded");
  } catch (err) {
    console.warn("AUTO TRADE STATUS ERROR:", err);
    window.FlowSignalStartup?.record("backend_auto_trade_status_failed", { message: err.message });
  }
}

async function fetchMarketDataSourceStatus() {
  try {
    const res = await fetch(`${BASE_URL}/market-data-source`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    marketDataSourceStatus = await res.json();
    renderMarketDataSourceStatus();
    window.FlowSignalStartup?.record("market_data_status_loaded");
  } catch (err) {
    console.warn("MARKET DATA SOURCE STATUS ERROR:", err);
    window.FlowSignalStartup?.record("market_data_status_failed", { message: err.message });
  }
}

function applyCtraderStatus(status) {
  if (!status || typeof status !== "object") return;

  liveConnectionState.connected = Boolean(status.connected);
  liveConnectionState.reason = status.reason || "";
  liveConnectionState.account_id = status.account_id || null;
  liveConnectionState.live_positions_count =
    Number(status.live_positions_count || 0);
  liveConnectionState.last_success = status.last_success || null;
  liveConnectionState.last_error = status.last_error || null;
  liveConnectionState.degraded = Boolean(status.degraded);

  if (runtimeStatusDetail) {
    const connected = Boolean(status.connected);
    const degraded = Boolean(status.degraded);
    runtimeStatusDetail.dataset.state = degraded
      ? "reconnecting"
      : connected ? "connected" : "disconnected";
    runtimeStatusDetail.textContent = degraded
      ? "Broker reconnecting"
      : connected ? "Broker connected" : "Broker disconnected";
    runtimeStatusDetail.title = status.reason || runtimeStatusDetail.textContent;
  }

  if (!liveConnectionState.connected) {
    activeLiveOrders = {
      EURUSD: null,
      XAUUSD: null
    };
    clearTradeLines("EURUSD");
    clearTradeLines("XAUUSD");
  }

  updateLiveToggleUI();
  renderAutoTradeStatus();
}

async function fetchCtraderStatus() {
  try {
    const res = await fetch(`${BASE_URL}/ctrader-status`, {
      method: "GET",
      cache: "no-store",
      timeoutMs: 8000,
      suppressErrorPanel: true
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const status = await res.json();
    applyCtraderStatus(status);
    window.FlowSignalStartup?.record("broker_status_loaded", {
      connected: Boolean(status.connected),
      executionReady: Boolean(status.execution_ready),
    });
    return status;
  } catch (err) {
    console.warn("CTRADER STATUS ERROR:", err);
    liveConnectionState.degraded = true;
    liveConnectionState.reason = "Broker status delayed; keeping last confirmed state";
    if (runtimeStatusDetail) {
      runtimeStatusDetail.dataset.state = "reconnecting";
      runtimeStatusDetail.textContent = "Broker reconnecting";
      runtimeStatusDetail.title = "Status check delayed; last confirmed broker state preserved";
    }
    updateLiveToggleUI();
    window.FlowSignalStartup?.record("broker_status_failed", { message: err.message });
    return null;
  }
}

function formatBrokerMoney(value, currency = "") {
  if (value === null || value === undefined || value === "") return "--";
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "--";

  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}${currency ? ` ${currency}` : ""}`;
}

function getBrokerAccountStatus(account, activeAccountId) {
  if (account.unavailable) return "unavailable";
  if (String(account.account_id) === String(activeAccountId)) return "active";
  return account.status || "available";
}

function getBrokerAccountLabel(account) {
  const displayLogin = account.trader_login || account.traderLogin || account.account_number;

  return [
    account.account_id || "--",
    displayLogin ? `login ${displayLogin}` : "",
    account.broker_name || "cTrader",
    account.mode || "",
    account.status || "",
  ].filter(Boolean).join(" • ");
}

function renderBrokerAccounts(data = {}) {
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const activeAccountId = Object.prototype.hasOwnProperty.call(data, "active_account_id")
    ? (data.active_account_id || "")
    : (liveConnectionState.account_id || "");
  const activeAccount = accounts.find((account) => String(account.account_id) === String(activeAccountId));
  const hasAvailableAccount = accounts.some((account) => !account.unavailable);
  const temporarilyUnavailable = Boolean(
    accounts.length && !hasAvailableAccount && activeAccountId
  );
  const connected = data.ok !== false && !temporarilyUnavailable && (
    liveConnectionState.connected || hasAvailableAccount
  );

  if (data.ok !== false && hasAvailableAccount) {
    lastGoodBrokerAccountsData = JSON.parse(JSON.stringify({
      ...data,
      active_account_id: activeAccountId,
      accounts,
    }));
  }

  if (brokerAccountsStatus) {
    brokerAccountsStatus.innerHTML = temporarilyUnavailable
      ? `Connection Status: <span>temporarily unavailable</span> • Active selection preserved`
      : data.ok === false
      ? `Connection Status: <span>${data.reason || "disconnected"}</span>`
      : `Connection Status: <strong>${connected ? "ready" : "disconnected"}</strong>${activeAccountId ? ` • Active` : ""}`;
  }

  if (brokerConnectedBadge) {
    brokerConnectedBadge.textContent = temporarilyUnavailable
      ? "Reconnecting"
      : connected ? "Connected" : "Disconnected";
    brokerConnectedBadge.classList.toggle("disconnected", !connected);
    brokerConnectedBadge.classList.toggle("reconnecting", temporarilyUnavailable);
  }

  if (brokerAuthorizedText) {
    brokerAuthorizedText.textContent = activeAccountId
      ? `Authorized account: ${activeAccountId}`
      : "Authorized account: none selected";
  }

  if (brokerAccountCount) {
    brokerAccountCount.textContent = `${accounts.length} ${accounts.length === 1 ? "Account" : "Accounts"} Found`;
  }

  if (activeBrokerAccountCard) {
    const activeDisplayLogin = activeAccount
      ? (activeAccount.trader_login || activeAccount.traderLogin || activeAccount.account_number)
      : "";
    activeBrokerAccountCard.innerHTML = activeAccount
      ? `
        <div class="broker-active-title">● Active Account</div>
        <strong>${activeAccount.account_id || "--"}</strong>
        <span>${activeAccount.broker_name || "cTrader"} • ${(activeAccount.mode || "demo").toUpperCase()}${activeDisplayLogin ? ` • login ${activeDisplayLogin}` : ""}</span>
        <button id="setActiveCtraderAccountBtn" class="broker-side-btn">Change Active Account</button>
      `
      : `
        <div class="broker-active-title">● Active Account</div>
        <strong>--</strong>
        <span>No active account selected</span>
        <button id="setActiveCtraderAccountBtn" class="broker-side-btn">Change Active Account</button>
      `;
  }

  if (brokerAccountSelect) {
    brokerAccountSelect.innerHTML = accounts.length
      ? accounts.map((account) => {
          const accountId = account.account_id || "";
          return `<option value="${accountId}" ${String(accountId) === String(activeAccountId) ? "selected" : ""}>${getBrokerAccountLabel(account)}</option>`;
        }).join("")
      : `<option value="">No accounts loaded</option>`;
  }

  if (brokerAccountList) {
    brokerAccountList.innerHTML = accounts.length
      ? accounts.map((account) => {
          const accountId = account.account_id || "";
          const status = getBrokerAccountStatus(account, activeAccountId);
          const isActive = status === "active";
          const currency = account.currency || "";
          const type = String(account.mode || "demo").toUpperCase();
          const displayLogin = account.trader_login || account.traderLogin || account.account_number;
          const dotClass = account.unavailable ? "unavailable" : isActive ? "active" : "available";

          return `
            <tr class="${isActive ? "active" : ""} ${account.unavailable ? "unavailable" : ""}" data-account-id="${accountId}">
              <td>
                <span class="broker-account-dot ${dotClass}"></span>${accountId || "--"}
                ${account.reason ? `<div class="broker-row-reason">${account.reason}</div>` : ""}
              </td>
              <td>${displayLogin || "--"}</td>
              <td>${account.broker_name || "cTrader"}</td>
              <td><span class="broker-type-pill">${type}</span></td>
              <td>${formatBrokerMoney(account.balance)}</td>
              <td>${currency || "--"}</td>
              <td><span class="broker-status-text ${status}">${status}</span></td>
              <td>
                ${isActive
                  ? `<span class="broker-active-pill">ACTIVE</span>`
                  : `<button class="broker-row-action" data-set-active="${accountId}" data-unavailable="${account.unavailable ? "true" : "false"}" ${account.unavailable ? "disabled" : ""}>Set Active</button>`}
              </td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="8" class="broker-account-empty">No accounts loaded. Connect or refresh cTrader.</td></tr>`;
  }

  updateBrokerAccountActionState();
}

function setBrokerStatusMessage(message, isError = false) {
  if (!brokerAccountsStatus) return;

  brokerAccountsStatus.textContent = message;
  brokerAccountsStatus.classList.toggle("error", Boolean(isError));
}

function updateBrokerAccountActionState() {
  const selectedAccountId = getSelectedBrokerAccountId();
  const hasSelection = Boolean(selectedAccountId);
  const hasAccounts = Array.from(brokerAccountSelect?.options || []).some((option) => option.value);

  if (forgetCtraderAccountBtn) {
    forgetCtraderAccountBtn.disabled = brokerAccountActionInProgress || !hasSelection;
  }

  if (setActiveCtraderAccountBtn) {
    setActiveCtraderAccountBtn.disabled = brokerAccountActionInProgress || !hasSelection;
  }

  if (clearAllBrokerAccountsBtn) {
    clearAllBrokerAccountsBtn.disabled = brokerAccountActionInProgress || !hasAccounts;
  }

  brokerAccountList?.querySelectorAll("[data-set-active]").forEach((button) => {
    button.disabled = brokerAccountActionInProgress || button.dataset.unavailable === "true";
  });
}

async function loadBrokerAccounts(refresh = false) {
  setBrokerStatusMessage(refresh ? "Connection Status: refreshing accounts..." : "Connection Status: loading accounts...");

  if (refreshCtraderAccountsBtn) {
    refreshCtraderAccountsBtn.disabled = true;
    refreshCtraderAccountsBtn.textContent = "↻ Loading...";
  }

  try {
    const endpoint = refresh ? "ctrader/accounts/refresh" : "ctrader/accounts";
    const res = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      timeoutMs: 10000,
      suppressErrorPanel: true,
    });
    const data = await res.json();

    if (!res.ok || data.ok === false) {
      setBrokerStatusMessage(`Connection Status: ${data.reason || data.message || "Could not load cTrader accounts"}`, true);
    }

    if (data.ok === false && lastGoodBrokerAccountsData) {
      renderBrokerAccounts(lastGoodBrokerAccountsData);
      setBrokerStatusMessage(
        `Connection Status: keeping last confirmed account • ${data.reason || data.message || "refresh unavailable"}`,
        true
      );
      return data;
    }

    renderBrokerAccounts(data);
    return data;
  } catch (err) {
    if (lastGoodBrokerAccountsData) {
      renderBrokerAccounts(lastGoodBrokerAccountsData);
      setBrokerStatusMessage(
        `Connection Status: keeping last confirmed account • ${err.message}`,
        true
      );
    } else {
      setBrokerStatusMessage(`Connection Status: ${err.message}`, true);
    }
    return null;
  } finally {
    if (refreshCtraderAccountsBtn) {
      refreshCtraderAccountsBtn.disabled = false;
      refreshCtraderAccountsBtn.textContent = "↻ Refresh Accounts";
    }
  }
}

async function postBrokerAccountAction(path, payload = {}) {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || data.ok === false) {
    setBrokerStatusMessage(`Connection Status: ${data.reason || data.message || "Request failed"}`, true);
  }

  return data;
}

function getSelectedBrokerAccountId() {
  return brokerAccountSelect ? brokerAccountSelect.value : "";
}

function selectBrokerAccount(accountId) {
  if (brokerAccountSelect && accountId) {
    brokerAccountSelect.value = accountId;
  }

  updateBrokerAccountActionState();
}

async function setActiveBrokerAccount(accountId) {
  const selectedAccountId = accountId || getSelectedBrokerAccountId();

  if (!selectedAccountId) {
    alert("Select an account first.");
    return;
  }

  if (brokerAccountActionInProgress) return;

  const confirmedActiveId = String(
    lastGoodBrokerAccountsData?.active_account_id || liveConnectionState.account_id || ""
  );
  if (String(selectedAccountId) === confirmedActiveId) {
    setBrokerStatusMessage(`Connection Status: account ${selectedAccountId} is already active`);
    brokerAccountList
      ?.querySelector(`tr[data-account-id="${CSS.escape(String(selectedAccountId))}"]`)
      ?.classList.add("account-click-confirmed");
    window.setTimeout(() => {
      brokerAccountList
        ?.querySelector(`tr[data-account-id="${CSS.escape(String(selectedAccountId))}"]`)
        ?.classList.remove("account-click-confirmed");
    }, 900);
    return;
  }

  brokerAccountActionInProgress = true;
  const actionButton = brokerAccountList?.querySelector(
    `[data-set-active="${CSS.escape(String(selectedAccountId))}"]`
  );
  const previousActionLabel = actionButton?.textContent;
  if (actionButton) actionButton.textContent = "Activating...";
  if (setActiveCtraderAccountBtn) setActiveCtraderAccountBtn.textContent = "Activating...";
  brokerAccountList
    ?.querySelector(`tr[data-account-id="${CSS.escape(String(selectedAccountId))}"]`)
    ?.classList.add("is-activating");
  setBrokerStatusMessage(`Connection Status: activating account ${selectedAccountId}...`);
  updateBrokerAccountActionState();

  try {
    const result = await postBrokerAccountAction("ctrader/accounts/active", {
      accountId: selectedAccountId,
    });

    if (!result.ok) {
      setBrokerStatusMessage(`Connection Status: ${result.reason || "Could not set active account."}`, true);
      return;
    }

    if (lastGoodBrokerAccountsData) {
      lastGoodBrokerAccountsData.active_account_id = String(selectedAccountId);
      renderBrokerAccounts(lastGoodBrokerAccountsData);
    }
    setBrokerStatusMessage(`Connection Status: account ${selectedAccountId} is active`);
    await Promise.allSettled([
      fetchCtraderStatus(),
      loadBrokerAccounts(true),
    ]);
  } catch (err) {
    setBrokerStatusMessage(`Connection Status: ${err.message || "Could not activate account"}`, true);
  } finally {
    brokerAccountActionInProgress = false;
    if (actionButton && actionButton.isConnected) {
      actionButton.textContent = previousActionLabel || "Set Active";
    }
    if (setActiveCtraderAccountBtn?.isConnected) {
      setActiveCtraderAccountBtn.textContent = "Change Active Account";
    }
    brokerAccountList?.querySelectorAll("tr.is-activating").forEach((row) => {
      row.classList.remove("is-activating");
    });
    updateBrokerAccountActionState();
  }
}

function openBrokerAccountsModal() {
  if (!brokerAccountsModal) return;
  brokerAccountsModal.classList.remove("hidden");
  setActiveSettingsPage("broker-accounts");
  setMainMenuOpen(true);
  menuSettingsBtn?.setAttribute("aria-expanded", "true");
  settingsSubmenu?.classList.remove("hidden");
  loadBrokerAccounts(false);
}

function closeBrokerAccountsModal() {
  brokerAccountsModal?.classList.add("hidden");
  setMainMenuOpen(false);
}

function handleCtraderOAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  const shouldOpenBrokerAccounts = params.get("brokerAccounts") === "1";
  const oauthPayload = localStorage.getItem("flowsignalCtraderOAuth");

  if (!shouldOpenBrokerAccounts && !oauthPayload) return;

  let oauthResult = null;

  if (oauthPayload) {
    try {
      oauthResult = JSON.parse(oauthPayload);
    } catch {
      oauthResult = null;
    }
    localStorage.removeItem("flowsignalCtraderOAuth");
  }

  setTimeout(async () => {
    openBrokerAccountsModal();

    if (oauthResult && oauthResult.ok === false) {
      setBrokerStatusMessage(`Connection Status: ${oauthResult.reason || "cTrader authorization failed"}`, true);
    } else if (oauthResult) {
      setBrokerStatusMessage("Connection Status: cTrader connected. Refreshing accounts...");
    }

    await fetchCtraderStatus();
    await loadBrokerAccounts(true);
  }, 500);

  if (shouldOpenBrokerAccounts && window.history?.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function closeLiveTrade(symbol) {
  try {
    const res = await fetch(
      `${BASE_URL}/close-live-trade`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ symbol })
      }
    );

    const result = await res.json();

    if (!result.ok) {
      setStatus(
        `● CLOSE BLOCKED • ${result.reason || result.message || "no active trade"}`,
        "error"
      );
      return;
    }

    setStatus(
      `● LIVE CLOSED • ${result.symbol || symbol}`,
      "live"
    );

    await refreshPanel();
  } catch (err) {
    console.error("CLOSE LIVE TRADE ERROR:", err);
    setStatus(
      `● CLOSE ERROR • ${err.message}`,
      "error"
    );
  }
}

function stabilizePanelSignals(rawData, previousData) {
  if (!rawData || !previousData) return rawData;

  ["EURUSD", "XAUUSD"].forEach((symbol) => {
    const incoming = rawData[symbol];
    const previous = previousData[symbol];
    const chartCandles = rawData?.candles?.[symbol]?.["5m"] || [];
    const source = incoming?.signal_data_source || {};
    const missedFetches = Number(source.missed_fetch_count || 0);
    const sourceAvailable = source.available !== false;
    const sourceStale =
      String(source.tf_5m_source || "").toLowerCase().includes("stale")
      || String(source.candle_source || "").toLowerCase().includes("stale")
      || String(source.reason || "").toLowerCase().includes("stale");
    const temporarilyUnavailable =
      chartCandles.length > 0
      && missedFetches < 3
      && sourceAvailable
      && !sourceStale
      && (
        String(incoming?.market_condition || "").toUpperCase() === "CTRADER_UNAVAILABLE"
        || (
          Number(incoming?.buy_pct || 0) === 0
          && Number(incoming?.sell_pct || 0) === 0
          && Number(incoming?.confidence || 0) === 0
        )
      );

    if (!temporarilyUnavailable || !previous) return;

    rawData[symbol] = {
      ...previous,
      signal_data_source: source,
      data_temporarily_cached: true,
      stale_minutes: incoming?.stale_minutes ?? previous?.stale_minutes,
    };

    console.log("SIGNAL_NO_DATA_DEBUG", {
      symbol,
      action: "kept_last_valid_signal",
      candleCount: chartCandles.length,
      missedFetchCount: missedFetches,
    });
  });

  return rawData;
}

async function refreshPanel() {
  if (panelRefreshInProgress) {
    console.log("⏭️ refreshPanel skipped: previous request still running");
    return;
  }

  panelRefreshInProgress = true;
  let badgeSettled = false;
  window.FlowSignalStartup?.record("signals_loading_started", {
    transport: "rest_polling",
  });

  try {
    if (isForexWeekendClosed()) {
      setConnectionBadge("closed", "Forex market closed until Sunday 5:00 PM New York time");
    } else if (!lastGoodPanelData) {
      setConnectionBadge("loading", "Loading initial panel data...");
    }

    console.log("⏳ Fetching panel data from:", API_URL);

    const res = await fetch(API_URL, {
      method: "GET",
      cache: "no-store"
    });

    console.log("✅ Response status:", res.status);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

   const rawData = stabilizePanelSignals(
     await res.json(),
     lastGoodPanelData
   );
const meta = rawData?._meta || {};

const liveCandles = rawData?.candles?.[currentChartSymbol]?.[currentChartTimeframe] || [];
const lastCandle = liveCandles[liveCandles.length - 1];
console.log("LAST CANDLE", currentChartSymbol, lastCandle);

const feedStatus = rawData?.feed_status?.[currentChartSymbol];
const marketClosed = isPanelMarketClosed(rawData);

MARKET_IS_CLOSED = marketClosed;
_CHART_IDLE_ENABLED = !marketClosed;

// 🧊 FREEZE BACKEND CANDLES BEFORE SAVING rawData
if (marketClosed) {
  if (!frozenCandlesCache && rawData?.candles) {
    frozenCandlesCache = JSON.parse(JSON.stringify(rawData.candles));
    console.log("🧊 Frozen candle cache saved");
  }

  if (frozenCandlesCache) {
    rawData.candles = frozenCandlesCache;
  }
} else {
  frozenCandlesCache = null;
  frozenChart = {};
}

latestRawPanelData = rawData;
latestPanelFetchedAt = Date.now();
lastGoodPanelData = rawData;

console.log("PANEL_DATA_RECEIVED", {
  symbols: ["EURUSD", "XAUUSD"].filter((symbol) => Boolean(rawData?.[symbol])),
  candleCounts: Object.fromEntries(
    ["EURUSD", "XAUUSD"].map((symbol) => [
      symbol,
      Object.fromEntries(
        ["5m", "15m", "1h"].map((timeframe) => [
          timeframe,
          rawData?.candles?.[symbol]?.[timeframe]?.length || 0,
        ]),
      ),
    ]),
  ),
});

const data = normalizePanelData(rawData);
latestPanelMeta = meta;
data.EURUSD._panel_meta = meta;
data.XAUUSD._panel_meta = meta;
latestPanelData = data;
refreshAllNewsImpact();

if (typeof meta.paper_auto_enabled === "boolean") {
  paperAutoEnabled = meta.paper_auto_enabled;
  localStorage.setItem(
    "paper_auto_enabled",
    paperAutoEnabled ? "true" : "false"
  );
  updatePaperToggleUI();
}

if (typeof meta.live_auto_enabled === "boolean") {
  liveAutoEnabled = meta.live_auto_enabled;
}

if (meta.live_account) {

  liveConnectionState.connected =
    Boolean(meta.live_account.connected);

  liveConnectionState.mode =
    meta.live_account.mode || "broker";

  activeLiveOrders =
    mergeRefreshedLiveOrders(meta.live_active_orders || {});

  liveTradeHistory =
    Array.isArray(meta.live_trade_history)
      ? meta.live_trade_history
      : [];

  if (meta.live_trade_stats) {
    liveTradeStats = {
      ...liveTradeStats,
      ...meta.live_trade_stats,
      daily_realized_pl: Number(meta.daily_realized_pl ?? 0),
      daily_total_pl: Number(
        meta.daily_total_pl ??
        (
          Number(meta.daily_realized_pl ?? 0) +
          Number(meta.floating_live_pl ?? 0)
        )
      ),
      weekly_realized_pl: Number(meta.weekly_realized_pl ?? 0),
      weekly_total_pl: Number(
        meta.weekly_total_pl ??
        (
          Number(meta.weekly_realized_pl ?? 0) +
          Number(meta.floating_live_pl ?? 0)
        )
      ),
      monthly_realized_pl: Number(meta.monthly_realized_pl ?? 0),
      floating_live_pl: Number(meta.floating_live_pl ?? 0)
    };
  }

  renderDashboardPerformance(meta);

  if (meta.auto_trade_status) {
    autoTradeStatus = meta.auto_trade_status;
    liveAutoStatusBySymbol =
      meta.live_auto_status_by_symbol || liveAutoStatusBySymbol || {};
    renderAutoTradeStatus();
  }

  if (meta.live_prices) {
    livePrices = meta.live_prices;
  }

  if (meta.live_price_health) {
    marketDataSourceStatus = {
      ...(marketDataSourceStatus || {}),
      live_price_health: meta.live_price_health,
      live_price_last_update: meta.live_price_last_update
    };
    renderMarketDataSourceStatus();
  }

  renderLiveHistory();
  renderLiveActiveOrders(); 
  renderMobileOpenTradeCard();

  updateLiveToggleUI();
}

const ctraderStatus = isAdminAccount()
  ? await fetchCtraderStatus()
  : null;

if (paperModal && !paperModal.classList.contains("hidden")) {
  fetchMarketDataSourceStatus();
  fetchAutoTradeStatus();
}

updateCard("EURUSD", data.EURUSD);
updateCard("XAUUSD", data.XAUUSD);

updateMainPanel(currentChartSymbol);
   renderHistory(rawData?.history || []);
updatePaperPanel(
  rawData?.paper_trades || {},
  rawData?.paper_trade_history || [],
  rawData?.paper_trade_stats || {}
);

updateLivePanel(
  meta.live_active_orders || {},
  meta.live_trade_history || [],
  meta.live_trade_stats || null
);

processVoiceAnnouncements(data, meta, rawData);

if (meta.auto_trade_status) {
  autoTradeStatus = meta.auto_trade_status;
  liveAutoStatusBySymbol =
    meta.live_auto_status_by_symbol || liveAutoStatusBySymbol || {};
  renderAutoTradeStatus();
}

const chartCandles =
  rawData?.candles?.[currentChartSymbol]?.[currentChartTimeframe] || [];

const alreadyHasChart =
  lastChartData?.[currentChartSymbol]?.[currentChartTimeframe]?.length > 0;

if (chartCandles.length && (!marketClosed || !alreadyHasChart)) {
  renderChartFromPanel(rawData, currentChartSymbol, currentChartTimeframe);
  void ensureTwoMonthChartHistory(currentChartSymbol, currentChartTimeframe);
} else if (marketClosed) {
  console.log("🧊 Market closed: chart frozen");
} else {
  console.warn(`No chart candles found for ${currentChartSymbol}`);
}


updateUTC();
    const local = new Date().toLocaleTimeString();
    const currentFeed = rawData?.feed_status?.[currentChartSymbol];
    const feedStaleMinutes = Number(currentFeed?.stale_minutes);
    const dataAgeMs = Date.now() - latestPanelFetchedAt;
    const staleFeedThresholdMinutes = 12;
    const isDelayed =
      marketClosed ||
      meta?.source === "cache" ||
      (
        Number.isFinite(feedStaleMinutes)
        && feedStaleMinutes >= staleFeedThresholdMinutes
      ) ||
      dataAgeMs > 60000;
    const updateDetail = `Last updated: ${local}`;

    if (meta?.source === "fallback_cache" && meta?.error) {
      setConnectionBadge("error", `Connection issue: ${meta.error}`);
    } else if (marketClosed) {
      setConnectionBadge("closed", `${updateDetail}; market closed`);
    } else if (isDelayed) {
      setConnectionBadge(
        "stale",
        `${updateDetail}; live loading`
      );
    } else {
      setConnectionBadge("live", updateDetail);
    }
    badgeSettled = true;
    window.FlowSignalStartup?.record("signals_loaded", {
      source: meta?.source || "backend",
      EURUSD: data?.EURUSD?.signal || "WAIT",
      XAUUSD: data?.XAUUSD?.signal || "WAIT",
    });
    return true;
  } catch (err) {
  console.error("❌ Refresh error:", err);
  updateUTC();

  if (lastGoodPanelData) {
    console.log("🟡 Using last good panel data");

    const staleAgeSeconds = latestPanelFetchedAt
      ? Math.max(0, Math.round((Date.now() - latestPanelFetchedAt) / 1000))
      : null;
    lastGoodPanelData._meta = {
      ...(lastGoodPanelData._meta || {}),
      stale_data: true,
      error: err.message,
      cache_age_seconds: staleAgeSeconds,
      last_successful_refresh:
        lastGoodPanelData?._meta?.last_successful_refresh
        || latestPanelFetchedAt
        || null,
    };

    const cachedData = normalizePanelData(lastGoodPanelData);
    latestPanelMeta = lastGoodPanelData._meta;
    cachedData.EURUSD._panel_meta = latestPanelMeta;
    cachedData.XAUUSD._panel_meta = latestPanelMeta;
    latestPanelData = cachedData;

    updateCard("EURUSD", cachedData.EURUSD);
    updateCard("XAUUSD", cachedData.XAUUSD);
    updateMainPanel(currentChartSymbol);

    if (lastGoodPanelData?.candles?.[currentChartSymbol]?.[currentChartTimeframe]?.length) {
  latestRawPanelData = lastGoodPanelData;
  renderChartFromPanel(lastGoodPanelData, currentChartSymbol, currentChartTimeframe);
}

    if (isForexWeekendClosed()) {
      setConnectionBadge("closed", "Forex market closed until Sunday 5:00 PM New York time");
    } else {
      setConnectionBadge("error", `Connection issue: ${err.message}; using last successful panel data`);
    }
    badgeSettled = true;
  } else {
    if (isForexWeekendClosed()) {
      setConnectionBadge("closed", "Forex market closed until Sunday 5:00 PM New York time");
    } else {
      setConnectionBadge("error", "Backend unavailable — reconnecting");
    }
    badgeSettled = true;
    window.FlowSignalStartup?.record("signals_failed", { message: err.message });
    return false;
  }
} finally {
    if (!badgeSettled) {
      setConnectionBadge("error", "Panel refresh ended before status updated");
    }
    panelRefreshInProgress = false;
  }
}
   

// ==============================
// MODAL EVENTS
// ==============================

let paperSavedScrollY = 0;

function openPaperPanel() {
  if (!paperModal) return;

  closeAllOverlays();
  closeTradeLevelConfirmation({ restore: false, reset: true });
  applyRoleVisibility();
  if (!isAdminAccount()) {
    executionPage = "paper";
  }
  paperModal.classList.remove("hidden");
  updateExecutionPageUI();
  if (isAdminAccount()) {
    fetchCtraderStatus();
    fetchMarketDataSourceStatus();
    fetchAutoTradeStatus();
  }

  document.documentElement.classList.add("paper-open");
  document.body.classList.add("paper-open");
  setActiveSettingsPage("auto-trade");
  setMainMenuOpen(true);

  if (window.matchMedia("(max-width: 700px)").matches) {
    window.setTimeout(() => {
      setMainMenuOpen(false, { closeAttachedPage: false });
    }, 0);
  }
}

window.openPaperPanel = openPaperPanel;

function closePaperPanel() {
  if (!paperModal) return;

  paperModal.classList.add("hidden");

  document.documentElement.classList.remove("paper-open");
  document.body.classList.remove("paper-open");
  setActiveSettingsPage(null);
  setMainMenuOpen(false, { closeAttachedPage: false });
}

if (menuPaperBtn) {
  menuPaperBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPaperPanel();
  });
}

if (closePaperBtn) {
  closePaperBtn.addEventListener("click", closePaperPanel);
}

if (paperModal) {
  paperModal.addEventListener("click", (e) => {
    if (e.target === paperModal) {
      closePaperPanel();
    }
  });
}

const paperBox = paperModal
  ? paperModal.querySelector(".trade-modal-box")
  : null;

if (paperBox) {
  paperBox.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}
function updatePaperToggleUI() {
  if (!paperAutoToggleBtn) return;

  paperAutoToggleBtn.textContent =
    paperAutoEnabled
      ? "Paper Auto: ON"
      : "Paper Auto: OFF";

  paperAutoToggleBtn.style.background =
  paperAutoEnabled
    ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
    : "#374151";
}

if (paperAutoToggleBtn) {
  paperAutoToggleBtn.addEventListener("click", async () => {
    const previousPaperAutoEnabled = paperAutoEnabled;
    paperAutoEnabled = !paperAutoEnabled;

    localStorage.setItem(
      "paper_auto_enabled",
      paperAutoEnabled ? "true" : "false"
    );

    updatePaperToggleUI();

    try {

      const response = await fetch(
        `${BASE_URL}/paper-auto-toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            enabled: paperAutoEnabled,
            token: ADMIN_CODE
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      paperAutoEnabled =
        typeof data.enabled === "boolean"
          ? data.enabled
          : paperAutoEnabled;
      localStorage.setItem(
        "paper_auto_enabled",
        paperAutoEnabled ? "true" : "false"
      );
      updatePaperToggleUI();
      showAssistantMessage(
        assistantEventMessage(
          paperAutoEnabled ? "paperAutoOn" : "paperAutoOff"
        ),
        `PAPER AUTO ${paperAutoEnabled ? "ON" : "OFF"}`
      );

      console.log("AUTO TRADE:", data);

      await refreshPanel();

    } catch (err) {
      paperAutoEnabled = previousPaperAutoEnabled;
      updatePaperToggleUI();

      console.error(
        "Auto trade toggle failed:",
        err
      );

      setStatus(
        `● AUTO TRADE ERROR • ${err.message}`,
        "error"
      );
    }

  });
}

let pendingLiveAutoState = null;

function hideLiveAutoConfirm() {
  pendingLiveAutoState = null;

  if (!liveAutoConfirmOverlay) return;

  liveAutoConfirmOverlay.classList.add("hidden");
}

function showLiveAutoConfirm(nextEnabled) {
  pendingLiveAutoState = Boolean(nextEnabled);

  if (!liveAutoConfirmOverlay || !liveAutoConfirmMessage || !liveAutoConfirmOk) {
    applyLiveAutoToggle(pendingLiveAutoState);
    return;
  }

  liveAutoConfirmMessage.textContent = pendingLiveAutoState
    ? "FlowSignal will place trades on your connected broker account. Continue?"
    : "Turn Live Auto OFF?";

  liveAutoConfirmOk.classList.toggle("confirm-on", pendingLiveAutoState);
  liveAutoConfirmOk.classList.toggle("confirm-off", !pendingLiveAutoState);
  liveAutoConfirmOverlay.classList.remove("hidden");
  liveAutoConfirmOk.focus();
}

async function applyLiveAutoToggle(nextEnabled) {
  const previousLiveAutoEnabled = liveAutoEnabled;
  liveAutoEnabled = Boolean(nextEnabled);

  try {
    const response = await fetch(
      `${BASE_URL}/live-auto-toggle`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          enabled: liveAutoEnabled,
          source: "flowsignal_web_app"
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    liveAutoEnabled = Boolean(result.enabled);

    if (nextEnabled && !result.enabled && result.message) {
      setStatus(
        `● LIVE AUTO BLOCKED • ${result.message}`,
        "error"
      );
      showAssistantMessage(
        assistantBlockedLine(getVoiceBlockedReason({ reason: result.message })),
        "LIVE AUTO BLOCKED"
      );
    } else {
      showAssistantMessage(
        assistantEventMessage(
          liveAutoEnabled ? "liveAutoOn" : "liveAutoOff"
        ),
        `LIVE AUTO ${liveAutoEnabled ? "ON" : "OFF"}`
      );
    }

  } catch (err) {

    liveAutoEnabled = previousLiveAutoEnabled;

    console.error(
      "LIVE toggle error:",
      err
    );
  }

  updateLiveToggleUI();
  refreshPanel();
}

if (liveAutoToggleBtn) {

  liveAutoToggleBtn.addEventListener(
    "click",
    () => {
      if (!isAdminAccount()) {
        updateLiveToggleUI();
        return;
      }

      if (!liveConnectionState.connected) {
        updateLiveToggleUI();
        setStatus(
          "● LIVE AUTO BLOCKED • broker disconnected",
          "error"
        );
        showAssistantMessage(
          assistantBlockedLine(
            (ASSISTANT_COPY[currentLang] || ASSISTANT_COPY.en)
              .blockedReasons.disconnected
          ),
          "LIVE AUTO BLOCKED"
        );
        return;
      }

      const nextEnabled = !liveAutoEnabled;
      showLiveAutoConfirm(nextEnabled);
    }
  );

}

if (liveAutoConfirmCancel) {
  liveAutoConfirmCancel.addEventListener("click", hideLiveAutoConfirm);
}

if (liveAutoConfirmOk) {
  liveAutoConfirmOk.addEventListener("click", async () => {
    const nextEnabled = pendingLiveAutoState;
    hideLiveAutoConfirm();

    if (nextEnabled === null) return;

    await applyLiveAutoToggle(nextEnabled);
  });
}

if (liveAutoConfirmOverlay) {
  liveAutoConfirmOverlay.addEventListener("click", (event) => {
    if (event.target === liveAutoConfirmOverlay) {
      hideLiveAutoConfirm();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    liveAutoConfirmOverlay &&
    !liveAutoConfirmOverlay.classList.contains("hidden")
  ) {
    hideLiveAutoConfirm();
  }
});

updatePaperToggleUI();
updateLiveToggleUI();
updateExecutionPageUI();

if (tradeCancelBtn) {
  tradeCancelBtn.addEventListener("click", hideTradeModal);
}

if (tradeConfirmBtn) {
  tradeConfirmBtn.addEventListener("click", async () => {
    if (!pendingTrade) return;

    const { symbol, action } = pendingTrade;
    hideTradeModal();
    await executeTrade(symbol, action);
  });
}

if (tradeModal) {
  tradeModal.addEventListener("click", (event) => {
    if (event.target === tradeModal) {
      hideTradeModal();
    }
  });
}

function getLiveSourceBadge(trade) {
  const source =
    String(trade?.source || "").toLowerCase();

  if (source === "broker") return "BROKER";
  if (source === "test") return "TEST";
  if (source === "sim") return "SIM";

  return "LIVE";
}

function formatLiveNumber(value, digits = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "--";

  const displayNumber = number >= 1000
    ? number / (100000 * 100)
    : number;

  return displayNumber.toFixed(digits);
}

function formatLiveMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "--";

  if (number > 0) return `+$${number.toFixed(2)}`;
  if (number < 0) return `-$${Math.abs(number).toFixed(2)}`;

  return "$0.00";
}

function getLiveTradePnl(trade) {
  const candidates = [
    trade?.floating_pl,
    trade?.floating_pnl,
    trade?.broker_pnl,
    trade?.pnl,
    trade?.profit,
    trade?.floatingProfit,
    trade?.floatingPnl,
    trade?.result?.pnl,
    trade?.result?.profit,
    trade?.result?.netProfit
  ];

  for (const value of candidates) {
    const number = Number(value);

    if (Number.isFinite(number)) return number;
  }

  return null;
}

function getLiveTradeId(trade) {
  return (
    trade?.trade_id ||
    trade?.broker_position_id ||
    trade?.position_id ||
    trade?.broker_order_id ||
    trade?.order_id ||
    "--"
  );
}

function getLiveTradeMatchId(trade) {
  const positionId = trade?.broker_position_id || trade?.position_id;

  if (positionId) return `position:${positionId}`;

  const orderId = trade?.broker_order_id || trade?.order_id;

  if (orderId) return `order:${orderId}`;

  if (trade?.trade_id) return `trade:${trade.trade_id}`;

  return "";
}

function getLiveTradeResult(trade) {
  if (hasConfirmedProfitProtection(trade) && String(trade?.status || "").toUpperCase() === "CLOSED") {
    return "WIN";
  }

  const result =
    typeof trade?.result === "string"
      ? trade.result
      : trade?.result?.result || trade?.result?.status;

  return String(result || trade?.status || "TRACKED").toUpperCase();
}

function formatLiveTime(value) {
  const time = value || Date.now();
  return new Date(time * (time < 10000000000 ? 1000 : 1)).toLocaleTimeString();
}

function renderLiveStatsRow() {
  const stats = calculateLiveDisplayStats();

  return `
    <div class="live-stats-row live-paper-match-stats">
      <span class="live-win-stat"><strong>${stats.wins ?? 0}</strong><small>Wins</small></span>
      <span class="live-loss-stat"><strong>${stats.losses ?? 0}</strong><small>Losses</small></span>
      <span class="live-running-stat"><strong>${stats.running ?? 0}</strong><small>Running</small></span>
      <span class="live-total-stat"><strong>${stats.total ?? 0}</strong><small>Total</small></span>
    </div>
  `;
}

function getLiveSymbolCardStatus(symbol, trade) {
  if (trade) {
    const result = getTradeDisplayResult(trade);
    const side = trade.side || trade.action || "";

    return {
      signal: side || "--",
      liveAuto: result === "TP1 HIT" ? "EXECUTED • TP1 HIT" : "EXECUTED",
      reason: "live trade open"
    };
  }

  return null;
}

function getLiveSymbolCardStatusClass(statusInfo) {
  const value = String(statusInfo?.liveAuto || statusInfo || "").toUpperCase();

  if (value.includes("BLOCKED")) return "blocked";
  if (value.includes("BROKER CLOSED")) return "closed";
  if (value.includes("EXECUTED") || value.includes("TP1")) return "running";

  return "";
}

function getLiveSymbolSignal(item) {
  const signal = String(item?.signal || item?.action || "WAIT").toUpperCase();

  return ["BUY", "SELL"].includes(signal) ? signal : "WAIT";
}

function getShortMissedTradeReason(item) {
  const signal = getLiveSymbolSignal(item);
  const reason = stringifyAutoTradeValue(item?.reason).toLowerCase();
  const details = getAutoTradeDetails(item);
  const failedDistanceFields = Array.isArray(details.failed_distance_fields)
    ? details.failed_distance_fields.filter(Boolean)
    : [];
  const distanceDebug = details.broker_min_distance_debug || {};
  const distanceActuallyFailed =
    Boolean(details.should_block_for_distance) ||
    Boolean(distanceDebug.blocked) ||
    failedDistanceFields.length > 0 ||
    Boolean(details.failed_distance) ||
    reason.includes("minimum distance") ||
    reason.includes("min distance") ||
    reason.includes("adjusted broker distances would make trade invalid");

  if (signal === "WAIT") return "no BUY/SELL signal";

  if (reason.includes("already running") || reason.includes("already active")) {
    return "trade already running";
  }

  if (
    reason.includes("stale")
    || reason.includes("market data")
    || reason.includes("data unhealthy")
  ) {
    return "stale data";
  }

  if (distanceActuallyFailed) {
    return "broker min distance";
  }

  if (
    reason.includes("volume")
    || reason.includes("risk sizing")
    || reason.includes("broker minimum")
    || details.final_risk_percent
  ) {
    return "volume safety";
  }

  if (reason.includes("cooldown")) return "cooldown";
  if (reason.includes("disconnected")) return "broker disconnected";
  if (reason.includes("off")) return "live auto off";

  return "no valid entry";
}

function getRecentClosedLiveStatusForSymbol(symbol) {
  const executionSymbol = String(symbol || "").toUpperCase();
  const trade = (liveTradeHistory || []).find((item) => {
    const itemSymbol = String(item?.symbol || "").toUpperCase();

    return itemSymbol === executionSymbol && !isLiveTradeActiveForDisplay(item);
  });

  if (!trade) return "";

  const result = getLiveTradeResult(trade);

  if (result === "BROKER_CLOSED") return "BROKER CLOSED";
  if (result === "STALE_CLOSED") return "STALE CLOSED";
  if (result === "PROTECTED_WIN") return "PROTECTED WIN";
  if (result === "MANUAL_CLOSE") return "MANUAL CLOSE";
  if (["WIN", "LOSS", "BE", "CLOSED"].includes(result)) return result;

  return "";
}

function isLiveTradeActiveForDisplay(trade) {
  const status = getLiveTradeResult(trade);
  const closedStatuses = [
    "WIN",
    "LOSS",
    "BE",
    "PROTECTED_WIN",
    "BROKER_CLOSED",
    "CLOSED",
    "STALE_CLOSED",
    "DISCONNECTED",
    "MANUAL_CLOSE"
  ];

  if (closedStatuses.includes(status)) return false;

  return ["RUNNING", "OPEN", "TP1 HIT"].includes(status);
}

function isPaperTradeActiveForDisplay(trade) {
  if (!trade) return false;

  const status = String(trade.status || "").toUpperCase();
  const result = String(trade.result || "").toUpperCase();
  const closedStatuses = [
    "WIN",
    "LOSS",
    "BE",
    "PROTECTED_WIN",
    "BROKER_CLOSED",
    "CLOSED",
    "STALE_CLOSED",
    "MANUAL_CLOSE"
  ];

  if (closedStatuses.includes(status) || closedStatuses.includes(result)) {
    return false;
  }

  return status === "OPEN" && ["RUNNING", "OPEN", "TP1 HIT"].includes(result || "RUNNING");
}

function hasRealLiveBrokerId(trade) {
  return Boolean(
    trade?.position_id ||
    trade?.broker_position_id ||
    trade?.broker_order_id ||
    trade?.order_id
  );
}

function getLiveTradeAcceptedStatus(trade) {
  const status = getLiveTradeResult(trade);

  if (["RUNNING", "OPEN", "TP1 HIT"].includes(status)) return "RUNNING";
  if (["WIN", "LOSS", "PROTECTED_WIN", "BROKER_CLOSED", "DISCONNECTED"].includes(status)) return status;

  return "";
}

function getTradeTimestampMs(trade) {
  const raw =
    trade?.closed_at ||
    trade?.opened_at ||
    trade?.time ||
    trade?.timestamp;
  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) return 0;

  return value < 10000000000 ? value * 1000 : value;
}

function isCurrentWeekTrade(trade) {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  return getTradeTimestampMs(trade) >= start.getTime();
}

function calculateLiveDisplayStats() {
  const activeTrades = Object.values(activeLiveOrders || {})
    .filter((trade) => (
      trade &&
      String(trade.source || "broker").toLowerCase() === "broker" &&
      hasRealLiveBrokerId(trade) &&
      getLiveTradeAcceptedStatus(trade) === "RUNNING"
    ));
  const activeIds = new Set(
    activeTrades.map((trade) => String(getLiveTradeMatchId(trade))).filter(Boolean)
  );
  const closedTrades = Array.isArray(liveTradeHistory)
    ? liveTradeHistory.filter((trade) => (
        trade &&
        String(trade.source || "broker").toLowerCase() === "broker" &&
        hasRealLiveBrokerId(trade) &&
        isCurrentWeekTrade(trade) &&
        !activeIds.has(String(getLiveTradeMatchId(trade))) &&
        ["WIN", "LOSS", "PROTECTED_WIN", "BROKER_CLOSED", "DISCONNECTED"].includes(getLiveTradeAcceptedStatus(trade))
      ))
    : [];
  const unique = new Map();

  activeTrades.filter(isCurrentWeekTrade).forEach((trade) => {
    const key = trade.position_id || trade.broker_position_id || trade.broker_order_id || trade.order_id;
    unique.set(String(key), trade);
  });

  closedTrades.forEach((trade) => {
    const status = getLiveTradeResult(trade);

    if (["WIN", "LOSS", "PROTECTED_WIN", "BROKER_CLOSED", "DISCONNECTED"].includes(status)) {
      const key = trade.position_id || trade.broker_position_id || trade.broker_order_id || trade.order_id;
      unique.set(String(key), trade);
    }
  });

  return {
    wins: closedTrades.filter((trade) => {
      const status = getLiveTradeAcceptedStatus(trade);
      const pnl = getLiveTradePnl(trade);

      return ["WIN", "PROTECTED_WIN"].includes(status) || (["BROKER_CLOSED", "DISCONNECTED"].includes(status) && pnl > 0);
    }).length,
    losses: closedTrades.filter((trade) => {
      const status = getLiveTradeAcceptedStatus(trade);
      const pnl = getLiveTradePnl(trade);

      return status === "LOSS" || (["BROKER_CLOSED", "DISCONNECTED"].includes(status) && pnl < 0);
    }).length,
    running: activeTrades.length,
    total: unique.size,
  };
}

function getLiveTradeTarget(trade, targetNumber) {
  if (!trade) return "--";

  const value = targetNumber === 1
    ? (
        trade.tp1 ??
        trade.tp_price ??
        trade.take_profit ??
        trade.takeProfit ??
        trade.original_tp_price ??
        trade.raw?.tp1 ??
        trade.raw?.takeProfit ??
        trade.raw?.closePositionDetail?.tp1 ??
        trade.raw?.closePositionDetail?.takeProfit
      )
    : (
        trade.tp2 ??
        trade.tp2_price ??
        trade.tp ??
        trade.original_tp2_price ??
        trade.raw?.tp2 ??
        trade.raw?.closePositionDetail?.tp2
      );

  return value ?? "--";
}

function renderLiveHistory() {

  if (!liveHistoryList) return;
  const activeIds = new Set(
    Object.values(activeLiveOrders || {})
      .filter((trade) => trade && isLiveTradeActiveForDisplay(trade))
      .map((trade) => String(getLiveTradeMatchId(trade)))
  );

  const history =
    Array.isArray(liveTradeHistory)
      ? liveTradeHistory.filter((trade) => {
          const source = String(trade?.source || "broker").toLowerCase();
          return (
            source === "broker" &&
            !isLiveTradeActiveForDisplay(trade) &&
            !activeIds.has(String(getLiveTradeMatchId(trade)))
          );
        })
      : [];

  if (!history.length) {
    liveHistoryList.innerHTML =
      `<div class="live-paper-section">
        <div class="live-active-title">RECENT LIVE TRADES</div>
        <div class="live-empty">
          <div class="live-empty-title">No recent live trades</div>
          <div class="live-empty-subtitle">
            Closed live trades will appear here.
          </div>
        </div>
      </div>`;
    return;
  }

  liveHistoryList.innerHTML =
    `<div class="live-paper-section">
      <div class="live-active-title">RECENT LIVE TRADES</div>
      <div class="live-recent-scroll">
        ${history.map((trade) => {
      const time =
        trade.closed_at ||
        trade.opened_at ||
        trade.time ||
        Date.now();
      const result = getLiveTradeResult(trade);
      const pnl = getLiveTradePnl(trade);
      const pnlClass = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "";
      const protectionLabel = getProfitProtectionLabel(trade);
      const protectionWarning = getSlProtectionWarning(trade);
      const targetWarning = getBrokerTargetWarning(trade);
      const entry = trade.entry || trade.entry_price || "--";
      const originalSl = trade.original_sl || trade.initial_sl || trade.sl || "--";
      const currentSl = getBrokerStopLossDisplay(trade);
      const tp1 = getTp1Display(trade);
      const tp2 = getBrokerTakeProfitDisplay(trade);
      const protectedSl = trade.protected_sl_price || "--";
      const tp1Hit = trade.hit_tp1 ? "Yes" : "No";
      const profitProtected = trade.profit_protected ? "Yes" : "No";
      const tradeId = getLiveTradeId(trade);
      const brokerOrderId = trade.broker_order_id || trade.position_id || "--";
      const pips = trade.pips ?? "--";
      const reason = trade.exit_reason || trade.note || trade.reason || "--";
      const sideColor = String(trade.side || "").toUpperCase() === "SELL" ? "#ef4444" : "#22c55e";
      const badgeColor = result === "WIN" || result === "PROTECTED_WIN" ? "#22c55e" : result === "LOSS" ? "#ef4444" : result === "BROKER_CLOSED" ? "#94a3b8" : "#60a5fa";

      return `
        <details style="margin-bottom:4px;border-radius:11px;background:rgba(30,41,59,.70);border:1px solid rgba(148,163,184,.16);overflow:hidden;">
          <summary style="list-style:none;cursor:pointer;padding:5px 8px;display:grid;grid-template-columns:1fr auto auto auto;gap:5px;align-items:center;font-weight:900;color:#f8fafc;">
            <span style="font-size:12px;">${DISPLAY_NAMES[trade.symbol] || trade.symbol}</span>
            <span style="color:${sideColor};background:${sideColor}22;padding:2px 6px;border-radius:7px;font-size:9px;">${trade.side || "-"}</span>
            <span style="color:${badgeColor};background:${badgeColor}22;padding:2px 6px;border-radius:7px;font-size:9px;">${result}</span>
            <span class="live-pnl ${pnlClass}" style="font-size:10px;">${pnl === null ? "$0.00" : formatLiveMoney(pnl)}</span>
          </summary>

          <div style="padding:0 8px 7px;color:#cbd5e1;font-size:10px;line-height:1.35;">
            ${protectionLabel ? `<div class="live-side" style="color:#86efac;">${protectionLabel}</div>` : ""}
            ${protectionWarning ? `<div class="live-side" style="color:#fbbf24;">${protectionWarning}</div>` : ""}
            ${targetWarning ? `<div class="live-side" style="color:#fbbf24;">${targetWarning}</div>` : ""}
            Trade ID: <b>${tradeId}</b><br>
            Entry: <b>${entry}</b><br>
            Original SL: <b>${originalSl}</b> • Current SL: <b>${currentSl}</b><br>
            <span class="live-target-prices">TP1: <b>${tp1}</b> • TP2: <b>${tp2}</b></span><br>
            Protected SL: <b>${protectedSl}</b><br>
            TP1 Hit: <b>${tp1Hit}</b> • Profit Protected: <b>${profitProtected}</b><br>
            Pips: <b>${pips}</b> • Result: <b>${result}</b><br>
            Reason: <b>${reason}</b><br>
            Order: <b>${brokerOrderId}</b> • Time: <b>${formatLiveTime(time)}</b>
          </div>
        </details>
      `;
    }).join("")}
      </div>
    </div>`;
}

function renderLiveActiveOrders() {

  if (!liveActiveList) return;

  liveActiveList.innerHTML = "";

  const entries = Object.entries(activeLiveOrders || {})
    .filter(([_, trade]) => {
      const source = String(trade?.source || "broker").toLowerCase();
      return trade && source === "broker" && isLiveTradeActiveForDisplay(trade);
    });
  const tradesBySymbol = Object.fromEntries(entries);
  const symbols = ["EURUSD", "XAUUSD"];

  function getLatestSignalForLiveSymbol(symbol) {
    if (!latestPanelData) return null;

    return symbol === "XAUUSD"
      ? latestPanelData.XAUUSD
      : latestPanelData[symbol];
  }

  function hasCurrentBlockedLiveSignal(symbol, autoStatus) {
    const signalData = getLatestSignalForLiveSymbol(symbol) || {};
    const finalSignal = String(signalData.signal || "").toUpperCase();
    const signalBeforeFilters = String(signalData.signal_before_filters || "").toUpperCase();
    const blockedBy = String(signalData.blocked_by || "").toUpperCase();
    const statusSignal = String(autoStatus?.signal || autoStatus?.action || "").toUpperCase();
    const executionBlockReason = String(signalData.execution_block_reason || "").toUpperCase();
    const reasonText = String(
      autoStatus?.reason
      || signalData.execution_block_reason
      || signalData.blocked_reason
      || ""
    ).toLowerCase();
    const isSameSymbolDuplicateBlock =
      executionBlockReason === "ACTIVE_TRADE_ALREADY_RUNNING" ||
      reasonText.includes("already running") ||
      reasonText.includes("already active") ||
      reasonText.includes("active trade already exists") ||
      reasonText.includes("broker already has open position") ||
      reasonText.includes("broker position already exists") ||
      reasonText.includes("order already being sent") ||
      blockedBy.includes("DUPLICATE");
    const hasCurrentBlocker =
      isSameSymbolDuplicateBlock &&
      blockedBy &&
      blockedBy !== "MISSING_15M_SETUP" &&
      blockedBy !== "STRUCTURE_WAIT";

    return (
      (
        (signalBeforeFilters === "BUY" || signalBeforeFilters === "SELL") &&
        hasCurrentBlocker
      ) ||
      (
        statusSignal === "BUY" &&
        isSameSymbolDuplicateBlock
      ) ||
      (
        statusSignal === "SELL" &&
        isSameSymbolDuplicateBlock
      )
    );
  }

  symbols.forEach((symbol) => {
    const trade = tradesBySymbol[symbol] || null;
    const autoStatus = liveAutoStatusBySymbol?.[symbol] || null;
    const autoState = String(autoStatus?.status || "").toUpperCase();
    const autoSignal = String(autoStatus?.signal || autoStatus?.action || "").toUpperCase();
    const showBlockedCard =
      !trade &&
      autoStatus &&
      hasCurrentBlockedLiveSignal(symbol, autoStatus) &&
      (
        autoState === "BLOCKED" ||
        autoState === "ORDER_REJECTED" ||
        ((autoSignal === "BUY" || autoSignal === "SELL") && (autoState === "WAIT" || autoState === "WAITING"))
      );

    if (showBlockedCard) {
      const reason = getShortAutoTradeReason(autoStatus);
      const sideColor = autoSignal === "SELL" ? "#ef4444" : autoSignal === "BUY" ? "#22c55e" : "#facc15";
      const div = document.createElement("div");

      div.className = `live-active-item blocked ${autoSignal.toLowerCase()}`;
      div.innerHTML = `
        <details class="live-active-details">
          <summary class="live-active-summary">
            <div class="live-active-main">
              <strong class="live-symbol">${symbol}</strong>
              <span class="live-side" style="color:${sideColor};">${autoSignal || "SIGNAL"} • BLOCKED</span>
              <span class="live-blocked-reason-inline">Reason: ${escapeLiveAutoStatusText(reason || "safety check")}</span>
            </div>
            <div class="live-compact-meta">
              <span class="live-blocked-pill">NOT EXECUTED</span>
              <span class="live-expand-arrow">⌄</span>
            </div>
          </summary>
          <div class="live-expanded-body">
            <div class="live-status-reason">Reason ${escapeLiveAutoStatusText(reason || "safety check")}</div>
          </div>
        </details>
      `;

      liveActiveList.appendChild(div);
      return;
    }

    const cardStatus = getLiveSymbolCardStatus(symbol, trade);

    if (!cardStatus) return;

    const statusClass = getLiveSymbolCardStatusClass(cardStatus);

    const div = document.createElement("div");
    const lotSize = trade.lot_size ?? trade.volume;
    const entry = trade.entry || trade.entry_price || "--";
    const originalSl = trade.original_sl || trade.initial_sl || trade.sl || "--";
    const currentSl = getBrokerStopLossDisplay(trade);
    const tp1 = getTp1Display(trade);
    const tp2 = getBrokerTakeProfitDisplay(trade);
    const protectedSl = trade.protected_sl_price || "--";
    const tp1Hit = trade.hit_tp1 ? "Yes" : "No";
    const profitProtected = trade.profit_protected ? "Yes" : "No";
    const pnl = getLiveTradePnl(trade);
    const pnlClass = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "";
    const currentPrice = trade.current_price ?? trade.currentPrice ?? "--";
    const tradeId = getLiveTradeId(trade);
    const pips = trade.pips ?? "--";
    const status = trade.status || "--";
    const reason = trade.exit_reason || trade.note || trade.reason || "--";
    const protectionLabel = getProfitProtectionLabel(trade);
    const targetWarning = getBrokerTargetWarning(trade);
    const liveRiskError = getLiveRiskError(trade);
    const displayResult = getTradeDisplayResult(trade);
    const cardSignalText = cardStatus.signal || trade.side || "--";
    const cardLiveAutoText = getTradeDisplayResult(trade);
    const sideColor = cardSignalText === "SELL" ? "#ef4444" : "#22c55e";

    div.className =
      `live-active-item ${String(trade.side || "").toLowerCase()} ${statusClass}`;

    div.innerHTML = `
      <details class="live-active-details">
        <summary class="live-active-summary">
          <div class="live-active-main">
            <strong class="live-symbol">${symbol}</strong>
            <span class="live-side" style="color:${sideColor};">${cardSignalText} • ${displayResult}</span>
          </div>
          <div class="live-compact-meta">
            <span class="live-pnl ${pnlClass}">${pnl === null ? "$0.00" : formatLiveMoney(pnl)}</span>
            <span>Lot ${formatLiveNumber(lotSize, 2)}</span>
            <span class="live-expand-arrow">⌄</span>
          </div>
        </summary>
        <div class="live-expanded-body">
          <div class="live-detail-grid">
            <span>Trade ID <b>${tradeId}</b></span>
            <span>Status <b>${status}</b></span>
            <span>Pips <b>${pips}</b></span>
            <span>Entry <b>${entry}</b></span>
            <span>Current <b>${currentPrice}</b></span>
            <span>Original SL <b>${originalSl}</b></span>
            <span>Current SL <b>${currentSl}</b></span>
            <span>TP1 <b>${tp1}</b></span>
            <span>TP2 <b>${tp2}</b></span>
            <span>Protected SL <b>${protectedSl}</b></span>
            <span>TP1 Hit <b>${tp1Hit}</b></span>
            <span>Profit Protected <b>${profitProtected}</b></span>
            <span>Result <b>${displayResult}</b></span>
          </div>
          <div class="live-status-reason">Reason ${reason}</div>
          ${protectionLabel ? `<div class="live-side" style="color:#86efac;">${protectionLabel}</div>` : ""}
          ${liveRiskError ? `<div class="live-side" style="color:#ff3b30;font-weight:800;">${liveRiskError}</div>` : ""}
          ${targetWarning ? `<div class="live-side" style="color:#fbbf24;">${targetWarning}</div>` : ""}
        </div>
      </details>
    `;

    liveActiveList.appendChild(div);
  });

  liveActiveList.insertAdjacentHTML("beforeend", renderLiveStatsRow());
}

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function getMobileOpenTrade() {
  const entries = Object.entries(activeLiveOrders || {})
    .filter(([_, trade]) => {
      const source = String(trade?.source || "broker").toLowerCase();
      return trade && source === "broker" && isLiveTradeActiveForDisplay(trade);
    });

  if (!entries.length) return null;

  const current = normalizeTradeChartSymbol(currentChartSymbol);
  return entries.find(([symbol]) => normalizeTradeChartSymbol(symbol) === current)
    || entries[0];
}

function getTradeNumericLevel(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return null;
}

function setMobileTradeText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? "--";
}

function renderMobileOpenTradeCard() {
  const card = document.getElementById("mobileOpenTradeCard");
  const body = document.getElementById("mobileTradeBody");
  const empty = document.getElementById("mobileTradeEmpty");

  if (!card || !body || !empty) return;

  const entry = getMobileOpenTrade();
  if (!entry) {
    body.classList.add("hidden");
    empty.classList.remove("hidden");
    card.classList.remove("buy", "sell", "protected", "tp1-hit");
    return;
  }

  const [symbol, trade] = entry;
  const side = String(trade.side || trade.action || "").toUpperCase();
  const isSell = side === "SELL";
  const pnl = getLiveTradePnl(trade);
  const lotSize = trade.lot_size ?? trade.volume ?? trade.lots;
  const entryPrice = getTradeNumericLevel(trade.entry, trade.entry_price);
  const sl = getTradeNumericLevel(
    trade.current_sl,
    trade.sl,
    trade.stop_loss,
    trade.stopLoss,
    trade.raw?.stopLoss
  );
  const tp1 = getTradeNumericLevel(
    trade.tp1,
    trade.take_profit_1,
    trade.tp_price,
    trade.raw?.tp1
  );
  const tp2 = getTradeNumericLevel(
    trade.tp2,
    trade.tp2_price,
    trade.take_profit,
    trade.takeProfit,
    trade.raw?.tp2,
    trade.raw?.takeProfit
  );
  const protectedSl = getTradeNumericLevel(
    trade.protected_sl_price,
    trade.protected_sl,
    trade.break_even_sl
  );
  const livePrice = getTradeNumericLevel(
    getLiveTickMid(symbol),
    trade.current_price,
    trade.currentPrice,
    trade.price,
    entryPrice
  );
  const levels = [sl, entryPrice, tp1, tp2, protectedSl, livePrice]
    .filter((value) => Number.isFinite(value));
  if (!levels.length) {
    body.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const range = max - min || 1;
  const percent = (value) => clampPercent(((Number(value) - min) / range) * 100);
  const greenTo = isSell
    ? Math.min(percent(entryPrice), percent(livePrice))
    : Math.max(percent(entryPrice), percent(livePrice));
  const greenFrom = isSell
    ? Math.max(percent(entryPrice), percent(livePrice))
    : Math.min(percent(entryPrice), percent(livePrice));
  const tp1Hit = Boolean(trade.hit_tp1 || trade.tp1_hit || trade.profit_protected);
  const protectedActive = Boolean(protectedSl || trade.profit_protected);
  const priceText = formatLivePrice(symbol, livePrice) || "--";

  card.classList.toggle("buy", !isSell);
  card.classList.toggle("sell", isSell);
  card.classList.toggle("protected", protectedActive);
  card.classList.toggle("tp1-hit", tp1Hit);
  body.classList.remove("hidden");
  empty.classList.add("hidden");

  setMobileTradeText("mobileTradeSymbol", DISPLAY_NAMES[symbol] || symbol);
  setMobileTradeText("mobileTradeSide", side || "--");
  setMobileTradeText("mobileTradeLot", formatLiveNumber(lotSize, 2));
  setMobileTradeText("mobileTradeEntry", formatLivePrice(symbol, entryPrice) || "--");
  setMobileTradeText("mobileTradeSl", formatLivePrice(symbol, sl) || "--");
  setMobileTradeText("mobileTradeTp1", formatLivePrice(symbol, tp1) || "--");
  setMobileTradeText("mobileTradeTp2", formatLivePrice(symbol, tp2) || "--");
  setMobileTradeText("mobileTradeLivePrice", priceText);
  setMobileTradeText("mobileTradePnl", pnl === null ? "$0.00" : formatLiveMoney(pnl));

  const sideEl = document.getElementById("mobileTradeSide");
  const pnlEl = document.getElementById("mobileTradePnl");
  const protectionEl = document.getElementById("mobileTradeProtection");
  const protectedMarker = card.querySelector(".marker.protected");

  sideEl?.classList.toggle("sell", isSell);
  sideEl?.classList.toggle("buy", !isSell);
  pnlEl?.classList.toggle("positive", Number(pnl) > 0);
  pnlEl?.classList.toggle("negative", Number(pnl) < 0);
  protectionEl?.classList.toggle("hidden", !protectedActive);
  protectedMarker?.classList.toggle("hidden", !protectedSl);

  card.style.setProperty("--sl-pos", `${percent(sl)}%`);
  card.style.setProperty("--entry-pos", `${percent(entryPrice)}%`);
  card.style.setProperty("--tp1-pos", `${percent(tp1)}%`);
  card.style.setProperty("--tp2-pos", `${percent(tp2)}%`);
  card.style.setProperty("--live-pos", `${percent(livePrice)}%`);
  card.style.setProperty("--protected-pos", `${percent(protectedSl || sl)}%`);
  card.style.setProperty("--green-from", `${greenFrom}%`);
  card.style.setProperty("--green-to", `${greenTo}%`);
}

function updateLiveToggleUI() {

  if (!liveAutoToggleBtn) return;

  liveAutoToggleBtn.classList.remove(
    "toggle-on",
    "toggle-off",
    "toggle-live"
  );

  if (!liveConnectionState.connected) {
    liveAutoToggleBtn.classList.remove(
      "toggle-on",
      "toggle-off",
      "toggle-live"
    );

    liveAutoToggleBtn.classList.add("toggle-off");

    liveAutoToggleBtn.textContent = liveAutoEnabled
      ? "Live Auto: ON — paused (broker disconnected)"
      : "Live Auto: OFF — broker disconnected";

    if (brokerConnectionStatus) {
      brokerConnectionStatus.textContent =
        "Live Auto paused — broker disconnected";
      brokerConnectionStatus.classList.remove("connected", "live");
    }

    return;
  }

  liveAutoToggleBtn.classList.add(
    liveAutoEnabled ? "toggle-live" : "toggle-off"
  );

  liveAutoToggleBtn.textContent =
    liveAutoEnabled
      ? "Live Auto: ON"
      : "Live Auto: OFF";

  if (brokerConnectionStatus) {
    brokerConnectionStatus.textContent = "Live Broker: Connected";
    brokerConnectionStatus.classList.add("connected");
    brokerConnectionStatus.classList.remove("live");
  }
}

function updateExecutionPageUI() {
  if (!paperPageBtn || !livePageBtn) return;
  applyRoleVisibility();

  if (!isAdminAccount()) {
    executionPage = "paper";
  }

  const show = (el) => {
    if (!el) return;
    el.classList.remove("hidden");
    el.style.setProperty("display", "block", "important");
  };

  const hide = (el) => {
    if (!el) return;
    el.classList.add("hidden");
    el.style.setProperty("display", "none", "important");
  };
  const marketStatusEl = document.getElementById("marketDataSourceStatus");
  const autoStatusEl = document.getElementById("autoTradeStatus");
  const liveAutoSymbolStatusEl = document.getElementById("liveAutoSymbolStatus");

  paperPageBtn.classList.remove("active");
  livePageBtn.classList.remove("active");

  if (executionPage === "paper") {
    paperPageBtn.classList.add("active");

    show(paperAutoSection);
    hide(liveAutoSection);
    hide(brokerConnectionStatus);
    hide(marketStatusEl);
    hide(autoStatusEl);
    hide(liveAutoSymbolStatusEl);

    show(paperHistoryList);
    hide(liveHistoryList);

    hide(document.getElementById("liveActiveOrders"));
  }

  if (executionPage === "live") {
    if (!isAdminAccount()) {
      executionPage = "paper";
      updateExecutionPageUI();
      return;
    }

    livePageBtn.classList.add("active");

    show(liveAutoSection);
    renderLiveTotalTradesCard();
    show(brokerConnectionStatus);
    show(marketStatusEl);
    show(autoStatusEl);
    hide(liveAutoSymbolStatusEl);

    hide(paperAutoSection);

    hide(paperHistoryList);
    show(liveHistoryList);
    renderLiveHistory();

    show(document.getElementById("liveActiveOrders"));
    
  }

  if (executionPage === "live") {
    renderMarketDataSourceStatus();
    renderAutoTradeStatus();
  }
}

paperPageBtn?.addEventListener("click", () => {
  executionPage = "paper";
  updateExecutionPageUI();
});

livePageBtn?.addEventListener("click", () => {
  if (!isAdminAccount()) {
    executionPage = "paper";
    updateExecutionPageUI();
    return;
  }

  executionPage = "live";
  updateExecutionPageUI();
});

if (adminUnlockBtn) {
  adminUnlockBtn.addEventListener("click", () => {
    if (isAdminUnlocked) {
      isAdminUnlocked = false;
      updateTradeButtonsLock();
      if (!latestPanelData) {
      setStatus("● LOADING PANEL...", "live");
    }
      return;
    }

    showAdminModal();
  });
}

if (adminCancelBtn) {
  adminCancelBtn.addEventListener("click", hideAdminModal);
}

if (adminConfirmBtn) {
  adminConfirmBtn.addEventListener("click", unlockAdminAccess);
}

if (adminCodeInput) {
  adminCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      unlockAdminAccess();
    }
  });
}

if (adminModal) {
  adminModal.addEventListener("click", (event) => {
    if (event.target === adminModal) {
      hideAdminModal();
    }
  });
}
// ==============================
// LIVE CHART
// ==============================

let chart = null;
let candleSeries = null;
let structureLine = null;
let chartLevelDragState = {
  active: false,
  pending: false,
  changedLevel: null,
  proposedLevels: null,
  originalLevels: null,
  trade: null,
};
let lastKnownTradeLevels = {};
let chartRefreshInProgress = false;
let lastChartData = {
  EURUSD: { "5m": [], "15m": [], "1h": [] },
  XAUUSD: { "5m": [], "15m": [], "1h": [] }
};
let _CHART_IDLE_PHASE = 0;
let _CHART_IDLE_ENABLED = false;
chartModuleInitialized = true;

function clearTradeLevelDragLayer({ force = false } = {}) {
  const dragLayer = document.getElementById("tradeLevelDragLayer");
  if (!dragLayer) return;

  if (!force && (chartLevelDragState.active || chartLevelDragState.pending)) {
    return;
  }

  dragLayer.replaceChildren();
}

function hideChartAttributionMark() {
  const container = document.getElementById("chartContainer");
  if (!container) return;

  container
    .querySelectorAll(
      'a[href*="tradingview.com"], #tv-attr-logo, .tv-attr-logo, [id*="tv-attr"], [class*="tv-attr"], [aria-label*="TradingView"], [title*="TradingView"], [class*="logo"], [class*="watermark"]'
    )
    .forEach((element) => {
      element.style.setProperty("display", "none", "important");
      element.style.setProperty("opacity", "0", "important");
      element.style.setProperty("visibility", "hidden", "important");
      element.style.setProperty("pointer-events", "none", "important");
    });

  const containerRect = container.getBoundingClientRect();
  if (!containerRect.width || !containerRect.height) return;

  Array.from(container.querySelectorAll("*")).forEach((element) => {
    if (["CANVAS", "TABLE", "TBODY", "TR", "TD"].includes(element.tagName)) return;

    const rect = element.getBoundingClientRect();
    const isSmallBottomLeft =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.width <= 92 &&
      rect.height <= 52 &&
      rect.left - containerRect.left <= 88 &&
      containerRect.bottom - rect.bottom <= 88;

    if (!isSmallBottomLeft) return;

    element.style.setProperty("display", "none", "important");
    element.style.setProperty("opacity", "0", "important");
    element.style.setProperty("visibility", "hidden", "important");
    element.style.setProperty("pointer-events", "none", "important");
  });
}
let MARKET_IS_CLOSED = false;
let frozenChart = {};
let frozenCandlesCache = null;
// Keep roughly two calendar months of trading history for each supported
// timeframe. The limits count market candles (weekends do not create bars), so
// they cover about 44 trading days without asking the chart for unused rows.
// This is presentation-only; strategy/backend candle history is unchanged.
const MONTHLY_CHART_CANDLE_LIMITS = Object.freeze({
  "5m": 13000,
  "15m": 4400,
  "1h": 1100,
});
const twoMonthChartHistory = Object.create(null);
const twoMonthChartHistoryRequests = Object.create(null);

function getMonthlyChartCandleLimit(timeframe = currentChartTimeframe) {
  return MONTHLY_CHART_CANDLE_LIMITS[String(timeframe || "15m").toLowerCase()]
    || MONTHLY_CHART_CANDLE_LIMITS["15m"];
}

function normalizeTradeChartSymbol(symbol) {
  return String(symbol || "").toUpperCase();
}

function normalizeTradeExecutionSymbol(symbol) {
  return String(symbol || "").toUpperCase();
}

function initChart() {
  const container = document.getElementById("chartContainer");

  if (!container) {
    console.error("Chart init failed: chartContainer not found");
    return;
  }

  if (typeof LightweightCharts === "undefined") {
    console.error("Chart init failed: LightweightCharts not loaded");
    return;
  }

  if (chart) {
    chart.remove();
    chart = null;
    candleSeries = null;
    tradeVisualPriceLines = {
      EURUSD: {},
      XAUUSD: {},
    };
    clearTradeLevelDragLayer({ force: true });
  }

  chart = LightweightCharts.createChart(container, {
  width: container.clientWidth || 800,
  height: Math.max(container.clientHeight || 420, 320),

  layout: {
    background: { color: "#0b0f1a" },
    textColor: "#9fb0c8",
    attributionLogo: false
  },
  priceFormat: {
    type: 'price',
    precision: currentChartSymbol === "EURUSD" ? 5 : 2,
    minMove: currentChartSymbol === "EURUSD" ? 0.00001 : 0.01,
  },
  grid: {
    vertLines: { color: "rgba(42, 51, 66, 0.45)" },
    horzLines: { color: "rgba(42, 51, 66, 0.45)" }
  },
  crosshair: {
    mode: 1,
    vertLine: {
      color: "rgba(180, 190, 210, 0.35)",
      width: 1,
      style: 2,
      labelBackgroundColor: "#111827"
    },
    horzLine: {
      color: "rgba(180, 190, 210, 0.35)",
      width: 1,
      style: 2,
      labelBackgroundColor: "#111827"
    }
  },
  rightPriceScale: {
    borderColor: "#1f2937",
    scaleMargins: {
      top: 0.08,
      bottom: 0.08
    }
  },
  timeScale: {
    borderColor: "#1f2937",
    timeVisible: true,
    secondsVisible: false,
    barSpacing: 14,
    rightOffset: 10,
    lockVisibleTimeRangeOnResize: true
  }
});

  hideChartAttributionMark();
  requestAnimationFrame(hideChartAttributionMark);
  window.setTimeout(hideChartAttributionMark, 100);
  window.setTimeout(hideChartAttributionMark, 350);
  window.setTimeout(hideChartAttributionMark, 900);

  candleSeries = chart.addCandlestickSeries({
  upColor: "#26a69a",
  borderUpColor: "#26a69a",
  wickUpColor: "#26a69a",
  downColor: "#ef5350",
  borderDownColor: "#ef5350",
  wickDownColor: "#ef5350",
  priceLineVisible: false,
  lastValueVisible: true,

  priceFormat: {
    type: "price",
    precision: currentChartSymbol === "EURUSD" ? 5 : 2,
    minMove: currentChartSymbol === "EURUSD" ? 0.00001 : 0.01
  }
});

  try {
    chart.timeScale().subscribeVisibleLogicalRangeChange(
      scheduleTradeLevelReposition
    );
  } catch (error) {
    console.warn("Chart level zoom subscription unavailable");
  }

  if (!window.__flowSignalChartResizeBound) {
    window.__flowSignalChartResizeBound = true;
    window.addEventListener("resize", () => {
      const activeContainer = document.getElementById("chartContainer");
      if (chart && activeContainer) {
        chart.applyOptions({
          width: activeContainer.clientWidth || 800,
          height: Math.max(activeContainer.clientHeight || 420, 320)
        });
        scheduleTradeLevelReposition();
      }
    });
  }
}

const chartLibraryScript = document.querySelector("script[data-flow-chart-library]");

chartLibraryScript?.addEventListener("load", () => {
  window.FlowSignalStartup?.record("chart_library_loaded");
  if (chart || typeof LightweightCharts === "undefined") return;
  if (!mainApp || mainApp.classList.contains("hidden") || mainApp.classList.contains("locked")) return;

  try {
    initChart();
    const candles = latestRawPanelData?.candles?.[currentChartSymbol]?.[currentChartTimeframe];
    if (Array.isArray(candles) && candles.length) {
      forceChartRenderFromLatest(currentChartSymbol, currentChartTimeframe);
    }
  } catch (error) {
    window.FlowSignalStartup?.record("chart_library_recovery_failed", {
      message: error.message,
    });
  }
}, { once: true });

chartLibraryScript?.addEventListener("error", () => {
  window.FlowSignalStartup?.record("chart_library_load_failed", {
    source: "lightweight-charts",
  });
}, { once: true });

// ==============================
// CHART HELPERS
// ==============================

function getChartCandles(rawData, symbol = currentChartSymbol, timeframe = currentChartTimeframe) {
  const liveCandles = rawData?.candles?.[symbol]?.[timeframe] || [];
  const history = twoMonthChartHistory[`${symbol}_${timeframe}`] || [];
  const mergedByTime = new Map();
  [...history, ...liveCandles].forEach((candle) => {
    if (Number.isFinite(Number(candle?.time))) {
      mergedByTime.set(Number(candle.time), candle);
    }
  });
  const candles = Array.from(mergedByTime.values()).sort(
    (left, right) => Number(left.time) - Number(right.time)
  );

  const cleaned = candles.filter((c) => {
    const o = Number(c.open);
    const h = Number(c.high);
    const l = Number(c.low);
    const close = Number(c.close);

    if (!o || !h || !l || !close) return false;

    const maxBodyPrice = Math.max(o, close);
    const minBodyPrice = Math.min(o, close);

    // normal candle rule
    if (h < maxBodyPrice) return false;
    if (l > minBodyPrice) return false;

    // remove crazy spikes
    const mid = (o + close) / 2;
    const range = h - l;

    if (symbol === "XAUUSD" && range > mid * 0.03) return false;
    if (symbol === "EURUSD" && range > mid * 0.01) return false;

    return true;
  });

  return cleaned.slice(-getMonthlyChartCandleLimit(timeframe));
}

async function ensureTwoMonthChartHistory(
  symbol = currentChartSymbol,
  timeframe = currentChartTimeframe
) {
  const normalizedSymbol = normalizeTradeChartSymbol(symbol);
  const normalizedTimeframe = String(timeframe || "15m").toLowerCase();
  const key = `${normalizedSymbol}_${normalizedTimeframe}`;
  if (twoMonthChartHistory[key]?.length) return twoMonthChartHistory[key];
  if (twoMonthChartHistoryRequests[key]) return twoMonthChartHistoryRequests[key];

  twoMonthChartHistoryRequests[key] = (async () => {
    const url = new URL(`${BASE_URL}/chart/candles-history`);
    url.searchParams.set("symbol", normalizedSymbol);
    url.searchParams.set("timeframe", normalizedTimeframe);
    url.searchParams.set("days", "62");
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: newsModeAuthHeaders(),
      suppressErrorPanel: true,
      timeoutMs: 45000,
    });
    if (!response.ok) throw new Error(`Two-month chart history HTTP ${response.status}`);
    const payload = await response.json();
    const candles = (Array.isArray(payload?.candles) ? payload.candles : [])
      .map((candle) => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume || 0),
      }))
      .filter((candle) => (
        Number.isFinite(candle.time)
        && Number.isFinite(candle.open)
        && Number.isFinite(candle.high)
        && Number.isFinite(candle.low)
        && Number.isFinite(candle.close)
      ));
    twoMonthChartHistory[key] = candles;
    if (
      normalizedSymbol === currentChartSymbol
      && normalizedTimeframe === currentChartTimeframe
    ) {
      forceChartRenderFromLatest(normalizedSymbol, normalizedTimeframe);
    }
    return candles;
  })().catch((error) => {
    console.warn("Two-month chart history unavailable; using live chart window", error);
    return [];
  }).finally(() => {
    delete twoMonthChartHistoryRequests[key];
  });
  return twoMonthChartHistoryRequests[key];
}

function updateChartOverlay(symbol, timeframe, candles) {
  const title = document.getElementById("chartOverlayTitle");
  const ohlc = document.getElementById("chartOverlayOhlc");

  if (!title || !ohlc) return;

  title.textContent = `${DISPLAY_NAMES[symbol] || symbol} · ${timeframe}`;

  if (!candles || candles.length === 0) {
    ohlc.textContent = "Data unavailable";
    return;
  }

  const last = candles[candles.length - 1];
  const open = formatLivePrice(symbol, last.open);
  const high = formatLivePrice(symbol, last.high);
  const low = formatLivePrice(symbol, last.low);
  const close = formatLivePrice(symbol, last.close);

  if (!open || !high || !low || !close) {
    ohlc.textContent = "Data unavailable";
    return;
  }

  ohlc.innerHTML = `
    O <span>${open}</span>
    H <span>${high}</span>
    L <span>${low}</span>
    C <span>${close}</span>
  `;
}
let structureLineSeries = null;

function getActiveTradeForChartSymbol(symbol = currentChartSymbol) {
  const tradeSymbol = normalizeTradeChartSymbol(symbol);
  const liveTrade = activeLiveOrders?.[tradeSymbol] || null;

  if (liveTrade && isLiveTradeActiveForDisplay(liveTrade)) return liveTrade;

  return null;
}

function clearInactiveTradeVisualLines() {
  ["EURUSD", "XAUUSD"].forEach((symbol) => {
    const liveTrade = activeLiveOrders?.[symbol] || null;

    if (!isLiveTradeActiveForDisplay(liveTrade)) {
      clearTradeLines(symbol);
    }
  });
}

function getTradeChartIdentity(trade, symbol = currentChartSymbol) {
  return String(
    trade?.trade_id ??
    trade?.position_id ??
    trade?.broker_position_id ??
    trade?.order_id ??
    `active-${normalizeTradeChartSymbol(symbol)}`
  );
}

function getTradeLineId(symbol, tradeId, lineType) {
  return `${normalizeTradeChartSymbol(symbol)}:${tradeId}:${String(lineType).toUpperCase()}`;
}

function removeTradeVisualLine(symbol, lineType) {
  const executionSymbol = normalizeTradeExecutionSymbol(symbol);
  const normalizedType = String(lineType || "").toUpperCase();
  const symbolLines = tradeVisualPriceLines[executionSymbol] || {};
  const record = symbolLines[normalizedType];

  if (!record) return;

  if (candleSeries && record.line) {
    try {
      candleSeries.removePriceLine(record.line);
    } catch (err) {
      console.warn("Trade level line cleanup skipped", record.id);
    }
  }

  console.log("removeLine", executionSymbol, record.tradeId, normalizedType);
  delete symbolLines[normalizedType];
}

function clearTradeLines(symbol = currentChartSymbol) {
  const executionSymbol = normalizeTradeExecutionSymbol(symbol);
  const symbolLines = tradeVisualPriceLines[executionSymbol] || {};

  Object.keys(symbolLines).forEach((lineType) => {
    removeTradeVisualLine(executionSymbol, lineType);
  });
  tradeVisualPriceLines[executionSymbol] = {};

  if (executionSymbol !== normalizeTradeExecutionSymbol(currentChartSymbol)) {
    return;
  }

  if (executionSymbol === normalizeTradeExecutionSymbol(currentChartSymbol)) {
    clearTradeLevelDragLayer();
  }
}

function clearTradeVisualLevels() {
  clearTradeLines(currentChartSymbol);
}

function getDisplayedOpenTradeCount() {
  const value = Number(String(dashboardOpenTrades?.textContent || "").trim());
  return Number.isFinite(value) ? value : null;
}

function addTradeVisualLine(price, title, color, options = {}) {
  const numericPrice = Number(price);

  if (!candleSeries || !Number.isFinite(numericPrice)) return;

  const executionSymbol = normalizeTradeExecutionSymbol(
    options.symbol || currentChartSymbol
  );
  const lineType = String(options.lineType || title || "LINE").toUpperCase();
  const tradeId = String(options.tradeId || "unknown");
  const id = getTradeLineId(executionSymbol, tradeId, lineType);
  const symbolLines = tradeVisualPriceLines[executionSymbol] || {};
  const existing = symbolLines[lineType];

  console.log("duplicateLineDetected", Boolean(existing), id);
  if (existing) removeTradeVisualLine(executionSymbol, lineType);

  if (!tradeVisualPriceLines[executionSymbol]) {
    tradeVisualPriceLines[executionSymbol] = {};
  }

  const line = candleSeries.createPriceLine({
    price: numericPrice,
    color,
    lineWidth: Number(options.lineWidth || 2),
    lineStyle: options.lineStyle ?? LightweightCharts.LineStyle.Solid,
    axisLabelVisible: true,
    title,
  });

  tradeVisualPriceLines[executionSymbol][lineType] = {
    id,
    line,
    lineType,
    tradeId,
    price: numericPrice,
    title,
    color,
  };
  console.log("drawLine", executionSymbol, tradeId, lineType, numericPrice);
}

function getTradeLevelPriceStep(symbol = currentChartSymbol) {
  return normalizeTradeChartSymbol(symbol) === "XAUUSD" ? 0.01 : 0.00001;
}

function roundTradeLevelPrice(value, symbol = currentChartSymbol) {
  const decimals = normalizeTradeChartSymbol(symbol) === "XAUUSD" ? 2 : 5;
  return Number(Number(value).toFixed(decimals));
}

function getTradeLotSize(trade, symbol = currentChartSymbol) {
  const normalizedSymbol = normalizeTradeChartSymbol(symbol);
  const volumeUnits = Number(trade?.volume_units);
  if (normalizedSymbol === "XAUUSD" && Number.isFinite(volumeUnits) && volumeUnits > 0) {
    return volumeUnits / 10000;
  }

  const lots = Number(trade?.lot_size ?? trade?.volume);
  if (Number.isFinite(lots) && lots > 0) return lots;

  return Number.isFinite(volumeUnits) && volumeUnits > 0
    ? volumeUnits / 10000
    : 0;
}

function getTradeLevelMetrics(trade, levels, changedLevel, price) {
  const symbol = normalizeTradeChartSymbol(trade?.symbol || currentChartSymbol);
  const entry = Number(levels.entry);
  const sl = Number(levels.current_sl);
  const tp2 = Number(levels.tp2);
  const lotSize = getTradeLotSize(trade, symbol);
  const pipSize = symbol === "XAUUSD" ? 0.01 : 0.0001;
  const lineDistance = Math.abs(Number(price) - entry);
  const pips = lineDistance / pipSize;
  const riskDistance = Math.abs(entry - sl);
  const rewardDistance = Math.abs(tp2 - entry);
  const riskReward = riskDistance > 0 ? rewardDistance / riskDistance : 0;
  const dollarPerPriceUnit = symbol === "XAUUSD"
    ? lotSize * 100
    : (lotSize * 10) / pipSize;
  const dollarRisk = riskDistance * dollarPerPriceUnit;
  const projectedProfit = rewardDistance * dollarPerPriceUnit;

  return {
    changedLevel,
    price: Number(price),
    pips,
    riskReward,
    dollarRisk,
    projectedProfit,
    lotSize,
  };
}

function validateDraggedTradeLevel(trade, levels, changedLevel, price) {
  const nextLevels = {
    ...levels,
    [changedLevel === "sl" ? "current_sl" : changedLevel]: Number(price),
  };
  const entry = Number(nextLevels.entry);
  const side = String(trade?.side || trade?.action || "").toUpperCase();
  const numericPrice = Number(price);

  if (!Number.isFinite(entry) || !Number.isFinite(numericPrice)) {
    return "Invalid chart price";
  }
  if (side === "BUY") {
    if (changedLevel === "sl" && numericPrice >= entry) return "BUY stop loss must stay below Entry";
    if (["tp1", "tp2"].includes(changedLevel) && numericPrice <= entry) return "BUY take profit must stay above Entry";
  }
  if (side === "SELL") {
    if (changedLevel === "sl" && numericPrice <= entry) return "SELL stop loss must stay above Entry";
    if (["tp1", "tp2"].includes(changedLevel) && numericPrice >= entry) return "SELL take profit must stay below Entry";
  }

  const nextTp1 = Number(nextLevels.tp1);
  const nextTp2 = Number(nextLevels.tp2);
  if (Number.isFinite(nextTp1) && Number.isFinite(nextTp2)) {
    if (side === "BUY" && nextTp1 > nextTp2) return "TP1 cannot be above TP2 on a BUY";
    if (side === "SELL" && nextTp1 < nextTp2) return "TP1 cannot be below TP2 on a SELL";
  }

  return "";
}

function updateTradeLevelPreview(trade, levels, changedLevel, price, error = "") {
  const preview = document.getElementById("tradeLevelPreview");
  if (!preview) return;

  const metrics = getTradeLevelMetrics(trade, levels, changedLevel, price);
  preview.classList.remove("hidden");
  preview.innerHTML = error
    ? `<span style="grid-column:1/-1;color:#ff6b75">${error}</span>`
    : `
      <span>Distance <strong>${metrics.pips.toFixed(1)} pips</strong></span>
      <span>R/R <strong>1:${metrics.riskReward.toFixed(2)}</strong></span>
      <span>Risk <strong>${formatLiveMoney(-metrics.dollarRisk)}</strong></span>
      <span>Projected <strong>${formatLiveMoney(metrics.projectedProfit)}</strong></span>
    `;
}

function hideTradeLevelPreview() {
  document.getElementById("tradeLevelPreview")?.classList.add("hidden");
}

function createEmptyChartLevelDragState() {
  return {
    active: false,
    pending: false,
    changedLevel: null,
    proposedLevels: null,
    originalLevels: null,
    trade: null,
    symbol: null,
  };
}

function positionTradeLevelDragLine(lineElement, price) {
  if (!candleSeries || !lineElement) return false;

  const coordinate = candleSeries.priceToCoordinate(Number(price));
  if (!Number.isFinite(coordinate)) return false;

  lineElement.style.top = `${coordinate}px`;
  const label = lineElement.querySelector(".trade-level-label");
  if (label) {
    const title = lineElement.dataset.title || "";
    label.textContent = `${title}  ${formatLivePrice(currentChartSymbol, price) || price}`;
  }
  return true;
}

function repositionTradeLevelDragLines() {
  const layer = document.getElementById("tradeLevelDragLayer");
  if (!layer || !candleSeries) return;

  layer.querySelectorAll(".trade-level-drag-line").forEach((lineElement) => {
    const price = Number(lineElement.dataset.price);
    const symbol = normalizeTradeChartSymbol(lineElement.dataset.symbol);

    if (
      symbol !== normalizeTradeChartSymbol(currentChartSymbol) ||
      !Number.isFinite(price)
    ) {
      return;
    }

    positionTradeLevelDragLine(lineElement, price);
  });
}

let tradeLevelRepositionFrame = null;
let tradeLevelRepositionTrailingTimer = null;

function scheduleTradeLevelReposition() {
  const layer = document.getElementById("tradeLevelDragLayer");
  if (!layer?.querySelector(".trade-level-drag-line")) return;

  // Pan and zoom can emit dozens of visible-range events per frame. Keep only
  // one paint-time update plus one trailing correction after interaction ends.
  if (tradeLevelRepositionFrame === null) {
    tradeLevelRepositionFrame = window.requestAnimationFrame(() => {
      tradeLevelRepositionFrame = null;
      repositionTradeLevelDragLines();
    });
  }

  window.clearTimeout(tradeLevelRepositionTrailingTimer);
  tradeLevelRepositionTrailingTimer = window.setTimeout(() => {
    tradeLevelRepositionTrailingTimer = null;
    repositionTradeLevelDragLines();
  }, 80);
}

function openTradeLevelConfirmation() {
  if (!isAdminAccount()) return;

  const modal = document.getElementById("tradeLevelConfirmModal");
  const summary = document.getElementById("tradeLevelConfirmSummary");
  const metricsBox = document.getElementById("tradeLevelConfirmMetrics");
  const errorBox = document.getElementById("tradeLevelConfirmError");
  const state = chartLevelDragState;

  if (!modal || !state.trade || !state.proposedLevels || !state.changedLevel) return;

  const price = Number(state.proposedLevels[
    state.changedLevel === "sl" ? "current_sl" : state.changedLevel
  ]);
  const metrics = getTradeLevelMetrics(
    state.trade,
    state.proposedLevels,
    state.changedLevel,
    price
  );
  const labels = { sl: "Broker SL", tp1: "TP1", tp2: "Broker TP" };
  const validationError = validateDraggedTradeLevel(
    state.trade,
    state.proposedLevels,
    state.changedLevel,
    price
  );
  const applyButton = document.getElementById("applyTradeLevelChangeBtn");

  summary.textContent = `${labels[state.changedLevel]} → ${formatLivePrice(currentChartSymbol, price)}`;
  metricsBox.innerHTML = `
    <span>Distance<strong>${metrics.pips.toFixed(1)} pips</strong></span>
    <span>Risk / Reward<strong>1:${metrics.riskReward.toFixed(2)}</strong></span>
    <span>Dollar risk<strong>${formatLiveMoney(-metrics.dollarRisk)}</strong></span>
    <span>Projected profit<strong>${formatLiveMoney(metrics.projectedProfit)}</strong></span>
  `;
  if (validationError && errorBox) {
    errorBox.textContent = validationError;
    errorBox.classList.remove("hidden");
  } else {
    errorBox?.classList.add("hidden");
  }
  if (applyButton) applyButton.disabled = Boolean(validationError);
  modal.style.removeProperty("display");
  modal.classList.remove("hidden");
}

function closeTradeLevelConfirmation({ restore = false, reset = false } = {}) {
  const modal = document.getElementById("tradeLevelConfirmModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
  }
  hideTradeLevelPreview();
  chartLevelDragState.active = false;
  chartLevelDragState.pending = false;
  if (reset) {
    chartLevelDragState = createEmptyChartLevelDragState();
  }

  if (restore) drawTradeVisualLevels();
}

function tradeLevelMatchesBrokerReadback(order, changedLevel, requestedPrice, symbol) {
  if (!order || !Number.isFinite(Number(requestedPrice))) return false;

  const userLevels = order.user_modified_levels && typeof order.user_modified_levels === "object"
    ? order.user_modified_levels
    : {};
  const candidates = changedLevel === "sl"
    ? [order.current_sl, order.sl, userLevels.sl]
    : changedLevel === "tp1"
      ? [order.tp1, order.take_profit_1, userLevels.tp1]
      : [order.tp2, order.take_profit_2, order.take_profit, userLevels.tp2];
  const tolerance = getTradeLevelPriceStep(symbol) / 2;

  return candidates.some((candidate) => (
    Number.isFinite(Number(candidate)) &&
    Math.abs(Number(candidate) - Number(requestedPrice)) <= tolerance
  ));
}

async function verifyTradeLevelBrokerReadback(symbol, positionId, changedLevel, requestedPrice) {
  try {
    const response = await fetch(`${BASE_URL}/dashboard-feed`, {
      timeoutMs: 12000,
      suppressErrorPanel: true,
    });
    if (!response.ok) return null;

    const feed = await response.json();
    const activeOrders = feed?._meta?.live_active_orders || {};
    const order = activeOrders[symbol];
    const orderPositionId = order?.position_id || order?.broker_position_id;
    if (!order || String(orderPositionId) !== String(positionId)) return null;

    return tradeLevelMatchesBrokerReadback(
      order,
      changedLevel,
      requestedPrice,
      symbol
    ) ? order : null;
  } catch (_error) {
    return null;
  }
}

async function applyDraggedTradeLevelChange() {
  if (!isAdminAccount()) return;

  const state = chartLevelDragState;
  const applyButton = document.getElementById("applyTradeLevelChangeBtn");
  const errorBox = document.getElementById("tradeLevelConfirmError");
  const levels = state.proposedLevels;
  const trade = state.trade;
  const dragSymbol = normalizeTradeChartSymbol(
    state.symbol || trade?.symbol || currentChartSymbol
  );
  const tradeId = getTradeChartIdentity(trade, dragSymbol);

  if (!state.pending || !levels || !trade || !state.changedLevel) {
    closeTradeLevelConfirmation({ restore: false, reset: true });
    return;
  }

  const price = Number(levels[
    state.changedLevel === "sl" ? "current_sl" : state.changedLevel
  ]);
  const validationError = validateDraggedTradeLevel(
    trade,
    levels,
    state.changedLevel,
    price
  );
  if (validationError) {
    if (errorBox) {
      errorBox.textContent = validationError;
      errorBox.classList.remove("hidden");
    }
    return;
  }

  applyButton.disabled = true;
  applyButton.textContent = "APPLYING…";
  errorBox?.classList.add("hidden");
  const confirmationDelay = window.setTimeout(() => {
    if (!errorBox) return;
    errorBox.textContent = "Waiting for cTrader confirmation…";
    errorBox.style.color = "#93c5fd";
    errorBox.classList.remove("hidden");
  }, 2500);

  let confirmedOrder = null;

  try {
    const response = await fetch(`${BASE_URL}/modify-live-position-levels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...newsModeAuthHeaders(),
      },
      timeoutMs: 45000,
      suppressErrorPanel: true,
      body: JSON.stringify({
        symbol: dragSymbol,
        position_id: trade.position_id || trade.broker_position_id,
        changed_level: state.changedLevel,
        stop_loss: levels.current_sl,
        tp1: levels.tp1,
        tp2: levels.tp2,
      }),
    });
    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.reason || "The broker rejected this change");
    }

    confirmedOrder = {
      ...trade,
      ...(result.active_order || {}),
    };
    activeLiveOrders[dragSymbol] = confirmedOrder;
    lastKnownTradeLevels[`${dragSymbol}:${tradeId}`] = {
      entry: levels.entry,
      current_sl: levels.current_sl,
      tp1: levels.tp1,
      tp2: levels.tp2,
    };
    console.log("backendUpdate", "success", dragSymbol, tradeId, state.changedLevel);
  } catch (error) {
    confirmedOrder = await verifyTradeLevelBrokerReadback(
      dragSymbol,
      trade.position_id || trade.broker_position_id,
      state.changedLevel,
      price
    );
    if (confirmedOrder) {
      activeLiveOrders[dragSymbol] = { ...trade, ...confirmedOrder };
      console.log("backendUpdate", "confirmed_by_readback", dragSymbol, tradeId, state.changedLevel);
    } else {
      console.error("backendUpdate", "fail", dragSymbol, tradeId, state.changedLevel, error.message);
      if (errorBox) {
        errorBox.style.removeProperty("color");
        errorBox.textContent = error.message;
        errorBox.classList.remove("hidden");
      }
    }
  } finally {
    window.clearTimeout(confirmationDelay);
    if (confirmedOrder) {
      applyButton.textContent = "APPLIED ✓";
      if (errorBox) {
        errorBox.textContent = "Confirmed by cTrader";
        errorBox.style.color = "#22c55e";
        errorBox.classList.remove("hidden");
      }
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      closeTradeLevelConfirmation({ restore: false, reset: true });
      drawTradeVisualLevels();
      applyButton.disabled = false;
      applyButton.textContent = "YES";
    } else {
      applyButton.disabled = false;
      applyButton.textContent = "YES";
    }
    errorBox?.style.removeProperty("color");
  }
}

function beginTradeLevelDrag(event, lineElement, trade, levels, levelKey) {
  if (!isAdminAccount()) return;
  if (lineElement.classList.contains("is-locked")) return;

  event.preventDefault();
  lineElement.setPointerCapture?.(event.pointerId);
  lineElement.classList.add("is-dragging");
  chartLevelDragState = {
    active: true,
    pending: false,
    changedLevel: levelKey,
    proposedLevels: { ...levels },
    originalLevels: { ...levels },
    trade,
    symbol: normalizeTradeChartSymbol(currentChartSymbol),
  };

  const move = (moveEvent) => {
    const layer = document.getElementById("tradeLevelDragLayer");
    if (!layer || !candleSeries) return;

    const rect = layer.getBoundingClientRect();
    const y = Math.max(1, Math.min(rect.height - 1, moveEvent.clientY - rect.top));
    const rawPrice = candleSeries.coordinateToPrice(y);
    if (!Number.isFinite(rawPrice)) return;

    const price = roundTradeLevelPrice(rawPrice);
    const error = validateDraggedTradeLevel(
      trade,
      chartLevelDragState.proposedLevels,
      levelKey,
      price
    );
    const valueKey = levelKey === "sl" ? "current_sl" : levelKey;

    chartLevelDragState.proposedLevels[valueKey] = price;
    lineElement.dataset.price = String(price);
    positionTradeLevelDragLine(lineElement, price);
    updateTradeLevelPreview(
      trade,
      chartLevelDragState.proposedLevels,
      levelKey,
      price,
      error
    );
    lineElement.dataset.invalid = error ? "true" : "false";
  };

  const end = () => {
    lineElement.classList.remove("is-dragging");
    lineElement.removeEventListener("pointermove", move);
    lineElement.removeEventListener("pointerup", end);
    lineElement.removeEventListener("pointercancel", end);
    chartLevelDragState.active = false;
    const valueKey = levelKey === "sl" ? "current_sl" : levelKey;
    console.log(
      "dragEnd",
      chartLevelDragState.symbol,
      getTradeChartIdentity(trade, chartLevelDragState.symbol),
      levelKey.toUpperCase(),
      chartLevelDragState.originalLevels?.[valueKey],
      chartLevelDragState.proposedLevels?.[valueKey]
    );

    if (lineElement.dataset.invalid === "true") {
      chartLevelDragState.pending = false;
      hideTradeLevelPreview();
      drawTradeVisualLevels();
      return;
    }

    chartLevelDragState.pending = true;
    openTradeLevelConfirmation();
  };

  lineElement.addEventListener("pointermove", move);
  lineElement.addEventListener("pointerup", end);
  lineElement.addEventListener("pointercancel", end);
}

function renderDraggableTradeLevels(trade, levels) {
  const layer = document.getElementById("tradeLevelDragLayer");
  if (!layer || !candleSeries) return;

  layer.replaceChildren();

  if (!isAdminAccount()) return;

  const symbol = normalizeTradeChartSymbol(currentChartSymbol);
  const tradeId = getTradeChartIdentity(trade, symbol);
  const lineDefinitions = [
    { key: "entry", value: levels.entry, title: "Entry", color: "#f8fafc", locked: true },
    { key: "sl", value: levels.current_sl, title: "Broker SL", color: "#ef4444" },
    { key: "tp1", value: levels.tp1, title: "TP1", color: "#facc15" },
    { key: "tp2", value: levels.tp2, title: "Broker TP", color: "#22c55e" },
  ];

  lineDefinitions.forEach((definition) => {
    if (!Number.isFinite(Number(definition.value))) return;

    const line = document.createElement("div");
    line.className = `trade-level-drag-line${definition.locked ? " is-locked" : ""}`;
    line.dataset.level = definition.key;
    line.dataset.lineId = getTradeLineId(symbol, tradeId, definition.key);
    line.dataset.symbol = symbol;
    line.dataset.tradeId = tradeId;
    line.dataset.price = String(definition.value);
    line.dataset.title = definition.title;
    line.style.setProperty("--level-color", definition.color);
    line.innerHTML = `
      <span class="trade-level-handle"></span>
      <span class="trade-level-handle"></span>
      <span class="trade-level-label"></span>
    `;
    layer.appendChild(line);
    positionTradeLevelDragLine(line, definition.value);

    if (!definition.locked) {
      line.addEventListener("pointerdown", (event) => {
        beginTradeLevelDrag(event, line, trade, levels, definition.key);
      });
    }
  });
}

document.getElementById("cancelTradeLevelChangeBtn")?.addEventListener("click", () => {
  closeTradeLevelConfirmation({ restore: true, reset: true });
});

document.getElementById("applyTradeLevelChangeBtn")?.addEventListener(
  "click",
  applyDraggedTradeLevelChange
);

document.getElementById("tradeLevelConfirmModal")?.addEventListener("click", (event) => {
  if (event.target.id === "tradeLevelConfirmModal") {
    closeTradeLevelConfirmation({ restore: true, reset: true });
  }
});

function getTradeChartLevels(trade, symbol = currentChartSymbol) {
  const raw = trade?.raw && typeof trade.raw === "object" ? trade.raw : {};
  const nestedRaw = raw?.raw && typeof raw.raw === "object" ? raw.raw : {};
  const tradeSymbol = normalizeTradeChartSymbol(symbol);
  const signalPlan = latestRawPanelData?.[tradeSymbol] || {};
  const liveBrokerTrade = isLiveBrokerTrade(trade);
  const tradeId = getTradeChartIdentity(trade, tradeSymbol);
  const rememberedLevels = lastKnownTradeLevels[`${tradeSymbol}:${tradeId}`] || {};
  const brokerStopLossMissing = Boolean(trade?.broker_stop_loss_missing);
  const brokerStopLossConfirmed = Boolean(trade?.broker_stop_loss_confirmed);
  const brokerStopLoss = brokerStopLossConfirmed
    ? (
      trade?.sl ??
      trade?.current_sl ??
      trade?.stop_loss ??
      trade?.stopLoss ??
      raw?.stopLoss ??
      nestedRaw?.stopLoss
    )
    : null;
  const brokerTakeProfitMissing = Boolean(trade?.broker_take_profit_missing);
  const brokerTakeProfitConfirmed = Boolean(trade?.broker_take_profit_confirmed);
  const brokerTakeProfit = brokerTakeProfitConfirmed
    ? (
      trade?.tp2 ??
      trade?.take_profit_2 ??
      trade?.tp2_price ??
      trade?.take_profit ??
      trade?.takeProfit ??
      raw?.tp2 ??
      raw?.takeProfit ??
      nestedRaw?.tp2 ??
      nestedRaw?.takeProfit
    )
    : null;
  const plannedStopLoss =
    trade?.planned_sl ??
    trade?.original_sl ??
    trade?.initial_sl ??
    signalPlan?.stop_loss;
  const plannedTp1 =
    trade?.planned_tp1 ??
    trade?.take_profit_1 ??
    signalPlan?.tp1;
  const plannedTp2 =
    trade?.planned_tp2 ??
    signalPlan?.tp2;

  return {
    entry:
      trade?.entry ??
      trade?.entry_price ??
      raw?.entry ??
      nestedRaw?.price ??
      signalPlan?.entry_price,
    original_sl:
      trade?.original_sl ??
      trade?.initial_sl ??
      plannedStopLoss,
    planned_sl: plannedStopLoss,
    current_sl: brokerStopLoss,
    broker_stop_loss_confirmed:
      brokerStopLossConfirmed ||
      (!liveBrokerTrade && brokerStopLoss != null),
    broker_stop_loss_missing:
      brokerStopLossMissing || (liveBrokerTrade && !brokerStopLossConfirmed),
    tp1:
      trade?.tp1 ??
      trade?.take_profit_1 ??
      raw?.tp1 ??
      nestedRaw?.tp1 ??
      rememberedLevels.tp1 ??
      plannedTp1,
    tp2: brokerTakeProfit,
    planned_tp1: plannedTp1,
    planned_tp2: plannedTp2,
    broker_take_profit_confirmed:
      brokerTakeProfitConfirmed ||
      (!liveBrokerTrade && brokerTakeProfit != null),
    broker_take_profit_missing:
      brokerTakeProfitMissing || (liveBrokerTrade && !brokerTakeProfitConfirmed),
  };
}

function hasCompleteTradeChartLevels(levels) {
  return ["entry"].every((key) => {
    const value = Number(levels?.[key]);
    return Number.isFinite(value);
  });
}

function drawTradeVisualLevels() {
  if (chartLevelDragState.active || chartLevelDragState.pending) return;

  const dashboardPrefs = loadLocalObject(DASHBOARD_PREFS_KEY, DEFAULT_DASHBOARD_PREFS);
  if (dashboardPrefs.showTradeLevels === false) {
    clearTradeLines("EURUSD");
    clearTradeLines("XAUUSD");
    clearTradeLevelDragLayer({ force: true });
    return;
  }

  clearTradeVisualLevels();
  clearInactiveTradeVisualLines();
  clearTradeLevelDragLayer();
  hideChartAttributionMark();

  if (!chart || !candleSeries) return;

  if (!isAdminAccount()) {
    clearTradeLines("EURUSD");
    clearTradeLines("XAUUSD");
    return;
  }

  if (getDisplayedOpenTradeCount() === 0) {
    clearTradeLines("EURUSD");
    clearTradeLines("XAUUSD");
    return;
  }

  const trade = getActiveTradeForChartSymbol(currentChartSymbol);
  const symbol = normalizeTradeChartSymbol(currentChartSymbol);
  const hasActiveTrade = Boolean(trade);

  if (!hasActiveTrade) {
    clearTradeLevelDragLayer();
    return;
  }

  const chartLevels = getTradeChartLevels(trade, symbol);
  if (!hasCompleteTradeChartLevels(chartLevels)) {
    console.warn("TRADE_VISUAL_LEVELS_SKIPPED_INCOMPLETE =", {
      symbol,
      levels: chartLevels,
    });
    return;
  }

  const levels = {
    symbol,
    ...chartLevels,
    hit_tp1: Boolean(trade?.hit_tp1),
    profit_protected: hasConfirmedProfitProtection(trade),
    protected_sl_price: trade?.protected_sl_price,
  };
  const tradeId = getTradeChartIdentity(trade, symbol);
  const rememberedKey = `${symbol}:${tradeId}`;
  const previousRemembered = lastKnownTradeLevels[rememberedKey] || {};
  const nextRemembered = {
    entry: Number.isFinite(Number(levels.entry))
      ? Number(levels.entry)
      : previousRemembered.entry,
    current_sl: Number.isFinite(Number(levels.current_sl))
      ? Number(levels.current_sl)
      : previousRemembered.current_sl,
    tp1: Number.isFinite(Number(levels.tp1))
      ? Number(levels.tp1)
      : previousRemembered.tp1,
    tp2: Number.isFinite(Number(levels.tp2))
      ? Number(levels.tp2)
      : previousRemembered.tp2,
  };
  lastKnownTradeLevels[rememberedKey] = nextRemembered;

  console.log("TRADE_VISUAL_LEVELS =", levels);

  addTradeVisualLine(levels.entry, "Entry", "#f8fafc", {
    lineStyle: LightweightCharts.LineStyle.Solid,
    symbol,
    tradeId,
    lineType: "ENTRY",
  });

  if (levels.hit_tp1 && levels.profit_protected) {
    addTradeVisualLine(
      levels.protected_sl_price ?? levels.current_sl,
      "Protected SL",
      "#facc15",
      {
        lineStyle: LightweightCharts.LineStyle.Solid,
        lineWidth: 3,
        symbol,
        tradeId,
        lineType: "SL",
      }
    );
  } else if (levels.broker_stop_loss_confirmed) {
    addTradeVisualLine(levels.current_sl, "Broker SL", "#ef4444", {
      lineStyle: LightweightCharts.LineStyle.Solid,
      symbol,
      tradeId,
      lineType: "SL",
    });
  } else {
    addTradeVisualLine(levels.planned_sl ?? levels.original_sl, "BROKER SL MISSING", "#ff3b30", {
      lineStyle: LightweightCharts.LineStyle.Dotted,
      lineWidth: 3,
      symbol,
      tradeId,
      lineType: "SL",
    });
  }

  if (levels.broker_take_profit_confirmed) {
    addTradeVisualLine(levels.tp1, "TP1", "#facc15", {
      lineStyle: levels.hit_tp1
        ? LightweightCharts.LineStyle.Solid
        : LightweightCharts.LineStyle.Dashed,
      lineWidth: levels.hit_tp1 ? 3 : 2,
      symbol,
      tradeId,
      lineType: "TP1",
    });

    addTradeVisualLine(levels.tp2, "Broker TP", "#22c55e", {
      lineStyle: LightweightCharts.LineStyle.Solid,
      symbol,
      tradeId,
      lineType: "TP2",
    });
  } else {
    addTradeVisualLine(levels.planned_tp1, "Planned TP1 inactive", "rgba(250, 204, 21, 0.55)", {
      lineStyle: LightweightCharts.LineStyle.Dotted,
      lineWidth: 1,
      symbol,
      tradeId,
      lineType: "TP1",
    });
    addTradeVisualLine(levels.planned_tp2, "Planned TP2 inactive", "rgba(34, 197, 94, 0.55)", {
      lineStyle: LightweightCharts.LineStyle.Dotted,
      lineWidth: 1,
      symbol,
      tradeId,
      lineType: "TP2",
    });
  }

  renderDraggableTradeLevels(trade, levels);
  ensureTradeLevelsVisible(levels);
}

function ensureTradeLevelsVisible(levels) {
  if (!chart || !candleSeries) return;

  const prices = [levels?.entry, levels?.current_sl, levels?.tp1, levels?.tp2]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .filter(Number.isFinite);
  if (!prices.length) return;

  window.requestAnimationFrame(() => {
    const container = document.getElementById("chartContainer");
    const height = Number(container?.clientHeight || 0);
    if (!height) return;

    const margin = 18;
    const hasHiddenLevel = prices.some((price) => {
      const coordinate = candleSeries.priceToCoordinate(price);
      return !Number.isFinite(coordinate)
        || coordinate < margin
        || coordinate > height - margin;
    });
    if (!hasHiddenLevel) return;

    try {
      chart.priceScale("right").applyOptions({ autoScale: true });
      scheduleTradeLevelReposition();
    } catch (error) {
      console.warn("Trade level auto-fit unavailable");
    }
  });
}

function drawStructureLine(data) {
  if (!chart || !data) return;

  const type = String(data.structure_type || "").toUpperCase();
  const resistance = Number(data.structure_resistance);
  const support = Number(data.structure_support);

  if (structureLineSeries) {
    chart.removeSeries(structureLineSeries);
    structureLineSeries = null;
  }

  const candles =
    latestRawPanelData?.candles?.[currentChartSymbol]?.[currentChartTimeframe] || [];

  if (!candles.length) return;

  const firstTime = candles[Math.max(0, candles.length - 80)].time;
  const lastTime = candles[candles.length - 1].time;

  let level = null;

  if (type.includes("BUY")) {
    level = resistance;
  }

  if (type.includes("SELL")) {
    level = support;
  }

  if (!level || Number.isNaN(level)) return;

  structureLineSeries = chart.addLineSeries({
    color: type.includes("SELL") ? "#ef4444" : "#22c55e",
    lineWidth: 2,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  structureLineSeries.setData([
    { time: firstTime, value: level },
    { time: lastTime, value: level },
  ]);
}
async function loadChartData(symbol = currentChartSymbol, timeframe = currentChartTimeframe) {
  currentChartSymbol = symbol;
  currentChartTimeframe = timeframe;
  currentChartSymbol = symbol;

  if (!chart || !candleSeries) {
    initChart();
  }

  if (!chart || !candleSeries) {
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "GET",
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const rawData = await res.json();

    if (!rawData) {
      throw new Error("Panel data returned null");
    }
    const panelPlan = rawData?.[symbol] || {};
    const candles = getLiveAugmentedCandles(
      getChartCandles(rawData, symbol, currentChartTimeframe),
      symbol,
      currentChartTimeframe,
      panelPlan.price || panelPlan.current_price || panelPlan.entry_price
    );
    if (!candles.length) {
      console.warn(`No candle data for ${symbol}`);
      return;
    }

    candleSeries.setData(candles);
    refreshNewsImpact(symbol);
  } catch (err) {
    console.error("Real chart data error:", err);
  }
}

function renderChartFromPanel(rawData, symbol = currentChartSymbol, timeframe = currentChartTimeframe) {
  currentChartSymbol = symbol;
  currentChartTimeframe = timeframe;
  refreshNewsImpact(symbol);
  
  if (!chart || !candleSeries) {
    initChart();
  }

  if (!chart || !candleSeries) return;

    const panelPlan = rawData?.[symbol] || {};
    let candles = getLiveAugmentedCandles(
      getChartCandles(rawData, symbol, timeframe),
      symbol,
      timeframe,
      panelPlan.price || panelPlan.current_price || panelPlan.entry_price
    );
    candles = preserveFormingCandleShape(
      candles,
      lastChartData[symbol]?.[timeframe],
      timeframe
    );
    if (!candles.length) {
      updateChartOverlay(symbol, timeframe, []);
      return;
    }

    const key = `${symbol}_${timeframe}`;

    // 🧊 FREEZE LOGIC
    if (MARKET_IS_CLOSED) {
      if (!frozenChart[key]) {
        frozenChart[key] = candles.map(c => ({ ...c }));
        console.log("🧊 Chart snapshot saved");
      }

      candles = frozenChart[key];
    } else {
      frozenChart[key] = null;
    }
  const alreadyHasChart =
  lastChartData?.[symbol]?.[timeframe]?.length > 0;

if (MARKET_IS_CLOSED && alreadyHasChart) {
  console.log("🧊 HARD FREEZE (chart already loaded)");
  drawTradeVisualLevels();
  return;
}

  updateChartOverlay(symbol, timeframe, candles);

  const previous = lastChartData[symbol]?.[timeframe] || [];

  // 🟢 FIRST LOAD → FULL SET
  if (!previous.length) {
  candleSeries.setData(candles);
  lastChartData[symbol][timeframe] = [...candles];
  drawTradeVisualLevels();
  return;
}

  const lastNew = candles[candles.length - 1];
  const lastOld = previous[previous.length - 1];

  if (MARKET_IS_CLOSED) {
    candleSeries.setData(candles);
    lastChartData[symbol][timeframe] = [...candles];
    chart.timeScale().scrollToPosition(0, false);
    console.log("🧊 Chart locked");
    drawTradeVisualLevels();
    return;
  }

  if (lastNew.time === lastOld.time) {
    candleSeries.update(lastNew);
  } else {
    candleSeries.update(lastNew);
  }

  lastChartData[symbol][timeframe] = [...candles];
  drawTradeVisualLevels();
}

function applyIdleMotionToLastCandle(symbol = currentChartSymbol, timeframe = currentChartTimeframe) {
  if (!_CHART_IDLE_ENABLED || MARKET_IS_CLOSED) return;
  if (!chart || !candleSeries) return;

  const candles = lastChartData[symbol]?.[timeframe] || [];
  if (!candles.length) return;

  const last = candles[candles.length - 1];
  if (!last) return;
  const livePrice = getLiveTickMid(symbol);
  if (!livePrice) return;

  const timeframeSeconds = {
    "5m": 5 * 60,
    "15m": 15 * 60,
    "1h": 60 * 60
  }[timeframe];
  if (!timeframeSeconds) return;

  const currentBucket = Math.floor(Date.now() / 1000 / timeframeSeconds)
    * timeframeSeconds;
  let visualLast;

  if (Number(last.time) < currentBucket) {
    visualLast = {
      time: currentBucket,
      open: Number(last.close),
      high: Math.max(Number(last.close), livePrice),
      low: Math.min(Number(last.close), livePrice),
      close: livePrice
    };
    candles.push(visualLast);
  } else {
    visualLast = {
      ...last,
      close: livePrice,
      high: Math.max(Number(last.high), livePrice),
      low: Math.min(Number(last.low), livePrice)
    };
    candles[candles.length - 1] = visualLast;
  }

  try {
    candleSeries.update(visualLast);
  } catch (err) {
    console.warn("Idle candle update skipped");
  }
}

function refreshIdleChartMotion() {
  _CHART_IDLE_PHASE += 1;
  applyIdleMotionToLastCandle(currentChartSymbol, currentChartTimeframe);
}
function forceChartRenderFromLatest(symbol = currentChartSymbol, timeframe = currentChartTimeframe) {
  if (!latestRawPanelData) return;

 const candles = getLiveAugmentedCandles(
   getChartCandles(latestRawPanelData, symbol, timeframe),
   symbol,
   timeframe,
   latestRawPanelData?.[symbol]?.price
     || latestRawPanelData?.[symbol]?.current_price
     || latestRawPanelData?.[symbol]?.entry_price
 ).slice(-getMonthlyChartCandleLimit(timeframe));
  if (!candles.length) {
    console.warn(`No candles available for ${symbol}`);
    return;
  }

 updateChartOverlay(symbol, timeframe, candles);

  if (!chart || !candleSeries) {
    initChart();
  }

  if (!chart || !candleSeries) return;

 lastChartData[symbol][timeframe] = [];
  candleSeries.setData(candles);
  drawTradeVisualLevels();
}

async function quickRefreshChart() {
  if (chartRefreshInProgress) return;

  chartRefreshInProgress = true;

  try {
    await loadChartData(currentChartSymbol);
  } catch (err) {
    console.error("Quick chart refresh error:", err);
  } finally {
    chartRefreshInProgress = false;
  }
}
function switchChart(symbol, timeframe = currentChartTimeframe) {
  const previousSymbol = currentChartSymbol;
  closeTradeLevelConfirmation({ restore: false, reset: true });
  clearTradeLines(previousSymbol);
  document.getElementById("tradeLevelDragLayer")?.replaceChildren();
  currentChartSymbol = normalizeTradeChartSymbol(symbol);
  currentChartTimeframe = timeframe;
  const fundamentalSymbolChanged = previousSymbol !== currentChartSymbol;
  refreshNewsImpact(currentChartSymbol, {
    force: fundamentalSymbolChanged,
    symbolSwitch: fundamentalSymbolChanged,
  });
  fetchV2Shadow(currentChartSymbol);

  initChart(); // 🔥 FORCE NEW PRECISION
  void ensureTwoMonthChartHistory(currentChartSymbol, currentChartTimeframe);

  try {
    const hasCandles = latestRawPanelData?.candles?.[currentChartSymbol]?.[timeframe]?.length;

    if (hasCandles) {
      forceChartRenderFromLatest(currentChartSymbol, timeframe);
      updateMainPanel(currentChartSymbol);
      renderMobileOpenTradeCard();
      console.log(`📈 Chart updated: ${currentChartSymbol} ${timeframe} at ${new Date().toLocaleTimeString()}`);
    } else {
      applyLanguage(currentLang);
      refreshPanel();
    }
  } catch (err) {
    console.error("Switch chart error:", err);
  }
}

window.switchChart = switchChart;


// ==============================
// TIMEFRAME SWITCH
// ==============================

function switchTimeframe(timeframe) {
  closeTradeLevelConfirmation({ restore: false, reset: true });
  currentChartTimeframe = timeframe;
  void ensureTwoMonthChartHistory(currentChartSymbol, currentChartTimeframe);

  try {
    const hasCandles = latestRawPanelData?.candles?.[currentChartSymbol]?.[timeframe]?.length;

    if (hasCandles) {
      forceChartRenderFromLatest(currentChartSymbol, timeframe);
      updateMainPanel(currentChartSymbol);
      renderMobileOpenTradeCard();

      console.log(`⏱️ Timeframe switched: ${currentChartSymbol} ${timeframe}`);
    } else {
      refreshPanel();
    }
  } catch (err) {
    console.error("Switch timeframe error:", err);
  }
}

window.switchTimeframe = switchTimeframe;

document.querySelectorAll(".chart-symbol-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    const symbol = button.textContent.trim().toUpperCase() === "GOLD"
      ? "XAUUSD"
      : "EURUSD";
    window.setTimeout(() => {
      showChartExplanation(symbol, currentChartTimeframe);
    }, 0);
  });
});

document.querySelectorAll(".chart-timeframes button").forEach((button) => {
  button.addEventListener("click", () => {
    const timeframe = button.textContent.trim();
    window.setTimeout(() => {
      showChartExplanation(currentChartSymbol, timeframe);
    }, 0);
  });
});

let mainAppBootStarted = false;

function bootMainApp() {
  if (mainAppBootStarted) return;
  mainAppBootStarted = true;
  window.FlowSignalStartup?.record("authenticated_application_boot_started");

  const shellInitializers = [
    ["trade_confirmation_reset", () => closeTradeLevelConfirmation({ restore: false, reset: true })],
    ["attached_panel_geometry", syncAttachedPanelGeometry],
    ["utc_clock", updateUTC],
    ["pnl_visibility", updatePnlVisibility],
    ["role_visibility", applyRoleVisibility],
    ["chart_shell", initChart],
    ["language", () => applyLanguage(currentLang)],
  ];
  shellInitializers.forEach(([name, initialize]) => {
    try {
      initialize();
    } catch (error) {
      window.FlowSignalStartup?.record("shell_initializer_failed", {
        initializer: name,
        message: error.message,
      });
    }
  });
  window.FlowSignalStartup?.setTransportStatus("loading", "Loading latest signal");

  let visitorId = localStorage.getItem("flowsignal_visitor_id");

fetch(`${BASE_URL}/track-visit`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        visitor_id: visitorId
    })
})
.then(res => res.json())
.then(data => {
    console.log("Visit tracked:", data);

    if (data.visitor_id) {
        localStorage.setItem(
            "flowsignal_visitor_id",
            data.visitor_id
        );
    }
})
.catch(err => console.log(err));

  try {
    updateTradeButtonsLock();
  } catch (error) {
    window.FlowSignalStartup?.record("shell_initializer_failed", {
      initializer: "trade_button_lock",
      message: error.message,
    });
  }

  const startupRequests = {
    signals: refreshPanel(),
    v2Shadow: fetchV2Shadow(currentChartSymbol),
    newsMode: loadNewsTradingMode(),
    broker: fetchCtraderStatus(),
    autoTrade: fetchAutoTradeStatus(),
    marketData: fetchMarketDataSourceStatus(),
  };
  Promise.allSettled(Object.values(startupRequests)).then((results) => {
    const names = Object.keys(startupRequests);
    const summary = {};
    results.forEach((result, index) => {
      summary[names[index]] = result.status === "fulfilled"
        ? (result.value === false ? "failed" : "loaded")
        : "failed";
    });
    window.FlowSignalStartup?.record("application_initialization_completed", summary);
  });
}

window.bootMainApp = bootMainApp;
document.addEventListener("flowsignal:authenticated", () => {
  bootMainApp();
});

function syncAttachedPanelGeometry() {
  const topHeader = document.querySelector(".top-header");
  const liveBadgeRow = document.querySelector(".topbar");

  if (!topHeader || !mainApp) return;

  const headerRect = topHeader.getBoundingClientRect();
  const liveBadgeRect = liveBadgeRow?.getBoundingClientRect();
  const headerHeight = Math.max(
    headerRect.bottom,
    liveBadgeRect?.top ?? headerRect.bottom
  );
  const panelTop = Math.max(0, Math.round(headerHeight));

  document.documentElement.style.setProperty(
    "--app-sidebar-top",
    `${panelTop}px`
  );
  document.documentElement.style.setProperty(
    "--app-panel-height",
    `calc(100dvh - ${panelTop}px)`
  );
}

window.addEventListener("resize", syncAttachedPanelGeometry);
window.addEventListener("beforeunload", () => {
  closeTradeLevelConfirmation({ restore: false, reset: true });
});
window.addEventListener("pagehide", () => {
  closeTradeLevelConfirmation({ restore: false, reset: true });
});

// ==============================
// LOGOUT BUTTON
// ==============================
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("flowsignal_access");
    localStorage.removeItem("flowsignal_role");
    localStorage.removeItem("flowsignal_admin");
    localStorage.removeItem(SESSION_TOKEN_KEY);
    location.reload();
  });
}

const goldTitle = document.getElementById("gold-title");
if (goldTitle) {
  goldTitle.textContent = "XAUUSD";
}

// ==============================
// STARTUP
// ==============================
let access = null;

try {
  access = JSON.parse(localStorage.getItem("flowsignal_access") || "null");
} catch (e) {
  access = null;
}

const role = localStorage.getItem("flowsignal_role");
updatePnlVisibility();
applyRoleVisibility();
applyDashboardPreferences();
hydrateRiskSettings();
initializeSignalAlertSettings();

window.addEventListener("resize", applyRoleVisibility);
window.addEventListener("resize", forcePhonePerformanceRow);
window.addEventListener("orientationchange", applyRoleVisibility);
window.addEventListener("orientationchange", forcePhonePerformanceRow);

if (isForexWeekendClosed()) {
  setConnectionBadge(
    "closed",
    "Forex market closed from Friday 5:00 PM until Sunday 5:00 PM New York time"
  );
}

if (access?.granted || role === "user" || role === "admin") {
  window.FlowSignalStartup?.record("authentication_restored", { role: role || "user" });
  if (landingPage) {
    landingPage.classList.add("hidden");
    landingPage.style.display = "none";
  }

  if (mainApp) {
    mainApp.classList.remove("hidden");
    mainApp.classList.remove("locked");
    mainApp.style.display = "flex";
  }

  setTimeout(() => {
if (localStorage.getItem("flowsignal_role") === "admin") {
  if (menuStatsBtn) menuStatsBtn.classList.remove("hidden");
  if (menuPaperBtn) menuPaperBtn.classList.remove("hidden");
}
applyRoleVisibility();
updatePnlVisibility();

    bootMainApp();
  }, 120);
}
else {
  window.FlowSignalStartup?.record("authentication_restore_failed", {
    reason: "No valid local FlowSignal session",
  });
}
window.FlowSignalStartup?.record("polling_started", {
  panelIntervalMs: 15000,
  fundamentalIntervalMs: FUNDAMENTAL_INSIGHT_CACHE_MS,
  transport: "rest_polling",
});
setInterval(() => {
  if (!dashboardRuntimeActive()) return;
  console.log("🔄 Auto refresh running...");
  refreshPanel();
}, 15000);

setInterval(() => {
  pollFundamentalInsightIfActive();
}, FUNDAMENTAL_INSIGHT_CACHE_MS);

setInterval(() => {
  if (!dashboardRuntimeActive()) return;
  fetchV2Shadow(currentChartSymbol, { loading: false });
}, 60000);

setInterval(() => {
  if (!dashboardRuntimeActive()) return;
  updateNewsTradingWindow();
  updateUpcomingHighImpactCountdowns();
  updateFundamentalEventCountdown();
}, 1000);

setInterval(() => {
  if (!dashboardRuntimeActive()) return;
  refreshConnectionBadgeFreshness();
}, 5000);

_BAR_IDLE_TIMER = setInterval(() => {
  if (!dashboardRuntimeActive()) return;
  _BAR_IDLE_PHASE += 1;

  if (!_BAR_ANIMATING) {
    _BAR_ANIMATING = true;
    requestAnimationFrame(animateBars);
  }

  if (_CHART_IDLE_ENABLED && !MARKET_IS_CLOSED) {
  refreshIdleChartMotion();
}
}, 5000);
const feedbackModal = document.getElementById("feedbackModal");
const feedbackType = document.getElementById("feedbackType");
const feedbackInput = document.getElementById("feedbackInput");
const feedbackCancelBtn = document.getElementById("feedbackCancelBtn");
const feedbackSendBtn = document.getElementById("feedbackSendBtn");
const feedbackSuccessMsg = document.getElementById("feedbackSuccessMsg");
const feedbackToast = document.getElementById("feedbackToast");

function openFeedbackModal() {
  if (!feedbackModal) return;
  feedbackModal.classList.remove("hidden");

  if (feedbackInput) {
    feedbackInput.value = "";
    setTimeout(() => feedbackInput.focus(), 50);
  }

  if (feedbackSuccessMsg) {
    feedbackSuccessMsg.classList.add("hidden");
  }
}

function closeFeedbackModal() {
  if (!feedbackModal) return;
  feedbackModal.classList.add("hidden");
}

function showFeedbackToast() {
  if (!feedbackToast) return;

  feedbackToast.classList.remove("hidden");
  feedbackToast.classList.add("show");

  setTimeout(() => {
    feedbackToast.classList.add("hidden");
  }, 2600);
}

if (feedbackCancelBtn) {
  feedbackCancelBtn.addEventListener("click", closeFeedbackModal);
}

if (feedbackSendBtn) {
  feedbackSendBtn.addEventListener("click", async () => {
    const message = feedbackInput ? feedbackInput.value.trim() : "";

    if (!message) {
      alert("Write something first.");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `${feedbackType?.value || "Feedback"}: ${message}`,
          user: "anonymous",
          time: new Date().toISOString()
        })
      });

      const result = await res.json();

      if (result.status === "sent" || result.status === "ok") {
        closeFeedbackModal();
        if (feedbackInput) feedbackInput.value = "";
        if (feedbackSuccessMsg) feedbackSuccessMsg.classList.add("hidden");
        showFeedbackToast();
      } else {
        alert(`Feedback failed ❌\n${result.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Feedback request error:", err);
      alert("Error sending feedback ❌");
    }
  });
}

if (feedbackModal) {
  feedbackModal.addEventListener("click", (e) => {
    if (e.target === feedbackModal) {
      closeFeedbackModal();
    }
  });
}

function setMainMenuOpen(open, options = {}) {
  if (!sideMenu) return;
  menuOpen = Boolean(open);

  if (!menuOpen && options.closeAttachedPage !== false) {
    closeAttachedMenuPage();
  }

  if (window.FlowSignalStartup?.setMenuOpen) {
    window.FlowSignalStartup.setMenuOpen(menuOpen);
  } else {
    sideMenu.classList.toggle("hidden", !menuOpen);
    sideMenu.classList.toggle("is-open", menuOpen);
    sideMenu.setAttribute("aria-hidden", menuOpen ? "false" : "true");
    mainApp?.classList.toggle("menu-drawer-open", menuOpen);
    document.body.classList.toggle("menu-drawer-open", menuOpen);
  }
}

document.addEventListener("flowsignal:menu-state", (event) => {
  menuOpen = Boolean(event.detail?.open);
});

if (
  menuToggleBtn &&
  sideMenu &&
  menuToggleBtn.dataset.flowSignalShellBound !== "true"
) {
  menuToggleBtn.addEventListener("click", () => {
    setMainMenuOpen(!menuOpen);
  });
  menuToggleBtn.dataset.flowSignalShellBound = "true";
}

sideMenu?.addEventListener("click", (event) => {
  if (!window.matchMedia("(max-width: 700px)").matches) return;

  const selectedOption = event.target.closest(".menu-row, .menu-subrow");
  if (!selectedOption || selectedOption === menuSettingsBtn) return;

  window.setTimeout(() => {
    setMainMenuOpen(false, { closeAttachedPage: false });
  }, 0);
});

menuDashboardBtn?.addEventListener("click", () => {
  closeAllOverlays();
  setMainMenuOpen(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function accessStatusLabel(value) {
  return String(value || "PENDING_EMAIL").replaceAll("_", " ").toLowerCase().replace(/^./, (char) => char.toUpperCase());
}

async function loadAccessRequests(resultMessage = "") {
  if (!isAdminAccount() || !accessRequestsBody || !accessRequestsStatus) return;
  if (!resultMessage) accessRequestsStatus.textContent = "Loading account requests…";
  try {
    const response = await fetch(`${BASE_URL}/admin/access/requests`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.detail || "ACCESS_REQUESTS_UNAVAILABLE");
    accessRequestsBody.replaceChildren();
    const requests = Array.isArray(data.requests) ? data.requests : [];
    requests.forEach((request) => {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      const email = document.createElement("td");
      const verified = document.createElement("td");
      const status = document.createElement("td");
      const actions = document.createElement("td");
      name.textContent = request.full_name || "—";
      email.textContent = request.email || "—";
      verified.textContent = request.email_verified ? "Verified" : "Not verified";
      status.textContent = accessStatusLabel(request.approval_status);
      status.className = `access-state-${String(request.approval_status || "pending_email").toLowerCase().replaceAll("_", "-")}`;
      ["APPROVED", "DENIED"].forEach((decision) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.decision = decision;
        button.textContent = decision === "APPROVED" ? "Approve" : "Deny";
        button.disabled = decision === "APPROVED" && !request.email_verified;
        button.addEventListener("click", async () => {
          actions.querySelectorAll("button").forEach((item) => { item.disabled = true; });
          accessRequestsStatus.textContent = `${decision === "APPROVED" ? "Approving" : "Denying"} ${request.full_name}…`;
          try {
            const result = await fetch(`${BASE_URL}/admin/access/requests/${encodeURIComponent(request.id)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ decision }),
            });
            const payload = await result.json().catch(() => ({}));
            if (!result.ok) throw new Error(payload?.detail || "ACCESS_REVIEW_FAILED");
            const actionResultMessage = decision === "APPROVED"
              ? (payload.email_sent ? "Access approved and approval email sent." : `Access approved, but email was not sent (${payload.email_error || "delivery unavailable"}).`)
              : "Access denied. No email was sent.";
            await loadAccessRequests(actionResultMessage);
          } catch (error) {
            accessRequestsStatus.textContent = String(error?.message || "Could not update access.").replaceAll("_", " ");
            actions.querySelectorAll("button").forEach((item) => {
              item.disabled = item.dataset.decision === "APPROVED" && !request.email_verified;
            });
          }
        });
        actions.appendChild(button);
      });
      row.append(name, email, verified, status, actions);
      accessRequestsBody.appendChild(row);
    });
    accessRequestsStatus.textContent = resultMessage || (requests.length ? `${requests.length} account request${requests.length === 1 ? "" : "s"}.` : "No account requests yet.");
  } catch (error) {
    accessRequestsStatus.textContent = String(error?.message || "Could not load account requests.").replaceAll("_", " ");
  }
}

menuAccessRequestsBtn?.addEventListener("click", () => {
  if (!isAdminAccount()) return;
  closeAllOverlays();
  accessRequestsModal?.classList.remove("hidden");
  setMainMenuOpen(false);
  loadAccessRequests();
});
closeAccessRequestsBtn?.addEventListener("click", () => accessRequestsModal?.classList.add("hidden"));
accessRequestsModal?.addEventListener("click", (event) => {
  if (event.target === accessRequestsModal) accessRequestsModal.classList.add("hidden");
});

menuAssistantBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeAllOverlays();
  openAssistantPanel();
});

closeAssistantPanelBtn?.addEventListener("click", closeAssistantPanel);
document.getElementById("assistantCancelBtn")?.addEventListener("click", closeAssistantPanel);

assistantModal?.addEventListener("click", (event) => {
  if (event.target === assistantModal) {
    closeAssistantPanel();
  }
});

if (menuFeedbackBtn) {
  menuFeedbackBtn.addEventListener("click", () => {
    closeAllOverlays();
    setMainMenuOpen(false);
    openFeedbackModal();
  });
}

menuHistoryBtn?.addEventListener("click", () => {
  closeAllOverlays();
  setMainMenuOpen(false);
  document.querySelector(".history-section")?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
});

menuSettingsBtn?.addEventListener("click", () => {
  const expanded = settingsSubmenu?.classList.toggle("hidden") === false;
  menuSettingsBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
});

menuGeneralSettingsBtn?.addEventListener("click", () => openSettingsPage("general"));
menuRiskSettingsBtn?.addEventListener("click", () => {
  if (!isAdminAccount()) {
    openSettingsPage("general");
    return;
  }

  openSettingsPage("risk");
});
menuNotificationsSettingsBtn?.addEventListener("click", () => openSettingsPage("notifications"));
menuStrategySettingsBtn?.addEventListener("click", () => openSettingsPage("strategy"));

document.querySelectorAll("[data-strategy-tab]").forEach((button) => {
  button.addEventListener("click", () => selectStrategySettingsTab(button.dataset.strategyTab));
});

document.querySelectorAll("[data-open-strategy-news]").forEach((button) => {
  button.addEventListener("click", () => selectStrategySettingsTab("news"));
});

document.querySelectorAll("[data-open-risk-management]").forEach((button) => {
  button.addEventListener("click", () => openSettingsPage("risk"));
});

strategySettingInputs().forEach((input) => {
  input.addEventListener("input", () => {
    if (!draftStrategySettings) return;
    draftStrategySettings[input.dataset.strategySetting] = readStrategySettingInput(input);
    syncStrategySettingsPresentation();
    if (strategySettingsDirty()) {
      setStrategySettingsStatus("Unsaved strategy changes.", "dirty");
    }
  });
  input.addEventListener("change", () => input.dispatchEvent(new Event("input")));
});

document.querySelectorAll("[data-strategy-reset]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.strategyReset;
    if (!resetStrategySettingDraft(key)) return;
    if (strategySettingsDirty()) {
      setStrategySettingsStatus("Unsaved strategy changes.", "dirty");
    }
  });
});

strategyDiscardBtn?.addEventListener("click", () => {
  if (!confirmedStrategySettings) return;
  renderStrategySettings(confirmedStrategySettings, strategySettingsLimits);
  setStrategySettingsStatus("Unsaved changes discarded.");
});

strategySaveBtn?.addEventListener("click", persistStrategySettings);

document.querySelectorAll('input[name="newsTradingMode"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (newsModeSaveBtn) {
      newsModeSaveBtn.disabled = (
        newsModeSaveInProgress
        || !confirmedNewsTradingMode
        || selectedNewsMode() === confirmedNewsTradingMode
      );
    }
    setNewsModeStatus(`Selected: ${displayNewsMode(input.value)}`);
  });
});

newsModeSaveBtn?.addEventListener("click", () => {
  const mode = selectedNewsMode();
  if (!mode || mode === confirmedNewsTradingMode) return;
  if (mode === "TRADE_CONFIRMED") {
    newsModeConfirmModal?.classList.remove("hidden");
    return;
  }
  persistNewsTradingMode(mode);
});

newsModeConfirmCancelBtn?.addEventListener("click", () => {
  newsModeConfirmModal?.classList.add("hidden");
  if (confirmedNewsTradingMode) setNewsModeSelection(confirmedNewsTradingMode);
  if (newsModeSaveBtn) newsModeSaveBtn.disabled = true;
  setNewsModeStatus("Confirmed mode was not changed.");
});

newsModeConfirmEnableBtn?.addEventListener("click", () => {
  newsModeConfirmModal?.classList.add("hidden");
  persistNewsTradingMode("TRADE_CONFIRMED");
});

alertsToggle?.addEventListener("change", () => {
  setSignalAlertsEnabled(alertsToggle.checked);
  if (alertsToggle.checked) {
    requestSignalNotificationPermission();
  }
});

signalAlertsToggle?.addEventListener("change", () => {
  setSignalAlertsEnabled(signalAlertsToggle.checked);
  if (signalAlertsToggle.checked) {
    requestSignalNotificationPermission();
  }
});

generalSignalAlertsToggle?.addEventListener("change", () => {
  setSignalAlertsEnabled(generalSignalAlertsToggle.checked);
  if (generalSignalAlertsToggle.checked) {
    requestSignalNotificationPermission();
  }
});

testSignalAlertBtn?.addEventListener("click", async () => {
  setSignalAlertsEnabled(true);
  await requestSignalNotificationPermission();
  playAlert(currentChartSymbol || "XAUUSD", "BUY");
});

closeSettingsModalBtn?.addEventListener("click", () => {
  settingsModal?.classList.add("hidden");
  setMainMenuOpen(false);
});

settingsModal?.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    settingsModal.classList.add("hidden");
    setMainMenuOpen(false);
  }
});

document.querySelectorAll("[data-dashboard-pref]").forEach((input) => {
  input.addEventListener("change", () => {
    const prefs = loadLocalObject(DASHBOARD_PREFS_KEY, DEFAULT_DASHBOARD_PREFS);
    prefs[input.dataset.dashboardPref] = input.checked;
    saveLocalObject(DASHBOARD_PREFS_KEY, prefs);
    applyDashboardPreferences();
    if (input.dataset.dashboardPref === "showTradeLevels" && input.checked) {
      drawTradeVisualLevels();
    }
  });
});

document.querySelectorAll("[data-risk-pref]").forEach((input) => {
  input.addEventListener("change", saveRiskSettingsFromInputs);
  input.addEventListener("input", saveRiskSettingsFromInputs);
});

document.querySelectorAll("[data-risk-adjust]").forEach((button) => {
  button.addEventListener("click", () => {
    const [key, rawDelta] = String(button.dataset.riskAdjust || "").split(":");
    const input = document.querySelector(`[data-risk-pref="${key}"]`);
    const delta = Number(rawDelta);

    if (!input || Number.isNaN(delta)) return;

    const current = Number(input.value || 0);
    const min = input.min === "" ? -Infinity : Number(input.min);
    const max = input.max === "" ? Infinity : Number(input.max);
    const next = Math.min(max, Math.max(min, current + delta));
    input.value = Number.isInteger(delta) ? String(next) : next.toFixed(2);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

document.getElementById("riskResetBtn")?.addEventListener("click", () => {
  saveLocalObject(RISK_PREFS_KEY, DEFAULT_RISK_PREFS);
  hydrateRiskSettings();
});

document.getElementById("riskSaveBtn")?.addEventListener("click", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const settingsBox = settingsModal?.querySelector(".settings-modal-box");
  const savedScrollTop = settingsBox?.scrollTop || 0;

  const prefs = saveRiskSettingsFromInputs();
  const saveButton = document.getElementById("riskSaveBtn");
  if (!saveButton) return;

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  updateRiskSaveStatus(prefs, "Saving");
  console.log("RISK_SAVE_PAYLOAD_DEBUG", prefs);

  try {
    const payload = {
      ...prefs,
      riskPerTradePct: Number(prefs.riskPerTradePct),
      maxDailyLoss: prefs.maxDailyLoss === "" ? null : Number(prefs.maxDailyLoss),
      maxWeeklyLoss: prefs.maxWeeklyLoss === "" ? null : Number(prefs.maxWeeklyLoss),
      maxOpenTrades: Number(prefs.maxOpenTrades),
      tp1PercentOfTp2: Number(prefs.tp1PercentOfTp2),
      protectedSlPercentOfTp2: Number(prefs.protectedSlPercentOfTp2),
      allowedSymbols: String(prefs.allowedSymbols || "")
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    };
    const response = await fetch(`${BASE_URL}/settings/risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.detail || "Could not save risk settings");
    }
  } catch (error) {
    saveButton.disabled = false;
    saveButton.textContent = "✓ Save Changes";
    alert(error.message || "Could not save risk settings");
    return;
  }

  // Saving is an in-place action: keep Risk Management attached to the sidebar.
  settingsModal?.classList.remove("hidden");
  setActiveSettingsPage("settings:risk");
  setMainMenuOpen(true);
  if (settingsBox) settingsBox.scrollTop = savedScrollTop;

  const originalLabel = "✓ Save Changes";
  saveButton.textContent = "✓ Saved";
  saveButton.classList.add("is-saved");
  window.setTimeout(() => {
    saveButton.textContent = originalLabel;
    saveButton.classList.remove("is-saved");
    saveButton.disabled = false;
  }, 1400);
});

document.getElementById("riskCancelBtn")?.addEventListener("click", () => {
  settingsModal?.classList.add("hidden");
  setMainMenuOpen(false);
});

menuBrokerAccountsBtn?.addEventListener("click", () => {
  if (!isAdminAccount()) {
    return;
  }

  closeAllOverlays();
  openBrokerAccountsModal();
});

closeBrokerAccountsBtn?.addEventListener("click", closeBrokerAccountsModal);

brokerAccountsModal?.addEventListener("click", (event) => {
  if (event.target === brokerAccountsModal) {
    closeBrokerAccountsModal();
  }
});

brokerAccountsModal?.querySelectorAll("[data-broker-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.brokerNav;
    closeBrokerAccountsModal();
    closeAllOverlays();

    if (target === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (target === "assistant") {
      openAssistantPanel();
      return;
    }

    if (target === "live") {
      openPaperPanel();
      return;
    }

    if (target === "feedback") {
      openFeedbackModal();
      return;
    }

    if (target === "history") {
      document.querySelector(".history-section")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    if (target === "performance") {
      statsModal?.classList.remove("hidden");
      setActiveSettingsPage("performance");
      loadPerformanceSummary().catch(console.error);
      return;
    }

    if (target === "settings-general") openSettingsPage("general");
    if (target === "settings-risk") openSettingsPage("risk");
    if (target === "settings-notifications") openSettingsPage("notifications");
    if (target === "settings-strategy") openSettingsPage("strategy");
  });
});

connectCtraderBtn?.addEventListener("click", async () => {
  setBrokerStatusMessage("Connection Status: opening cTrader login...");
  connectCtraderBtn.disabled = true;

  try {
    const res = await fetch(`${BASE_URL}/ctrader/connect`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await res.json();

    if (!res.ok || result.ok === false || !result.authorization_url) {
      setBrokerStatusMessage(`Connection Status: ${result.reason || "Could not start cTrader login"}`, true);
      return;
    }

    window.location.href = result.authorization_url;
  } catch (err) {
    setBrokerStatusMessage(`Connection Status: ${err.message}`, true);
  } finally {
    connectCtraderBtn.disabled = false;
  }
});

disconnectCtraderBtn?.addEventListener("click", async () => {
  if (!confirm("Disconnect cTrader and clear FlowSignal broker session?")) return;

  setBrokerStatusMessage("Connection Status: disconnecting...");
  disconnectCtraderBtn.disabled = true;

  const result = await postBrokerAccountAction("ctrader/disconnect");
  await fetchCtraderStatus();
  renderBrokerAccounts({
    ok: result.ok !== false,
    active_account_id: "",
    accounts: [],
  });
  setBrokerStatusMessage(result.ok === false
    ? `Connection Status: ${result.reason || "disconnect failed"}`
    : "Connection Status: disconnected",
    result.ok === false
  );
  disconnectCtraderBtn.disabled = false;
});

refreshCtraderAccountsBtn?.addEventListener("click", async () => {
  await loadBrokerAccounts(true);
});

setActiveCtraderAccountBtn?.addEventListener("click", async () => {
  await setActiveBrokerAccount();
});

brokerAccountList?.addEventListener("click", async (event) => {
  const row = event.target.closest("tr[data-account-id]");
  const setActiveButton = event.target.closest("[data-set-active]");

  if (row) {
    selectBrokerAccount(row.dataset.accountId);
  }

  if (setActiveButton) {
    event.preventDefault();
    await setActiveBrokerAccount(setActiveButton.dataset.setActive);
  }
});

activeBrokerAccountCard?.addEventListener("click", async (event) => {
  if (event.target.closest("#setActiveCtraderAccountBtn")) {
    await setActiveBrokerAccount();
  }
});

forgetCtraderAccountBtn?.addEventListener("click", async () => {
  const accountId = getSelectedBrokerAccountId();

  if (!accountId) {
    alert("Select an account first.");
    return;
  }

  if (!confirm("Forget this account from FlowSignal only?")) return;

  const result = await postBrokerAccountAction("ctrader/accounts/forget", {
    accountId,
  });

  if (result.ok === false) return;

  await fetchCtraderStatus();
  await loadBrokerAccounts(false);
});

clearAllBrokerAccountsBtn?.addEventListener("click", async () => {
  const accountIds = Array.from(brokerAccountSelect?.options || [])
    .map((option) => option.value)
    .filter(Boolean);

  if (!accountIds.length) {
    alert("No accounts to clear.");
    return;
  }

  if (!confirm("Clear all saved broker accounts from FlowSignal only?")) return;

  const result = await postBrokerAccountAction("ctrader/accounts/clear");

  if (result.ok === false) return;

  await fetchCtraderStatus();
  renderBrokerAccounts({
    ok: true,
    active_account_id: "",
    accounts: [],
  });
  setBrokerStatusMessage("Connection Status: accounts cleared");
});

brokerAccountSelect?.addEventListener("change", updateBrokerAccountActionState);

handleCtraderOAuthReturn();

if (menuAdminBtn) {
  menuAdminBtn.addEventListener("click", () => {
    const btn = document.getElementById("adminUnlockBtn");
    if (btn) btn.click();
  });
}

if (menuStatsBtn) {
  menuStatsBtn.addEventListener("click", async () => {
    if (!isAdminAccount()) {
      applyRoleVisibility();
      return;
    }

    closeAllOverlays();
    setActiveSettingsPage("performance");
    setMainMenuOpen(true);
    if (statsModal) statsModal.classList.remove("hidden");
    const perfUpdated = document.getElementById("perfLastUpdated");
    if (perfUpdated) perfUpdated.textContent = `Last Updated: ${new Date().toLocaleString()}`;

    try {
      const [adminResponse] = await Promise.all([
        fetch(`${BASE_URL}/admin-stats`),
        loadPerformanceSummary(),
      ]);
      const data = await adminResponse.json();

      if (totalVisitorsCount) {
        totalVisitorsCount.textContent = data.total_visits || 0;
      }

      if (uniqueVisitorsCount) {
        uniqueVisitorsCount.textContent = data.unique_visitors || 0;
      }

      if (todayVisitsCount) {
        todayVisitsCount.textContent = data.today_visits || 0;
      }

      if (lastVisitTime) {
        if (data.last_visit) {
          const d = new Date(data.last_visit * 1000);
          lastVisitTime.textContent = d.toLocaleString();
        } else {
          lastVisitTime.textContent = "--";
        }
      }

      if (countryStats) {
      if (data.countries && data.countries.length > 0) {
        countryStats.textContent = data.countries.join(", ");
      } else {
        countryStats.textContent = "No data";
      }
    }

    } catch (err) {
      console.error(err);
      if (countryStats) countryStats.textContent = "Stats unavailable";
    }
  });
}

if (closeStatsBtn) {
  closeStatsBtn.addEventListener("click", () => {
    if (statsModal) statsModal.classList.add("hidden");
    setMainMenuOpen(false);
  });
}

statsModal?.addEventListener("click", (event) => {
  if (event.target === statsModal) {
    statsModal.classList.add("hidden");
    setActiveSettingsPage(null);
  }
});

document.getElementById("performanceFooterCloseBtn")?.addEventListener("click", () => {
  statsModal?.classList.add("hidden");
  setMainMenuOpen(false);
});

document.addEventListener("click", (e) => {
  if (!sideMenu || !menuToggleBtn) return;
  if (!menuOpen) return;

  const clickedInsideMenu = sideMenu.contains(e.target);
  const clickedToggle = menuToggleBtn.contains(e.target);
  const attachedPage = getActiveAttachedPageElement();
  const clickedInsideAttachedPage = Boolean(
    attachedPage && attachedPage.contains(e.target)
  );

  if (!clickedInsideMenu && !clickedToggle && !clickedInsideAttachedPage) {
    setMainMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    assistantModal &&
    !assistantModal.classList.contains("hidden")
  ) {
    closeAssistantPanel();
  }
});

const langSelect = document.getElementById("langSelect");

if (langSelect) {
  langSelect.value = currentLang;

  langSelect.addEventListener("change", (e) => {
    currentLang = e.target.value;
    localStorage.setItem("flowsignal_lang", currentLang);

    applyLanguage(currentLang);
    updateAssistantLanguageUI();
    refreshVoiceForCurrentLanguage();
    showAssistantMessage(
      assistantEventMessage("languageChanged"),
      "LANGUAGE"
    );

    if (latestPanelData) {
      updateCard("EURUSD", latestPanelData.EURUSD);
      updateCard("XAUUSD", latestPanelData.XAUUSD);
      updateMainPanel(currentChartSymbol);
    }
  });
}

const eurusdCard = document.getElementById("eurusd-card");
const goldCard = document.getElementById("gold-card");

if (eurusdCard) {
  eurusdCard.addEventListener("click", () => {
    switchChart("EURUSD", currentChartTimeframe);
    updateMainPanel("EURUSD");
  });
}

if (goldCard) {
  goldCard.addEventListener("click", () => {
    switchChart("XAUUSD", currentChartTimeframe);
    updateMainPanel("XAUUSD");
  });
}

applyLanguage(currentLang);

// Login → Admin Login box
document.getElementById("openAdminLoginBtn")?.addEventListener("click", () => {
  openAdminLoginBox();
});

// Close access box
document.getElementById("closeAccessBtn")?.addEventListener("click", () => {
  document.getElementById("accessBox")?.classList.add("hidden");
});

// Close admin login box
document.getElementById("closeAdminLoginBtn")?.addEventListener("click", () => {
  document.getElementById("adminLoginBox")?.classList.add("hidden");
});

function moveNewsImpactPanel() {
  const newsPanel = document.querySelector(".news-impact-panel");
  const mainPanel = document.querySelector(".main-trade-card");
  const chartPanel = document.querySelector(".chart-section");

  if (!newsPanel || !mainPanel || !chartPanel) return;

  const smcPanel = mainPanel.querySelector(".main-smc-panel");

  if (window.innerWidth <= 700) {
    if (smcPanel && newsPanel.parentNode !== mainPanel) {
      mainPanel.appendChild(newsPanel);
    } else if (smcPanel && newsPanel.previousElementSibling !== smcPanel) {
      mainPanel.appendChild(newsPanel);
    }
  } else if (window.innerWidth <= 850) {
    if (smcPanel && newsPanel.parentNode !== mainPanel) {
      mainPanel.insertBefore(newsPanel, smcPanel);
    }
  } else {
    const historySection = chartPanel.querySelector(".history-section");
    if (newsPanel.parentNode !== chartPanel && historySection) {
      chartPanel.insertBefore(newsPanel, historySection);
    }
  }
}

function moveMobileHistorySection() {
  const historySection = document.querySelector(".history-section");
  const mainPanel = document.querySelector(".main-trade-card");
  const chartPanel = document.querySelector(".chart-section");
  const smcPanel = document.querySelector(".main-smc-panel");

  if (!historySection || !mainPanel || !chartPanel || !smcPanel) return;

  if (window.innerWidth <= 700) {
    if (smcPanel.parentNode !== chartPanel || smcPanel.nextElementSibling !== historySection) {
      chartPanel.insertBefore(smcPanel, historySection.parentNode === chartPanel ? historySection : null);
    }
    if (historySection.previousElementSibling !== smcPanel) {
      chartPanel.insertBefore(historySection, smcPanel.nextSibling);
    }
  } else {
    const debugPanel = mainPanel.querySelector(".entry-strategy-debug");
    if (smcPanel.parentNode !== mainPanel) {
      mainPanel.insertBefore(smcPanel, debugPanel || null);
    }
    if (historySection.parentNode !== chartPanel) {
      chartPanel.appendChild(historySection);
    }
  }
}

moveNewsImpactPanel();
moveMobileHistorySection();
window.addEventListener("resize", moveNewsImpactPanel);
window.addEventListener("resize", moveMobileHistorySection);

applyLanguage(currentLang);
