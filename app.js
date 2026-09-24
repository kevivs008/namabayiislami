/* NamaBayiIslami — logika pencari nama.
   Bagian murni (tanpa DOM) didefinisikan lebih dulu agar bisa diuji; penyambungan
   DOM ada di bawah, dijaga dengan pemeriksaan document. */
(function () {
  'use strict';

  /* ---------- util murni ---------- */
  function normalisasi(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // buang harakat latin
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function jumlahSuku(nama) {
    var m = normalisasi(nama).match(/[aiueo]+/g);
    return m ? m.length : 1;
  }
  function kategoriPanjang(nama) {
    var n = (nama || '').replace(/[^a-zA-Z]/g, '').length;
    return n <= 5 ? 'pendek' : (n <= 8 ? 'sedang' : 'panjang');
  }
  function jarakEdit(a, b) { // levenshtein; batasi panjang
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }
  function cariKata(kueri, nama) {
    var q = normalisasi(kueri);
    if (!q) return true;
    var kandidat = [nama.n].concat(nama.v || [], [nama.tr || '']);
    var teksArti = normalisasi(nama.m);
    // 1) kecocokan langsung nama/varian/translit/arti
    for (var i = 0; i < kandidat.length; i++) {
      var k = normalisasi(kandidat[i]);
      if (k.indexOf(q) === 0 || k.indexOf(' ' + q) !== -1 || (q.length >= 3 && k.indexOf(q) !== -1)) return true;
    }
    if (teksArti.indexOf(q) !== -1) return true;
    // 2) toleransi salah ketik pada nama & varian
    var kata = q.split(' ')[0];
    if (kata.length >= 3) {
      for (var x = 0; x < kandidat.length; x++) {
        var kk = normalisasi(kandidat[x]);
        if (jarakEdit(kata, kk) <= (kata.length >= 6 ? 2 : 1)) return true;
      }
    }
    return false;
  }
  function cocokFilter(nama, f) {
    if (f.gender && nama.g !== f.gender && nama.g !== 'B') return false;
    if (f.huruf) {
      var semua = [nama.n].concat(nama.v || []);
      var cocok = false;
      for (var i = 0; i < semua.length; i++) {
        if (semua[i].charAt(0).toUpperCase() === f.huruf) { cocok = true; break; }
      }
      if (!cocok) return false;
    }
    if (f.tema && nama.t.indexOf(f.tema) === -1) return false;
    if (f.sumber && nama.s !== f.sumber) return false;
    if (f.suku) {
      var sk = jumlahSuku(nama.n);
      if (f.suku === '4' ? sk < 4 : sk !== +f.suku) return false;
    }
    if (f.panjang && kategoriPanjang(nama.n) !== f.panjang) return false;
    return true;
  }
  function urutkan(daftar, mode) {
    var d = daftar.slice();
    if (mode === 'unik') d.sort(function (a, b) { return b.pop - a.pop || a.n.localeCompare(b.n); });
    else if (mode === 'az') d.sort(function (a, b) { return a.n.localeCompare(b.n); });
    else d.sort(function (a, b) { return a.pop - b.pop || a.n.localeCompare(b.n); });
    return d;
  }
  function proses(data, kueri, f, sort) {
    var hasil = data.filter(function (n) { return cariKata(kueri, n) && cocokFilter(n, f); });
    return urutkan(hasil, sort);
  }
  function hurufTersedia(data) {
    var set = {};
    data.forEach(function (n) {
      [n.n].concat(n.v || []).forEach(function (x) { set[x.charAt(0).toUpperCase()] = true; });
    });
    return set;
  }

  var FAVORIT_KUNCI = 'nbi_favorit';
  function bacaFavorit() {
    try { return JSON.parse(localStorage.getItem(FAVORIT_KUNCI) || '[]'); } catch (e) { return []; }
  }
  function simpanFavorit(arr) {
    try { localStorage.setItem(FAVORIT_KUNCI, JSON.stringify(arr)); } catch (e) {}
  }
  function teksFavorit(data, arr) {
    return 'Assalamualaikum! Ini daftar nama yang kami simpan untuk si kecil:\n\n' +
      arr.map(function (nm) {
        var n = data.find(function (x) { return x.n === nm; });
        return n ? ('• ' + n.n + ' (' + n.ar + ') — ' + n.m) : ('• ' + nm);
      }).join('\n') +
      '\n\nDari NamaBayiIslami — namabayiislami.com';
  }

  /* ekspos untuk pengujian di node */
  var api = { normalisasi: normalisasi, jumlahSuku: jumlahSuku, kategoriPanjang: kategoriPanjang,
              jarakEdit: jarakEdit, cariKata: cariKata, cocokFilter: cocokFilter, urutkan: urutkan,
              proses: proses, hurufTersedia: hurufTersedia, teksFavorit: teksFavorit };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof document === 'undefined') return; // selesai di lingkungan uji

  /* ---------- DOM ---------- */
  var DATA = window.NAMA_DATA || [];
  var LABEL_SUMBER = { quran: 'Al-Qur\'an', nabi: 'Nama Nabi', sahabat: 'Sahabat', sahabiyah: 'Sahabiyah', asmaul: 'Asmaul Husna', hadits: 'Hadits' };
  var LABEL_GENDER = { L: 'Laki-laki', P: 'Perempuan', B: 'L / P' };
  var LABEL_TEMA = { cahaya: 'Cahaya', keindahan: 'Keindahan', kekuatan: 'Kekuatan', hikmah: 'Kebijaksanaan',
    kebaikan: 'Kebaikan', kemuliaan: 'Kemuliaan', 'iman-takwa': 'Iman & Takwa', surga: 'Surga', harapan: 'Doa & Harapan', ketenangan: 'Ketenangan' };

  var elGrid = document.getElementById('grid-nama');
  if (!elGrid) return; // bukan halaman pencari
  var elInput = document.getElementById('cari');
  var elJml = document.getElementById('jml-hasil');
  var elKosong = document.getElementById('kosong');
  var elBanding = document.getElementById('banding-huruf');
  var state = { kueri: '', f: {}, sort: 'pop' };
  var debounceId = null;

  function ikon(nama) {
    var p = {
      jantung: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19.8 4.6a5.5 5.5 0 0 0-7.8 0L12 4.6l-.1-.1a5.5 5.5 0 0 0-7.8 7.8l.1.1L12 20.2l7.8-7.8a5.5 5.5 0 0 0 0-7.8z"/></svg>',
      salin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      hapus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>'
    };
    return p[nama] || '';
  }

  function kartuHTML(n) {
    var fav = bacaFavorit().indexOf(n.n) !== -1;
    var html = '<article class="kartu" data-nama="' + n.n + '">';
    if (n.tp) html += '<span class="stempel">Tidak Pasaran</span>';
    html += '<div class="ar-bebas ar ar-besar">' + n.ar + '</div>';
    html += '<div class="nama-latin">' + n.n + '</div>';
    html += '<div class="translit">' + n.tr + '</div>';
    html += '<div class="arti">' + n.m + '</div>';
    html += '<div class="lencana">';
    html += '<span class="chip g-' + n.g.toLowerCase() + '">' + LABEL_GENDER[n.g] + '</span>';
    html += '<span class="chip">' + LABEL_SUMBER[n.s] + '</span>';
    html += '</div>';
    html += '<div class="aksi">';
    html += '<button class="tautan-detail" type="button">Rincian</button>';
    html += '<button class="tombol-hati' + (fav ? ' on' : '') + '" type="button" aria-label="Simpan ke favorit">' + ikon('jantung') + '<span>' + (fav ? 'Tersimpan' : 'Simpan') + '</span></button>';
    html += '</div>';
    html += '<div class="detail-nama sembunyi"><dl>' +
      '<dt>Transliterasi</dt><dd>' + n.tr + '</dd>' +
      '<dt>Rujukan</dt><dd>' + n.r + '</dd>' +
      '<dt>Tema</dt><dd>' + n.t.map(function (t) { return LABEL_TEMA[t]; }).join(', ') + '</dd>' +
      '<dt>Panggilan sayang</dt><dd>' + n.nk.join(', ') + '</dd>' +
      ((n.v || []).length ? '<dt>Tulisan lain</dt><dd>' + n.v.join(', ') + '</dd>' : '') +
      '<dt>Keyakinan arti</dt><dd>' + (n.con === 'tinggi' ? 'Tinggi — makna disepakati rujukan utama' : 'Sedang — makna bisa berbeda antar rujukan') + '</dd>' +
      '</dl></div>';
    html += '</article>';
    return html;
  }

  function render() {
    var hasil = proses(DATA, state.kueri, state.f, state.sort);
    elJml.textContent = hasil.length + ' nama ditemukan';
    elGrid.innerHTML = hasil.length
      ? hasil.map(kartuHTML).join('')
      : '';
    elKosong.classList.toggle('sembunyi', hasil.length > 0);
    // tampilkan saran bila pencarian tanpa hasil
    if (!hasil.length) {
      var saran = '';
      if (state.kueri) {
        var dekat = DATA.filter(function (n) { return jarakEdit(normalisasi(state.kueri), normalisasi(n.n)) <= 2; }).slice(0, 4);
        if (dekat.length) saran = ' Mungkin maksud Bunda: ' + dekat.map(function (n) { return '<b>' + n.n + '</b>'; }).join(', ') + '?';
      }
      elKosong.querySelector('.saran').innerHTML = saran;
    }
  }

  /* peristiwa: cari */
  elInput.addEventListener('input', function () {
    clearTimeout(debounceId);
    debounceId = setTimeout(function () { state.kueri = elInput.value; render(); }, 120);
  });

  /* peristiwa: pil gender */
  document.querySelectorAll('[data-f="gender"] button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('[data-f="gender"] button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      if (b.dataset.val) state.f.gender = b.dataset.val; else delete state.f.gender;
      render();
    });
  });

  /* strip A-Z */
  var tersedia = hurufTersedia(DATA);
  var abjad = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var azHTML = '<button type="button" data-h="" class="on">Semua</button>';
  abjad.forEach(function (L) {
    var ada = tersedia[L] ? '' : ' kosong';
    azHTML += '<button type="button" data-h="' + L + '"' + ada + (ada ? ' disabled' : '') + '>' + L + '</button>';
  });
  elBanding.innerHTML = azHTML;
  elBanding.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    elBanding.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    if (b.dataset.h) state.f.huruf = b.dataset.h; else delete state.f.huruf;
    render();
  });

  /* pilihan dropdown */
  [['f-tema', 'tema'], ['f-sumber', 'sumber'], ['f-suku', 'suku'], ['f-panjang', 'panjang']].forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    el.addEventListener('change', function () {
      if (el.value) state.f[pair[1]] = el.value; else delete state.f[pair[1]];
      render();
    });
  });
  var elSort = document.getElementById('f-urut');
  elSort.addEventListener('change', function () { state.sort = elSort.value; render(); });

  /* delegasi kartu: hati & rincian */
  elGrid.addEventListener('click', function (e) {
    var hati = e.target.closest('.tombol-hati');
    if (hati) {
      var kartu = hati.closest('.kartu');
      var nm = kartu.dataset.nama;
      var fav = bacaFavorit();
      var i = fav.indexOf(nm);
      if (i === -1) { fav.push(nm); hati.classList.add('on'); hati.querySelector('span').textContent = 'Tersimpan'; }
      else { fav.splice(i, 1); hati.classList.remove('on'); hati.querySelector('span').textContent = 'Simpan'; }
      simpanFavorit(fav); perbaruiLaci(); perbaruiBadge();
      return;
    }
    var tautan = e.target.closest('.tautan-detail');
    if (tautan) {
      var d = tautan.closest('.kartu').querySelector('.detail-nama');
      d.classList.toggle('sembunyi');
      tautan.textContent = d.classList.contains('sembunyi') ? 'Rincian' : 'Tutup';
    }
  });

  /* ---------- laci favorit ---------- */
  var elLaci = document.getElementById('laci-favorit');
  function perbaruiBadge() {
    document.getElementById('n-favorit').textContent = bacaFavorit().length;
  }
  function perbaruiLaci() {
    var fav = bacaFavorit();
    var isi = document.getElementById('isi-favorit');
    if (!fav.length) {
      isi.innerHTML = '<p class="catatan">Belum ada nama yang disimpan — cintai beberapa nama dulu.</p>';
    } else {
      isi.innerHTML = fav.map(function (nm) {
        var n = DATA.find(function (x) { return x.n === nm; });
        if (!n) return '';
        return '<div class="item-fav" data-nama="' + nm + '">' +
          '<div class="atas"><span class="nm">' + nm + '</span><span class="ar ar-k">' + n.ar + '</span></div>' +
          '<div class="arti-k">' + n.m + '</div>' +
          '<div class="baris-t"><button type="button" class="salin">' + ikon('salin') + ' Salin</button>' +
          '<button type="button" class="hapus">' + ikon('hapus') + ' Hapus</button></div></div>';
      }).join('');
    }
  }
  document.getElementById('buka-favorit').addEventListener('click', function () { perbaruiLaci(); elLaci.classList.add('on'); });
  document.getElementById('tutup-laci').addEventListener('click', function () { elLaci.classList.remove('on'); });
  elLaci.querySelector('.tabir').addEventListener('click', function () { elLaci.classList.remove('on'); });
  document.getElementById('bagikan-wa').addEventListener('click', function () {
    window.open('https://wa.me/?text=' + encodeURIComponent(teksFavorit(DATA, bacaFavorit())), '_blank');
  });
  document.getElementById('salin-semua').addEventListener('click', function () {
    var teks = teksFavorit(DATA, bacaFavorit());
    (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(ok, gagal);
    function ok() { notifikasi('Daftar tersalin ke papan klip.'); }
    function gagal() {
      var t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); notifikasi('Daftar tersalin ke papan klip.'); } catch (e) { notifikasi('Belum bisa menyalin di peramban ini.'); }
      document.body.removeChild(t);
    }
  });
  document.getElementById('isi-favorit').addEventListener('click', function (e) {
    var item = e.target.closest('.item-fav'); if (!item) return;
    var nm = item.dataset.nama;
    if (e.target.closest('.hapus')) {
      var fav = bacaFavorit(); fav.splice(fav.indexOf(nm), 1); simpanFavorit(fav);
      perbaruiLaci(); perbaruiBadge(); render();
    } else if (e.target.closest('.salin')) {
      var n = DATA.find(function (x) { return x.n === nm; });
      var teks = nm + ' (' + n.ar + ') — ' + n.m;
      (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(function () { notifikasi(nm + ' tersalin.'); }, function () {});
    }
  });
  function notifikasi(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('on');
    setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  /* preset jenis kelamin dari atribut body (halaman landing perempuan/laki-laki) */
  var presetG = document.body.getAttribute('data-gender');
  if (presetG === 'L' || presetG === 'P') {
    state.f.gender = presetG;
    document.querySelectorAll('[data-f="gender"] button').forEach(function (b) { b.classList.toggle('on', b.dataset.val === presetG); });
  }

  /* parameter pencarian dari URL (?cari=... atau ?q=...) — mendukung SearchAction schema */
  try {
    var param = new URLSearchParams(window.location.search);
    var qURL = param.get('cari') || param.get('q');
    if (qURL) { elInput.value = qURL; state.kueri = qURL; }
  } catch (e) {}

  perbaruiBadge();
  render();
})();
