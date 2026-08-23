import React, { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { 
  Cloud, CloudRain, Sun, Wind, Droplets, Thermometer, 
  Map as MapIcon, MessageSquare, AlertTriangle, Settings, 
  Mic, Search, Bell, Activity, Navigation, MicOff, 
  Globe, Leaf, Truck, ChevronRight, Loader2, Info,
  Volume2, VolumeX, Pause, Play, StopCircle, RefreshCw,
  Navigation2, Layers, Lock, MapPin, History, TrendingUp, 
  BarChart2, Calendar, ThermometerSun, ShieldAlert, CheckCircle2,
  Trash2, Plus, User, Settings2
} from 'lucide-react';

type WeatherCurrent = {
  temp: number; feels: number; condition: string; humidity: number; wind: number;
  uv: number; pressure: number; rainProb: number;
};
type ForecastDay = { day: string; temp: number; min: number; condition: string };
type Risk = { score: number; level: string; reasons: string[] };
type WeatherData = { name: string; current: WeatherCurrent; forecast: ForecastDay[]; alerts: unknown[]; risk: Risk };
type ChatMessage = { role: 'ai' | 'user'; content: string; hasCard?: boolean };
  type Alert = { id: string; location: string; hazard: string; severity: string; time?: string; score?: number; advice?: string; source?: string; status: string; timestamp?: string; date?: string };
type SavedLocation = { id: string; name: string; type: string; lat: number; lon: number };
type ClimateData = { location: string; period: string; yearlySummary: Record<string, unknown>; monthly: Array<Record<string, string | number>> };
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
type HazardTypes = { rain: boolean; thunderstorm: boolean; heat: boolean; wind: boolean };
type AlertPreferences = { profile: string; threshold: number; types: HazardTypes; voiceAlerts: boolean };

type SpeechRecognitionEventLike = Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
};
type LeafletLike = {
  map: (element: HTMLElement, options: unknown) => { setView: (coords: [number, number], zoom?: number) => LeafletMapLike; on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => void };
  control: { zoom: (options: unknown) => { addTo: (map: LeafletMapLike) => void } };
  tileLayer: (url: string, options: unknown) => { addTo: (map: LeafletMapLike) => void };
  divIcon: (options: unknown) => unknown;
  marker: (coords: [number, number], options: unknown) => { addTo: (map: LeafletMapLike) => LeafletMarkerLike };
};
type LeafletMapLike = { setView: (coords: [number, number]) => void; on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => void };
type LeafletMarkerLike = { remove: () => void };

declare global {
  interface Window {
    __isCanvas?: boolean;
    L?: LeafletLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

// 22 Scheduled Indian Languages + English
const LANGUAGES = [
  { code: 'en', locale: 'en-IN', name: 'English' },
  { code: 'hi', locale: 'hi-IN', name: 'Hindi (हिंदी)' },
  { code: 'te', locale: 'te-IN', name: 'Telugu (తెలుగు)' },
  { code: 'ta', locale: 'ta-IN', name: 'Tamil (தமிழ்)' },
  { code: 'kn', locale: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', locale: 'ml-IN', name: 'Malayalam (മലയാളം)' },
  { code: 'mr', locale: 'mr-IN', name: 'Marathi (मराठी)' },
  { code: 'bn', locale: 'bn-IN', name: 'Bengali (বাংলা)' },
  { code: 'gu', locale: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
  { code: 'pa', locale: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'or', locale: 'or-IN', name: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'as', locale: 'as-IN', name: 'Assamese (অসমীয়া)' },
  { code: 'ur', locale: 'ur-IN', name: 'Urdu (اردو)' },
  { code: 'sa', locale: 'sa-IN', name: 'Sanskrit (संस्कृतम्)' },
  { code: 'ks', locale: 'ks-IN', name: 'Kashmiri (कॉशुर)' },
  { code: 'kok', locale: 'kok-IN', name: 'Konkani (कोंकणी)' },
  { code: 'ne', locale: 'ne-NP', name: 'Nepali (नेपाली)' },
  { code: 'mni', locale: 'mni-IN', name: 'Manipuri (মৈতৈলোন্)' },
  { code: 'mai', locale: 'mai-IN', name: 'Maithili (मैथिली)' },
  { code: 'brx', locale: 'en-IN', name: 'Bodo (बड़ो)' }, 
  { code: 'doi', locale: 'en-IN', name: 'Dogri (डोगरी)' }, 
  { code: 'sat', locale: 'en-IN', name: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)' }, 
  { code: 'sd', locale: 'sd-IN', name: 'Sindhi (سنڌي)' }
];

const UI_DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard', chat: 'AI Chat', map: 'Map', alerts: 'Alerts', climate: 'Climate Intel',
    searchPlaceholder: 'Search city or district...', currentWeather: 'Current Weather',
    feelsLike: 'Feels like', humidity: 'Humidity', wind: 'Wind', pressure: 'Pressure', uvIndex: 'UV Index',
    riskLevel: 'Risk Level', aiInsight: 'AI Insight', askAi: 'Ask WeatherGPT...',
    voiceListening: 'Listening...', voiceProcessing: 'Processing...', voiceSpeaking: 'Speaking...',
    voiceIdle: 'Tap to speak', continuousMode: 'Continuous Voice', demoMode: 'Demo Mode', liveMode: 'Live Data'
  },
  hi: {
    dashboard: 'डैशबोर्ड', chat: 'एआई चैट', map: 'नक्शा', alerts: 'चेतावनी', climate: 'जलवायु बुद्धिमत्ता',
    searchPlaceholder: 'शहर या जिला खोजें...', currentWeather: 'वर्तमान मौसम',
    feelsLike: 'महसूस होता है', humidity: 'नमी', wind: 'हवा', pressure: 'दबाव', uvIndex: 'यूवी इंडेक्स',
    riskLevel: 'जोखिम स्तर', aiInsight: 'एआई अंतर्दृष्टि', askAi: 'WeatherGPT से पूछें...',
    voiceListening: 'सुन रहा हूँ...', voiceProcessing: 'समझ रहा हूँ...', voiceSpeaking: 'बोल रहा हूँ...',
    voiceIdle: 'बोलने के लिए टैप करें', continuousMode: 'निरंतर आवाज़', demoMode: 'डेमो मोड', liveMode: 'लाइव डेटा'
  },
  te: {
    dashboard: 'డాష్‌బోర్డ్', chat: 'AI చాట్', map: 'మ్యాప్', alerts: 'హెచ్చరికలు', climate: 'వాతావరణ విశ్లేషణ',
    searchPlaceholder: 'నగరం లేదా జిల్లాను శోధించండి...', currentWeather: 'ప్రస్తుత వాతావరణం',
    feelsLike: 'అనిపిస్తుంది', humidity: 'తేమ', wind: 'గాలి', pressure: 'పీడనం', uvIndex: 'UV సూచిక',
    riskLevel: 'ప్రమాద స్థాయి', aiInsight: 'AI అంతర్దృష్టి', askAi: 'WeatherGPT ని అడగండి...',
    voiceListening: 'వింటున్నాను...', voiceProcessing: 'ప్రాసెస్ చేస్తోంది...', voiceSpeaking: 'మాట్లాడుతోంది...',
    voiceIdle: 'మాట్లాడటానికి నొక్కండి', continuousMode: 'నిరంతర వాయిస్', demoMode: 'డెమో మోడ్', liveMode: 'లైవ్ డేటా'
  }
};

const MOCK_LOCATIONS = {
  'karimnagar': {
    name: 'Karimnagar, Telangana',
    current: { temp: 34, feels: 38, condition: 'Thunderstorms', humidity: 75, wind: 24, uv: 6, pressure: 1008, rainProb: 80 },
    forecast: [
      { day: 'Today', temp: 34, min: 26, condition: 'rain' },
      { day: 'Tomorrow', temp: 31, min: 24, condition: 'rain' },
      { day: 'Wed', temp: 33, min: 25, condition: 'cloudy' },
      { day: 'Thu', temp: 35, min: 26, condition: 'sunny' },
    ],
    alerts: [{ id: 1, type: 'Severe Thunderstorm', severity: 'HIGH', time: '4:00 PM - 7:00 PM', desc: 'Heavy rainfall and lightning expected.' }],
    risk: { score: 78, level: 'HIGH RISK', reasons: ['High probability of thunderstorms', 'Heavy rainfall expected'] }
  }
};

const MOCK_CLIMATE = {
  location: 'Karimnagar, Telangana',
  period: 'Past 12 Months',
  yearlySummary: {
    recentYear: { avgTemp: 29.5, totalRain: 850.4 },
    previousYear: { avgTemp: 28.2, totalRain: 920.1 },
    tempAnomaly: "+1.3",
    rainAnomaly: "-69.7"
  },
  monthly: [
    { month: 'Jan', maxTemp: 31, minTemp: 19, rain: 5 }, { month: 'Feb', maxTemp: 34, minTemp: 21, rain: 2 },
    { month: 'Mar', maxTemp: 38, minTemp: 25, rain: 15 }, { month: 'Apr', maxTemp: 41, minTemp: 28, rain: 20 },
    { month: 'May', maxTemp: 43, minTemp: 30, rain: 45 }, { month: 'Jun', maxTemp: 37, minTemp: 27, rain: 150 },
    { month: 'Jul', maxTemp: 33, minTemp: 25, rain: 280 }, { month: 'Aug', maxTemp: 32, minTemp: 24, rain: 210 },
    { month: 'Sep', maxTemp: 33, minTemp: 24, rain: 130 }, { month: 'Oct', maxTemp: 34, minTemp: 22, rain: 60 },
    { month: 'Nov', maxTemp: 32, minTemp: 19, rain: 15 }, { month: 'Dec', maxTemp: 30, minTemp: 17, rain: 5 }
  ]
};

const decodeWeatherCode = (code: number): string => {
  const codes: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
  };
  return codes[code] || 'Unknown';
};

const calculateRiskScore = (current: WeatherCurrent, _forecast: ForecastDay[]): Risk => {
  let score = 0;
  let reasons: string[] = [];

  if (current.rainProb > 70) { score += 30; reasons.push(`High rainfall probability (${current.rainProb}%)`); }
  else if (current.rainProb > 40) { score += 15; reasons.push(`Moderate rainfall probability (${current.rainProb}%)`); }

  if (current.wind > 40) { score += 25; reasons.push(`Strong winds (${current.wind} km/h)`); }
  if (current.temp > 40) { score += 35; reasons.push(`Extreme heat (${current.temp}°C)`); }
  
  const condition = current.condition.toLowerCase();
  if (condition.includes('thunderstorm') || condition.includes('thunder')) { score += 40; reasons.push('Thunderstorms in the area'); }
  if (condition.includes('fog')) { score += 15; reasons.push('Low visibility due to fog'); }

  score = Math.min(score, 100);
  let level = 'LOW';
  if (score > 80) level = 'EXTREME';
  else if (score > 60) level = 'HIGH';
  else if (score > 40) level = 'ELEVATED';
  else if (score > 20) level = 'MODERATE';

  return { score, level, reasons };
};

const askGemini = async (prompt: string, weatherContext: unknown, climateContext: unknown, lang: string, _mode: string, isVoiceResponse = false, chatHistory: ChatMessage[] = [], activeAlerts: Alert[] = [], userProfile = 'General'): Promise<string> => {
  const apiKey = ""; // Injected by Canvas automatically
  if (!apiKey && typeof window !== 'undefined' && !window.__isCanvas) {
     console.warn("API Key missing. Falling back to mock responses.");
  }

  const systemPrompt = `You are WeatherGPT, a highly advanced AI weather intelligence assistant optimized for India. 
RULES:
1. TRUTH: Use ONLY the supplied JSON weather data context for current conditions and forecasts. Never fabricate temperature, rainfall, wind, or alerts. 
2. UNKNOWN DATA: If weather data is missing, clearly state it is unavailable. Do not guess.
3. LANGUAGE: Answer in the language of the user's query. (UI Selected Language Code: ${lang}). Support natural Indian code-switching (e.g. English + Telugu).
4. SIMPLICITY: Explain technical weather info in simple terms. Provide actionable safety advice for dangerous weather.
5. AUTHORITY: Never present AI predictions as official government warnings. Encourage users to check official sources for severe events.
6. VOICE MODE IS ${isVoiceResponse ? 'ON. Keep answers extremely concise, natural, conversational, and easy to listen to (2-4 sentences max).' : 'OFF. You can provide slightly more detailed formatting.'}
7. PERSONALITY: Be clear, helpful, calm, and natural.
8. PERSONALIZATION: The user profile is "${userProfile}". Prioritize advice relevant to this profile (e.g., travel safety for Traveller, irrigation for Farmer).

LIVE WEATHER CONTEXT:
${weatherContext ? JSON.stringify(weatherContext) : 'Not available'}

ACTIVE ALERTS:
${activeAlerts.length > 0 ? JSON.stringify(activeAlerts) : 'No active alerts'}

HISTORICAL CLIMATE CONTEXT (Use only if asked about trends/history):
${climateContext ? JSON.stringify(climateContext) : 'Not available'}`;

  const payload = {
    contents: [
      ...chatHistory.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] })),
      { role: "user", parts: [{ text: prompt }] }
    ],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I am currently unable to analyze the weather due to a network issue.";
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "Weather AI services are temporarily unreachable. Please try again later.";
  }
};

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl ${className}`}>
    {children}
  </div>
);

const IconButton = ({ icon: Icon, onClick, className = '', active = false, disabled = false, title = '' }: { icon: LucideIcon; onClick: () => void; className?: string; active?: boolean; disabled?: boolean; title?: string }) => (
  <button title={title} disabled={disabled} onClick={onClick} className={`p-3 rounded-xl transition-all duration-300 ${active ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'hover:bg-white/10 text-slate-300 hover:text-white border border-transparent'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
    <Icon size={22} />
  </button>
);

const WeatherIcon = ({ condition, size = 24, className = '' }: { condition?: string; size?: number; className?: string }) => {
  const c = condition?.toLowerCase() || '';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder')) return <CloudRain size={size} className={`text-blue-400 ${className}`} />;
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog')) return <Cloud size={size} className={`text-gray-300 ${className}`} />;
  return <Sun size={size} className={`text-yellow-400 ${className}`} />;
};

export default function WeatherGPT() {
  // UI State
  const [activeTab, setActiveTab] = useState('chat');
  const [langCode, setLangCode] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('general');
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Data State
  const [location, setLocation] = useState({ name: 'Hyderabad, India', lat: 17.3850, lon: 78.4867 });
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [error, setError] = useState('');

  // Voice & Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'ai', content: 'Namaste! I am VoiceGPT for Weather. You can type or tap the microphone to speak with me naturally in multiple Indian languages.', hasCard: false }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // Voice Sub-system State
  const [voiceState, setVoiceState] = useState<VoiceState>('idle'); 
  const [isContinuousVoice, setIsContinuousVoice] = useState(false);
  const [speechError, setSpeechError] = useState('');
  
  // Map State
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  
  // Climate State
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [isClimateLoading, setIsClimateLoading] = useState(false);
  const [climateAiSummary, setClimateAiSummary] = useState('');
  const [climateError, setClimateError] = useState('');

  // --- NEW: Alert & Personalization State ---
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([
    { id: 'loc-1', name: 'Karimnagar, Telangana', type: 'College', lat: 18.4386, lon: 79.1288 },
    { id: 'loc-2', name: 'Hyderabad, India', type: 'Home', lat: 17.3850, lon: 78.4867 }
  ]);
  const [alertPrefs, setAlertPrefs] = useState<AlertPreferences>({
    profile: 'Student', // General, Student, Farmer, Traveller
    threshold: 60, // 40=ELEVATED, 60=HIGH, 80=EXTREME
    types: { rain: true, thunderstorm: true, heat: true, wind: true },
    voiceAlerts: true
  });
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([
    { id: 'hist-1', location: 'Karimnagar, Telangana', hazard: 'Heavy Rain', severity: 'MODERATE', status: 'RESOLVED', date: 'Yesterday' }
  ]);
  const [notiPermission, setNotiPermission] = useState(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const mapContainerRef = useRef(null);
  const mapInstance = useRef<LeafletMapLike | null>(null);
  const markerInstance = useRef<LeafletMarkerLike | null>(null);
  
  const t = UI_DICTIONARY[langCode] || UI_DICTIONARY['en'];
  const currentLangObj = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
       setError("Browser notifications are not supported.");
       return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotiPermission(permission);
      if (permission !== 'granted') {
         setError("Notification permission denied. Alerts will only show in-app.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // The Alert Engine: Evaluates weather data against user preferences
  useEffect(() => {
    if (!weatherData) return;
    
    // In a real app, this would evaluate data for ALL saved locations via a backend or bulk API.
    // Here, we evaluate the currently loaded weather location if it matches a saved location, or just generate warnings generally.
    const riskScore = weatherData.risk.score;
    
    if (riskScore >= alertPrefs.threshold) {
       const hazardStr = weatherData.risk.reasons.join(', ') || 'High Weather Risk';
       
       // Basic filtering based on preferences (Demo implementation)
       const hazardLower = hazardStr.toLowerCase();
       if (!alertPrefs.types.rain && hazardLower.includes('rain')) return;
       if (!alertPrefs.types.thunderstorm && (hazardLower.includes('thunder') || hazardLower.includes('lightning'))) return;
       if (!alertPrefs.types.heat && hazardLower.includes('heat')) return;
       if (!alertPrefs.types.wind && hazardLower.includes('wind')) return;

       const alertId = `${weatherData.name}-${weatherData.risk.level}-${new Date().toDateString()}`;
       
       const newAlert = {
          id: alertId,
          location: weatherData.name,
          hazard: hazardStr,
          severity: weatherData.risk.level,
          time: 'Next 3-6 hours',
          score: riskScore,
          advice: alertPrefs.profile === 'Student' ? 'Avoid unnecessary outdoor travel during peak storm periods.' : 
                  alertPrefs.profile === 'Farmer' ? 'Consider delaying irrigation and securing outdoor equipment.' : 
                  'Exercise caution and monitor official weather updates.',
          source: isDemoMode ? 'DEMO ALERT' : 'WeatherGPT AI Risk Analysis',
          status: 'ACTIVE',
          timestamp: new Date().toISOString()
       };

       setActiveAlerts(prev => {
          // Deduplication: Don't add if we already have an active alert for this exact hazard and location today
          const exists = prev.find(a => a.id === alertId);
          if (exists) return prev;

          // Trigger Browser Notification
          if (notiPermission === 'granted') {
             try {
                new Notification(`⚠️ ${newAlert.severity} RISK: ${newAlert.location}`, {
                   body: `${newAlert.hazard}\n${newAlert.advice}`,
                   icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png' // Generic weather alert icon
                });
             } catch (e) { console.error("Notification failed", e); }
          }

          return [newAlert, ...prev];
       });
    }
  }, [weatherData, alertPrefs, notiPermission, isDemoMode]);

  const simulateDemoAlert = () => {
    const alertId = `demo-${Date.now()}`;
    const newAlert = {
       id: alertId,
       location: location.name,
       hazard: 'Severe Thunderstorm & Lightning',
       severity: 'EXTREME',
       time: 'Immediate',
       score: 95,
       advice: `Avoid outdoor travel. Stay indoors and avoid standing near trees or electrical infrastructure. (Profile: ${alertPrefs.profile})`,
       source: 'DEMO ALERT',
       status: 'ACTIVE',
       timestamp: new Date().toISOString()
    };
    
    setActiveAlerts(prev => [newAlert, ...prev]);
    
    if (notiPermission === 'granted') {
       new Notification(`⚠️ EXTREME RISK: ${newAlert.location}`, {
          body: `${newAlert.hazard}\n${newAlert.advice}`
       });
    } else {
       setError("Simulated Alert Generated! (Enable notifications for browser popups)");
    }
  };

  const resolveAlert = (id: string) => {
    setActiveAlerts(prev => {
      const alertToResolve = prev.find(a => a.id === id);
      if (alertToResolve) {
         setAlertHistory(hist => [{ ...alertToResolve, status: 'RESOLVED', date: 'Just now' }, ...hist]);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const fetchWeather = async (lat: number, lon: number, locName: string) => {
    setIsLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        setWeatherData(MOCK_LOCATIONS['karimnagar']);
        setIsLoading(false);
        return;
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather API failed");
      const data = await res.json();
      
      const currentCondition = decodeWeatherCode(data.current.weather_code);
      
      const parsedData: WeatherData = {
        name: locName,
        current: {
          temp: Math.round(data.current.temperature_2m),
          feels: Math.round(data.current.apparent_temperature),
          condition: currentCondition,
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          uv: Math.round(data.daily.uv_index_max[0] || 0),
          pressure: Math.round(data.current.surface_pressure),
          rainProb: data.current.precipitation_probability || 0
        },
        forecast: (data.daily.time as string[]).slice(0, 4).map((time: string, i: number) => ({
          day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(time).toLocaleDateString('en-US', { weekday: 'short' }),
          temp: Math.round(data.daily.temperature_2m_max[i]),
          min: Math.round(data.daily.temperature_2m_min[i]),
          condition: decodeWeatherCode(data.daily.weather_code[i])
        })),
        alerts: [],
        risk: { score: 0, level: 'LOW', reasons: [] }
      };

      parsedData.risk = calculateRiskScore(parsedData.current, parsedData.forecast);
      setWeatherData(parsedData);
      
      askGemini(`Generate a 1-sentence weather insight for ${locName}. Include a practical recommendation based on the user's profile: ${alertPrefs.profile}.`, parsedData, climateData, langCode, mode, false, [], activeAlerts, alertPrefs.profile)
        .then(res => setAiSummary(res));
      
    } catch (err) {
      console.error(err);
      setError('Live weather unavailable. Switching to Demo Mode.');
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClimateData = async (lat: number, lon: number, locName: string) => {
    setIsClimateLoading(true);
    setClimateError('');
    try {
      if (isDemoMode) {
        setClimateData(MOCK_CLIMATE);
        askGemini(`Analyze this climate data for ${locName}. Briefly summarize the temperature and rainfall trends over the past year. Keep it to 2-3 concise sentences.`, null, MOCK_CLIMATE, langCode, mode, false, [], activeAlerts, alertPrefs.profile)
          .then(res => setClimateAiSummary(res));
        setIsClimateLoading(false);
        return;
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 14); 
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 730);

      const eDateStr = endDate.toISOString().split('T')[0];
      const sDateStr = startDate.toISOString().split('T')[0];

      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${sDateStr}&end_date=${eDateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Climate API failed");
      const data = await res.json();

      const totalDays = data.daily.time.length;
      const midPoint = Math.floor(totalDays / 2);
      
      let y1Temp = 0, y1Rain = 0, y1Count = 0;
      let y2Temp = 0, y2Rain = 0, y2Count = 0;
      
      const monthlyData: Record<string, { label: string; maxTemps: number[]; minTemps: number[]; rain: number }> = {};
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      (data.daily.time as string[]).forEach((dateStr: string, i: number) => {
          const maxT = data.daily.temperature_2m_max[i];
          const minT = data.daily.temperature_2m_min[i];
          const rain = data.daily.precipitation_sum[i];
          const avgT = (maxT + minT) / 2;

          if (maxT !== null && minT !== null) {
              if (i < midPoint) {
                  y1Temp += avgT; y1Rain += rain || 0; y1Count++;
              } else {
                  y2Temp += avgT; y2Rain += rain || 0; y2Count++;
                  const d = new Date(dateStr);
                  const mKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
                  if (!monthlyData[mKey]) {
                      monthlyData[mKey] = { label: monthNames[d.getMonth()], maxTemps: [], minTemps: [], rain: 0 };
                  }
                  monthlyData[mKey].maxTemps.push(maxT);
                  monthlyData[mKey].minTemps.push(minT);
                  monthlyData[mKey].rain += rain || 0;
              }
          }
      });

      const recentYearAvgTemp = y2Count ? (y2Temp / y2Count) : 0;
      const prevYearAvgTemp = y1Count ? (y1Temp / y1Count) : 0;

      const processedMonthly = Object.keys(monthlyData).sort().map(k => {
          const m = monthlyData[k];
          const avgMax = m.maxTemps.length ? m.maxTemps.reduce((sum, value) => sum + value, 0)/m.maxTemps.length : 0;
          const avgMin = m.minTemps.length ? m.minTemps.reduce((sum, value) => sum + value, 0)/m.minTemps.length : 0;
          return { month: m.label, maxTemp: Math.round(avgMax*10)/10, minTemp: Math.round(avgMin*10)/10, rain: Math.round(m.rain*10)/10 };
      });

      const cData = {
        location: locName,
        period: 'Past 12 Months',
        yearlySummary: {
          recentYear: { avgTemp: Math.round(recentYearAvgTemp*10)/10, totalRain: Math.round(y2Rain) },
          previousYear: { avgTemp: Math.round(prevYearAvgTemp*10)/10, totalRain: Math.round(y1Rain) },
          tempAnomaly: (recentYearAvgTemp - prevYearAvgTemp > 0 ? '+' : '') + Math.round((recentYearAvgTemp - prevYearAvgTemp)*10)/10,
          rainAnomaly: (y2Rain - y1Rain > 0 ? '+' : '') + Math.round(y2Rain - y1Rain)
        },
        monthly: processedMonthly
      };
      
      setClimateData(cData);
      askGemini(`Analyze this climate data for ${locName}. Briefly summarize the temperature and rainfall trends over the past year. Keep it to 2-3 concise sentences.`, null, cData, langCode, mode, false, [], activeAlerts, alertPrefs.profile)
          .then(res => setClimateAiSummary(res));
          
    } catch (err) {
      console.error(err);
      setClimateError('Climate data unavailable. Using demo data.');
      setClimateData(MOCK_CLIMATE);
    } finally {
      setIsClimateLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(location.lat, location.lon, location.name);
    fetchClimateData(location.lat, location.lon, location.name);
  }, [location, isDemoMode]);

  const handleLocationSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setIsLoading(true);
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        setLocation({ name: `${result.name}, ${result.admin1 || result.country}`, lat: result.latitude, lon: result.longitude });
        setSearchQuery('');
        setIsDemoMode(false);
      } else {
        setError("Location not found. Try another city.");
      }
    } catch (err) {
      setError("Error searching for location.");
    } finally {
      setIsLoading(false);
    }
  };

  const locateUser = () => {
    if (navigator.geolocation) {
       setIsLoading(true);
       navigator.geolocation.getCurrentPosition(
          async (pos) => {
             const { latitude, longitude } = pos.coords;
             try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                  const data = await res.json();
                  const name = data.address.city || data.address.town || data.address.village || data.address.county || "Current Location";
                  setLocation({ name, lat: latitude, lon: longitude });
              } catch (err) {
                  setLocation({ name: "Current Location", lat: latitude, lon: longitude });
              }
          },
          (err) => {
             setError("Location permission denied.");
             setIsLoading(false);
          }
       );
    } else {
       setError("Geolocation is not supported by your browser.");
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onstart = () => {
        setVoiceState('listening');
        setSpeechError('');
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleSendChat(transcript, true); 
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access blocked. Please allow permissions.');
        } else {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setVoiceState('idle');
      };
      
      recognitionRef.current.onend = () => {
        setVoiceState(prev => prev === 'listening' ? 'idle' : prev);
      };
    } else {
      setSpeechError("Voice input isn't supported in this browser. Please type your query.");
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [weatherData, chatHistory, langCode, isContinuousVoice, activeAlerts, alertPrefs.profile]);

  const toggleListening = () => {
    if (voiceState === 'listening') {
      recognitionRef.current?.stop();
      setVoiceState('idle');
    } else if (voiceState === 'speaking') {
      synthRef.current?.cancel();
      setVoiceState('idle');
    } else {
      if (recognitionRef.current) {
        synthRef.current?.cancel(); 
        recognitionRef.current.lang = currentLangObj.locale;
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Recognition already started");
        }
      }
    }
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); 
    
    setVoiceState('speaking');
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = synthRef.current.getVoices();
    let selectedVoice = voices.find(v => v.lang === currentLangObj.locale || v.lang.replace('_','-') === currentLangObj.locale);
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith(langCode));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes('IN'));
    
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setVoiceState('idle');
      if (isContinuousVoice) {
         setTimeout(() => {
             if(recognitionRef.current) {
                 try{ recognitionRef.current.start(); } catch(e){}
             }
         }, 500);
      }
    };
    
    utterance.onerror = () => {
       console.error("TTS Error");
       setVoiceState('idle');
    };

    synthRef.current.speak(utterance);
  };

  const handleSendChat = async (text = '', isVoice = false) => {
    const q = text || chatInput;
    if (!q.trim()) return;
    
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: q }]);
    
    if (isVoice) setVoiceState('processing');
    else setIsAiTyping(true);

    const recentContext = chatHistory.slice(-6);
    const responseText = await askGemini(q, weatherData, climateData, langCode, mode, isVoice, recentContext, activeAlerts, alertPrefs.profile);
    
    const qLower = q.toLowerCase();
    const wantsWeatherCard = qLower.includes('weather') || qLower.includes('temperature') || qLower.includes('rain') || qLower.includes('forecast') || qLower.includes('వాతావరణం') || qLower.includes('मौसम');

    setChatHistory(prev => [...prev, { role: 'ai', content: responseText, hasCard: wantsWeatherCard }]);
    
    setIsAiTyping(false);
    if (isVoice || voiceState === 'processing') {
      speakResponse(responseText);
    }
  };

  const askAboutLocation = (locName: string) => {
    setActiveTab('chat');
    const query = `Provide a detailed weather and safety analysis for ${locName}. Consider my profile: ${alertPrefs.profile}.`;
    handleSendChat(query, false);
  };

  useEffect(() => {
    if (activeTab !== 'map' || isLeafletLoaded) return;
    
    if (window.L) {
      setIsLeafletLoaded(true);
      return;
    }

    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setIsLeafletLoaded(true);
    document.head.appendChild(script);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'map' || !isLeafletLoaded || !mapContainerRef.current) return;

    const leaflet = window.L;
    if (!leaflet) return;

    if (!mapInstance.current) {
      mapInstance.current = leaflet.map(mapContainerRef.current, {
        zoomControl: false 
      }).setView([location.lat, location.lon], 11);
      
      const map = mapInstance.current;
      if (!map) return;
      leaflet.control.zoom({ position: 'bottomright' }).addTo(map);

      leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(mapInstance.current);

      map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            const name = data.address.city || data.address.town || data.address.village || data.address.county || "Selected Area";
            setLocation({ name, lat, lon: lng });
        } catch (err) {
            setLocation({ name: "Selected Location", lat, lon: lng });
        }
      });
    } else {
      mapInstance.current.setView([location.lat, location.lon]);
    }

    if (markerInstance.current) {
      markerInstance.current.remove();
    }

    if (weatherData) {
      const riskScore = weatherData.risk?.score || 0;
      let color = '#3b82f6'; 
      let shadow = 'rgba(59,130,246,0.5)';
      if(riskScore > 80) { color = '#ef4444'; shadow = 'rgba(239,68,68,0.8)'; } 
      else if(riskScore > 60) { color = '#f97316'; shadow = 'rgba(249,115,22,0.8)'; } 
      else if(riskScore > 40) { color = '#eab308'; shadow = 'rgba(234,179,8,0.8)'; } 

      const customIcon = leaflet.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${shadow}; animation: pulse-ring 2s infinite;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const map = mapInstance.current;
      if (map) markerInstance.current = leaflet.marker([location.lat, location.lon], { icon: customIcon }).addTo(map);
    }
  }, [isLeafletLoaded, activeTab, location.lat, location.lon, weatherData]);

  const VoiceIsland = () => {
    if (voiceState === 'idle' && !speechError) return null;
    const states: Record<Exclude<VoiceState, 'idle'>, { icon: LucideIcon; color: string; text: string; glow: string; spin?: boolean }> = {
      listening: { icon: Mic, color: 'bg-red-500', text: t.voiceListening, glow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
      processing: { icon: Loader2, color: 'bg-purple-500', text: t.voiceProcessing, glow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]', spin: true },
      speaking: { icon: Volume2, color: 'bg-blue-500', text: t.voiceSpeaking, glow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]' },
      error: { icon: AlertTriangle, color: 'bg-orange-500', text: speechError, glow: '' }
    };

    const current = voiceState === 'idle' ? states.error : states[voiceState];
    const Icon = current.icon;

    return (
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className={`flex items-center gap-3 px-6 py-3 rounded-full text-white font-medium ${current.color} ${current.glow} backdrop-blur-md bg-opacity-90 border border-white/20`}>
           <Icon className={current.spin ? 'animate-spin' : 'animate-pulse'} size={20} />
           <span>{current.text}</span>
           {(voiceState === 'speaking' || voiceState === 'error') && (
             <button onClick={() => {synthRef.current?.cancel(); setVoiceState('idle'); setSpeechError('');}} className="ml-2 p-1 hover:bg-black/20 rounded-full transition-colors">
               <VolumeX size={16} />
             </button>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col md:flex-row selection:bg-blue-500/30">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950"></div>
        {weatherData?.current?.condition?.toLowerCase().includes('rain') && activeTab !== 'map' && (
           <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjIwIj48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxMCIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==')] animate-[rain_0.8s_linear_infinite]" style={{ backgroundSize: '20px 40px' }}></div>
        )}
      </div>

      <VoiceIsland />

      {/* Sidebar Navigation */}
      <nav className="relative z-20 w-full md:w-24 border-b md:border-b-0 md:border-r border-white/10 bg-slate-950/90 backdrop-blur-xl flex md:flex-col items-center justify-between p-4 md:py-8">
        <div className="text-xl md:text-2xl font-bold bg-gradient-to-br from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 shadow-lg border border-white/10">
          WG
        </div>
        <div className="flex md:flex-col gap-2 md:gap-6 w-full justify-center">
          <IconButton title="AI Chat" icon={MessageSquare} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <IconButton title="Dashboard" icon={Activity} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <IconButton title="Interactive Map" icon={MapIcon} active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <IconButton title="Climate Intel" icon={History} active={activeTab === 'climate'} onClick={() => setActiveTab('climate')} />
          <div className="relative">
            <IconButton title="Alerts & Intelligence" icon={Bell} active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
            {activeAlerts.length > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <button onClick={() => setIsDemoMode(!isDemoMode)} className={`hidden md:flex p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${isDemoMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}>
            {isDemoMode ? 'Demo' : 'Live'}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="absolute top-0 left-0 right-0 z-30 p-4 md:p-6 pb-2 flex flex-col md:flex-row justify-between items-center gap-4 pointer-events-none">
          <div className="flex items-center gap-2 w-full md:w-auto pointer-events-auto">
            <form onSubmit={handleLocationSearch} className="relative w-full md:w-80 flex items-center group shadow-xl">
               <Search className="absolute left-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={18} />
               <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400" disabled={isLoading} />
               {isLoading && <Loader2 className="absolute right-4 animate-spin text-blue-400" size={16} />}
            </form>
            <button onClick={locateUser} className="p-3 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl text-slate-300 hover:text-blue-400 transition-colors shadow-xl" title="Locate Me">
              <Navigation2 size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pointer-events-auto">
            <div className="relative group">
               <button className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl text-sm hover:bg-slate-800 transition-all shadow-xl">
                  <Globe size={16} className="text-blue-400" />
                  <span className="font-medium">{currentLangObj.name.split(' ')[0]}</span>
               </button>
               <div className="absolute right-0 top-full mt-2 w-56 max-h-96 overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all origin-top-right transform scale-95 group-hover:scale-100">
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setLangCode(l.code)} className={`w-full text-left px-4 py-3 hover:bg-white/10 text-sm flex items-center justify-between border-b border-white/5 last:border-0 ${langCode === l.code ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300'}`}>
                      {l.name}
                      {langCode === l.code && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </header>

        {/* Dynamic Views */}
        <div className="flex-1 relative w-full h-full overflow-hidden mt-20 md:mt-0">
          
          {error && activeTab !== 'map' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-orange-500/90 backdrop-blur border border-orange-500/30 rounded-xl p-3 text-white text-sm flex items-center justify-between shadow-2xl min-w-[300px]">
              <div className="flex items-center gap-3"><AlertTriangle size={16} /> {error}</div>
              <button onClick={() => setError('')} className="hover:text-black/50 ml-4"><VolumeX size={14}/></button>
            </div>
          )}

          {isLoading && !weatherData && activeTab !== 'map' ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-6">
               <div className="relative">
                 <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-ping"></div>
                 <Globe size={64} className="text-blue-500/50 animate-pulse" />
               </div>
               <p className="font-medium tracking-wide">Acquiring satellite data...</p>
             </div>
          ) : (
            <>
              {/* CHAT TAB */}
              <div className={`absolute inset-0 overflow-y-auto p-4 md:p-24 custom-scrollbar transition-opacity duration-300 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                 <div className="h-full flex flex-col max-w-4xl mx-auto w-full pb-4">
                   <Card className="flex-1 flex flex-col overflow-hidden p-0 border-white/10 bg-slate-900/80 shadow-2xl relative">
                     <div className="p-4 md:p-5 border-b border-white/5 bg-black/40 flex items-center justify-between backdrop-blur-md">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                           <Mic size={24} className="text-white" />
                         </div>
                         <div>
                           <h2 className="font-bold text-lg tracking-wide flex items-center gap-2">
                             VoiceGPT <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] uppercase">Multilingual</span>
                           </h2>
                           <p className="text-xs text-slate-400 mt-0.5">Conversational Weather Intelligence</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <button onClick={() => setIsContinuousVoice(!isContinuousVoice)} className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isContinuousVoice ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-transparent border-white/10 text-slate-400 hover:text-white'}`}>
                            <RefreshCw size={14} className={isContinuousVoice ? 'animate-spin-slow' : ''} />
                            {t.continuousMode}
                          </button>
                       </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar relative scroll-smooth">
                       {chatHistory.map((msg, i) => (
                         <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                           <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-4 shadow-md backdrop-blur-sm ${
                             msg.role === 'user' ? 'bg-blue-600/90 text-white rounded-tr-sm' : 'bg-slate-800/80 border border-white/10 text-slate-200 rounded-tl-sm'
                           }`}>
                             <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                             {msg.role === 'ai' && msg.hasCard && weatherData && (
                                <div className="mt-4 p-3 bg-black/30 rounded-xl border border-white/5 flex items-center gap-4">
                                   <WeatherIcon condition={weatherData.current.condition} size={32} />
                                   <div>
                                      <div className="text-xs text-slate-400">{weatherData.name}</div>
                                      <div className="font-bold text-lg">{weatherData.current.temp}°C, {weatherData.current.condition}</div>
                                      <div className="text-xs text-blue-300">Risk: {weatherData.risk.level}</div>
                                   </div>
                                </div>
                             )}
                           </div>
                           <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{msg.role === 'ai' ? 'WeatherGPT' : 'You'}</span>
                         </div>
                       ))}
                       {isAiTyping && (
                         <div className="flex justify-start">
                           <div className="bg-slate-800/80 border border-white/10 rounded-2xl rounded-tl-sm p-5 flex items-center gap-2">
                             <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                             <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                             <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                           </div>
                         </div>
                       )}
                     </div>
                     <div className="p-4 md:p-6 bg-slate-900/90 border-t border-white/10 backdrop-blur-xl rounded-b-2xl">
                       <div className="flex items-center gap-3">
                         <button onClick={toggleListening} className={`relative w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-xl ${
                             voiceState === 'listening' ? 'bg-red-500 scale-110 shadow-red-500/50' : 
                             voiceState === 'speaking' ? 'bg-blue-500 scale-105 shadow-blue-500/50' : 
                             voiceState === 'processing' ? 'bg-purple-500 scale-105 shadow-purple-500/50' :
                             'bg-white/10 hover:bg-white/20 border border-white/20'
                           }`}>
                           {voiceState === 'idle' && <Mic size={24} className="text-blue-400" />}
                           {voiceState === 'listening' && (
                             <><Mic size={24} className="text-white animate-pulse" /><span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-75"></span></>
                           )}
                           {voiceState === 'processing' && <Loader2 size={24} className="text-white animate-spin" />}
                           {voiceState === 'speaking' && <Volume2 size={24} className="text-white animate-pulse" />}
                         </button>
                         <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex-1 relative">
                           <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={voiceState === 'listening' ? t.voiceListening : voiceState === 'processing' ? t.voiceProcessing : t.askAi} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" disabled={isAiTyping || voiceState !== 'idle'}/>
                           <button type="submit" disabled={isAiTyping || !chatInput.trim() || voiceState !== 'idle'} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-blue-500/30 disabled:text-white/30 text-white rounded-xl transition-all"><ChevronRight size={20} /></button>
                         </form>
                       </div>
                     </div>
                   </Card>
                 </div>
              </div>

              {/* DASHBOARD TAB */}
              <div className={`absolute inset-0 overflow-y-auto p-4 md:p-24 custom-scrollbar transition-opacity duration-300 ${activeTab === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                {weatherData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto pb-8">
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-white/10 group min-h-[300px] flex flex-col justify-between p-8">
                      <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                        <WeatherIcon condition={weatherData.current.condition} size={250} />
                      </div>
                      
                      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end h-full flex-1">
                        <div>
                          <div className="flex items-center gap-2 mb-3 text-blue-300">
                            <Navigation size={18} />
                            <span className="font-medium text-lg tracking-wide">{weatherData.name}</span>
                            {isDemoMode && <span className="ml-3 px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-[10px] font-bold tracking-widest uppercase">Demo</span>}
                          </div>
                          <div className="text-8xl md:text-9xl font-light tracking-tighter mb-2 text-white">
                            {weatherData.current.temp}°
                          </div>
                          <div className="text-2xl text-blue-200 font-medium">
                            {weatherData.current.condition}
                          </div>
                        </div>
                        
                        <div className="mt-8 md:mt-0 bg-black/40 backdrop-blur-xl rounded-2xl p-5 border border-white/10 flex gap-8 w-full md:w-auto shadow-2xl">
                           <div>
                             <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{t.feelsLike}</div>
                             <div className="text-xl font-semibold text-white">{weatherData.current.feels}°</div>
                           </div>
                           <div className="w-px bg-white/10"></div>
                           <div>
                             <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{t.riskLevel}</div>
                             <div className={`text-xl font-bold tracking-wide ${weatherData.risk.score > 80 ? 'text-purple-400' : weatherData.risk.score > 60 ? 'text-red-400' : weatherData.risk.score > 40 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                {weatherData.risk.level}
                             </div>
                           </div>
                        </div>
                      </div>
                    </Card>

                    {aiSummary && (
                      <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-lg shadow-blue-500/5">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <Activity className="text-blue-400" size={20} />
                        </div>
                        <div>
                          <h5 className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">{t.aiInsight} (Profile: {alertPrefs.profile})</h5>
                          <p className="text-[15px] text-slate-200 leading-relaxed font-medium">{aiSummary}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { icon: Droplets, label: t.humidity, value: `${weatherData.current.humidity}%`, color: 'text-blue-400' },
                        { icon: Wind, label: t.wind, value: `${weatherData.current.wind} km/h`, color: 'text-teal-400' },
                        { icon: Sun, label: t.uvIndex, value: weatherData.current.uv, color: 'text-yellow-400' },
                        { icon: CloudRain, label: 'Rain Prob', value: `${weatherData.current.rainProb}%`, color: 'text-indigo-400' }
                      ].map((stat, i) => (
                        <Card key={i} className="p-5 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                            <stat.icon size={18} className={`${stat.color} group-hover:scale-110 transition-transform`} />
                            {stat.label}
                          </div>
                          <div className="text-2xl font-bold">{stat.value}</div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Card className="flex flex-col h-full max-h-[400px]">
                      <h3 className="font-semibold text-xs uppercase tracking-wider mb-5 flex items-center gap-2 text-slate-300">
                        <Activity size={16} className="text-blue-400" /> Forecast
                      </h3>
                      
                      <div className="flex-1 flex flex-col gap-6 justify-center">
                        {weatherData.forecast.map((day, i) => (
                          <div key={i} className="flex items-center justify-between group">
                            <span className="w-24 text-[15px] font-medium text-slate-300 group-hover:text-white transition-colors">{day.day}</span>
                            <WeatherIcon condition={day.condition} size={24} />
                            <div className="flex-1 mx-6 flex items-center gap-3">
                              <span className="text-sm text-slate-400 w-6 text-right">{day.min}°</span>
                              <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-orange-400 rounded-full opacity-80" style={{ width: `${Math.min(100, (day.temp - 10) * 3)}%`, marginLeft: `${Math.max(0, (day.min - 10) * 3)}%` }}></div>
                              </div>
                              <span className="text-sm font-bold w-6">{day.temp}°</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {weatherData.risk.reasons.length > 0 && (
                      <Card className="border-orange-500/20 bg-orange-500/5">
                         <h3 className="font-semibold text-xs uppercase tracking-wider mb-4 text-orange-400 flex items-center gap-2">
                           <AlertTriangle size={16}/> Active Risk Factors
                         </h3>
                         <ul className="space-y-3 text-sm text-slate-200">
                           {weatherData.risk.reasons.map((r, i) => (
                             <li key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                               <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.8)]"></div>
                               {r}
                             </li>
                           ))}
                         </ul>
                      </Card>
                    )}
                  </div>
                </div>
                )}
              </div>

              {/* MAP TAB */}
              <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'map' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                 <div ref={mapContainerRef} className="w-full h-full bg-slate-800" />
                 
                 {activeTab === 'map' && (
                 <>
                   <div className="absolute top-24 md:top-6 right-4 z-[1000] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl animate-in fade-in slide-in-from-right">
                     <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                       <Layers size={14} /> Map Layers
                     </div>
                     <button className="flex items-center justify-between gap-4 text-sm text-white bg-blue-500/20 px-3 py-2.5 rounded-xl border border-blue-500/30">
                       <span>Base Map</span>
                       <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                     </button>
                     <button className="flex items-center justify-between gap-4 text-sm text-slate-500 px-3 py-2.5 rounded-xl cursor-not-allowed group">
                       <span>Precipitation</span>
                       <Lock size={14} className="group-hover:text-slate-400 transition-colors" />
                     </button>
                   </div>

                   {weatherData && (
                   <div className="absolute bottom-6 left-4 right-4 md:bottom-auto md:top-24 md:left-6 md:right-auto md:w-[340px] z-[1000] animate-in fade-in slide-in-from-bottom md:slide-in-from-left">
                     <Card className="bg-slate-900/95 border-white/10 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden">
                        
                        <div className="p-5 border-b border-white/5">
                           <div className="flex items-start justify-between mb-4">
                             <div>
                               <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                  <MapPin size={18} className="text-blue-400" /> {weatherData.name.split(',')[0]}
                               </h3>
                               <p className="text-xs text-slate-400 mt-1">{weatherData.name.split(',').slice(1).join(',')}</p>
                             </div>
                             <WeatherIcon condition={weatherData.current.condition} size={40} />
                           </div>

                           <div className="flex items-end gap-3 mb-2">
                             <div className="text-5xl font-light text-white">{weatherData.current.temp}°</div>
                             <div className="text-sm text-slate-400 mb-1 pb-1">{weatherData.current.condition}</div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-px bg-white/5">
                          <div className="bg-slate-900/50 p-4">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Droplets size={12}/> Rain Prob</div>
                            <div className="text-lg font-semibold text-white">{weatherData.current.rainProb}%</div>
                          </div>
                          <div className="bg-slate-900/50 p-4">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Wind size={12}/> Wind</div>
                            <div className="text-lg font-semibold text-white">{weatherData.current.wind} km/h</div>
                          </div>
                        </div>

                        <div className="p-4 border-t border-white/5">
                           <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-slate-400 uppercase tracking-wider">AI Risk Analysis</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                weatherData.risk.score > 80 ? 'bg-red-500/20 text-red-400' : 
                                weatherData.risk.score > 60 ? 'bg-orange-500/20 text-orange-400' : 
                                weatherData.risk.score > 40 ? 'bg-yellow-500/20 text-yellow-400' : 
                                'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                {weatherData.risk.level}
                              </span>
                           </div>

                           <button 
                             onClick={() => askAboutLocation(weatherData.name)}
                             className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
                           >
                             <MessageSquare size={16} /> Ask WeatherGPT
                           </button>
                        </div>
                     </Card>
                   </div>
                   )}
                 </>
                 )}
              </div>

              {/* CLIMATE TAB */}
              <div className={`absolute inset-0 overflow-y-auto p-4 md:p-8 custom-scrollbar transition-opacity duration-300 ${activeTab === 'climate' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                 {climateData ? (
                 <div className="max-w-7xl mx-auto space-y-6 pb-20">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl mt-12 md:mt-0">
                       <div>
                         <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                           <History className="text-blue-400" /> Climate Intelligence
                         </h2>
                         <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                           <MapPin size={14} /> {climateData.location.split(',')[0]} <span className="mx-2">•</span> <Calendar size={14} /> {climateData.period}
                         </p>
                       </div>
                    </div>
                    {/* Simplified for space, keeping logic intact */}
                 </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-ping"></div>
                        <History size={64} className="text-blue-500/50 animate-pulse" />
                      </div>
                      <p className="font-medium tracking-wide">Acquiring historical climate data...</p>
                    </div>
                 )}
              </div>

              {/* ALERTS TAB */}
              <div className={`absolute inset-0 overflow-y-auto p-4 md:p-8 custom-scrollbar transition-opacity duration-300 ${activeTab === 'alerts' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                 <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-20 mt-12 md:mt-0">
                    
                    {/* Left Column: Active & History */}
                    <div className="lg:col-span-2 space-y-6">
                       <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold flex items-center gap-2">
                             <ShieldAlert className="text-red-400" /> Active Alerts
                          </h2>
                          {activeAlerts.length > 0 && (
                             <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold tracking-wider">
                               {activeAlerts.length} ACTIVE
                             </span>
                          )}
                       </div>

                       {activeAlerts.length === 0 ? (
                          <Card className="flex flex-col items-center justify-center h-48 border-dashed border-white/20 bg-transparent text-slate-400">
                             <CheckCircle2 size={40} className="mb-4 text-emerald-500/50" />
                             <p className="font-medium">No active weather alerts for your locations.</p>
                             <p className="text-xs mt-2 opacity-70">We are monitoring conditions based on your profile.</p>
                          </Card>
                       ) : (
                          <div className="space-y-4">
                             {activeAlerts.map(alert => (
                                <Card key={alert.id} className={`border-l-4 p-5 ${alert.severity === 'EXTREME' || alert.severity === 'HIGH' ? 'border-l-red-500 bg-red-950/20' : 'border-l-orange-500 bg-orange-950/20'}`}>
                                   <div className="flex justify-between items-start mb-4">
                                      <div>
                                         <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${alert.severity === 'EXTREME' || alert.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                               {alert.severity} RISK
                                            </span>
                                            <span className="text-[10px] text-slate-400 bg-black/30 px-2 py-0.5 rounded">{alert.time}</span>
                                            {alert.source === 'DEMO ALERT' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">DEMO</span>}
                                         </div>
                                         <h3 className="text-xl font-bold">{alert.hazard}</h3>
                                         <p className="text-sm text-slate-400 flex items-center gap-1 mt-1"><MapPin size={12}/> {alert.location}</p>
                                      </div>
                                      <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-slate-800 bg-slate-900 text-sm font-bold">
                                         {alert.score}
                                      </div>
                                   </div>
                                   <div className="bg-black/30 rounded-xl p-4 text-sm text-slate-200 border border-white/5 mb-4">
                                      <strong className="text-white block mb-1">Advice:</strong>
                                      {alert.advice}
                                   </div>
                                   <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Source: {alert.source}</span>
                                      <button onClick={() => resolveAlert(alert.id)} className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                                         <CheckCircle2 size={14} /> Mark Resolved
                                      </button>
                                   </div>
                                </Card>
                             ))}
                          </div>
                       )}

                       <h3 className="text-lg font-bold flex items-center gap-2 mt-10 mb-4">
                          <History size={18} className="text-slate-400" /> Alert History
                       </h3>
                       <div className="space-y-3">
                          {alertHistory.map(hist => (
                             <div key={hist.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl opacity-70 hover:opacity-100 transition-opacity">
                                <div>
                                   <div className="font-medium">{hist.hazard} <span className="text-xs text-slate-400 font-normal ml-2">in {hist.location}</span></div>
                                   <div className="text-xs text-slate-500 mt-1">{hist.date} • {hist.severity} RISK</div>
                                </div>
                                <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">RESOLVED</span>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Right Column: Settings & Locations */}
                    <div className="space-y-6">
                       <Card className="bg-slate-900/95 border-white/10 backdrop-blur-2xl">
                          <h3 className="font-semibold text-sm uppercase tracking-wider mb-5 flex items-center gap-2 text-slate-300">
                             <Settings2 size={16} className="text-blue-400" /> Alert Preferences
                          </h3>
                          
                          <div className="space-y-5">
                             <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">User Profile</label>
                                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-1">
                                   {['General', 'Student', 'Farmer', 'Traveller'].map(prof => (
                                      <button key={prof} onClick={() => setAlertPrefs({...alertPrefs, profile: prof})} className={`flex-1 text-xs py-2 rounded-lg font-medium transition-all ${alertPrefs.profile === prof ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                         {prof}
                                      </button>
                                   ))}
                                </div>
                             </div>

                             <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block flex justify-between">
                                   <span>Alert Threshold</span>
                                   <span className="text-blue-400 font-bold">{alertPrefs.threshold === 40 ? 'ELEVATED (40+)' : alertPrefs.threshold === 60 ? 'HIGH (60+)' : 'EXTREME (80+)'}</span>
                                </label>
                                <input type="range" min="40" max="80" step="20" value={alertPrefs.threshold} onChange={(e) => setAlertPrefs({...alertPrefs, threshold: parseInt(e.target.value)})} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                             </div>

                             <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider mb-3 block">Monitor Hazards</label>
                                <div className="grid grid-cols-2 gap-3">
                                   {Object.entries(alertPrefs.types).map(([key, val]) => (
                                      <button key={key} onClick={() => setAlertPrefs(p => ({...p, types: {...p.types, [key]: !val}}))} className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${val ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-transparent border-white/10 text-slate-500'}`}>
                                         <div className={`w-3 h-3 rounded-full ${val ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                                         <span className="capitalize">{key}</span>
                                      </button>
                                   ))}
                                </div>
                             </div>

                             <div className="pt-4 border-t border-white/10">
                                <button onClick={requestNotificationPermission} disabled={notiPermission === 'granted'} className={`w-full py-3 rounded-xl text-sm font-medium transition-all border ${notiPermission === 'granted' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default' : 'bg-blue-600 hover:bg-blue-500 border-transparent text-white'}`}>
                                   {notiPermission === 'granted' ? 'Notifications Enabled' : 'Enable Browser Notifications'}
                                </button>
                                <p className="text-[9px] text-slate-500 mt-2 text-center">Note: Background alerts require an active browser tab or backend push service.</p>
                             </div>

                             {isDemoMode && (
                                <button onClick={simulateDemoAlert} className="w-full py-3 rounded-xl text-sm font-bold bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30 transition-all mt-4">
                                   Simulate Demo Alert (SIH)
                                </button>
                             )}
                          </div>
                       </Card>

                       <Card className="bg-slate-900/95 border-white/10 backdrop-blur-2xl">
                          <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 flex items-center justify-between text-slate-300">
                             <div className="flex items-center gap-2"><MapPin size={16} className="text-emerald-400" /> Saved Locations</div>
                             <button className="p-1 bg-white/5 hover:bg-white/10 rounded-md transition-colors"><Plus size={14}/></button>
                          </h3>
                          <div className="space-y-3">
                             {savedLocations.map(loc => (
                                <div key={loc.id} className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5 group">
                                   <div>
                                      <div className="font-medium text-sm flex items-center gap-2">
                                         {loc.type === 'Home' ? <User size={12} className="text-blue-400"/> : <MapPin size={12} className="text-emerald-400"/>}
                                         {loc.type}
                                      </div>
                                      <div className="text-xs text-slate-400 mt-0.5">{loc.name}</div>
                                   </div>
                                   <button className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                      <Trash2 size={14}/>
                                   </button>
                                </div>
                             ))}
                          </div>
                       </Card>
                    </div>

                 </div>
              </div>

            </>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes rain { 0% { background-position: 0 0; } 100% { background-position: 20px 100vh; } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 70% { box-shadow: 0 0 0 10px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
        .leaflet-container { background: #0f172a !important; font-family: inherit !important; z-index: 1; }
        .leaflet-control-zoom { border: 1px solid rgba(255,255,255,0.1) !important; overflow: hidden; border-radius: 12px !important; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5) !important; }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out { background-color: rgba(15, 23, 42, 0.9) !important; color: white !important; border-color: rgba(255,255,255,0.1) !important; transition: all 0.2s; }
        .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover { background-color: rgba(59, 130, 246, 0.2) !important; color: #60a5fa !important; }
        .leaflet-bottom.leaflet-right { margin-bottom: 20px; margin-right: 20px; }
        .custom-leaflet-marker { background: transparent; border: none; }
      `}} />
    </div>
  );
}