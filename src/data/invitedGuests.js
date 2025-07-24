// Elimina o comenta el import del data.js
// import { invitedGuests } from './data/invitedGuests.js';

// Agrega Firebase
import { db } from './config/firebase'; // Copia el mismo firebase.js
import { collection, query, where, getDocs } from 'firebase/firestore';

// Nueva función para verificar invitados
const verificarInvitado = async (nombreIngresado) => {
  try {
    const q = query(
      collection(db, 'invited_guests'),
      where('name', '==', nombreIngresado.trim())
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error verificando invitado:', error);
    return false;
  }
};