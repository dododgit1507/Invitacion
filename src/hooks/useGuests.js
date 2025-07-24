import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
// ❌ ELIMINADO: import { invitadosPermitidos } from '../data/invitedGuests';

export const useGuests = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  // ✅ NUEVO: Estado para lista de invitados desde Firebase
  const [invitadosPermitidos, setInvitadosPermitidos] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'guests'), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const guestsData = [];
      querySnapshot.forEach((doc) => {
        guestsData.push({ id: doc.id, ...doc.data() });
      });
      setGuests(guestsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ NUEVO: Cargar lista de invitados desde Firebase
  useEffect(() => {
    const loadInvitedGuests = async () => {
      try {
        const q = query(collection(db, 'invited_guests'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        const invitados = [];
        querySnapshot.forEach((doc) => {
          invitados.push(doc.data().name);
        });
        setInvitadosPermitidos(invitados);
      } catch (error) {
        console.error('Error cargando invitados:', error);
      }
    };

    loadInvitedGuests();
  }, []);

  // ✅ MODIFICADO: Ahora es asíncrona y busca en Firebase
  const buscarInvitado = async (nombreBuscado) => {
    if (!nombreBuscado || nombreBuscado.trim().length < 3) {
      return null;
    }

    // Si ya tenemos la lista cargada, buscar localmente (más rápido)
    if (invitadosPermitidos.length > 0) {
      const nombreLimpio = nombreBuscado.trim().toLowerCase();
      
      // Buscar coincidencia exacta o parcial
      const invitadoEncontrado = invitadosPermitidos.find(invitado => {
        const invitadoLimpio = invitado.toLowerCase();
        
        // Coincidencia exacta
        if (invitadoLimpio === nombreLimpio) return true;
        
        // Coincidencia parcial (nombre contiene lo buscado)
        if (invitadoLimpio.includes(nombreLimpio)) return true;
        
        // Coincidencia por palabras (ej: buscar "María García" con "maría")
        const palabrasBuscadas = nombreLimpio.split(' ');
        const palabrasInvitado = invitadoLimpio.split(' ');
        
        return palabrasBuscadas.every(palabra => 
          palabrasInvitado.some(palabraInv => palabraInv.includes(palabra))
        );
      });

      return invitadoEncontrado || null;
    }

    // Si no tenemos la lista cargada, consultar Firebase directamente
    try {
      const q = query(collection(db, 'invited_guests'));
      const querySnapshot = await getDocs(q);
      const nombreLimpio = nombreBuscado.trim().toLowerCase();
      
      for (const docSnap of querySnapshot.docs) {
        const invitado = docSnap.data().name;
        const invitadoLimpio = invitado.toLowerCase();
        
        // Misma lógica de búsqueda
        if (invitadoLimpio === nombreLimpio || 
            invitadoLimpio.includes(nombreLimpio)) {
          return invitado;
        }
        
        const palabrasBuscadas = nombreLimpio.split(' ');
        const palabrasInvitado = invitadoLimpio.split(' ');
        
        const coincide = palabrasBuscadas.every(palabra => 
          palabrasInvitado.some(palabraInv => palabraInv.includes(palabra))
        );
        
        if (coincide) return invitado;
      }
      
      return null;
    } catch (error) {
      console.error('Error buscando invitado:', error);
      return null;
    }
  };

  // ✅ MANTIENE IGUAL: Verificar si ya confirmó
  const yaConfirmo = (nombreInvitado) => {
    return guests.find(guest => 
      guest.name.toLowerCase() === nombreInvitado.toLowerCase()
    );
  };

  // ✅ MANTIENE IGUAL: Función para enviar datos a n8n
  const sendToN8N = async (guestData) => {
    try {
      const response = await fetch('https://n8n-jose.up.railway.app/webhook/guest-rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: guestData.confirmed ? 'guest_confirmed' : 'guest_declined',
          timestamp: new Date().toISOString(),
          guest: guestData,
          event: {
            name: 'Boda de Papel - Alexandra & Stefan',
            date: '30 agosto 2025',
            location: 'Los Eucaliptos 233, Santiago de Surco'
          }
        })
      });

      if (response.ok) {
        console.log('✅ Datos enviados a n8n exitosamente');
      }
    } catch (error) {
      console.error('❌ Error enviando a n8n:', error);
    }
  };

  // ✅ MODIFICADO: Ahora buscarInvitado es async
  const addGuest = async (guestData) => {
    try {
      // VALIDAR que esté en la lista de invitados
      const invitadoValido = await buscarInvitado(guestData.name); // ← Ahora con await
      if (!invitadoValido) {
        throw new Error('No estás en la lista de invitados');
      }

      // VALIDAR que no haya confirmado ya
      const yaConfirmado = yaConfirmo(guestData.name);
      if (yaConfirmado) {
        throw new Error('Ya confirmaste tu asistencia anteriormente');
      }

      // Guardar en Firebase con el nombre exacto de la lista
      const docRef = await addDoc(collection(db, 'guests'), {
        ...guestData,
        name: invitadoValido, // Usar nombre exacto de la lista
        createdAt: serverTimestamp()
      });

      console.log('🔥 Guest guardado en Firebase con ID:', docRef.id);

      // Enviar a n8n
      await sendToN8N({
        id: docRef.id,
        ...guestData,
        name: invitadoValido
      });

    } catch (error) {
      console.error('Error adding guest:', error);
      throw error;
    }
  };

  // ✅ MODIFICADO: Ahora usa la lista desde Firebase
  const getStats = () => {
    const total = guests.length;
    const confirmed = guests.filter(g => g.confirmed === true).length;
    const declined = guests.filter(g => g.confirmed === false).length;
    const pending = invitadosPermitidos.length - total; // Pendientes = Total invitados - Confirmados
    
    return { 
      total, 
      confirmed, 
      declined, 
      pending,
      totalInvitados: invitadosPermitidos.length 
    };
  };

  return { 
    guests, 
    loading, 
    addGuest, 
    buscarInvitado,     // Ahora es async
    yaConfirmo,         
    getStats,
    sendToN8N
  };
};