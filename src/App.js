import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, serverTimestamp } from 'firebase/firestore';
// NOTA: 'howler' è stato rimosso per garantire stabilità, come discusso.

// CONFIGURAZIONE FIREBASE - Queste variabili verranno iniettate dall'ambiente
const firebaseConfig = {
  apiKey: "AIzaSyC1lKVrPH2de6Zxhvl7olDUJX84jXRGieo",
  authDomain: "tira-dadi-23da1.firebaseapp.com",
  projectId: "tira-dadi-23da1",
  storageBucket: "tira-dadi-23da1.firebasestorage.app",
  messagingSenderId: "1089973461124",
  appId: "1:1089973461124:web:26de6890848f0b6245e2d1",
  measurementId: "G-4STSQHYW0K"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-dice-roller-app';

// Inizializzazione Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- COMPONENTI UI ---

const Die = ({ type, value, size = 'w-16 h-16', textSize = 'text-xl' }) => {
    const styles = {
        4: { bg: 'bg-red-800', text: 'text-white', shape: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
        6: { bg: 'bg-green-600', text: 'text-white', shape: 'rect(0,0,100%,100%)' },
        8: { bg: 'bg-pink-400', text: 'text-black', shape: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
        10: { bg: 'bg-black', text: 'text-white', shape: 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)' },
        12: { bg: 'bg-orange-500', text: 'text-black', shape: 'polygon(50% 0, 90% 25%, 90% 75%, 50% 100%, 10% 75%, 10% 25%)' },
        20: { bg: 'bg-blue-600', text: 'text-white', shape: 'polygon(50% 0%, 83% 12%, 100% 43%, 94% 78%, 68% 100%, 32% 100%, 6% 78%, 0% 43%, 17% 12%)' },
        100: { bg: 'bg-white', text: 'text-black', border: 'border-2 border-black', shape: 'circle(50% at 50% 50%)' },
    };
    const style = styles[type] || styles[6];
    const dieStyle = { clipPath: style.shape };

    return (
        <div className={`relative ${size} flex items-center justify-center rounded-lg shadow-md transition-transform transform hover:scale-105 ${style.bg} ${style.border || ''}`} style={dieStyle}>
            <span className={`font-bold ${textSize} ${style.text}`}>{value !== undefined ? value : type}</span>
        </div>
    );
};


const LoginPage = ({ onJoinRoom }) => {
    const [roomName, setRoomName] = useState('');
    const [nick, setNick] = useState('');
    const [roomStatus, setRoomStatus] = useState('unchecked');
    const [errors, setErrors] = useState({});
    const [isCheckingRoom, setIsCheckingRoom] = useState(false);

    const getSavedNicks = () => {
        try {
            const nicks = localStorage.getItem('diceRollerNicks');
            return nicks ? JSON.parse(nicks) : {};
        } catch (e) { return {}; }
    };

    const handleRoomNameChange = (e) => {
        const value = e.target.value;
        setRoomName(value);
        if (value.length > 30) {
            setErrors(prev => ({ ...prev, roomName: 'Massimo 30 caratteri' }));
        } else {
            setErrors(prev => ({ ...prev, roomName: null }));
            const savedNicks = getSavedNicks();
            setNick(savedNicks[value] || '');
        }
    };

    const handleNickChange = (e) => {
        const value = e.target.value;
        setNick(value);
        if (value.length > 15) {
            setErrors(prev => ({ ...prev, nick: 'Massimo 15 caratteri' }));
        } else {
            setErrors(prev => ({ ...prev, nick: null }));
        }
    };

    useEffect(() => {
        if (!roomName || errors.roomName) {
            setRoomStatus('unchecked');
            return;
        }
        
        setIsCheckingRoom(true);
        const handler = setTimeout(async () => {
            const roomRef = doc(db, `artifacts/${appId}/public/data/diceRooms`, roomName);
            try {
                const docSnap = await getDoc(roomRef);
                setRoomStatus(docSnap.exists() ? 'exists' : 'not_exists');
            } catch (error) {
                console.error("Errore nel controllo della stanza:", error);
                setRoomStatus('unchecked');
            } finally {
                setIsCheckingRoom(false);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [roomName, errors.roomName]);

    const canSubmit = roomName && nick && !errors.roomName && !errors.nick && roomStatus !== 'unchecked' && !isCheckingRoom;
    const buttonText = roomStatus === 'exists' ? `VAI A "${roomName}"` : `CREA "${roomName}"`;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        
        const savedNicks = getSavedNicks();
        savedNicks[roomName] = nick;
        localStorage.setItem('diceRollerNicks', JSON.stringify(savedNicks));
        onJoinRoom(roomName, nick, roomStatus === 'not_exists');
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-12">APP-TIRA-DADI</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="roomName" className="block text-lg font-medium text-gray-700 mb-2">Nome Stanza</label>
                        <input id="roomName" type="text" value={roomName} onChange={handleRoomNameChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg" placeholder="Scrivi qui..." />
                        {errors.roomName && <p className="text-red-500 text-sm mt-1">{errors.roomName}</p>}
                    </div>
                    <div>
                        <label htmlFor="nick" className="block text-lg font-medium text-gray-700 mb-2">Nick Utente</label>
                        <input id="nick" type="text" value={nick} onChange={handleNickChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg" placeholder="Il tuo nome nel gioco" />
                        {errors.nick && <p className="text-red-500 text-sm mt-1">{errors.nick}</p>}
                    </div>
                    <div className="pt-6">
                        <button type="submit" disabled={!canSubmit} className={`w-full px-6 py-4 text-xl font-bold text-white rounded-lg shadow-lg transition-all duration-300 transform ${!canSubmit ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 active:scale-95'}`}>
                            {isCheckingRoom ? 'Verifica...' : (canSubmit ? buttonText : ' ')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RoomPage = ({ roomName, nick, onLeave }) => {
    const [roomData, setRoomData] = useState(null);
    const [dicePool, setDicePool] = useState([]);
    const [isRolling, setIsRolling] = useState(false);
    // STATI AGGIORNATI per la nuova animazione
    const [rollingDice, setRollingDice] = useState(null); // Solo per i dadi che rotolano
    const [finalTotal, setFinalTotal] = useState(null); // Solo per il numero finale

    const diceTypes = [4, 6, 8, 10, 12, 20, 100];

    // Stile per l'animazione zoom-in del risultato
    const animationStyle = `
        @keyframes zoom-in {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-zoom-in {
            animation: zoom-in 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
    `;

    const getNickColor = useCallback((str) => {
        let hash = 0;
        if (!str) return '#000000';
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            value = Math.floor(value * 0.6); 
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }, []);

    const nickColor = useMemo(() => getNickColor(nick), [nick, getNickColor]);

    useEffect(() => {
        const roomRef = doc(db, `artifacts/${appId}/public/data/diceRooms`, roomName);
        const unsubscribe = onSnapshot(roomRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.history) {
                    data.history = data.history.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                }
                setRoomData(data);
            }
        });
        return () => unsubscribe();
    }, [roomName]);

    const reRollFromHistory = (roll) => {
        if (isRolling) return;
        const newPool = roll.rolls.map(r => ({ type: r.type, id: crypto.randomUUID() })).sort((a, b) => a.type - b.type);
        setDicePool(newPool);
    };

    const addDieToPool = (type) => {
        if (isRolling) return;
        const newPool = [...dicePool, { type, id: crypto.randomUUID() }].sort((a, b) => a.type - b.type);
        setDicePool(newPool);
    };

    const removeDieFromPool = (index) => {
        if (isRolling) return;
        const newPool = [...dicePool];
        newPool.splice(index, 1);
        setDicePool(newPool);
    };
    
    // LOGICA DI LANCIO AGGIORNATA
    const handleRoll = async () => {
        if (isRolling || dicePool.length === 0) return;

        setIsRolling(true);
        setFinalTotal(null); // Pulisce il risultato precedente
        
        const animationDuration = 3000;
        const updateInterval = 100;
        let animationTime = 0;

        const intervalId = setInterval(() => {
            animationTime += updateInterval;
            
            // Mostra solo i dadi con numeri che cambiano, senza "???"
            const tempRolls = dicePool.map(d => ({
                ...d,
                value: Math.floor(Math.random() * d.type) + 1
            }));
            setRollingDice(tempRolls);
            
            if (animationTime >= animationDuration) {
                clearInterval(intervalId);
                
                // Calcola il risultato finale
                const finalRolls = dicePool.map(d => ({
                    ...d,
                    value: Math.floor(Math.random() * d.type) + 1
                }));
                const total = finalRolls.reduce((sum, r) => sum + r.value, 0);
                
                // Nasconde i dadi che rotolano e mostra solo il totale finale
                setRollingDice(null);
                setFinalTotal(total);

                // Salva la cronologia
                const newRoll = {
                    nick, nickColor, rolls: finalRolls, total,
                    timestamp: new Date(), id: Date.now() + Math.random().toString()
                };
                const roomRef = doc(db, `artifacts/${appId}/public/data/diceRooms`, roomName);
                updateDoc(roomRef, { history: arrayUnion(newRoll) }).catch(console.error);

                // Pulisce l'interfaccia dopo 3 secondi
                setTimeout(() => {
                    setFinalTotal(null);
                    setDicePool([]);
                    setIsRolling(false);
                }, 3000);
            }
        }, updateInterval);
    };
    
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '...';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date)) return '...';

        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('it-IT', { month: 'short' }).replace('.', '');
        const year = date.getFullYear();
        const time = date.toLocaleTimeString('it-IT');
        return `${day}/${month}/${year} - ${time}`;
    };

    if (!roomData) {
        return <div className="flex justify-center items-center h-screen bg-white text-gray-800">Caricamento stanza...</div>;
    }

    return (
        <>
            <style>{animationStyle}</style>
            <div className="min-h-screen bg-white text-black font-sans flex flex-col md:flex-row">
                <div className="flex-grow p-4 md:p-8 flex flex-col">
                    <header className="relative text-center mb-6">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-wider uppercase">{roomName}</h1>
                        <button onClick={onLeave} className="absolute top-0 left-0 mt-2 ml-2 text-sm text-blue-600 hover:underline">&larr; Cambia Stanza</button>
                    </header>

                    <section className="mb-6">
                        <h2 className="text-xl font-semibold text-center mb-4">Seleziona i dadi</h2>
                        <div className="flex flex-wrap justify-center gap-3">
                            {diceTypes.map(type => (
                                <button key={type} onClick={() => addDieToPool(type)} disabled={isRolling}>
                                    <Die type={type} />
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="flex-grow flex flex-col items-center mb-6">
                        <h3 className="text-lg font-medium mb-3">Dadi selezionati ({dicePool.length})</h3>
                        <div className="w-full min-h-[80px] bg-gray-100 rounded-lg p-3 flex flex-wrap justify-center items-center gap-2 overflow-y-auto">
                            {dicePool.length === 0 ? (
                                <p className="text-gray-500">Clicca un dado per aggiungerlo</p>
                            ) : (
                                dicePool.map((die, index) => (
                                    <button key={die.id} onClick={() => removeDieFromPool(index)} disabled={isRolling}>
                                        <Die type={die.type} size="w-12 h-12" textSize="text-base" />
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                    
                    {/* NUOVA SEZIONE RISULTATO */}
                    <footer className="text-center">
                        <button onClick={handleRoll} disabled={isRolling || dicePool.length === 0} className="w-full max-w-xs px-8 py-4 text-2xl font-bold text-white bg-red-600 rounded-lg shadow-lg transition-all duration-300 transform hover:bg-red-700 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {isRolling ? 'Lancio...' : 'LANCIA!'}
                        </button>
                        <div className="mt-4 min-h-[100px] flex items-center justify-center">
                            {rollingDice && (
                                <div className="flex justify-center items-center gap-2 animate-pulse">
                                    {rollingDice.map((r, i) => <Die key={i} type={r.type} value={r.value} size="w-10 h-10" textSize="text-sm" />)}
                                </div>
                            )}
                            {finalTotal !== null && (
                                <div className="text-8xl font-bold text-center text-gray-800 animate-zoom-in">
                                  {finalTotal}
                                </div>
                            )}
                        </div>
                    </footer>
                </div>

                <aside className="w-full md:w-80 lg:w-96 bg-gray-50 border-l border-gray-200 flex flex-col h-[50vh] md:h-screen">
                    <h2 className="text-2xl font-bold text-center p-4 border-b bg-white">CRONOLOGIA</h2>
                    <div className="flex-grow overflow-y-auto p-3 space-y-4">
                        {roomData?.history?.length > 0 ? (
                            roomData.history.map(roll => (
                                <div key={roll.id} onClick={() => reRollFromHistory(roll)} className="bg-white p-3 rounded-lg shadow-sm border cursor-pointer hover:bg-gray-100 transition-colors">
                                    <p className="text-xs text-gray-500 mb-1">{formatTimestamp(roll.timestamp)}</p>
                                    <p className="mb-2 break-words">
                                        <span className="font-bold" style={{ color: roll.nickColor }}>{roll.nick}</span> ha lanciato:
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        {roll.rolls.map((r, i) => <Die key={i} type={r.type} value={r.value} size="w-8 h-8" textSize="text-xs" />)}
                                        <span className="text-lg font-bold mx-1">=</span>
                                        <span className="text-2xl font-bold">{roll.total}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 mt-8">Nessun lancio ancora.<br/>Sii il primo!</p>
                        )}
                    </div>
                </aside>
            </div>
        </>
    );
};


export default function App() {
    const [page, setPage] = useState('login');
    const [roomName, setRoomName] = useState(null);
    const [nick, setNick] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const initialToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (initialToken) {
                    await signInWithCustomToken(auth, initialToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Errore di autenticazione:", error);
                if (!auth.currentUser) {
                    await signInAnonymously(auth).catch(e => console.error("Fallback anonimo fallito", e));
                }
            }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUserId(user ? user.uid : null);
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const handleJoinRoom = async (joinedRoomName, userNick, isNewRoom) => {
        if (!isAuthReady || !userId) {
            console.error("Autenticazione non ancora pronta.");
            return;
        }
        
        const roomRef = doc(db, `artifacts/${appId}/public/data/diceRooms`, joinedRoomName);
        
        if (isNewRoom) {
            try {
                await setDoc(roomRef, {
                    name: joinedRoomName,
                    createdAt: serverTimestamp(),
                    history: [],
                    users: {}
                });
            } catch (error) {
                console.error("Errore nella creazione della stanza:", error);
                return;
            }
        }
        
        setRoomName(joinedRoomName);
        setNick(userNick);
        window.location.hash = joinedRoomName;
        setPage('room');
    };

    const handleLeaveRoom = () => {
        setPage('login');
        setRoomName(null);
        setNick(null);
        window.location.hash = '';
    };
    
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            if (!hash) {
                 handleLeaveRoom();
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!isAuthReady) {
        return <div className="flex justify-center items-center h-screen bg-white text-gray-800">Inizializzazione...</div>;
    }

    if (page === 'room' && roomName && nick) {
        return <RoomPage roomName={roomName} nick={nick} onLeave={handleLeaveRoom} />;
    }

    return <LoginPage onJoinRoom={handleJoinRoom} />;
}
