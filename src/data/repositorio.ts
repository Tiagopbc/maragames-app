import { db } from '../lib/firebase';
import { FirebaseProgressRepository } from './FirebaseProgressRepository';
import type { ProgressRepository } from './ProgressRepository';

// Único arquivo que conhece a implementação. Telas e hooks importam `repositorio` daqui e
// enxergam só a interface; trocar de backend é trocar esta linha.
export const repositorio: ProgressRepository = new FirebaseProgressRepository(db);
