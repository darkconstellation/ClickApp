import { getApps, initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyBhXVdninZaditDnGBLzhDKwWu3Fh416fI',
  authDomain: 'orion-rftuning-id.firebaseapp.com',
  projectId: 'orion-rftuning-id',
  storageBucket: 'orion-rftuning-id.firebasestorage.app',
  messagingSenderId: '836241223760',
  appId: '1:836241223760:web:00302912ce1e9f6c676155',
  databaseURL: 'https://orion-rftuning-id-default-rtdb.asia-southeast1.firebasedatabase.app/',
}

// Prevent duplicate app initialization on hot module reload
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let db = null

try {
  db = getDatabase(firebaseApp)
} catch (error) {
  // Keep the SPA running even if RTDB is temporarily unavailable.
  console.error('[Firebase] Realtime Database init failed:', error)
}

export { db }
export const isDbAvailable = () => db !== null

export default async () => {}
