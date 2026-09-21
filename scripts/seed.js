const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

const app = initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore(app);

const lessons = [
    { title: 'Lição 1', order: 1, content: '...' },
    { title: 'Lição 2', order: 2, content: '...' },
    { title: 'Lição 3', order: 3, content: '...' },
    { title: 'Lição 4', order: 4, content: '...' },
    { title: 'Lição 5', order: 5, content: '...' },
];

async function seed() {
    const batch = db.batch();
    lessons.forEach((lesson) => {
        const ref = db.collection('lessons').doc();
        batch.set(ref, { ...lesson, createdAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();
    console.log('5 lições inseridas.');
}

seed();