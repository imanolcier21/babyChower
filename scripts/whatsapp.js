const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const API_URL = 'https://babyshower-production-d850.up.railway.app/api/admin';

async function start() {
  console.log('🐠 ════════════════════════════════════════════');
  console.log('   ENVÍO MASIVO DE WHATSAPP - (MODO PRODUCCIÓN)');
  console.log('══════════════════════════════════════════════\n');

  rl.question('🔑 Ingresa tu contraseña de administrador: ', async (password) => {
    
    console.log('⏳ Conectando con el servidor de producción...');
    
    let settings, allGuests;
    try {
      // 1. Obtener settings
      const settingsRes = await fetch(`${API_URL}/settings`, { headers: { 'x-admin-password': password } });
      if (!settingsRes.ok) {
        console.log('\n❌ ERROR: Contraseña incorrecta o servidor no disponible.');
        process.exit(1);
      }
      settings = await settingsRes.json();

      // 2. Obtener invitados
      const guestsRes = await fetch(`${API_URL}/guests`, { headers: { 'x-admin-password': password } });
      allGuests = await guestsRes.json();
    } catch (err) {
      console.log('\n❌ ERROR DE CONEXIÓN:', err.message);
      process.exit(1);
    }

    if (!settings.base_url || settings.base_url.trim() === '') {
      console.log('\n❌ ERROR: No tienes una "URL base para links" configurada en producción.');
      process.exit(1);
    }
    const baseUrl = settings.base_url.trim().replace(/\/$/, '');

    console.log('\n✅ ¡Conectado! Elige a quién deseas enviar mensajes:');
    console.log('1) Lista completa de Imanol');
    console.log('2) Lista completa de Abilene');
    console.log('3) Lista completa de Ambos (Todos)');
    console.log('4) Solo a personas específicas (buscar por nombre)');

    rl.question('\n👉 Ingresa una opción (1, 2, 3 o 4): ', async (answer) => {
      let hostFilter = null;
      let specificNames = [];

      if (answer === '1') hostFilter = 'Imanol';
      else if (answer === '2') hostFilter = 'Abilene';
      else if (answer === '3') hostFilter = 'Ambos';
      else if (answer === '4') {
        await new Promise(resolve => {
          rl.question('Escribe el nombre o parte del nombre de los que fallaron (separados por coma, ej. Juan, Perez, Maria): ', (names) => {
            specificNames = names.split(',').map(n => n.trim().toLowerCase()).filter(n => n);
            resolve();
          });
        });
        hostFilter = 'Específicos';
      } else {
        console.log('❌ Opción no válida. Saliendo...');
        process.exit(1);
      }

      let guests = allGuests.filter(g => g.phone && g.phone.trim() !== '' && g.confirmed !== 0);

      if (hostFilter === 'Imanol' || hostFilter === 'Abilene') {
        guests = guests.filter(g => g.host === hostFilter);
      } else if (hostFilter === 'Específicos') {
        guests = guests.filter(g => {
          const guestName = g.name.toLowerCase();
          return specificNames.some(nameToFind => guestName.includes(nameToFind));
        });
      }

      if (guests.length === 0) {
        console.log(`\n❌ No se encontraron invitados con teléfono para la selección elegida.`);
        process.exit(0);
      }

      console.log(`\n✅ Se encontraron ${guests.length} invitados con teléfono para la lista: ${hostFilter}`);
      console.log('⏳ Inicializando WhatsApp... Esto puede tardar unos segundos.\n');

      const safeClientId = hostFilter === 'Específicos' ? 'Reenvio' : hostFilter;

      const client = new Client({
        authStrategy: new LocalAuth({ clientId: safeClientId }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });

      client.on('qr', (qr) => {
        console.log('📲 Escanea este código QR con tu WhatsApp para iniciar sesión:');
        qrcode.generate(qr, { small: true });
      });

      client.on('ready', async () => {
        console.log('✅ ¡WhatsApp conectado exitosamente!\n');
        console.log(`🚀 Comenzando el envío a ${guests.length} personas...\n`);

        for (let i = 0; i < guests.length; i++) {
          const guest = guests[i];

          let phone = guest.phone.replace(/\D/g, '');
          if (phone.length === 10) {
            phone = '521' + phone;
          } else if (phone.length === 12 && phone.startsWith('52')) {
            phone = '521' + phone.substring(2);
          }

          const chatId = `${phone}@c.us`;

          const amazonLink = "https://www.amazon.com.mx/baby-reg/abilene-lara-junio-2026-jiutepec/1356QXCJCBP6B?ref_=cm_sw_r_apann_dp_1YYK21F87JKS4QM25NMM&language=en-US";
          const message = `¡Hola ${guest.name}! 🌊 Te recordamos que este domingo 14 de junio a las 2:00 PM es el Baby Shower de nuestro pequeño Lucca 🐠. Si ya confirmaste, ¡allí nos vemos! Si aún no lo has hecho, por favor ayúdanos a confirmar en el link para tener todo listo, busca tu nombre aquí: ${baseUrl} 🐳 ¡Te esperamos!\n\n📍 *Ubicación del evento:*\nhttps://maps.app.goo.gl/N5ucednEpamaNNv29\n\n🎁 *Mesa de regalos:*\n${amazonLink}\n\n✉️ _Nota: También habrá "lluvia de sobres" el día del evento (una tradición donde se obsequia una aportación en efectivo dentro de un sobrecito) por si gustan apoyar a los papás._`;

          try {
            console.log(`[${i + 1}/${guests.length}] Enviando a ${guest.name} (${phone})...`);
            await client.sendMessage(chatId, message);
            console.log(`  ✅ Enviado.`);
          } catch (error) {
            console.log(`  ❌ Error al enviar a ${guest.name}:`, error.message);
          }

          if (i < guests.length - 1) {
            const waitTime = Math.floor(Math.random() * (12000 - 6000 + 1) + 6000);
            console.log(`  ⏳ Esperando ${waitTime / 1000}s para evitar detección de SPAM...`);
            await delay(waitTime);
          }
        }

        console.log('\n🎉 ¡PROCESO TERMINADO! Se enviaron todas las invitaciones posibles.');
        console.log('El script se cerrará en breve.');
        setTimeout(() => { process.exit(0); }, 3000);
      });

      client.initialize();
    });
  });
}

start();
