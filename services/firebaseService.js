import { firestore } from "../firebase/firebaseIni";
import { COLLECTIONS, CONFIG_KEYS } from "../constants";

// ===========================================
// BASE FIRESTORE SERVICE
// ===========================================

/**
 * Get a single document by ID
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<object|null>} Document data or null
 */
export const getDocument = async (collection, docId) => {
  try {
    const doc = await firestore().collection(collection).doc(docId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting document ${docId} from ${collection}:`, error);
    throw error;
  }
};

/**
 * Get all documents from a collection
 * @param {string} collection - Collection name
 * @param {object} options - Query options { orderBy, orderDirection, limit }
 * @returns {Promise<Array>} Array of documents
 */
export const getCollection = async (collection, options = {}) => {
  try {
    let query = firestore().collection(collection);

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || "desc");
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error getting collection ${collection}:`, error);
    throw error;
  }
};

/**
 * Subscribe to collection changes (real-time)
 * @param {string} collection - Collection name
 * @param {function} callback - Callback function (receives array of docs)
 * @param {object} options - Query options { orderBy, orderDirection, where }
 * @returns {function} Unsubscribe function
 */
export const subscribeToCollection = (collection, callback, options = {}) => {
  let query = firestore().collection(collection);

  if (options.where) {
    options.where.forEach(([field, operator, value]) => {
      query = query.where(field, operator, value);
    });
  }

  if (options.orderBy) {
    query = query.orderBy(options.orderBy, options.orderDirection || "desc");
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query.onSnapshot(
    (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(docs);
    },
    (error) => {
      console.error(`Error subscribing to ${collection}:`, error);
      callback([]);
    }
  );
};

/**
 * Subscribe to a single document
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {function} callback - Callback function
 * @returns {function} Unsubscribe function
 */
export const subscribeToDocument = (collection, docId, callback) => {
  return firestore()
    .collection(collection)
    .doc(docId)
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(`Error subscribing to document ${docId}:`, error);
        callback(null);
      }
    );
};

/**
 * Add a new document
 * @param {string} collection - Collection name
 * @param {object} data - Document data
 * @returns {Promise<string>} New document ID
 */
export const addDocument = async (collection, data) => {
  try {
    const docRef = await firestore().collection(collection).add({
      ...data,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collection}:`, error);
    throw error;
  }
};

/**
 * Set a document with specific ID
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {object} data - Document data
 * @param {boolean} merge - Merge with existing data
 */
export const setDocument = async (collection, docId, data, merge = false) => {
  try {
    await firestore()
      .collection(collection)
      .doc(docId)
      .set(data, { merge });
  } catch (error) {
    console.error(`Error setting document ${docId} in ${collection}:`, error);
    throw error;
  }
};

/**
 * Update a document
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {object} data - Data to update
 */
export const updateDocument = async (collection, docId, data) => {
  try {
    await firestore()
      .collection(collection)
      .doc(docId)
      .update({
        ...data,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error(`Error updating document ${docId} in ${collection}:`, error);
    throw error;
  }
};

/**
 * Delete a document
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 */
export const deleteDocument = async (collection, docId) => {
  try {
    await firestore().collection(collection).doc(docId).delete();
  } catch (error) {
    console.error(`Error deleting document ${docId} from ${collection}:`, error);
    throw error;
  }
};

/**
 * Batch write multiple operations
 * @param {Array} operations - Array of { type, collection, docId, data }
 */
export const batchWrite = async (operations) => {
  try {
    const batch = firestore().batch();

    operations.forEach(({ type, collection, docId, data }) => {
      const ref = firestore().collection(collection).doc(docId);

      switch (type) {
        case "set":
          batch.set(ref, data);
          break;
        case "update":
          batch.update(ref, data);
          break;
        case "delete":
          batch.delete(ref);
          break;
      }
    });

    await batch.commit();
  } catch (error) {
    console.error("Error in batch write:", error);
    throw error;
  }
};

// ===========================================
// CONSECUTIVE NUMBER (FOLIO) SERVICE
// ===========================================

/**
 * Get next consecutive number for a specific type
 * @param {string} configKey - Key in config/consecutivos document
 * @returns {Promise<number>} Next consecutive number
 */
export const getNextConsecutive = async (configKey) => {
  try {
    const configDoc = await firestore()
      .collection(COLLECTIONS.CONFIG)
      .doc("consecutivos")
      .get();

    if (configDoc.exists) {
      return (configDoc.data()[configKey] || 0) + 1;
    }
    return 1;
  } catch (error) {
    console.error(`Error getting consecutive for ${configKey}:`, error);
    throw error;
  }
};

/**
 * Update consecutive number
 * @param {string} configKey - Key in config/consecutivos document
 * @param {number} value - New value
 */
export const updateConsecutive = async (configKey, value) => {
  try {
    await firestore()
      .collection(COLLECTIONS.CONFIG)
      .doc("consecutivos")
      .update({ [configKey]: value });
  } catch (error) {
    console.error(`Error updating consecutive for ${configKey}:`, error);
    throw error;
  }
};

/**
 * Run transaction with consecutive number increment
 * @param {string} configKey - Key in config/consecutivos document
 * @param {function} transactionCallback - Callback that receives transaction and nextFolio
 * @returns {Promise<number>} The new folio number used
 */
export const runTransactionWithConsecutive = async (configKey, transactionCallback) => {
  const configRef = firestore().collection(COLLECTIONS.CONFIG).doc("consecutivos");

  return await firestore().runTransaction(async (transaction) => {
    const configDoc = await transaction.get(configRef);
    const currentValue = configDoc.data()?.[configKey] || 0;
    const nextValue = currentValue + 1;

    // Execute the callback with transaction and next folio
    await transactionCallback(transaction, nextValue);

    // Update the consecutive
    transaction.update(configRef, { [configKey]: nextValue });

    return nextValue;
  });
};

// ===========================================
// QUERY HELPERS
// ===========================================

/**
 * Query documents with multiple where clauses
 * @param {string} collection - Collection name
 * @param {Array} whereClauses - Array of [field, operator, value]
 * @param {object} options - Additional options { orderBy, limit }
 * @returns {Promise<Array>} Array of documents
 */
export const queryDocuments = async (collection, whereClauses = [], options = {}) => {
  try {
    let query = firestore().collection(collection);

    whereClauses.forEach(([field, operator, value]) => {
      query = query.where(field, operator, value);
    });

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || "desc");
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error querying ${collection}:`, error);
    throw error;
  }
};

// Export firestore instance for advanced usage
export { firestore };
