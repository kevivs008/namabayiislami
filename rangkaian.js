/* NamaBayiIslami — generator rangkaian nama. */
(function () {
  'use strict';
  var DATA = window.NAMA_DATA || [];
  var $ = function (id) { return document.getElementById(id); };

  function normal(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  }
  function cariData(nama) {
    var q = normal(nama);
    if (!q) return null;
    for (var i = 0; i < DATA.length; i++) {
      if (normal(DATA[i].n) === q) return DATA[i];
      for (var j = 0; j < (DATA[i].v || []).length; j++) {
        if (normal(DATA[i].v[j]) === q) return DATA[i];
      }
    }
    return null;
  }
  function suku(nama) {
    return (normal(nama).match(/[aiueo]+/g) || ['']).map(function (s, i, arr) {
      // perkiraan potongan suku: vokal + konsonan berikut
      return s;
    });
  }
  function potongan(nama) { // potongan bunyi dua-tiga huruf untuk pencocokan
    var q = normal(nama).replace(/ /g, '');
    var out = [];
    for (var i = 0; i + 2 <= q.length; i++) out.push(q.substr(i, 2), q.substr(i, 3));
    return out.filter(function (x) { return x.length >= 2 && /[aiueo]/.test(x); });
  }

  /* --- cek bunyi (heuristik jujur, bukan hukum) --- */
  function cekSuara(bagian) {
    var catatan = [];
    for (var i = 0; i < bagian.length - 1; i++) {
      var a = normal(bagian[i]), b = normal(bagian[i + 1]);
      if (!a || !b) continue;
      if (a.slice(-1) === b.slice(0, 1)) {
        catatan.push("'" + bagian[i] + "' berakhir dan '" + bagian[i + 1] + "' dimulai huruf yang sama (" + a.slice(-1).toUpperCase() + ") — kalau terasa berat di lidah, coba selipkan nama lain di antaranya.");
      }
    }
    var sukuDepan = (bagian[0].match(/[aiueo]+/gi) || []).length;
    var sukuTengah = bagian[1] ? (bagian[1].match(/[aiueo]+/gi) || []).length : 0;
    if (sukuDepan >= 4 && sukuTengah >= 3) {
      catatan.push('Kedua nama sama-sama panjang (' + sukuDepan + ' + ' + sukuTengah + ' suku). Nama tengah yang lebih pendek biasanya membuat panggilan sehari-hari lebih ringan.');
    }
    return catatan;
  }

  /* --- susun rangkaian --- */
  function susun() {
    var depan = $('depan').value.trim();
    var tengah = $('tengah').value.trim();
    var keluarga = $('keluarga').value.trim();
    var bagian = [depan, tengah, keluarga].filter(Boolean);
    if (!bagian.length) return;

    var d = bagian.map(function (b) { return cariData(b); });
    var lat = bagian.join(' ');
    var arab = bagian.map(function (b, i) { return d[i] ? d[i].ar : ''; }).filter(Boolean).join(' ');
    var artiBagian = bagian.map(function (b, i) {
      return d[i] ? b + ' (' + d[i].m + ')' : null;
    }).filter(Boolean);
    var belum = bagian.filter(function (b, i) { return !d[i]; });

    var kalimat;
    if (artiBagian.length === bagian.length) {
      kalimat = 'Gabungan artinya: ' + bagian.map(function (b, i) { return d[i].m.charAt(0).toLowerCase() + d[i].m.slice(1); }).join(' — ') + '.';
    } else if (artiBagian.length) {
      kalimat = artiBagian.join(' · ') + '.';
      kalimat += belum.length ? ' Nama ' + belum.join(', ') + ' belum ada di data kami, jadi artinya belum bisa kami gabungkan — silakan cek artinya di halaman cari nama.' : '';
    } else {
      kalimat = 'Kedua nama belum terdata di basis kami, jadi kami belum bisa menuliskan gabungan artinya. Coba pilih nama yang sudah terverifikasi lewat halaman cari nama.';
    }

    $('r-ar').textContent = arab || '—';
    $('r-lat').textContent = lat;
    $('r-arti').textContent = kalimat;

    var suara = cekSuara(bagian);
    var el = $('r-suara');
    if (suara.length) {
      el.innerHTML = suara.map(function (s) { return '<div class="peringatan-suara">' + s + '</div>'; }).join('');
    } else {
      el.innerHTML = '<div class="peringatan-suara ok">Bunyi rangkaiannya terasa seimbang — lewat pengecekan kami.</div>';
    }
    $('r-catatan').textContent = 'Pengecekan bunyi hanya panduan kasar; yang terpenting doa dan artinya. Rabithakan pendapat orang tua dan keluarga.';
    $('hasil-rangkaian').classList.remove('sembunyi');
    window.__r = { lat: lat, arab: arab, arti: kalimat };
  }

  /* --- gabung nama orang tua --- */
  function gabung() {
    var a = $('ayah').value.trim(), b = $('bunda').value.trim();
    var g = $('gender-gabung').value;
    var ul = $('usulan-gabung');
    if (!a || !b) return;
    var pa = potongan(a), pb = potongan(b);
    var hasil = DATA.map(function (n) {
      if (g && n.g !== g && n.g !== 'B') return null;
      var q = normal(n.n);
      var sa = pa.some(function (p) { return q.indexOf(p) !== -1; });
      var sb = pb.some(function (p) { return q.indexOf(p) !== -1; });
      if (!sa && !sb) return null;
      var skor = (sa ? 2 : 0) + (sb ? 2 : 0) + (n.n[0].toLowerCase() === a[0].toLowerCase() || n.n[0].toLowerCase() === b[0].toLowerCase() ? 1 : 0);
      return { n: n, skor: skor };
    }).filter(Boolean).sort(function (x, y) { return y.skor - x.skor || x.n.pop - y.n.pop; }).slice(0, 6);
    if (!hasil.length) {
      ul.innerHTML = '<li style="cursor:default;border-style:dashed">Belum ketemu gema bunyi yang pas dari dua nama itu — coba perhatikan huruf tengah tiap nama, atau cari langsung di halaman utama.</li>';
      return;
    }
    ul.innerHTML = hasil.map(function (h) {
      return '<li data-depan="' + h.n.n + '"><span><span class="lat">' + h.n.n + '</span><br><span class="mn">' + h.n.m + '</span></span><span class="ar ar-u">' + h.n.ar + '</span></li>';
    }).join('');
  }
  document.addEventListener('click', function (e) {
    var li = e.target.closest('#usulan-gabung li[data-depan]');
    if (li) {
      $('depan').value = li.dataset.depan;
      susun();
      var hr = $('hasil-rangkaian');
      if (hr.scrollIntoView) hr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  /* datalist saran */
  var dl = $('daftar-nama');
  dl.innerHTML = DATA.map(function (n) { return '<option value="' + n.n + '">'; }).join('');

  $('susun').addEventListener('click', susun);
  ['depan', 'tengah', 'keluarga'].forEach(function (id) {
    $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') susun(); });
  });
  $('gabung').addEventListener('click', gabung);

  $('r-salin').addEventListener('click', function () {
    var t = window.__r ? (window.__r.lat + (window.__r.arab ? ' — ' + window.__r.arab : '') + '\n' + window.__r.arti) : '';
    salin(t, 'Rangkaian nama tersalin.');
  });
  $('r-wa').addEventListener('click', function () {
    var t = window.__r ? ('Assalamualaikum! Tolong dinilai rangkaian nama ini:\n\n' + window.__r.lat + (window.__r.arab ? '\n(' + window.__r.arab + ')' : '') + '\n\n' + window.__r.arti + '\n\nDari NamaBayiIslami') : '';
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
  });

  function salin(teks, pesan) {
    (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(ok, gagal);
    function ok() { toast(pesan); }
    function gagal() {
      var ta = document.createElement('textarea'); ta.value = teks; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(pesan); } catch (e) {}
      document.body.removeChild(ta);
    }
  }
  function toast(msg) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.setAttribute('style', 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#123f2e;color:#f8f3e7;padding:10px 18px;border-radius:8px;font-size:14px;z-index:60;box-shadow:0 8px 20px rgba(0,0,0,.25)');
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2200);
  }
})();
