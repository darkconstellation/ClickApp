import { db } from 'src/boot/firebase'
import { ref as dbRef, set, onValue, off } from 'firebase/database'

export const sendSignal = (receiverId, isPing = false) => {
  if (!db) {
    return
  }

  const signalRef = dbRef(db, `signals/${receiverId}`)
  set(signalRef, { timestamp: Date.now(), isPing })
}

export const listenForSignal = (userId, callback) => {
  if (!db) {
    return () => {}
  }

  const signalRef = dbRef(db, `signals/${userId}`)

  onValue(signalRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val())
    }
  })

  return () => {
    off(signalRef)
  }
}
