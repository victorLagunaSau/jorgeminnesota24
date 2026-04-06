// ===========================================
// SERVICES - INDEX
// ===========================================

// Base Firebase Service
export * from "./firebaseService";

// Re-export commonly used functions
export {
  getDocument,
  getCollection,
  subscribeToCollection,
  subscribeToDocument,
  addDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  batchWrite,
  getNextConsecutive,
  updateConsecutive,
  runTransactionWithConsecutive,
  queryDocuments,
} from "./firebaseService";
