const fs = require('fs');
const path = require('path');
const { buildAlaUltraReport, renderAlaUltraXlsx } = require('../lib/ala-ultra-export');

const rows = [
  {
    id: 1,
    reg_code: 'AAU-001',
    created_at: '2026-11-25 13:36:00',
    registration_status: 'Disetujui',
    verify_data: 'Valid',
    verify_strava: 'Valid',
    verify_payment: 'Valid',
    wa_invite_status: 'Terkirim',
    wa_group_status: 'Belum',
    rider_id: 12,
    full_name: 'Mallik Rushamdiwinata',
    birth_date: '1992-04-18',
    gender: 'Laki-laki',
    whatsapp: '082215739924',
    email: 'mallik@example.com',
    city: 'Kota Tasikmalaya',
    instagram: '@mallik.r',
    community: 'SUDDENLY.CC',
    emergency_name: 'Rina Rushamdi',
    emergency_relation: 'Istri',
    emergency_whatsapp: '081234567890',
    bike_type: 'Gravel Bike',
    strava_profile_url: 'https://www.strava.com/athletes/123456',
    strava_activity_url: 'https://www.strava.com/activities/987654321',
    longest_distance_km: '580',
    has_ultra_experience: 'Pernah',
    past_events: 'SESERAHAN 2026, Audax 300K',
    bike_roadworthy: 'Ya',
    has_helmet_gear: 'Ya',
    medical_conditions: 'Tidak ada',
    terms_agreed: 'Setuju dengan seluruh ketentuan',
    media_consent: 'Bersedia',
    payer_account_name: 'Mallik Rushamdiwinata',
    payment_amount: '250000',
    payment_date: '2026-11-25',
    payment_proof_original_name: 'bukti-transfer-mallik.pdf',
    admin_notes: 'Dokumen lengkap, lolos verifikasi.'
  },
  {
    id: 2,
    reg_code: 'AAU-002',
    created_at: '2026-11-25 14:02:11',
    registration_status: 'Menunggu',
    verify_data: 'Valid',
    verify_strava: 'Perlu Cek',
    verify_payment: 'Perlu Cek',
    wa_invite_status: 'Belum',
    wa_group_status: 'Belum',
    rider_id: null,
    full_name: 'Budi Santoso',
    birth_date: '1988-01-02',
    gender: 'Laki-laki',
    whatsapp: '081200000001',
    email: 'budi@example.com',
    city: 'Bandung',
    instagram: '',
    community: 'Bandung Riders',
    emergency_name: 'Siti Aminah',
    emergency_relation: 'Istri',
    emergency_whatsapp: '081200000002',
    bike_type: 'Road Bike',
    strava_profile_url: 'https://www.strava.com/athletes/654321',
    strava_activity_url: 'https://www.strava.com/activities/123456789',
    longest_distance_km: '320.5',
    has_ultra_experience: 'Belum',
    past_events: '',
    bike_roadworthy: 'Ya',
    has_helmet_gear: 'Ya',
    medical_conditions: 'Asma ringan',
    terms_agreed: 'Setuju',
    media_consent: 'Bersedia',
    payer_account_name: 'Budi Santoso',
    payment_amount: '250000',
    payment_date: '2026-11-25',
    payment_proof_original_name: 'bukti-budi.jpg',
    admin_notes: ''
  }
];

const report = buildAlaUltraReport({
  rows,
  cfg: { max_quota: 150, fee_amount: 250000, linked_event_id: 7 },
  linkedEvent: { id: 7, name: 'ALA-ALA ULTRA 2027' },
  exportedAt: new Date('2026-11-25T06:36:00Z')
});

const target = path.join(__dirname, '..', 'reports', 'ala-ala-ultra-2027-sample.xlsx');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, renderAlaUltraXlsx(report));
console.log('written', target, fs.statSync(target).size, 'bytes');