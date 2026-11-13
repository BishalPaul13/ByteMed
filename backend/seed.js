const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Query = require('./models/Query');
const Response = require('./models/Response');
const ContributionLedger = require('./models/ContributionLedger');
const ModerationCase = require('./models/ModerationCase');
const AuditEvent = require('./models/AuditEvent');
const Notification = require('./models/Notification');
const Feedback = require('./models/Feedback');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bytemed';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB. Clearing previous data...');

    await Promise.all([
      User.deleteMany({}),
      Query.deleteMany({}),
      Response.deleteMany({}),
      ContributionLedger.deleteMany({}),
      ModerationCase.deleteMany({}),
      AuditEvent.deleteMany({}),
      Notification.deleteMany({}),
      Feedback.deleteMany({})
    ]);

    const passwordHash = await bcrypt.hash('password123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);

    console.log('Seeding demo accounts...');

    // 1. Admin / Safety Moderator
    const adminUser = await User.create({
      name: 'Dr. Sarah Mitchell',
      email: 'admin@bytemed.com',
      password: adminHash,
      role: 'ADMIN',
      status: 'VERIFIED',
      accountState: 'ACTIVE',
      credentials: 'Chief Medical Officer & Platform Safety Lead',
      specialty: 'General'
    });

    // 2. Patients
    const patientAlice = await User.create({
      name: 'Alice Johnson',
      email: 'patient.alice@bytemed.com',
      password: passwordHash,
      role: 'PATIENT',
      accountState: 'ACTIVE'
    });

    const patientBob = await User.create({
      name: 'Bob Miller',
      email: 'patient.bob@bytemed.com',
      password: passwordHash,
      role: 'PATIENT',
      accountState: 'ACTIVE'
    });

    // 3. Doctors across ByteMed's 8 Ranks (Byte -> 8 bits -> 8 ranks)
    // Plus 8: Master Contributor (++++++++)
    const doctorSmith = await User.create({
      name: 'Eleanor Smith',
      email: 'doctor.smith@bytemed.com',
      password: passwordHash,
      role: 'DOCTOR',
      specialty: 'Cardiology',
      credentials: 'MD, FACC - Harvard Medical (Cardiology & Critical Care) - Lic #78921',
      status: 'VERIFIED',
      accountState: 'ACTIVE',
      availability: 'OFFLINE',
      totalReputationScore: 3450,
      rankNumber: 8,
      plusRank: 'Plus 8 (++++++++)',
      contributionsCount: 48,
      liveSessionsCount: 22,
      averageAiScore: 94,
      averagePatientRating: 4.9,
      bio: 'Cardiologist with 16 years clinical experience specializing in acute coronary syndromes and preventive cardiology.'
    });

    // Plus 6: Distinguished Contributor (++++++)
    const doctorMarcus = await User.create({
      name: 'Marcus Vance',
      email: 'doctor.marcus@bytemed.com',
      password: passwordHash,
      role: 'DOCTOR',
      specialty: 'Dermatology',
      credentials: 'FAAD - Board Certified Dermatologist - Lic #44590',
      status: 'VERIFIED',
      accountState: 'ACTIVE',
      availability: 'OFFLINE',
      totalReputationScore: 2150,
      rankNumber: 6,
      plusRank: 'Plus 6 (++++++)',
      contributionsCount: 31,
      liveSessionsCount: 14,
      averageAiScore: 91,
      averagePatientRating: 4.8,
      bio: 'Dermatologist dedicated to inflammatory skin conditions, dermoscopy, and lesion triage.'
    });

    // Plus 4: Senior Contributor (++++)
    const doctorChen = await User.create({
      name: 'David Chen',
      email: 'doctor.chen@bytemed.com',
      password: passwordHash,
      role: 'DOCTOR',
      specialty: 'Neurology',
      credentials: 'MD - Stanford Neurology - Lic #62194',
      status: 'VERIFIED',
      accountState: 'ACTIVE',
      availability: 'OFFLINE',
      totalReputationScore: 980,
      rankNumber: 4,
      plusRank: 'Plus 4 (++++)',
      contributionsCount: 16,
      liveSessionsCount: 6,
      averageAiScore: 89,
      averagePatientRating: 4.7,
      bio: 'Neurologist focusing on intractable migraine, episodic cephalea, and neuropathic disorders.'
    });

    // Plus 2: Active Contributor (++)
    const doctorMaya = await User.create({
      name: 'Maya Patel',
      email: 'doctor.maya@bytemed.com',
      password: passwordHash,
      role: 'DOCTOR',
      specialty: 'Pediatrics',
      credentials: 'MD, FAAP - Childrens Hospital of Philadelphia - Lic #88301',
      status: 'VERIFIED',
      accountState: 'ACTIVE',
      availability: 'OFFLINE',
      totalReputationScore: 380,
      rankNumber: 2,
      plusRank: 'Plus 2 (++)',
      contributionsCount: 7,
      liveSessionsCount: 2,
      averageAiScore: 88,
      averagePatientRating: 4.9,
      bio: 'Pediatrician passionate about community child health, infant nutrition, and parental reassurance.'
    });

    // Pending Verification Doctor (Demonstrating Verification Queue)
    const doctorPending = await User.create({
      name: 'Sarah Connor',
      email: 'doctor.pending@bytemed.com',
      password: passwordHash,
      role: 'DOCTOR',
      specialty: 'Orthopedics',
      credentials: 'MD - Johns Hopkins Orthopedic Surgery Fellow - License Verification Pending',
      status: 'PENDING',
      accountState: 'ACTIVE',
      availability: 'OFFLINE',
      totalReputationScore: 100,
      rankNumber: 1,
      plusRank: 'Plus 1 (+)',
      bio: 'Orthopedic fellow specializing in sports injuries, ACL reconstruction, and joint arthroscopy.'
    });

    console.log('Seeding multi-modal clinical queries...');

    // 1. Emergency Query with Audio & Clinical Triage
    const emergencyQuery = await Query.create({
      title: 'Sudden crushing chest pain radiating to left arm',
      description: 'Started 25 minutes ago while climbing stairs. Chest feels like an elephant sitting on it, accompanied by cold sweat and nausea.',
      category: 'Cardiology',
      patientId: patientAlice._id,
      isAnonymous: false,
      status: 'ANSWERED',
      media: {
        voice: {
          hasVoice: true,
          audioUrl: 'mock_audio_sample_cardio.wav',
          transcript: 'I have been experiencing a sudden heaviness in my chest since this afternoon, and it tingles down my left arm when I exert myself.',
          transcriptConfidence: 0.97,
          isEditedByPatient: false
        },
        images: []
      },
      aiCategorization: {
        predictedCategory: 'Cardiology',
        subCategory: 'Acute Coronary Syndrome / Emergency Triage',
        confidenceScore: 0.98,
        urgencyLevel: 'CRITICAL_EMERGENCY',
        safetySignal: '🚨 EMERGENCY WARNING: Symptoms indicative of possible Acute Coronary Syndrome (ACS) or Myocardial Infarction.',
        isEmergency: true,
        broadRouting: false,
        modelIdentifier: 'ByteMed-ClinicalRouter-v2.1',
        routingExplanation: 'Critical emergency pathway triggered; automated warning dispatched to patient.'
      }
    });

    // 2. Dermatology Query with Image Attachment
    const dermQuery = await Query.create({
      title: 'Red circular rash with itchy raised border on forearm',
      description: 'Noticed this round red ring on my inner arm after gardening 3 days ago. Border is slightly raised and scaly. Mild itching.',
      category: 'Dermatology',
      patientId: patientBob._id,
      isAnonymous: true,
      status: 'ANSWERED',
      media: {
        voice: { hasVoice: false },
        images: [{
          url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
          label: 'Forearm Lesion Close-Up',
          aiObservation: 'Visual AI detected: Well-demarcated annular erythematous plaque with central clearing and raised periphery.'
        }]
      },
      aiCategorization: {
        predictedCategory: 'Dermatology',
        subCategory: 'Cutaneous Lesions & Inflammatory Dermatoses',
        confidenceScore: 0.94,
        urgencyLevel: 'NORMAL',
        safetySignal: 'Standard outpatient inquiry. No critical red flags detected.',
        isEmergency: false,
        broadRouting: false,
        modelIdentifier: 'ByteMed-ClinicalRouter-v2.1',
        routingExplanation: 'Strong linguistic and visual alignment with cutaneous dermatophytic patterns.'
      }
    });

    // 3. Open Neurology Query
    const neuroQuery = await Query.create({
      title: 'Unilateral throbbing temple headaches with photophobia',
      description: 'Experiencing recurrent pulsating pain behind my right temple for the past 2 weeks, exacerbated by computer monitor glare. Nausea occurs occasionally.',
      category: 'Neurology',
      patientId: patientAlice._id,
      isAnonymous: false,
      status: 'OPEN',
      media: {
        voice: {
          hasVoice: true,
          audioUrl: 'mock_audio_sample_neuro.wav',
          transcript: 'Severe throbbing migraine centered behind my right temple. Bright lights make it much worse.',
          transcriptConfidence: 0.93,
          isEditedByPatient: false
        },
        images: []
      },
      aiCategorization: {
        predictedCategory: 'Neurology',
        subCategory: 'Cranial & Neuropathic Cephalea',
        confidenceScore: 0.91,
        urgencyLevel: 'NORMAL',
        safetySignal: 'Standard outpatient inquiry. No acute neurological deficits reported.',
        isEmergency: false,
        broadRouting: false,
        modelIdentifier: 'ByteMed-ClinicalRouter-v2.1',
        routingExplanation: 'Categorized to Neurology with focus on episodic primary headache disorders.'
      }
    });

    console.log('Seeding physician responses with AI evaluations & feedback...');

    // Response 1: Eleanor Smith on Emergency Query
    const resp1 = await Response.create({
      queryId: emergencyQuery._id,
      doctorId: doctorSmith._id,
      currentContent: `🚨 CRITICAL EMERGENCY ADVICE: Crushing retrosternal chest pain radiating down the left arm, paired with cold sweat and nausea, is the canonical clinical presentation of Acute Coronary Syndrome (Myocardial Infarction / Heart Attack).

Immediate Action Required:
1. Please call 911 or your local emergency dispatch service IMMEDIATELY. Do not wait or drive yourself.
2. Rest in a semi-upright seated position to reduce cardiac workload.
3. If not allergic or contraindicated, chew an adult 325mg aspirin while waiting for EMS.

Note: Online medical consulting cannot replace emergency cardiac catheterization and troponin testing. Proceed to the nearest emergency room immediately.`,
      versions: [
        {
          content: 'Crushing chest pain radiating down your arm requires immediate emergency care. Call 911.',
          timestamp: new Date(Date.now() - 3600000),
          editReason: 'Initial brief advice'
        },
        {
          content: `🚨 CRITICAL EMERGENCY ADVICE: Crushing retrosternal chest pain radiating down the left arm...`,
          timestamp: new Date(),
          editReason: 'Expanded with emergency protocols and uncertainty caveats'
        }
      ],
      aiEvaluation: {
        relevance: 98,
        completeness: 95,
        clarity: 96,
        safety: 99,
        uncertaintyHandling: 97,
        compositeScore: 97,
        confidence: 0.98,
        outcome: 'HIGH_CONFIDENCE_POSITIVE',
        flags: [],
        modelIdentifier: 'ByteMed-ClinicalEval-v1.4',
        evaluationSummary: 'Exemplary emergency clinical triage. Uncompromising patient safety and direct emergency protocol guidance.',
        evaluatedAt: new Date()
      },
      feedback: {
        helpfulness: 5,
        clarity: 5,
        communication: 5,
        comment: 'Dr. Smith likely saved my life. The paramedics were called immediately.',
        submittedAt: new Date()
      },
      rating: 5
    });

    // Response 2: Marcus Vance on Dermatology Query
    const resp2 = await Response.create({
      queryId: dermQuery._id,
      doctorId: doctorMarcus._id,
      currentContent: `Hello. The erythematous annular lesion with a raised, scaling border following outdoor gardening is classically suggestive of Tinea Corporis (ringworm) or early localized Lyme erythema migrans.

Recommended Steps:
- Keep the arm clean, dry, and avoid scratching to prevent secondary bacterial infection.
- Over-the-counter topical antifungal cream (Terbinafine 1% or Clotrimazole 1%) applied twice daily for 2 weeks is the standard first-line treatment.
- Wash gardening clothing and bed linens in hot water.

When to Seek In-Person Care:
If you notice an expanding "bullseye" central clearing, develop fever, joint pain, or if the rash does not improve after 10 days of topical therapy, visit your local clinic for a KOH prep scraping or Lyme antibody serology.`,
      versions: [{
        content: `Hello. The erythematous annular lesion with a raised, scaling border...`,
        timestamp: new Date(),
        editReason: 'Initial clinical evaluation'
      }],
      aiEvaluation: {
        relevance: 94,
        completeness: 92,
        clarity: 95,
        safety: 96,
        uncertaintyHandling: 94,
        compositeScore: 94,
        confidence: 0.95,
        outcome: 'HIGH_CONFIDENCE_POSITIVE',
        flags: [],
        modelIdentifier: 'ByteMed-ClinicalEval-v1.4',
        evaluationSummary: 'High quality dermatological guidance. Clear differentiation between fungal and tick-borne etiologies.',
        evaluatedAt: new Date()
      },
      feedback: {
        helpfulness: 5,
        clarity: 5,
        communication: 5,
        comment: 'Clear explanation and very reassuring guidance on OTC options.',
        submittedAt: new Date()
      },
      rating: 5
    });

    console.log('Seeding Contribution Ledger (Immutable records)...');

    await ContributionLedger.create([
      {
        doctorId: doctorSmith._id,
        contributionType: 'ASYNC_RESPONSE',
        referenceId: resp1._id,
        aiEvaluationSnapshot: { compositeScore: 97, confidence: 0.98, safetyScore: 99 },
        feedbackSnapshot: { averageRating: 5.0, trustWeight: 1.0 },
        pointsAwarded: 95,
        formulaVersion: 'v1.2-canonical',
        explanation: 'Published clinical query response (AI Quality: 97%, Patient Rating: 5.0/5)'
      },
      {
        doctorId: doctorMarcus._id,
        contributionType: 'ASYNC_RESPONSE',
        referenceId: resp2._id,
        aiEvaluationSnapshot: { compositeScore: 94, confidence: 0.95, safetyScore: 96 },
        feedbackSnapshot: { averageRating: 5.0, trustWeight: 1.0 },
        pointsAwarded: 92,
        formulaVersion: 'v1.2-canonical',
        explanation: 'Published clinical query response (AI Quality: 94%, Patient Rating: 5.0/5)'
      }
    ]);

    console.log('Seeding Moderation cases and Audit log...');

    // Moderation case sample
    await ModerationCase.create({
      targetType: 'QUERY',
      targetId: emergencyQuery._id,
      reporterId: patientAlice._id,
      reasonCategory: 'CLINICALLY_UNSAFE',
      description: 'System automatically flagged query for critical emergency pathway verification.',
      severity: 'HIGH',
      status: 'ACTION_TAKEN',
      actionTaken: 'NONE',
      reviewerNotes: 'Verified prompt physician intervention was delivered.',
      reviewerId: adminUser._id,
      resolvedAt: new Date()
    });

    // Sample Audit Events
    await AuditEvent.create([
      {
        actorId: doctorSmith._id,
        actorRole: 'DOCTOR',
        action: 'RESPONSE_PUBLISHED',
        targetType: 'RESPONSE',
        targetId: resp1._id,
        details: { queryTitle: emergencyQuery.title, aiScore: 97 }
      },
      {
        actorId: adminUser._id,
        actorRole: 'ADMIN',
        action: 'DOCTOR_VERIFIED',
        targetType: 'DOCTOR',
        targetId: doctorSmith._id,
        details: { credentials: doctorSmith.credentials }
      }
    ]);

    // Sample Notifications
    await Notification.create([
      {
        recipientId: patientAlice._id,
        title: '🩺 Physician Responded to Your Query',
        message: `Dr. Eleanor Smith (Plus 8) answered your query regarding crushing chest pain.`,
        type: 'RESPONSE_RECEIVED',
        link: '/patient'
      },
      {
        recipientId: doctorSmith._id,
        title: '🎖️ Rank Milestone: Plus 8 (Master Contributor)',
        message: 'Your sustained high-quality clinical contributions have earned you the highest ByteMed rank.',
        type: 'RANK_ADVANCEMENT',
        link: '/leaderboard'
      }
    ]);

    console.log('\n=============================================');
    console.log('  ByteMed Complete Prototype Seed Complete  ');
    console.log('=============================================');
    console.log('Admin:    admin@bytemed.com          / admin123  (Moderation & Verification)');
    console.log('Doctor:   doctor.smith@bytemed.com   / password123 (Plus 8, Cardiology)');
    console.log('Doctor:   doctor.marcus@bytemed.com  / password123 (Plus 6, Dermatology)');
    console.log('Pending:  doctor.pending@bytemed.com / password123 (Verification Queue)');
    console.log('Patient:  patient.alice@bytemed.com  / password123');
    console.log('=============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
