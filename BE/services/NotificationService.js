/**
 * Servicio centralizado para enviar notificaciones.
 *
 * La configuración se obtiene desde .env para poder cambiar el proveedor
 * sin modificar el código de la aplicación.
 */
class NotificationService {
  constructor() {
    this.provider = process.env.NOTIFICATION_PROVIDER || 'console';
    this.from = process.env.NOTIFICATION_FROM || 'SistemaVision';
    this.apiKey = process.env.NOTIFICATION_API_KEY || '';
  }

  /**
   * Envía una notificación.
   * Actualmente el proveedor console sirve como implementación segura local.
   * Aquí se puede conectar el proveedor real cuando se definan sus credenciales.
   */
  async send({ to, subject, message, metadata = {} }) {
    if (!to || !message) {
      throw new Error('to y message son obligatorios para enviar una notificación');
    }

    if (this.provider === 'console') {
      console.log('[NotificationService]', {
        from: this.from,
        to,
        subject,
        message,
        metadata,
      });

      return { delivered: true, provider: 'console' };
    }

    if (!this.apiKey) {
      throw new Error(`Falta NOTIFICATION_API_KEY para el proveedor ${this.provider}`);
    }

    throw new Error(`Proveedor de notificaciones no implementado: ${this.provider}`);
  }
}

module.exports = new NotificationService();

