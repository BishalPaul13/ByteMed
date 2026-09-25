const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Query = require('./models/Query');
const Response = require('./models/Response');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bytemed';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB. Clearing old demo collections...');

    await User.deleteMany({});
    await Query.deleteMany({});
    await Response.deleteMany({});

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Seed Users
    console.log('Seeding demo users...');
    
    // Patient
    const patientAlice = await User.create({
      name: 'Alice Johnson',
      email: 'patient.alice@bytemed.com',
      password: passwordHash,
      role: 'PATIENT'
    });

    const patientBob = await User.create({
      name: 'Bob Miller',
      email: 'patient.bob@bytemed.com',
      password: passwordHash,
      role: 'PATIENT'
    });

    // Verified Doctor 1 (Rank Plus 8, Live Available)
    const doctorSmith = await User.create({
      name: 'Eleanor Smith',
      email: 'doctor.smith@bytemed.com',
      password: passwordHash,
      role: 'DOCTOR',
      credentials: 'MD - Harvard Medical (Cardiology & Internal Med) - Lic #78921',
      status: 'VERIFIED',
      availability: 'AVAILABLE',
      ratingSum: 49,
      ratingCount: 10,
      plusRank: 'Plus 8 (++++++++)'
    });

    // Verified Doctor 2 (Rank Plus 6, Offline)
    const doctorMarcus = await User.create({
      name: 'Marcus Vance',
      email: 'doctor.marcus@bytemed.com',
      password: passwordHash,
      role: 'DOCTOR',
      credentials: 'Board Certified Dermatologist - Lic #44590',
      status: 'VERIFIED',
      availability: 'OFFLINE',
      ratingSum: 23,
      ratingCount: 6,
      plusRank: 'Plus 6 (++++++)'
    });

    // Pending Doctor (Demonstrates Verification Flow)
    const doctorPending = await User.create({
      name: 'Sarah Connor',
      email: 'doctor.pending@bytemed.com',
      password: passwordHash,
      role: 'DOCTOR',
      credentials: 'MD - Johns Hopkins (Neurology Fellow) - License Verification Pending',
      status: 'PENDING',
      availability: 'OFFLINE',
      plusRank: 'Plus 1 (+)'
    });

    // 2. Seed Queries
    console.log('Seeding clinical queries & AI triage flags...');

    // Emergency Query (Chest Pain)
    const emergencyQuery = await Query.create({
      title: 'Sudden crushing chest pain radiating to left arm',
      description: 'Started 25 minutes ago while climbing stairs. Chest pain feels like a heavy weight, accompanied by slight nausea and cold sweat.',
      category: 'Cardiology',
      patientId: patientAlice._id,
      status: 'OPEN',
      aiTriage: {
        isEmergency: true,
        confidenceScore: 0.98
      }
    });

    // Non-Emergency Query 1 (Dermatology)
    const dermQuery = await Query.create({
      title: 'Red circular rash with itchy border on forearm',
      description: 'Noticed this round red ring on my inner arm after gardening 3 days ago. It has a slightly raised border and mild itching. No fever.',
      category: 'Dermatology',
      patientId: patientBob._id,
      status: 'OPEN',
      aiTriage: {
        isEmergency: false,
        confidenceScore: 0.89
      }
    });

    // Non-Emergency Query 2 (Neurology)
    const neuroQuery = await Query.create({
      title: 'Intermittent throbbing temple headaches with light sensitivity',
      description: 'Experiencing unilateral throbbing pain behind my right eye for the past 2 weeks, usually triggered after looking at monitors. Nausea occurs occasionally.',
      category: 'Neurology',
      patientId: patientAlice._id,
      status: 'OPEN',
      aiTriage: {
        isEmergency: false,
        confidenceScore: 0.85
      }
    });

    // 3. Seed Versioned Doctor Responses
    console.log('Seeding versioned doctor contributions...');

    // Response on Emergency Query
    await Response.create({
      queryId: emergencyQuery._id,
      doctorId: doctorSmith._id,
      currentContent: '🚨 CRITICAL ADVICE: Crushing chest pain radiating to the left arm is a classic presentation of acute coronary syndrome (myocardial infarction). Please call emergency medical services (911/112) IMMEDIATELY. Do not attempt to drive yourself. If you have aspirin and no contraindications, chew a 325mg tablet while waiting for the ambulance.',
      versions: [
        {
          content: 'Crushing chest pain radiating to your left arm requires emergency attention. Call 911 immediately.',
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          content: '🚨 CRITICAL ADVICE: Crushing chest pain radiating to the left arm is a classic presentation of acute coronary syndrome (myocardial infarction). Please call emergency medical services (911/112) IMMEDIATELY. Do not attempt to drive yourself. If you have aspirin and no contraindications, chew a 325mg tablet while waiting for the ambulance.',
          timestamp: new Date()
        }
      ],
      rating: 5
    });

    // Response on Dermatology Query
    await Response.create({
      queryId: dermQuery._id,
      doctorId: doctorMarcus._id,
      currentContent: 'A circular rash with a raised, erythematous border following outdoor gardening is very characteristic of Tinea Corporis (ringworm) or early localized Lyme erythema migrans. Keep the area clean and dry. An over-the-counter topical antifungal (such as Terbinafine or Clotrimazole) applied twice daily for 2 weeks is a standard first line. If you notice a central clearing target lesion or flu-like symptoms, consult in person for Lyme testing.',
      versions: [
        {
          content: 'Looks like ringworm. Try over-the-counter antifungal cream.',
          timestamp: new Date(Date.now() - 7200000)
        },
        {
          content: 'A circular rash with a raised, erythematous border following outdoor gardening is very characteristic of Tinea Corporis (ringworm) or early localized Lyme erythema migrans. Keep the area clean and dry. An over-the-counter topical antifungal (such as Terbinafine or Clotrimazole) applied twice daily for 2 weeks is a standard first line. If you notice a central clearing target lesion or flu-like symptoms, consult in person for Lyme testing.',
          timestamp: new Date()
        }
      ],
      rating: 5
    });

    console.log('Demo database seeded successfully!');
    console.log('\n--- Quick Demo Accounts ---');
    console.log('Patient:  patient.alice@bytemed.com  / password123');
    console.log('Doctor:   doctor.smith@bytemed.com   / password123 (Rank: Plus 8, Live AVAILABLE)');
    console.log('Pending:  doctor.pending@bytemed.com / password123 (Needs verification)');
    console.log('---------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
