import { DEMO_MODE } from '../firebase';
import { demoBackend } from './demoBackend';
import { firebaseBackend } from './firebaseBackend';
import type { Backend } from './backend';

export const backend: Backend = DEMO_MODE ? demoBackend : firebaseBackend;
export * from './backend';
