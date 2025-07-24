import React, { useState } from 'react';
import './Invitacion.css';
import { useGuests } from '../hooks/useGuests';

const Invitacion = () => {
  const { guests, loading, addGuest, buscarInvitado, yaConfirmo } = useGuests();
  
  // Estados existentes
  const [showRSVPForm, setShowRSVPForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    attendance: null, // true for 'Sí', false for 'No'
    companions: 0,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // NUEVOS Estados para búsqueda
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentInvitado, setCurrentInvitado] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Funciones existentes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAttendanceChange = (willAttend) => {
    setFormData(prev => ({
      ...prev,
      attendance: willAttend
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.attendance === null) {
      alert('Por favor confirma si asistirás o no');
      return;
    }

    setIsSubmitting(true);
    try {
      await addGuest({
        name: formData.name, // Ya viene validado de la lista
        email: formData.email,
        phone: formData.phone,
        confirmed: formData.attendance,
        companions: parseInt(formData.companions) || 0,
        message: formData.message,
        submittedAt: new Date().toISOString()
      });
      
      setSubmitted(true);
      setShowRSVPForm(false);
      setShowSearchForm(false);
      setCurrentInvitado(null);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        attendance: null,
        companions: 0,
        message: ''
      });

      alert(`¡Gracias ${formData.name}! Tu respuesta ha sido registrada.`);
      
    } catch (error) {
      console.error('Error al enviar RSVP:', error);
      if (error.message.includes('lista de invitados')) {
        alert('No estás en la lista de invitados');
      } else if (error.message.includes('ya confirmaste')) {
        alert('Ya confirmaste tu asistencia anteriormente');
      } else {
        alert('Hubo un error al enviar tu respuesta. Por favor intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // NUEVA FUNCIÓN: Abrir formulario de búsqueda
  const openSearchForm = () => {
    setShowSearchForm(true);
    setCurrentInvitado(null);
    setSearchTerm('');
    setSearchError('');
    setSubmitted(false);
  };

  // NUEVA FUNCIÓN: Buscar invitado
  const handleSearch = () => {
    setSearchError('');
    
    if (!searchTerm.trim()) {
      setSearchError('Por favor ingresa tu nombre');
      return;
    }

    if (searchTerm.trim().length < 3) {
      setSearchError('Ingresa al menos 3 caracteres');
      return;
    }

    const invitadoEncontrado = buscarInvitado(searchTerm);
    
    if (invitadoEncontrado) {
      // Verificar si ya confirmó
      const yaConfirmado = yaConfirmo(invitadoEncontrado);
      
      if (yaConfirmado) {
        setCurrentInvitado({
          name: invitadoEncontrado,
          alreadyConfirmed: true,
          confirmationData: yaConfirmado
        });
      } else {
        setCurrentInvitado({
          name: invitadoEncontrado,
          alreadyConfirmed: false
        });
        // Pre-llenar el formulario con el nombre correcto
        setFormData(prev => ({
          ...prev,
          name: invitadoEncontrado
        }));
      }
    } else {
      setSearchError('No te encontramos en la lista de invitados. Verifica la escritura de tu nombre completo.');
    }
  };

  // NUEVA FUNCIÓN: Proceder al RSVP
  const proceedToRSVP = () => {
    setShowSearchForm(false);
    setShowRSVPForm(true);
  };

  // Estadísticas en tiempo real (opcional - para debug)
  const confirmed = guests.filter(g => g.confirmed === true).length;
  const declined = guests.filter(g => g.confirmed === false).length;

  return (
    <div className="invitacion-container">
      {/* Fondo personalizado */}
      <div className="background-image"></div>
      
      {/* Contenido superpuesto */}
      <div className="overlay-content">
        {/* RSVP Button */}
        <div className="rsvp-overlay">
          {submitted ? (
            <div className="success-message">
              <p>¡Gracias por confirmar!</p>
              <p>Hemos recibido tu respuesta.</p>
            </div>
          ) : (
            <button className="confirm-button" onClick={openSearchForm}>
              CONFIRMA TU ASISTENCIA
            </button>
          )}
        </div>
      </div>

      {/* Debug info - Solo visible en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed', 
          bottom: '10px', 
          right: '10px', 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <div>✅ Confirmados: {confirmed}</div>
          <div>❌ No asisten: {declined}</div>
          <div>🔄 Loading: {loading ? 'Sí' : 'No'}</div>
        </div>
      )}

      {/* NUEVO: Modal de búsqueda de invitado */}
      {showSearchForm && !currentInvitado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Buscar mi invitación</h3>
              <button 
                className="close-button" 
                onClick={() => setShowSearchForm(false)}
              >
                ×
              </button>
            </div>
            
            <div className="search-form">
              <p style={{marginBottom: '15px', color: '#666'}}>
                Ingresa tu nombre completo como aparece en la invitación:
              </p>
              
              <div className="form-group">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ej: María García López"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd'}}
                />
              </div>
              
              {searchError && (
                <div className="error-message" style={{
                  color: '#e74c3c', 
                  marginTop: '10px', 
                  padding: '10px', 
                  backgroundColor: '#ffebee', 
                  borderRadius: '5px',
                  fontSize: '14px'
                }}>
                  {searchError}
                </div>
              )}
              
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowSearchForm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="submit-button"
                  onClick={handleSearch}
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO: Resultado de búsqueda */}
      {currentInvitado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>¡Te encontramos!</h3>
              <button 
                className="close-button" 
                onClick={() => {setCurrentInvitado(null); setShowSearchForm(false);}}
              >
                ×
              </button>
            </div>
            
            <div className="guest-found" style={{textAlign: 'center', padding: '20px'}}>
              <h4 style={{color: '#2c3e50', marginBottom: '20px'}}>
                Hola {currentInvitado.name}!
              </h4>
              
              {currentInvitado.alreadyConfirmed ? (
                <div>
                  <p style={{marginBottom: '15px'}}>Ya confirmaste tu asistencia:</p>
                  <div className="confirmation-status" style={{
                    padding: '15px', 
                    backgroundColor: currentInvitado.confirmationData.confirmed ? '#e8f5e8' : '#ffeaa7',
                    borderRadius: '8px',
                    marginBottom: '15px'
                  }}>
                    <strong style={{
                      color: currentInvitado.confirmationData.confirmed ? '#27ae60' : '#e17055'
                    }}>
                      {currentInvitado.confirmationData.confirmed ? 
                        '✅ Confirmaste que SÍ asistirás' : 
                        '❌ Confirmaste que NO podrás asistir'
                      }
                    </strong>
                    {currentInvitado.confirmationData.companions > 0 && (
                      <p style={{margin: '5px 0 0 0', fontSize: '14px'}}>
                        Con {currentInvitado.confirmationData.companions} acompañante(s)
                      </p>
                    )}
                  </div>
                  <button 
                    className="cancel-button"
                    onClick={() => {setCurrentInvitado(null); setShowSearchForm(false);}}
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{marginBottom: '20px', fontSize: '16px'}}>
                    ¿Confirmas tu asistencia a nuestra boda de papel?
                  </p>
                  <button 
                    className="submit-button"
                    onClick={proceedToRSVP}
                    style={{marginRight: '10px'}}
                  >
                    Continuar
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => {setCurrentInvitado(null); setShowSearchForm(false);}}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RSVP Form Modal - SE MANTIENE IGUAL */}
      {showRSVPForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirma tu Asistencia</h3>
              <button 
                className="close-button" 
                onClick={() => setShowRSVPForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="rsvp-form">
              <div className="form-group">
                <label htmlFor="name">Nombre Completo *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Tu nombre completo"
                  readOnly
                  style={{backgroundColor: '#f5f5f5'}}
                />
                <small style={{color: '#666', fontSize: '12px'}}>
                  * Nombre verificado de la lista de invitados
                </small>
              </div>

              

              <div className="form-group">
                <label>¿Confirmas tu asistencia? *</label>
                <div className="attendance-buttons">
                  <button
                    type="button"
                    className={`attendance-btn ${formData.attendance === true ? 'selected' : ''}`}
                    onClick={() => handleAttendanceChange(true)}
                  >
                    Sí, asistiré
                  </button>
                  <button
                    type="button"
                    className={`attendance-btn ${formData.attendance === false ? 'selected' : ''}`}
                    onClick={() => handleAttendanceChange(false)}
                  >
                    No podré asistir
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Mensaje (opcional)</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Algún mensaje especial para los novios..."
                  rows="3"
                ></textarea>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowRSVPForm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invitacion;