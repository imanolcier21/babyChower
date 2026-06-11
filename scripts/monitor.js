const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_URL = 'https://babyshower-production-d850.up.railway.app/api/admin';
const LIMIT = 100;

async function start() {
  console.log('🐠 ════════════════════════════════════════════');
  console.log('   MONITOR DE CONFIRMACIONES (BABY SHOWER)');
  console.log('══════════════════════════════════════════════\n');

  rl.question('🔑 Ingresa tu contraseña de administrador: ', async (password) => {
    
    console.log('⏳ Verificando credenciales...');
    
    try {
      // Verificamos que la contraseña funcione haciendo ping a stats
      const authCheck = await fetch(`${API_URL}/stats`, { headers: { 'x-admin-password': password } });
      if (!authCheck.ok) {
        console.log('\n❌ ERROR: Contraseña incorrecta o servidor no disponible.');
        process.exit(1);
      }
    } catch (err) {
      console.log('\n❌ ERROR DE CONEXIÓN:', err.message);
      process.exit(1);
    }

    console.log('✅ Conectado a Producción. Inicializando WhatsApp...');

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: 'Monitor' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    client.on('qr', (qr) => {
      console.log('📲 Escanea este código QR con tu WhatsApp para iniciar sesión en el monitor:');
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', async () => {
      console.log('✅ ¡WhatsApp conectado exitosamente!\n');
      console.log('👁️  El monitor está activo. Mantén esta ventana abierta.');
      console.log('Buscando nuevas confirmaciones cada 60 segundos...\n');

      // Obtener el estado inicial para saber quiénes ya habían confirmado
      let previousState = {};
      
      try {
        const initialRes = await fetch(`${API_URL}/guests`, { headers: { 'x-admin-password': password } });
        const initialGuests = await initialRes.json();
        initialGuests.forEach(g => {
          previousState[g.id] = g.confirmed;
        });
      } catch (e) {
        console.log('❌ Error al cargar estado inicial.');
      }

      // Iniciar ciclo de revisión cada 60 segundos
      setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/guests`, { headers: { 'x-admin-password': password } });
          const currentGuests = await res.json();
          
          let totalConfirmed = currentGuests.reduce((sum, g) => sum + (g.confirmed !== null ? g.confirmed : 0), 0);

          for (const g of currentGuests) {
            const prev = previousState[g.id];
            const curr = g.confirmed;

            // Si antes era null (o diferente) y ahora tiene un número de confirmados
            if (curr !== null && curr !== prev) {
              
              // El chatId con tu propio número (los mensajes guardados / chat contigo mismo)
              const adminChatId = client.info.wid._serialized;
              
              const message = `🔔 *¡Nueva Confirmación!*\n\nConfirmó *${g.name}* con *${curr}* lugares.\n\n📊 *Resumen actual:*\nLlevas *${totalConfirmed}* confirmados de un límite de *${LIMIT}*.\n\n_(Recuerda que si superas el límite debes solicitar otra mesa)_`;
              
              console.log(`[${new Date().toLocaleTimeString()}] ¡Alerta! Confirmó ${g.name}. Enviando notificación...`);
              await client.sendMessage(adminChatId, message);
              
              // Actualizar el registro local para no volver a notificarlo
              previousState[g.id] = curr;
            }
          }
        } catch (error) {
          console.log(`[${new Date().toLocaleTimeString()}] Error al checar la base de datos:`, error.message);
        }
      }, 60 * 1000); // 60,000 milisegundos = 1 minuto
    });

    client.initialize();
  });
}

start();
