const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');
const P = require('pino');

// ============ CONFIGURATION ============
const YOUR_NUMBER = '254794376595'; // CHANGE THIS TO YOUR WHATSAPP NUMBER
const SESSION_NAME = 'crush-ray-session';

// ============ HELPER FUNCTIONS ============
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============ MAIN BOT FUNCTION ============
async function startBot() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║         CRUSH RAY - WhatsApp Bot        ║');
    console.log('║              Version 2.1.1               ║');
    console.log('║        Developed by Stanley Assanaly     ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    console.log('🚀 Starting CRUSH RAY Bot...');
    console.log('📱 Phone: +' + YOUR_NUMBER);
    console.log('🌐 Platform: Render.com\n');
    
    // Create session directory
    const sessionDir = path.join(__dirname, 'sessions', SESSION_NAME);
    await fs.ensureDir(sessionDir);
    
    // Clear session if flag is passed
    if (process.argv.includes('--clear')) {
        console.log('🗑️ Clearing old session...');
        await fs.remove(sessionDir);
        await fs.ensureDir(sessionDir);
    }
    
    // Get auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const hasSession = await fs.pathExists(path.join(sessionDir, 'creds.json'));
    console.log('📁 Session exists: ' + (hasSession ? 'YES ✅' : 'NO ❌'));
    
    // Create WhatsApp connection
    const conn = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Use pairing code instead
        logger: P({ level: 'error' }),
        browser: ['CRUSH RAY', 'Chrome', '120.0.0.0'],
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        version: [2, 3000, 1015901307]
    });
    
    // Save credentials when updated
    conn.ev.on('creds.update', saveCreds);
    
    // Track pairing request
    let pairingRequested = false;
    let reconnectCount = 0;
    
    // Handle connection events
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        console.log('📡 Connection status:', connection || 'connecting...');
        
        // Request pairing code when connection opens
        if (connection === 'open' && !state.creds.registered && !pairingRequested) {
            pairingRequested = true;
            console.log('\n🔐 Requesting pairing code...');
            await delay(2000);
            
            try {
                const cleanNumber = YOUR_NUMBER.replace(/[^0-9]/g, '');
                const code = await conn.requestPairingCode(cleanNumber);
                
                console.log('\n╔════════════════════════════════════════════╗');
                console.log('║                                        ║');
                console.log('║     🔐 PAIRING CODE: ' + code + '     ║');
                console.log('║                                        ║');
                console.log('╚════════════════════════════════════════════╝\n');
                console.log('📱 HOW TO CONNECT:');
                console.log('   1. Open WhatsApp on your phone');
                console.log('   2. Go to Settings → Linked Devices');
                console.log('   3. Tap "Link a Device"');
                console.log('   4. Tap "Link with phone number instead"');
                console.log('   5. Enter this code: ' + code);
                console.log('\n⏳ Waiting for connection...\n');
                
            } catch (error) {
                console.error('❌ Pairing error:', error.message);
            }
        }
        
        // Handle connection close
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode || 500;
            console.log('❌ Connection closed. Code:', statusCode);
            
            if (statusCode !== DisconnectReason.loggedOut && reconnectCount < 10) {
                reconnectCount++;
                const waitTime = 5000 * reconnectCount;
                console.log(`🔄 Reconnecting in ${waitTime/1000}s...\n`);
                await delay(waitTime);
                startBot();
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log('🔒 Session logged out. Run with --clear to re-pair');
            }
        }
        
        // Successful connection
        if (connection === 'open') {
            const botNumber = conn.user.id.split(':')[0];
            console.log('\n✅========== BOT CONNECTED! ==========');
            console.log('📱 Bot Number: ' + botNumber);
            console.log('🟢 Status: ONLINE');
            console.log('======================================\n');
            
            reconnectCount = 0;
            
            // Send welcome message
            await delay(3000);
            const ownerJid = YOUR_NUMBER + '@s.whatsapp.net';
            await conn.sendMessage(ownerJid, { 
                text: '✅ *CRUSH RAY BOT IS ONLINE!*\n\n' +
                      '📱 Bot Number: ' + botNumber + '\n' +
                      '💪 Status: Ready to crush!\n\n' +
                      '*Commands:*\n' +
                      '• .ping - Check bot status\n' +
                      '• .help - Show menu\n' +
                      '• .status - Bot info\n\n' +
                      '🎉 Bot is now active!'
            }).catch(e => console.log('Welcome message not sent'));
        }
    });
    
    // Handle incoming messages
    conn.ev.on('messages.upsert', async (event) => {
        const msg = event.messages?.[0];
        if (!msg || msg.key.fromMe) return;
        
        const from = msg.key.remoteJid;
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        
        const command = body.toLowerCase().trim();
        
        // Ping command
        if (command === '.ping' || command === '!ping') {
            await conn.sendMessage(from, { 
                text: '🏓 *Pong!*\n\n⚡ CRUSH RAY is active\n📊 Status: Online ✅\n💪 Ready to crush anything!' 
            });
            console.log('🏓 Ping response sent');
        }
        
        // Help command
        if (command === '.help' || command === '!help') {
            await conn.sendMessage(from, { 
                text: '╔════════════════════════════╗\n' +
                      '║     🤖 *CRUSH RAY BOT*     ║\n' +
                      '╚════════════════════════════╝\n\n' +
                      '*📋 Available Commands:*\n' +
                      '• `.ping` - Check bot status\n' +
                      '• `.help` - Show this menu\n' +
                      '• `.status` - Bot information\n' +
                      '• `.crush` - Crush something!\n\n' +
                      '*ℹ️ Bot Info:*\n' +
                      '• Version: 2.1.1\n' +
                      '• Developer: Stanley Assanaly\n' +
                      '• Status: ✅ ONLINE\n\n' +
                      '💪 *Ready to crush!*'
            });
            console.log('📚 Help menu sent');
        }
        
        // Status command
        if (command === '.status' || command === '!status') {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            
            await conn.sendMessage(from, { 
                text: '📊 *CRUSH RAY STATUS*\n\n' +
                      '• Status: 🟢 ONLINE\n' +
                      `• Uptime: ${hours}h ${minutes}m\n` +
                      '• Version: 2.1.1\n' +
                      '• Platform: Render.com\n' +
                      '• Developer: Stanley Assanaly\n\n' +
                      '💪 *Crushing it!*'
            });
            console.log('📊 Status sent');
        }
        
        // Crush command
        if (command === '.crush' || command === '!crush') {
            const crushes = [
                '💪 *CRUSHED!* Nothing can stop CRUSH RAY!',
                '🔨 *BOOM!* Another target crushed!',
                '⚡ *DESTROYED!* CRUSH RAY is unstoppable!',
                '💥 *DEVASTATED!* All obstacles eliminated!',
                '🎯 *TARGET DESTROYED!* Mission accomplished!'
            ];
            const randomCrush = crushes[Math.floor(Math.random() * crushes.length)];
            await conn.sendMessage(from, { text: randomCrush });
            console.log('💪 Crush command executed');
        }
    });
    
    // Handle errors
    conn.ev.on('connection.error', (err) => {
        console.log('🔌 Connection error:', err.message);
    });
}

// ============ START THE BOT ============
console.log('🔄 Initializing CRUSH RAY...\n');

startBot().catch(async (err) => {
    console.error('\n❌ Fatal Error:', err.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your number: ' + YOUR_NUMBER);
    console.log('   2. Make sure WhatsApp is installed on this number');
    console.log('   3. Try clearing session: npm run clear\n');
    
    setTimeout(() => startBot(), 10000);
});

// Keep process alive
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});
