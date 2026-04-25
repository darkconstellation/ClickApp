import CryptoJS from 'crypto-js'

// Simple symmetric key for prototype (E2E simulation)
const SECRET = 'CLICKFIRE_P2P_SECRET_KEY_889900'

export const encryptBlob = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const wordArray = CryptoJS.lib.WordArray.create(reader.result)
      const encrypted = CryptoJS.AES.encrypt(wordArray, SECRET).toString()
      const encryptedBlob = new Blob([encrypted], { type: 'text/plain' })
      resolve({ encryptedBlob, originalType: file.type })
    }
    reader.onerror = error => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

export const decryptBlob = async (encryptedText, originalType) => {
  const decrypted = CryptoJS.AES.decrypt(encryptedText, SECRET)
  const words = decrypted.words
  const sigBytes = decrypted.sigBytes
  const u8 = new Uint8Array(sigBytes)
  
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  
  return new Blob([u8], { type: originalType })
}
