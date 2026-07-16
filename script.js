// SUZA Medical - shared client-side (Django-backed)
(function () {
  'use strict';

  var API = '/api';
  var SESSION_KEY = 'suzamed:session';
  var STUDENT_VIEW_KEY = 'suzamed:studentView';

  var ADMIN_EMAIL = 'admin@suzaadmin.ac.tz';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupNavToggle();
    setupHomeCounters();
    setupPortalLogin();
    setupLogout();
    setupPublicRegisterForm();
    setupDoctorRegistrationForm();
    setupDoctorReportForm();
    setupStudentDashboard();
    setupAdminDashboard();
  }

  // ---------- Session ----------
  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function getStudentViewId() {
    try { return sessionStorage.getItem(STUDENT_VIEW_KEY) || ''; }
    catch (e) { return ''; }
  }
  function setStudentViewId(id) {
    try { sessionStorage.setItem(STUDENT_VIEW_KEY, id); } catch (e) {}
  }
  function clearStudentViewId() {
    try { sessionStorage.removeItem(STUDENT_VIEW_KEY); } catch (e) {}
  }

  // ---------- API helpers ----------
  function authHeaders() {
    var s = loadSession();
    return s && s.token ? { 'Authorization': 'Token ' + s.token } : {};
  }

  function api(method, path, body) {
    var headers = { 'Accept': 'application/json' };
    Object.assign(headers, authHeaders());
    var opts = { method: method, headers: headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(API + path, opts).then(function (r) {
      if (r.status === 204) return null;
      return r.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
        if (!r.ok) {
          var msg = 'Request failed';
          if (data && typeof data === 'object') {
            msg = data.detail || firstError(data) || msg;
          } else if (typeof data === 'string' && data) {
            msg = data;
          }
          var err = new Error(msg);
          err.status = r.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }
  function firstError(obj) {
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        var v = obj[k];
        if (Array.isArray(v) && v.length) return String(v[0]);
        if (typeof v === 'string') return v;
      }
    }
    return null;
  }

  // ---------- Auth ----------
  function login(uiRole, username, password) {
    var apiRole = uiRole === 'admin' ? 'admin' : 'doctor';
    return api('POST', '/auth/login/', {
      username: username, password: password, role: apiRole,
    });
  }
  function logout() {
    var s = loadSession();
    if (!s || !s.token) return Promise.resolve();
    return api('POST', '/auth/logout/').catch(function () { /* ignore */ });
  }

  // ---------- Data ----------
  function fetchStudents() { return api('GET', '/students/'); }
  function fetchStudent(id) {
    return api('GET', '/students/' + encodeURIComponent(id) + '/')
      .catch(function () { return null; });
  }
  function createStudent(s) { return api('POST', '/students/', s); }

  function fetchDoctors() { return api('GET', '/doctors/'); }
  function createDoctor(d) { return api('POST', '/doctors/', d); }
  function deleteDoctor(id) {
    return api('DELETE', '/doctors/' + encodeURIComponent(id) + '/');
  }

  function fetchReports(studentId) {
    var q = studentId ? '?studentId=' + encodeURIComponent(studentId) : '';
    return api('GET', '/reports/' + q);
  }
  function createReport(r) { return api('POST', '/reports/', r); }
  function deleteReport(id) {
    var pk = String(id).replace(/^RPT-/, '');
    return api('DELETE', '/reports/' + encodeURIComponent(pk) + '/');
  }

  // ---------- Mobile nav ----------
  function setupNavToggle() {
    var btn = document.getElementById('navToggle');
    var nav = document.getElementById('navLinks');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () { nav.classList.toggle('open'); });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }

  // ---------- Toast ----------
  var toastTimer;
  function showToast(msg, type) {
    var t = document.getElementById('toast');
    var m = document.getElementById('toastMsg');
    if (!t || !m) return;
    m.textContent = msg;
    t.classList.remove('success', 'error');
    if (type) t.classList.add(type);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3600);
  }

  // ---------- Home counters (index.html) ----------
  function setupHomeCounters() {
    var weeklyEl = document.getElementById('weeklyCount');
    if (!weeklyEl) return;
    api('GET', '/reports/weekly-count/')
      .then(function (data) { weeklyEl.textContent = (data && data.count) || 0; })
      .catch(function () { weeklyEl.textContent = 0; });
  }

  function validateField(el) {
    var field = el.closest('.field');
    if (!field) return true;
    var val = (el.value || '').trim();
    var valid = true;

    if (el.hasAttribute('required') && val === '') valid = false;

    if (valid && el.type === 'email' && val !== '') {
      var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(val)) valid = false;
    }
    if (valid && el.type === 'tel' && val !== '') {
      var digits = val.replace(/\D/g, '');
      if (digits.length < 7) valid = false;
    }
    if (valid && el.hasAttribute('minlength') && val !== '') {
      var min = parseInt(el.getAttribute('minlength'), 10);
      if (val.length < min) valid = false;
    }

    field.classList.toggle('invalid', !valid);
    return valid;
  }

  // ---------- Modal ----------
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.add('show');
    m.addEventListener('click', function (e) {
      if (e.target === m) closeModal(id);
    }, { once: true });
    document.addEventListener('keydown', escClose);

    function escClose(e) {
      if (e.key === 'Escape') {
        closeModal(id);
        document.removeEventListener('keydown', escClose);
      }
    }
  }
  function closeModal(id) {
    var m = document.getElementById(id);
    if (m) m.classList.remove('show');
  }

  // ---------- Portal login (portal.html) ----------
  function setupPortalLogin() {
    var form = document.getElementById('loginForm');
    if (!form) return;

    var tabs = document.querySelectorAll('.auth-tab');
    var loginIdLabel = document.getElementById('loginIdLabel');
    var loginId = document.getElementById('loginId');

    var placeholders = {
      staff: { label: 'Doctor email', placeholder: 'doctor@suza.ac.tz' },
      admin: { label: 'Admin email',  placeholder: 'admin@suzaadmin.ac.tz' }
    };

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var role = tab.getAttribute('data-role');
        var cfg = placeholders[role] || placeholders.staff;
        if (loginIdLabel) loginIdLabel.textContent = cfg.label;
        if (loginId) loginId.placeholder = cfg.placeholder;
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('input[required]').forEach(function (el) {
        if (!validateField(el)) ok = false;
      });
      if (!ok) {
        showToast('Please fill in your credentials.', 'error');
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      var original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Signing in...';

      var activeTab = document.querySelector('.auth-tab.active');
      var uiRole = activeTab ? activeTab.getAttribute('data-role') : 'staff';
      var id = (loginId && loginId.value || '').trim();
      var pw = (document.getElementById('loginPassword') || {}).value || '';

      login(uiRole, id, pw).then(function (resp) {
        saveSession({
          role: uiRole,
          id: resp.user.username,
          token: resp.token,
          signedInAt: new Date().toISOString(),
        });
        showToast('Signed in successfully. Redirecting...', 'success');
        var target = uiRole === 'admin' ? 'admin.html' : 'staff.html';
        setTimeout(function () { window.location.href = target; }, 500);
      }).catch(function (err) {
        btn.disabled = false;
        btn.innerHTML = original;
        var msg = err && err.message ? err.message : 'Login failed.';
        if (uiRole === 'staff' && err && err.status === 400) {
          msg = 'Doctor email or password is incorrect.';
        }
        if (uiRole === 'admin' && err && err.status === 400) {
          msg = 'Incorrect admin credentials.';
        }
        showToast(msg, 'error');
      });
    });
  }

  // ---------- Logout ----------
  function setupLogout() {
    var link = document.getElementById('logoutLink');
    if (!link) return;
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var onStudentPage = !!document.getElementById('studentLookupPanel');
      logout().finally(function () {
        clearSession();
        clearStudentViewId();
        window.location.href = onStudentPage ? 'index.html' : 'portal.html';
      });
    });
  }

  // ---------- Public student registration form (register.html) ----------
  function setupPublicRegisterForm() {
    var form = document.getElementById('publicRegisterForm');
    if (!form) return;

    wireLiveValidation(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('input[required], select[required]').forEach(function (el) {
        if (!validateField(el)) ok = false;
      });
      if (!ok) {
        showToast('Please fix the highlighted fields.', 'error');
        return;
      }

      var id = val('pStudentId').toUpperCase();
      var submitBtn = form.querySelector('button[type="submit"]');
      var originalHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Registering...';

      createStudent({
        studentId: id,
        studentName: val('pStudentName'),
        program: val('pProgram'),
        email: val('pEmail'),
        phone: val('pPhone'),
      }).then(function () {
        form.reset();
        openModal('successModal');
      }).catch(function (err) {
        var msg = (err && err.message) || 'Registration failed.';
        if (err && err.data && err.data.studentId) {
          msg = 'Student ' + id + ' is already registered.';
        }
        showToast(msg, 'error');
      }).finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      });
    });

    function val(id) {
      var el = document.getElementById(id);
      return el ? (el.value || '').trim() : '';
    }
  }

  function wireLiveValidation(form) {
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener('blur', function () { validateField(el); });
      el.addEventListener('input', function () {
        var f = el.closest('.field');
        if (f && f.classList.contains('invalid') && el.value.trim() !== '') {
          validateField(el);
        }
      });
    });
  }

  function renderRegisteredStudents(students) {
    var body = document.getElementById('registeredStudentsBody');
    var count = document.getElementById('registeredStudentsCount');
    var stat = document.getElementById('registeredStat');
    if (count) count.textContent = students.length;
    if (stat) stat.textContent = students.length;
    if (!body) return;
    if (students.length === 0) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;padding:1.2rem;">No students registered yet.</td></tr>';
      return;
    }
    body.innerHTML = students.map(function (s) {
      return '<tr>' +
        '<td><strong>' + esc(s.studentName) + '</strong></td>' +
        '<td>' + esc(s.studentId) + '</td>' +
        '<td>' + esc(s.program || '-') + '</td>' +
        '<td>' + esc((s.registeredAt || '').slice(0, 10)) + '</td>' +
      '</tr>';
    }).join('');
  }

  function fillStudentOptions(students) {
    var sel = document.getElementById('rStudentId');
    if (!sel || sel.tagName !== 'SELECT') return;
    var current = sel.value;
    var nameEl = document.getElementById('rStudentName');

    if (students.length === 0) {
      sel.innerHTML = '<option value="">No students registered yet</option>';
      sel.disabled = true;
      if (nameEl) nameEl.value = '';
      return;
    }
    sel.disabled = false;
    sel.innerHTML = '<option value="">Select student...</option>' +
      students.map(function (s) {
        return '<option value="' + esc(s.studentId) + '">' +
               esc(s.studentName + ' - ' + s.studentId) + '</option>';
      }).join('');
    if (current && students.some(function (s) { return s.studentId === current; })) {
      sel.value = current;
    } else if (nameEl) {
      nameEl.value = '';
    }
  }

  // ---------- Doctor registration form (admin.html) ----------
  function setupDoctorRegistrationForm() {
    var form = document.getElementById('doctorRegisterForm');
    if (!form) return;

    wireLiveValidation(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('input[required], select[required]').forEach(function (el) {
        if (!validateField(el)) ok = false;
      });
      if (!ok) {
        showToast('Please fix the highlighted fields.', 'error');
        return;
      }

      var id = val('dDoctorId');
      var pwEl = document.getElementById('dPassword');
      var password = pwEl ? (pwEl.value || '').trim() : '';

      createDoctor({
        doctorId: id,
        doctorName: val('dDoctorName'),
        specialty: val('dSpecialty'),
        email: val('dEmail') || id,
        phone: val('dPhone'),
        password: password || undefined,
      }).then(function () {
        form.reset();
        return fetchDoctors().then(renderRegisteredDoctors);
      }).then(function () {
        showToast('Doctor ' + id + ' registered.', 'success');
      }).catch(function (err) {
        var msg = (err && err.message) || 'Failed to register doctor.';
        if (err && err.data && err.data.doctorId) {
          msg = 'Doctor ' + id + ' is already registered.';
        }
        showToast(msg, 'error');
      });
    });

    function val(id) {
      var el = document.getElementById(id);
      return el ? (el.value || '').trim() : '';
    }
  }

  function renderRegisteredDoctors(doctors) {
    var body = document.getElementById('registeredDoctorsBody');
    var count = document.getElementById('registeredDoctorsCount');
    var stat = document.getElementById('adminDoctorsCount');
    if (count) count.textContent = doctors.length;
    if (stat) stat.textContent = doctors.length;
    if (!body) return;
    if (doctors.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:1.2rem;">No doctors registered yet.</td></tr>';
      return;
    }
    body.innerHTML = doctors.map(function (d) {
      return '<tr>' +
        '<td><strong>' + esc(d.doctorName || d.doctorId) + '</strong></td>' +
        '<td>' + esc(d.doctorId) + '</td>' +
        '<td>' + esc(d.specialty || '-') + '</td>' +
        '<td>' + esc((d.registeredAt || '').slice(0, 10)) + '</td>' +
        '<td><button type="button" class="btn-icon-danger" data-delete-doctor="' + esc(d.doctorId) + '" title="Remove doctor" aria-label="Remove doctor">Delete</button></td>' +
      '</tr>';
    }).join('');
  }

  // ---------- Doctor report form (staff.html) ----------
  function setupDoctorReportForm() {
    var form = document.getElementById('reportForm');
    if (!form) return;

    var session = loadSession();
    if (!session || session.role !== 'staff') {
      window.location.href = 'portal.html';
      return;
    }

    var nameEl = document.getElementById('staffName');
    if (nameEl && session.id) nameEl.textContent = session.id;

    var studentsCache = [];
    var studentSel = document.getElementById('rStudentId');
    var studentNameInput = document.getElementById('rStudentName');
    if (studentSel && studentNameInput) {
      studentSel.addEventListener('change', function () {
        var s = studentsCache.filter(function (x) {
          return (x.studentId || '').toUpperCase() === (studentSel.value || '').toUpperCase();
        })[0];
        studentNameInput.value = s ? s.studentName : '';
      });
    }

    refreshStaff();
    wireLiveValidation(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('input[required], textarea[required], select[required]').forEach(function (el) {
        if (!validateField(el)) ok = false;
      });
      if (!ok) {
        showToast('Please fix the highlighted fields.', 'error');
        return;
      }

      var studentId = val('rStudentId').toUpperCase();
      var status = val('rStatus') || 'Reviewed';
      if (status === 'Follow-up required' && !val('rFollowUp')) {
        var followEl = document.getElementById('rFollowUp');
        var f = followEl && followEl.closest('.field');
        if (f) f.classList.add('invalid');
        showToast('Set a follow-up date when status is "Follow-up required".', 'error');
        return;
      }

      var payload = {
        studentId: studentId,
        visitDate: val('rVisitDate'),
        hospital: val('rHospital'),
        diagnosis: val('rDiagnosis'),
        treatment: val('rTreatment'),
        prescription: val('rPrescription'),
        followUp: val('rFollowUp') || null,
        status: status,
        notes: val('rNotes'),
      };

      createReport(payload).then(function () {
        form.reset();
        return refreshStaff();
      }).then(function () {
        showToast('Medical report submitted. The student and administration can now see it.', 'success');
      }).catch(function (err) {
        var msg = (err && err.message) || 'Failed to submit report.';
        if (err && err.data && err.data.studentId) {
          msg = 'That student is not registered. Register them first.';
        }
        showToast(msg, 'error');
      });
    });

    function refreshStaff() {
      return Promise.all([fetchStudents(), fetchReports()]).then(function (out) {
        studentsCache = out[0] || [];
        renderRegisteredStudents(studentsCache);
        fillStudentOptions(studentsCache);
        renderStaffReports(out[1] || []);
      }).catch(function (err) {
        showToast((err && err.message) || 'Failed to load dashboard.', 'error');
      });
    }

    function val(id) {
      var el = document.getElementById(id);
      return el ? (el.value || '').trim() : '';
    }
  }

  function renderStaffReports(reports) {
    var body = document.getElementById('staffReportsBody');
    var count = document.getElementById('reportsCount');
    var stat = document.getElementById('reportsStat');
    if (count) count.textContent = reports.length;
    if (stat) stat.textContent = reports.length;
    if (!body) return;
    if (reports.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:1.2rem;">No reports submitted yet.</td></tr>';
      return;
    }
    body.innerHTML = reports.map(function (r) {
      return '<tr>' +
        '<td><strong>' + esc(r.studentName) + '</strong></td>' +
        '<td>' + esc(r.studentId) + '</td>' +
        '<td>' + esc(r.visitDate) + '</td>' +
        '<td>' + esc(truncate(r.diagnosis, 60)) + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
      '</tr>';
    }).join('');
  }

  // ---------- Student view (student.html) ----------
  function setupStudentDashboard() {
    var lookupPanel = document.getElementById('studentLookupPanel');
    var dashPanel = document.getElementById('studentDashboardPanel');
    if (!lookupPanel && !dashPanel) return;

    var studentId = getStudentViewId();
    if (!studentId) {
      showStudentLookup();
      return;
    }
    renderStudentReports(studentId);
  }

  function showStudentLookup() {
    var lookupPanel = document.getElementById('studentLookupPanel');
    var dashPanel = document.getElementById('studentDashboardPanel');
    if (lookupPanel) lookupPanel.style.display = '';
    if (dashPanel) dashPanel.style.display = 'none';

    var form = document.getElementById('studentLookupForm');
    if (!form || form.dataset.wired === '1') return;
    form.dataset.wired = '1';

    var input = document.getElementById('lookupId');
    if (input) {
      input.addEventListener('blur', function () { validateField(input); });
      input.addEventListener('input', function () {
        var f = input.closest('.field');
        if (f && f.classList.contains('invalid') && input.value.trim() !== '') {
          validateField(input);
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input || !validateField(input)) {
        showToast('Please enter your Student ID.', 'error');
        return;
      }
      var id = input.value.trim().toUpperCase();
      Promise.all([fetchStudent(id), fetchReports(id)]).then(function (out) {
        var registered = out[0];
        var mine = out[1] || [];
        if (!registered && mine.length === 0) {
          showToast('No records found for ' + id + '. Check the ID and try again.', 'error');
          return;
        }
        setStudentViewId(id);
        renderStudentReports(id, registered, mine);
      }).catch(function (err) {
        showToast((err && err.message) || 'Lookup failed.', 'error');
      });
    });
  }

  function renderStudentReports(studentId, registered, prefetched) {
    var lookupPanel = document.getElementById('studentLookupPanel');
    var dashPanel = document.getElementById('studentDashboardPanel');
    if (lookupPanel) lookupPanel.style.display = 'none';
    if (dashPanel) dashPanel.style.display = '';

    var nameEl = document.getElementById('studentName');
    var idLabel = document.getElementById('studentIdLabel');
    var avatar = document.getElementById('studentAvatar');
    if (idLabel) idLabel.textContent = studentId;
    if (nameEl) nameEl.textContent = 'Student';
    if (avatar) avatar.textContent = initials(studentId);

    var reportsP = prefetched ? Promise.resolve(prefetched) : fetchReports(studentId);
    var studentP = registered !== undefined ? Promise.resolve(registered) : fetchStudent(studentId);

    Promise.all([studentP, reportsP]).then(function (out) {
      var student = out[0];
      var mine = out[1] || [];

      var displayName = (mine[0] && mine[0].studentName) ||
                        (student && student.studentName) ||
                        'Student';
      if (nameEl) nameEl.textContent = displayName;
      if (avatar) avatar.textContent = initials(displayName === 'Student' ? studentId : displayName);

      var totalEl = document.getElementById('studentTotalReports');
      var lastEl = document.getElementById('studentLastVisit');
      var followEl = document.getElementById('studentFollowUp');
      var countEl = document.getElementById('studentReportsCount');
      if (totalEl) totalEl.textContent = mine.length;
      if (countEl) countEl.textContent = mine.length;

      if (lastEl) {
        var sorted = mine.slice().sort(function (a, b) {
          return (b.visitDate || '').localeCompare(a.visitDate || '');
        });
        lastEl.textContent = (sorted[0] && sorted[0].visitDate) || '-';
      }
      if (followEl) {
        var upcoming = mine.map(function (r) { return r.followUp; })
          .filter(Boolean)
          .filter(function (d) { return d >= todayISO(); })
          .sort();
        followEl.textContent = upcoming[0] || '-';
      }

      var list = document.getElementById('studentReportsList');
      if (!list) return;
      if (mine.length === 0) {
        list.innerHTML = '<div style="padding:1.4rem;text-align:center;color:#666;">No reports have been submitted for you yet.</div>';
        return;
      }
      list.innerHTML = mine.map(reportCardHTML).join('');
    }).catch(function (err) {
      showToast((err && err.message) || 'Failed to load records.', 'error');
    });
  }

  // ---------- Admin dashboard (admin.html) ----------
  function setupAdminDashboard() {
    var body = document.getElementById('adminReportsBody');
    if (!body) return;

    var session = loadSession();
    if (!session || session.role !== 'admin') {
      window.location.href = 'portal.html';
      return;
    }

    var nameEl = document.getElementById('adminName');
    if (nameEl && session.id) nameEl.textContent = session.id;

    var allReports = [];

    refreshAdmin();

    var search = document.getElementById('adminSearch');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        if (!q) { renderAdminRows(allReports); return; }
        var filtered = allReports.filter(function (r) {
          return (r.studentName || '').toLowerCase().indexOf(q) !== -1
              || (r.studentId || '').toLowerCase().indexOf(q) !== -1
              || (r.diagnosis || '').toLowerCase().indexOf(q) !== -1;
        });
        renderAdminRows(filtered);
      });
    }

    var exportBtn = document.getElementById('exportReports');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDFCtor) {
          showToast('PDF library failed to load. Check your connection.', 'error');
          return;
        }
        fetchReports().then(function (all) {
          var doc = new jsPDFCtor({ orientation: 'landscape', unit: 'pt', format: 'a4' });
          var today = todayISO();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.text('SUZA Medical - Enrollment reports', 40, 40);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text('Exported ' + today + ' | ' + all.length + ' report(s)', 40, 58);
          doc.setTextColor(0);
          if (all.length === 0) {
            doc.setFontSize(12);
            doc.text('No reports available.', 40, 90);
          } else {
            doc.autoTable({
              startY: 78,
              head: [['Student', 'ID', 'Visit', 'Doctor', 'Diagnosis', 'Status', 'Follow-up']],
              body: all.map(function (r) {
                return [
                  r.studentName || '', r.studentId || '', r.visitDate || '',
                  r.doctorId || '', r.diagnosis || '', r.status || '', r.followUp || ''
                ];
              }),
              styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
              headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [248, 250, 252] },
              columnStyles: { 4: { cellWidth: 220 } },
              margin: { left: 40, right: 40 }
            });
          }
          doc.save('suza-medical-reports-' + today + '.pdf');
        }).catch(function (err) {
          showToast((err && err.message) || 'Failed to export reports.', 'error');
        });
      });
    }

    body.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-delete-report]');
      if (!btn) return;
      var id = btn.getAttribute('data-delete-report');
      if (!window.confirm('Delete this report? This cannot be undone.')) return;
      deleteReport(id).then(refreshAdmin).then(function () {
        showToast('Report deleted.', 'success');
      }).catch(function (err) {
        showToast((err && err.message) || 'Failed to delete report.', 'error');
      });
    });

    var doctorsBody = document.getElementById('registeredDoctorsBody');
    if (doctorsBody) {
      doctorsBody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-delete-doctor]');
        if (!btn) return;
        var id = btn.getAttribute('data-delete-doctor');
        if (!window.confirm('Remove doctor ' + id + '? They will no longer be able to sign in.')) return;
        deleteDoctor(id).then(function () {
          return fetchDoctors().then(renderRegisteredDoctors);
        }).then(function () {
          showToast('Doctor removed.', 'success');
        }).catch(function (err) {
          showToast((err && err.message) || 'Failed to remove doctor.', 'error');
        });
      });
    }

    function refreshAdmin() {
      return Promise.all([fetchReports(), fetchDoctors()]).then(function (out) {
        allReports = out[0] || [];
        updateAdminStats(allReports);
        renderAdminRows(allReports);
        renderRegisteredDoctors(out[1] || []);
        if (search) search.value = '';
      }).catch(function (err) {
        showToast((err && err.message) || 'Failed to load dashboard.', 'error');
      });
    }
  }

  function updateAdminStats(all) {
    var total = document.getElementById('adminTotalReports');
    var unique = document.getElementById('adminUniqueStudents');
    var pending = document.getElementById('adminFollowUps');
    if (total) total.textContent = all.length;
    if (unique) {
      var set = {};
      all.forEach(function (r) { if (r.studentId) set[r.studentId.toUpperCase()] = true; });
      unique.textContent = Object.keys(set).length;
    }
    if (pending) {
      var today = todayISO();
      pending.textContent = all.filter(function (r) {
        return r.followUp && r.followUp >= today;
      }).length;
    }
  }

  function renderAdminRows(list) {
    var body = document.getElementById('adminReportsBody');
    if (!body) return;
    if (list.length === 0) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#666;padding:1.2rem;">No reports match.</td></tr>';
      return;
    }
    body.innerHTML = list.map(function (r) {
      return '<tr>' +
        '<td><strong>' + esc(r.studentName) + '</strong></td>' +
        '<td>' + esc(r.studentId) + '</td>' +
        '<td>' + esc(r.visitDate) + '</td>' +
        '<td>' + esc(r.doctorId || '-') + '</td>' +
        '<td>' + esc(truncate(r.diagnosis, 80)) + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '<td><button type="button" class="btn-icon-danger" data-delete-report="' + esc(r.id) + '" title="Delete report" aria-label="Delete report">Delete</button></td>' +
      '</tr>';
    }).join('');
  }

  // ---------- Helpers ----------
  function reportCardHTML(r) {
    return '<div class="report-card">' +
      '<div class="rc-head">' +
        '<div>' +
          '<div class="rc-title">' + esc(r.diagnosis || 'Medical report') + '</div>' +
          '<div class="rc-meta">' +
            'Date: ' + esc(r.visitDate || '-') +
            ' | Doctor: ' + esc(r.doctorId || '-') +
            (r.hospital ? ' | Hospital: ' + esc(r.hospital) : '') +
          '</div>' +
        '</div>' +
        statusBadge(r.status) +
      '</div>' +
      '<div class="rc-body">' +
        field('Treatment', r.treatment) +
        field('Prescription', r.prescription) +
        field('Follow-up', r.followUp) +
        field('Report ID', r.id) +
        (r.notes ? '<div class="rc-field full"><div class="k">Notes</div><div class="v">' + esc(r.notes) + '</div></div>' : '') +
      '</div>' +
    '</div>';
  }
  function field(k, v) {
    return '<div class="rc-field"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v || '-') + '</div></div>';
  }
  function statusBadge(s) {
    var cls = 'ok';
    if (s === 'Follow-up required') cls = 'pending';
    else if (s === 'Referred') cls = 'new';
    else if (s === 'Closed') cls = 'ok';
    return '<span class="badge ' + cls + '">' + esc(s || 'Reviewed') + '</span>';
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '...' : s;
  }
  function initials(s) {
    s = String(s || '').trim();
    if (!s) return 'ST';
    var parts = s.split(/[\s/\-_.]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
})();
