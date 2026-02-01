const app = {
    data: {
        currentUser: null,
        users: [],
        paymentMethod: null
    },

    init: function() {
        this.loadData();
        this.checkSession();
        document.getElementById('new-period').value = new Date().toISOString().slice(0, 7);
    },

    // --- DATA MANAGEMENT ---
    loadData: function() {
        const stored = localStorage.getItem('wtp_pro_v3_bukti');
        if (stored) {
            this.data.users = JSON.parse(stored);
        } else {
            // Seed Data Awal (Dengan dummy foto tagihan)
            this.data.users = [
                {
                    id: 'PEL001', name: 'Budi Santoso', phone: '08123456789', block: 'A12',
                    bill: 125000, period: '2023-10', due: '2023-10-25',
                    status: 'unpaid', history: [], proof: null,
                    billImage: 'https://via.placeholder.com/400x200.png?text=Foto+Meter+Pelanggan' // Contoh URL placeholder
                }
            ];
            this.saveData();
        }
    },

    saveData: function() {
        try {
            localStorage.setItem('wtp_pro_v3_bukti', JSON.stringify(this.data.users));
        } catch (e) {
            alert("Memori Penuh! Gambar terlalu besar. Gunakan file yang lebih kecil.");
        }
    },

    checkSession: function() {
        const session = sessionStorage.getItem('wtp_session_v3');
        if (session) {
            this.data.currentUser = JSON.parse(session);
            if (this.data.currentUser === 'admin') {
                this.navigate('admin-dashboard');
            } else {
                this.navigate('user-dashboard');
            }
        } else {
            this.navigate('home');
        }
        this.updateMenu();
    },

    // --- NAVIGATION & UI ---
    navigate: function(pageId) {
        document.querySelectorAll('section').forEach(sec => sec.classList.remove('active-section'));
        document.getElementById(pageId).classList.add('active-section');
        window.scrollTo(0,0);

        if (pageId === 'user-dashboard') this.renderUser();
        if (pageId === 'admin-dashboard') this.renderAdmin();
    },

    updateMenu: function() {
        document.getElementById('menu-public').classList.add('hidden');
        document.getElementById('menu-user').classList.add('hidden');
        document.getElementById('menu-admin').classList.add('hidden');

        if (!this.data.currentUser) {
            document.getElementById('menu-public').classList.remove('hidden');
        } else if (this.data.currentUser === 'admin') {
            document.getElementById('menu-admin').classList.remove('hidden');
        } else {
            document.getElementById('menu-user').classList.remove('hidden');
        }
    },

    switchTab: function(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        
        if (tab === 'pelanggan') {
            document.getElementById('form-pelanggan').classList.remove('hidden');
            document.getElementById('form-admin').classList.add('hidden');
        } else {
            document.getElementById('form-pelanggan').classList.add('hidden');
            document.getElementById('form-admin').classList.remove('hidden');
        }
    },

    // --- AUTH ---
    loginUser: function() {
        const id = document.getElementById('login-id').value;
        const phone = document.getElementById('login-phone').value;
        const user = this.data.users.find(u => u.id === id && u.phone === phone);

        if (user) {
            this.data.currentUser = user;
            sessionStorage.setItem('wtp_session_v3', JSON.stringify(user));
            this.showToast('Selamat Datang, ' + user.name);
            this.checkSession();
        } else {
            this.showToast('ID atau Nomor HP Salah', 'error');
        }
    },

    loginAdmin: function() {
        const u = document.getElementById('admin-user').value;
        const p = document.getElementById('admin-pass').value;
        if (u === 'admin' && p === 'admin123') {
            this.data.currentUser = 'admin';
            sessionStorage.setItem('wtp_session_v3', JSON.stringify('admin'));
            this.showToast('Login Admin Berhasil');
            this.checkSession();
        } else {
            this.showToast('Login Gagal', 'error');
        }
    },

    logout: function() {
        this.data.currentUser = null;
        sessionStorage.removeItem('wtp_session_v3');
        this.navigate('home');
        this.updateMenu();
        this.showToast('Berhasil Keluar');
    },

    // --- USER LOGIC ---
    renderUser: function() {
        const u = this.data.users.find(x => x.id === this.data.currentUser.id);
        if(u) this.data.currentUser = u;

        document.getElementById('user-name').innerText = this.data.currentUser.name;
        document.getElementById('user-block').innerText = this.data.currentUser.block;
        document.getElementById('bill-period').innerText = this.data.currentUser.period;
        document.getElementById('bill-due').innerText = this.data.currentUser.due;
        document.getElementById('bill-amount-display').innerText = this.formatRupiah(this.data.currentUser.bill);

        // TAMPILKAN FOTO TAGIHAN DARI ADMIN
        const billImg = document.getElementById('bill-attachment-img');
        if (this.data.currentUser.billImage) {
            billImg.src = this.data.currentUser.billImage;
            billImg.alt = "Bukti Tagihan";
        } else {
            billImg.src = "https://via.placeholder.com/400x200?text=Tidak+Ada+Bukti";
        }

        const statusText = document.getElementById('status-text');
        const payArea = document.getElementById('payment-area');

        if (this.data.currentUser.status === 'paid') {
            statusText.innerText = "LUNAS";
            statusText.className = "status-badge paid";
            payArea.classList.add('hidden');
        } else {
            statusText.innerText = this.data.currentUser.status === 'pending' ? "MENUNGGU VERIFIKASI" : "BELUM BAYAR";
            statusText.className = "status-badge unpaid";
            payArea.classList.remove('hidden');
        }

        const tbody = document.querySelector('#history-table tbody');
        tbody.innerHTML = '';
        if(this.data.currentUser.history) {
            this.data.currentUser.history.forEach(h => {
                tbody.innerHTML += `<tr><td>${h.date}</td><td>${h.method}</td><td>${this.formatRupiah(h.amount)}</td><td>Lunas</td></tr>`;
            });
        }
    },

    selectPayment: function(el, method) {
        document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.data.paymentMethod = method;

        const detailBox = document.getElementById('payment-details');
        const content = document.getElementById('detail-content');
        const uploadArea = document.getElementById('upload-area');
        const btn = document.getElementById('btn-confirm');

        detailBox.classList.remove('hidden');
        uploadArea.classList.remove('hidden');
        btn.innerText = "Konfirmasi Pembayaran";

        if (method === 'TUNAI') {
            content.innerHTML = `<p>Silakan datang ke kantor kami:</p><h3>Jl. Air Bersih No. 1</h3>`;
            uploadArea.classList.add('hidden');
            btn.innerText = "Konfirmasi Kunjungan";
        } else if (method === 'QRIS') {
            content.innerHTML = `<p>Scan QRIS ini:</p><div style="font-size:3rem; margin:10px;">📷</div><p>Nominal: <b>${this.formatRupiah(this.data.currentUser.bill)}</b></p>`;
        } else {
            content.innerHTML = `<p>Transfer ke:</p><h3>REKENING ${method}</h3><p>123-456-789</p>`;
        }
    },

    submitPayment: function() {
        const method = this.data.paymentMethod;
        const fileInput = document.getElementById('proof-file');
        let proof = null;

        if (method === 'TUNAI') {
            proof = "Bayar Tunai di Lokasi";
            this.processSubmission(proof);
        } else {
            const file = fileInput.files[0];
            if (!file) {
                this.showToast('Harap upload bukti transfer', 'error');
                return;
            }

            // Cek ukuran file (Max 1MB untuk LocalStorage)
            if (file.size > 1000000) {
                this.showToast('Gambar terlalu besar! Gunakan gambar di bawah 1MB.', 'error');
                return;
            }

            // Konversi gambar ke Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                this.processSubmission(e.target.result);
            };
            reader.onerror = () => {
                this.showToast('Gagal membaca file', 'error');
            };
        }
    },

    processSubmission: function(proofData) {
        const userIdx = this.data.users.findIndex(u => u.id === this.data.currentUser.id);
        if (userIdx > -1) {
            this.data.users[userIdx].status = 'pending';
            this.data.users[userIdx].proof = proofData;
            this.saveData();
            this.showToast('Pembayaran dikirim, menunggu verifikasi admin');
            this.renderUser();
        }
    },

    // --- ADMIN LOGIC ---
    renderAdmin: function() {
        const users = this.data.users;
        document.getElementById('stat-users').innerText = users.length;
        
        const pending = users.filter(u => u.status === 'pending').reduce((a, b) => a + b.bill, 0);
        document.getElementById('stat-pending').innerText = this.formatRupiah(pending);

        const revenue = users.reduce((a, b) => a + (b.history ? b.history.reduce((x, y) => x + y.amount, 0) : 0), 0);
        document.getElementById('stat-revenue').innerText = this.formatRupiah(revenue);

        const tbody = document.querySelector('#admin-table tbody');
        tbody.innerHTML = '';
        
        users.forEach(u => {
            // LOGIKA: Menampilkan Bukti Bayar User
            let proofDisplay = '-';
            if(u.status === 'pending' && u.proof) {
                if(u.proof.startsWith('data:image')) {
                    proofDisplay = `<img src="${u.proof}" class="proof-thumb" onclick="app.viewImage('${u.proof}')" alt="Klik untuk lihat bukti">`;
                } else {
                    proofDisplay = `<span style="font-size:0.8rem; color:#888;">${u.proof}</span>`;
                }
            }

            let actionBtn = '';
            if(u.status === 'pending') {
                actionBtn = `<button onclick="app.verify('${u.id}')" class="btn btn-success" style="padding:5px 10px; font-size:12px;">Verifikasi</button>`;
            }

            // TOMBOL WA SATU PERSATU (UPDATED MESSAGE)
            const waLink = this.getWALink(u);
            const waBtn = `<a href="${waLink}" target="_blank" class="btn btn-wa">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> Ingatkan
            </a>`;

            tbody.innerHTML += `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.name}<br><small>${u.phone}</small></td>
                    <td>${this.formatRupiah(u.bill)}</td>
                    <td><span class="status-badge ${u.status === 'paid' ? 'paid' : 'unpaid'}">${u.status.toUpperCase()}</span></td>
                    <td>${proofDisplay}</td>
                    <td>${waBtn}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    },

    viewImage: function(imgSrc) {
        document.getElementById('proof-image-view').src = imgSrc;
        document.getElementById('img-modal').classList.remove('hidden');
    },

    closeImageModal: function() {
        document.getElementById('img-modal').classList.add('hidden');
    },

    getWALink: function(user) {
        let phone = user.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        
        // Pesan PENGINGAT JATUH TEMPO & LAMPIRAN BUKTI
        const message = `Halo Bpk/Ibu ${user.name},\n\nIni adalah pengingat jatuh tempo tagihan Air WTP CV Sumber Manunggal ABADI.\n\nPeriode: ${user.period}\nTagihan: ${this.formatRupiah(user.bill)}\nMohon segera lakukan pembayaran. Bukti tagihan/foto meter telah kami lampirkan di aplikasi. Terima kasih.`;
        
        const encodedMsg = encodeURIComponent(message);
        return `https://wa.me/${phone}?text=${encodedMsg}`;
    },

    verify: function(id) {
        const idx = this.data.users.findIndex(u => u.id === id);
        if (idx > -1) {
            const u = this.data.users[idx];
            if (!u.history) u.history = [];
            u.history.push({
                date: new Date().toISOString().split('T')[0],
                method: u.proof === 'Bayar Tunai di Lokasi' ? 'TUNAI' : 'Transfer',
                amount: u.bill,
                status: 'paid'
            });
            u.status = 'paid';
            u.proof = null; 
            this.saveData();
            this.renderAdmin();
            this.showToast('Pembayaran Diverifikasi');
        }
    },

    openModal: function() {
        document.getElementById('modal-add').classList.remove('hidden');
    },

    closeModal: function() {
        document.getElementById('modal-add').classList.add('hidden');
    },

    addCustomer: function() {
        const id = document.getElementById('new-id').value;
        const name = document.getElementById('new-name').value;
        const phone = document.getElementById('new-phone').value;
        const block = document.getElementById('new-block').value;
        const bill = parseInt(document.getElementById('new-amount').value);
        const period = document.getElementById('new-period').value;
        const due = document.getElementById('new-due').value;
        const billImgInput = document.getElementById('new-bill-img');
        
        let billImage = null;

        if (!id || !name || !bill) {
            this.showToast('Data tidak lengkap', 'error');
            return;
        }

        // Logika Upload Foto Meter (Admin Upload)
        const file = billImgInput.files[0];
        if (file) {
             if (file.size > 500000) { // Limit 500KB untuk foto admin
                this.showToast('Foto meter terlalu besar (Max 500KB)', 'error');
                return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                this.finalizeAddUser(id, name, phone, block, bill, period, due, e.target.result);
            };
        } else {
            this.finalizeAddUser(id, name, phone, block, bill, period, due, null);
        }
    },

    finalizeAddUser: function(id, name, phone, block, bill, period, due, billImage) {
        this.data.users.push({
            id, name, phone, block, bill, period, due,
            status: 'unpaid', history: [], proof: null, billImage: billImage
        });
        this.saveData();
        this.closeModal();
        this.renderAdmin();
        this.showToast('Pelanggan Ditambahkan');
    },

    sendContact: function() {
        const name = document.getElementById('contact-name').value;
        const msg = document.getElementById('contact-msg').value;
        if(name && msg) {
            this.showToast('Pesan Terkirim, Terima Kasih ' + name);
            document.getElementById('contact-name').value = '';
            document.getElementById('contact-msg').value = '';
        } else {
            this.showToast('Isi pesan Anda', 'error');
        }
    },

    showToast: function(msg, type='success') {
        const box = document.createElement('div');
        box.className = 'toast';
        box.style.borderLeft = type === 'error' ? '5px solid #e76f51' : '5px solid #2a9d8f';
        box.innerText = msg;
        document.getElementById('toast-container').appendChild(box);
        setTimeout(() => box.remove(), 3000);
    },

    formatRupiah: function(num) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => app.init());