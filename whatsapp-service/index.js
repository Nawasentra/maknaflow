const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

// URL API Django
const BASE_URL = 'https://maknaflow-staging.onrender.com/api';

// State Management
const userSessions = {};

// Cache sederhana agar tidak nembak API terus menerus (Opsional)
let MASTER_DATA = null;

// Fungsi untuk update data terbaru dari Django
async function fetchMasterData() {
    try {
        console.log("🔄 Mengambil data terbaru dari Django...");
        const response = await axios.get(`${BASE_URL}/bot/master-data/`);
        MASTER_DATA = response.data;
        console.log("✅ Data Master Terupdate:", MASTER_DATA.branches.length, "Cabang,", MASTER_DATA.categories.length, "Kategori.");
    } catch (error) {
        console.error("❌ Gagal ambil data master:", error.message);
    }
}

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

client.on('ready', async () => {
    console.log('Bot Siap!');
    // Ambil data saat bot nyala pertama kali
    await fetchMasterData();
});

client.on('message', async msg => {
    const sender = msg.from.replace('@c.us', '');
    const text = msg.body.trim();

    // Refresh data manual jika Owner mengetik /refresh (untuk update tanpa restart bot)
    if (text === '/refresh') {
        await fetchMasterData();
        msg.reply('✅ Data Cabang & Kategori berhasil diperbarui dari Database!');
        return;
    }

    if (!userSessions[sender]) {
        if (text.toLowerCase() === '/lapor') {
            // Pastikan data ada
            if (!MASTER_DATA) await fetchMasterData();

            userSessions[sender] = { step: 1, data: { phone_number: sender } };
            
            // Generate Menu Tipe Bisnis Dinamis? 
            // Atau tetap statis karena tipe bisnis jarang berubah. 
            // Di sini kita buat statis dulu biar simpel, tapi cabangnya nanti dinamis.
            msg.reply('Halo Staff! Pilih Unit Bisnis:\n1. Laundry\n2. Carwash\n3. Kos');
        }
    } else {
        const session = userSessions[sender];

        switch (session.step) {
            case 1: // User pilih Tipe Bisnis (Laundry/Carwash/dll)
                let selectedType = '';
                if (text === '1') selectedType = 'LAUNDRY';
                if (text === '2') selectedType = 'CARWASH';
                if (text === '3') selectedType = 'KOS';

                if (!selectedType) {
                    msg.reply('Pilihan salah. Ketik 1, 2, atau 3.');
                    return;
                }

                // FILTER CABANG OTOMATIS BERDASARKAN TIPE
                // Cari cabang di MASTER_DATA yang tipenya sesuai pilihan user
                const filteredBranches = MASTER_DATA.branches.filter(b => b.branch_type === selectedType);

                if (filteredBranches.length === 0) {
                    msg.reply(`❌ Belum ada cabang bertipe ${selectedType} di Database Django. Tambahkan dulu di Admin.`);
                    delete userSessions[sender];
                    return;
                }

                // SIMPAN DAFTAR CABANG SEMENTARA DI SESI USER
                // Agar nanti pas user ketik "1", kita tahu "1" itu cabang ID berapa
                session.temp_branches = filteredBranches; 

                // Buat Teks Menu Dinamis
                let menuText = `Pilih Cabang ${selectedType}:\n`;
                filteredBranches.forEach((branch, index) => {
                    menuText += `${index + 1}. ${branch.name}\n`;
                });

                session.step = 2;
                msg.reply(menuText);
                break;

            case 2: // User pilih Nomor Cabang
                const branchIndex = parseInt(text) - 1; // Karena array mulai dari 0
                const branchList = session.temp_branches;

                if (branchList && branchList[branchIndex]) {
                    // KITA DAPAT ID CABANGNYA LANGSUNG DARI SINI!
                    session.data.branch_id = branchList[branchIndex].id;
                    session.data.branch_name = branchList[branchIndex].name; // Just for display/log
                    
                    session.step = 3;
                    msg.reply(`Cabang *${session.data.branch_name}* terpilih.\n\nMasukan Tipe Transaksi:\n1. INCOME\n2. EXPENSE`);
                } else {
                    msg.reply('Nomor cabang tidak valid. Ulangi pilih nomor.');
                }
                break;

            case 3: // Tipe Income/Expense
                const types = { '1': 'INCOME', '2': 'EXPENSE' };
                if (types[text]) {
                    session.data.type = types[text];
                    session.step = 4;
                    
                    // Tampilkan Kategori yang sesuai tipe transaksi (Income vs Expense)
                    // Filter kategori dari MASTER_DATA
                    const filteredCats = MASTER_DATA.categories.filter(c => c.transaction_type === types[text]);
                    
                    // Simpan mapping kategori sementara
                    session.temp_cats = filteredCats;

                    let catMenu = `Pilih Kategori (Ketik Nomor):\n`;
                    filteredCats.forEach((cat, index) => {
                        catMenu += `${index + 1}. ${cat.name}\n`;
                    });
                    // Opsi manual
                    catMenu += `${filteredCats.length + 1}. Lainnya (Ketik Manual)`;

                    msg.reply(catMenu);
                } else {
                    msg.reply('Pilihan salah. Ketik 1 atau 2.');
                }
                break;

            case 4: // Pilih Kategori (Nomor)
                const catIndex = parseInt(text) - 1;
                const catList = session.temp_cats;
                
                // Opsi "Lainnya" atau Manual input logika bisa ditambahkan disini
                // Untuk sekarang kita asumsikan user memilih dari list angka
                if (catList && catList[catIndex]) {
                    session.data.category_id = catList[catIndex].id;
                    session.step = 5;
                    msg.reply('Masukkan Nominal (Angka saja):');
                } else {
                     msg.reply('Nomor kategori tidak valid.');
                }
                break;

            case 5: // Nominal
                if (!isNaN(text) && /^\d+$/.test(text)) {
                    session.data.amount = parseInt(text);
                    session.step = 6;
                    msg.reply('Ada catatan tambahan? (Ketik "-" jika tidak ada)');
                } else {
                    msg.reply('Harap masukkan angka valid.');
                }
                break;

            case 6: // Notes & Submit
                session.data.notes = text;
                msg.reply('⏳ Mengirim data...');

                try {
                    // Payload sudah berisi ID (branch_id, category_id)
                    // Jadi tidak perlu mapping manual lagi!
                    const payload = {
                        phone_number: session.data.phone_number,
                        branch_id: session.data.branch_id,
                        category_id: session.data.category_id,
                        type: session.data.type,
                        amount: session.data.amount,
                        notes: session.data.notes
                    };

                    const response = await axios.post(`${BASE_URL}/ingestion/internal-wa/`, payload);
                    msg.reply(`✅ Sukses! Transaksi ID: ${response.data.id}`);
                } catch (error) {
                    console.error(error);
                    msg.reply('❌ Gagal kirim ke server.');
                }
                delete userSessions[sender];
                break;
        }
    }
});

client.initialize();