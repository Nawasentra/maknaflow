const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// Konfigurasi Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

// URL Backend Django Anda (Pastikan server Django jalan)
const DJANGO_API_URL = 'http://127.0.0.1:8000/api/ingestion/internal-wa/';

// State Management
const userSessions = {};

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

client.on('ready', () => console.log('MaknaFlow Bot Siap (Mode Tanpa Gambar & Multi-Cabang)!'));

client.on('message', async msg => {
    // Format nomor pengirim (hilangkan @c.us)
    const senderPhone = msg.from.replace('@c.us', '');
    const text = msg.body.trim();

    // 1. Cek Sesi User
    if (!userSessions[senderPhone]) {
        // Pemicu awal
        if (text.toLowerCase() === '/lapor') {
            userSessions[senderPhone] = { step: 1, data: { phone_number: senderPhone } };
            
            // PERUBAHAN 1: Tanya Tipe Bisnis dulu
            msg.reply('Halo Staff! Pilih Unit Bisnis:\n1. Laundry\n2. Carwash\n3. Kos');
        }
    } else {
        const session = userSessions[senderPhone];

        switch (session.step) {
            case 1: // Input Tipe Bisnis
                if (text === '1') {
                    // Jika Laundry, tanya cabang spesifik
                    session.step = 2; 
                    // TENTUKAN NAMA CABANG LAUNDRY ANDA DISINI
                    msg.reply('Pilih Cabang Laundry:\n1. Laundry Bosku Babelan\n2. Laundry Bosku Kedaung');
                } else if (text === '2') {
                    // Carwash (langsung set nama cabang, sesuaikan dengan database)
                    session.data.branch_name = 'CARWASH'; 
                    session.step = 3; // Langsung lompat ke Tipe Transaksi
                    msg.reply('Unit CARWASH terpilih.\n\nMasukan Tipe:\n1. INCOME (Pemasukan)\n2. EXPENSE (Pengeluaran)');
                } else if (text === '3') {
                    // Kos (langsung set nama cabang)
                    session.data.branch_name = 'KOS';
                    session.step = 3; // Langsung lompat ke Tipe Transaksi
                    msg.reply('Unit KOS terpilih.\n\nMasukan Tipe:\n1. INCOME (Pemasukan)\n2. EXPENSE (Pengeluaran)');
                } else {
                    msg.reply('Pilihan salah. Ketik 1, 2, atau 3.');
                }
                break;

            case 2: // Input Spesifik Cabang Laundry (Hanya muncul jika pilih no 1 di step sebelumnya)
                // PERUBAHAN 2: Mapping Nama Cabang Laundry
                // Pastikan nama ini SAMA PERSIS dengan yang ada di Django Admin > Branches
                if (text === '1') {
                    session.data.branch_name = 'LAUNDRY PUSAT'; // Sesuaikan nama DB
                    session.step = 3;
                    msg.reply('Cabang LAUNDRY PUSAT terpilih.\n\nMasukan Tipe:\n1. INCOME (Pemasukan)\n2. EXPENSE (Pengeluaran)');
                } else if (text === '2') {
                    session.data.branch_name = 'LAUNDRY CABANG 2'; // Sesuaikan nama DB
                    session.step = 3;
                    msg.reply('Cabang LAUNDRY CABANG 2 terpilih.\n\nMasukan Tipe:\n1. INCOME (Pemasukan)\n2. EXPENSE (Pengeluaran)');
                } else {
                    msg.reply('Pilihan salah. Ketik 1 atau 2.');
                }
                break;

            case 3: // Input Tipe Transaksi (Income/Expense)
                const types = { '1': 'INCOME', '2': 'EXPENSE' };
                if (types[text]) {
                    session.data.type = types[text];
                    session.step = 4;
                    msg.reply('Masukkan Kategori (contoh: Detergent, Listrik, Cuci Kiloan):');
                } else {
                    msg.reply('Pilihan salah. Ketik 1 atau 2.');
                }
                break;

            case 4: // Input Kategori
                session.data.category = text;
                session.step = 5;
                msg.reply('Masukkan Nominal (Angka saja, tanpa titik/koma):');
                break;

            case 5: // Input Nominal
                // Validasi angka sederhana
                if (!isNaN(text) && /^\d+$/.test(text)) {
                    session.data.amount = parseInt(text);
                    session.step = 6;
                    msg.reply('Ada catatan tambahan? (Ketik "-" jika tidak ada)');
                } else {
                    msg.reply('Harap masukkan angka yang valid (contoh: 50000).');
                }
                break;

            case 6: // Input Catatan & LANGSUNG KIRIM (Tanpa Gambar)
                session.data.notes = text;
                
                msg.reply('⏳ Sedang menyimpan data ke MaknaFlow...');

                // PERUBAHAN 3: Langsung kirim JSON biasa (bukan FormData)
                // Karena tidak ada file gambar yang dikirim
                try {
                    const response = await axios.post(DJANGO_API_URL, session.data);
                    msg.reply(`✅ Sukses! Transaksi ID: ${response.data.id} berhasil disimpan.`);
                } catch (error) {
                    console.error("Gagal kirim ke Django:", error);
                    
                    let errMsg = '❌ Gagal menyimpan data.';
                    if (error.response) {
                        // Error dari server Django (misal: Kategori tidak ditemukan)
                        errMsg += `\nServer Error: ${error.response.status}`;
                        if (error.response.data && error.response.data.error) {
                            errMsg += `\nPenyebab: ${error.response.data.error}`;
                        }
                    } else if (error.request) {
                        errMsg += '\nServer Django tidak merespon (Mati/Offline).';
                    } else {
                        errMsg += `\n${error.message}`;
                    }
                    msg.reply(errMsg);
                }

                // Hapus sesi agar bisa input baru lagi
                delete userSessions[senderPhone];
                break;
        }
    }
});

client.initialize();