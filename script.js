let currentUser = null;
let users = [];
let appointments = [];
let donors = [];
let bloodRequests = [];
let medicines = [];
let alerts = [];

// Initialize localStorage
function initLocalStorage() {
    if (localStorage.getItem('users')) {
        users = JSON.parse(localStorage.getItem('users'));
    }
    if (localStorage.getItem('appointments')) {
        appointments = JSON.parse(localStorage.getItem('appointments'));
        updateStats();
        if (currentUser) updateAppointmentsList();
    }
    if (localStorage.getItem('donors')) {
        donors = JSON.parse(localStorage.getItem('donors'));
        updateStats();
        updateDonorsList();
    }
    if (localStorage.getItem('medicines')) {
        medicines = JSON.parse(localStorage.getItem('medicines'));
        updateStats();
        if (currentUser) updateMedicineList();
    }
    if (localStorage.getItem('alerts')) {
        alerts = JSON.parse(localStorage.getItem('alerts'));
        updateStats();
        updateAlertsList();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('appointments', JSON.stringify(appointments));
    localStorage.setItem('donors', JSON.stringify(donors));
    localStorage.setItem('medicines', JSON.stringify(medicines));
    localStorage.setItem('alerts', JSON.stringify(alerts));
}

function openAuthModal(tab) {
    document.getElementById('authModal').classList.add('active');
    switchAuthTab(tab);
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelectorAll('.form-tab')[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelectorAll('.form-tab')[1].classList.add('active');
        document.getElementById('signupForm').classList.add('active');
    }
}

function handleSignup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;

    if (!name || !email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    if (users.find(u => u.email === email)) {
        showNotification('Email already registered', 'error');
        return;
    }

    users.push({ name, email, password, role });
    saveToLocalStorage();
    showNotification('Account created! Please login', 'success');
    switchAuthTab('login');
    
    document.getElementById('signupName').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        showNotification('Invalid credentials', 'error');
        return;
    }

    currentUser = user;
    document.getElementById('guestActions').style.display = 'none';
    document.getElementById('userActions').style.display = 'flex';
    document.getElementById('userName').textContent = user.name;
    closeAuthModal();
    showNotification('Welcome ' + user.name + '!', 'success');
    updateAppointmentsList();
    updateMedicineList();
}

function logout() {
    currentUser = null;
    document.getElementById('userActions').style.display = 'none';
    document.getElementById('guestActions').style.display = 'flex';
    switchTab('home');
    showNotification('Logged out successfully', 'info');
}

function switchTab(tabName) {
    if (!currentUser && tabName !== 'home') {
        showNotification('Please login first', 'warning');
        openAuthModal('login');
        return;
    }

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));

    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

function checkAppointmentAvailability() {
    const hospital = document.getElementById('hospitalName').value;
    const specialty = document.getElementById('doctorSpecialty').value;
    const date = document.getElementById('appointmentDate').value;
    
    if (!hospital || !specialty || !date) return;
    
    const todayAppointments = appointments.filter(a => 
        a.hospital === hospital && 
        a.specialty === specialty && 
        a.date === date
    );
    
    const nextNumber = todayAppointments.length + 1;
    const currentNumber = todayAppointments.filter(a => a.status === 'Completed').length + 1;
    const waiting = nextNumber - currentNumber;
    
    document.getElementById('appointmentQueue').style.display = 'block';
    document.getElementById('nextAppointmentNumber').textContent = `OP ${nextNumber}`;
    
    if (todayAppointments.length === 0) {
        document.getElementById('queueInfo').innerHTML = `
            ✅ <strong>No queue!</strong> You'll be the first appointment today.
        `;
    } else if (todayAppointments.length >= 20) {
        document.getElementById('queueInfo').innerHTML = `
            ⚠️ <strong>Queue Full!</strong> Maximum 20 appointments reached for today. Please select another date.
        `;
        document.getElementById('nextAppointmentNumber').textContent = 'FULL';
        showNotification('Maximum appointments reached for this date', 'warning');
    } else {
        const waitTime = waiting * 15; // Assuming 15 minutes per appointment
        document.getElementById('queueInfo').innerHTML = `
            📊 <strong>Current Status:</strong><br>
            • Current Appointment: OP ${currentNumber}<br>
            • Appointments in Queue: ${waiting - 1}<br>
            • Estimated Wait Time: ~${waitTime} minutes
        `;
    }
}

function bookAppointment() {
    const name = document.getElementById('patientName').value;
    const hospital = document.getElementById('hospitalName').value;
    const specialty = document.getElementById('doctorSpecialty').value;
    const date = document.getElementById('appointmentDate').value;
    const contact = document.getElementById('appointmentContact').value;

    if (!name || !hospital || !specialty || !date || !contact) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    // Check if date is not in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showNotification('Cannot book appointment for past dates', 'error');
        return;
    }

    const todayAppointments = appointments.filter(a => 
        a.hospital === hospital && 
        a.specialty === specialty && 
        a.date === date
    );
    
    if (todayAppointments.length >= 20) {
        showNotification('All appointments are booked! Added to waitlist', 'warning');
        addAlert(`⚠️ Waitlist: Appointment request for ${specialty} at ${hospital} on ${date}. Will notify when slot available.`);
        return;
    }

    const appointmentNumber = todayAppointments.length + 1;
    
    appointments.push({ 
        name, 
        hospital,
        specialty, 
        date, 
        appointmentNumber: `OP ${appointmentNumber}`,
        contact, 
        user: currentUser.email, 
        status: 'Confirmed',
        reminderSent: false,
        finalReminderSent: false,
        bookedAt: new Date().toISOString()
    });
    
    saveToLocalStorage();
    addAlert(`✅ Appointment confirmed! Your appointment number is OP ${appointmentNumber} with ${specialty} at ${hospital} on ${date}`);
    showNotification(`Appointment booked! Your number is OP ${appointmentNumber}`, 'success');
    
    // Queue monitoring alert
    addAlert(`🔔 Queue monitoring activated: We'll notify you when your turn approaches`);
    
    document.getElementById('patientName').value = '';
    document.getElementById('hospitalName').value = '';
    document.getElementById('doctorSpecialty').value = '';
    document.getElementById('appointmentDate').value = '';
    document.getElementById('appointmentContact').value = '';
    document.getElementById('appointmentQueue').style.display = 'none';
    
    updateAppointmentsList();
    updateStats();
    
    // Start queue monitoring
    monitorAppointmentQueue();
}

function registerDonor() {
    const name = document.getElementById('donorName').value;
    const blood = document.getElementById('donorBloodType').value;
    const age = document.getElementById('donorAge').value;
    const contact = document.getElementById('donorContact').value;
    const area = document.getElementById('donorArea').value;

    if (!name || !blood || !age || !contact || !area) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    if (age < 18 || age > 65) {
        showNotification('Age must be between 18 and 65', 'error');
        return;
    }

    donors.push({ name, blood, age, contact, area, user: currentUser.email, registered: new Date().toISOString() });
    saveToLocalStorage();
    addAlert(`✅ Successfully registered as ${blood} blood donor in ${area}`);
    showNotification('Registered as donor successfully!', 'success');
    
    document.getElementById('donorName').value = '';
    document.getElementById('donorBloodType').value = '';
    document.getElementById('donorAge').value = '';
    document.getElementById('donorContact').value = '';
    document.getElementById('donorArea').value = '';
    
    updateDonorsList();
    updateStats();
}

function requestBlood() {
    const name = document.getElementById('requestPatientName').value;
    const blood = document.getElementById('requestBloodType').value;
    const hospital = document.getElementById('requestHospital').value;
    const location = document.getElementById('requestLocation').value;
    const contact = document.getElementById('requestContact').value;

    if (!name || !blood || !hospital || !location || !contact) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    bloodRequests.push({ name, blood, hospital, location, contact, user: currentUser.email, requested: new Date().toISOString() });
    
    const matching = donors.filter(d => d.blood === blood && d.area.toLowerCase().includes(location.toLowerCase()));
    
    if (matching.length > 0) {
        addAlert(`🩸 URGENT: ${blood} blood needed for ${name} at ${hospital}, ${location}. ${matching.length} matching donor(s) found nearby!`);
        showNotification(`Found ${matching.length} ${blood} donor(s) nearby!`, 'success');
        
        // Notify matching donors
        matching.forEach(donor => {
            addAlert(`🆘 Blood donation request: ${blood} needed at ${hospital}, ${location}. Contact: ${contact}`);
        });
    } else {
        addAlert(`⚠️ Blood request placed for ${blood}. No nearby donors available yet. We'll notify you when donors register.`);
        showNotification('No matching donors found nearby', 'warning');
    }
    
    saveToLocalStorage();
    
    document.getElementById('requestPatientName').value = '';
    document.getElementById('requestBloodType').value = '';
    document.getElementById('requestHospital').value = '';
    document.getElementById('requestLocation').value = '';
    document.getElementById('requestContact').value = '';
    
    updateStats();
}

function uploadPrescription() {
    const name = document.getElementById('medicineName').value;
    const file = document.getElementById('prescriptionFile').files[0];
    const address = document.getElementById('deliveryAddress').value;
    const contact = document.getElementById('medicineContact').value;
    const time = document.getElementById('deliveryTime').value;

    if (!name || !file || !address || !contact) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    medicines.push({ 
        name, 
        file: file.name, 
        address, 
        contact, 
        time, 
        user: currentUser.email, 
        status: 'Pending Verification',
        ordered: new Date().toISOString()
    });
    
    saveToLocalStorage();
    addAlert(`📋 Prescription uploaded for ${name}. Pharmacy verification in progress...`);
    showNotification('Medicine order placed successfully!', 'success');
    
    // Simulate verification after 5 seconds
    setTimeout(() => {
        const order = medicines[medicines.length - 1];
        order.status = 'Verified - Out for Delivery';
        saveToLocalStorage();
        addAlert(`✅ Prescription verified! Medicine for ${name} will be delivered by end of day to ${address}.`);
        showNotification('Prescription verified! Delivery in progress', 'success');
        updateMedicineList();
    }, 5000);
    
    document.getElementById('medicineName').value = '';
    document.getElementById('prescriptionFile').value = '';
    document.getElementById('deliveryAddress').value = '';
    document.getElementById('medicineContact').value = '';
    
    updateMedicineList();
    updateStats();
}

function updateAppointmentsList() {
    const list = document.getElementById('appointmentsList');
    const userAppts = appointments.filter(a => a.user === currentUser.email);
    
    if (userAppts.length === 0) {
        list.innerHTML = '<p style="color: #999;">No appointments yet</p>';
        return;
    }

    list.innerHTML = userAppts.map(a => `
        <div class="item">
            <h4>${a.name} - ${a.specialty}</h4>
            <p>📅 ${a.date} at ${a.time}</p>
            <p>📞 ${a.contact}</p>
            <p style="color: #48bb78; font-weight: 600;">Status: ${a.status}</p>
        </div>
    `).join('');
}

function updateDonorsList() {
    const list = document.getElementById('donorsList');
    
    if (donors.length === 0) {
        list.innerHTML = '<p style="color: #999;">No donors yet</p>';
        return;
    }

    list.innerHTML = donors.slice(-10).reverse().map(d => `
        <div class="item">
            <h4>${d.name} (${d.age} years) - ${d.blood}</h4>
            <p>📍 ${d.area}</p>
            <p>📞 ${d.contact}</p>
        </div>
    `).join('');
}

function updateMedicineList() {
    const list = document.getElementById('medicineList');
    const userMeds = medicines.filter(m => m.user === currentUser.email);
    
    if (userMeds.length === 0) {
        list.innerHTML = '<p style="color: #999;">No orders yet</p>';
        return;
    }

    list.innerHTML = userMeds.map(m => `
        <div class="item">
            <h4>${m.name}</h4>
            <p>📋 Prescription: ${m.file}</p>
            <p>📍 ${m.address}</p>
            <p>📞 ${m.contact}</p>
            <p>⏰ Delivery: ${m.time}</p>
            <p style="color: #667eea; font-weight: 600;">Status: ${m.status}</p>
        </div>
    `).join('');
}

function updateStats() {
    document.getElementById('appointmentCount').textContent = appointments.length;
    document.getElementById('donorCount').textContent = donors.length;
    document.getElementById('medicineCount').textContent = medicines.length;
    document.getElementById('alertCount').textContent = alerts.length;
}

function addAlert(message) {
    const timestamp = new Date().toLocaleString();
    alerts.unshift({ message, timestamp });
    saveToLocalStorage();
    updateAlertsList();
    updateStats();
}

function updateAlertsList() {
    const list = document.getElementById('allAlerts');
    
    if (alerts.length === 0) {
        list.innerHTML = '<p style="color: #999;">No alerts yet</p>';
        return;
    }

    list.innerHTML = alerts.map(alert => `
        <div class="item">
            <h4>${alert.message}</h4>
            <p>🕐 ${alert.timestamp}</p>
        </div>
    `).join('');
}

function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}

// Set minimum date to today
window.onload = function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) dateInput.min = today;
    
    // Load data from localStorage
    initLocalStorage();
    
    // Check for upcoming appointments immediately and then every minute
    setInterval(checkUpcomingAppointments, 60000); // Check every 60 seconds
    checkUpcomingAppointments(); // Check immediately on load
};

function checkUpcomingAppointments() {
    if (!currentUser) return; // Only check if user is logged in
    
    const now = new Date();
    let hasChanges = false;
    
    appointments.forEach(appointment => {
        if (appointment.user === currentUser.email) {
            const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
            const timeDifference = appointmentDateTime.getTime() - now.getTime();
            const minutesUntil = Math.floor(timeDifference / 60000);
            
            console.log(`Checking appointment: ${appointment.specialty}, Minutes until: ${minutesUntil}, Reminder sent: ${appointment.reminderSent}`);
            
            // Send 30-minute reminder
            if (minutesUntil <= 30 && minutesUntil > 0 && !appointment.reminderSent) {
                addAlert(`⏰ URGENT REMINDER: Your appointment with ${appointment.specialty} is in ${minutesUntil} minutes at ${appointment.time}!`);
                showNotification(`⏰ Appointment in ${minutesUntil} minutes!`, 'warning');
                appointment.reminderSent = true;
                hasChanges = true;
                console.log('30-minute reminder sent!');
            }
            
            // Send 10-minute reminder
            if (minutesUntil <= 10 && minutesUntil > 0 && !appointment.finalReminderSent) {
                addAlert(`🚨 FINAL REMINDER: Your appointment with ${appointment.specialty} is in ${minutesUntil} minutes! Please get ready.`);
                showNotification(`🚨 Appointment in ${minutesUntil} minutes!`, 'error');
                appointment.finalReminderSent = true;
                hasChanges = true;
                console.log('10-minute reminder sent!');
            }
        }
    });
    
    if (hasChanges) {
        saveToLocalStorage();
        updateAlertsList();
    }
}
