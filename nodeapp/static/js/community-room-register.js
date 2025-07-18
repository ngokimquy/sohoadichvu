// Logic xử lý frontend cho community-room-register (ký tên, submit form, validate, upload signature)
window.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('communityRoomForm');
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasSignature = false;

  // Ký tên trên canvas
  canvas.addEventListener('mousedown', (e) => { drawing = true; ctx.beginPath(); });
  canvas.addEventListener('mouseup', (e) => { drawing = false; });
  canvas.addEventListener('mouseout', (e) => { drawing = false; });
  canvas.addEventListener('mousemove', drawSignature);

  function drawSignature(e) {
    if (!drawing) return;
    hasSignature = true;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0984e3';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  window.clearSignature = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    hasSignature = false;
  };

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!hasSignature) {
      alert('Vui lòng ký tên xác nhận trước khi gửi đăng ký!');
      return;
    }
    const signatureData = canvas.toDataURL('image/png');
    const formData = new FormData(form);
    formData.append('signature', signatureData);
    try {
      const res = await fetch('/api/community-room-register', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showSuccessPopup({
          fullName: form.fullName.value,
          email: form.email.value,
          phone: form.phone.value,
          apartment: form.apartment.value,
          purpose: form.purpose.value,
          date: form.date.value,
          time: form.time.value,
          attendees: form.attendees.value,
          note: form.note.value,
          chungcuName: data.chungcuName,
          createdAt: data.createdAt
        });
        form.reset();
        clearSignature();
      } else {
        alert(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  });

  // Popup xác nhận thành công
  function showSuccessPopup(info) {
    let dateStr = '';
    if (info.createdAt) {
      try {
        const d = new Date(info.createdAt);
        dateStr = d.toLocaleString('vi-VN', { hour12: false });
      } catch (e) { dateStr = info.createdAt; }
    }
    const popup = document.createElement('div');
    popup.id = 'successPopup';
    popup.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.25);z-index:2000;display:flex;align-items:center;justify-content:center;';
    popup.innerHTML = `
      <div id="popupContent" style="background:#fff;padding:32px 28px 24px 28px;border-radius:12px;max-width:420px;width:95%;box-shadow:0 8px 32px rgba(9,132,227,0.10);text-align:center;">
        <div style="font-size:2.2em;color:#28a745;margin-bottom:12px;">✔️</div>
        <div style="font-size:1.3em;font-weight:700;color:#0984e3;margin-bottom:10px;">Đăng ký sử dụng phòng sinh hoạt cộng đồng thành công!</div>
        <div style="font-size:1.1em;font-weight:600;color:#333;margin-bottom:8px;">${info.chungcuName ? 'Chung cư: ' + info.chungcuName : ''}</div>
        <div style="font-size:1em;color:#555;margin-bottom:8px;">${dateStr ? 'Ngày đăng ký: ' + dateStr : ''}</div>
        <div style="text-align:left;font-size:1em;margin-bottom:12px;">
          <b>Họ tên:</b> ${info.fullName}<br>
          <b>Email:</b> ${info.email}<br>
          <b>Số điện thoại:</b> ${info.phone}<br>
          <b>Căn hộ/Đơn vị:</b> ${info.apartment}<br>
          <b>Mục đích sử dụng:</b> ${info.purpose}<br>
          <b>Ngày:</b> ${info.date}<br>
          <b>Khung giờ:</b> ${info.time}<br>
          <b>Số người dự kiến:</b> ${info.attendees}<br>
          <b>Ghi chú:</b> ${info.note || ''}
        </div>
        <button class="btn btn-primary" onclick="downloadRegistrationInfo()">Tải xuống thông tin</button>
        <button class="btn btn-secondary" style="margin-left:10px;" onclick="closeSuccessPopup()">Đóng</button>
      </div>
    `;
    document.body.appendChild(popup);
    window._lastRegistrationInfo = info;
  }
  window.closeSuccessPopup = function() {
    const popup = document.getElementById('successPopup');
    if (popup) popup.remove();
    window.location.href = '/tenants/utility-services';
  }
  window.downloadRegistrationInfo = function() {
    const popupContent = document.getElementById('popupContent');
    if (!popupContent) return;
    html2canvas(popupContent).then(function(canvas) {
      const link = document.createElement('a');
      link.download = 'thong-tin-dang-ky-phong-sinh-hoat.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
});
