const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const axios = require('axios');
const fs = require('fs');

// --- KONFIGURASI ---
const BASE_URL = 'https://maknaflow-staging.onrender.com/api';
const SESSION_DIR = 'auth_info_baileys'; // Folder penyimpan sesi (pengganti .wwebjs_auth)

// State Management (Sama seperti sebelumnya)
const userSessions = {};
let MASTER_DATA = null;

// --- FUNGSI DATA ---
async function fetchMasterData() {
    try {
        console.log("🔄 Mengambil data terbaru dari Django...");
        const response = await axios.get(`${BASE_URL}/bot/master-data/`);
        MASTER_DATA = response.data;
        console.log(`✅ Data Master Terupdate: ${MASTER_DATA.branches.length} Cabang, ${MASTER_DATA.categories.length} Kategori.`);
    } catch (error) {
        console.error("❌ Gagal ambil data master (Render mungkin tidur):", error.message);
    }
}

// --- FUNGSI UTAMA BOT ---
async function connectToWhatsApp() {
    // Menyiapkan sistem autentikasi (agar tidak scan QR terus)
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Otomatis print QR di terminal
        logger: pino({ level: 'silent' }), // Supaya log bersih
        browser: ['MaknaFlow Bot', 'Chrome', '1.0.0'], // Identitas bot
    });

    // 1. Event: Koneksi Update (Nyambung/Putus/QR)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📌 Silakan Scan QR Code di atas!');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Koneksi terputus. Mencoba reconnect...', shouldReconnect);
            // Reconnect otomatis jika tidak di-logout
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('❌ Anda telah logout. Hapus folder auth_info_baileys dan scan ulang.');
            }
        } else if (connection === 'open') {
            console.log('🚀 Bot Siap & Terhubung Stabil (Baileys Mode)!');
            await fetchMasterData();
        }
    });

    // 2. Event: Simpan Kredit (Session)
    sock.ev.on('creds.update', saveCreds);

    // 3. Event: Pesan Masuk
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        const msg = messages[0];
        if (!msg.message) return;

        // Normalisasi Data Pesan
        const sender = msg.key.remoteJid.replace('@s.whatsapp.net', ''); // Format: 628xxx
        const messageType = Object.keys(msg.message)[0];
        const text = messageType === 'conversation' ? msg.message.conversation : 
                     messageType === 'extendedTextMessage' ? msg.message.extendedTextMessage.text : '';

        if (!text) return; // Skip jika bukan teks
        
        console.log(`📩 Pesan dari ${sender}: "${text}"`);

        // Helper Function: Reply Praktis
        const reply = async (text) => {
            await sock.sendMessage(msg.key.remoteJid, { text: text }, { quoted: msg });
        };

        // --- LOGIC BISNIS (Sama persis dengan sebelumnya) ---

        // Command Refresh
        if (text === '/refresh') {
            await fetchMasterData();
            await reply('✅ Data Database diperbarui!');
            return;
        }

        // Logic Sesi
        if (!userSessions[sender]) {
            if (text.toLowerCase() === '/lapor') {
                if (!MASTER_DATA || !MASTER_DATA.branches) {
                    await fetchMasterData();
                    if (!MASTER_DATA) {
                        await reply('❌ Gagal menghubungi server database.');
                        return;
                    }
                }
                userSessions[sender] = { step: 1, data: { phone_number: sender } };
                await reply('Halo Staff! Pilih Unit Bisnis:\n1. Laundry\n2. Carwash\n3. Kos');
            }
        } else {
            const session = userSessions[sender];

            // Batal
            if (text.toLowerCase() === 'batal') {
                delete userSessions[sender];
                await reply('🚫 Transaksi dibatalkan.');
                return;
            }

            switch (session.step) {
                case 1: // Pilih Tipe
                    let selectedType = '';
                    if (text === '1') selectedType = 'LAUNDRY';
                    else if (text === '2') selectedType = 'CARWASH';
                    else if (text === '3') selectedType = 'KOS';

                    if (!selectedType) {
                        await reply('❌ Pilihan salah. Ketik 1, 2, atau 3.'); 
                        return; 
                    }

                    const filteredBranches = MASTER_DATA.branches.filter(b => b.branch_type === selectedType);
                    if (filteredBranches.length === 0) {
                        await reply(`❌ Belum ada cabang ${selectedType}.`);
                        delete userSessions[sender];
                        return;
                    }

                    session.temp_branches = filteredBranches;
                    let menuText = `🏢 Pilih Cabang ${selectedType}:\n`;
                    filteredBranches.forEach((branch, index) => {
                        menuText += `${index + 1}. ${branch.name}\n`;
                    });
                    session.step = 2;
                    await reply(menuText);
                    break;

                case 2: // Pilih Cabang
                    const branchIndex = parseInt(text) - 1;
                    if (session.temp_branches && session.temp_branches[branchIndex]) {
                        session.data.branch_id = session.temp_branches[branchIndex].id;
                        session.data.branch_name = session.temp_branches[branchIndex].name;
                        session.step = 3;
                        await reply(`✅ Cabang *${session.data.branch_name}* terpilih.\n\n💰 Tipe Transaksi:\n1. INCOME\n2. EXPENSE`);
                    } else {
                        await reply('❌ Nomor cabang tidak valid.');
                    }
                    break;

                case 3: // Income/Expense
                    const types = { '1': 'INCOME', '2': 'EXPENSE' };
                    if (types[text]) {
                        session.data.type = types[text];
                        session.step = 4;
                        const filteredCats = MASTER_DATA.categories.filter(c => c.transaction_type === types[text]);
                        session.temp_cats = filteredCats;
                        let catMenu = `📂 Pilih Kategori ${types[text]}:\n`;
                        filteredCats.forEach((cat, index) => {
                            catMenu += `${index + 1}. ${cat.name}\n`;
                        });
                        await reply(catMenu);
                    } else {
                        await reply('❌ Pilihan salah. Ketik 1 atau 2.');
                    }
                    break;

                case 4: // Kategori
                    const catIndex = parseInt(text) - 1;
                    if (session.temp_cats && session.temp_cats[catIndex]) {
                        session.data.category_id = session.temp_cats[catIndex].id;
                        session.data.category_name = session.temp_cats[catIndex].name;
                        session.step = 5;
                        await reply(`Kategori: *${session.data.category_name}*\n\n💵 Masukkan Nominal (Angka saja):`);
                    } else {
                        await reply('❌ Nomor kategori tidak valid.');
                    }
                    break;

                case 5: // Nominal
                    const cleanAmount = text.replace(/[^0-9]/g, '');
                    if (cleanAmount && !isNaN(cleanAmount)) {
                        session.data.amount = parseInt(cleanAmount);
                        session.step = 6;
                        await reply('📝 Ada catatan? (Ketik "-" jika tidak ada)');
                    } else {
                        await reply('❌ Harap masukkan angka valid.');
                    }
                    break;
                
                case 6: // Submit
                    session.data.notes = text;
                    await reply('⏳ Mengirim data...');
                    try {
                        const payload = {
                            phone_number: session.data.phone_number,
                            branch_id: session.data.branch_id,
                            category_id: session.data.category_id,
                            type: session.data.type,
                            amount: session.data.amount,
                            notes: session.data.notes
                        };
                        const response = await axios.post(`${BASE_URL}/ingestion/internal-wa/`, payload);
                        await reply(`✅ *SUKSES!* ID: ${response.data.id}`);
                    } catch (error) {
                        await reply('❌ Gagal mencatat transaksi.');
                    }
                    delete userSessions[sender];
                    break;
            }
        }
    });
}

// Jalankan Bot
connectToWhatsApp();